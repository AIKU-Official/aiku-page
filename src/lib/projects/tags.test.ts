import { describe, expect, it } from "vitest";

import { parseTags } from "./tags";

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

  it("returns null for plain text or empty input", () => {
    expect(parseTags("멀티모달 학습 프로젝트")).toBeNull();
    expect(parseTags("")).toBeNull();
    expect(parseTags("#")).toBeNull();
  });
});
