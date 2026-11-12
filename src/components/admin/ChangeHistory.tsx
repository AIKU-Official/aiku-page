"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { revertBatch } from "@/actions/db-admin";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pill } from "@/components/ui/Pill";
import {
  type Batch,
  formatSavedAt,
  OP_WORDS,
  revertBlocked,
  summarize,
  viewEntry,
} from "@/lib/admin/history";

/**
 * The latest saves from the canvas: when, who, what changed, and a way to
 * undo one. Undoing asks first, like DB 업데이트, because it also writes to
 * the live database at once.
 */
export function ChangeHistory({ batches }: { batches: Batch[] }) {
  const router = useRouter();
  const [asking, setAsking] = useState<Batch | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const byId = new Map(batches.map((batch) => [batch.id, batch]));
  const undoneBy = new Map(batches.filter((b) => b.reverts).map((b) => [b.reverts!, b]));

  const revert = async (batch: Batch) => {
    setAsking(null);
    setBusy(batch.id);
    setErrors(({ [batch.id]: _, ...rest }) => rest);
    const result = await revertBatch(batch.id);
    setBusy(null);
    if (!result.ok) {
      setErrors((current) => ({ ...current, [batch.id]: result.message }));
      return;
    }
    router.refresh();
  };

  return (
    <section
      className="site-container grid gap-5 py-12 max-sm:py-8"
      aria-labelledby="change-history-title"
    >
      <div className="grid gap-1">
        <h2 id="change-history-title" className="text-[1.375rem] font-bold text-ink">
          변경 기록
        </h2>
        <p className="text-small text-muted">
          최근 30번의 DB 업데이트입니다. 되돌리면 그때 바뀐 행이 모두 그 전으로 돌아갑니다.
        </p>
      </div>

      {batches.length === 0 ? (
        <p className="rounded-[20px] border border-line bg-surface-soft px-5 py-6 text-center text-small text-muted">
          아직 기록이 없습니다.
        </p>
      ) : (
        <ol className="grid gap-3">
          {batches.map((batch) => {
            const undo = undoneBy.get(batch.id);
            const original = batch.reverts ? byId.get(batch.reverts) : undefined;
            return (
              <li key={batch.id} className="rounded-[20px] border border-line bg-surface">
                <details className="group">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 max-sm:px-4">
                    <div className="grid min-w-0 flex-1 gap-1">
                      <p className="flex flex-wrap items-center gap-2 text-small">
                        <span className="font-semibold text-ink tabular-nums">
                          {formatSavedAt(batch.created_at)}
                        </span>
                        <span className="text-muted">{batch.member?.name ?? "알 수 없음"}</span>
                        {batch.reverts ? (
                          <Pill>
                            되돌리기
                            {original ? ` · ${formatSavedAt(original.created_at)} 변경` : ""}
                          </Pill>
                        ) : null}
                        {undo ? <Pill tone="bg-amber-100 text-amber-800">되돌림</Pill> : null}
                      </p>
                      <p className="truncate font-mono text-label text-muted">
                        {summarize(batch.entries)}
                      </p>
                    </div>
                    {undo ? null : revertBlocked(batch.entries) ? (
                      <span className="text-label text-muted" title={revertBlocked(batch.entries)!}>
                        되돌릴 수 없음
                      </span>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidthOnMobile={false}
                        disabled={busy !== null}
                        onClick={(event) => {
                          // A button inside <summary> would also open the details.
                          event.preventDefault();
                          setAsking(batch);
                        }}
                      >
                        {busy === batch.id ? "되돌리는 중…" : "되돌리기"}
                      </Button>
                    )}
                  </summary>

                  {errors[batch.id] ? (
                    <p
                      role="alert"
                      className="mx-5 mb-4 rounded-control bg-danger-soft px-4 py-3 text-small text-danger max-sm:mx-4"
                    >
                      {errors[batch.id]}
                    </p>
                  ) : null}

                  <ul className="grid gap-2 border-t border-soft-line px-5 py-4 text-small max-sm:px-4">
                    {batch.entries.map((entry) => {
                      const view = viewEntry(entry);
                      return (
                        <li key={view.id} className="grid gap-1">
                          <p className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-mono text-label text-muted">{view.table}</span>
                            <span className="font-semibold text-ink">{OP_WORDS[view.op]}</span>
                            <span className="min-w-0 truncate text-body">{view.label}</span>
                          </p>
                          {view.changes.map((change) => (
                            <p
                              key={change.column}
                              className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 pl-3 text-label"
                            >
                              <span className="font-mono text-muted">{change.column}</span>
                              <span className="min-w-0 break-words">
                                <span className="text-muted line-through">
                                  {change.before || "비어 있음"}
                                </span>
                                {" → "}
                                <span className="text-ink">{change.after || "비어 있음"}</span>
                              </span>
                            </p>
                          ))}
                        </li>
                      );
                    })}
                  </ul>
                </details>
              </li>
            );
          })}
        </ol>
      )}

      {asking ? (
        <ConfirmDialog
          title="이 변경을 되돌릴까요?"
          confirmLabel="되돌리기"
          onConfirm={() => void revert(asking)}
          onCancel={() => setAsking(null)}
        >
          <p>
            {formatSavedAt(asking.created_at)}에 바뀐 행을 모두 그 전으로 돌립니다. 누르는 순간 운영
            데이터베이스와 사이트에 바로 반영됩니다. 되돌린 것도 기록에 남아 다시 되돌릴 수
            있습니다.
          </p>
          <p className="mt-2 font-mono text-label text-body">{summarize(asking.entries)}</p>
        </ConfirmDialog>
      ) : null}
    </section>
  );
}
