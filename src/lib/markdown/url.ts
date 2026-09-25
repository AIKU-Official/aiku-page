import { defaultUrlTransform } from "react-markdown";

import { storagePublicUrl } from "@/lib/storage/public-url";

/** Paths of objects uploaded through the admin (Storage keys). */
const storagePathPattern = /^(projects|gallery|members)\//;

export const isExternalUrl = (url: string) =>
  /^(https?:)?\/\//.test(url) || url.startsWith("mailto:");

/**
 * Resolves Storage paths used in project markdown to public URLs, then applies
 * react-markdown's default sanitization (drops javascript:, data:, … URLs).
 */
export function markdownUrlTransform(url: string): string {
  const resolved = storagePathPattern.test(url) ? storagePublicUrl(url) : url;
  return defaultUrlTransform(resolved);
}
