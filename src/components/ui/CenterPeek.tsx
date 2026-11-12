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

import { CloseIcon, CollapseIcon, ExpandIcon } from "@/components/ui/icons";
import { type PeekBlend, PeekMotion, type PeekOrigin } from "@/components/ui/peek-motion";

const subscribeNothing = () => () => {};

const controlClassName =
  "inline-flex size-10 cursor-pointer items-center justify-center rounded-full bg-surface text-body shadow-[0_2px_10px_rgb(29_29_29/0.14)] transition-colors hover:text-ink";

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
  blend = "morph",
  expandable = true,
  width = "max-w-[1120px]",
  children,
  className,
}: {
  /** Accessible name of the dialog. */
  label: string;
  /** Called once the closing animation has finished. */
  onClose: () => void;
  /** Current rectangle of the element this panel opens from. */
  origin?: PeekOrigin;
  /** Corner radius of that element. */
  originRadius?: string;
  /** When set, the expand control opens this page instead of filling the window. */
  expandHref?: string;
  /**
   * How the panel meets its origin: "morph" when it takes the origin's place
   * (a card), "fade" when the origin stays visible (a button).
   */
  blend?: PeekBlend;
  /** False hides the full-screen control (a short panel gains nothing from it). */
  expandable?: boolean;
  /** Largest width of the floating panel, as a class; it stays centred. */
  width?: string;
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

  const motion = () =>
    shell.current && panel.current
      ? new PeekMotion(
          { shell: shell.current, panel: panel.current, backdrop: backdrop.current, controls: controls.current },
          origin,
          originRadius,
          blend,
        )
      : null;

  useLayoutEffect(() => {
    if (!mounted || entered.current) return;
    entered.current = true;
    motion()?.open();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, when the portal mounts
  }, [mounted]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    const current = motion();
    if (current) current.close(onClose);
    else onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- motion() reads refs, not state
  }, [onClose, origin, originRadius, blend]);

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
          expanded ? "max-w-none" : clsx(width, "drop-shadow-[0_24px_60px_rgb(29_29_29/0.2)]"),
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
              <ExpandIcon className="size-4" />
            </Link>
          ) : expandable ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-label={expanded ? "창 크기로 보기" : "전체 화면으로 보기"}
              aria-pressed={expanded}
              className={clsx(controlClassName, "max-sm:hidden")}
            >
              {expanded ? <CollapseIcon className="size-4" /> : <ExpandIcon className="size-4" />}
            </button>
          ) : null}
          <button
            ref={closeButton}
            type="button"
            onClick={close}
            aria-label="닫기"
            className={controlClassName}
          >
            <CloseIcon className="size-4" />
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
