import type { ReactNode } from "react";

/** Placeholder shown when a list has nothing to display. */
export function EmptyNotice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-card border border-dashed border-line-strong bg-surface px-6 py-12 text-center text-muted">
      {children}
    </p>
  );
}
