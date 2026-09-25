import { describe, expect, it } from "vitest";

import { formatNewsDate } from "./format-date";

describe("formatNewsDate", () => {
  it("formats ISO dates with dots", () => {
    expect(formatNewsDate("2026-09-26")).toBe("2026.09.26");
  });

  it("returns an empty string when there is no date", () => {
    expect(formatNewsDate(null)).toBe("");
    expect(formatNewsDate("  ")).toBe("");
  });
});
