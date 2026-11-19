// "View as": a reviewer or the admin can switch between the learner's view (do the course, submit proof) and the reviewer's view
// (see what learners submitted, decide). Only the screen changes; the server still checks every action against the real role.
import { useEffect, useState } from "react";
import { canReview, useMe } from "./useRole";

export type View = "learner" | "reviewer";
const KEY = "fde:view";
const EVENT = "fde:view-changed";

function read(): View | null {
  try { const v = localStorage.getItem(KEY); return v === "learner" || v === "reviewer" ? v : null; } catch { return null; }
}

export function setView(v: View) {
  try { localStorage.setItem(KEY, v); } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVENT));
}

/** The view to show. Learners always see the learner view; reviewers and the admin start in the reviewer view and may switch. */
export function useView(): { view: View; canSwitch: boolean; reviewerView: boolean } {
  const { me } = useMe();
  const [saved, setSaved] = useState(read);
  useEffect(() => {
    const on = () => setSaved(read());
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  const canSwitch = canReview(me);
  const view: View = canSwitch ? saved ?? "reviewer" : "learner";
  return { view, canSwitch, reviewerView: view === "reviewer" };
}
