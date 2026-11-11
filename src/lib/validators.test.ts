import { describe, expect, it } from "vitest";

import { POSITION_FORMAT_MESSAGE } from "@/lib/members/positions";

import { memberSchema, newsSchema, projectSchema, seasonNameSchema } from "./validators";

const firstMessage = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

describe("seasonNameSchema", () => {
  it("uses the legacy messages", () => {
    expect(seasonNameSchema.parse("  26-summer ")).toBe("26-summer");
    expect(firstMessage(seasonNameSchema.safeParse(" "))).toBe("시즌 이름을 입력하세요.");
    expect(firstMessage(seasonNameSchema.safeParse("a".repeat(41)))).toBe(
      "시즌 이름은 40자 이하로 입력하세요.",
    );
    expect(firstMessage(seasonNameSchema.safeParse("26/1"))).toBe(
      "시즌 이름에는 /, \\, <, > 문자를 사용할 수 없습니다.",
    );
  });
});

describe("newsSchema", () => {
  const base = { date: "", title: "소식", summary: "", linkUrl: "", linkLabel: "" };

  it("fills defaults and nulls empty optional fields", () => {
    expect(newsSchema.parse(base)).toEqual({
      date: null,
      title: "소식",
      summary: "",
      linkUrl: null,
      linkLabel: "보기",
    });
  });

  it("accepts site-relative and absolute links only", () => {
    expect(newsSchema.parse({ ...base, linkUrl: "/projects" }).linkUrl).toBe("/projects");
    expect(newsSchema.safeParse({ ...base, linkUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(firstMessage(newsSchema.safeParse({ ...base, title: "" }))).toBe(
      "소식 제목을 입력하세요.",
    );
  });
});

describe("projectSchema", () => {
  const base = {
    id: "8d5f5842-c0ab-4c63-b31a-361b043bc39a",
    isNew: true,
    seasonId: "6e7700a5-5006-4a9c-8206-c91051af0010",
    title: "RICE",
    tags: "#LLM",
    oneLine: "",
    awardRank: "",
    githubUrl: "",
    markdown: "",
    presentation: null,
    removePresentation: false,
    addImages: [],
    removeImages: [],
  };

  it("requires a season and a title", () => {
    expect(firstMessage(projectSchema.safeParse({ ...base, seasonId: "" }))).toBe(
      "시즌을 먼저 추가하고 선택하세요.",
    );
    expect(firstMessage(projectSchema.safeParse({ ...base, title: " " }))).toBe(
      "프로젝트명을 입력하세요.",
    );
  });

  it("turns the tag input into a list", () => {
    expect(projectSchema.parse({ ...base, tags: "#NLP #Speech Recognition" }).tags).toEqual([
      "NLP",
      "Speech Recognition",
    ]);
    expect(projectSchema.parse({ ...base, tags: "NLP, LLM" }).tags).toEqual(["NLP", "LLM"]);
    expect(projectSchema.parse({ ...base, tags: "" }).tags).toEqual([]);
  });

  it("reads the award rank", () => {
    expect(projectSchema.parse(base).awardRank).toBeNull();
    expect(projectSchema.parse({ ...base, awardRank: "2" }).awardRank).toBe(2);
    expect(projectSchema.safeParse({ ...base, awardRank: "4" }).success).toBe(false);
  });

  it("rejects non-http GitHub links", () => {
    expect(projectSchema.parse(base).githubUrl).toBeNull();
    expect(projectSchema.safeParse({ ...base, githubUrl: "github.com/x" }).success).toBe(false);
  });
});

describe("memberSchema", () => {
  const base = {
    id: "8d5f5842-c0ab-4c63-b31a-361b043bc39a",
    isNew: true,
    generationId: "6e7700a5-5006-4a9c-8206-c91051af0010",
    name: "홍길동",
    department: " 컴퓨터학과 ",
    grade: "junior",
    gradePinned: false,
    position: "",
  };

  it("parses the officer titles", () => {
    expect(memberSchema.parse(base).position).toEqual([]);
    expect(memberSchema.parse({ ...base, position: "7기 부회장, 8기 회장" }).position).toEqual([
      { generation: "7기", title: "부회장" },
      { generation: "8기", title: "회장" },
    ]);
    expect(firstMessage(memberSchema.safeParse({ ...base, position: "8기 총무" }))).toBe(
      POSITION_FORMAT_MESSAGE,
    );
  });

  it("accepts only known grades", () => {
    const result = memberSchema.safeParse({ ...base, grade: "honorary" });
    expect(firstMessage(result)).toBe("등급을 선택하세요.");
  });
});
