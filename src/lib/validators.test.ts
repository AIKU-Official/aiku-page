import { describe, expect, it } from "vitest";

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
    summary: "#LLM",
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

  it("rejects non-http GitHub links", () => {
    expect(projectSchema.parse(base).githubUrl).toBeNull();
    expect(projectSchema.safeParse({ ...base, githubUrl: "github.com/x" }).success).toBe(false);
  });
});

describe("memberSchema", () => {
  it("validates the e-mail address", () => {
    const base = {
      id: "8d5f5842-c0ab-4c63-b31a-361b043bc39a",
      isNew: true,
      generationId: "6e7700a5-5006-4a9c-8206-c91051af0010",
      name: "홍길동",
      summary: "",
      email: "not-an-email",
      githubUrl: "",
      linkedinUrl: "",
      websiteUrl: "",
      photo: null,
      removePhoto: false,
    };
    expect(firstMessage(memberSchema.safeParse(base))).toBe("메일주소 형식이 올바르지 않습니다.");
    expect(memberSchema.parse({ ...base, email: "a@b.co" }).email).toBe("a@b.co");
  });
});
