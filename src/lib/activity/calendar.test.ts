import { describe, expect, it } from "vitest";

import { formatDay, formatPoints } from "./calendar";

describe("formatting", () => {
  it("writes days and points the way the panel shows them", () => {
    expect(formatDay("2026-07-30")).toBe("7월 30일 (목)");
    expect(formatPoints(2)).toBe("+2");
    expect(formatPoints(-0.5)).toBe("-0.5");
    expect(formatPoints(0)).toBe("0");
  });
});
