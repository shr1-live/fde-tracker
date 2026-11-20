import { useEffect } from "react";

// Forms with changes that are not saved yet. The shell asks before leaving the page; the browser asks before closing the tab.
const dirty = new Set<string>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", (e) => {
    if (dirty.size) { e.preventDefault(); e.returnValue = ""; }
  });
}

/** Marks a form as having unsaved changes while `isDirty` is true. */
export function useUnsaved(key: string, isDirty: boolean) {
  useEffect(() => {
    if (isDirty) dirty.add(key); else dirty.delete(key);
    return () => { dirty.delete(key); };
  }, [key, isDirty]);
}

export const hasUnsaved = () => dirty.size > 0;
export const clearUnsaved = () => dirty.clear();

/** Compares two value objects, ignoring keys whose value is empty. */
export function sameValues(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const norm = (o: Record<string, unknown>) => JSON.stringify(Object.keys(o).filter((k) => o[k] !== undefined && o[k] !== null && String(o[k]).trim() !== "").sort().map((k) => [k, String(o[k]).trim()]));
  return norm(a) === norm(b);
}
