"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";

import type { SignedUpload } from "@/actions/uploads";
import { unwrap } from "@/lib/actions/admin-action";
import type { ActionResult } from "@/lib/actions/result";
import {
  emptyProfile,
  mapProfile,
  MAX_AVATAR_BYTES,
  type MemberProfile,
  type ProfileAward,
  type ProfileProject,
  type ProfileSubject,
} from "@/lib/members/profile";
import {
  CONTENT_TYPES,
  createObjectKey,
  fileExtension,
  IMAGE_EXTENSIONS,
  isObjectKeyOf,
} from "@/lib/storage/keys";
import { formatPositions, POSITION_SELECT } from "@/lib/members/positions";
import { signedInMember } from "@/lib/members/signed-in";
import { UPLOAD_BUCKET } from "@/lib/storage/public-url";
import { removeObjects } from "@/lib/storage/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { MEMBER_GRADES, type MemberGrade } from "@/lib/types";
import { avatarUploadSchema, idSchema, profileSchema } from "@/lib/validators";

export type ProfilePage = {
  subject: ProfileSubject;
  profile: MemberProfile;
  /** Filled from the project records, newest season first. */
  projects: ProfileProject[];
  /** Filled from the AIKUTHON award records, newest first. */
  awards: ProfileAward[];
};

type Db = ReturnType<typeof createAdminClient>;

const FAILED: ActionResult<never> = {
  ok: false,
  message: "요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요.",
};

async function loadPage(db: Db, memberId: string): Promise<ProfilePage | null> {
  const row = unwrap(
    await db
      .from("members")
      .select(
        `id, name, department, grade, generations(name), member_profiles(*), ${POSITION_SELECT}`,
      )
      .eq("id", memberId)
      .maybeSingle(),
  );
  if (!row) return null;

  const taken = unwrap(
    await db
      .from("project_members")
      .select("role, projects(id, title, one_line, award_rank, seasons(name, sort_order))")
      .eq("member_id", memberId),
  );
  const projects = (taken ?? [])
    .map((entry) => ({ entry, order: entry.projects.seasons.sort_order }))
    .sort((a, b) => a.order - b.order)
    .map(({ entry }): ProfileProject => {
      const rank = entry.projects.award_rank;
      return {
        id: entry.projects.id,
        title: entry.projects.title,
        season: entry.projects.seasons.name,
        role: entry.role === "leader" ? "leader" : "member",
        awardRank: rank === 1 || rank === 2 || rank === 3 ? rank : null,
        oneLine: entry.projects.one_line,
      };
    });

  const won = unwrap(
    await db
      .from("aikuthon_award_members")
      .select("aikuthon_awards(rank, team_name, aikuthons(id, edition, name, task_title, starts_on))")
      .eq("member_id", memberId),
  );
  const awards = (won ?? [])
    .map((entry) => entry.aikuthon_awards)
    .filter((award) => award.rank === 1 || award.rank === 2 || award.rank === 3)
    .sort((a, b) => b.aikuthons.starts_on.localeCompare(a.aikuthons.starts_on))
    .map(
      (award): ProfileAward => ({
        anchor: `aikuthon-${award.aikuthons.edition ?? award.aikuthons.id}`,
        event: award.aikuthons.name,
        task: award.aikuthons.task_title,
        month: award.aikuthons.starts_on.slice(0, 7).replace("-", "."),
        rank: award.rank as 1 | 2 | 3,
        teamName: award.team_name,
      }),
    );

  return {
    projects,
    awards,
    subject: {
      id: row.id,
      name: row.name,
      generation: row.generations.name,
      department: row.department,
      grade: MEMBER_GRADES.includes(row.grade as MemberGrade) ? (row.grade as MemberGrade) : "ob",
      position: formatPositions(row.member_positions),
    },
    profile: row.member_profiles ? mapProfile(row.member_profiles) : emptyProfile,
  };
}

const NOT_A_MEMBER: ActionResult<never> = {
  ok: false,
  message: "학회원으로 확인된 계정만 프로필을 쓸 수 있습니다.",
};

/** The signed-in member's own profile, public or not. */
export async function getMyProfile(accessToken: string): Promise<ActionResult<ProfilePage>> {
  try {
    const db = createAdminClient();
    const memberId = await signedInMember(db, String(accessToken ?? ""));
    const page = memberId ? await loadPage(db, memberId) : null;
    return page ? { ok: true, message: "", data: page } : NOT_A_MEMBER;
  } catch (error) {
    console.error("[profile]", error);
    return FAILED;
  }
}

