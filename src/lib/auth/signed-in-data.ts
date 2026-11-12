"use client";

import { useEffect, useState } from "react";

import type { ActionResult } from "@/lib/actions/result";
import { getAuthClient } from "@/lib/supabase/auth-client";

/** The signed-in user's access token, or "" when signed out. */
export async function currentAccessToken(): Promise<string> {
  const { data } = await getAuthClient().auth.getSession();
  return data.session?.access_token ?? "";
}

export type SignedInData<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

/**
 * Loads data that only the signed-in member may see, through a Server Action
 * that takes their access token and works out the member itself. Starts once
 * `memberId` is known and reloads if it changes; nothing runs while it is
 * null (signed out, or not this member's page).
 */
export function useSignedInData<T>(
  memberId: string | null | undefined,
  load: (accessToken: string) => Promise<ActionResult<T>>,
) {
  const [state, setState] = useState<SignedInData<T>>({ status: "loading" });

  useEffect(() => {
    if (!memberId) return;
    let cancelled = false;
    void (async () => {
      const result = await load(await currentAccessToken());
      if (cancelled) return;
      setState(
        result.ok ? { status: "ready", data: result.data } : { status: "error", message: result.message },
      );
    })();
    return () => {
      cancelled = true;
    };
    // `load` is a Server Action reference, stable for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  return [state, setState] as const;
}
