import { describe, expect, it } from "vitest";

import { normalizeStudentId, studentIdDigest } from "./student-id";

describe("normalizeStudentId", () => {
  it("accepts 10 digits and ignores spaces and hyphens", () => {
    expect(normalizeStudentId("2023320001")).toBe("2023320001");
    expect(normalizeStudentId(" 2023-320-001 ")).toBe("2023320001");
  });

  it("rejects anything else", () => {
    expect(normalizeStudentId("202332000")).toBeNull();
    expect(normalizeStudentId("20233200011")).toBeNull();
    expect(normalizeStudentId("2023a20001")).toBeNull();
    expect(normalizeStudentId("")).toBeNull();
  });
});

describe("studentIdDigest", () => {
  it("is stable, keyed and independent of formatting", () => {
    const digest = studentIdDigest("2023320001", "secret-a");
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(studentIdDigest("2023-320001", "secret-a")).toBe(digest);
    expect(studentIdDigest("2023320001", "secret-b")).not.toBe(digest);
    expect(studentIdDigest("2023320002", "secret-a")).not.toBe(digest);
  });

  it("returns null for a malformed ID and refuses an empty secret", () => {
    expect(studentIdDigest("abc", "secret-a")).toBeNull();
    expect(() => studentIdDigest("2023320001", "")).toThrow();
  });
});
