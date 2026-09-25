import type { ReactNode } from "react";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="mb-3.5 text-[0.86rem] font-extrabold text-brand">{children}</p>;
}
