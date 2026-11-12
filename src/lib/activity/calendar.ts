// Pure helpers for the attendance calendar and the points semester. Safe to
// import from client code.

export type AttendanceStatus = "present" | "excused_late" | "late" | "absent" | "excused_absent";
export type SessionKind = "deepintodeep" | "seminar" | "momentum" | "event" | "afterparty";
export type SeasonTerm = "winter" | "1" | "summer" | "2";

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: "출석",
  excused_late: "인정 지각",
  late: "무단지각",
  absent: "무단결석",
  excused_absent: "인정결석",
};

/** Legend order, from attended to missed. */
export const ATTENDANCE_ORDER: AttendanceStatus[] = [
  "present",
  "excused_late",
  "late",
  "absent",
  "excused_absent",
];

// When a day has several sessions, its square shows the one that matters most.
const WEIGHT: Record<AttendanceStatus, number> = {
  absent: 5,
  late: 4,
  excused_absent: 3,
  excused_late: 2,
  present: 1,
};

export function worstStatus(statuses: AttendanceStatus[]): AttendanceStatus {
  return statuses.reduce((worst, status) => (WEIGHT[status] > WEIGHT[worst] ? status : worst));
}

/**
 * The points semester a season belongs to: winter and the 1st term form
 * semester 1, summer and the 2nd term semester 2. "26-2" for 2026 summer.
 */
export function semesterOf(year: number, term: SeasonTerm): string {
  const half = term === "winter" || term === "1" ? 1 : 2;
  return `${String(year % 100).padStart(2, "0")}-${half}`;
}

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Columns of seven days (Monday first) covering every day from `first` to
 * `last`, like a contribution calendar. Days outside the range are null.
 */
export function calendarWeeks(first: string, last: string): (string | null)[][] {
  const start = toDate(first);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const end = toDate(last);
  const weeks: (string | null)[][] = [];
  for (const day = new Date(start); day <= end; ) {
    const week: (string | null)[] = [];
    for (let i = 0; i < 7; i += 1) {
      const iso = toIso(day);
      week.push(iso >= first && iso <= last ? iso : null);
      day.setUTCDate(day.getUTCDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** "7월 30일 (목)". */
export function formatDay(iso: string): string {
  const date = toDate(iso);
  return `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일 (${WEEKDAYS[date.getUTCDay()]})`;
}

/** "+2", "-0.5", "0". */
export function formatPoints(points: number): string {
  const rounded = Math.round(points * 10) / 10;
  return rounded > 0 ? `+${rounded}` : String(rounded);
}
