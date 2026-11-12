"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/Button";

/**
 * Asks before an action that cannot be taken back. A native modal <dialog>, so
 * focus stays inside and the page behind cannot be clicked; Escape, the
 * backdrop and the cancel button all answer no, and the cancel button has
 * focus so a stray Enter does nothing harmful.
 *
 * Rendered at the end of <body> with aria-modal, so an open CenterPeek
 * underneath treats it as the topmost layer and leaves Escape to it.
 */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel = "돌아가기",
  tone = "default",
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** "danger" for an action that throws work away. */
  tone?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    return () => element.close();
  }, []);

  return createPortal(
    <dialog
      ref={dialog}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-[20px] bg-surface p-0 text-body shadow-[0_24px_60px_rgb(29_29_29/0.2)] backdrop:bg-ink/35 backdrop:backdrop-blur-sm"
    >
      <div className="grid gap-5 p-6">
        <div className="grid gap-2">
          <h2 id="confirm-dialog-title" className="text-[1.125rem] font-bold text-ink">
            {title}
          </h2>
          <div className="text-small leading-relaxed text-muted">{children}</div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            fullWidthOnMobile={false}
            onClick={onCancel}
            autoFocus
          >
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "dark"}
            size="sm"
            fullWidthOnMobile={false}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
