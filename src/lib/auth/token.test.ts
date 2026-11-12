import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import { signSessionToken, verifySessionToken } from "./token";

const secret = "x".repeat(48);

describe("session token", () => {
  it("round-trips the admin's member id", async () => {
    const token = await signSessionToken("member-1", secret);
    expect(await verifySessionToken(token, secret)).toBe("member-1");
  });

  it("rejects a different secret and garbage", async () => {
    const token = await signSessionToken("member-1", secret);
    expect(await verifySessionToken(token, "y".repeat(48))).toBeNull();
    expect(await verifySessionToken(`${token}x`, secret)).toBeNull();
    expect(await verifySessionToken(undefined, secret)).toBeNull();
    expect(await verifySessionToken(token, undefined)).toBeNull();
  });

  it("rejects expired tokens and tokens for another audience", async () => {
    const key = new TextEncoder().encode(secret);
    const expired = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("admin")
      .setIssuer("aiku")
      .setAudience("aiku-admin")
      .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
      .sign(key);
    const otherAudience = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("admin")
      .setIssuer("aiku")
      .setAudience("elsewhere")
      .setExpirationTime("1h")
      .sign(key);

    expect(await verifySessionToken(expired, secret)).toBeNull();
    expect(await verifySessionToken(otherAudience, secret)).toBeNull();
  });
});
