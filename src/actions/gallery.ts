"use server";

import { ActionError, adminAction, unwrap } from "@/lib/actions/admin-action";
import type { ActionResult } from "@/lib/actions/result";
import { isObjectKeyOf } from "@/lib/storage/keys";
import { removeFolder, removeObjects } from "@/lib/storage/server";
import { galleryItemSchema, idSchema, reorderSchema } from "@/lib/validators";

export async function saveGalleryItem(input: unknown): Promise<ActionResult> {
  return adminAction(
    { schema: galleryItemSchema, input, revalidate: ["gallery"] },
    async ({ id, isNew, category, title, description, image }, db) => {
      if (image && !isObjectKeyOf(image, "gallery", id)) {
        throw new ActionError("업로드한 파일을 확인할 수 없습니다. 다시 시도하세요.");
      }

      const existing = isNew
        ? null
        : unwrap(await db.from("gallery_items").select("image_path").eq("id", id).maybeSingle());
      if (!isNew && !existing) {
        throw new ActionError("갤러리 항목을 찾을 수 없습니다.");
      }

      const row = {
        category,
        title,
        description,
        image_path: image ?? existing?.image_path ?? null,
      };

      if (isNew) {
        unwrap(await db.from("gallery_items").insert({ id, ...row }), {
          "23505": "이미 저장된 갤러리 항목입니다. 새로고침 후 확인하세요.",
        });
      } else {
        unwrap(await db.from("gallery_items").update(row).eq("id", id));
      }

      if (image && existing?.image_path?.startsWith(`gallery/${id}/`)) {
        await removeObjects(db, [existing.image_path]);
      }
      return { message: "갤러리 항목을 저장했습니다." };
    },
  );
}

export async function deleteGalleryItem(input: unknown): Promise<ActionResult> {
  return adminAction({ schema: idSchema, input, revalidate: ["gallery"] }, async (id, db) => {
    const deleted = unwrap(await db.from("gallery_items").delete().eq("id", id).select("id"));
    if (!deleted?.length) throw new ActionError("갤러리 항목을 찾을 수 없습니다.");
    await removeFolder(db, `gallery/${id}`);
    return { message: "갤러리 항목을 삭제했습니다." };
  });
}

export async function reorderGallery(input: unknown): Promise<ActionResult> {
  return adminAction({ schema: reorderSchema, input, revalidate: ["gallery"] }, async (ids, db) => {
    unwrap(await db.rpc("reorder_items", { p_table: "gallery_items", p_ids: ids }), {
      DUPLICATE_IDS: "중복된 갤러리 항목이 있습니다.",
      INCOMPLETE_IDS:
        "등록된 갤러리 항목을 모두 포함해서 순서를 저장해야 합니다. 새로고침 후 다시 시도하세요.",
    });
    return { message: "갤러리 순서를 저장했습니다." };
  });
}
