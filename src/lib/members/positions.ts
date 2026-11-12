/**
 * Officer titles. The database keeps one `member_positions` row per title
 * (a generation plus "회장" or "부회장"); the site shows them as one string
 * such as "8기 회장", and the admin types them the same way.
 */

export const POSITION_TITLES = ["회장", "부회장"] as const;
export type PositionTitle = (typeof POSITION_TITLES)[number];

export type PositionInput = {
  /** Generation name, e.g. "8기". It need not be the member's own generation. */
  generation: string;
  title: PositionTitle;
};

/** A `member_positions` row joined with its generation's name. */
export type PositionRow = { title: string; generations: { name: string } };

/** Selects what `formatPositions` needs; embed it in a `members` query. */
export const POSITION_SELECT = "member_positions(title, generations(name))";

export const POSITION_FORMAT_MESSAGE =
  '직책은 "8기 회장"처럼 기수와 회장 또는 부회장으로 입력하세요. 여러 개는 쉼표로 구분합니다.';

const POSITION_PATTERN = /^(\d+기)\s*(회장|부회장)$/;

/**
 * Reads the admin's 직책 input: "8기 회장", several separated by commas, or
 * empty for none. Returns null when any part is not a generation and a title.
 */
export function parsePositions(input: string): PositionInput[] | null {
  const positions = new Map<string, PositionInput>();
  for (const part of input.split(",")) {
    const value = part.trim();
    if (!value) continue;
    const match = POSITION_PATTERN.exec(value);
    if (!match) return null;
    const position = { generation: match[1], title: match[2] as PositionTitle };
    positions.set(`${position.generation} ${position.title}`, position);
  }
  return [...positions.values()];
}

const generationNumber = (name: string) => {
  const match = /^(\d+)/.exec(name);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
};

const titleRank = (title: string) => {
  const index = POSITION_TITLES.indexOf(title as PositionTitle);
  return index === -1 ? POSITION_TITLES.length : index;
};

/**
 * The display value of a member's titles: "7기 부회장, 8기 회장", earliest
 * generation first; empty for a member without one.
 */
export function formatPositions(rows: PositionRow[] | null | undefined): string {
  return [...(rows ?? [])]
    .sort(
      (a, b) =>
        generationNumber(a.generations.name) - generationNumber(b.generations.name) ||
        titleRank(a.title) - titleRank(b.title),
    )
    .map((row) => `${row.generations.name} ${row.title}`)
    .join(", ");
}

/**
 * The joined member a name card needs (PersonName): roster facts, the public
 * profile's picture and the officer titles. Read through mapPersonMember.
 */
export const PERSON_MEMBER_SELECT =
  `members(id, name, department, grade, generations(name), member_profiles(is_public, avatar_path), ${POSITION_SELECT})` as const;
