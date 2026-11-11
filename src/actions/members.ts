"use server";

import { z } from "zod";

import { ActionError, adminAction, unwrap } from "@/lib/actions/admin-action";
import type { ActionResult } from "@/lib/actions/result";
import { removeFolder } from "@/lib/storage/server";
import { generationNameSchema, idSchema, memberSchema, reorderSchema } from "@/lib/validators";

// Generations ---------------------------------------------------------------

export async function addGeneration(input: unknown): Promise<ActionResult> {
  return adminAction(
    { schema: generationNameSchema, input, revalidate: ["members"] },
    async (name, db) => {
      unwrap(await db.from("generations").insert({ name }), {
        "23505": "이미 등록된 기수입니다.",
      });
      return { message: "기수를 추가했습니다." };
    },
  );
}

export async function deleteGeneration(input: unknown): Promise<ActionResult> {
  return adminAction({ schema: idSchema, input, revalidate: ["members"] }, async (id, db) => {
    const deleted = unwrap(await db.from("generations").delete().eq("id", id).select("id"), {
      "23503": "해당 기수에 멤버나 직책이 있어 삭제할 수 없습니다.",
    });
    if (!deleted?.length) throw new ActionError("기수를 찾을 수 없습니다.");
    return { message: "기수를 삭제했습니다." };
  });
}

export async function reorderGenerations(input: unknown): Promise<ActionResult> {
  return adminAction({ schema: reorderSchema, input, revalidate: ["members"] }, async (ids, db) => {
    unwrap(await db.rpc("reorder_items", { p_table: "generations", p_ids: ids }), {
      DUPLICATE_IDS: "중복된 기수가 있습니다.",
      INCOMPLETE_IDS:
        "등록된 기수를 모두 포함해서 순서를 저장해야 합니다. 새로고침 후 다시 시도하세요.",
    });
    return { message: "기수 순서를 저장했습니다." };
  });
}

// Members -------------------------------------------------------------------

const generationMessages = { "23503": "등록된 기수만 선택할 수 있습니다." } as const;

export async function saveMember(input: unknown): Promise<ActionResult> {
  return adminAction({ schema: memberSchema, input, revalidate: ["members"] }, async (data, db) => {
    const { id, isNew } = data;

    // Resolve the titles before writing anything, so bad input changes nothing.
    const generations = data.position.length
      ? (unwrap(await db.from("generations").select("id, name")) ?? [])
      : [];
    const generationIds = new Map(
      generations.map((generation) => [generation.name, generation.id]),
    );
    const positions = data.position.map(({ generation, title }) => {
      const generationId = generationIds.get(generation);
      if (!generationId) {
        throw new ActionError(`직책의 기수 "${generation}"는 등록되지 않은 기수입니다.`);
      }
      return { member_id: id, generation_id: generationId, title };
    });

    const row = {
      generation_id: data.generationId,
      name: data.name,
      department: data.department,
      grade: data.grade,
      grade_pinned: data.gradePinned,
    };

    if (isNew) {
      unwrap(await db.from("members").insert({ id, ...row }), {
        ...generationMessages,
        "23505": "이미 저장된 멤버입니다. 새로고침 후 확인하세요.",
      });
    } else {
      const updated = unwrap(
        await db.from("members").update(row).eq("id", id).select("id"),
        generationMessages,
      );
      if (!updated?.length) throw new ActionError("멤버를 찾을 수 없습니다.");
    }

    // Replace the member's titles: add the new ones first, then drop the rest,
    // so a failure in between never leaves an officer without a title.
    if (positions.length) {
      unwrap(
        await db.from("member_positions").upsert(positions, {
          onConflict: "member_id,generation_id,title",
          ignoreDuplicates: true,
        }),
      );
    }
    const keep = new Set(
      positions.map((position) => `${position.generation_id} ${position.title}`),
    );
    const current =
      unwrap(
        await db.from("member_positions").select("id, generation_id, title").eq("member_id", id),
      ) ?? [];
    const stale = current
      .filter((position) => !keep.has(`${position.generation_id} ${position.title}`))
      .map((position) => position.id);
    if (stale.length) {
      unwrap(await db.from("member_positions").delete().in("id", stale));
    }

    return { message: "멤버 프로필을 저장했습니다." };
  });
}

export async function deleteMember(input: unknown): Promise<ActionResult> {
  return adminAction({ schema: idSchema, input, revalidate: ["members"] }, async (id, db) => {
    const deleted = unwrap(await db.from("members").delete().eq("id", id).select("id"));
    if (!deleted?.length) throw new ActionError("멤버를 찾을 수 없습니다.");
    await removeFolder(db, `members/${id}`);
    return { message: "멤버 프로필을 삭제했습니다." };
  });
}

const memberOrderSchema = z.object({ generationId: idSchema, ids: reorderSchema });

export async function reorderMembers(input: unknown): Promise<ActionResult> {
  return adminAction(
    { schema: memberOrderSchema, input, revalidate: ["members"] },
    async ({ generationId, ids }, db) => {
      unwrap(
        await db.rpc("reorder_items", { p_table: "members", p_ids: ids, p_scope: generationId }),
        {
          DUPLICATE_IDS: "중복된 멤버가 있습니다.",
          INCOMPLETE_IDS:
            "해당 기수의 멤버를 모두 포함해서 순서를 저장해야 합니다. 새로고침 후 다시 시도하세요.",
        },
      );
      return { message: "멤버 순서를 저장했습니다." };
    },
  );
}
