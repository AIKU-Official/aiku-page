"use client";

/**
 * The trail of pages visited in this tab, so a page can offer a way back to
 * the exact page before it (a profile → one of its projects → a teammate's
 * profile → …), labelled with that page's title. It mirrors the browser
 * history: moving to a new page appends, going back removes the last step.
 */

export type TrailStep = { path: string; title: string };

const KEY = "aiku-trail";
const MAX_STEPS = 30;
const listeners = new Set<() => void>();

let cached: TrailStep[] | null = null;
let cachedRaw: string | null = null;

function read(): TrailStep[] {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(KEY);
  } catch {
    // Storage blocked: the trail is simply empty.
  }
  if (raw !== cachedRaw || cached === null) {
    cachedRaw = raw;
    try {
      cached = raw ? (JSON.parse(raw) as TrailStep[]) : [];
    } catch {
      cached = [];
    }
  }
  return cached;
}

function write(steps: TrailStep[]) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(steps.slice(-MAX_STEPS)));
  } catch {
    // Storage blocked: nothing to remember.
  }
  listeners.forEach((listener) => listener());
}

/** Page title without the site suffix ("HanCLIP | AIKU" → "HanCLIP"). */
const pageTitle = () => document.title.replace(/\s*\|\s*AIKU\s*$/, "").trim();

/** Records that `path` is now showing. Called on every navigation. */
export function visit(path: string) {
  const steps = read();
  const top = steps.at(-1);
  if (top?.path === path) return;
  if (steps.at(-2)?.path === path) {
    write(steps.slice(0, -1)); // went back one step
    return;
  }
  write([...steps, { path, title: "" }]);
}

/** Fills in the current step's title once the page has set it. */
export function nameCurrentStep(path: string) {
  const steps = read();
  const top = steps.at(-1);
  const title = pageTitle();
  if (top?.path === path && title && top.title !== title) {
    write([...steps.slice(0, -1), { path, title }]);
  }
}

export function subscribeTrail(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The step before the current page, or null when this page was the first in the tab. */
export function previousStep(): TrailStep | null {
  const steps = read();
  return steps.length >= 2 ? (steps.at(-2) ?? null) : null;
}
