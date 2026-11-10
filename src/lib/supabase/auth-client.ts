import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env.public";

import type { Database } from "./database.types";

/** localStorage key of the member session; also read by the header to skip loading this client. */
export const MEMBER_SESSION_KEY = "aiku-member-session";

export const MEMBER_AUTH_PROVIDERS = ["google", "github"] as const;
export type MemberAuthProvider = (typeof MEMBER_AUTH_PROVIDERS)[number];

let client: SupabaseClient<Database> | undefined;

/**
 * Browser-side client for member sign-in (Supabase Auth, OAuth with PKCE).
 * The session lives in localStorage and is unrelated to the admin session
 * cookie. It identifies a visitor; it grants no write access by itself.
 */
export function getAuthClient(): SupabaseClient<Database> {
  client ??= createClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    auth: {
      flowType: "pkce",
      storageKey: MEMBER_SESSION_KEY,
      persistSession: true,
      autoRefreshToken: true,
      // The callback page finishes the sign-in when it finds ?code= in the URL.
      detectSessionInUrl: true,
    },
  });
  return client;
}
