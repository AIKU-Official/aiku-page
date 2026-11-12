// AIKU's seasons, the society's unit of time, in one place for the site.
// Safe to import anywhere.
//
// The seasons table is the record (name, year, term, starts_on, ends_on);
// supabase/migrations/20261113000005_season_dates.sql holds the same term
// rule for the database. Everything else, labels, ordering, the term of a
// date, comes from TERMS below rather than being written out again.

/** A season's term, as stored in seasons.term. */
export type SeasonTerm = "winter" | "1" | "summer" | "2";

/**
 * The four terms in the order they run within a year: the short code the
 * calendar shows (2026-W), the word in stored names (26-겨울), and the
 * months they cover.
 */
export const TERMS: readonly {
  term: SeasonTerm;
  code: string;
  word: string;
  firstMonth: number;
  lastMonth: number;
}[] = [
  { term: "winter", code: "W", word: "겨울", firstMonth: 1, lastMonth: 2 },
  { term: "1", code: "1", word: "1", firstMonth: 3, lastMonth: 6 },
  { term: "summer", code: "S", word: "여름", firstMonth: 7, lastMonth: 8 },
  { term: "2", code: "2", word: "2", firstMonth: 9, lastMonth: 12 },
];

const byTerm = (term: SeasonTerm) => TERMS.find((entry) => entry.term === term)!;

// 26-1, 2026-1, 26-여름, 26-S, 2026-W …: two- or four-digit year, then a term word or code.
const PATTERN = /^(?:20)?(\d{2})-(.+)$/;

/**
 * Reads a season name in any accepted form, "26-여름", "2026-S", "26-W",
 * "2026-1", as { year, term }; null for anything else. The database accepts
 * the same forms and stores them as "26-여름".
 */
export function parseSeasonName(name: string): { year: number; term: SeasonTerm } | null {
  const match = PATTERN.exec(name.trim());
  if (!match) return null;
  const word = match[2].toUpperCase();
  const entry = TERMS.find((t) => t.word === match[2] || t.code === word);
  return entry ? { year: 2000 + Number(match[1]), term: entry.term } : null;
}

/** The stored name, "26-여름": the form the site shows and links with. */
export const seasonName = (year: number, term: SeasonTerm) =>
  `${String(year % 100).padStart(2, "0")}-${byTerm(term).word}`;

/** The full code, "2026-S", as the calendar's corner shows it. */
export const seasonCode = (year: number, term: SeasonTerm) => `${year}-${byTerm(term).code}`;

/** The season a day falls in, by the month rule (also for seasons not stored yet). */
export function seasonOfDate(iso: string): { year: number; term: SeasonTerm } {
  const month = Number(iso.slice(5, 7));
  const entry = TERMS.find((t) => month >= t.firstMonth && month <= t.lastMonth)!;
  return { year: Number(iso.slice(0, 4)), term: entry.term };
}

/** Sorts seasons newest first. */
export const newestFirst = (
  a: { year: number; term: SeasonTerm },
  b: { year: number; term: SeasonTerm },
) => b.year - a.year || TERMS.indexOf(byTerm(b.term)) - TERMS.indexOf(byTerm(a.term));

/**
 * The two seasons whose attendance and points are counted together and reset
 * together (the society's rule): winter with the 1st term, summer with the
 * 2nd. Returns both names, e.g. ["26-여름", "26-2"], and a key for grouping.
 */
export function pointsPeriod(year: number, term: SeasonTerm) {
  const second = term === "winter" || term === "1" ? "1" : "2";
  const first: SeasonTerm = second === "1" ? "winter" : "summer";
  return {
    key: `${year}-${second}`,
    seasons: [seasonName(year, first), seasonName(year, second)] as const,
  };
}
