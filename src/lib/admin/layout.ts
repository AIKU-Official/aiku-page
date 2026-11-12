// Where each table sits on the admin canvas, before the admin drags anything.
// Pure, safe to import anywhere.
//
// Groups (회원, 프로젝트, AIKUTHON, …) are laid out left to right, wrapping to
// a new band when a band gets wider than `BAND_WIDTH`. Inside a
// group, a table that others point at stands left of the tables pointing at
// it, so foreign keys mostly run right to left, as in a schema diagram.

import type { SchemaTable } from "./schema-types";
import { TABLE_GROUPS, tableGroup } from "./table-policy";

export const NODE_WIDTH = 264;
export const HEADER_HEIGHT = 58;
export const ROW_HEIGHT = 26;
const COLUMN_GAP = 72;
const ROW_GAP = 40;
const GROUP_GAP = 140;
const BAND_WIDTH = 2200;

export type Point = { x: number; y: number };

export const nodeHeight = (table: SchemaTable) => HEADER_HEIGHT + table.columns.length * ROW_HEIGHT + 12;

/** Vertical centre of a column's row inside its node, for drawing edges. */
export const columnY = (table: SchemaTable, column: string) => {
  const index = Math.max(0, table.columns.findIndex((c) => c.name === column));
  return HEADER_HEIGHT + index * ROW_HEIGHT + ROW_HEIGHT / 2;
};

export function initialLayout(tables: SchemaTable[]): Record<string, Point> {
  const byName = new Map(tables.map((table) => [table.name, table]));
  const positions: Record<string, Point> = {};
  let left = 0;
  let bandTop = 0;
  let bandHeight = 0;

  const groups = [...TABLE_GROUPS.map((group) => group.label)];
  for (const label of groups) {
    const members = tables.filter((table) => tableGroup(table.name).label === label);
    if (!members.length) continue;
    const names = new Set(members.map((table) => table.name));

    // Depth: the longest chain of references to tables in the same group.
    const depth = new Map<string, number>();
    const depthOf = (name: string, seen = new Set<string>()): number => {
      if (depth.has(name)) return depth.get(name)!;
      if (seen.has(name)) return 0;
      seen.add(name);
      const targets = (byName.get(name)?.columns ?? [])
        .map((column) => column.references?.table)
        .filter((target): target is string => Boolean(target && target !== name && names.has(target)));
      const value = targets.length ? 1 + Math.max(...targets.map((target) => depthOf(target, seen))) : 0;
      depth.set(name, value);
      return value;
    };
    members.forEach((table) => depthOf(table.name));

    const columns: SchemaTable[][] = [];
    for (const table of members) (columns[depth.get(table.name)!] ??= []).push(table);
    const width = columns.length * (NODE_WIDTH + COLUMN_GAP) - COLUMN_GAP;
    if (left > 0 && left + width > BAND_WIDTH) {
      left = 0;
      bandTop += bandHeight + GROUP_GAP;
      bandHeight = 0;
    }
    columns.forEach((column, index) => {
      let top = 0;
      for (const table of column ?? []) {
        positions[table.name] = { x: left + index * (NODE_WIDTH + COLUMN_GAP), y: bandTop + top };
        top += nodeHeight(table) + ROW_GAP;
      }
      bandHeight = Math.max(bandHeight, top - ROW_GAP);
    });
    left += width + GROUP_GAP;
  }
  return positions;
}

/** The smallest box holding every node, for "fit to screen". */
export function bounds(tables: SchemaTable[], positions: Record<string, Point>) {
  const boxes = tables
    .filter((table) => positions[table.name])
    .map((table) => ({ ...positions[table.name], width: NODE_WIDTH, height: nodeHeight(table) }));
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.width));
  const maxY = Math.max(...boxes.map((b) => b.y + b.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
