"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import {
  useId,
  useOptimistic,
  useTransition,
  type KeyboardEventHandler,
  type PointerEventHandler,
  type ReactNode,
} from "react";

type SortableListProps<T> = {
  items: T[];
  getId: (item: T) => string;
  /** Accessible name of an item, used for its drag handle. */
  getLabel: (item: T) => string;
  /** Saves the new order. The list shows it right away and snaps back if saving fails. */
  onReorder: (ids: string[]) => Promise<unknown>;
  /** `handle` is the ⋮⋮ drag handle to place inside the row. */
  renderItem: (item: T, index: number, handle: ReactNode) => ReactNode;
  /**
   * "row": the whole row can be grabbed with a pointer (legacy behavior).
   * "handle": only the handle drags, for rows that contain another sortable list.
   */
  dragBy?: "row" | "handle";
  className?: string;
};

const announcements: Announcements = {
  onDragStart: () => "항목을 들었습니다. 방향키로 옮기고 스페이스로 내려놓으세요.",
  onDragOver: ({ over }) => (over ? "다른 항목 위로 옮겼습니다." : "목록 밖으로 옮겼습니다."),
  onDragEnd: ({ over }) => (over ? "항목을 내려놓았습니다." : "옮기기를 취소했습니다."),
  onDragCancel: () => "옮기기를 취소했습니다.",
};

const screenReaderInstructions = {
  draggable:
    "순서를 바꾸려면 스페이스를 눌러 항목을 들고, 방향키로 옮긴 뒤 스페이스로 내려놓으세요.",
};

/** Vertical drag-and-drop list that saves its order through `onReorder`. */
export function SortableList<T>({
  items,
  getId,
  getLabel,
  onReorder,
  renderItem,
  dragBy = "row",
  className,
}: SortableListProps<T>) {
  const dndId = useId();
  const [optimisticIds, setOptimisticIds] = useOptimistic(items.map(getId));
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const byId = new Map(items.map((item) => [getId(item), item]));
  const ordered = optimisticIds.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }
    const next = arrayMove(
      optimisticIds,
      optimisticIds.indexOf(String(active.id)),
      optimisticIds.indexOf(String(over.id)),
    );
    startTransition(async () => {
      setOptimisticIds(next);
      await onReorder(next);
    });
  };

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      accessibility={{ announcements, screenReaderInstructions }}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={optimisticIds} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {ordered.map((item, index) => (
            <SortableRow
              key={getId(item)}
              id={getId(item)}
              label={getLabel(item)}
              dragBy={dragBy}
              render={(handle) => renderItem(item, index, handle)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  label,
  dragBy,
  render,
}: {
  id: string;
  label: string;
  dragBy: "row" | "handle";
  render: (handle: ReactNode) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // With dragBy "row" a pointer can grab anywhere on the row, while keyboard
  // dragging stays on the focusable handle.
  const byRow = dragBy === "row";
  // dnd-kit types its listeners loosely as Function.
  const onPointerDown = listeners?.onPointerDown as PointerEventHandler | undefined;
  const onKeyDown = listeners?.onKeyDown as KeyboardEventHandler | undefined;

  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      aria-label={`${label} 순서 옮기기`}
      {...attributes}
      {...(byRow ? { onKeyDown } : listeners)}
      className="inline-flex h-9 w-7 cursor-grab touch-none items-center justify-center rounded-control border border-soft-line bg-surface-soft text-small leading-none font-bold text-green-700 active:cursor-grabbing"
    >
      <span aria-hidden="true">⋮⋮</span>
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...(byRow ? { onPointerDown } : {})}
      className={clsx(
        "relative",
        byRow && "cursor-grab active:cursor-grabbing",
        isDragging ? "z-10 bg-green-50 opacity-48" : "bg-surface",
      )}
    >
      {render(handle)}
    </div>
  );
}
