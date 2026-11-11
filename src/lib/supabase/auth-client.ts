import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env.public";

import type { Database } from "./database.types";

/** Storage key of the member session. */
export const MEMBER_SESSION_KEY = "aiku-member-session";

export const MEMBER_AUTH_PROVIDERS = ["google", "github"] as const;
export type MemberAuthProvider = (typeof MEMBER_AUTH_PROVIDERS)[number];

/** localStorage key of the "자동 로그인" choice; absent means on. */
const REMEMBER_KEY = "aiku-member-remember";

const store = (kind: "local" | "session"): Storage | null => {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    // Storage can be blocked (private mode, site data disabled).
    return null;
  }
};

/** Whether the session should outlive the browser tab ("자동 로그인"). */
export const getRememberMember = () => store("local")?.getItem(REMEMBER_KEY) !== "0";

const rememberListeners = new Set<() => void>();

export function setRememberMember(remember: boolean) {
  store("local")?.setItem(REMEMBER_KEY, remember ? "1" : "0");
  rememberListeners.forEach((listener) => listener());
}

/** For useSyncExternalStore: notifies when the choice changes. */
export function subscribeRememberMember(listener: () => void) {
  rememberListeners.add(listener);
  return () => {
    rememberListeners.delete(listener);
  };
}

/** True when either storage holds a member session; cheap enough for the header to call. */
export const hasStoredMemberSession = () =>
  [store("local"), store("session")].some((s) => s?.getItem(MEMBER_SESSION_KEY) != null);

/**
 * Keeps the session in localStorage when "자동 로그인" is on, and in
 * sessionStorage (gone when the tab closes) when it is off. Reads look in both,
 * so a session is found wherever the choice at sign-in time put it.
 */
const sessionStorageAdapter = {
  getItem: (key: string) => store("session")?.getItem(key) ?? store("local")?.getItem(key) ?? null,
  setItem: (key: string, value: string) => {
    const remember = getRememberMember();
    store(remember ? "local" : "session")?.setItem(key, value);
    store(remember ? "session" : "local")?.removeItem(key);
  },
  removeItem: (key: string) => {
    store("local")?.removeItem(key);
    store("session")?.removeItem(key);
  },
};

/** sessionStorage key: access token of the verified account while another sign-in method is being added. */
const LINK_TOKEN_KEY = "aiku-link-token";

/**
 * Starts adding `provider` as another sign-in method of the signed-in member.
 * The current session's token is kept for the callback page, which hands both
 * sessions to the server.
 */
export async function startLinking(provider: MemberAuthProvider) {
  const auth = getAuthClient().auth;
  const { data } = await auth.getSession();
  if (!data.session) return { error: new Error("no session") };
  store("session")?.setItem(LINK_TOKEN_KEY, data.session.access_token);
  return auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/login/callback` },
  });
}

/** The token left by `startLinking`, removed as it is read. */
export function takeLinkToken(): string | null {
  const token = store("session")?.getItem(LINK_TOKEN_KEY) ?? null;
  store("session")?.removeItem(LINK_TOKEN_KEY);
  return token;
}

let client: SupabaseClient<Database> | undefined;

/**
 * Browser-side client for member sign-in (Supabase Auth, OAuth with PKCE).
 * The session lives in browser storage and is unrelated to the admin session
 * cookie. It identifies a visitor; it grants no write access by itself.
 */
export function getAuthClient(): SupabaseClient<Database> {
  client ??= createClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    auth: {
      flowType: "pkce",
      storageKey: MEMBER_SESSION_KEY,
      storage: sessionStorageAdapter,
      persistSession: true,
      autoRefreshToken: true,
      // The callback page finishes the sign-in when it finds ?code= in the URL.
      detectSessionInUrl: true,
    },
  });
  return client;
}
