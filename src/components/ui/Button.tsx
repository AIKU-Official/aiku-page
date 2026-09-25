import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps } from "react";

export type ButtonVariant = "primary" | "light" | "dark" | "secondary";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-aiku-mint text-on-mint",
  light: "border-white/32 bg-white/12 text-white",
  dark: "bg-ink text-white",
  secondary: "border-line bg-surface text-ink",
};

type StyleProps = {
  variant?: ButtonVariant;
  /** Stretch to full width at the smallest breakpoint (legacy default). */
  fullWidthOnMobile?: boolean;
};

export const buttonClassName = ({ variant = "dark", fullWidthOnMobile = true }: StyleProps = {}) =>
  clsx(
    "inline-flex min-h-11 items-center justify-center rounded-control border border-transparent px-4 text-[0.96rem] font-extrabold transition-[translate,background-color,border-color] hover:-translate-y-px focus-visible:-translate-y-px disabled:pointer-events-none disabled:opacity-60",
    variantClasses[variant],
    fullWidthOnMobile && "max-sm:w-full",
  );

type ButtonLinkProps = Omit<ComponentProps<"a">, "href"> &
  StyleProps & {
    href: string;
  };

export function ButtonLink({
  href,
  variant,
  fullWidthOnMobile,
  className,
  ...props
}: ButtonLinkProps) {
  const classes = clsx(buttonClassName({ variant, fullWidthOnMobile }), className);

  if (/^(https?:|mailto:)/.test(href)) {
    return <a href={href} target="_blank" rel="noreferrer" className={classes} {...props} />;
  }

  return <Link href={href} className={classes} {...props} />;
}

type ButtonProps = ComponentProps<"button"> & StyleProps;

export function Button({ variant, fullWidthOnMobile, className, type, ...props }: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={clsx(buttonClassName({ variant, fullWidthOnMobile }), className)}
      {...props}
    />
  );
}
