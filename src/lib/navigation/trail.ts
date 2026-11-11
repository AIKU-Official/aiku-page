"use client";

import {
  emptyTrail,
  move,
  name,
  previous,
  type Move,
  type Trail,
  type TrailStep,
} from "./trail-core";

export type { TrailStep };

// Browser side of the trail (rules in trail-core.ts): kept per tab in
// sessionStorage, told how each navigation happened.

const KEY = "aiku-trail";
const listeners = new Set<() => void>();
let cached: { raw: string | null; trail: Trail } | null = null;

function read(): Trail {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(KEY);
  } catch {
    // Storage blocked: the trail lives only as long as the page.
  }
  if (cached && cached.raw === raw) return cached.trail;
  let trail = emptyTrail;
  try {
    trail = raw ? (JSON.parse(raw) as Trail) : emptyTrail;
  } catch {
    // Unreadable: start over.
  }
  cached = { raw, trail };
  return trail;
}

function write(trail: Trail) {
  const raw = JSON.stringify(trail);
  try {
    window.sessionStorage.setItem(KEY, raw);
  } catch {
    // Storage blocked: keep it in memory.
  }
  cached = { raw, trail };
  listeners.forEach((listener) => listener());
}

// How the next page change came about, and to which page. A history
// traversal fires `popstate` before the router renders the destination;
// everything else is a link. The path guards against a note that never gets
// used (a traversal between two anchors of one page, a click on the link to
// the page already shown) being applied to a later, unrelated change.
let pending: { kind: Move; path: string | null } | null = null;
let listening = false;

function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener("popstate", () => {
    pending = { kind: "pop", path: window.location.pathname };
  });
  // The first page this document shows: reloaded, reached through history, or opened.
  const entry = performance.getEntriesByType("navigation")[0] as
    PerformanceNavigationTiming | undefined;
  const kind =
    entry?.type === "reload" ? "reload" : entry?.type === "back_forward" ? "pop" : "push";
  pending = { kind, path: null };
}

/** Called by the site's own navigation: the page at `href` starts a new trail. */
export function startTrail(href: string) {
  pending = { kind: "reset", path: new URL(href, window.location.href).pathname };
}

/** Records that `path` is now showing. Called on every page change. */
export function visit(path: string) {
  listen();
  const kind = pending && (pending.path === null || pending.path === path) ? pending.kind : "push";
  pending = null;
  write(move(read(), kind, path));
}

/** Fills in the current page's title once the page has set it. */
export function nameCurrentStep(path: string) {
  // The home page carries the full site title; "홈" reads better as a step.
  const title = path === "/" ? "홈" : document.title.replace(/\s*\|\s*AIKU\s*$/, "").trim();
  const trail = read();
  const named = name(trail, path, title);
  if (named !== trail) write(named);
}

export function subscribeTrail(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The page before the current one in this tab, or null. */
export const previousStep = (): TrailStep | null => previous(read());
