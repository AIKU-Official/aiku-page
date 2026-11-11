"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";

import { previousStep, subscribeTrail } from "@/lib/navigation/trail";

const className =
  "inline-flex max-w-full cursor-pointer items-center gap-1 text-small font-semibold text-muted transition-colors hover:text-ink";

/**
 * "← <previous page>": goes back to the page this one was opened from, step
 * by step, whatever the path was. Without a previous page (opened from a
 * shared link, or reached from the site's navigation) it leads to
 * `fallback`, or shows nothing for pages that have no parent.
 */
export function BackLink({
  fallback,
  className: extra,
}: {
  fallback?: { href: string; label: string };
  /** Spacing around the link; nothing is rendered when there is no link. */
  className?: string;
}) {
  const router = useRouter();
  const previous = useSyncExternalStore(
    subscribeTrail,
    () => previousStep(),
    () => null,
  );

  if (previous) {
    return (
      <button type="button" onClick={() => router.back()} className={clsx(className, extra)}>
        <span aria-hidden="true">←</span>
        <span className="truncate">{previous.title || "이전 페이지"}</span>
      </button>
    );
  }
  if (!fallback) return null;
  return (
    <Link href={fallback.href} className={clsx(className, extra)}>
      <span aria-hidden="true">←</span>
      <span className="truncate">{fallback.label}</span>
    </Link>
  );
}
