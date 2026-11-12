import { describe, expect, it } from "vitest";

import { PAD, roundedPath, routeEdges, simplify } from "./edge-path";
import { initialLayout, NODE_WIDTH, type Point } from "./layout";
import type { SchemaColumn, SchemaTable } from "./schema-types";

const col = (name: string, references?: string): SchemaColumn => ({
  name,
  kind: "uuid",
  format: "uuid",
  required: false,
  hasDefault: false,
  primaryKey: name === "id",
  references: references
    ? { table: references.split(".")[0], column: references.split(".")[1] }
    : null,
});

const table = (name: string, ...columns: SchemaColumn[]): SchemaTable => ({
  name,
  readOnly: false,
  rowsHidden: false,
  columns,
  primaryKey: ["id"],
  rowCount: 0,
});

// A crowded corner of the real schema: many tables pointing at members.id.
const schema: SchemaTable[] = [
  table("generations", col("id"), col("name")),
  table("members", col("id"), col("generation_id", "generations.id"), col("name")),
  table("member_accounts", col("user_id"), col("member_id", "members.id")),
  table(
    "member_positions",
    col("id"),
    col("member_id", "members.id"),
    col("generation_id", "generations.id"),
  ),
  table("member_profiles", col("member_id", "members.id"), col("bio")),
  table("member_student_ids", col("member_id", "members.id"), col("digest")),
  table("member_signup_requests", col("user_id"), col("email")),
  table("seasons", col("id"), col("name")),
  table("tags", col("id"), col("name")),
  table("projects", col("id"), col("season_id", "seasons.id"), col("title")),
  table(
    "project_members",
    col("id"),
    col("project_id", "projects.id"),
    col("member_id", "members.id"),
  ),
  table("project_tags", col("project_id", "projects.id"), col("tag_id", "tags.id")),
];

type Segment = { vertical: boolean; at: number; a: number; b: number; group: string };

function segments(points: Point[], group: string): Segment[] {
  return points.slice(1).map((p, i) => {
    const q = points[i];
    const vertical = p.x === q.x;
    return {
      vertical,
      at: vertical ? p.x : p.y,
      a: Math.min(vertical ? p.y : p.x, vertical ? q.y : q.x),
      b: Math.max(vertical ? p.y : p.x, vertical ? q.y : q.x),
      group,
    };
  });
}

function check(positions: Record<string, Point>) {
  const routes = routeEdges(schema, positions);
  const groupOf = (id: string) => {
    const [name, column] = id.split(".");
    const ref = schema
      .find((t) => t.name === name)!
      .columns.find((c) => c.name === column)!.references!;
    return `${ref.table}.${ref.column}`;
  };
  const all = routes.flatMap((route) => segments(route.points, groupOf(route.id)));
  const clashes = all.flatMap((s, i) =>
    all
      .slice(i + 1)
      .filter(
        (t) =>
          s.vertical === t.vertical &&
          s.group !== t.group &&
          Math.abs(s.at - t.at) < PAD &&
          s.a < t.b &&
          t.a < s.b,
      )
      .map((t) => [s, t]),
  );
  return { routes, all, clashes };
}

describe("routeEdges", () => {
  it("draws every key, only horizontal and vertical runs", () => {
    const { routes, all } = check(initialLayout(schema));
    expect(routes).toHaveLength(11);
    // Every run is horizontal or vertical: a run's ends share x or y.
    for (const route of routes) {
      route.points.slice(1).forEach((p, i) => {
        const q = route.points[i];
        expect(p.x === q.x || p.y === q.y).toBe(true);
      });
    }
    expect(all.length).toBeGreaterThan(0);
  });

  it("keeps lines to different places at least PAD apart", () => {
    expect(check(initialLayout(schema)).clashes).toEqual([]);
  });

  it("still keeps them apart when tables are dragged into one row", () => {
    const positions: Record<string, Point> = {};
    schema.forEach((t, i) => (positions[t.name] = { x: i * (NODE_WIDTH + 128), y: 0 }));
    expect(check(positions).clashes).toEqual([]);
  });

  it("starts and ends each line at its table's edge", () => {
    const positions = initialLayout(schema);
    const route = routeEdges(schema, positions).find((r) => r.id === "members.generation_id")!;
    expect(route.points[0].x).toBe(positions.members.x);
    expect(route.points.at(-1)!.x).toBe(positions.generations.x + NODE_WIDTH);
  });
});

describe("simplify", () => {
  it("drops repeats and points along a straight run", () => {
    expect(
      simplify([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 5 },
      ]),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 5 },
    ]);
  });
});

describe("roundedPath", () => {
  it("rounds each corner", () => {
    const d = roundedPath([
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
    ]);
    expect(d).toBe("M 0 0 L 42 0 Q 50 0 50 8 L 50 50");
  });
});
