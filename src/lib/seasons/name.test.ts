import { describe, expect, it } from "vitest";

import {
  newestFirst,
  parseSeasonName,
  pointsPeriod,
  seasonCode,
  seasonName,
  seasonOfDate,
} from "./name";

describe("parseSeasonName", () => {
  it("reads the stored names", () => {
    expect(parseSeasonName("26-여름")).toEqual({ year: 2026, term: "summer" });
    expect(parseSeasonName("25-겨울")).toEqual({ year: 2025, term: "winter" });
    expect(parseSeasonName("24-1")).toEqual({ year: 2024, term: "1" });
    expect(parseSeasonName("23-2")).toEqual({ year: 2023, term: "2" });
  });

  it("reads the accepted aliases", () => {
    expect(parseSeasonName("2026-1")).toEqual({ year: 2026, term: "1" });
    expect(parseSeasonName("2026-W")).toEqual({ year: 2026, term: "winter" });
    expect(parseSeasonName("2026-겨울")).toEqual({ year: 2026, term: "winter" });
    expect(parseSeasonName("26-s")).toEqual({ year: 2026, term: "summer" });
  });

  it("refuses other shapes", () => {
    for (const name of ["26-3", "26 여름", "26-봄", "2026년 2학기", ""]) {
      expect(parseSeasonName(name)).toBeNull();
    }
  });
});

describe("season names and dates", () => {
  it("writes the stored name and the calendar code", () => {
    expect(seasonName(2026, "summer")).toBe("26-여름");
    expect(seasonCode(2027, "winter")).toBe("2027-W");
  });

  it("finds the season of a day at every boundary", () => {
    const at = (iso: string) => {
      const s = seasonOfDate(iso);
      return seasonCode(s.year, s.term);
    };
    expect(
      [
        "2027-01-01",
        "2027-02-28",
        "2027-03-01",
        "2026-06-30",
        "2026-07-01",
        "2026-08-31",
        "2026-09-01",
        "2026-12-31",
      ].map(at),
    ).toEqual(["2027-W", "2027-W", "2027-1", "2026-1", "2026-S", "2026-S", "2026-2", "2026-2"]);
  });

  it("orders newest first", () => {
    const seasons = ["26-1", "26-2", "26-겨울", "25-2", "26-여름"].map((n) => parseSeasonName(n)!);
    expect(seasons.sort(newestFirst).map((s) => seasonName(s.year, s.term))).toEqual([
      "26-2",
      "26-여름",
      "26-1",
      "26-겨울",
      "25-2",
    ]);
  });

  it("pairs seasons for points", () => {
    expect(pointsPeriod(2026, "summer")).toEqual({ key: "2026-2", seasons: ["26-여름", "26-2"] });
    expect(pointsPeriod(2026, "1").seasons).toEqual(["26-겨울", "26-1"]);
  });
});
