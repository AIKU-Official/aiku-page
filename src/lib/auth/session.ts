import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { publicEnv } from "@/lib/env.public";
import { serverEnv } from "@/lib/env.server";

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
  verifySessionToken,
} from "./token";

export type AdminSession = { adminId: string };

export async function getAdminSession(): Promise<AdminSession | null> {
  const { SESSION_SECRET, ADMIN_ID } = serverEnv();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const adminId = await verifySessionToken(token, SESSION_SECRET, ADMIN_ID);
  return adminId ? { adminId } : null;
}

/** For pages: sends visitors without a valid session to /login. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function startAdminSession(): Promise<void> {
  const { SESSION_SECRET, ADMIN_ID } = serverEnv();
  (await cookies()).set(SESSION_COOKIE, await signSessionToken(ADMIN_ID, SESSION_SECRET), {
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
