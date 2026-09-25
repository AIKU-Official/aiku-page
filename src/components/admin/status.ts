import type { ActionResult } from "@/lib/actions/result";

import type { Status } from "./ui";

export const info = (message: string): Status => ({ tone: "info", message });
export const failure = (message: string): Status => ({ tone: "error", message });
export const fromResult = (result: ActionResult<unknown>): Status => ({
  tone: result.ok ? "success" : "error",
  message: result.message,
});
export const fromError = (error: unknown): Status =>
  failure(error instanceof Error ? error.message : "요청을 처리하지 못했습니다.");

/** Smoothly brings an edit form into view below the sticky header. */
export const scrollToForm = (form: HTMLElement | null) =>
  form?.scrollIntoView({ behavior: "smooth", block: "start" });
