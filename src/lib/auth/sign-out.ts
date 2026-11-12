"use client";

/**
 * Signs the member out everywhere on this device. The account watcher sees
 * the sign-out and clears the admin session as well. Loads the Supabase
 * client on demand, so pages do not ship it to every visitor.
 */
export async function signOut(): Promise<void> {
  const { getAuthClient } = await import("@/lib/supabase/auth-client");
  await getAuthClient().auth.signOut();
}
