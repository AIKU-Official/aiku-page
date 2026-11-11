import { formatPositions, type PositionRow } from "@/lib/members/positions";
import type { Tables } from "@/lib/supabase/database.types";
import {
  MEMBER_GRADES,
  type Member,
  type MemberGrade,
  type NewsItem,
  type Project,
  type Season,
} from "@/lib/types";

export const mapSeason = (row: Pick<Tables<"seasons">, "id" | "name">): Season => ({
  id: row.id,
  name: row.name,
});

type ProjectPersonRow = Pick<Tables<"project_members">, "name" | "role" | "sort_order"> & {
  members:
    | (Pick<Tables<"members">, "id" | "name" | "department" | "grade"> & {
        generations: { name: string };
        member_positions: PositionRow[];
        member_profiles: Pick<Tables<"member_profiles">, "is_public" | "avatar_path"> | null;
      })
    | null;
};

const toGrade = (value: string): MemberGrade =>
  MEMBER_GRADES.includes(value as MemberGrade) ? (value as MemberGrade) : "ob";

/** `project_members` is present only when the query joined it. */
export const mapProject = (
  row: Tables<"projects"> & { project_members?: ProjectPersonRow[] },
  period: string,
): Project => ({
  id: row.id,
  seasonId: row.season_id,
  period,
  title: row.title,
  tags: row.tags,
  markdown: row.markdown,
  githubUrl: row.github_url,
  presentationPath: row.presentation_path,
  presentationName: row.presentation_name,
  imagePaths: row.image_paths,
  oneLine: row.one_line,
  awardRank: row.award_rank === 1 || row.award_rank === 2 || row.award_rank === 3 ? row.award_rank : null,
  people: [...(row.project_members ?? [])]
    .sort(
      (a, b) =>
        Number(b.role === "leader") - Number(a.role === "leader") || a.sort_order - b.sort_order,
    )
    .map((person) => {
      const member = person.members;
      // Visitors can read public profiles only, so a private one arrives as null.
      const profile = member?.member_profiles?.is_public ? member.member_profiles : null;
      return {
        name: member?.name ?? person.name,
        role: person.role === "leader" ? "leader" : "member",
        member: member
          ? {
              id: member.id,
              name: member.name,
              generation: member.generations.name,
              department: member.department,
              grade: toGrade(member.grade),
              position: formatPositions(member.member_positions),
              avatarPath: profile?.avatar_path ?? null,
              hasPublicProfile: Boolean(profile),
            }
          : null,
      };
    }),
});

export const mapNews = (row: Tables<"news">): NewsItem => ({
  id: row.id,
  date: row.published_on,
  title: row.title,
  summary: row.summary,
  linkUrl: row.link_url,
  linkLabel: row.link_label,
});

type PublicProfile = Pick<Tables<"member_profiles">, "is_public" | "avatar_path">;

/**
 * `member_profiles` and `member_positions` are present only when the query
 * joined them. Visitors can read public profiles only.
 */
export const mapMember = (
  row: Tables<"members"> & {
    member_profiles?: PublicProfile | null;
    member_positions?: PositionRow[];
  },
): Member => {
  const profile = row.member_profiles?.is_public ? row.member_profiles : null;
  return {
    id: row.id,
    generationId: row.generation_id,
    name: row.name,
    department: row.department,
    // The column has a check constraint; the fallback only guards the type.
    grade: MEMBER_GRADES.includes(row.grade as MemberGrade) ? (row.grade as MemberGrade) : "ob",
    gradePinned: row.grade_pinned,
    position: formatPositions(row.member_positions),
    avatarPath: profile?.avatar_path ?? null,
    hasPublicProfile: Boolean(profile),
  };
};
