import { describe, expect, it } from "vitest";

import { emptyTrail, move, previous, type Move, type Trail } from "./trail-core";

const walk = (...steps: [Move, string][]): Trail =>
  steps.reduce((trail, [kind, path]) => move(trail, kind, path), emptyTrail);
const paths = (trail: Trail) => ({
  back: trail.back.map((step) => step.path),
  current: trail.current?.path,
  forward: trail.forward.map((step) => step.path),
});

describe("trail", () => {
  it("goes back to the page a link was followed from, even when that page was seen before", () => {
    // Members → 장서현 → 양자양자 → 장서현 (the teammate link on the project page)
    const trail = walk(
      ["reset", "/members"],
      ["push", "/members/jang"],
      ["push", "/projects/yangja"],
      ["push", "/members/jang"],
    );
    expect(previous(trail)?.path).toBe("/projects/yangja");
    expect(paths(trail).back).toEqual(["/members", "/members/jang", "/projects/yangja"]);
  });

  it("steps back one page at a time and forward again", () => {
    let trail = walk(["reset", "/members"], ["push", "/members/a"], ["push", "/projects/x"]);
    trail = move(trail, "pop", "/members/a");
    expect(paths(trail)).toEqual({
      back: ["/members"],
      current: "/members/a",
      forward: ["/projects/x"],
    });
    trail = move(trail, "pop", "/members");
    expect(previous(trail)).toBeNull();
    trail = move(trail, "pop", "/members/a");
    expect(paths(trail)).toEqual({
      back: ["/members"],
      current: "/members/a",
      forward: ["/projects/x"],
    });
  });

  it("tells back from forward when both lead to the same page", () => {
    // A → B → A, then back: the destination B is behind, not ahead.
    let trail = walk(["reset", "/a"], ["push", "/b"], ["push", "/a"]);
    trail = move(trail, "pop", "/b");
    expect(paths(trail)).toEqual({ back: ["/a"], current: "/b", forward: ["/a"] });
  });

  it("drops the pages ahead when a new link is followed after going back", () => {
    let trail = walk(["reset", "/a"], ["push", "/b"], ["push", "/c"]);
    trail = move(trail, "pop", "/b");
    trail = move(trail, "push", "/d");
    expect(paths(trail)).toEqual({ back: ["/a", "/b"], current: "/d", forward: [] });
  });

  it("starts over from the site's navigation", () => {
    const trail = walk(["reset", "/members"], ["push", "/members/a"], ["reset", "/profile"]);
    expect(previous(trail)).toBeNull();
  });

  it("stays in step with the browser when going back past a starting point", () => {
    // A → B, then the header to /projects, a card, and back twice.
    let trail = walk(
      ["reset", "/a"],
      ["push", "/b"],
      ["reset", "/projects"],
      ["push", "/projects/x"],
    );
    expect(previous(trail)?.path).toBe("/projects");
    trail = move(trail, "pop", "/projects");
    expect(previous(trail)).toBeNull();
    trail = move(trail, "pop", "/b");
    expect(previous(trail)?.path).toBe("/a");
  });

  it("ignores reloads and changes that keep the page", () => {
    const trail = walk(["reset", "/a"], ["push", "/b"], ["reload", "/b"], ["push", "/b"]);
    expect(paths(trail)).toEqual({ back: ["/a"], current: "/b", forward: [] });
  });

  it("jumps several steps back at once", () => {
    let trail = walk(["reset", "/a"], ["push", "/b"], ["push", "/c"], ["push", "/d"]);
    trail = move(trail, "pop", "/b");
    expect(paths(trail)).toEqual({ back: ["/a"], current: "/b", forward: ["/d", "/c"] });
  });
});
