import "server-only";

import { headers } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin-client";

// Login throttling: at most MAX_FAILURES failed attempts per IP within the
// window. Failures are stored in the login_attempts table (never readable by
// clients); the keepalive cron prunes old rows.

const WINDOW_MINUTES = 15;
const MAX_FAILURES = 5;

export const LOGIN_BLOCKED_MESSAGE = `로그인 시도가 너무 많습니다. ${WINDOW_MINUTES}분 후 다시 시도하세요.`;

export async function clientIp(): Promise<string> {
  const headerList = await headers();
  // Vercel sets x-forwarded-for to the real client address.
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headerList.get("x-real-ip") || "unknown";
}

export async function isLoginBlocked(ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count, error } = await createAdminClient()
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since);

  if (error) {
    throw new Error(`로그인 시도 기록을 확인하지 못했습니다: ${error.message}`);
  }
  return (count ?? 0) >= MAX_FAILURES;
}

export async function recordLoginFailure(ip: string): Promise<void> {
  await createAdminClient().from("login_attempts").insert({ ip });
}

export async function clearLoginFailures(ip: string): Promise<void> {
  await createAdminClient().from("login_attempts").delete().eq("ip", ip);
}
