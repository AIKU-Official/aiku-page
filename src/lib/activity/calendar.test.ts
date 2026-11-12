import { describe, expect, it } from "vitest";

import { calendarWeeks, formatDay, formatPoints, semesterOf, worstStatus } from "./calendar";

describe("semesterOf", () => {
  it("pairs winter with the 1st term and summer with the 2nd", () => {
    expect(semesterOf(2026, "winter")).toBe("26-1");
    expect(semesterOf(2026, "1")).toBe("26-1");
    expect(semesterOf(2026, "summer")).toBe("26-2");
    expect(semesterOf(2026, "2")).toBe("26-2");
  });
});

describe("calendarWeeks", () => {
  it("starts on Monday and blanks days outside the range", () => {
    // 2026-07-09 is a Thursday.
    const weeks = calendarWeeks("2026-07-09", "2026-07-14");
    expect(weeks).toHaveLength(2);
    expect(weeks[0]).toEqual([null, null, null, "2026-07-09", "2026-07-10", "2026-07-11", "2026-07-12"]);
    expect(weeks[1].slice(0, 2)).toEqual(["2026-07-13", "2026-07-14"]);
    expect(weeks[1][2]).toBeNull();
  });
});

describe("worstStatus", () => {
  it("shows an absence over anything else on the same day", () => {
    expect(worstStatus(["present", "absent", "late"])).toBe("absent");
    expect(worstStatus(["present", "excused_absent"])).toBe("excused_absent");
    expect(worstStatus(["present"])).toBe("present");
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
