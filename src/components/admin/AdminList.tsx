"use client";

import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

// Admin list pieces (legacy .admin-item, .drag-handle, .admin-item__actions,
// .admin-list-head, .admin-project-group).

export function ItemButton({
  danger,
  className,
  ...props
}: ComponentProps<"button"> & { danger?: boolean }) {
  return (
    <button
      type="button"
      className={clsx(
        "min-h-9 rounded-control border border-line bg-surface px-3.5 text-small font-semibold transition-[border-color,background-color,color] disabled:cursor-not-allowed disabled:opacity-40",
        danger
          ? "text-danger enabled:hover:border-danger/32 enabled:hover:bg-danger-soft enabled:focus-visible:border-danger/32 enabled:focus-visible:bg-danger-soft"
          : "text-ink enabled:hover:border-green-200 enabled:hover:bg-green-50 enabled:hover:text-green-800",
        className,
      )}
      {...props}
    />
  );
}

type AdminItemProps = {
  /** Drag handle from SortableList. */
  handle: ReactNode;
  label: ReactNode;
  title: ReactNode;
  details?: ReactNode[];
  /** Replaces the default text block (e.g. to add an avatar). */
  body?: ReactNode;
  actions: ReactNode;
  compact?: boolean;
};

export function AdminItem({
  handle,
  label,
  title,
  details = [],
  body,
  actions,
  compact,
}: AdminItemProps) {
  return (
    <article
      className={clsx(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5 border-b border-soft-line max-lg:grid-cols-1 max-lg:gap-3",
        compact ? "py-3.5" : "py-[18px]",
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        {handle}
        {body ?? <ItemText label={label} title={title} details={details} />}
      </div>
      <div className="flex flex-wrap justify-end gap-2 max-lg:justify-start">{actions}</div>
    </article>
  );
}

export function ItemText({
  label,
  title,
  details = [],
}: {
  label: ReactNode;
  title: ReactNode;
  details?: ReactNode[];
}) {
  return (
    <div className="min-w-0">
      <span className="text-label text-green-700 tabular-nums">{label}</span>
      <h3 className="mt-0.5">{title}</h3>
      {details.map((detail, index) => (
        <p key={index} className="mt-1.5 wrap-anywhere text-muted">
          {detail}
        </p>
      ))}
    </div>
  );
}

export function ListHead({
  title,
  description,
  flush,
}: {
  title: string;
  description: string;
  /** Drop the top margin (first element of a subsection). */
  flush?: boolean;
}) {
  return (
    <div className={clsx(!flush && "mt-2.5")}>
      <h3>{title}</h3>
      <p className="mt-1.5 text-small text-muted">{description}</p>
    </div>
  );
}

export function EmptyAdminText({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-muted">{children}</p>;
}

/** Groups items of one season/generation with a heading and a count. */
export function ItemGroupHead({ title, count }: { title: string; count: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-ink">{title}</h3>
      <p className="text-small text-muted">{count}</p>
    </div>
  );
}
