import { jwtVerify, SignJWT } from "jose";

// Stateless admin session: an HS256-signed JWT in an HttpOnly cookie. Kept
// free of server-only imports so proxy.ts can verify it too.

export const SESSION_COOKIE = "aiku_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

const ISSUER = "aiku";
const AUDIENCE = "aiku-admin";

const keyFrom = (secret: string) => new TextEncoder().encode(secret);

export async function signSessionToken(adminId: string, secret: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(adminId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(keyFrom(secret));
}

/**
 * Returns the admin id when the token is valid, unexpired and issued for the
 * currently configured ADMIN_ID (changing ADMIN_ID signs everyone out).
 */
export async function verifySessionToken(
  token: string | undefined,
  secret: string | undefined,
  adminId: string | undefined,
): Promise<string | null> {
  if (!token || !secret || !adminId) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, keyFrom(secret), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });
    return payload.sub === adminId ? adminId : null;
  } catch {
    return null;
  }
}
