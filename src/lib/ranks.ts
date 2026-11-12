// 1st, 2nd and 3rd place: the only placings the site records, for projects
// and AIKUTHONs alike. Safe to import anywhere; the medal styling lives in
// components/ui/ranks.

export type Rank = 1 | 2 | 3;

export const RANKS: readonly Rank[] = [1, 2, 3];

export const isRank = (value: number | null | undefined): value is Rank =>
  value === 1 || value === 2 || value === 3;

/** The rank, or null for anything that is not 1, 2 or 3. */
export const toRank = (value: number | null | undefined): Rank | null => (isRank(value) ? value : null);

export const rankLabel = (rank: Rank) => `${rank}등`;
