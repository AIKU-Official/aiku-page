"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";

import { previousStep, subscribeTrail } from "@/lib/navigation/trail";

const className =
  "inline-flex max-w-full cursor-pointer items-center gap-1 text-small font-semibold text-muted transition-colors hover:text-ink";

/**
 * "← <previous page>": goes back to the page this one was opened from, step
 * by step, whatever the path was. Without a previous page in this tab (a
 * shared link, a reload of the first page) it leads to `fallback`.
 */
export function BackLink({ fallback }: { fallback: { href: string; label: string } }) {
  const router = useRouter();
  const previous = useSyncExternalStore(
    subscribeTrail,
    () => previousStep(),
    () => null,
  );

  if (previous) {
    return (
      <button type="button" onClick={() => router.back()} className={className}>
        <span aria-hidden="true">←</span>
        <span className="truncate">{previous.title || "이전 페이지"}</span>
      </button>
    );
  }
  return (
    <Link href={fallback.href} className={className}>
      <span aria-hidden="true">←</span>
      <span className="truncate">{fallback.label}</span>
    </Link>
  );
}
