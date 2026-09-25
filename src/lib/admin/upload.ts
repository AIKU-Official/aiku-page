import { discardUploads, requestUploadUrls } from "@/actions/uploads";
import {
  fileExtension,
  IMAGE_EXTENSIONS,
  MAX_IMAGE_BYTES,
  MAX_PRESENTATION_BYTES,
  PRESENTATION_EXTENSIONS,
  type UploadScope,
} from "@/lib/storage/keys";
import { UPLOAD_BUCKET } from "@/lib/storage/public-url";
import { getBrowserClient } from "@/lib/supabase/browser-client";

export type PendingFile = { file: File; kind: "image" | "presentation" };

/** Non-empty files picked in a file input. */
export function pickedFiles(formData: FormData, name: string): File[] {
  return formData
    .getAll(name)
    .filter((value): value is File => value instanceof File && value.size > 0);
}

/** Same checks as the server, run first so the admin gets instant feedback. */
function checkFile({ file, kind }: PendingFile): string | null {
  const extension = fileExtension(file.name);
  const allowed: readonly string[] =
    kind === "presentation" ? PRESENTATION_EXTENSIONS : IMAGE_EXTENSIONS;
  if (!allowed.includes(extension)) {
    return `지원하지 않는 파일 형식입니다: ${extension || file.name}`;
  }
  const maxBytes = kind === "presentation" ? MAX_PRESENTATION_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    return `${file.name} 파일이 너무 큽니다. (최대 ${Math.round(maxBytes / 1024 / 1024)}MB)`;
  }
  return null;
}

/**
 * Uploads files straight from the browser to Supabase Storage using signed
 * upload URLs and returns their object keys in the same order. On failure the
 * files uploaded so far are removed again and an Error with a Korean message
 * is thrown.
 */
export async function uploadFiles(
  scope: UploadScope,
  entityId: string,
  files: PendingFile[],
  onProgress: (done: number, total: number) => void,
): Promise<string[]> {
  if (!files.length) {
    return [];
  }

  const invalid = files.map(checkFile).find(Boolean);
  if (invalid) {
    throw new Error(invalid);
  }

  const request = await requestUploadUrls({
    scope,
    entityId,
    files: files.map(({ file, kind }) => ({ name: file.name, size: file.size, kind })),
  });
  if (!request.ok) {
    throw new Error(request.message);
  }

  const storage = getBrowserClient().storage.from(UPLOAD_BUCKET);
  const uploaded: string[] = [];
  try {
    onProgress(0, files.length);
    for (const [index, upload] of request.data.entries()) {
      const { file } = files[index];
      const { error } = await storage.uploadToSignedUrl(upload.path, upload.token, file, {
        contentType: upload.contentType,
      });
      if (error) {
        throw new Error(`${file.name} 파일을 업로드하지 못했습니다. (${error.message})`);
      }
      uploaded.push(upload.path);
      onProgress(index + 1, files.length);
    }
  } catch (error) {
    await cleanUpUploads(scope, entityId, uploaded);
    throw error;
  }

  return uploaded;
}

export async function cleanUpUploads(scope: UploadScope, entityId: string, paths: string[]) {
  if (paths.length) {
    await discardUploads({ scope, entityId, paths });
  }
}
