import { jwtVerify, SignJWT } from "jose";

// Stateless admin session: an HS256-signed JWT in an HttpOnly cookie whose
// subject is the admin's member id. Kept free of server-only imports so
// proxy.ts can verify it too; the server also re-checks that the member is
// still a current officer (lib/auth/session.ts).

export const SESSION_COOKIE = "aiku_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

const ISSUER = "aiku";
const AUDIENCE = "aiku-admin";

const keyFrom = (secret: string) => new TextEncoder().encode(secret);

export async function signSessionToken(memberId: string, secret: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(memberId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(keyFrom(secret));
}

/** The member id in a valid, unexpired session token; null otherwise. */
export async function verifySessionToken(
  token: string | undefined,
  secret: string | undefined,
): Promise<string | null> {
  if (!token || !secret) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, keyFrom(secret), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
