import { describe, expect, it } from "vitest";

import { addDays, rangeLabel, timelineDays, weekStart } from "./timeline";

describe("timeline", () => {
  it("starts on the Monday of the week", () => {
    expect(weekStart("2026-11-13")).toBe("2026-11-09"); // Friday
    expect(weekStart("2026-11-15")).toBe("2026-11-09"); // Sunday ends the week
    expect(weekStart("2026-11-09")).toBe("2026-11-09");
  });

  it("lists four weeks of days across a month end", () => {
    const days = timelineDays("2026-11-09");
    expect(days).toHaveLength(28);
    expect(days.at(-1)!.iso).toBe("2026-12-06");
    expect(days.find((d) => d.monthStart)!.iso).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("labels the range", () => {
    expect(rangeLabel("2026-11-09")).toBe("11월 9일 – 12월 6일");
  });
});
