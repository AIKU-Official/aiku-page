"use client";

import clsx from "clsx";
import {
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const GAP = 14;
const EDGE = 8;

export type CursorPoint = { x: number; y: number };

const subscribeNothing = () => () => {};

/**
 * Follows the pointer for a small box beside the cursor: call `follow` from
 * mouse enter/move (or a tap), `hide` on leave.
 */
export function useCursorPoint() {
  const [point, setPoint] = useState<CursorPoint | null>(null);
  const follow = (event: MouseEvent) => setPoint({ x: event.clientX, y: event.clientY });
  return { point, follow, hide: () => setPoint(null) };
}

/**
 * A small box beside the cursor (hover cards, attendance details), with one
 * surface for all of them: a card with the raised shadow. Callers set layout. Rendered at
 * the end of <body>, so a transformed ancestor such as an open centre peek
 * cannot move it, and kept inside the window: it flips to the left of the
 * cursor near the right edge and above it near the bottom.
 */
export function CursorTip({
  point,
  className,
  role,
  children,
}: {
  point: CursorPoint;
  className?: string;
  role?: string;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: point.x + GAP, top: point.y + GAP });
  const mounted = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );

  useLayoutEffect(() => {
    const width = box.current?.offsetWidth ?? 0;
    const height = box.current?.offsetHeight ?? 0;
    const right = point.x + GAP + width > window.innerWidth - EDGE;
    const below = point.y + GAP + height <= window.innerHeight - EDGE;
    setPosition({
      left: Math.max(EDGE, right ? point.x - GAP - width : point.x + GAP),
      top: Math.max(EDGE, below ? point.y + GAP : point.y - GAP - height),
    });
  }, [point]);

  if (!mounted) return null;
  return createPortal(
    <div
      ref={box}
      role={role}
      aria-hidden={role ? undefined : true}
      style={position}
      className={clsx("pointer-events-none fixed z-[60] card px-4 py-3.5 shadow-raised", className)}
    >
      {children}
    </div>,
    document.body,
  );
}
