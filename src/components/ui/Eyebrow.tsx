import clsx from "clsx";
import type { ReactNode } from "react";

const spacingClasses = { tight: "mb-2", default: "mb-3", loose: "mb-5" } as const;

type EyebrowProps = {
  children: ReactNode;
  /** "inverse" for dark backgrounds. */
  tone?: "default" | "inverse";
  /** Space below the eyebrow. */
  spacing?: keyof typeof spacingClasses;
};

/** Small uppercase label above a heading. */
export function Eyebrow({ children, tone = "default", spacing = "default" }: EyebrowProps) {
  return (
    <p
      className={clsx(
        "text-eyebrow uppercase",
        spacingClasses[spacing],
        tone === "inverse" ? "text-green-500" : "text-green-700",
      )}
    >
      {children}
    </p>
  );
}
