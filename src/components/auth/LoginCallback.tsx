"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { linkAccount } from "@/actions/membership";
import { loadMembership, watchMemberAccount } from "@/lib/auth/member";
import { getAuthClient, takeLinkToken } from "@/lib/supabase/auth-client";

/**
 * Landing page of the OAuth redirect. Creating the client exchanges the
 * `?code=` in the URL for a session; then the visitor is sent on.
 */
export function LoginCallback() {
  const router = useRouter();
  // SIGNED_IN and INITIAL_SESSION can both arrive; act on the first only.
  const handled = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("error")) {
      router.replace("/login?error=oauth");
      return;
    }

    // Lets the header pick up the new session without a reload.
    watchMemberAccount();
    const { data } = getAuthClient().auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION fires once the code exchange has finished (or failed).
      if (event !== "SIGNED_IN" && event !== "INITIAL_SESSION") return;
      if (!session) {
        router.replace("/login?error=oauth");
        return;
      }
      // Supabase forbids awaiting its own calls inside this callback.
      setTimeout(async () => {
        if (handled.current) return;
        handled.current = true;

        // Arriving from "연결" on the profile: add this account to the member
        // who started it, instead of asking for their details again.
        const memberToken = takeLinkToken();
        if (memberToken) {
          const result = await linkAccount({ memberToken, accountToken: session.access_token });
          const { member } = result.ok ? { member: true } : await loadMembership();
          // A full navigation, so the profile editor reads the outcome from the address.
          window.location.replace(
            member ? `/profile/edit?linked=${result.ok ? 1 : 0}#logins` : "/login/register",
          );
          return;
        }

        const { member } = await loadMembership();
        // Accounts not yet linked to a roster member go through sign-up first.
        router.replace(member ? "/" : "/login/register");
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  return (
    <p role="status" className="text-muted">
      로그인하는 중입니다…
    </p>
  );
}
