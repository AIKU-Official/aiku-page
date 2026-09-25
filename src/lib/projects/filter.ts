import type { Project, Season } from "@/lib/types";

export const ALL_PROJECTS = "all";

/** Seasons shown as filter buttons: those with at least one project, in admin order. */
export function getProjectSeasonList(
  seasons: Season[],
  projects: Pick<Project, "seasonId">[],
): string[] {
  const withProjects = new Set(projects.map((project) => project.seasonId));
  return seasons.filter((season) => withProjects.has(season.id)).map((season) => season.name);
}

const PERIOD_HASH_PREFIX = "#period-";

/** Reads the selected season from a `#period-<season>` hash, else "all". */
export function filterFromHash(hash: string, seasons: string[]): string {
  if (!hash.startsWith(PERIOD_HASH_PREFIX)) {
    return ALL_PROJECTS;
  }

  let season = hash.slice(PERIOD_HASH_PREFIX.length);
  try {
    season = decodeURIComponent(season);
  } catch {
    // Keep the raw value when it isn't valid percent-encoding.
  }
  return seasons.includes(season) ? season : ALL_PROJECTS;
}

export function hashForFilter(filter: string): string {
  return filter === ALL_PROJECTS
    ? "#projects"
    : `${PERIOD_HASH_PREFIX}${encodeURIComponent(filter)}`;
}

export function filterStatusText(filter: string, visibleCount: number, totalCount: number): string {
  if (!totalCount) {
    return "아직 공개된 프로젝트가 없습니다.";
  }
  return filter === ALL_PROJECTS
    ? `전체 프로젝트 ${visibleCount}개를 보고 있습니다.`
    : `${filter} 프로젝트 ${visibleCount}개를 보고 있습니다.`;
}

export function emptyFilterText(filter: string): string {
  return filter === ALL_PROJECTS
    ? "아직 공개된 프로젝트가 없습니다."
    : `${filter} 분기에 공개된 프로젝트가 아직 없습니다.`;
}
