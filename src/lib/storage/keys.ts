// Storage object naming and file-type rules shared by admin uploads and the
// maintenance scripts. Must stay free of server-only imports.

export const IMAGE_EXTENSIONS = [".gif", ".jpeg", ".jpg", ".png", ".webp"] as const;
export const PRESENTATION_EXTENSIONS = [".pdf", ".ppt", ".pptx"] as const;

export const CONTENT_TYPES: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_PRESENTATION_BYTES = 50 * 1024 * 1024;

/** Top-level folders of the bucket, one per kind of content with uploads. */
export const UPLOAD_SCOPES = ["projects", "members"] as const;

export type UploadScope = (typeof UPLOAD_SCOPES)[number];

/** Lower-cased extension including the dot (".pptx"), or "" when absent. */
export function fileExtension(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot).toLowerCase() : "";
}

/**
 * ASCII-only version of a file name without its extension (Supabase Storage
 * rejects non-ASCII keys). Port of the legacy sanitize_filename.
 */
export function asciiBaseName(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const extension = fileExtension(base);
  const stem = extension ? base.slice(0, -extension.length) : base;
  return (
    stem
      .replace(/[^A-Za-z0-9_.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "file"
  );
}

/** `projects/<id>/<timestamp>-<random>-<ascii-name>.<ext>` */
export function createObjectKey(
  scope: UploadScope,
  entityId: string,
  fileName: string,
  random: string = Math.random().toString(16).slice(2, 8),
  now: number = Date.now(),
): string {
  return `${scope}/${entityId}/${now}-${random}-${asciiBaseName(fileName)}${fileExtension(fileName)}`;
}

/** True when `path` is an object key inside the folder of the given entity. */
export function isObjectKeyOf(path: string, scope: UploadScope, entityId: string): boolean {
  const prefix = `${scope}/${entityId}/`;
  return path.startsWith(prefix) && /^[A-Za-z0-9._-]+$/.test(path.slice(prefix.length));
}
