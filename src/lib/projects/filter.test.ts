import { describe, expect, it } from "vitest";

import {
  ALL_PROJECTS,
  emptyFilterText,
  filterFromHash,
  filterStatusText,
  getProjectSeasonList,
  hashForFilter,
} from "./filter";

const seasons = [
  { id: "s1", name: "26-summer" },
  { id: "s2", name: "26-1" },
  { id: "s3", name: "25-2" },
];

describe("getProjectSeasonList", () => {
  it("keeps admin order and drops seasons without projects", () => {
    expect(
      getProjectSeasonList(seasons, [{ seasonId: "s3" }, { seasonId: "s1" }, { seasonId: "s3" }]),
    ).toEqual(["26-summer", "25-2"]);
  });
});

describe("filter hash", () => {
  const names = ["26-1", "26-여름"];

  it("round-trips a season", () => {
    expect(filterFromHash(hashForFilter("26-여름"), names)).toBe("26-여름");
    expect(filterFromHash("#period-26-1", names)).toBe("26-1");
  });

  it("falls back to all for unknown or malformed hashes", () => {
    expect(filterFromHash("", names)).toBe(ALL_PROJECTS);
    expect(filterFromHash("#projects", names)).toBe(ALL_PROJECTS);
    expect(filterFromHash("#period-99-9", names)).toBe(ALL_PROJECTS);
    expect(filterFromHash("#period-%E0%A4%A", names)).toBe(ALL_PROJECTS);
  });

  it("uses #projects for the all filter", () => {
    expect(hashForFilter(ALL_PROJECTS)).toBe("#projects");
  });
});

describe("filter copy", () => {
  it("matches the legacy status text", () => {
    expect(filterStatusText(ALL_PROJECTS, 2, 2)).toBe("전체 프로젝트 2개를 보고 있습니다.");
    expect(filterStatusText("26-1", 1, 2)).toBe("26-1 프로젝트 1개를 보고 있습니다.");
    expect(filterStatusText(ALL_PROJECTS, 0, 0)).toBe("아직 공개된 프로젝트가 없습니다.");
    expect(emptyFilterText("26-1")).toBe("26-1 분기에 공개된 프로젝트가 아직 없습니다.");
  });
});
