import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps } from "react";

export type ButtonVariant = "primary" | "light" | "dark" | "secondary";
export type ButtonSize = "md" | "sm";

// Each variant sets exactly one border color so no two utilities compete.
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-green-500 bg-green-500 text-aiku-black hover:border-green-600 hover:bg-green-600",
  light: "border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20",
  dark: "border-ink bg-ink text-white hover:border-ink-hover hover:bg-ink-hover",
  secondary: "border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-soft",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "min-h-12 px-5 text-[0.9375rem] max-sm:min-h-11 max-sm:px-4",
  sm: "min-h-10 px-4 text-small",
};

type StyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to full width on phones. */
  fullWidthOnMobile?: boolean;
};

export const buttonClassName = ({
  variant = "dark",
  size = "md",
  fullWidthOnMobile = true,
}: StyleProps = {}) =>
  clsx(
    "inline-flex items-center justify-center gap-2 rounded-control border font-semibold tracking-[-0.01em] whitespace-nowrap transition-[background-color,border-color,color,scale] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    fullWidthOnMobile && "max-sm:w-full",
  );

type ButtonLinkProps = Omit<ComponentProps<"a">, "href"> &
  StyleProps & {
    href: string;
  };

export function ButtonLink({
  href,
  variant,
  size,
  fullWidthOnMobile,
  className,
  ...props
}: ButtonLinkProps) {
  const classes = clsx(buttonClassName({ variant, size, fullWidthOnMobile }), className);

  if (/^(https?:|mailto:)/.test(href)) {
    return <a href={href} target="_blank" rel="noreferrer" className={classes} {...props} />;
  }

  return <Link href={href} className={classes} {...props} />;
}

type ButtonProps = ComponentProps<"button"> & StyleProps;

export function Button({
  variant,
  size,
  fullWidthOnMobile,
  className,
  type,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={clsx(buttonClassName({ variant, size, fullWidthOnMobile }), className)}
      {...props}
    />
  );
}
