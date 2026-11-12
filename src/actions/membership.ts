"use server";

import { timingSafeEqual } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { ActionError, adminAction, unwrap } from "@/lib/actions/admin-action";
import type { ActionResult } from "@/lib/actions/result";
import { emailToLoginId, loginIdToEmail } from "@/lib/auth/login-id";
import { publicEnv } from "@/lib/env.public";
import { serverEnv } from "@/lib/env.server";
import { studentIdDigest } from "@/lib/members/student-id";
import { createAdminClient } from "@/lib/supabase/admin-client";
import {
  idSchema,
  linkAccountSchema,
  memberSignupSchema,
  passwordSignupSchema,
} from "@/lib/validators";

/** Sign-up is closed for an account after this many failed verifications. */
const MAX_SIGNUP_ATTEMPTS = 5;

/** With this many other accounts already failing for one person, even a match waits for an admin. */
const MAX_FAILED_ACCOUNTS_PER_PERSON = 3;

export type SignupOutcome = "linked" | "pending";

const sameDigest = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

type AdminDb = ReturnType<typeof createAdminClient>;
type Identity = { name: string; generation: string; studentId: string };

const NOT_READY: ActionResult<never> = {
  ok: false,
  message: "회원 등록이 아직 준비되지 않았습니다. 운영진에게 문의해주세요.",
};

const verificationSecret = () => {
  const secret = serverEnv().MEMBER_VERIFICATION_SECRET;
  if (!secret) {
    // A deployment problem, not something the visitor can fix by retrying.
    console.error("[member sign-up] MEMBER_VERIFICATION_SECRET is not set.");
  }
  return secret;
};

/**
 * Checks an account's claimed identity against the roster and links it on a
 * full match. The same check serves Google, GitHub and ID / password accounts,
 * so every account of one person ends up on the same roster member.
 */
async function verifyAndLink(
  db: AdminDb,
  user: { id: string; email: string | null },
  { name, generation, studentId }: Identity,
  secret: string,
): Promise<ActionResult<SignupOutcome>> {
  const linked = unwrap(
    await db.from("member_accounts").select("member_id").eq("user_id", user.id).maybeSingle(),
  );
  if (linked) {
    return { ok: true, message: "이미 회원으로 등록된 계정입니다.", data: "linked" };
  }

  const request = unwrap(
    await db.from("member_signup_requests").select("attempts").eq("user_id", user.id).maybeSingle(),
  );
  if (request && request.attempts >= MAX_SIGNUP_ATTEMPTS) {
    return { ok: false, message: "확인 시도 횟수를 넘었습니다. 운영진의 승인을 기다려주세요." };
  }

  const candidates = unwrap(
    await db
      .from("members")
      .select("id, generations!inner(name), member_student_ids(digest)")
      .eq("name", name)
      .eq("generations.name", generation),
  );
  const digest = studentIdDigest(studentId, secret);
  const match = (candidates ?? []).find((member) => {
    const stored = member.member_student_ids?.digest;
    return Boolean(digest && stored && sameDigest(stored, digest));
  });

  // Accounts are free to create, so the per-account attempt limit alone would
  // let someone guess a student ID across many accounts. Once several other
  // accounts have failed for the same person, a match is held for review too.
  const failedElsewhere = unwrap(
    await db
      .from("member_signup_requests")
      .select("user_id")
      .eq("name", name)
      .eq("generation_name", generation)
      .neq("user_id", user.id),
  );
  const suspicious = (failedElsewhere?.length ?? 0) >= MAX_FAILED_ACCOUNTS_PER_PERSON;

  if (match && !suspicious) {
    unwrap(await db.from("member_accounts").insert({ user_id: user.id, member_id: match.id }));
    unwrap(await db.from("member_signup_requests").delete().eq("user_id", user.id));
    return {
      ok: true,
      message: `${generation} ${name} 학회원으로 확인되었습니다.`,
      data: "linked",
    };
  }

  unwrap(
    await db.from("member_signup_requests").upsert({
      user_id: user.id,
      email: user.email,
      name,
      generation_name: generation,
      attempts: (request?.attempts ?? 0) + 1,
    }),
  );
  return {
    ok: true,
    // The same reply whether the details were wrong or held for review.
    message:
      "학회원 정보에서 찾을 수 없습니다. 입력한 내용을 확인해 다시 제출하거나 운영진에게 문의해주세요.",
    data: "pending",
  };
}

/**
 * Links the signed-in visitor to a roster member. Name, generation and student
 * ID must all match; otherwise the request is kept for an admin to review. The
 * reply never says which field was wrong.
 */
export async function registerMember(input: unknown): Promise<ActionResult<SignupOutcome>> {
  const parsed = memberSignupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "요청이 올바르지 않습니다." };
  }
  const { accessToken, ...identity } = parsed.data;

  try {
    const secret = verificationSecret();
    if (!secret) return NOT_READY;

    const db = createAdminClient();
    // The token is checked by Supabase Auth, so the user id cannot be forged.
    const { data: auth } = await db.auth.getUser(accessToken);
    const user = auth.user;
    if (!user) {
      return { ok: false, message: "로그인이 만료되었습니다. 다시 로그인해주세요." };
    }
    return await verifyAndLink(db, { id: user.id, email: user.email ?? null }, identity, secret);
  } catch (error) {
    console.error("[member sign-up]", error);
    return { ok: false, message: "요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요." };
  }
}

