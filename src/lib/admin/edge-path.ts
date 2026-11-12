// Foreign-key lines on the admin canvas, drawn like a metro map: only
// horizontal, vertical and 45° segments, with rounded corners. Pure.
//
//   source ──────╮                      source ──╮
//                 ╲                              │
//                  ╲────── target                ╰── target
//   (room for a 45° run)                (too close: straight down instead)

import type { Point } from "./layout";

/** Straight run out of and into a node before the line may turn. */
export const STUB = 20;
/** Corner radius, shrunk where segments are shorter. */
export const CORNER = 12;

/**
 * Corner points of a line from `from` to `to`, leaving and arriving
 * horizontally. `direction` is +1 when the line leaves to the right and
 * enters the target from its left, -1 the other way round, and 0 when both
 * ends sit on the right edge of tables in the same column (it loops out and
 * back). `lane` shifts the vertical run so lines from one table do not lie on
 * top of each other.
 */
export function metroPoints(from: Point, to: Point, direction: 1 | -1 | 0, lane = 0): Point[] {
  const dy = to.y - from.y;
  if (from.y === to.y && direction !== 0) return [from, to];

  if (direction === 0) {
    const x = Math.max(from.x, to.x) + STUB * 2 + lane;
    return [from, { x, y: from.y }, { x, y: to.y }, to];
  }

  const ahead = (to.x - from.x) * direction;
  const rise = Math.abs(dy);

  // Enough room ahead for a 45° run: straight, diagonal, straight.
  if (ahead >= rise + STUB * 2) {
    const straight = (ahead - rise) / 2 + lane * direction;
    const start = Math.min(Math.max(straight, STUB), ahead - rise - STUB);
    const bendX = from.x + start * direction;
    return [from, { x: bendX, y: from.y }, { x: bendX + rise * direction, y: to.y }, to];
  }

  // Some room ahead: straight, vertical, straight.
  if (ahead >= STUB * 2) {
    const first = from.x + STUB * direction;
    const last = to.x - STUB * direction;
    const middle = from.x + (ahead / 2) * direction + lane;
    const x = Math.min(Math.max(middle, Math.min(first, last)), Math.max(first, last));
    return [from, { x, y: from.y }, { x, y: to.y }, to];
  }

  // The target is behind: out, across between the two rows, and back in.
  const outX = from.x + STUB * direction;
  const inX = to.x - STUB * direction;
  const midY = from.y + dy / 2 + lane;
  return [
    from,
    { x: outX, y: from.y },
    { x: outX, y: midY },
    { x: inX, y: midY },
    { x: inX, y: to.y },
    to,
  ];
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
