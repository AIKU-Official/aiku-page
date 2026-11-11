"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { startTrail } from "@/lib/navigation/trail";

/** A link of the site's own navigation: the page it opens starts a new trail of pages. */
export function SiteNavLink({ onClick, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        startTrail(typeof props.href === "string" ? props.href : (props.href.pathname ?? "/"));
        onClick?.(event);
      }}
    />
  );
}
