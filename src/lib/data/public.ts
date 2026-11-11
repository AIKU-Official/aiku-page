import "server-only";

import { POSITION_SELECT } from "@/lib/members/positions";
import { createPublicClient } from "@/lib/supabase/public-client";
import type { Generation, NewsItem, Project, Season } from "@/lib/types";

import { mapMember, mapNews, mapProject, mapSeason } from "./mappers";

// Loaders for the public pages. They throw on failure: at build time that
// fails the deploy, and during ISR revalidation Next.js keeps serving the last
// good page instead of an empty one.

const fail = (what: string, message: string): never => {
  throw new Error(`${what}을(를) 불러오지 못했습니다: ${message}`);
};

export async function getNews(): Promise<NewsItem[]> {
  const { data, error } = await createPublicClient()
    .from("news")
    .select("*")
    .order("sort_order")
    .order("created_at", { ascending: false });

  if (error) fail("소식", error.message);
  return (data ?? []).map(mapNews);
}

export type ProjectArchive = {
  seasons: Season[];
  /** Ordered by season, then by the admin-defined order within each season. */
  projects: Project[];
};

const PROJECT_SELECT =
  `*, seasons(name), project_members(name, role, sort_order, members(id, name, department, grade, generations(name), member_profiles(is_public, avatar_path), ${POSITION_SELECT}))` as const;

/** One project with its season name, or null when there is none with this id. */
export async function getProject(id: string): Promise<Project | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await createPublicClient()
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("프로젝트", error.message);
  return data ? mapProject(data, data.seasons?.name ?? "") : null;
}

export async function getProjectArchive(): Promise<ProjectArchive> {
  const supabase = createPublicClient();
  const [seasonResult, projectResult] = await Promise.all([
    supabase.from("seasons").select("id, name").order("sort_order").order("created_at"),
    supabase
      .from("projects")
      .select(PROJECT_SELECT)
      .order("sort_order")
      .order("created_at", { ascending: false }),
  ]);

  if (seasonResult.error) fail("시즌", seasonResult.error.message);
  if (projectResult.error) fail("프로젝트", projectResult.error.message);

  const seasons = (seasonResult.data ?? []).map(mapSeason);
  const seasonRank = new Map(seasons.map((season, index) => [season.id, index]));
  const seasonName = new Map(seasons.map((season) => [season.id, season.name]));

  const projects = (projectResult.data ?? [])
    .map((row) => mapProject(row, seasonName.get(row.season_id) ?? ""))
    // By season; within one, prize winners first in rank order, then the admin order.
    .sort(
      (a, b) =>
        (seasonRank.get(a.seasonId) ?? 0) - (seasonRank.get(b.seasonId) ?? 0) ||
        (a.awardRank ?? 9) - (b.awardRank ?? 9),
    );

  return { seasons, projects };
}

export async function getGenerations(): Promise<Generation[]> {
  const { data, error } = await createPublicClient()
    .from("generations")
    .select(
      `id, name, members(*, member_profiles(is_public, avatar_path), ${POSITION_SELECT})`,
    )
    .order("sort_order")
    .order("created_at")
    .order("sort_order", { referencedTable: "members" })
    .order("created_at", { referencedTable: "members" });

  if (error) fail("멤버", error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    members: row.members.map(mapMember),
  }));
}
