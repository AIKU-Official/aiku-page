"use server";

import { ActionError, adminAction, unwrap } from "@/lib/actions/admin-action";
import type { ActionResult } from "@/lib/actions/result";
import { idSchema, reorderSchema, seasonNameSchema } from "@/lib/validators";

export async function addSeason(input: unknown): Promise<ActionResult> {
  return adminAction(
    { schema: seasonNameSchema, input, revalidate: ["projects"] },
    async (name, db) => {
      unwrap(await db.from("seasons").insert({ name }), {
        "23505": "이미 등록된 시즌입니다.",
      });
      return { message: "시즌을 추가했습니다." };
    },
  );
}

export async function deleteSeason(input: unknown): Promise<ActionResult> {
  return adminAction({ schema: idSchema, input, revalidate: ["projects"] }, async (id, db) => {
    const deleted = unwrap(await db.from("seasons").delete().eq("id", id).select("id"), {
      "23503": "해당 시즌에 프로젝트가 있어 삭제할 수 없습니다.",
    });
    if (!deleted?.length) throw new ActionError("시즌을 찾을 수 없습니다.");
    return { message: "시즌을 삭제했습니다." };
  });
}

export async function reorderSeasons(input: unknown): Promise<ActionResult> {
  return adminAction(
    { schema: reorderSchema, input, revalidate: ["projects"] },
    async (ids, db) => {
      unwrap(await db.rpc("reorder_items", { p_table: "seasons", p_ids: ids }), {
        DUPLICATE_IDS: "중복된 시즌이 있습니다.",
        INCOMPLETE_IDS:
          "기존 시즌을 모두 포함해서 순서를 저장해야 합니다. 새로고침 후 다시 시도하세요.",
      });
      return { message: "시즌 순서를 저장했습니다." };
    },
  );
}
