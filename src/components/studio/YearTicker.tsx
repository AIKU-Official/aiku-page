"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import type { TimelineDay } from "@/lib/studio/timeline";

/** How far a year boundary travels while the label turns over: two days' width. */
const SPAN_DAYS = 2;
/** How far the numbers slide, in px. */
const SLIDE = 112;

/**
 * The year of the days at the left edge of the timeline, in its top-left
 * corner. When a 1 January passes that edge the year turns over sideways,
 * the old one sliding out to the left and the new one in from the right,
 * moved by the scroll itself so it keeps pace with the days (stop halfway
 * and it stops halfway). Both sides fade, like the wheel of an old clock.
 * Follows the scroll through refs, so the calendar does not re-render.
 */
export function YearTicker({
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
  const [years, setYears] = useState(() => {
    const year = Number(days[0]?.iso.slice(0, 4));
    return { from: year, to: year + 1 };
  });

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    // Columns where a new year starts.
    const turns = days
      .map((day, index) => ({
        index,
        year: Number(day.iso.slice(0, 4)),
        first: day.iso.endsWith("-01-01"),
      }))
      .filter((day) => day.first);
    const firstYear = Number(days[0]?.iso.slice(0, 4));
    let frame = 0;

    const place = () => {
      frame = 0;
      const left = element.scrollLeft;
      const width = SPAN_DAYS * dayWidth;
      // The last boundary at or before the right end of the turning window.
      let from = firstYear;
      let progress = 0;
      for (const turn of turns) {
        const distance = turn.index * dayWidth - left; // boundary's distance from the left edge
        if (distance <= 0) {
          from = turn.year;
          progress = 0;
        } else if (distance < width) {
          from = turn.year - 1;
          progress = 1 - distance / width;
        }
      }
      setYears((shown) => (shown.from === from ? shown : { from, to: from + 1 }));
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
  }, [scroller, days, dayWidth]);

  return (
    <div
      className="relative h-7 w-28 overflow-hidden text-[1.25rem] font-bold text-ink/80 tabular-nums"
      style={{
        maskImage: "linear-gradient(to right, transparent, black 22%, black 78%, transparent)",
      }}
      aria-label={`${years.from}년`}
    >
      <span
        ref={current}
        className="absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        {years.from}
      </span>
      <span
        ref={next}
        className="absolute inset-0 flex items-center justify-center opacity-0"
        aria-hidden="true"
      >
        {years.to}
      </span>
    </div>
  );
}
