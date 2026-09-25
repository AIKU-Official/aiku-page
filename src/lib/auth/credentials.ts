import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { serverEnv } from "@/lib/env.server";

// Hashing first gives equal-length buffers, so the comparison takes the same
// time regardless of input length.
const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();

/** Constant-time check of the shared admin account (ADMIN_ID / ADMIN_PASSWORD). */
export function credentialsMatch(adminId: string, password: string): boolean {
  const env = serverEnv();
  const idMatches = timingSafeEqual(digest(adminId), digest(env.ADMIN_ID));
  const passwordMatches = timingSafeEqual(digest(password), digest(env.ADMIN_PASSWORD));
  return idMatches && passwordMatches;
}
