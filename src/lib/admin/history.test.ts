import { describe, expect, it } from "vitest";

import { loginIdToEmail } from "@/lib/auth/login-id";

import { formatSavedAt, revertBlocked, summarize, viewEntry, type LogEntry } from "./history";

const entry = (partial: Partial<LogEntry>): LogEntry => ({
  id: 1,
  table_name: "projects",
  op: "update",
  old_row: null,
  new_row: null,
  ...partial,
});

describe("summarize", () => {
  it("counts rows per table and kind, in order", () => {
    expect(
      summarize([
        entry({ op: "delete", table_name: "projects" }),
        entry({ op: "delete", table_name: "project_tags" }),
        entry({ op: "delete", table_name: "project_tags" }),
      ]),
    ).toBe("projects 삭제 1 · project_tags 삭제 2");
  });
});

describe("viewEntry", () => {
  it("lists only the columns that changed, without updated_at", () => {
    const view = viewEntry(
      entry({
        old_row: { id: "a", title: "Old", sort_order: 1, updated_at: "x" },
        new_row: { id: "a", title: "New", sort_order: 1, updated_at: "y" },
      }),
    );
    expect(view.label).toBe("New");
    expect(view.changes).toEqual([{ column: "title", before: "Old", after: "New" }]);
  });

  it("labels a deleted row from what it was", () => {
    expect(viewEntry(entry({ op: "delete", old_row: { id: "a", name: "태그" } })).label).toBe(
      "태그",
    );
  });

  it("shows nothing of a secret table", () => {
    const view = viewEntry(
      entry({
        table_name: "member_student_ids",
        old_row: { member_id: "m", digest: "old" },
        new_row: { member_id: "m", digest: "new" },
      }),
    );
    expect(view).toMatchObject({ label: "비공개 표", changes: [], hidden: true });
  });
});

describe("formatSavedAt", () => {
  it("shows Korean time whatever the machine's zone", () => {
    expect(formatSavedAt("2026-11-12T17:14:00Z")).toBe("11월 13일 오전 2:14");
  });
});

describe("revertBlocked", () => {
  it("blocks undoing a rejected AIKU ID sign-up, whose login was deleted", () => {
    const rejected = entry({
      op: "delete",
      table_name: "member_signup_requests",
      old_row: { user_id: "u", email: loginIdToEmail("someone") },
    });
    expect(revertBlocked([rejected])).toMatch(/되돌릴 수 없습니다/);
  });

  it("allows other saves, including a rejected Google sign-up", () => {
    const google = entry({
      op: "delete",
      table_name: "member_signup_requests",
      old_row: { user_id: "u", email: "someone@gmail.com" },
    });
    expect(revertBlocked([google, entry({ op: "update" })])).toBeNull();
  });
});
