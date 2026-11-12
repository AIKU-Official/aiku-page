// Foreign-key lines on the admin canvas, drawn like a metro map: horizontal
// and vertical runs with rounded corners, and parallel runs always at least
// `PAD` apart, so lines may cross but never lie on top of each other. Pure.
//
//   source ─────────╮                       Lines into the same column of the
//                   │                       same table (one destination)
//   source ──╮      ├──── target.column     join one trunk beside it, like
//            ╰──────╯                       branches of one metro line.
//
// Lines are placed one at a time, shortest first. Each tries to run straight
// across at its own row; when that would come within PAD of a line already
// placed, it steps out to a track beside its table and crosses at the
// nearest free height instead.

import { columnY, NODE_WIDTH, type Point } from "./layout";
import type { SchemaTable } from "./schema-types";

/** Least distance between two parallel lines going to different places. */
export const PAD = 12;
/** Straight run out of and into a table before a line may turn. */
export const STUB = 16;
/** Corner radius, shrunk where a run is shorter. */
export const CORNER = 8;

export type EdgeRoute = { id: string; d: string; points: Point[]; source: string; target: string };

/** A straight run: vertical at x = `at` or horizontal at y = `at`, from `a` to `b`. */
type Run = { vertical: boolean; at: number; a: number; b: number; group: string };

const run = (vertical: boolean, at: number, p: number, q: number, group: string): Run => ({
  vertical,
  at,
  a: Math.min(p, q),
  b: Math.max(p, q),
  group,
});

/** Two runs to different destinations, parallel and closer than PAD. */
const clash = (s: Run, t: Run) =>
  s.vertical === t.vertical &&
  s.group !== t.group &&
  Math.abs(s.at - t.at) < PAD &&
  s.a < t.b + PAD &&
  t.a < s.b + PAD;

type Trunk = { x: number; top: number; bottom: number };

