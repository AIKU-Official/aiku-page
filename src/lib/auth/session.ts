import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { publicEnv } from "@/lib/env.public";
import { serverEnv } from "@/lib/env.server";
import { isCurrentOfficer } from "@/lib/members/officers";
import { createAdminClient } from "@/lib/supabase/admin-client";

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
  verifySessionToken,
} from "./token";

// Admins are the current generation's officers (회장, 부회장). Signing in as
// one of them issues this session (actions/auth.ts); it holds their member id
// and is honoured only while they are still a current officer.

export type AdminSession = { memberId: string };

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const memberId = await verifySessionToken(token, serverEnv().SESSION_SECRET);
  if (!memberId) return null;
  return (await isCurrentOfficer(createAdminClient(), memberId)) ? { memberId } : null;
}

/** For pages: sends anyone who is not an admin to the member sign-in page. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function startAdminSession(memberId: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, await signSessionToken(memberId, serverEnv().SESSION_SECRET), {
    httpOnly: true,
    sameSite: "lax",
    // Secure whenever the site is served over HTTPS (production, previews).
    secure: publicEnv.siteUrl.startsWith("https://"),
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function endAdminSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
