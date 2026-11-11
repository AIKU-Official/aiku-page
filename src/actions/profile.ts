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
  type ProfileSubject,
} from "@/lib/members/profile";
import {
  CONTENT_TYPES,
  createObjectKey,
  fileExtension,
  IMAGE_EXTENSIONS,
  isObjectKeyOf,
} from "@/lib/storage/keys";
import { UPLOAD_BUCKET } from "@/lib/storage/public-url";
import { removeObjects } from "@/lib/storage/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { MEMBER_GRADES, type MemberGrade } from "@/lib/types";
import { avatarUploadSchema, idSchema, profileSchema } from "@/lib/validators";

export type ProfilePage = { subject: ProfileSubject; profile: MemberProfile };

type Db = ReturnType<typeof createAdminClient>;

const FAILED: ActionResult<never> = {
  ok: false,
  message: "요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요.",
};

/**
 * The roster member behind an access token. Server Actions are public
 * endpoints, so this lookup is what stops one member from touching another's
 * profile: the member id never comes from the request.
 */
async function signedInMember(db: Db, accessToken: string): Promise<string | null> {
  const { data } = await db.auth.getUser(accessToken);
  if (!data.user) return null;
  const link = unwrap(
    await db.from("member_accounts").select("member_id").eq("user_id", data.user.id).maybeSingle(),
  );
  return link?.member_id ?? null;
}

async function loadPage(db: Db, memberId: string): Promise<ProfilePage | null> {
  const row = unwrap(
    await db
      .from("members")
      .select("id, name, department, grade, position, generations(name), member_profiles(*)")
      .eq("id", memberId)
      .maybeSingle(),
  );
  if (!row) return null;
  return {
    subject: {
      id: row.id,
      name: row.name,
      generation: row.generations.name,
      department: row.department,
      grade: MEMBER_GRADES.includes(row.grade as MemberGrade) ? (row.grade as MemberGrade) : "ob",
      position: row.position,
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

    const page = await loadPage(db, memberId);
    return page ? { ok: true, message: "프로필을 저장했습니다.", data: page } : FAILED;
  } catch (error) {
    console.error("[profile]", error);
    return FAILED;
  }
}
