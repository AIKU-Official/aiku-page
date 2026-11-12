"use server";

import { endAdminSession, startAdminSession } from "@/lib/auth/session";
import { isCurrentOfficer } from "@/lib/members/officers";
import { signedInMember } from "@/lib/members/signed-in";
import { createAdminClient } from "@/lib/supabase/admin-client";

/**
 * Called by the browser whenever the signed-in account is known: a current
 * officer gets the admin session, anyone else has it cleared. Returns whether
 * the account is an admin, for showing the admin link.
 */
export async function syncAdminSession(accessToken: unknown): Promise<boolean> {
  const db = createAdminClient();
  const memberId = await signedInMember(db, String(accessToken ?? ""));
  if (memberId && (await isCurrentOfficer(db, memberId))) {
    await startAdminSession(memberId);
    return true;
  }
  await endAdminSession();
  return false;
}

/** Clears the admin session; the browser calls it when signing out. */
export async function clearAdminSession(): Promise<void> {
  await endAdminSession();
}
