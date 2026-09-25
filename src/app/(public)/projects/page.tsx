import type { Metadata } from "next";

import { PageHero } from "@/components/layout/PageHero";
import { Markdown } from "@/components/markdown/Markdown";
import { ProjectArchive, type ArchiveEntry } from "@/components/projects/ProjectArchive";
import { ProjectEntry } from "@/components/projects/ProjectEntry";
import { ProjectResources } from "@/components/projects/ProjectResources";
import { getProjectArchive } from "@/lib/data/public";
import { composeProjectMarkdown } from "@/lib/markdown/compose";
import { getProjectSeasonList } from "@/lib/projects/filter";

export const metadata: Metadata = {
  title: "프로젝트",
  description: "AIKU 분기별 우수 프로젝트를 소개합니다.",
};

// Refreshed on demand after admin edits; hourly as a safety net.
export const revalidate = 3600;

export default async function ProjectsPage() {
  const { seasons, projects } = await getProjectArchive();

  const entries: ArchiveEntry[] = projects.map((project) => ({
    id: project.id,
    period: project.period,
    node: (
      <ProjectEntry
        id={project.id}
        period={project.period}
        title={project.title}
        summary={project.summary}
        resources={<ProjectResources project={project} />}
        body={<Markdown>{composeProjectMarkdown(project)}</Markdown>}
      />
    ),
  }));

  return (
    <>
      <PageHero
        eyebrow="Projects"
        title="분기별 우수 프로젝트"
        lead="AIKU 학회원들이 한 학기 동안 탐구하고 구현한 딥러닝 프로젝트 중 우수한 결과물을 분기별로 소개합니다."
      />
      <ProjectArchive seasons={getProjectSeasonList(seasons, projects)} entries={entries} />
    </>
  );
}
