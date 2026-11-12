import { describe, expect, it } from "vitest";

import { canUseStudio, isOb } from "./studio";

describe("canUseStudio", () => {
  it("lets in 주니어, 시니어 and 활동 OB only", () => {
    expect(["junior", "senior", "active_ob"].map(canUseStudio)).toEqual([true, true, true]);
    expect(["ob", "", null, undefined, "admin"].map(canUseStudio)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });
});

describe("isOb", () => {
  it("covers both kinds of OB", () => {
    expect(["ob", "active_ob", "junior"].map(isOb)).toEqual([true, true, false]);
  });
});
