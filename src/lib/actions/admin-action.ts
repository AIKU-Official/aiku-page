import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { type AdminSession, getAdminSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin-client";

import type { ActionResult } from "./result";
import { type ContentKind, revalidateContent } from "@/lib/cache/content-paths";

export type AdminDb = ReturnType<typeof createAdminClient>;

/** An error whose message is safe and meant to be shown to the admin. */
export class ActionError extends Error {}

type DbErrorKey = "23503" | "23505" | "23514" | "DUPLICATE_IDS" | "INCOMPLETE_IDS";
export type DbErrorMessages = Partial<Record<DbErrorKey, string>>;

/**
 * Returns the data of a Supabase result, or throws. Known database errors
 * (foreign key 23503, unique 23505, check 23514, and the reorder_items
 * exceptions) become ActionErrors with the given Korean messages.
 */
export function unwrap<T>(
  result: { data: T; error: PostgrestError | null },
  messages: DbErrorMessages = {},
): T {
  const { error } = result;
  if (error) {
    const message = messages[error.code as DbErrorKey] ?? messages[error.message as DbErrorKey];
    if (message) {
      throw new ActionError(message);
    }
    throw new Error(`${error.code}: ${error.message}`);
  }
  return result.data;
}

export type { ContentKind } from "@/lib/cache/content-paths";

type AdminActionOptions<S extends z.ZodType> = {
  schema: S;
  input: unknown;
  /** Public pages to refresh after a successful change. */
  revalidate?: ContentKind[];
};

/**
 * Wraps an admin Server Action: checks the session (actions are public POST
 * endpoints, so this is the real security boundary), validates the input,
 * runs the change, refreshes affected pages and converts failures into a
 * message for the admin.
 */
export async function adminAction<S extends z.ZodType, T = undefined>(
  { schema, input, revalidate = [] }: AdminActionOptions<S>,
  run: (
    data: z.output<S>,
    db: AdminDb,
    session: AdminSession,
  ) => Promise<{ message: string; data?: T }>,
): Promise<ActionResult<T>> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "요청이 올바르지 않습니다." };
  }

  try {
    const result = await run(parsed.data, createAdminClient(), session);
    revalidateContent(revalidate);
    // Re-render the admin page itself in the same response.
    revalidatePath("/admin");
    return { ok: true, message: result.message, data: result.data as T };
  } catch (error) {
    if (error instanceof ActionError) {
      return { ok: false, message: error.message };
    }
    console.error("[admin action]", error);
    return { ok: false, message: "요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요." };
  }
}
