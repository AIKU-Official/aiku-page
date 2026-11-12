import clsx from "clsx";
import { Fragment } from "react";

import { PersonName } from "@/components/projects/PersonName";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ArrowUpRightIcon } from "@/components/ui/icons";
import type { Aikuthon } from "@/lib/types";

const pill = "inline-flex h-6 items-center rounded-full px-2.5 text-label whitespace-nowrap";

// Medal colours, as on prize-winning projects.
const RANK_TONES = {
  1: "bg-amber-100 text-amber-800",
  2: "bg-silver-100 text-silver-800",
  3: "bg-bronze-100 text-bronze-800",
} as const;

/** "2026.08.28 – 08.29", or one date when the event fits in a day. */
export function formatDates(startsOn: string, endsOn: string | null): string {
  const [y, m, d] = startsOn.split("-");
  const start = `${y}.${m}.${d}`;
  if (!endsOn || endsOn === startsOn) return start;
  const [y2, m2, d2] = endsOn.split("-");
  return y2 === y ? `${start} – ${m2}.${d2}` : `${start} – ${y2}.${m2}.${d2}`;
}

/** One AIKUTHON: when and where, the task, and who won. */
export function AikuthonCard({ event }: { event: Aikuthon }) {
  const facts = [
    event.venue && { label: "장소", value: event.venue },
    event.participants && { label: "참가", value: event.participants },
    event.metric && { label: "평가", value: event.metric },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact));

  return (
    <article id={`aikuthon-${event.edition ?? event.id}`} className="card p-8 max-sm:p-5">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <Eyebrow spacing="none">{formatDates(event.startsOn, event.endsOn)}</Eyebrow>
            {event.kind === "joint" ? (
              <span className={clsx(pill, "bg-surface-soft text-body")}>연합 데이터톤</span>
            ) : null}
          </div>
          <h3 className="mt-2 text-[1.5rem] leading-[1.3] font-extrabold tracking-[-0.025em] max-sm:text-[1.1875rem]">
            {event.name}
          </h3>
        </div>
        {event.competitionUrl ? (
          <a
            href={event.competitionUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`${event.name} 대회 페이지`}
            title="대회 페이지"
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-control border border-line bg-surface px-4 text-small font-semibold whitespace-nowrap text-ink transition-colors hover:border-line-strong hover:bg-surface-soft max-sm:size-9 max-sm:min-h-0 max-sm:justify-center max-sm:rounded-full max-sm:px-0"
          >
            <span className="max-sm:hidden">대회 페이지</span>
            <ArrowUpRightIcon className="size-4" />
          </a>
        ) : null}
      </div>

      {event.taskTitle ? (
        <div className="mt-4 max-sm:mt-3">
          <p className="text-subheading">{event.taskTitle}</p>
          {event.taskDescription ? (
            <p className="mt-1.5 text-body">{event.taskDescription}</p>
          ) : null}
        </div>
      ) : null}

      {event.format.length || event.partners.length ? (
        <ul className="mt-4 flex flex-wrap gap-1.5 max-sm:mt-3" aria-label="대회 정보">
          {event.partners.map((partner) => (
            <li
              key={partner}
              className="inline-flex h-7 items-center rounded-full bg-green-50 px-3 text-label text-green-800 ring-1 ring-green-200 ring-inset"
            >
              with {partner}
            </li>
          ))}
          {event.format.map((item) => (
            <li
              key={item}
              className="inline-flex h-7 items-center rounded-full bg-surface-soft px-3 text-label text-body"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : null}

      {facts.length ? (
        <dl className="mt-4 grid gap-1 text-small max-sm:mt-3">
          {facts.map((fact) => (
            <div key={fact.label} className="flex gap-3">
              <dt className="w-9 shrink-0 text-muted">{fact.label}</dt>
              <dd className="min-w-0 text-body">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-6 border-t border-soft-line pt-5 max-sm:mt-4 max-sm:pt-4">
        {event.awards.length ? (
          <ul className="grid gap-2.5" aria-label="수상">
            {event.awards.map((award, index) => (
              <li key={index} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span
                  className={clsx(
                    pill,
                    "self-center",
                    award.rank ? RANK_TONES[award.rank] : "bg-surface-soft text-body",
                  )}
                >
                  {award.label}
                </span>
                {award.teamName ? (
                  <span className="font-semibold text-ink">{award.teamName}</span>
                ) : null}
                <span className="text-small text-body">
                  {award.people.map((person, i) => (
                    <Fragment key={person.name}>
                      {i ? ", " : null}
                      <PersonName person={person} />
                    </Fragment>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-small text-muted">수상 기록을 정리하고 있습니다.</p>
        )}
      </div>
    </article>
  );
}
