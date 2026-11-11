"use client";

import clsx from "clsx";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

const subscribeNothing = () => () => {};

// Decelerating curve of the kind used for sheets and zoom transitions.
const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const OPEN_MS = 560;
const CLOSE_MS = 420;

const controlClassName =
  "inline-flex size-10 cursor-pointer items-center justify-center rounded-full bg-surface text-body shadow-[0_2px_10px_rgb(29_29_29/0.14)] transition-colors hover:text-ink";

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
  expandHref,
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
  /** When set, the expand control opens this page instead of filling the window. */
  expandHref?: string;
  children: ReactNode;
  /** Size, padding and surface of the panel. */
  className?: string;
}) {
  const backdrop = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const controls = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const entered = useRef(false);
  const closing = useRef(false);
  // Fills the window instead of floating in the middle of it.
  const [expanded, setExpanded] = useState(false);
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
  // Parts marked data-peek-panel-only are the reverse: absent while the panel
  // still looks like its origin, faded in as it opens.
  const fadeOriginOnly = (to: 0 | 1, duration: number) => {
    const fade = (selector: string, target: number) =>
      panel.current?.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        element.animate([{ opacity: 1 - target }, { opacity: target }], {
          duration,
          easing: "ease-in-out",
          fill: "forwards",
        });
      });
    fade("[data-peek-origin-only]", to);
    fade("[data-peek-panel-only]", 1 - to);
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
      className={clsx(
        "fixed inset-0 z-40 flex items-center justify-center max-sm:p-0",
        expanded ? "p-0" : "px-6 pt-16 pb-8",
      )}
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
        className={clsx(
          "relative w-full will-change-transform max-sm:drop-shadow-none",
          expanded ? "max-w-none" : "max-w-[1120px] drop-shadow-[0_24px_60px_rgb(29_29_29/0.2)]",
        )}
      >
        {/* Beside the panel on wide screens, so they never cover the panel's own controls. */}
        <div
          ref={controls}
          className={clsx(
            "z-10 flex gap-2 max-sm:fixed max-sm:top-2 max-sm:right-2",
            expanded ? "fixed top-3 right-4" : "absolute -top-12 right-0",
          )}
        >
          {expandHref ? (
            <Link
              href={expandHref}
              aria-label="페이지로 열기"
              title="페이지로 열기"
              className={clsx(controlClassName, "max-sm:hidden")}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9.5 2.5h4v4m-7 7h-4v-4" />
              </svg>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-label={expanded ? "창 크기로 보기" : "전체 화면으로 보기"}
              aria-pressed={expanded}
              className={clsx(controlClassName, "max-sm:hidden")}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {expanded ? (
                  <path d="M6.5 2.5v4h-4m11 3h-4v4" />
                ) : (
                  <path d="M9.5 2.5h4v4m-7 7h-4v-4" />
                )}
              </svg>
            </button>
          )}
          <button
            ref={closeButton}
            type="button"
            onClick={close}
            aria-label="닫기"
            className={controlClassName}
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
        </div>
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className={clsx(
            "overflow-y-auto overscroll-contain bg-surface max-sm:h-dvh max-sm:max-h-none max-sm:rounded-none",
            expanded ? "h-dvh rounded-none" : "max-h-[calc(100dvh-6rem)] rounded-[20px]",
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
