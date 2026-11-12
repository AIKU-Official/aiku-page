"use server";

import { ActionError, adminAction, unwrap } from "@/lib/actions/admin-action";
import type { ActionResult } from "@/lib/actions/result";
import { parseSeasonName } from "@/lib/seasons/name";
import { idSchema, seasonNameSchema } from "@/lib/validators";

export async function addSeason(input: unknown): Promise<ActionResult> {
  return adminAction(
    { schema: seasonNameSchema, input, revalidate: ["projects"] },
    async (name, db) => {
      const parsed = parseSeasonName(name);
      if (!parsed) throw new ActionError("분기 이름은 26-1, 26-여름, 26-2, 26-겨울처럼 입력하세요.");
      // The order is set by the database from the year and term.
      unwrap(await db.from("seasons").insert({ name, ...parsed }), {
        "23505": "이미 등록된 분기입니다.",
      });
      return { message: "분기를 추가했습니다." };
    },
  );
}

export async function deleteSeason(input: unknown): Promise<ActionResult> {
  return adminAction({ schema: idSchema, input, revalidate: ["projects"] }, async (id, db) => {
    const deleted = unwrap(await db.from("seasons").delete().eq("id", id).select("id"), {
      "23503": "이 분기에 프로젝트나 AIKUTHON이 있어 삭제할 수 없습니다.",
    });
    if (!deleted?.length) throw new ActionError("분기를 찾을 수 없습니다.");
    return { message: "분기를 삭제했습니다." };
  });
}
