import type { ReactNode } from "react";

/** Dashed placeholder shown when a list has nothing to display (legacy .project-empty). */
export function EmptyNotice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-card border border-dashed border-line p-9 text-center text-muted">
      {children}
    </p>
  );
}
