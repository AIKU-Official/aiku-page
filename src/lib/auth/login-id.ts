/**
 * AIKU's own ID / password accounts are Supabase Auth email accounts whose
 * address is made from the ID. The address never receives mail; it only keeps
 * these accounts in the same user table as Google and GitHub sign-ins.
 */
const LOGIN_ID_DOMAIN = "id.aiku-page.vercel.app";

/** 4–20 characters: lowercase letters, digits, dot, underscore, hyphen; starts with a letter or digit. */
export const LOGIN_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{3,19}$/;
export const MIN_PASSWORD_LENGTH = 8;

export const normalizeLoginId = (value: string) => value.trim().toLowerCase();

export const loginIdToEmail = (loginId: string) =>
  `${normalizeLoginId(loginId)}@${LOGIN_ID_DOMAIN}`;

/** The ID behind an address made by `loginIdToEmail`, or null for a real email address. */
export function emailToLoginId(email: string | null | undefined): string | null {
  const suffix = `@${LOGIN_ID_DOMAIN}`;
  return email?.endsWith(suffix) ? email.slice(0, -suffix.length) : null;
}
