"use client";

import { useEffect, useState } from "react";

import { getMyProfile, type ProfilePage } from "@/actions/profile";
import type { MemberAccount } from "@/lib/auth/member";
import { getAuthClient } from "@/lib/supabase/auth-client";

export async function currentAccessToken() {
  const { data } = await getAuthClient().auth.getSession();
  return data.session?.access_token ?? "";
}

export type MyProfileState =
  | { status: "loading" }
  | { status: "ready"; page: ProfilePage }
  | { status: "error"; message: string };

/** Loads the signed-in member's own profile once their roster link is known. */
export function useMyProfile(account: MemberAccount | null | undefined) {
  const memberId = account?.member?.id;
  const [state, setState] = useState<MyProfileState>({ status: "loading" });

  useEffect(() => {
    if (!memberId) return;
    let cancelled = false;
    void (async () => {
      const result = await getMyProfile(await currentAccessToken());
      if (cancelled) return;
      setState(
        result.ok
          ? { status: "ready", page: result.data }
          : { status: "error", message: result.message },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  return [state, setState] as const;
}
