import clsx from "clsx";
import { Fragment } from "react";

import { PersonName } from "@/components/projects/PersonName";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { FieldTags } from "@/components/ui/FieldTags";
import { ArrowUpRightIcon } from "@/components/ui/icons";
import type { Aikuthon } from "@/lib/types";

const pill = "inline-flex h-6 items-center rounded-full px-2.5 text-label whitespace-nowrap";

// Medal colours and labels, as on prize-winning projects.
const RANKS = {
  1: { label: "1등", tone: "bg-amber-100 text-amber-800" },
  2: { label: "2등", tone: "bg-silver-100 text-silver-800" },
  3: { label: "3등", tone: "bg-bronze-100 text-bronze-800" },
} as const;

/** "데이터톤 · 무박 2일 · Kaggle". */
function formatRun(event: Aikuthon): string {
  return [
    event.format === "hackathon" ? "해커톤" : "데이터톤",
    event.mode === "online" ? "온라인" : null,
    event.overnight ? "무박 2일" : null,
    event.platform || null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** "2026.08.28 – 08.29", or one date when the event fits in a day. */
export function formatDates(
  startsOn: string,
  endsOn: string | null,
  precision: "day" | "month" = "day",
): string {
  const [y, m, d] = startsOn.split("-");
  if (precision === "month") return `${y}.${m}`;
  const start = `${y}.${m}.${d}`;
  if (!endsOn || endsOn === startsOn) return start;
  const [y2, m2, d2] = endsOn.split("-");
  return y2 === y ? `${start} – ${m2}.${d2}` : `${start} – ${y2}.${m2}.${d2}`;
}

/**
 * One AIKUTHON. Every card has the same parts in the same order: date (and,
 * for a joint event held in an edition's place, which edition it replaced),
 * name, task and its field tags, the same two facts (진행, 평가) plus 주관
 * and 후원 when the event had them, then the 1st to 3rd places. A fact that
 * was not recorded shows a dash rather than disappearing.
 */
export function AikuthonCard({ event }: { event: Aikuthon }) {
  const partners = (role: "co_host" | "sponsor") =>
    event.partners.filter((partner) => partner.role === role).map((partner) => partner.name).join(", ");
  const facts = [
    { label: "진행", value: formatRun(event) },
    { label: "평가", value: event.metric },
    // Only on events run with other societies or companies.
    // AIKU is named first so a joint event does not read as the partner's alone.
    ...(partners("co_host") ? [{ label: "주관", value: `AIKU, ${partners("co_host")}` }] : []),
    ...(partners("sponsor") ? [{ label: "후원", value: partners("sponsor") }] : []),
  ];
  const replaces = event.kind === "joint" && event.edition !== null;

  return (
    <article id={`aikuthon-${event.edition ?? event.id}`} className="card p-8 max-sm:p-5">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <Eyebrow spacing="none">
              {formatDates(event.startsOn, event.endsOn, event.datePrecision)}
            </Eyebrow>
            {replaces ? (
              <span className={clsx(pill, "bg-surface-soft text-body")}>제{event.edition}회 대체</span>
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

      <FieldTags tags={event.tags} className="mt-4 max-sm:mt-3" />

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-small max-sm:mt-3">
        {facts.map((fact) => (
          <Fragment key={fact.label}>
            <dt className="text-muted">{fact.label}</dt>
            <dd className={clsx("min-w-0", fact.value ? "text-body" : "text-muted")}>
              {fact.value || "—"}
            </dd>
          </Fragment>
        ))}
      </dl>

      <div className="mt-6 border-t border-soft-line pt-5 max-sm:mt-4 max-sm:pt-4">
        {event.awards.length ? (
          <ul className="grid gap-2.5" aria-label="수상">
            {event.awards.map((award) => (
              <li key={award.rank} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span className={clsx(pill, "self-center", RANKS[award.rank].tone)}>
                  {RANKS[award.rank].label}
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
