// Android Back (and the browser Back button) closes the open drawer, dialog or menu first, like a native app.
// Opening a layer adds a history entry for the same address; Back pops it and we close the layer.
// Closing a layer any other way (Esc, the X, a tap outside) removes that entry again with history.back().
// The router's own state is copied into the entry, so React Router sees no change of page.

type Layer = { id: number; close: () => void };
const stack: Layer[] = [];
let nextId = 1;
let ownBacks = 0; // history.back() calls we made ourselves; their popstate must not close anything

const marker = () => (window.history.state as { fdeLayer?: number } | null)?.fdeLayer;

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    if (ownBacks > 0) { ownBacks--; return; }
    // Close every layer whose entry is no longer current (one Back press closes the top layer).
    while (stack.length && stack[stack.length - 1]!.id !== marker()) stack.pop()!.close();
  });
}

/** Call when a layer opens (from the event handler that opens it). Returns its id for closeLayer. */
export function openLayer(close: () => void): number {
  const id = nextId++;
  try { window.history.pushState({ ...(window.history.state ?? {}), fdeLayer: id }, ""); } catch { return id; }
  stack.push({ id, close });
  return id;
}

/** Call when a layer closes without Back. Resolves once the extra history entry is gone, so a navigation can follow safely. */
export function closeLayer(id: number | null | undefined): Promise<void> {
  if (!id) return Promise.resolve();
  const i = stack.findIndex((l) => l.id === id);
  if (i < 0) return Promise.resolve();
  stack.splice(i, 1);
  if (marker() !== id) return Promise.resolve(); // the person navigated away from the layer's entry already
  return new Promise((resolve) => {
    const done = () => { window.removeEventListener("popstate", done); window.clearTimeout(t); resolve(); };
    const t = window.setTimeout(() => { ownBacks = Math.max(0, ownBacks - 1); done(); }, 400); // never wait forever
    window.addEventListener("popstate", done);
    ownBacks++;
    window.history.back();
  });
}
