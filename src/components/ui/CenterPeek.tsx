"use client";

import clsx from "clsx";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const subscribeNothing = () => () => {};

// Decelerating curve of the kind used for sheets and zoom transitions.
const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const OPEN_MS = 560;
const CLOSE_MS = 420;

type Origin = () => DOMRect | null | undefined;
type Motion = { shell: Keyframe; panel: Keyframe } | null;

/**
 * The state in which the panel coincides with its origin: moved onto the
 * origin's corner and clipped to its size. Nothing is scaled, so the content
 * keeps its real size and position throughout; only the visible window grows.
 */
function atOrigin(shell: HTMLElement, origin: Origin | undefined, radius: string): Motion {
  const from = origin?.();
  if (!from || !from.width || !from.height) return null;
  // Layout box rather than getBoundingClientRect, which would include the
  // transform of an animation in progress. The offset parent is the
  // full-window layer, so these are window coordinates.
  const width = shell.offsetWidth;
  const height = shell.offsetHeight;
  const right = Math.max(0, width - from.width);
  const bottom = Math.max(0, height - from.height);
  return {
    shell: {
      transform: `translate(${from.left - shell.offsetLeft}px, ${from.top - shell.offsetTop}px)`,
    },
    panel: { clipPath: `inset(0px ${right}px ${bottom}px 0px round ${radius})` },
  };
}

/**
 * A panel opened over the page, centred with the page blurred behind it; on
 * phones it fills the screen.
 *
 * With `origin` the panel starts exactly where that element is and at its
 * size, then unfolds to its own place, and folds back on close. When the
 * panel's top looks like the origin (same content, same padding), the element
 * appears to turn into the panel. Without an origin it fades and rises.
 *
 * Rendered at the end of <body>, so a transformed ancestor cannot trap it.
 */
export function CenterPeek({
  label,
  onClose,
  origin,
  originRadius = "14px",
  children,
  className,
}: {
  /** Accessible name of the dialog. */
  label: string;
  /** Called once the closing animation has finished. */
  onClose: () => void;
  /** Current rectangle of the element this panel opens from. */
  origin?: Origin;
  /** Corner radius of that element. */
  originRadius?: string;
  children: ReactNode;
  /** Size, padding and surface of the panel. */
  className?: string;
}) {
  const backdrop = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const entered = useRef(false);
  const closing = useRef(false);
  const mounted = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );

  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fullRadius = () =>
    panel.current ? getComputedStyle(panel.current).borderTopLeftRadius : "0px";

  // Parts marked data-peek-origin-only belong to the origin's look (a card's
  // tint, say): they fade away as the panel opens and return as it closes.
  const fadeOriginOnly = (to: 0 | 1, duration: number) => {
    panel.current?.querySelectorAll<HTMLElement>("[data-peek-origin-only]").forEach((element) => {
      element.animate([{ opacity: 1 - to }, { opacity: to }], {
        duration,
        easing: "ease-in-out",
        fill: "forwards",
      });
    });
  };

  useLayoutEffect(() => {
    if (!mounted || !shell.current || !panel.current || entered.current) return;
    entered.current = true;
    if (reducedMotion()) {
      fadeOriginOnly(0, 0);
      return;
    }
    fadeOriginOnly(0, OPEN_MS);
    const options = { duration: OPEN_MS, easing: EASING } as const;
    const start = atOrigin(shell.current, origin, originRadius);
    if (start) {
      shell.current.animate([start.shell, { transform: "none" }], options);
      panel.current.animate(
        [start.panel, { clipPath: `inset(0px 0px 0px 0px round ${fullRadius()})` }],
        options,
      );
    } else {
      shell.current.animate(
        [
          { transform: "translateY(16px)", opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        options,
      );
    }
    backdrop.current?.animate([{ opacity: 0 }, { opacity: 1 }], options);
    closeButton.current?.animate(
      [{ opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1 }],
      options,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, when the portal mounts
  }, [mounted]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    if (!shell.current || !panel.current || reducedMotion()) {
      onClose();
      return;
    }
    // Back to the top, where the panel looks like its origin again.
    panel.current.scrollTop = 0;
    fadeOriginOnly(1, CLOSE_MS);
    const options = { duration: CLOSE_MS, easing: EASING, fill: "forwards" } as const;
    const end = atOrigin(shell.current, origin, originRadius);
    let last: Animation;
    if (end) {
      shell.current.animate([{ transform: "none" }, end.shell], options);
      last = panel.current.animate(
        [{ clipPath: `inset(0px 0px 0px 0px round ${fullRadius()})` }, end.panel],
        options,
      );
    } else {
      last = shell.current.animate(
        [
          { transform: "none", opacity: 1 },
          { transform: "translateY(16px)", opacity: 0 },
        ],
        options,
      );
    }
    backdrop.current?.animate([{ opacity: 1 }, { opacity: 0 }], options);
    closeButton.current?.animate(
      [{ opacity: 1 }, { opacity: 0, offset: 0.3 }, { opacity: 0 }],
      options,
    );
    last.onfinish = onClose;
    last.oncancel = onClose;
  }, [onClose, origin, originRadius]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-center justify-center px-6 pt-16 pb-8 max-sm:p-0"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      {/* Its own layer, so the blur fades independently of the panel. */}
      <div
        ref={backdrop}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-ink/35 backdrop-blur-md"
      />
      {/* Moves; the shadow is a filter so that it follows the panel's clipped outline. */}
      <div
        ref={shell}
        className="relative w-full max-w-[1120px] drop-shadow-[0_24px_60px_rgb(29_29_29/0.2)] will-change-transform max-sm:drop-shadow-none"
      >
        {/* Beside the panel on wide screens, so it never covers the panel's own controls. */}
        <button
          ref={closeButton}
          type="button"
          onClick={close}
          aria-label="닫기"
          className="absolute -top-12 right-0 z-10 inline-flex size-10 cursor-pointer items-center justify-center rounded-full bg-surface text-body shadow-[0_2px_10px_rgb(29_29_29/0.14)] transition-colors hover:text-ink max-sm:fixed max-sm:top-2 max-sm:right-2"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="m3.5 3.5 9 9m0-9-9 9" />
          </svg>
        </button>
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className={clsx(
            "max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain rounded-[20px] bg-surface max-sm:h-dvh max-sm:max-h-none max-sm:rounded-none",
            className ?? "p-12 max-lg:p-8 max-sm:p-5 max-sm:pt-14",
          )}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
