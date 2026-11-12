import clsx from "clsx";
import type { ReactNode } from "react";

/** The small rounded label used for titles, grades, generations and prizes. */
export const pillClassName =
  "inline-flex h-6 items-center rounded-full px-2.5 text-label whitespace-nowrap";

/** A pill; `tone` gives its colours (background and text classes). */
export function Pill({
  tone = "bg-surface-soft text-body",
  className,
  children,
}: {
  tone?: string;
  className?: string;
  children: ReactNode;
}) {
  return <span className={clsx(pillClassName, tone, className)}>{children}</span>;
}
