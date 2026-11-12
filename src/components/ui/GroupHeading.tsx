import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * The heading over one group of a list (a season's projects, a generation's
 * members, a program's sessions in one season): the name, then how many, in
 * a badge sized to sit beside the heading, over a rule. One look everywhere.
 */
export function GroupHeading({
  id,
  title,
  count,
  marker,
  after,
  className,
}: {
  id?: string;
  title: ReactNode;
  /** "6개 프로젝트", "18명", "13회". */
  count: string;
  /** Something before the name, e.g. a program's colour dot or an arrow. */
  marker?: ReactNode;
  /** Something right after the name, e.g. an arrow. */
  after?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex items-center gap-4 border-b border-line pb-3.5 max-sm:gap-3 max-sm:pb-3",
        className,
      )}
    >
      <span className="flex items-center gap-2.5">
        {marker}
        <h2 id={id} className="text-heading text-ink">
          {title}
        </h2>
        {after}
      </span>
      <span className="inline-flex h-8 items-center rounded-full bg-surface-soft px-3.5 text-[0.9375rem] font-semibold text-body tabular-nums max-sm:h-7 max-sm:px-3 max-sm:text-small">
        {count}
      </span>
    </div>
  );
}
