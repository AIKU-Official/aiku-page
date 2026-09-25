import type { ReactNode } from "react";

import { SectionHead } from "@/components/layout/Section";

/** One management area of the admin page (legacy .admin-panel). */
export function AdminPanel({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="grid gap-[22px] border-b border-soft-line pb-14 last:border-b-0 last:pb-0"
    >
      <SectionHead eyebrow={eyebrow} title={title} titleId={id} />
      {children}
    </section>
  );
}
