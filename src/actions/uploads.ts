"use server";

import { randomBytes } from "node:crypto";

import { z } from "zod";

import { ActionError, adminAction } from "@/lib/actions/admin-action";
import type { ActionResult } from "@/lib/actions/result";
import {
  CONTENT_TYPES,
  createObjectKey,
  fileExtension,
  IMAGE_EXTENSIONS,
  isObjectKeyOf,
  MAX_IMAGE_BYTES,
  MAX_PRESENTATION_BYTES,
  PRESENTATION_EXTENSIONS,
  UPLOAD_SCOPES,
  type UploadScope,
} from "@/lib/storage/keys";
import { UPLOAD_BUCKET } from "@/lib/storage/public-url";
import { removeObjects } from "@/lib/storage/server";
import { idSchema, uploadRequestSchema } from "@/lib/validators";

export type SignedUpload = { path: string; token: string; contentType: string };

/**
 * Issues one-time signed URLs so the browser can upload straight to Supabase
 * Storage. Files never pass through this server, which keeps large decks
 * clear of the serverless request size limit.
 */
export async function requestUploadUrls(input: unknown): Promise<ActionResult<SignedUpload[]>> {
  return adminAction(
    { schema: uploadRequestSchema, input },
    async ({ scope, entityId, files }, db) => {
      const uploads: SignedUpload[] = [];

      for (const file of files) {
        const extension = fileExtension(file.name);
        const isPresentation = file.kind === "presentation";
        if (isPresentation && scope !== "projects") {
          throw new ActionError("발표자료는 프로젝트에만 올릴 수 있습니다.");
        }

        const allowed: readonly string[] = isPresentation
          ? PRESENTATION_EXTENSIONS
          : IMAGE_EXTENSIONS;
        if (!allowed.includes(extension)) {
          throw new ActionError(`지원하지 않는 파일 형식입니다: ${extension || file.name}`);
        }

        const maxBytes = isPresentation ? MAX_PRESENTATION_BYTES : MAX_IMAGE_BYTES;
        if (file.size > maxBytes) {
          throw new ActionError(
            `${file.name} 파일이 너무 큽니다. (최대 ${Math.round(maxBytes / 1024 / 1024)}MB)`,
          );
        }

        const path = createObjectKey(scope, entityId, file.name, randomBytes(3).toString("hex"));
        const { data, error } = await db.storage.from(UPLOAD_BUCKET).createSignedUploadUrl(path);
        if (error || !data) {
          throw new Error(`createSignedUploadUrl failed: ${error?.message}`);
        }
        uploads.push({ path, token: data.token, contentType: CONTENT_TYPES[extension] });
      }

      return { message: "업로드를 준비했습니다.", data: uploads };
    },
  );
}

const discardSchema = z.object({
  scope: z.enum(UPLOAD_SCOPES),
  entityId: idSchema,
  paths: z.array(z.string()).max(30),
});

/** Removes files uploaded for a save that then failed. */
export async function discardUploads(input: {
  scope: UploadScope;
  entityId: string;
  paths: string[];
}): Promise<ActionResult> {
  return adminAction({ schema: discardSchema, input }, async ({ scope, entityId, paths }, db) => {
    await removeObjects(
      db,
      paths.filter((path) => isObjectKeyOf(path, scope, entityId)),
    );
    return { message: "업로드한 파일을 정리했습니다." };
  });
}
