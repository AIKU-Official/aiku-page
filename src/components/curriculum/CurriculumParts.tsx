import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { ArrowRightIcon } from "@/components/ui/icons";

export function TrackCard({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="reveal card p-7 max-sm:p-5">
      <Eyebrow spacing="tight">{label}</Eyebrow>
      <h3>{title}</h3>
      <p className="mt-3 text-muted max-sm:mt-2">{children}</p>
    </article>
  );
}

export type Pill = { label: string; href?: string };

const pillClassName =
  "inline-flex h-10 w-full items-center justify-center rounded-full border text-small font-semibold max-sm:h-9";

export function CurriculumCard({
  eyebrow,
  title,
  pills,
  pillsLabel,
}: {
  eyebrow: string;
  title: string;
  pills: Pill[];
  pillsLabel: string;
}) {
  return (
    <article className="flex reveal flex-col gap-6 card p-7 max-sm:gap-4 max-sm:p-5">
      <div>
        <Eyebrow spacing="tight">{eyebrow}</Eyebrow>
        <h3>{title}</h3>
      </div>
      <ul className="grid grid-cols-2 gap-2" aria-label={pillsLabel}>
        {pills.map((pill) => (
          <li key={pill.label}>
            {pill.href ? (
              <Link
                href={pill.href}
                className={clsx(
                  pillClassName,
                  "border-line bg-surface text-ink transition-[border-color,background-color,color,scale] hover:border-green-500/60 hover:bg-green-50 hover:text-green-800 active:scale-[0.97]",
                )}
              >
                {pill.label}
              </Link>
            ) : (
              <span className={clsx(pillClassName, "border-dashed border-line-strong text-muted")}>
                {pill.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}

export function CalendarRow({
  label,
  title,
  single,
  children,
}: {
  label: string;
  title: string;
  single?: boolean;
  children: ReactNode;
}) {
  return (
    <article className="grid reveal grid-cols-[200px_minmax(0,1fr)] gap-6 card p-6 max-lg:grid-cols-1 max-lg:gap-4 max-sm:gap-3 max-sm:p-4">
      <div className="flex flex-col items-start gap-3">
        <span className="inline-flex h-8 items-center rounded-full bg-aiku-black px-3 text-label text-white">
          {label}
        </span>
        <strong className="text-subheading text-ink">{title}</strong>
      </div>
      <div
        className={clsx("grid gap-3", single ? "grid-cols-1" : "grid-cols-2 max-lg:grid-cols-1")}
      >
        {children}
      </div>
    </article>
  );
}

export function CalendarLane({
  audience,
  activity,
  href,
  shared,
  children,
}: {
  audience: string;
  activity: string;
  href: string;
  /** Session attended by all members; spans the full row. */
  shared?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-2 rounded-control p-5 max-sm:gap-1.5 max-sm:p-4",
        shared
          ? "col-span-full bg-green-50 ring-1 ring-green-500/20 ring-inset"
          : "bg-surface-soft",
      )}
    >
      <span className="text-eyebrow text-green-700 uppercase">{audience}</span>
      <Link
        href={href}
        className="group inline-flex w-fit items-center gap-1.5 text-subheading text-ink"
      >
        {activity}
        <ArrowRightIcon className="size-4 text-green-700 transition-transform group-hover:translate-x-0.5" />
      </Link>
      <p className="text-muted">{children}</p>
    </div>
  );
}
