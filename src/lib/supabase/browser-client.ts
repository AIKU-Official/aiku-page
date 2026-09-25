import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env.public";

import type { Database } from "./database.types";

let client: SupabaseClient<Database> | undefined;

/**
 * Browser-side client with the publishable key. The admin only uses it to
 * upload files through signed upload URLs issued by the server.
 */
export function getBrowserClient(): SupabaseClient<Database> {
  client ??= createClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
