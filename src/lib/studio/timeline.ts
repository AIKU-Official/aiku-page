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
