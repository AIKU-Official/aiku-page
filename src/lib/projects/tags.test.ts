import { describe, expect, it } from "vitest";

import { formatTags, parseTags } from "./tags";

describe("parseTags", () => {
  it("splits hash tags", () => {
    expect(parseTags("#Unlearning #Multilingual #LLM")).toEqual([
      "Unlearning",
      "Multilingual",
      "LLM",
    ]);
  });

  it("keeps spaces inside a tag", () => {
    expect(parseTags("#Quantum Machine Learning")).toEqual(["Quantum Machine Learning"]);
    expect(parseTags("  #NLP  #Speech Recognition ")).toEqual(["NLP", "Speech Recognition"]);
  });

  it("splits a comma-separated list", () => {
    expect(parseTags("NLP, LLM,Speech Recognition")).toEqual(["NLP", "LLM", "Speech Recognition"]);
    expect(parseTags("#NLP, #LLM")).toEqual(["NLP", "LLM"]);
  });

  it("keeps a hash inside a tag", () => {
    expect(parseTags("#C# #NLP")).toEqual(["C#", "NLP"]);
    expect(parseTags("C#, NLP")).toEqual(["C#", "NLP"]);
  });

  it("drops empty and repeated tags", () => {
    expect(parseTags("#NLP #LLM #NLP")).toEqual(["NLP", "LLM"]);
    expect(parseTags("NLP,, ,LLM,")).toEqual(["NLP", "LLM"]);
  });

  it("returns no tags for empty input", () => {
    expect(parseTags("")).toEqual([]);
    expect(parseTags("   ")).toEqual([]);
    expect(parseTags("#")).toEqual([]);
  });

  it("treats text without separators as one tag", () => {
    expect(parseTags("멀티모달 학습")).toEqual(["멀티모달 학습"]);
  });
});

describe("formatTags", () => {
  it("writes tags the way the admin types them", () => {
    expect(formatTags(["NLP", "Speech Recognition"])).toBe("#NLP #Speech Recognition");
    expect(formatTags([])).toBe("");
  });

  it("round-trips through parseTags", () => {
    const tags = ["NLP", "Speech Recognition", "LLM"];
    expect(parseTags(formatTags(tags))).toEqual(tags);
  });
});
