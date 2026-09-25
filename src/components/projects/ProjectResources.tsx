import type { ReactNode } from "react";

import { buttonClassName } from "@/components/ui/Button";
import { DownloadIcon, GitHubIcon } from "@/components/ui/icons";
import { storageDownloadUrl } from "@/lib/storage/public-url";
import type { Project } from "@/lib/types";

const resourceClassName = buttonClassName({
  variant: "secondary",
  size: "sm",
  fullWidthOnMobile: false,
});

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
        className="inline-flex min-h-10 cursor-not-allowed items-center gap-2 rounded-control border border-dashed border-line-strong px-4 text-small font-semibold whitespace-nowrap text-muted"
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
      className={resourceClassName}
    >
      {icon}
      {label}
    </a>
  );
}

export function ProjectResources({ project }: { project: Project }) {
  return (
    <div
      className="flex flex-wrap gap-2 max-sm:grid max-sm:grid-cols-2"
      role="group"
      aria-label={`${project.title} 자료`}
    >
      <Resource
        href={
          project.presentationPath
            ? storageDownloadUrl(project.presentationPath, project.presentationName)
            : null
        }
        icon={<DownloadIcon className="size-4" />}
        label="PPT 다운로드"
        emptyLabel="PPT 없음"
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
