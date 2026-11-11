"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { nameCurrentStep, visit } from "@/lib/navigation/trail";

/** Keeps the tab's trail of visited pages in step with navigation. */
export function TrailRecorder() {
  const pathname = usePathname();

  useEffect(() => {
    visit(pathname);
    // The title is set during the same render cycle; read it once it is in place.
    const timer = window.setTimeout(() => nameCurrentStep(pathname), 300);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
