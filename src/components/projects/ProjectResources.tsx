import clsx from "clsx";

import { storageDownloadUrl } from "@/lib/storage/public-url";
import type { Project } from "@/lib/types";

const resourceClassName =
  "inline-flex min-h-[42px] items-center gap-2 rounded-control border border-line bg-surface px-3 text-body transition-[border-color,background-color,color]";

function Resource({
  type,
  href,
  label,
  emptyLabel,
  newTab,
}: {
  type: string;
  href: string | null;
  label: string;
  emptyLabel: string;
  newTab?: boolean;
}) {
  const content = (
    <>
      <span className="text-[0.78rem] font-[850] text-brand">{type}</span>
      <strong className="text-[0.96rem] wrap-anywhere text-ink">{href ? label : emptyLabel}</strong>
    </>
  );

  if (!href) {
    return (
      <span className={clsx(resourceClassName, "cursor-default opacity-58")} aria-disabled="true">
        {content}
      </span>
    );
  }

  return (
    <a
      href={href}
      {...(newTab ? { target: "_blank", rel: "noreferrer" } : {})}
      className={clsx(
        resourceClassName,
        "hover:border-aiku-green hover:bg-surface-mint hover:text-brand-deep focus-visible:border-aiku-green focus-visible:bg-surface-mint focus-visible:text-brand-deep",
      )}
    >
      {content}
    </a>
  );
}

export function ProjectResources({ project }: { project: Project }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={`${project.title} 자료`}>
      <Resource
        type="Presentation"
        href={
          project.presentationPath
            ? storageDownloadUrl(project.presentationPath, project.presentationName)
            : null
        }
        label="PPT 다운로드"
        emptyLabel="PPT 없음"
      />
      <Resource
        type="GitHub"
        href={project.githubUrl}
        label="GitHub 바로가기"
        emptyLabel="GitHub 없음"
        newTab
      />
    </div>
  );
}
