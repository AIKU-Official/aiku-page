"use client";

import clsx from "clsx";
import { useLayoutEffect, useRef, useState, type MouseEvent } from "react";

import type { StudioEvent } from "@/actions/studio";
import { CursorTip, useCursorPoint } from "@/components/ui/CursorTip";
import { EventPill } from "@/components/studio/EventPill";
import { SeasonTicker } from "@/components/studio/SeasonTicker";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { formatDay } from "@/lib/activity/calendar";
import { programHref, PROGRAMS, type ProgramSlug } from "@/lib/studio/programs";
import { addDays, monthEnd, sessionAnchor, timelineDays, weekStart } from "@/lib/studio/timeline";

type Lane = { kinds: StudioEvent["kind"][]; label: string; tone: string; accent: string };

// One lane per program, in the order a week runs, then the rest of the calendar.
const LANES: Lane[] = [
  ...(["deepintodeep", "momentum", "seminar"] as const).map((slug) => ({
    kinds: [PROGRAMS[slug].kind] as StudioEvent["kind"][],
    label: PROGRAMS[slug].label,
    tone: PROGRAMS[slug].tone.chip,
    accent: PROGRAMS[slug].tone.accent,
  })),
  {
    kinds: ["event", "conference", "exchange", "aikuthon"],
    label: "Events",
    tone: "bg-violet-100 text-violet-800 border-violet-800/20",
    accent: "bg-violet-800/60",
  },
  {
    kinds: ["academic", "holiday"],
    label: "Academic",
    tone: "bg-danger-soft text-danger border-danger/20",
    accent: "bg-danger/60",
  },
  {
    kinds: ["notice"],
    label: "Notice",
    tone: "bg-surface text-body border-line",
    accent: "bg-line-strong",
  },
];
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const DAY_WIDTH = 76; // px: room for "16회" or a short title on one day
const LABEL_WIDTH = 140;
const ROW_HEIGHT = 56;
const DAY_MS = 86_400_000;

/** Where an entry leads: its session on the program's page, AIKUTHON's page, or nowhere. */
function hrefOf(event: StudioEvent) {
  const program = (Object.keys(PROGRAMS) as ProgramSlug[]).find(
    (slug) => PROGRAMS[slug].kind === event.kind,
  );
  if (program) return `${programHref(program, event.season)}#${sessionAnchor(event.date)}`;
  if (event.kind === "aikuthon") return "/aikuthon";
  return null;
}

/** "지난 일정", "오늘", "6일 남음". */
function when(event: StudioEvent, today: string) {
  if ((event.until ?? event.date) < today) return "지난 일정";
  if (event.date <= today) return "오늘";
  return `${Math.round((Date.parse(event.date) - Date.parse(today)) / DAY_MS)}일 남음`;
}

/**
 * The current season and the months ahead as one scrolling timeline: days across (past days greyed,
 * today marked), one lane per program, each entry a bar over its days. It
 * opens on the current week; the lane names stay put while the days scroll
 * under a fade. Hovering an entry shows it beside the cursor; clicking a
 * session opens it on its program's page.
 */
