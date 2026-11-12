import { formatPositions, type PositionRow } from "@/lib/members/positions";
import type { Tables } from "@/lib/supabase/database.types";
import {
  MEMBER_GRADES,
  type Aikuthon,
  type Member,
  type MemberGrade,
  type NewsItem,
  type Project,
  type ProjectPersonMember,
  type Season,
} from "@/lib/types";
import { type Rank, isRank, toRank } from "@/lib/ranks";

export const mapSeason = (row: Pick<Tables<"seasons">, "id" | "name">): Season => ({
  id: row.id,
  name: row.name,
});

/** A roster member joined to a project participant or an award winner. */
type PersonMemberRow = Pick<Tables<"members">, "id" | "name" | "department" | "grade"> & {
  generations: { name: string };
  member_positions: PositionRow[];
  member_profiles: Pick<Tables<"member_profiles">, "is_public" | "avatar_path"> | null;
};

type ProjectPersonRow = Pick<Tables<"project_members">, "name" | "role" | "sort_order"> & {
  members: PersonMemberRow | null;
};

/** What a name card needs, from the joined member; null when the name is not on the roster. */
export function mapPersonMember(member: PersonMemberRow | null): ProjectPersonMember | null {
  if (!member) return null;
  // Visitors can read public profiles only, so a private one arrives as null.
  const profile = member.member_profiles?.is_public ? member.member_profiles : null;
  return {
    id: member.id,
    name: member.name,
    generation: member.generations.name,
    department: member.department,
    grade: toGrade(member.grade),
    position: formatPositions(member.member_positions),
    avatarPath: profile?.avatar_path ?? null,
    hasPublicProfile: Boolean(profile),
  };
}

const toGrade = (value: string): MemberGrade =>
  MEMBER_GRADES.includes(value as MemberGrade) ? (value as MemberGrade) : "ob";

type TagLinkRow = { sort_order: number; tags: { name: string } | null };

/** Tag names of a project or event, in their stored order. */
const tagNames = (links: TagLinkRow[] = []): string[] =>
  [...links]
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((link) => (link.tags ? [link.tags.name] : []));

/** `project_members` and `project_tags` are present only when the query joined them. */
export const mapProject = (
  row: Tables<"projects"> & { project_members?: ProjectPersonRow[]; project_tags?: TagLinkRow[] },
  period: string,
): Project => ({
  id: row.id,
  seasonId: row.season_id,
  period,
  title: row.title,
  tags: tagNames(row.project_tags),
  markdown: row.markdown,
  githubUrl: row.github_url,
  presentationPath: row.presentation_path,
  presentationName: row.presentation_name,
  imagePaths: row.image_paths,
  oneLine: row.one_line,
  awardRank: toRank(row.award_rank),
  people: [...(row.project_members ?? [])]
    .sort(
      (a, b) =>
        Number(b.role === "leader") - Number(a.role === "leader") || a.sort_order - b.sort_order,
    )
    .map((person) => ({
      name: person.members?.name ?? person.name,
      role: person.role === "leader" ? "leader" : "member",
      member: mapPersonMember(person.members),
    })),
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

type AikuthonRow = Tables<"aikuthons"> & {
  aikuthon_tags: TagLinkRow[];
  aikuthon_partners: Pick<Tables<"aikuthon_partners">, "name" | "role" | "sort_order">[];
  aikuthon_tracks: Pick<Tables<"aikuthon_tracks">, "name" | "sort_order">[];
  aikuthon_awards: (Pick<Tables<"aikuthon_awards">, "rank" | "team_name"> & {
    aikuthon_award_members: (Pick<Tables<"aikuthon_award_members">, "name" | "sort_order"> & {
      members: PersonMemberRow | null;
    })[];
  })[];
};

export const mapAikuthon = (row: AikuthonRow): Aikuthon => ({
  id: row.id,
  edition: row.edition,
  kind: row.kind === "joint" ? "joint" : "edition",
  format: row.format === "hackathon" ? "hackathon" : "datathon",
  name: row.name,
  startsOn: row.starts_on,
  datePrecision: row.date_precision === "month" ? "month" : "day",
  endsOn: row.ends_on,
  venue: row.venue,
  mode: row.mode === "online" ? "online" : "offline",
  overnight: row.overnight,
  teamSize:
    row.team_size_min === null
      ? null
      : { min: row.team_size_min, max: row.team_size_max ?? row.team_size_min },
  platform: row.platform,
  partners: [...row.aikuthon_partners]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((partner) => ({
      name: partner.name,
      role: partner.role === "sponsor" ? "sponsor" : "co_host",
    })),
  tracks: [...row.aikuthon_tracks].sort((a, b) => a.sort_order - b.sort_order).map((track) => track.name),
  taskTitle: row.task_title,
  taskDescription: row.task_description,
  metric: row.metric,
  tags: tagNames(row.aikuthon_tags),
  competitionUrl: row.competition_url,
  awards: [...row.aikuthon_awards]
    .filter((award) => isRank(award.rank))
    .sort((a, b) => a.rank - b.rank)
    .map((award) => ({
      rank: award.rank as Rank,
      teamName: award.team_name,
      people: [...award.aikuthon_award_members]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((person) => ({
          name: person.members?.name ?? person.name,
          role: "member" as const,
          member: mapPersonMember(person.members),
        })),
    })),
});
