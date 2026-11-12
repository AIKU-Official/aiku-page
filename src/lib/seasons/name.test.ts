import { describe, expect, it } from "vitest";

import { parseSeasonName } from "./name";

describe("parseSeasonName", () => {
  it("reads the four terms", () => {
    expect(parseSeasonName("26-여름")).toEqual({ year: 2026, term: "summer" });
    expect(parseSeasonName("25-겨울")).toEqual({ year: 2025, term: "winter" });
    expect(parseSeasonName("24-1")).toEqual({ year: 2024, term: "1" });
    expect(parseSeasonName("23-2")).toEqual({ year: 2023, term: "2" });
  });

  it("refuses other shapes", () => {
    for (const name of ["2026-1", "26-3", "26 여름", "26-봄", ""]) {
      expect(parseSeasonName(name)).toBeNull();
    }
  });
});
