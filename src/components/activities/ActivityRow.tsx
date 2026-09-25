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
      className="grid scroll-mt-[calc(var(--header-height)+18px)] grid-cols-[190px_minmax(0,1fr)] items-start gap-6 border-b border-soft-line py-6 first:border-t max-sm:grid-cols-1 max-sm:gap-2 max-sm:py-5"
    >
      <span className="inline-flex min-h-[46px] w-full items-center justify-center rounded-control border border-aiku-green/24 bg-surface-mint px-3 py-2 text-center text-[1.02rem] leading-[1.2] font-black text-brand-deep">
        {label}
      </span>
      <div>
        <h2 className="mb-2 text-[1.45rem]">{title}</h2>
        <p className="text-muted">{children}</p>
      </div>
    </article>
  );
}

export function ActivityList({ children }: { children: ReactNode }) {
  return <div className="grid gap-3">{children}</div>;
}
