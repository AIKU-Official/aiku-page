"use client";

import clsx from "clsx";
import type { PointerEvent as ReactPointerEvent } from "react";

import { KeyIcon, LinkIcon } from "@/components/ui/icons";
import { HEADER_HEIGHT, NODE_WIDTH, ROW_HEIGHT, type Point } from "@/lib/admin/layout";
import type { SchemaTable } from "@/lib/admin/schema-types";
import { tableCaption, tableGroup } from "@/lib/admin/table-policy";

/**
 * One table on the canvas: its name, group and row count, then its columns
 * with their types, primary keys and foreign keys. Dragging the header moves
 * it; a click (without moving) opens the table.
 */
export function TableNode({
  table,
  position,
  pending,
  highlighted,
  onHover,
  onPointerDown,
}: {
  table: SchemaTable;
  position: Point;
  /** Pending changes on this table, shown as a badge. */
  pending: number;
  highlighted: boolean;
  onHover: (name: string | null) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>, name: string) => void;
}) {
  const group = tableGroup(table.name);
  return (
    <article
      data-node={table.name}
      onPointerDown={(event) => onPointerDown(event, table.name)}
      onPointerEnter={() => onHover(table.name)}
      onPointerLeave={() => onHover(null)}
      style={{ left: position.x, top: position.y, width: NODE_WIDTH }}
      className={clsx(
        "absolute cursor-pointer touch-none overflow-hidden rounded-[12px] border bg-surface shadow-[0_6px_18px_rgb(29_29_29/0.07)] transition-[border-color,box-shadow] select-none",
        highlighted ? "border-green-400 shadow-[0_8px_26px_rgb(31_157_99/0.18)]" : "border-line hover:border-line-strong",
      )}
    >
      <header
        style={{ height: HEADER_HEIGHT }}
        className="flex items-center justify-between gap-2 border-b border-soft-line bg-surface-soft/70 px-3"
      >
        <div className="min-w-0">
          <p className="truncate font-mono text-[0.8125rem] font-semibold text-ink">{table.name}</p>
          <p className="truncate text-label text-muted">
            <span className={clsx("mr-1.5 rounded-full px-1.5 py-px", group.tone)}>{group.label}</span>
            {tableCaption(table.name)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {pending ? (
            <span className="rounded-full bg-amber-100 px-1.5 text-label font-semibold text-amber-800 tabular-nums">
              변경 {pending}
            </span>
          ) : null}
          <span className="text-label text-muted tabular-nums">
            {table.rowsHidden ? "비공개" : table.readOnly ? "계산" : `${table.rowCount ?? "?"}행`}
          </span>
        </div>
      </header>
      <ul className="py-1.5">
        {table.columns.map((column) => (
          <li
            key={column.name}
            style={{ height: ROW_HEIGHT }}
            className="flex items-center gap-1.5 px-3 font-mono text-[0.75rem]"
          >
            <span className="flex w-3.5 shrink-0 justify-center text-muted">
              {column.primaryKey ? (
                <KeyIcon className="size-3.5 text-amber-800" />
              ) : column.references ? (
                <LinkIcon className="size-3.5 text-green-700" />
              ) : null}
            </span>
            <span className={clsx("min-w-0 flex-1 truncate", column.required ? "text-ink" : "text-body")}>
              {column.name}
            </span>
            <span className="max-w-24 shrink-0 truncate text-muted">{column.format}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
