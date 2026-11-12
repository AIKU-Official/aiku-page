"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { commitChanges, getTableRows } from "@/actions/db-admin";
import { CenterPeek } from "@/components/ui/CenterPeek";
import { buttonClassName } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { summarize } from "@/lib/admin/history";
import {
  ExpandIcon,
  FitIcon,
  MinusIcon,
  PlusIcon,
  RedoIcon,
  UndoIcon,
} from "@/components/ui/icons";
import {
  countByTable,
  emptyHistory,
  redo,
  toPayload,
  undo,
  type ChangeHistory,
} from "@/lib/admin/changes";
import { routeEdges } from "@/lib/admin/edge-path";
import { bounds, initialLayout, type Point } from "@/lib/admin/layout";
import type { Row, Schema } from "@/lib/admin/schema-types";

import { TableNode } from "./TableNode";
import { TablePeek } from "./TablePeek";
import { useCanvasView } from "./useCanvasView";

// v4: the opening layout is now as square as the groups allow.
const LAYOUT_KEY = "aiku-admin-layout-v4";
const CLICK_SLOP = 4;

/**
 * The first view shows the whole schema only if it is still readable at this
 * scale; otherwise it opens at this scale from the top-left corner.
 */
const OPENING_SCALE = 0.8;

/** Height of the canvas on the page: the window below the header, less a margin. */
const STAGE_HEIGHT = "h-[calc(100dvh-var(--header-height)-5rem)] min-h-[32rem]";

const HOW_TO = [
  {
    title: "둘러보기",
    body: "빈 곳을 끌어 옮기고, ⌘ 또는 Ctrl을 누른 채 스크롤하거나 오른쪽 위 +, − 로 확대·축소하고, 그 아래 마지막 버튼으로 캔버스를 크게 띄웁니다. 표를 끌면 자리를 옮길 수 있습니다.",
  },
  {
    title: "표 열기",
    body: "표를 누르면 행 목록이 열립니다. 값으로 찾고, 행을 눌러 고치거나, 행 추가로 새 행을 만듭니다.",
  },
  {
    title: "고치기",
    body: "바꾼 내용은 바로 저장되지 않고 쌓입니다. 바뀐 표에는 개수가 표시되고, ⌘Z로 실행 취소하거나 취소로 모두 버릴 수 있습니다.",
  },
  {
    title: "DB 업데이트",
    body: "아래 도구 막대의 DB 업데이트를 누르면 쌓인 내용이 한 번에 반영됩니다. 하나라도 실패하면 아무것도 바뀌지 않고, 반영한 것은 아래 변경 기록에서 되돌릴 수 있습니다.",
  },
] as const;

/** Grid spacing on screen: 24 canvas units, doubled while zoomed out so the dots stay apart. */
function gridStep(scale: number) {
  let step = 24 * scale;
  while (step < 14) step *= 2;
  return step;
}

type Drag =
  | { kind: "pan"; startX: number; startY: number; viewX: number; viewY: number; moved: boolean }
  | { kind: "node"; name: string; startX: number; startY: number; origin: Point; moved: boolean };

/**
 * The admin page: the whole database drawn like a schema diagram on an
 * unbounded canvas. Tables are nodes, foreign keys are edges; a node opens
 * its rows to add, edit or delete. Changes wait here until "DB 업데이트",
 * which applies them all in one transaction; undo, redo and 취소 work on the
 * waiting changes.
 */
