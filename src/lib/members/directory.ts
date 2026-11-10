import { MEMBER_GRADE_LABELS, type Member, type MemberGrade } from "@/lib/types";

// Filtering for the Members directory: generation, grade and a free-text
// search over name, department and officer title.

export const ALL = "all";

export type DirectoryFilter = {
  /** Generation name such as "8기", or ALL. */
  generation: string;
  grade: MemberGrade | typeof ALL;
  query: string;
};

type Searchable = Pick<Member, "name" | "department" | "position" | "grade">;

const CHOSEONG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
const SYLLABLES_PER_CHOSEONG = 588;

const normalize = (value: string) => value.normalize("NFC").toLowerCase().replace(/\s+/g, "");

/** Initial consonants of each Hangul syllable ("이찬" → "ㅇㅊ"); other characters pass through. */
export function toChoseong(value: string): string {
  return Array.from(value, (char) => {
    const code = char.charCodeAt(0);
    return code >= HANGUL_START && code <= HANGUL_END
      ? CHOSEONG[Math.floor((code - HANGUL_START) / SYLLABLES_PER_CHOSEONG)]
      : char;
  }).join("");
}

const isChoseongOnly = (value: string) => Array.from(value).every((c) => CHOSEONG.includes(c));

/**
 * True when the query is empty or appears in the member's name, department or
 * officer title. A query typed as initial consonants only ("ㅇㅊ") matches names.
 */
export function matchesQuery(member: Searchable, query: string): boolean {
  const needle = normalize(query);
  if (!needle) return true;
  const name = normalize(member.name);
  if (isChoseongOnly(needle)) return toChoseong(name).includes(needle);
  return [name, normalize(member.department), normalize(member.position)].some((field) =>
    field.includes(needle),
  );
}

export function matchesFilter(
  member: Searchable,
  generationName: string,
  filter: DirectoryFilter,
): boolean {
  return (
    (filter.generation === ALL || filter.generation === generationName) &&
    (filter.grade === ALL || filter.grade === member.grade) &&
    matchesQuery(member, filter.query)
  );
}

export function directoryStatusText(
  filter: DirectoryFilter,
  visibleCount: number,
  totalCount: number,
): string {
  if (!totalCount) {
    return "아직 공개된 멤버가 없습니다.";
  }
  const scope =
    [
      filter.generation === ALL ? "" : filter.generation,
      filter.grade === ALL ? "" : MEMBER_GRADE_LABELS[filter.grade],
    ]
      .filter(Boolean)
      .join(" ") || "전체";
  const query = filter.query.trim();
  if (query) {
    return visibleCount
      ? `${scope} 멤버 중 "${query}" 검색 결과 ${visibleCount}명을 보고 있습니다.`
      : `${scope} 멤버 중 "${query}"에 해당하는 멤버가 없습니다.`;
  }
  return visibleCount
    ? `${scope} 멤버 ${visibleCount}명을 보고 있습니다.`
    : `${scope} 조건에 해당하는 멤버가 없습니다.`;
}

const GENERATION_HASH_PREFIX = "#generation-";

/** Reads the selected generation from a `#generation-<name>` hash, else ALL. */
export function generationFromHash(hash: string, generations: string[]): string {
  if (!hash.startsWith(GENERATION_HASH_PREFIX)) {
    return ALL;
  }
  let name = hash.slice(GENERATION_HASH_PREFIX.length);
  try {
    name = decodeURIComponent(name);
  } catch {
    // Keep the raw value when it isn't valid percent-encoding.
  }
  return generations.includes(name) ? name : ALL;
}

export function hashForGeneration(generation: string): string {
  return generation === ALL
    ? "#members"
    : `${GENERATION_HASH_PREFIX}${encodeURIComponent(generation)}`;
}
