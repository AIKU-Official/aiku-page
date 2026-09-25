"use server";

import { z } from "zod";

import { ActionError, adminAction, unwrap } from "@/lib/actions/admin-action";
import type { ActionResult } from "@/lib/actions/result";
import { isObjectKeyOf } from "@/lib/storage/keys";
import { removeFolder, removeObjects } from "@/lib/storage/server";
import { idSchema, projectSchema, reorderSchema } from "@/lib/validators";

const seasonMessages = { "23503": "등록된 시즌만 선택할 수 있습니다." } as const;

export async function saveProject(input: unknown): Promise<ActionResult> {
  return adminAction(
    { schema: projectSchema, input, revalidate: ["projects"] },
    async (data, db) => {
      const { id, isNew } = data;
      const inFolder = (path: string) => path.startsWith(`projects/${id}/`);

      // New files must have been uploaded into this project's own folder.
      if (
        (data.presentation && !isObjectKeyOf(data.presentation.path, "projects", id)) ||
        !data.addImages.every((path) => isObjectKeyOf(path, "projects", id))
      ) {
        throw new ActionError("업로드한 파일을 확인할 수 없습니다. 다시 시도하세요.");
      }

      const existing = isNew
        ? null
        : unwrap(
            await db
              .from("projects")
              .select("presentation_path, presentation_name, image_paths")
              .eq("id", id)
              .maybeSingle(),
          );
      if (!isNew && !existing) {
        throw new ActionError("프로젝트를 찾을 수 없습니다.");
      }

      const obsolete: string[] = [];

      let presentationPath = existing?.presentation_path ?? null;
      let presentationName = existing?.presentation_name ?? null;
      if (data.presentation || data.removePresentation) {
        if (presentationPath) obsolete.push(presentationPath);
        presentationPath = data.presentation?.path ?? null;
        presentationName = data.presentation?.name ?? null;
      }

      const removed = new Set(data.removeImages);
      const currentImages = existing?.image_paths ?? [];
      obsolete.push(...currentImages.filter((path) => removed.has(path)));
      const imagePaths = [...currentImages.filter((path) => !removed.has(path)), ...data.addImages];

      const row = {
        season_id: data.seasonId,
        title: data.title,
        summary: data.summary,
        markdown: data.markdown,
        github_url: data.githubUrl,
        presentation_path: presentationPath,
        presentation_name: presentationName,
        image_paths: imagePaths,
      };

      if (isNew) {
        unwrap(await db.from("projects").insert({ id, ...row }), {
          ...seasonMessages,
          "23505": "이미 저장된 프로젝트입니다. 새로고침 후 확인하세요.",
        });
      } else {
        unwrap(await db.from("projects").update(row).eq("id", id), seasonMessages);
      }

      await removeObjects(db, obsolete.filter(inFolder));
      return { message: "프로젝트를 저장했습니다." };
    },
  );
}

export async function deleteProject(input: unknown): Promise<ActionResult> {
  return adminAction({ schema: idSchema, input, revalidate: ["projects"] }, async (id, db) => {
    const deleted = unwrap(await db.from("projects").delete().eq("id", id).select("id"));
    if (!deleted?.length) throw new ActionError("프로젝트를 찾을 수 없습니다.");
    await removeFolder(db, `projects/${id}`);
    return { message: "프로젝트를 삭제했습니다." };
  });
}

const projectOrderSchema = z.object({ seasonId: idSchema, ids: reorderSchema });

export async function reorderProjects(input: unknown): Promise<ActionResult> {
  return adminAction(
    { schema: projectOrderSchema, input, revalidate: ["projects"] },
    async ({ seasonId, ids }, db) => {
      unwrap(
        await db.rpc("reorder_items", { p_table: "projects", p_ids: ids, p_scope: seasonId }),
        {
          DUPLICATE_IDS: "중복된 프로젝트가 있습니다.",
          INCOMPLETE_IDS:
            "해당 시즌의 프로젝트를 모두 포함해서 순서를 저장해야 합니다. 새로고침 후 다시 시도하세요.",
        },
      );
      return { message: "프로젝트 순서를 저장했습니다." };
    },
  );
}
