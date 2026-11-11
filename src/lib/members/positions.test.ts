import { describe, expect, it } from "vitest";

import { formatPositions, parsePositions } from "./positions";

describe("parsePositions", () => {
  it("reads a generation and a title", () => {
    expect(parsePositions("8기 회장")).toEqual([{ generation: "8기", title: "회장" }]);
    expect(parsePositions("  10기   부회장 ")).toEqual([{ generation: "10기", title: "부회장" }]);
    expect(parsePositions("8기회장")).toEqual([{ generation: "8기", title: "회장" }]);
  });

  it("reads several separated by commas, once each", () => {
    expect(parsePositions("7기 부회장, 8기 회장, 7기 부회장,")).toEqual([
      { generation: "7기", title: "부회장" },
      { generation: "8기", title: "회장" },
    ]);
  });

  it("returns no positions for empty input", () => {
    expect(parsePositions("")).toEqual([]);
    expect(parsePositions("  ,  ")).toEqual([]);
  });

  it("rejects anything else", () => {
    expect(parsePositions("회장")).toBeNull();
    expect(parsePositions("8기 총무")).toBeNull();
    expect(parsePositions("8 회장")).toBeNull();
    expect(parsePositions("8기 회장 7기 부회장")).toBeNull();
    expect(parsePositions("8기 회장, 운영진")).toBeNull();
  });
});

describe("formatPositions", () => {
  const row = (generation: string, title: string) => ({ title, generations: { name: generation } });

  it("joins the generation and the title", () => {
    expect(formatPositions([row("8기", "회장")])).toBe("8기 회장");
  });

  it("orders by generation number, then president first", () => {
    expect(formatPositions([row("10기", "회장"), row("8기", "부회장"), row("8기", "회장")])).toBe(
      "8기 회장, 8기 부회장, 10기 회장",
    );
  });

  it("is empty without titles", () => {
    expect(formatPositions([])).toBe("");
    expect(formatPositions(null)).toBe("");
    expect(formatPositions(undefined)).toBe("");
  });

  it("round-trips through the admin input", () => {
    const text = "7기 부회장, 8기 회장";
    const rows = parsePositions(text)!.map((p) => row(p.generation, p.title));
    expect(formatPositions(rows)).toBe(text);
  });
});
