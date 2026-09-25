// Shape returned by every admin Server Action. Safe to import from client code.

export type ActionResult<T = undefined> =
  { ok: true; message: string; data: T } | { ok: false; message: string };
