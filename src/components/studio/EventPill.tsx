"use client";

import clsx from "clsx";
import Link from "next/link";
import { useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";

const PAD = 10; // px on each side of the label
const FADE = "linear-gradient(to right, black calc(100% - 14px), transparent)";

/**
 * One calendar entry as a bar over its days. The label is centred; when it
 * is longer than the bar it starts at the left and fades out at the right
 * edge, and on hover the bar stretches to the label's full length with a
 * soft, decelerating ease, then settles back when the pointer leaves. The
 * bar floats above its grid cell, so stretching never moves the calendar.
 */
export function EventPill({
  label,
  href,
  tone,
  faded,
  style,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
}: {
  label: string;
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
        (href || stretched) && open && "shadow-[0_6px_18px_rgb(29_29_29/0.14)]",
      )}
      style={{
        width: stretched ? size.full : size.base || "100%",
        paddingInline: PAD,
      }}
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

  const events = {
    onMouseEnter: (event: MouseEvent) => {
      setOpen(true);
      onMouseEnter(event);
    },
    onMouseMove,
    onMouseLeave: () => {
      setOpen(false);
      onMouseLeave();
    },
  };

  return (
    <div
      ref={cell}
      className={clsx("relative mx-1 my-2.5", open ? "z-10" : "z-2")}
      style={style}
      {...events}
    >
      {href ? (
        <Link href={href} className="absolute inset-0 rounded-lg" aria-label={label}>
          {pill}
        </Link>
      ) : (
        pill
      )}
    </div>
  );
}
