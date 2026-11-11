"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useSyncExternalStore } from "react";

import { emailToLoginId } from "@/lib/auth/login-id";
import type { MemberGrade } from "@/lib/types";
import { hasStoredMemberSession } from "@/lib/supabase/auth-client";

export type MemberAccount = {
  /** Roster name once linked, else the name from Google / GitHub. */
  name: string;
  email: string | null;
  /** AIKU ID for ID / password accounts, else null. */
  loginId: string | null;
  /** "google", "github", or "email" for an AIKU ID / password account. */
  provider: string | null;
  /** Profile picture from Google / GitHub, if any. */
  avatarUrl: string | null;
  /** The roster member this account is linked to; null until sign-up is verified. */
  member: {
    id: string;
    name: string;
    generation: string;
    department: string;
    grade: MemberGrade;
    position: string;
  } | null;
  /** A sign-up request is waiting for an admin. */
  pending: boolean;
};

const toAccount = (user: User): MemberAccount => {
  const meta = user.user_metadata as Record<string, unknown>;
  const pick = (key: string) => (typeof meta[key] === "string" ? (meta[key] as string) : "");
  const loginId = emailToLoginId(user.email);
  return {
    name: pick("full_name") || pick("name") || pick("user_name") || loginId || user.email || "회원",
    // The address behind an AIKU ID is synthetic and never shown.
    email: loginId ? null : (user.email ?? null),
    loginId,
    avatarUrl: pick("avatar_url") || pick("picture") || null,
    provider: typeof user.app_metadata.provider === "string" ? user.app_metadata.provider : null,
    member: null,
    pending: false,
  };
};

/** Reads the signed-in user's own link and request rows (Row Level Security allows only those). */
export async function loadMembership(): Promise<Pick<MemberAccount, "member" | "pending">> {
  const { getAuthClient } = await import("@/lib/supabase/auth-client");
  const db = getAuthClient();
  const [link, request] = await Promise.all([
    db
      .from("member_accounts")
      .select("members(id, name, department, grade, position, generations(name))")
      .maybeSingle(),
    db.from("member_signup_requests").select("user_id").maybeSingle(),
  ]);
  const member = link.data?.members;
  return {
    member: member
      ? {
          id: member.id,
          name: member.name,
          generation: member.generations.name,
          department: member.department ?? "",
          grade: member.grade as MemberGrade,
          position: member.position ?? "",
        }
      : null,
    pending: Boolean(request.data),
  };
}

type AccountState = MemberAccount | null | undefined;

// One shared watcher, so every component sees a sign-in or sign-out at once.
let state: AccountState;
let started = false;
const listeners = new Set<() => void>();

const publish = (next: AccountState) => {
  state = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Starts following the member session. Downloads the Supabase client, so call it only when needed. */
export function watchMemberAccount() {
  if (started) return;
  started = true;
  publish(undefined);
  void import("@/lib/supabase/auth-client").then(({ getAuthClient }) => {
    let latest = 0;
    getAuthClient().auth.onAuthStateChange((_event, session) => {
      const turn = ++latest;
      if (!session) {
        publish(null);
        return;
      }
      const base = toAccount(session.user);
      // Supabase forbids awaiting its own calls inside this callback, so the
      // membership lookup runs right after it returns.
      setTimeout(async () => {
        const membership = await loadMembership();
        if (turn !== latest) return;
        publish({ ...base, ...membership, name: membership.member?.name ?? base.name });
      }, 0);
    });
  });
}

/** Re-reads the membership after it changed, e.g. right after sign-up links the account. */
export async function refreshMemberAccount() {
  if (!state) return;
  const membership = await loadMembership();
  if (state) publish({ ...state, ...membership, name: membership.member?.name ?? state.name });
}

/**
 * The signed-in account, `null` when signed out and `undefined` while unknown.
 * With `eager: false` the Supabase client is only downloaded for visitors who
 * already have a stored session, so signed-out visitors pay nothing for it.
 */
export function useMemberAccount({ eager = false } = {}): AccountState {
  const account = useSyncExternalStore(
    subscribe,
    () => state,
    () => undefined,
  );

  useEffect(() => {
    if (eager || hasStoredMemberSession()) {
      watchMemberAccount();
    } else if (!started) {
      publish(null);
    }
  }, [eager]);

  return account;
}
