import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Section } from "@/components/layout/Section";
import { Markdown } from "@/components/markdown/Markdown";
import { ProjectFace } from "@/components/projects/ProjectEntry";
import { ProjectResources } from "@/components/projects/ProjectResources";
import { getProject } from "@/lib/data/public";
import { composeProjectMarkdown } from "@/lib/markdown/compose";

// Refreshed on demand after admin edits; hourly as a safety net.
export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps<"/projects/[id]">): Promise<Metadata> {
  const project = await getProject((await params).id);
  return project
    ? { title: project.title, description: project.oneLine || "AIKU 프로젝트입니다." }
    : { title: "프로젝트" };
}

/** A project on its own page: where phones open a card, and the panel's expand control leads. */
export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const project = await getProject((await params).id);
  if (!project) notFound();

  return (
    <Section className="pt-8 max-lg:pt-8 max-sm:pt-5">
      <div className="site-container">
        <Link
          href={`/projects#project-${project.id}`}
          className="inline-flex items-center gap-1 text-small font-semibold text-muted transition-colors hover:text-ink"
        >
          <span aria-hidden="true">←</span> 프로젝트 목록
        </Link>
        <article className="relative mt-5 max-sm:mt-4">
          <ProjectFace
            period={project.period}
            title={project.title}
            tags={project.tags}
            oneLine={project.oneLine}
            awardRank={project.awardRank}
            people={project.people}
            resources={<ProjectResources project={project} />}
          />
          <div className="peek-body mt-7 border-t border-soft-line max-sm:mt-5 [&_.markdown-body]:max-w-none">
            <Markdown>{composeProjectMarkdown(project)}</Markdown>
          </div>
        </article>
      </div>
    </Section>
  );
}
