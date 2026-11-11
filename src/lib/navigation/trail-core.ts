/**
 * The trail of pages visited in one tab, kept the way the browser keeps its
 * history: the pages behind the current one, the current page, and the pages
 * ahead of it after going back. Pure functions, so the rules can be tested.
 *
 * How each navigation moves the trail:
 * - push   (a link or router.push): the current page goes behind; the pages
 *          ahead are dropped. Visiting a page seen before is still a push.
 * - pop    (browser back / forward, router.back): one step back when the
 *          destination is the page behind, one step forward when it is the
 *          page ahead, otherwise a jump to the nearest matching page behind.
 * - reset  (the site's own navigation: header, account menu, footer): like a
 *          push, but the destination is marked as a starting point, so it
 *          offers no way back. The pages behind it are kept, because the
 *          browser keeps them too: its back button still reaches them, and the
 *          trail has to stay in step to label the pages there correctly.
 * - reload (the same page loaded again): nothing changes.
 */

export type TrailStep = {
  path: string;
  title: string;
  /** Reached from the site's navigation: the start of a trail. */
  root?: boolean;
};
export type Trail = { back: TrailStep[]; current: TrailStep | null; forward: TrailStep[] };
export type Move = "push" | "pop" | "reset" | "reload";

export const emptyTrail: Trail = { back: [], current: null, forward: [] };

const MAX_STEPS = 40;

export function move(trail: Trail, kind: Move, path: string): Trail {
  const arrived: TrailStep =
    kind === "reset" ? { path, title: "", root: true } : { path, title: "" };
  const { back, current, forward } = trail;

  if (!current) return { back: [], current: arrived, forward: [] };
  if (current.path === path) return trail; // a hash or query change, or a reload

  if (kind === "pop") {
    if (back.at(-1)?.path === path) {
      return { back: back.slice(0, -1), current: back.at(-1)!, forward: [...forward, current] };
    }
    if (forward.at(-1)?.path === path) {
      return { back: [...back, current], current: forward.at(-1)!, forward: forward.slice(0, -1) };
    }
    const index = back.map((step) => step.path).lastIndexOf(path);
    if (index !== -1) {
      return {
        back: back.slice(0, index),
        current: back[index],
        forward: [...forward, current, ...back.slice(index + 1).reverse()],
      };
    }
    // A history entry the trail never saw: keep going from here.
  }

  return { back: [...back, current].slice(-MAX_STEPS), current: arrived, forward: [] };
}

/** Records the current page's title once it is known. */
export function name(trail: Trail, path: string, title: string): Trail {
  if (!trail.current || trail.current.path !== path || !title || trail.current.title === title) {
    return trail;
  }
  return { ...trail, current: { ...trail.current, title } };
}

/** The page a back link should lead to, or null when there is none in this tab. */
export const previous = (trail: Trail): TrailStep | null =>
  trail.current?.root ? null : (trail.back.at(-1) ?? null);