const ID_TAKEN: ActionResult<never> = { ok: false, message: "이미 사용 중인 아이디입니다." };

/**
 * The account behind an ID whose sign-up has not been verified yet, if the
 * password is right. Lets a visitor correct their details and submit the
 * sign-up form again without being told the ID is taken by their own attempt.
 */
async function unverifiedAccount(db: AdminDb, email: string, password: string) {
  const visitor = createClient(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await visitor.auth.signInWithPassword({ email, password });
  if (!data.user) return null;
  const linked = unwrap(
    await db.from("member_accounts").select("member_id").eq("user_id", data.user.id).maybeSingle(),
  );
  return linked ? null : data.user;
}

/**
 * Sign-up with an AIKU ID and password, checked against the roster in the same
 * step. The visitor is only signed in once the check passes. A failed attempt
 * leaves an unverified account behind so that attempts stay counted and the
 * request reaches the admin queue; submitting again with the same ID and
 * password continues that attempt.
 */
export async function signUpWithPassword(input: unknown): Promise<ActionResult<SignupOutcome>> {
  const parsed = passwordSignupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "요청이 올바르지 않습니다." };
  }
  const { loginId, password, ...identity } = parsed.data;

  try {
    const secret = verificationSecret();
    if (!secret) return NOT_READY;

    const db = createAdminClient();
    const email = loginIdToEmail(loginId);
    const { data, error } = await db.auth.admin.createUser({
      email,
      password,
      // The address is synthetic, so there is no mailbox to confirm.
      email_confirm: true,
      user_metadata: { login_id: loginId, full_name: identity.name },
    });
    let userId = data.user?.id;
    if (!userId) {
      if (error?.code !== "email_exists" && error?.status !== 422) {
        throw error ?? new Error("createUser returned no user");
      }
      userId = (await unverifiedAccount(db, email, password))?.id;
      if (!userId) return ID_TAKEN;
    }

    const result = await verifyAndLink(db, { id: userId, email }, identity, secret);
    // Unlike a first Google / GitHub sign-in, nobody is signed in yet, so a
    // failed check is simply an error on the sign-up form.
    return result.ok && result.data === "pending" ? { ok: false, message: result.message } : result;
  } catch (error) {
    console.error("[member sign-up]", error);
    return { ok: false, message: "요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요." };
  }
}

/**
 * Adds another sign-in method to a verified member without asking for their
 * details again. The visitor proves both sides by holding a valid session for
 * the verified account and for the new one at the same moment.
 */
export async function linkAccount(input: unknown): Promise<ActionResult<SignupOutcome>> {
  const parsed = linkAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "요청이 올바르지 않습니다." };
  }

  try {
    const db = createAdminClient();
    const [verified, added] = await Promise.all([
      db.auth.getUser(parsed.data.memberToken),
      db.auth.getUser(parsed.data.accountToken),
    ]);
    const verifiedUser = verified.data.user;
    const addedUser = added.data.user;
    if (!verifiedUser || !addedUser) {
      return { ok: false, message: "로그인이 만료되었습니다. 다시 시도해주세요." };
    }

    const links = unwrap(
      await db
        .from("member_accounts")
        .select("user_id, member_id")
        .in("user_id", [verifiedUser.id, addedUser.id]),
    );
    const memberId = links?.find((link) => link.user_id === verifiedUser.id)?.member_id;
    if (!memberId) {
      return {
        ok: false,
        message: "학회원으로 확인된 계정에서만 로그인 방법을 연결할 수 있습니다.",
      };
    }
    const existing = links?.find((link) => link.user_id === addedUser.id)?.member_id;
    if (existing && existing !== memberId) {
      return { ok: false, message: "이 계정은 이미 다른 회원에게 연결되어 있습니다." };
    }
    if (!existing) {
      unwrap(
        await db.from("member_accounts").insert({ user_id: addedUser.id, member_id: memberId }),
      );
      unwrap(await db.from("member_signup_requests").delete().eq("user_id", addedUser.id));
    }
    return { ok: true, message: "로그인 방법을 연결했습니다.", data: "linked" };
  } catch (error) {
    console.error("[member link]", error);
    return { ok: false, message: "요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요." };
  }
}

/** Sign-in methods ("google", "github", "email") already linked to the signed-in member. */
export async function getLinkedLogins(accessToken: string): Promise<ActionResult<string[]>> {
  try {
    const db = createAdminClient();
    const { data } = await db.auth.getUser(String(accessToken ?? ""));
    if (!data.user) return { ok: false, message: "로그인이 만료되었습니다." };
    const own = unwrap(
      await db
        .from("member_accounts")
        .select("member_id")
        .eq("user_id", data.user.id)
        .maybeSingle(),
    );
    if (!own) return { ok: true, message: "", data: [] };
    const accounts = unwrap(
      await db.from("member_accounts").select("user_id").eq("member_id", own.member_id),
    );
    const users = await Promise.all(
      (accounts ?? []).map((account) => db.auth.admin.getUserById(account.user_id)),
    );
    const providers = users.flatMap((user) => user.data.user?.app_metadata.providers ?? []);
    return { ok: true, message: "", data: [...new Set(providers as string[])] };
  } catch (error) {
    console.error("[member link]", error);
    return { ok: false, message: "요청을 처리하지 못했습니다." };
  }
}