export function routeEdges(tables: SchemaTable[], positions: Record<string, Point>): EdgeRoute[] {
  const byName = new Map(tables.map((table) => [table.name, table]));
  type Wanted = {
    id: string;
    source: string;
    target: string;
    group: string;
    from: Point;
    to: Point;
    /** +1: the line leaves its table to the right. */
    exit: 1 | -1;
    /** +1: the line enters its target from the right. */
    entry: 1 | -1;
  };

  const wanted: Wanted[] = [];
  for (const table of tables) {
    const at = positions[table.name];
    if (!at) continue;
    for (const column of table.columns) {
      const ref = column.references;
      const target = ref && byName.get(ref.table);
      const to = ref && positions[ref.table];
      if (!ref || !target || !to) continue;
      // Leave on the side facing the target; tables in one column loop out on the right.
      const rightward = to.x >= at.x + NODE_WIDTH;
      const leftward = to.x + NODE_WIDTH <= at.x;
      const exit = leftward ? -1 : 1;
      const entry = rightward ? -1 : 1;
      wanted.push({
        id: `${table.name}.${column.name}`,
        source: table.name,
        target: ref.table,
        group: `${ref.table}.${ref.column}`,
        from: { x: exit === 1 ? at.x + NODE_WIDTH : at.x, y: at.y + columnY(table, column.name) },
        to: { x: entry === 1 ? to.x + NODE_WIDTH : to.x, y: to.y + columnY(target, ref.column) },
        exit,
        entry,
      });
    }
  }
  wanted.sort(
    (p, q) =>
      Math.abs(p.to.x - p.from.x) - Math.abs(q.to.x - q.from.x) ||
      Math.abs(p.to.y - p.from.y) - Math.abs(q.to.y - q.from.y),
  );

  const placed: Run[] = [];
  const trunks = new Map<string, Trunk>();
  const free = (runs: Run[]) =>
    runs.every((r) => r.a === r.b || placed.every((other) => !clash(r, other)));

  // Trunks first, longest first: a vertical track beside each target column,
  // shared by every line into it and long enough to meet every one of them at
  // its own row. Placing them whole up front keeps one from growing into another.
  const byTrunk = new Map<string, Wanted[]>();
  for (const edge of wanted) {
    const key = `${edge.group}:${edge.entry}`;
    byTrunk.set(key, [...(byTrunk.get(key) ?? []), edge]);
  }
  const spans = [...byTrunk].map(([key, edges]) => {
    const ys = edges.flatMap((edge) => [edge.from.y, edge.to.y]);
    return {
      key,
      to: edges[0].to,
      entry: edges[0].entry,
      group: edges[0].group,
      top: Math.min(...ys),
      bottom: Math.max(...ys),
    };
  });
  spans.sort((p, q) => q.bottom - q.top - (p.bottom - p.top));
  for (const span of spans) {
    const { to, entry, group, top, bottom } = span;
    let trunk: Trunk | undefined;
    for (let k = 0; k < 40 && !trunk; k++) {
      const x = to.x + entry * (STUB + k * PAD);
      const runs = [run(false, to.y, x, to.x, group), run(true, x, top, bottom, group)];
      if (free(runs)) {
        placed.push(...runs);
        trunk = { x, top, bottom };
      }
    }
    trunks.set(span.key, trunk ?? { x: to.x + entry * STUB, top, bottom });
  }

  const routes: EdgeRoute[] = [];
  for (const edge of wanted) {
    const { from, to, exit, entry, group } = edge;
    const t = trunks.get(`${group}:${entry}`)!;

    // Every way to reach the trunk: straight across at the source row, or out
    // to a track beside the source and across at another height. Nearest first.
    const tries = function* (): Generator<{ y: number; track?: number }> {
      yield { y: from.y };
      const toward = Math.sign(to.y - from.y) || 1;
      for (let k = 1; k <= 30; k++) {
        for (const y of [from.y + toward * k * PAD, from.y - toward * k * PAD]) {
          for (let j = 0; j < 10; j++) {
            const track = from.x + exit * (STUB + j * PAD);
            // The track must sit between the source and the trunk.
            if ((t.x - track) * exit < PAD) break;
            yield { y, track };
          }
        }
      }
    };

    let chosen: { points: Point[]; runs: Run[] } | null = null;
    for (const { y, track } of tries()) {
      const across = track ?? from.x;
      const runs = [
        run(false, y, across, t.x, group),
        run(true, t.x, Math.min(t.top, y), Math.max(t.bottom, y), group),
      ];
      if (track !== undefined) {
        runs.push(run(false, from.y, from.x, track, group), run(true, track, from.y, y, group));
      }
      if (!free(runs)) continue;
      const points =
        track === undefined
          ? [from, { x: t.x, y }, { x: t.x, y: to.y }, to]
          : [
              from,
              { x: track, y: from.y },
              { x: track, y },
              { x: t.x, y },
              { x: t.x, y: to.y },
              to,
            ];
      chosen = { points, runs };
      break;
    }
    // Nowhere free (a very crowded or hand-dragged layout): run straight across anyway.
    chosen ??= {
      points: [from, { x: t.x, y: from.y }, { x: t.x, y: to.y }, to],
      runs: [run(false, from.y, from.x, t.x, group), run(true, t.x, from.y, to.y, group)],
    };

    placed.push(...chosen.runs);
    const ys = chosen.points.slice(-3, -1).map((p) => p.y);
    t.top = Math.min(t.top, ...ys);
    t.bottom = Math.max(t.bottom, ...ys);

    const points = simplify(chosen.points);
    routes.push({
      id: edge.id,
      d: roundedPath(points),
      points,
      source: edge.source,
      target: edge.target,
    });
  }
  return routes;
}

/** Drops repeated points and points in the middle of a straight run. */
export function simplify(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out.at(-1);
    if (last && last.x === p.x && last.y === p.y) continue;
    const before = out.at(-2);
    if (
      before &&
      last &&
      ((before.x === last.x && last.x === p.x) || (before.y === last.y && last.y === p.y))
    ) {
      out[out.length - 1] = p;
      continue;
    }
    out.push(p);
  }
  return out;
}

/** An SVG path through the points, with each corner rounded. */
export function roundedPath(points: Point[], radius = CORNER): string {
  if (points.length < 2) return "";
  const parts = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 1; i < points.length - 1; i++) {
    const [a, v, b] = [points[i - 1], points[i], points[i + 1]];
    const inLength = Math.hypot(v.x - a.x, v.y - a.y);
    const outLength = Math.hypot(b.x - v.x, b.y - v.y);
    if (!inLength || !outLength) continue;
    const r = Math.min(radius, inLength / 2, outLength / 2);
    const p = { x: v.x - ((v.x - a.x) / inLength) * r, y: v.y - ((v.y - a.y) / inLength) * r };
    const q = { x: v.x + ((b.x - v.x) / outLength) * r, y: v.y + ((b.y - v.y) / outLength) * r };
    parts.push(`L ${p.x} ${p.y}`, `Q ${v.x} ${v.y} ${q.x} ${q.y}`);
  }
  const last = points[points.length - 1];
  parts.push(`L ${last.x} ${last.y}`);
  return parts.join(" ");
}
