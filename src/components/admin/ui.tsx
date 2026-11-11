import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

// Form building blocks for the admin screens (legacy .admin-form, .form-field,
// .admin-status styles).

export const adminFormClassName = "card grid gap-5 p-7 max-sm:p-5";

const controlClassName =
  "w-full min-h-11 rounded-control border border-line bg-surface px-3 py-2.5 leading-[1.45] text-ink transition-[border-color,box-shadow] placeholder:text-muted/70 focus:border-green-500 focus:shadow-[0_0_0_3px_rgb(33_208_129/0.14)] focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-soft";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-small font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}

export function TextField({
  label,
  className,
  ...props
}: ComponentProps<"input"> & { label: string }) {
  return (
    <Field label={label}>
      <input
        className={clsx(
          controlClassName,
          props.type === "file" &&
            "p-2 file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-line file:bg-surface-soft file:px-3 file:py-1 file:text-small file:font-semibold file:text-ink",
          className,
        )}
        {...props}
      />
    </Field>
  );
}

export function TextAreaField({
  label,
  className,
  ...props
}: ComponentProps<"textarea"> & { label: string }) {
  return (
    <Field label={label}>
      <textarea
        className={clsx(controlClassName, "min-h-[150px] resize-y", className)}
        {...props}
      />
    </Field>
  );
}

export function SelectField({
  label,
  className,
  ...props
}: ComponentProps<"select"> & { label: string }) {
  return (
    <Field label={label}>
      {/* Safari ignores padding and borders on a native select, so the arrow is drawn here. */}
      <span className="relative block">
        <select
          className={clsx(
            controlClassName,
            "cursor-pointer appearance-none pr-10 invalid:text-muted/70",
            className,
          )}
          {...props}
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </span>
    </Field>
  );
}

/** Checkbox drawn to match the form controls: white with a hairline border, ink when checked. */
export function Checkbox({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  return (
    <span className={clsx("relative inline-flex size-[18px] shrink-0", className)}>
      <input
        type="checkbox"
        className="peer size-full cursor-pointer appearance-none rounded-[5px] border border-line-strong bg-surface transition-[background-color,border-color,box-shadow] checked:border-ink checked:bg-ink hover:border-ink/50 focus-visible:border-green-500 focus-visible:shadow-[0_0_0_3px_rgb(33_208_129/0.14)] focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-surface-soft"
        {...props}
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="pointer-events-none absolute inset-0 m-auto size-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m3.5 8.5 3 3 6-7" />
      </svg>
    </span>
  );
}

/** Two equal columns that collapse to one below 980px (legacy .form-grid). */
export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">{children}</div>;
}

export type StatusTone = "info" | "success" | "error";
export type Status = { tone: StatusTone; message: string } | null;

const toneClassName: Record<StatusTone, string> = {
  info: "border-line bg-surface-soft text-muted",
  success: "border-green-500/30 bg-green-50 text-green-800",
  error: "border-danger/22 bg-danger-soft text-danger",
};

export function StatusMessage({ status, className }: { status: Status; className?: string }) {
  if (!status?.message) {
    return null;
  }
  return (
    <p
      role={status.tone === "error" ? "alert" : "status"}
      className={clsx(
        "rounded-control border px-3.5 py-2.5 text-small",
        toneClassName[status.tone],
        className,
      )}
    >
      {status.message}
    </p>
  );
}

/** Grey note describing files already attached to the item being edited. */
export function FileNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-control border border-line bg-surface-soft px-3.5 py-2.5 text-small text-muted">
      {children}
    </div>
  );
}

export function AdminActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2.5">{children}</div>;
}
