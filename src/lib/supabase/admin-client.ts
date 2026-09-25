import "server-only";

import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env.public";
import { serverEnv } from "@/lib/env.server";

import type { Database } from "./database.types";

/**
 * Full-access client using the secret (service_role) key. It bypasses Row
 * Level Security, so only call it after requireAdmin().
 */
export function createAdminClient() {
  if (!publicEnv.supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL 환경변수가 필요합니다.");
  }

  return createClient<Database>(publicEnv.supabaseUrl, serverEnv().SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
