"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import { seasonCode as code, seasonOfDate } from "@/lib/seasons/name";
import type { TimelineDay } from "@/lib/studio/timeline";

/** "2026-S" for a day. */
const seasonCode = (iso: string) => {
  const season = seasonOfDate(iso);
  return code(season.year, season.term);
};

/** How far a season boundary travels while the label turns over: two days' width. */
const SPAN_DAYS = 2;
/** How far the labels slide, in px: more than a label's width, so the two never touch. */
const SLIDE = 124;

/**
 * The season of the days at the left edge of the timeline ("2026-2"), in its
 * top-left corner. When a season starts at that edge (1 January, 1 March,
 * 1 July, 1 September) the label turns over sideways, the old one sliding
 * out to the left and the new one in from the right, moved by the scroll
 * itself so it keeps pace with the days (stop halfway and it stops halfway).
 * Both sides fade, like the wheel of an old clock. Follows the scroll
 * through refs, so the calendar does not re-render.
 */
export function SeasonTicker({
  scroller,
  days,
  dayWidth,
}: {
  scroller: RefObject<HTMLDivElement | null>;
  days: TimelineDay[];
  dayWidth: number;
}) {
  const current = useRef<HTMLSpanElement>(null);
  const next = useRef<HTMLSpanElement>(null);
  const first = days[0] ? seasonCode(days[0].iso) : "";
  const [labels, setLabels] = useState({ from: first, to: first });

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    // Columns where a new season starts, with the seasons on either side.
    const turns = days
      .map((day, index) => ({ index, season: seasonCode(day.iso) }))
      .filter((day, index, all) => index > 0 && day.season !== all[index - 1].season)
      .map((day) => ({ ...day, before: seasonCode(days[day.index - 1].iso) }));
    let frame = 0;

    const place = () => {
      frame = 0;
      const width = SPAN_DAYS * dayWidth;
      let from = first;
      let to = first;
      let progress = 0;
      for (const turn of turns) {
        const distance = turn.index * dayWidth - element.scrollLeft;
        if (distance <= 0) {
          from = turn.season;
          to = turn.season;
          progress = 0;
        } else if (distance < width) {
          from = turn.before;
          to = turn.season;
          progress = 1 - distance / width;
        }
      }
      setLabels((shown) => (shown.from === from && shown.to === to ? shown : { from, to }));
      if (current.current && next.current) {
        current.current.style.transform = `translateX(${-progress * SLIDE}px)`;
        current.current.style.opacity = String(1 - progress);
        next.current.style.transform = `translateX(${(1 - progress) * SLIDE}px)`;
        next.current.style.opacity = String(progress);
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(place);
    };
    place();
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      element.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [scroller, days, dayWidth, first]);

  return (
    <div
      className="relative h-7 w-28 overflow-hidden text-[1.1875rem] font-bold text-ink/80 tabular-nums"
      style={{
        maskImage: "linear-gradient(to right, transparent, black 18%, black 82%, transparent)",
      }}
      aria-label={labels.from}
    >
      <span
        ref={current}
        className="absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        {labels.from}
      </span>
      <span
        ref={next}
        className="absolute inset-0 flex items-center justify-center opacity-0"
        aria-hidden="true"
      >
        {labels.to}
      </span>
    </div>
  );
}
