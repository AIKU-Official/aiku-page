import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import { signSessionToken, verifySessionToken } from "./token";

const secret = "x".repeat(48);

describe("session token", () => {
  it("round-trips for the configured admin", async () => {
    const token = await signSessionToken("admin", secret);
    expect(await verifySessionToken(token, secret, "admin")).toBe("admin");
  });

  it("rejects a different secret, a different admin id and garbage", async () => {
    const token = await signSessionToken("admin", secret);
    expect(await verifySessionToken(token, "y".repeat(48), "admin")).toBeNull();
    expect(await verifySessionToken(token, secret, "someone-else")).toBeNull();
    expect(await verifySessionToken(`${token}x`, secret, "admin")).toBeNull();
    expect(await verifySessionToken(undefined, secret, "admin")).toBeNull();
    expect(await verifySessionToken(token, undefined, "admin")).toBeNull();
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

    expect(await verifySessionToken(expired, secret, "admin")).toBeNull();
    expect(await verifySessionToken(otherAudience, secret, "admin")).toBeNull();
  });
});