export function StudioTimeline({ events, today }: { events: StudioEvent[]; today: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const { point, follow, hide } = useCursorPoint();
  const [hovered, setHovered] = useState<StudioEvent | null>(null);

  // From the week of the first entry (the season's start) on.
  const first = weekStart(events.reduce((min, e) => (e.date < min ? e.date : min), today));
  // To the last entry, and at least to the end of the month four months ahead.
  const last = events.reduce(
    (max, e) => ((e.until ?? e.date) > max ? (e.until ?? e.date) : max),
    monthEnd(today, 4),
  );
  const weeks = Math.floor((Date.parse(last) - Date.parse(first)) / DAY_MS / 7) + 1;
  const days = timelineDays(first, weeks * 7);
  const column = (iso: string) => days.findIndex((day) => day.iso === iso);
  // Grid line where the past ends: today's column, or past the last day if all are past.
  const pastEnd =
    column(today) >= 0 ? column(today) + 2 : today > days.at(-1)!.iso ? days.length + 2 : 2;
  // Every day a public holiday covers, for the header's colour.
  const holidays = new Set(
    events
      .filter((event) => event.kind === "holiday")
      .flatMap((event) =>
        timelineDays(
          event.date,
          Math.round((Date.parse(event.until ?? event.date) - Date.parse(event.date)) / DAY_MS) + 1,
        ).map((day) => day.iso),
      ),
  );

  const scrollToDay = (iso: string, behavior: ScrollBehavior = "smooth") =>
    scroller.current?.scrollTo({ left: Math.max(0, column(iso)) * DAY_WIDTH, behavior });
  const scrollWeeks = (count: number) =>
    scroller.current?.scrollBy({ left: count * 7 * DAY_WIDTH, behavior: "smooth" });

  useLayoutEffect(() => {
    // Once, on opening; the member scrolls from there.
    scrollToDay(weekStart(today), "instant");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showTip = (event: StudioEvent) => (mouse: MouseEvent) => {
    setHovered(event);
    follow(mouse);
  };
  const hideTip = () => {
    setHovered(null);
    hide();
  };
  const fade =
    "after:pointer-events-none after:absolute after:inset-y-0 after:left-full after:w-10 after:bg-linear-to-r after:from-surface after:to-transparent";

  return (
    <section className="grid gap-4" aria-labelledby="studio-timeline">
      <div className="flex items-center justify-between gap-3">
        <h2 id="studio-timeline" className="text-heading text-ink">
          일정
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="이전 주"
            onClick={() => scrollWeeks(-1)}
            className="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface-soft hover:text-ink"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollToDay(weekStart(today))}
            className="rounded-full border border-line px-3 py-1 text-label font-semibold text-body hover:bg-surface-soft"
          >
            이번 주
          </button>
          <button
            type="button"
            aria-label="다음 주"
            onClick={() => scrollWeeks(1)}
            className="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface-soft hover:text-ink"
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>
      </div>

      <div
        ref={scroller}
        className="overflow-x-auto overscroll-x-contain rounded-[20px] border border-line bg-surface"
      >
        <div
          className="relative grid"
          style={{
            width: LABEL_WIDTH + days.length * DAY_WIDTH,
            gridTemplateColumns: `${LABEL_WIDTH}px repeat(${days.length}, ${DAY_WIDTH}px)`,
            gridTemplateRows: `auto repeat(${LANES.length}, ${ROW_HEIGHT}px)`,
          }}
        >
          {/* Under the lanes, in greys only so the programs' colours stay the
              only colour: past days washed light grey, a rule at each week,
              a hairline under each lane, and today as a thin dark line. */}
          {days.map((day, i) => (
            <div
              key={`bg-${day.iso}`}
              aria-hidden="true"
              className={clsx(
                // Rules a step darker over the past wash, so they stay one with it.
                day.weekday === 1 &&
                  (day.iso < today ? "border-l border-line" : "border-l border-soft-line"),
                // The wash fades out over the last day before today rather than stopping at a line.
                day.iso < addDays(today, -1) && "bg-surface-soft",
                day.iso === addDays(today, -1) && "bg-linear-to-r from-surface-soft to-transparent",
              )}
              style={{ gridRow: `2 / ${LANES.length + 2}`, gridColumn: i + 2 }}
            />
          ))}
          {LANES.slice(0, -1).map((lane, row) => (
            <div
              key={`rule-${lane.label}`}
              aria-hidden="true"
              className="border-b border-soft-line"
              style={{ gridRow: row + 2, gridColumn: `1 / ${days.length + 2}` }}
            />
          ))}
          {/* Over the past wash the lane hairlines are a step darker, fading
              back to the light rule over the day before today as the wash does. */}
          {pastEnd > 2
            ? LANES.slice(0, -1).flatMap((lane, row) => [
                pastEnd > 3 ? (
                  <div
                    key={`past-rule-${lane.label}`}
                    aria-hidden="true"
                    className="h-px self-end bg-line"
                    style={{ gridRow: row + 2, gridColumn: `2 / ${pastEnd - 1}` }}
                  />
                ) : null,
                <div
                  key={`past-fade-${lane.label}`}
                  aria-hidden="true"
                  className="h-px self-end bg-linear-to-r from-line to-transparent"
                  style={{ gridRow: row + 2, gridColumn: pastEnd - 1 }}
                />,
              ])
            : null}
          {column(today) >= 0 ? (
            <div
              aria-hidden="true"
              className="pointer-events-none z-1 flex justify-center"
              style={{ gridRow: `2 / ${LANES.length + 2}`, gridColumn: column(today) + 2 }}
            >
              <div className="w-px bg-ink/45" />
            </div>
          ) : null}

          {/* Day header: the month on its first day, weekday, date. Sundays and
              holidays in the site's red, Saturdays in its deep sky, both soft;
              past days a step fainter. */}
          {days.map((day, i) => {
            const tone =
              day.weekday === 0 || holidays.has(day.iso)
                ? "text-danger"
                : day.weekday === 6
                  ? "text-sky-800"
                  : null;
            const past = day.iso < today;
            return (
              <div
                key={`day-${day.iso}`}
                className="grid justify-items-center gap-0.5 border-b border-line pt-3 pb-2.5 text-[0.6875rem] tabular-nums"
                style={{ gridRow: 1, gridColumn: i + 2 }}
              >
                <span className="h-3.5 font-semibold text-body">
                  {day.monthStart || i === 0 ? `${Number(day.iso.slice(5, 7))}월` : ""}
                </span>
                <span className={clsx(tone ?? "text-muted", past ? "opacity-45" : "opacity-75")}>
                  {WEEKDAYS[day.weekday]}
                </span>
                <span
                  className={clsx(
                    "inline-flex size-6 items-center justify-center rounded-full text-small font-semibold",
                    day.iso === today
                      ? "bg-ink text-white"
                      : clsx(
                          tone ?? (past ? "text-muted" : "text-ink"),
                          tone && (past ? "opacity-50" : "opacity-85"),
                        ),
                  )}
                >
                  {day.day}
                </span>
              </div>
            );
          })}

          {/* Lane names and the corner stay at the left; the days pass under a fade. */}
          <div
            className={clsx(
              "sticky left-0 z-3 flex items-center justify-center border-b border-line bg-surface",
              fade,
            )}
            style={{ gridRow: 1, gridColumn: 1 }}
          >
            <SeasonTicker scroller={scroller} days={days} dayWidth={DAY_WIDTH} />
          </div>
          {LANES.map((lane, row) => (
            <div
              key={lane.label}
              className={clsx(
                "sticky left-0 z-3 flex items-center gap-2 bg-surface px-5 text-label font-semibold text-body",
                row < LANES.length - 1 && "border-b border-soft-line",
                fade,
              )}
              style={{ gridRow: row + 2, gridColumn: 1 }}
            >
              <span
                className={clsx("size-2 shrink-0 rounded-full", lane.accent)}
                aria-hidden="true"
              />
              {lane.label}
            </div>
          ))}

          {LANES.map((lane, row) =>
            events
              .filter((event) => lane.kinds.includes(event.kind))
              .map((event) => (
                <EventPill
                  key={`${event.kind}-${event.date}-${event.title}`}
                  label={event.label}
                  href={hrefOf(event)}
                  tone={lane.tone}
                  faded={(event.until ?? event.date) < today}
                  style={{
                    gridRow: row + 2,
                    gridColumn: `${column(event.date) + 2} / ${column(event.until ?? event.date) + 3}`,
                  }}
                  onMouseEnter={showTip(event)}
                  onMouseMove={follow}
                  onMouseLeave={hideTip}
                />
              )),
          )}
        </div>
      </div>

      {point && hovered ? (
        <CursorTip
          point={point}
          className="grid w-[260px] gap-1 card px-4 py-3.5 shadow-[0_12px_32px_rgb(29_29_29/0.14)]"
        >
          <span className="text-label font-semibold text-muted">{hovered.kindLabel}</span>
          <span className="font-semibold text-ink">{hovered.title}</span>
          <span className="text-small text-body tabular-nums">
            {formatDay(hovered.date)}
            {hovered.until ? ` – ${formatDay(hovered.until)}` : ""}
          </span>
          <span className="text-label text-muted">
            {when(hovered, today)}
            {hrefOf(hovered) ? " · 눌러서 보기" : ""}
          </span>
        </CursorTip>
      ) : null}
    </section>
  );
}
