import type { ReactNode } from "react";

import { DownloadIcon, GitHubIcon } from "@/components/ui/icons";
import { storageDownloadUrl } from "@/lib/storage/public-url";
import type { Project } from "@/lib/types";

// On phones the two links shrink to round icons in the card's top corner.
const resourceClassName =
  "inline-flex min-h-10 items-center gap-2 rounded-control border border-line bg-surface px-4 text-small font-semibold whitespace-nowrap text-ink transition-colors hover:border-line-strong hover:bg-surface-soft max-sm:size-9 max-sm:min-h-0 max-sm:justify-center max-sm:rounded-full max-sm:px-0";

function Resource({
  href,
  icon,
  label,
  emptyLabel,
  newTab,
}: {
  href: string | null;
  icon: ReactNode;
  label: string;
  emptyLabel: string;
  newTab?: boolean;
}) {
  if (!href) {
    return (
      <span
        aria-disabled="true"
        className="inline-flex min-h-10 cursor-not-allowed items-center gap-2 rounded-control border border-dashed border-line-strong px-4 text-small font-semibold whitespace-nowrap text-muted max-sm:hidden"
      >
        {icon}
        {emptyLabel}
      </span>
    );
  }

  return (
    <a
      href={href}
      {...(newTab ? { target: "_blank", rel: "noreferrer" } : {})}
      aria-label={label}
      title={label}
      className={resourceClassName}
    >
      {icon}
      <span className="max-sm:hidden">{label}</span>
    </a>
  );
}

export function ProjectResources({ project }: { project: Project }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={`${project.title} 자료`}>
      <Resource
        href={
          project.presentationPath
            ? storageDownloadUrl(project.presentationPath, project.presentationName)
            : null
        }
        icon={<DownloadIcon className="size-4" />}
        label="발표자료 PDF"
        emptyLabel="발표자료 없음"
      />
      <Resource
        href={project.githubUrl}
        icon={<GitHubIcon className="size-4" />}
        label="GitHub"
        emptyLabel="GitHub 없음"
        newTab
      />
    </div>
  );
}
