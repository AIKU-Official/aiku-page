import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env.public";

import type { Database } from "./database.types";

/**
 * Read-only client using the publishable (anon) key. Row Level Security limits
 * it to reading published content.
 */
export function createPublicClient() {
  const { supabaseUrl, supabasePublishableKey } = publicEnv;
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 환경변수가 필요합니다.",
    );
  }

  return createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
