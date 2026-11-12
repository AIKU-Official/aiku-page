// Pure helpers for the attendance calendar and the points semester. Safe to
// import from client code.

export type AttendanceStatus = "present" | "excused_late" | "late" | "absent" | "excused_absent";
/** Sessions attendance is taken for. */
export type AttendanceKind = "deepintodeep" | "seminar" | "momentum" | "event" | "afterparty";
/** Every kind of entry on AIKU's calendar: the sessions and the rest of the schedule. */
export type SessionKind =
  AttendanceKind | "conference" | "exchange" | "academic" | "holiday" | "notice";
export type SeasonTerm = "winter" | "1" | "summer" | "2";

export const SESSION_KIND_LABELS: Record<SessionKind, string> = {
  deepintodeep: "DeepIntoDeep",
  seminar: "세미나",
  momentum: "모멘텀",
  event: "필수 행사",
  afterparty: "필수 뒤풀이",
  conference: "컨퍼런스",
  exchange: "교류",
  academic: "학사일정",
  holiday: "공휴일",
  notice: "공지",
};

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: "출석",
  excused_late: "인정 지각",
  late: "무단지각",
  absent: "무단결석",
  excused_absent: "인정결석",
};

/**
 * The points semester a season belongs to: winter and the 1st term form
 * semester 1, summer and the 2nd term semester 2. "26-2" for 2026 summer.
 */
export function semesterOf(year: number, term: SeasonTerm): string {
  const half = term === "winter" || term === "1" ? 1 : 2;
  return `${String(year % 100).padStart(2, "0")}-${half}`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

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
