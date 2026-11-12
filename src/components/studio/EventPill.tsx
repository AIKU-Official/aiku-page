"use client";

import clsx from "clsx";
import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
} from "react";

const PAD = 10; // px on each side of the label
const FADE = "linear-gradient(to right, black calc(100% - 14px), transparent)";

const isTouch = () => window.matchMedia("(pointer: coarse)").matches;

/** A point at the middle of an element, standing in for the cursor (focus, taps). */
const centreOf = (element: Element) => {
  const box = element.getBoundingClientRect();
  return { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 } as MouseEvent;
};

/**
 * One calendar entry as a bar over its days. The label is centred; when it
 * is longer than the bar it starts at the left and fades out at the right
 * edge, and on hover or focus the bar stretches to the label's full length
 * with a soft, decelerating ease, then settles back. The bar floats above
 * its grid cell, so stretching never moves the calendar.
 *
 * The details card beside it shows on hover, on keyboard focus and, on touch
 * screens, on a first tap; a second tap opens the entry's page and a tap
 * elsewhere closes the card. Entries without a page are buttons, so they can
 * be reached by keyboard too.
 */
export function EventPill({
  label,
  description,
  href,
  tone,
  faded,
  style,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
}: {
  label: string;
  /** What the entry is, read out in full: kind, title and date. */
  description: string;
  href: string | null;
  tone: string;
  /** Past entries are paler. */
  faded: boolean;
  /** The grid placement (row and the columns of its days). */
  style: CSSProperties;
  onMouseEnter: (event: MouseEvent) => void;
  onMouseMove: (event: MouseEvent) => void;
  onMouseLeave: () => void;
}) {
  const cell = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState({ base: 0, full: 0 });
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const base = cell.current?.clientWidth ?? 0;
      const full = (text.current?.offsetWidth ?? 0) + PAD * 2 + 2;
      setSize((current) =>
        current.base === base && current.full === full ? current : { base, full },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (cell.current) observer.observe(cell.current);
    return () => observer.disconnect();
  }, [label]);

  const show = (event: MouseEvent) => {
    setOpen(true);
    onMouseEnter(event);
  };
  const hide = () => {
    setOpen(false);
    onMouseLeave();
  };

  // On a touch screen an open card closes with a tap anywhere else.
  useEffect(() => {
    if (!open || !isTouch()) return;
    const away = (event: PointerEvent) => {
      if (!cell.current?.contains(event.target as Node)) hide();
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
    // hide is recreated each render; the listener only needs the latest open state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const overflows = size.full > size.base + 1;
  const stretched = open && overflows;

  const pill = (
    <span
      className={clsx(
        "absolute inset-y-0 left-0 flex items-center overflow-hidden rounded-lg border text-label font-semibold",
        "transition-[width,box-shadow,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
        tone,
        faded && !open && "opacity-55",
        overflows && !stretched ? "justify-start" : "justify-center",
        open && "shadow-raised",
      )}
      style={{ width: stretched ? size.full : size.base || "100%", paddingInline: PAD }}
    >
      <span
        className="block min-w-0 overflow-hidden"
        style={overflows && !stretched ? { maskImage: FADE, WebkitMaskImage: FADE } : undefined}
      >
        <span ref={text} className="block w-max whitespace-nowrap">
          {label}
        </span>
      </span>
    </span>
  );

  const target = {
    "aria-label": description,
    className:
      "absolute inset-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
    onFocus: (event: FocusEvent) => show(centreOf(event.currentTarget)),
    onBlur: hide,
  };

  return (
    <div
      ref={cell}
      className={clsx("relative mx-1 my-2.5", open ? "z-10" : "z-2")}
      style={style}
      onMouseEnter={(event) => !isTouch() && show(event)}
      onMouseMove={onMouseMove}
      onMouseLeave={() => !isTouch() && hide()}
    >
      {href ? (
        <Link
          href={href}
          {...target}
          onClick={(event) => {
            // First tap on a touch screen: show the card; the next tap follows the link.
            if (isTouch() && !open) {
              event.preventDefault();
              show(centreOf(event.currentTarget));
            }
          }}
        >
          {pill}
        </Link>
      ) : (
        <button
          type="button"
          {...target}
          onClick={(event) => (open ? hide() : show(centreOf(event.currentTarget)))}
        >
          {pill}
        </button>
      )}
    </div>
  );
}
