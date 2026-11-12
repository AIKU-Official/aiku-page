import { describe, expect, it } from "vitest";

import { metroPoints, roundedPath, STUB } from "./edge-path";

/** Every segment is horizontal, vertical or at 45°. */
function metroAngles(points: { x: number; y: number }[]) {
  return points.slice(1).every((p, i) => {
    const dx = Math.abs(p.x - points[i].x);
    const dy = Math.abs(p.y - points[i].y);
    return dx === 0 || dy === 0 || Math.abs(dx - dy) < 1e-9;
  });
}

describe("metroPoints", () => {
  it("uses a 45° run when there is room ahead", () => {
    const points = metroPoints({ x: 0, y: 0 }, { x: 300, y: 100 }, 1);
    expect(points).toHaveLength(4);
    expect(metroAngles(points)).toBe(true);
    expect(points[1].x).toBeGreaterThanOrEqual(STUB);
  });

  it("goes straight down when the tables are close", () => {
    const points = metroPoints({ x: 0, y: 0 }, { x: 72, y: 400 }, 1);
    expect(points.map((p) => p.x)).toEqual([0, 36, 36, 72]);
    expect(metroAngles(points)).toBe(true);
  });

  it("works leaving to the left", () => {
    const points = metroPoints({ x: 500, y: 300 }, { x: 100, y: 0 }, -1);
    expect(metroAngles(points)).toBe(true);
    expect(points.at(-2)!.y).toBe(0);
  });

  it("loops out to the right for tables in one column", () => {
    const points = metroPoints({ x: 264, y: 50 }, { x: 264, y: 500 }, 0);
    expect(points[1].x).toBeGreaterThan(264);
    expect(metroAngles(points)).toBe(true);
  });

  it("goes around when the target is behind", () => {
    const points = metroPoints({ x: 300, y: 0 }, { x: 250, y: 200 }, 1);
    expect(points).toHaveLength(6);
    expect(metroAngles(points)).toBe(true);
  });

  it("keeps lanes inside the gap", () => {
    const points = metroPoints({ x: 0, y: 0 }, { x: 72, y: 400 }, 1, 100);
    expect(points[1].x).toBe(72 - STUB);
  });
});

describe("roundedPath", () => {
  it("rounds each corner", () => {
    const d = roundedPath([
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
    ]);
    expect(d).toBe("M 0 0 L 38 0 Q 50 0 50 12 L 50 50");
  });
});
