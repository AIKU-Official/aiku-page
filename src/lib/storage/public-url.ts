import { publicEnv } from "@/lib/env.public";

export const UPLOAD_BUCKET = "aiku-uploads";

const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");

/** Public URL of an object in the uploads bucket. */
export function storagePublicUrl(path: string): string {
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/${UPLOAD_BUCKET}/${encodePath(path)}`;
}

/**
 * URL that makes the browser save the file as `fileName` (Supabase sets
 * Content-Disposition). Cross-origin links ignore the HTML `download`
 * attribute, so this is how the original Korean file name is preserved.
 */
export function storageDownloadUrl(path: string, fileName?: string | null): string {
  const url = storagePublicUrl(path);
  return `${url}?download=${encodeURIComponent(fileName || path.split("/").pop() || "")}`;
}
