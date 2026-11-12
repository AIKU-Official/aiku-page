import clsx from "clsx";
import type { ReactNode } from "react";

/** An error from the server, said plainly in a red box. The one look for errors. */
export function ErrorNotice({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      role="alert"
      className={clsx("rounded-control bg-danger-soft px-4 py-3 text-small text-danger", className)}
    >
      {children}
    </p>
  );
}
