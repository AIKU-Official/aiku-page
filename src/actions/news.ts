"use server";

import { ActionError, adminAction, unwrap } from "@/lib/actions/admin-action";
import type { ActionResult } from "@/lib/actions/result";
import { idSchema, newsSchema, reorderSchema } from "@/lib/validators";

export async function saveNews(input: unknown): Promise<ActionResult> {
  return adminAction(
    { schema: newsSchema, input, revalidate: ["news"] },
    async ({ id, date, title, summary, linkUrl, linkLabel }, db) => {
      const row = { published_on: date, title, summary, link_url: linkUrl, link_label: linkLabel };

      if (id) {
        const updated = unwrap(await db.from("news").update(row).eq("id", id).select("id"));
        if (!updated?.length) throw new ActionError("소식을 찾을 수 없습니다.");
      } else {
        unwrap(await db.from("news").insert(row));
      }
      return { message: "소식을 저장했습니다." };
    },
  );
}

export async function deleteNews(input: unknown): Promise<ActionResult> {
  return adminAction({ schema: idSchema, input, revalidate: ["news"] }, async (id, db) => {
    const deleted = unwrap(await db.from("news").delete().eq("id", id).select("id"));
    if (!deleted?.length) throw new ActionError("소식을 찾을 수 없습니다.");
    return { message: "소식을 삭제했습니다." };
  });
}

export async function reorderNews(input: unknown): Promise<ActionResult> {
  return adminAction({ schema: reorderSchema, input, revalidate: ["news"] }, async (ids, db) => {
    unwrap(await db.rpc("reorder_items", { p_table: "news", p_ids: ids }), {
      DUPLICATE_IDS: "중복된 소식이 있습니다.",
      INCOMPLETE_IDS:
        "등록된 소식을 모두 포함해서 순서를 저장해야 합니다. 새로고침 후 다시 시도하세요.",
    });
    return { message: "소식 순서를 저장했습니다." };
  });
}
