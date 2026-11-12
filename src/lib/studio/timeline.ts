// The Studio timeline: four weeks of days, Monday first, with each day's
// events in one lane per program. Pure, safe to import anywhere.

export const TIMELINE_DAYS = 28;

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (date: Date) => date.toISOString().slice(0, 10);

export function addDays(iso: string, days: number): string {
  const date = toDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
}

/** The Monday of the week holding `iso`. */
export function weekStart(iso: string): string {
  const day = toDate(iso).getUTCDay();
  return addDays(iso, -((day + 6) % 7));
}

export type TimelineDay = { iso: string; day: number; weekday: number; monthStart: boolean };

export function timelineDays(start: string, count = TIMELINE_DAYS): TimelineDay[] {
  return Array.from({ length: count }, (_, index) => {
    const iso = addDays(start, index);
    const date = toDate(iso);
    return {
      iso,
      day: date.getUTCDate(),
      weekday: date.getUTCDay(),
      monthStart: date.getUTCDate() === 1,
    };
  });
}

/** "11월 9일 – 12월 6일". */
export function rangeLabel(start: string, count = TIMELINE_DAYS): string {
  const label = (iso: string) => {
    const date = toDate(iso);
    return `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일`;
  };
  return `${label(start)} – ${label(addDays(start, count - 1))}`;
}

/** Today in Korea as "2026-11-13", the same on every device. */
export const todayInKorea = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());

/** The id of a session's row on its program page, "session-2026-11-19", for direct links. */
export const sessionAnchor = (iso: string) => `session-${iso}`;

/** The last day of the month `months` after the month of `iso`: monthEnd("2026-11-13", 4) is "2027-03-31". */
export function monthEnd(iso: string, months: number): string {
  const date = toDate(iso);
  return toIso(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months + 1, 0)));
}

/**
 * The season a day falls in, as the calendar's corner shows it: "2026-W"
 * (January–February, winter break), "2026-1" (March–June), "2026-S"
 * (July–August, summer) and "2026-2" (September–December).
 */
export function seasonCode(iso: string): string {
  const month = Number(iso.slice(5, 7));
  const term = month <= 2 ? "W" : month <= 6 ? "1" : month <= 8 ? "S" : "2";
  return `${iso.slice(0, 4)}-${term}`;
}
