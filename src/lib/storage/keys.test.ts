import { describe, expect, it } from "vitest";

import { asciiBaseName, createObjectKey, fileExtension, isObjectKeyOf } from "./keys";

describe("fileExtension", () => {
  it("returns the lower-cased extension", () => {
    expect(fileExtension("Deck.PPTX")).toBe(".pptx");
    expect(fileExtension("dir/a.b.png")).toBe(".png");
    expect(fileExtension("README")).toBe("");
    expect(fileExtension(".env")).toBe("");
  });
});

describe("asciiBaseName", () => {
  it("replaces non-ASCII runs like the legacy server", () => {
    expect(asciiBaseName("양자양자_Project_Conference_26_1.pptx")).toBe("_Project_Conference_26_1");
    expect(asciiBaseName("발표 자료 (최종).pdf")).toBe("file");
    expect(asciiBaseName("pareto retain.png")).toBe("pareto-retain");
  });
});

describe("createObjectKey", () => {
  it("builds a unique ASCII key inside the entity folder", () => {
    expect(createObjectKey("projects", "abc", "발표.PPTX", "a1b2c3", 1700000000000)).toBe(
      "projects/abc/1700000000000-a1b2c3-file.pptx",
    );
  });
});

describe("isObjectKeyOf", () => {
  it("accepts only direct children of the entity folder", () => {
    expect(isObjectKeyOf("projects/abc/1-x-deck.pptx", "projects", "abc")).toBe(true);
    expect(isObjectKeyOf("projects/other/1-x-deck.pptx", "projects", "abc")).toBe(false);
    expect(isObjectKeyOf("projects/abc/../other/x.png", "projects", "abc")).toBe(false);
    expect(isObjectKeyOf("members/abc/x.png", "projects", "abc")).toBe(false);
  });
});