export function SchemaCanvas({ schema }: { schema: Schema }) {
  const router = useRouter();
  const canvas = useRef<HTMLDivElement>(null);
  const { view, viewRef, setView, zoomAt, zoomBy, fit } = useCanvasView(canvas);
  const byName = useMemo(() => new Map(schema.map((table) => [table.name, table])), [schema]);

  const [positions, setPositions] = useState<Record<string, Point>>(() => initialLayout(schema));
  const [history, setHistory] = useState<ChangeHistory>(emptyHistory);
  const [rows, setRows] = useState<Record<string, Row[]>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "error" | "info"; message: string } | null>(null);
  const drag = useRef<Drag | null>(null);
  // The canvas opened large in a centre peek, and the box it leaves on the page.
  const [full, setFull] = useState(false);
  const placeholder = useRef<HTMLDivElement>(null);
  // Which irreversible toolbar action is waiting for a yes.
  const [asking, setAsking] = useState<"commit" | "discard" | null>(null);
  const pinch = useRef(new Map<number, { x: number; y: number }>());

  // Saved arrangement, if the admin moved nodes before.
  useLayoutEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? "{}") as Record<string, Point>;
      const merged = { ...initialLayout(schema), ...saved };
      // localStorage exists only in the browser, so the saved arrangement is applied after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPositions(merged);
      fit(bounds(schema, merged), OPENING_SCALE);
    } catch {
      fit(bounds(schema, initialLayout(schema)), OPENING_SCALE);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per schema; fit is recreated every render
  }, [schema]);

  const pendingCount = history.changes.length;
  const pendingByTable = useMemo(() => countByTable(history.changes), [history.changes]);

  // Leaving with unapplied changes asks first.
  useEffect(() => {
    if (!pendingCount) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pendingCount]);

  // ⌘Z / Ctrl+Z undo, with Shift redo, unless typing in a field.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement | null)?.closest("input, textarea, select");
      if (typing || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
      event.preventDefault();
      setHistory((current) => (event.shiftKey ? redo(current) : undo(current)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const loadRows = useCallback(async (name: string) => {
    const result = await getTableRows(name);
    if (result.ok) setRows((current) => ({ ...current, [name]: result.data }));
    else setNotice({ tone: "error", message: result.message });
  }, []);

  const openTable = (name: string) => {
    setOpen(name);
    if (!rows[name]) void loadRows(name);
  };

  // Pointer handling: drag the background to pan, drag a node to move it,
  // tap a node to open it, two fingers to pinch-zoom.
  const onPointerDown = (event: ReactPointerEvent<HTMLElement>, node?: string) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    pinch.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.current?.setPointerCapture(event.pointerId);
    if (pinch.current.size > 1) {
      drag.current = null;
      return;
    }
    drag.current = node
      ? {
          kind: "node",
          name: node,
          startX: event.clientX,
          startY: event.clientY,
          origin: positions[node],
          moved: false,
        }
      : {
          kind: "pan",
          startX: event.clientX,
          startY: event.clientY,
          viewX: viewRef.current.x,
          viewY: viewRef.current.y,
          moved: false,
        };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const points = pinch.current;
    if (points.has(event.pointerId) && points.size === 2) {
      const [a, b] = [...points.values()];
      const before = Math.hypot(a.x - b.x, a.y - b.y);
      points.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const [c, d] = [...points.values()];
      const after = Math.hypot(c.x - d.x, c.y - d.y);
      if (before > 0) zoomAt(after / before, (c.x + d.x) / 2, (c.y + d.y) / 2);
      return;
    }
    if (points.has(event.pointerId))
      points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const current = drag.current;
    if (!current) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (!current.moved && Math.hypot(dx, dy) < CLICK_SLOP) return;
    current.moved = true;
    if (current.kind === "pan") {
      setView((value) => ({ ...value, x: current.viewX + dx, y: current.viewY + dy }));
    } else {
      const scale = viewRef.current.scale;
      setPositions((value) => ({
        ...value,
        [current.name]: { x: current.origin.x + dx / scale, y: current.origin.y + dy / scale },
      }));
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pinch.current.delete(event.pointerId);
    const current = drag.current;
    drag.current = null;
    if (!current) return;
    if (current.kind === "node") {
      if (!current.moved) openTable(current.name);
      else {
        try {
          localStorage.setItem(LAYOUT_KEY, JSON.stringify(positions));
        } catch {
          // Private windows may refuse storage; the arrangement just is not kept.
        }
      }
    }
  };

  const commit = async () => {
    setAsking(null);
    setBusy(true);
    setNotice(null);
    const result = await commitChanges(toPayload(history.changes));
    setBusy(false);
    if (!result.ok) {
      setNotice({ tone: "error", message: result.message });
      return;
    }
    setHistory(emptyHistory);
    setRows({});
    setNotice({ tone: "info", message: result.message });
    if (open) void loadRows(open);
    router.refresh();
  };

  const discard = () => {
    setHistory(emptyHistory);
    setNotice(null);
  };

  const edges = useMemo(() => routeEdges(schema, positions), [schema, positions]);

  const openTableSchema = open ? byName.get(open) : undefined;

  const stage = (inPeek: boolean) => (
    <div
      className={clsx(
        "relative overflow-hidden bg-white",
        inPeek ? "h-[calc(100dvh-6rem)]" : "rounded-[20px] border border-line",
      )}
    >
      <div
        ref={canvas}
        onPointerDown={(event) => onPointerDown(event)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label="DB 스키마 캔버스"
        className={clsx(
          "relative w-full cursor-grab touch-none overflow-hidden active:cursor-grabbing",
          inPeek ? "h-full" : STAGE_HEIGHT,
        )}
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--color-line-strong) 1px, transparent 1.4px)",
          backgroundSize: `${gridStep(view.scale)}px ${gridStep(view.scale)}px`,
          backgroundPosition: `${view.x}px ${view.y}px`,
        }}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        >
          <svg
            className="pointer-events-none absolute top-0 left-0 overflow-visible"
            width="1"
            height="1"
            aria-hidden="true"
          >
            {edges.map((edge) => {
              const lit = hovered === edge.source || hovered === edge.target;
              return (
                <path
                  key={edge.id}
                  d={edge.d}
                  fill="none"
                  strokeWidth={lit ? 2 : 1.25}
                  className={lit ? "stroke-green-500" : "stroke-line-strong"}
                />
              );
            })}
          </svg>
          {schema.map((table) =>
            positions[table.name] ? (
              <TableNode
                key={table.name}
                table={table}
                position={positions[table.name]}
                pending={pendingByTable[table.name] ?? 0}
                highlighted={hovered === table.name || open === table.name}
                onHover={setHovered}
                onPointerDown={onPointerDown}
              />
            ) : null,
          )}
        </div>
      </div>

      {/* Zoom controls, top right. */}
      <div className="absolute top-6 right-6 flex flex-col overflow-hidden rounded-control border border-line bg-surface shadow-[0_6px_18px_rgb(29_29_29/0.08)]">
        {[
          { label: "확대", icon: <PlusIcon className="size-4" />, onClick: () => zoomBy(1.2) },
          {
            label: "축소",
            icon: <MinusIcon className="size-4" />,
            onClick: () => zoomBy(1 / 1.2),
          },
          {
            label: "전체 보기",
            icon: <FitIcon className="size-4" />,
            onClick: () => fit(bounds(schema, positions)),
          },
          ...(inPeek
            ? []
            : [
                {
                  label: "크게 보기",
                  icon: <ExpandIcon className="size-4" />,
                  onClick: () => setFull(true),
                },
              ]),
        ].map((control) => (
          <button
            key={control.label}
            type="button"
            aria-label={control.label}
            title={control.label}
            onClick={control.onClick}
            className="inline-flex size-9 items-center justify-center text-body transition-colors not-last:border-b not-last:border-soft-line hover:bg-surface-soft hover:text-ink"
          >
            {control.icon}
          </button>
        ))}
      </div>

      <ChangeToolbar
        pending={pendingCount}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        busy={busy}
        onUndo={() => setHistory(undo)}
        onRedo={() => setHistory(redo)}
        onDiscard={() => setAsking("discard")}
        onCommit={() => setAsking("commit")}
      />

      {notice ? (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={clsx(
            "absolute top-6 left-1/2 max-w-[min(36rem,calc(100%-2rem))] -translate-x-1/2 rounded-control px-4 py-2.5 text-small shadow-[0_6px_18px_rgb(29_29_29/0.08)]",
            notice.tone === "error" ? "bg-danger-soft text-danger" : "bg-surface text-body",
          )}
        >
          {notice.message}
        </p>
      ) : null}
    </div>
  );

  return (
    <section className="site-container grid gap-6 py-10">
      <ol className="grid grid-cols-4 gap-3 max-lg:grid-cols-2">
        {HOW_TO.map((step, index) => (
          <li
            key={step.title}
            className="rounded-card border border-line bg-surface-soft px-4 py-3.5"
          >
            <p className="text-small font-semibold text-ink">
              <span className="mr-1.5 text-muted tabular-nums">{index + 1}</span>
              {step.title}
            </p>
            <p className="mt-1 text-small leading-relaxed text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
      {full ? (
        <>
          {/* Keeps the page in place while the canvas is open large. */}
          <div
            ref={placeholder}
            className={clsx("rounded-[20px] border border-line bg-surface-soft", STAGE_HEIGHT)}
          />
          <CenterPeek
            label="DB 스키마 캔버스 크게 보기"
            origin={() => placeholder.current?.getBoundingClientRect()}
            originRadius="20px"
            expandable={false}
            width="max-w-none"
            className="overflow-hidden p-0"
            onClose={() => setFull(false)}
          >
            {stage(true)}
          </CenterPeek>
        </>
      ) : (
        stage(false)
      )}
      {openTableSchema ? (
        <TablePeek
          key={openTableSchema.name}
          table={openTableSchema}
          schema={schema}
          rows={rows[openTableSchema.name]}
          history={history}
          onHistory={setHistory}
          origin={() =>
            canvas.current
              ?.querySelector(`[data-node="${openTableSchema.name}"]`)
              ?.getBoundingClientRect()
          }
          onClose={() => setOpen(null)}
        />
      ) : null}
      {asking === "commit" ? (
        <ConfirmDialog
          title="DB를 업데이트할까요?"
          confirmLabel={`${pendingCount}건 DB 업데이트`}
          onConfirm={() => void commit()}
          onCancel={() => setAsking(null)}
        >
          <p>
            누르는 순간 운영 데이터베이스와 사이트가 바로 바뀝니다. 잘못 반영했으면 아래 변경
            기록에서 되돌릴 수 있습니다.
          </p>
          <p className="mt-2 font-mono text-label text-body">
            {summarize(
              history.changes.map((change) => ({ table_name: change.table, op: change.op })),
            )}
          </p>
        </ConfirmDialog>
      ) : null}
      {asking === "discard" ? (
        <ConfirmDialog
          title="변경을 모두 버릴까요?"
          confirmLabel="모두 버리기"
          tone="danger"
          onConfirm={() => {
            setAsking(null);
            discard();
          }}
          onCancel={() => setAsking(null)}
        >
          <p>아직 DB에 업데이트하지 않은 변경 {pendingCount}건이 사라집니다.</p>
        </ConfirmDialog>
      ) : null}
    </section>
  );
}

/** DB 업데이트, undo, redo and 취소, floating at the bottom of the canvas. */
function ChangeToolbar({
  pending,
  canUndo,
  canRedo,
  busy,
  onUndo,
  onRedo,
  onDiscard,
  onCommit,
}: {
  pending: number;
  canUndo: boolean;
  canRedo: boolean;
  busy: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDiscard: () => void;
  onCommit: () => void;
}) {
  const iconButton =
    "inline-flex size-10 items-center justify-center rounded-control text-body transition-colors hover:bg-surface-soft hover:text-ink disabled:pointer-events-none disabled:opacity-50";
  return (
    <div
      role="toolbar"
      aria-label="변경 사항"
      className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-[14px] border border-line bg-surface p-1.5 shadow-[0_10px_30px_rgb(29_29_29/0.12)] max-sm:bottom-4"
    >
      <button
        type="button"
        aria-label="실행 취소"
        title="실행 취소 (⌘Z)"
        disabled={!canUndo || busy}
        onClick={onUndo}
        className={iconButton}
      >
        <UndoIcon className="size-[1.125rem]" />
      </button>
      <button
        type="button"
        aria-label="다시 실행"
        title="다시 실행 (⇧⌘Z)"
        disabled={!canRedo || busy}
        onClick={onRedo}
        className={iconButton}
      >
        <RedoIcon className="size-[1.125rem]" />
      </button>
      <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />
      <button
        type="button"
        disabled={!pending || busy}
        onClick={onDiscard}
        className="inline-flex h-10 items-center rounded-control px-3.5 text-small font-semibold whitespace-nowrap text-body transition-colors hover:bg-surface-soft hover:text-ink disabled:pointer-events-none disabled:opacity-50"
      >
        취소
      </button>
      <button
        type="button"
        disabled={!pending || busy}
        onClick={onCommit}
        className={buttonClassName({ variant: "dark", size: "sm", fullWidthOnMobile: false })}
      >
        {busy ? "업데이트 중…" : "DB 업데이트"}
        {pending && !busy ? (
          <span className="rounded-full bg-white/20 px-1.5 text-label tabular-nums">{pending}</span>
        ) : null}
      </button>
    </div>
  );
}
