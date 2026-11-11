import { describe, expect, it } from "vitest";

import { emailToLoginId, LOGIN_ID_PATTERN, loginIdToEmail, normalizeLoginId } from "./login-id";

describe("login id", () => {
  it("round-trips an id through its address", () => {
    expect(emailToLoginId(loginIdToEmail("  Chan.Lee "))).toBe("chan.lee");
  });

  it("does not treat a real address as an id", () => {
    expect(emailToLoginId("someone@gmail.com")).toBeNull();
    expect(emailToLoginId(null)).toBeNull();
  });

  it("accepts only safe ids", () => {
    for (const id of ["chan", "chan_lee-01", "a.b.c.d"]) {
      expect(LOGIN_ID_PATTERN.test(normalizeLoginId(id))).toBe(true);
    }
    for (const id of ["abc", "-chan", "chan lee", "chan@aiku", "한글아이디", "a".repeat(21)]) {
      expect(LOGIN_ID_PATTERN.test(normalizeLoginId(id))).toBe(false);
    }
  });
});