/** A member's profile as visitors see it; fails for profiles that are not public. */
export async function getPublicProfile(memberId: unknown): Promise<ActionResult<ProfilePage>> {
  const parsed = idSchema.safeParse(memberId);
  if (!parsed.success) return { ok: false, message: "프로필을 찾을 수 없습니다." };
  try {
    const page = await loadPage(createAdminClient(), parsed.data);
    return page?.profile.isPublic
      ? { ok: true, message: "", data: page }
      : { ok: false, message: "공개된 프로필이 없습니다." };
  } catch (error) {
    console.error("[profile]", error);
    return FAILED;
  }
}

/** Issues a one-time URL for uploading a new profile picture straight to storage. */
export async function requestAvatarUpload(input: unknown): Promise<ActionResult<SignedUpload>> {
  const parsed = avatarUploadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "요청이 올바르지 않습니다." };
  }
  const { accessToken, name, size } = parsed.data;
  const extension = fileExtension(name);
  if (!(IMAGE_EXTENSIONS as readonly string[]).includes(extension)) {
    return { ok: false, message: "PNG, JPG, WEBP, GIF 이미지만 올릴 수 있습니다." };
  }
  if (size > MAX_AVATAR_BYTES) {
    return {
      ok: false,
      message: `사진이 너무 큽니다. (최대 ${Math.round(MAX_AVATAR_BYTES / 1024 / 1024)}MB)`,
    };
  }

  try {
    const db = createAdminClient();
    const memberId = await signedInMember(db, accessToken);
    if (!memberId) return NOT_A_MEMBER;

    const path = createObjectKey("members", memberId, name, randomBytes(3).toString("hex"));
    const { data, error } = await db.storage.from(UPLOAD_BUCKET).createSignedUploadUrl(path);
    if (error || !data) throw new Error(`createSignedUploadUrl failed: ${error?.message}`);
    return {
      ok: true,
      message: "",
      data: { path, token: data.token, contentType: CONTENT_TYPES[extension] },
    };
  } catch (error) {
    console.error("[profile]", error);
    return FAILED;
  }
}

/** Saves the signed-in member's profile and refreshes the public member page. */
export async function saveMyProfile(input: unknown): Promise<ActionResult<ProfilePage>> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "요청이 올바르지 않습니다." };
  }
  const { accessToken, avatarPath, ...fields } = parsed.data;

  try {
    const db = createAdminClient();
    const memberId = await signedInMember(db, accessToken);
    if (!memberId) return NOT_A_MEMBER;

    const previous = unwrap(
      await db
        .from("member_profiles")
        .select("avatar_path")
        .eq("member_id", memberId)
        .maybeSingle(),
    );
    // undefined keeps the current picture; a new key must be in this member's own folder.
    const nextAvatar = avatarPath === undefined ? (previous?.avatar_path ?? null) : avatarPath;
    if (nextAvatar && !isObjectKeyOf(nextAvatar, "members", memberId)) {
      return { ok: false, message: "프로필 사진을 다시 올려주세요." };
    }

    unwrap(
      await db.from("member_profiles").upsert({
        member_id: memberId,
        is_public: fields.isPublic,
        headline: fields.headline,
        tagline: fields.tagline,
        bio: fields.bio,
        avatar_path: nextAvatar,
        contact_email: fields.contactEmail,
        github_url: fields.githubUrl,
        instagram_url: fields.instagramUrl,
        linkedin_url: fields.linkedinUrl,
        website_url: fields.websiteUrl,
        focus: fields.focus,
        interests: fields.interests,
        skills: fields.skills,
        experience: fields.experience,
      }),
    );
    if (previous?.avatar_path && previous.avatar_path !== nextAvatar) {
      await removeObjects(db, [previous.avatar_path]);
    }
    // The member page shows public profiles' links and opens them from the cards.
    revalidatePath("/members");
    revalidatePath(`/members/${memberId}`);

    const page = await loadPage(db, memberId);
    return page ? { ok: true, message: "프로필을 저장했습니다.", data: page } : FAILED;
  } catch (error) {
    console.error("[profile]", error);
    return FAILED;
  }
}
