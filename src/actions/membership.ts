"use server";

import { timingSafeEqual } from "node:crypto";

import { ActionError, adminAction, unwrap } from "@/lib/actions/admin-action";
import type { ActionResult } from "@/lib/actions/result";
import { serverEnv } from "@/lib/env.server";
import { studentIdDigest } from "@/lib/members/student-id";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { idSchema, memberSignupSchema, signupDecisionSchema } from "@/lib/validators";

/** Sign-up is closed for an account after this many failed verifications. */
const MAX_SIGNUP_ATTEMPTS = 5;

export type SignupOutcome = "linked" | "pending";

const sameDigest = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

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
  const { accessToken, name, generation, studentId } = parsed.data;

  try {
    const secret = serverEnv().MEMBER_VERIFICATION_SECRET;
    if (!secret) throw new Error("MEMBER_VERIFICATION_SECRET is not set.");

    const db = createAdminClient();
    // The token is checked by Supabase Auth, so the user id cannot be forged.
    const { data: auth } = await db.auth.getUser(accessToken);
    const user = auth.user;
    if (!user) {
      return { ok: false, message: "로그인이 만료되었습니다. 다시 로그인해주세요." };
    }

    const linked = unwrap(
      await db.from("member_accounts").select("member_id").eq("user_id", user.id).maybeSingle(),
    );
    if (linked) {
      return { ok: true, message: "이미 회원으로 등록된 계정입니다.", data: "linked" };
    }

    const request = unwrap(
      await db
        .from("member_signup_requests")
        .select("attempts")
        .eq("user_id", user.id)
        .maybeSingle(),
    );
    if (request && request.attempts >= MAX_SIGNUP_ATTEMPTS) {
      return {
        ok: false,
        message: "확인 시도 횟수를 넘었습니다. 운영진의 승인을 기다려주세요.",
      };
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

    if (match) {
      unwrap(await db.from("member_accounts").insert({ user_id: user.id, member_id: match.id }));
      unwrap(await db.from("member_signup_requests").delete().eq("user_id", user.id));
      return { ok: true, message: "회원 확인이 완료되었습니다.", data: "linked" };
    }

    unwrap(
      await db.from("member_signup_requests").upsert({
        user_id: user.id,
        email: user.email ?? null,
        name,
        generation_name: generation,
        attempts: (request?.attempts ?? 0) + 1,
      }),
    );
    return {
      ok: true,
      message:
        "입력한 정보가 회원 명단과 일치하지 않습니다. 운영진이 확인한 뒤 승인하며, 정보를 고쳐 다시 제출할 수도 있습니다.",
      data: "pending",
    };
  } catch (error) {
    console.error("[member sign-up]", error);
    return { ok: false, message: "요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요." };
  }
}

/** Admin: accept a pending request as the chosen member. */
export async function approveSignupRequest(input: unknown): Promise<ActionResult> {
  return adminAction({ schema: signupDecisionSchema, input }, async ({ userId, memberId }, db) => {
    const request = unwrap(
      await db.from("member_signup_requests").select("user_id").eq("user_id", userId).maybeSingle(),
    );
    if (!request) throw new ActionError("가입 요청을 찾을 수 없습니다.");
    unwrap(await db.from("member_accounts").upsert({ user_id: userId, member_id: memberId }), {
      "23503": "멤버 또는 계정을 찾을 수 없습니다.",
    });
    unwrap(await db.from("member_signup_requests").delete().eq("user_id", userId));
    return { message: "가입 요청을 승인했습니다." };
  });
}

/** Admin: discard a pending request (the visitor may submit again). */
export async function rejectSignupRequest(input: unknown): Promise<ActionResult> {
  return adminAction({ schema: idSchema, input }, async (userId, db) => {
    const deleted = unwrap(
      await db.from("member_signup_requests").delete().eq("user_id", userId).select("user_id"),
    );
    if (!deleted?.length) throw new ActionError("가입 요청을 찾을 수 없습니다.");
    return { message: "가입 요청을 거절했습니다." };
  });
}
