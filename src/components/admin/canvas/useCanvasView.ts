"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

export type View = { x: number; y: number; scale: number };

const MIN_SCALE = 0.2;
const MAX_SCALE = 2;
const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

/**
 * Pan and zoom for an unbounded canvas. The wheel pans (as on a trackpad);
 * with Ctrl or ⌘, or a trackpad pinch, it zooms around the pointer. Touch
 * pinch zooms too. `toWorld` turns screen distances into canvas distances.
 */
export function useCanvasView(container: RefObject<HTMLElement | null>) {
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const viewRef = useRef(view);
  useLayoutEffect(() => {
    viewRef.current = view;
  }, [view]);

  const zoomAt = (factor: number, clientX: number, clientY: number) => {
    const box = container.current?.getBoundingClientRect();
    if (!box) return;
    setView((current) => {
      const scale = clampScale(current.scale * factor);
      const px = clientX - box.left;
      const py = clientY - box.top;
      // Keep the point under the cursor where it is.
      return {
        scale,
        x: px - ((px - current.x) * scale) / current.scale,
        y: py - ((py - current.y) * scale) / current.scale,
      };
    });
  };

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        zoomAt(Math.exp(-event.deltaY * 0.01), event.clientX, event.clientY);
      } else {
        setView((current) => ({ ...current, x: current.x - event.deltaX, y: current.y - event.deltaY }));
      }
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [container, zoomAt]);

  /** Zooms by a step around the centre of the canvas, for the + and - buttons. */
  const zoomBy = (factor: number) => {
    const box = container.current?.getBoundingClientRect();
    if (box) zoomAt(factor, box.left + box.width / 2, box.top + box.height / 2);
  };

  /**
   * Shows the given world box whole, centred, no larger than actual size.
   * With `minScale`, a box too big to read whole is shown from its top-left
   * corner at that scale instead.
   */
  const fit = (box: { x: number; y: number; width: number; height: number }, minScale = MIN_SCALE) => {
    const element = container.current;
    if (!element) return;
    const padding = 72;
    const scale = clampScale(
      Math.min(
        (element.clientWidth - padding * 2) / box.width,
        (element.clientHeight - padding * 2) / box.height,
        1,
      ),
    );
    if (scale < minScale) {
      setView({ scale: minScale, x: padding / 2 - box.x * minScale, y: padding / 2 - box.y * minScale });
      return;
    }
    setView({
      scale,
      x: (element.clientWidth - box.width * scale) / 2 - box.x * scale,
      y: (element.clientHeight - box.height * scale) / 2 - box.y * scale,
    });
  };

  return { view, viewRef, setView, zoomAt, zoomBy, fit };
}
