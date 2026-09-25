import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";

import { Eyebrow } from "@/components/ui/Eyebrow";

const cardClassName = "grid gap-4 rounded-card border border-line bg-surface p-6";

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
    <article className={cardClassName}>
      <span className="text-[0.82rem] font-[850] text-brand">{label}</span>
      <h3>{title}</h3>
      <p className="text-muted">{children}</p>
    </article>
  );
}

export type Pill = { label: string; href?: string };

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
    <article className={cardClassName}>
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3>{title}</h3>
      </div>
      <ul className="grid grid-cols-2 gap-2 max-sm:grid-cols-1" aria-label={pillsLabel}>
        {pills.map((pill) => (
          <li
            key={pill.label}
            className={clsx(
              "inline-flex min-h-[34px] w-full items-center justify-center rounded-full border border-line bg-surface-soft text-[0.9rem] font-extrabold text-ink",
              pill.href
                ? "transition-[border-color,background-color] focus-within:border-aiku-green focus-within:bg-surface-mint hover:border-aiku-green hover:bg-surface-mint"
                : "px-2.5",
            )}
          >
            {pill.href ? (
              <Link
                href={pill.href}
                className="inline-flex min-h-[34px] w-full items-center justify-center"
              >
                {pill.label}
              </Link>
            ) : (
              pill.label
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
    <article className="grid grid-cols-[190px_minmax(0,1fr)] gap-[18px] rounded-card border border-line bg-surface p-5 max-lg:grid-cols-1">
      <div className="grid content-start gap-2">
        <span className="w-fit rounded-full bg-surface-mint px-2 py-1 text-[0.82rem] font-[850] text-brand-deep">
          {label}
        </span>
        <strong className="leading-[1.35] text-ink">{title}</strong>
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
        "grid content-start gap-2 rounded-card border border-soft-line p-[18px]",
        shared ? "col-span-full bg-surface-mint" : "min-h-[150px] bg-surface-soft",
      )}
    >
      <span className="text-[0.82rem] font-[850] text-brand">{audience}</span>
      <strong className="text-[1.18rem] leading-[1.35] text-ink">
        <Link href={href} className="underline decoration-1 underline-offset-4">
          {activity}
        </Link>
      </strong>
      <p className="text-muted">{children}</p>
    </div>
  );
}
