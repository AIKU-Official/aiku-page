import { describe, expect, it } from "vitest";

import {
  ALL,
  directoryStatusText,
  generationFromHash,
  hashForGeneration,
  matchesFilter,
  matchesQuery,
  toChoseong,
  type DirectoryFilter,
} from "./directory";

const member = {
  name: "홍길동",
  department: "컴퓨터학과",
  position: "8기 회장",
  grade: "senior",
} as const;

const filter = (patch: Partial<DirectoryFilter> = {}): DirectoryFilter => ({
  generation: ALL,
  grade: ALL,
  query: "",
  ...patch,
});

describe("matchesQuery", () => {
  it("matches name, department and position, ignoring spaces and case", () => {
    expect(matchesQuery(member, "")).toBe(true);
    expect(matchesQuery(member, " 길동 ")).toBe(true);
    expect(matchesQuery(member, "컴퓨터")).toBe(true);
    expect(matchesQuery(member, "8기회장")).toBe(true);
    expect(matchesQuery(member, "김")).toBe(false);
    expect(matchesQuery({ ...member, name: "Alex Kim" }, "alexk")).toBe(true);
  });

  it("matches names by initial consonants", () => {
    expect(toChoseong("홍길동")).toBe("ㅎㄱㄷ");
    expect(matchesQuery(member, "ㅎㄱ")).toBe(true);
    expect(matchesQuery(member, "ㄱㄷ")).toBe(true);
    expect(matchesQuery(member, "ㅎㄷ")).toBe(false);
    // Initial consonants search names only, not departments.
    expect(matchesQuery(member, "ㅋㅍㅌ")).toBe(false);
  });
});

describe("matchesFilter", () => {
  it("combines generation, grade and query", () => {
    expect(matchesFilter(member, "7기", filter())).toBe(true);
    expect(matchesFilter(member, "7기", filter({ generation: "7기", grade: "senior" }))).toBe(true);
    expect(matchesFilter(member, "7기", filter({ generation: "8기" }))).toBe(false);
    expect(matchesFilter(member, "7기", filter({ grade: "ob" }))).toBe(false);
    expect(matchesFilter(member, "7기", filter({ generation: "7기", query: "김" }))).toBe(false);
  });
});

describe("directoryStatusText", () => {
  it("describes the current view", () => {
    expect(directoryStatusText(filter(), 0, 0)).toBe("아직 공개된 멤버가 없습니다.");
    expect(directoryStatusText(filter(), 158, 158)).toBe("전체 멤버 158명을 보고 있습니다.");
    expect(directoryStatusText(filter({ generation: "8기", grade: "junior" }), 18, 158)).toBe(
      "8기 주니어 멤버 18명을 보고 있습니다.",
    );
    expect(directoryStatusText(filter({ query: " 회장 " }), 8, 158)).toBe(
      '전체 멤버 중 "회장" 검색 결과 8명을 보고 있습니다.',
    );
    expect(directoryStatusText(filter({ grade: "ob", query: "zz" }), 0, 158)).toBe(
      'OB 멤버 중 "zz"에 해당하는 멤버가 없습니다.',
    );
    expect(directoryStatusText(filter({ generation: "0기", grade: "junior" }), 0, 158)).toBe(
      "0기 주니어 조건에 해당하는 멤버가 없습니다.",
    );
  });
});

describe("generation hash", () => {
  it("round-trips a generation and falls back to all", () => {
    const generations = ["8기", "7기"];
    expect(generationFromHash(hashForGeneration("8기"), generations)).toBe("8기");
    expect(generationFromHash("#generation-9기", generations)).toBe(ALL);
    expect(generationFromHash("#generation-%E0%A4%A", generations)).toBe(ALL);
    expect(generationFromHash("", generations)).toBe(ALL);
    expect(hashForGeneration(ALL)).toBe("#members");
  });
});
