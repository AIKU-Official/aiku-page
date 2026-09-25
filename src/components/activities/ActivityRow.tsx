import type { ReactNode } from "react";

type ActivityRowProps = {
  /** Anchor id, linked from the curriculum page (e.g. `activity-seminar`). */
  id: string;
  label: string;
  title: string;
  children: ReactNode;
};

export function ActivityRow({ id, label, title, children }: ActivityRowProps) {
  return (
    <article
      id={id}
      className="grid reveal scroll-mt-[calc(var(--header-height)+24px)] grid-cols-[200px_minmax(0,1fr)] items-start gap-8 py-8 max-lg:grid-cols-1 max-lg:gap-3 max-sm:gap-2.5 max-sm:py-5"
    >
      <span className="inline-flex h-9 w-fit items-center rounded-full bg-green-50 px-4 text-label text-green-800 ring-1 ring-green-500/25 ring-inset max-sm:h-7 max-sm:px-3">
        {label}
      </span>
      <div>
        <h3 className="text-[1.25rem]">{title}</h3>
        <p className="mt-2 max-w-[720px] text-muted max-sm:mt-1.5">{children}</p>
      </div>
    </article>
  );
}

export function ActivityList({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-line border-y border-line">{children}</div>;
}
