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

export const mapProject = (row: Tables<"projects">, period: string): Project => ({
  id: row.id,
  seasonId: row.season_id,
  period,
  title: row.title,
  summary: row.summary,
  markdown: row.markdown,
  githubUrl: row.github_url,
  presentationPath: row.presentation_path,
  presentationName: row.presentation_name,
  imagePaths: row.image_paths,
});

export const mapNews = (row: Tables<"news">): NewsItem => ({
  id: row.id,
  date: row.published_on,
  title: row.title,
  summary: row.summary,
  linkUrl: row.link_url,
  linkLabel: row.link_label,
});

type PublicProfileLinks = Pick<
  Tables<"member_profiles">,
  "is_public" | "contact_email" | "github_url" | "instagram_url" | "linkedin_url" | "website_url"
>;

/**
 * `member_profiles` is present only when the query joined it. Visitors can
 * read public profiles only, so their links take the place of the roster's.
 */
export const mapMember = (
  row: Tables<"members"> & { member_profiles?: PublicProfileLinks | null },
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
    position: row.position,
    summary: row.summary,
    email: profile?.contact_email ?? row.email,
    githubUrl: profile?.github_url ?? row.github_url,
    instagramUrl: profile?.instagram_url ?? null,
    linkedinUrl: profile?.linkedin_url ?? row.linkedin_url,
    websiteUrl: profile?.website_url ?? row.website_url,
    photoPath: row.photo_path,
    hasPublicProfile: Boolean(profile),
  };
};
