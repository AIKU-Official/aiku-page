import { describe, expect, it } from "vitest";

import { formatDay, formatPoints, semesterOf } from "./calendar";

describe("semesterOf", () => {
  it("pairs winter with the 1st term and summer with the 2nd", () => {
    expect(semesterOf(2026, "winter")).toBe("26-1");
    expect(semesterOf(2026, "1")).toBe("26-1");
    expect(semesterOf(2026, "summer")).toBe("26-2");
    expect(semesterOf(2026, "2")).toBe("26-2");
  });
});

describe("formatting", () => {
  it("writes days and points the way the panel shows them", () => {
    expect(formatDay("2026-07-30")).toBe("7월 30일 (목)");
    expect(formatPoints(2)).toBe("+2");
    expect(formatPoints(-0.5)).toBe("-0.5");
    expect(formatPoints(0)).toBe("0");
  });
});
