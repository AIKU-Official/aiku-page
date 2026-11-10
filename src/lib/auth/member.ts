"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { MEMBER_SESSION_KEY } from "@/lib/supabase/auth-client";

export type MemberAccount = {
  /** Roster name once linked, else the name from Google / GitHub. */
  name: string;
  email: string | null;
  /** "google" or "github". */
  provider: string | null;
  /** The roster member this account is linked to; null until sign-up is verified. */
  member: { id: string; name: string; generation: string } | null;
  /** A sign-up request is waiting for an admin. */
  pending: boolean;
};

const toAccount = (user: User): MemberAccount => {
  const meta = user.user_metadata as Record<string, unknown>;
  const pick = (key: string) => (typeof meta[key] === "string" ? (meta[key] as string) : "");
  return {
    name: pick("full_name") || pick("name") || pick("user_name") || user.email || "회원",
    email: user.email ?? null,
    provider: typeof user.app_metadata.provider === "string" ? user.app_metadata.provider : null,
    member: null,
    pending: false,
  };
};

const hasStoredSession = () => {
  try {
    return window.localStorage.getItem(MEMBER_SESSION_KEY) !== null;
  } catch {
    return false;
  }
};

/** Reads the signed-in user's own link and request rows (Row Level Security allows only those). */
export async function loadMembership(): Promise<Pick<MemberAccount, "member" | "pending">> {
  const { getAuthClient } = await import("@/lib/supabase/auth-client");
  const db = getAuthClient();
  const [link, request] = await Promise.all([
    db.from("member_accounts").select("members(id, name, generations(name))").maybeSingle(),
    db.from("member_signup_requests").select("user_id").maybeSingle(),
  ]);
  const member = link.data?.members;
  return {
    member: member
      ? { id: member.id, name: member.name, generation: member.generations.name }
      : null,
    pending: Boolean(request.data),
  };
}

/**
 * The signed-in account, `null` when signed out and `undefined` while unknown.
 * With `eager: false` the Supabase client is only downloaded for visitors who
 * already have a stored session, so signed-out visitors pay nothing for it.
 */
export function useMemberAccount({ eager = false } = {}): MemberAccount | null | undefined {
  const [account, setAccount] = useState<MemberAccount | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const watch = async () => {
      if (!eager && !hasStoredSession()) {
        setAccount(null);
        return;
      }
      const { getAuthClient } = await import("@/lib/supabase/auth-client");
      if (cancelled) return;
      const { data } = getAuthClient().auth.onAuthStateChange((_event, session) => {
        if (!session) {
          setAccount(null);
          return;
        }
        const base = toAccount(session.user);
        // Supabase forbids awaiting its own calls inside this callback, so the
        // membership lookup runs right after it returns.
        setTimeout(async () => {
          const membership = await loadMembership();
          if (cancelled) return;
          setAccount({
            ...base,
            ...membership,
            name: membership.member?.name ?? base.name,
          });
        }, 0);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    };
    void watch();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [eager]);

  return account;
}
