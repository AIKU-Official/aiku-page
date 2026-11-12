// The one motion every centre peek uses: the panel unfolds from the element it
// opens from and folds back into it. How it meets that element is the blend:
//
//   "morph"  The panel takes the element's place (a project or member card,
//            which looks just like the panel's top): it lands exactly on it
//            and is swapped for it, with no fade, so the card never vanishes.
//   "fade"   The element stays where it is (a button): the panel fades in as
//            it leaves it and fades out as it returns, so nothing pops.
//
// Kept apart from the component so the motion has a single definition.

const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
export const OPEN_MS = 560;
export const CLOSE_MS = 420;

/** Returns the current rectangle of the element the panel opens from. */
export type PeekOrigin = () => DOMRect | null | undefined;

export type PeekBlend = "morph" | "fade";

type Pose = { shell: Keyframe; panel: Keyframe };

export type PeekParts = {
  /** Moves; carries the shadow, so fading it fades the whole panel. */
  shell: HTMLElement;
  /** Scrolls and is clipped to the origin's outline. */
  panel: HTMLElement;
  backdrop: HTMLElement | null;
  /** The close (and expand) buttons beside the panel. */
  controls: HTMLElement | null;
};

export class PeekMotion {
  constructor(
    private readonly parts: PeekParts,
    private readonly origin: PeekOrigin | undefined,
    private readonly originRadius: string,
    private readonly blend: PeekBlend = "morph",
  ) {}

  static prefersReducedMotion(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /** Unfolds the panel from its origin (or rises and fades in without one). */
  open(): void {
    if (PeekMotion.prefersReducedMotion()) {
      this.fadeMarked("in", 0);
      return;
    }
    const timing = { duration: OPEN_MS, easing: EASING } as const;
    this.fadeMarked("in", OPEN_MS);
    const from = this.atOrigin();
    if (from) {
      this.parts.shell.animate(
        this.blend === "fade"
          ? [{ ...from.shell, opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: "none", opacity: 1 }]
          : [from.shell, { transform: "none" }],
        timing,
      );
      this.parts.panel.animate([from.panel, { clipPath: this.fullClip() }], timing);
    } else {
      this.parts.shell.animate(
        [
          { transform: "translateY(16px)", opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        timing,
      );
    }
    this.parts.backdrop?.animate([{ opacity: 0 }, { opacity: 1 }], timing);
    this.parts.controls?.animate([{ opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1 }], timing);
  }

  /** Folds the panel back into its origin, fading out on the way; then calls `done`. */
  close(done: () => void): void {
    if (PeekMotion.prefersReducedMotion()) {
      done();
      return;
    }
    // Back to the top, where the panel looks like its origin again.
    this.parts.panel.scrollTop = 0;
    const timing = { duration: CLOSE_MS, easing: EASING, fill: "forwards" } as const;
    this.fadeMarked("out", CLOSE_MS);
    const to = this.atOrigin();
    const shell = to
      ? this.parts.shell.animate(
          this.blend === "fade"
            ? [{ transform: "none", opacity: 1 }, { opacity: 1, offset: 0.45 }, { ...to.shell, opacity: 0 }]
            : [{ transform: "none" }, to.shell],
          timing,
        )
      : this.parts.shell.animate(
          [
            { transform: "none", opacity: 1 },
            { transform: "translateY(16px)", opacity: 0 },
          ],
          timing,
        );
    if (to) this.parts.panel.animate([{ clipPath: this.fullClip() }, to.panel], timing);
    this.parts.backdrop?.animate([{ opacity: 1 }, { opacity: 0 }], timing);
    this.parts.controls?.animate([{ opacity: 1 }, { opacity: 0, offset: 0.3 }, { opacity: 0 }], timing);
    shell.onfinish = done;
    shell.oncancel = done;
  }

  /**
   * The pose in which the panel coincides with its origin: moved onto the
   * origin's corner and clipped to its size. Nothing is scaled, so the content
   * keeps its real size and position throughout; only the visible window grows.
   */
  private atOrigin(): Pose | null {
    const from = this.origin?.();
    if (!from || !from.width || !from.height) return null;
    const { shell } = this.parts;
    // Layout box rather than getBoundingClientRect, which would include the
    // transform of an animation in progress. The offset parent is the
    // full-window layer, so these are window coordinates.
    const right = Math.max(0, shell.offsetWidth - from.width);
    const bottom = Math.max(0, shell.offsetHeight - from.height);
    return {
      shell: { transform: `translate(${from.left - shell.offsetLeft}px, ${from.top - shell.offsetTop}px)` },
      panel: { clipPath: `inset(0px ${right}px ${bottom}px 0px round ${this.originRadius})` },
    };
  }

  private fullClip(): string {
    return `inset(0px 0px 0px 0px round ${getComputedStyle(this.parts.panel).borderTopLeftRadius})`;
  }

  /**
   * Parts marked data-peek-origin-only belong to the origin's look (a card's
   * tint, say) and data-peek-panel-only to the open panel. They swap in turn,
   * never both at once: opening, the origin's look leaves while the panel is
   * still small and the panel's content arrives once there is room; closing
   * runs the other way round.
   */
  private fadeMarked(direction: "in" | "out", duration: number): void {
    const run = (selector: string, keyframes: Keyframe[]) =>
      this.parts.panel.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        element.animate(keyframes, { duration, easing: "ease-out", fill: "forwards" });
      });
    if (direction === "in") {
      run("[data-peek-origin-only]", [{ opacity: 1 }, { opacity: 0, offset: 0.28 }, { opacity: 0 }]);
      run("[data-peek-panel-only]", [
        { opacity: 0, transform: "translateY(10px)" },
        { opacity: 0, transform: "translateY(10px)", offset: 0.22 },
        { opacity: 1, transform: "none", offset: 0.75 },
        { opacity: 1, transform: "none" },
      ]);
    } else {
      run("[data-peek-panel-only]", [{ opacity: 1 }, { opacity: 0, offset: 0.35 }, { opacity: 0 }]);
      run("[data-peek-origin-only]", [{ opacity: 0 }, { opacity: 0, offset: 0.45 }, { opacity: 1 }]);
    }
  }
}
