"use client";

import clsx from "clsx";
import { useState } from "react";

import type { StudioEvent } from "@/actions/studio";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { addDays, rangeLabel, TIMELINE_DAYS, timelineDays, weekStart } from "@/lib/studio/timeline";

// One lane per program, in the order a week runs; each with its own colour.
const LANES: { kinds: StudioEvent["kind"][]; label: string; tone: string }[] = [
  {
    kinds: ["deepintodeep"],
    label: "DeepIntoDeep",
    tone: "bg-sky-100 text-sky-800 border-sky-200",
  },
  {
    kinds: ["momentum"],
    label: "Momentum",
    tone: "bg-violet-100 text-violet-800 border-violet-200",
  },
  {
    kinds: ["seminar"],
    label: "Seminar",
    tone: "bg-green-100 text-green-800 border-green-200",
  },
  {
    kinds: ["event", "aikuthon"],
    label: "Events",
    tone: "bg-amber-100 text-amber-800 border-amber-200",
  },
];
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * Four weeks of the semester as a timeline: days across, one lane per
 * program, each session a bar on its day. Opens on the current week; the
 * arrows move four weeks at a time. Scrolls sideways on narrow screens.
 */
export function StudioTimeline({ events, today }: { events: StudioEvent[]; today: string }) {
  const [start, setStart] = useState(() => weekStart(today));
  const days = timelineDays(start);
  const end = days.at(-1)!.iso;
  const shown = events.filter((event) => event.date >= start && event.date <= end);
  const column = (iso: string) => days.findIndex((day) => day.iso === iso) + 2;

  return (
    <section className="grid gap-4" aria-labelledby="studio-timeline">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="studio-timeline" className="text-[1.25rem] font-bold text-ink">
          일정
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="이전 4주"
            onClick={() => setStart(addDays(start, -TIMELINE_DAYS))}
            className="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface-soft hover:text-ink"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <span className="min-w-[9.5rem] text-center text-small font-semibold text-ink tabular-nums">
            {rangeLabel(start)}
          </span>
          <button
            type="button"
            aria-label="다음 4주"
            onClick={() => setStart(addDays(start, TIMELINE_DAYS))}
            className="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface-soft hover:text-ink"
          >
            <ChevronRightIcon className="size-4" />
          </button>
          {start !== weekStart(today) ? (
            <button
              type="button"
              onClick={() => setStart(weekStart(today))}
              className="ml-1 rounded-full border border-line px-3 py-1 text-label font-semibold text-body hover:bg-surface-soft"
            >
              이번 주
            </button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-[20px] border border-line bg-surface">
        <div
          className="grid min-w-[56rem]"
          style={{ gridTemplateColumns: `7.5rem repeat(${TIMELINE_DAYS}, minmax(0, 1fr))` }}
        >
          {/* Day header: weekday and date; weekends muted, today marked. */}
          <div className="border-b border-soft-line" />
          {days.map((day) => (
            <div
              key={day.iso}
              className={clsx(
                "grid justify-items-center gap-0.5 border-b border-soft-line py-2 text-[0.6875rem] tabular-nums",
                day.weekday === 1 && "border-l border-soft-line",
                day.weekday === 0 || day.weekday === 6 ? "text-muted/60" : "text-muted",
              )}
            >
              <span>{WEEKDAYS[day.weekday]}</span>
              <span
                className={clsx(
                  "inline-flex size-6 items-center justify-center rounded-full font-semibold",
                  day.iso === today ? "bg-ink text-white" : "text-ink",
                )}
              >
                {day.monthStart || day.iso === start
                  ? `${Number(day.iso.slice(5, 7))}/${day.day}`
                  : day.day}
              </span>
            </div>
          ))}

          {LANES.map((lane, row) => (
            <div key={lane.label} className="contents">
              <div
                className="flex items-center border-b border-soft-line px-4 py-3 text-label font-semibold text-body last:border-b-0"
                style={{ gridRow: row + 2, gridColumn: 1 }}
              >
                {lane.label}
              </div>
              {/* Week dividers and today's column, behind the bars. */}
              {days.map((day, index) => (
                <div
                  key={day.iso}
                  aria-hidden="true"
                  className={clsx(
                    "border-b border-soft-line",
                    day.weekday === 1 && "border-l",
                    day.iso === today && "bg-green-50/70",
                  )}
                  style={{ gridRow: row + 2, gridColumn: index + 2 }}
                />
              ))}
              {shown
                .filter((event) => lane.kinds.includes(event.kind))
                .map((event) => (
                  <div
                    key={`${event.date}-${event.title}`}
                    title={event.title}
                    className={clsx(
                      "z-1 mx-0.5 my-2 flex min-h-8 items-center truncate rounded-md border px-1.5 text-[0.6875rem] font-semibold",
                      lane.tone,
                      event.date < today && "opacity-50",
                    )}
                    style={{ gridRow: row + 2, gridColumn: `${column(event.date)} / span 1` }}
                  >
                    {shortTitle(event.title)}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="text-small text-muted">이 4주에는 일정이 없습니다.</p>
      ) : null}
    </section>
  );
}

/** "26-2 Seminar 16회" → "16회": the lane already says what it is. */
function shortTitle(title: string) {
  return /(\d+회)\s*$/.exec(title)?.[1] ?? title;
}
