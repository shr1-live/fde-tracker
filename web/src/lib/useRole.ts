import { useEffect, useState } from "react";
import { API_URL, apiJson } from "./api";
import { useStore } from "./store";
import { useDevPersona } from "./devPersona";

export type Me = { id: string; email: string; role: "member" | "reviewer" | "admin"; access: string; batch?: { id: string; name: string; starts_on: string } | null };

// One request per person, shared by every component that asks (the menu and the review page).
const inflight = new Map<string, Promise<Me | null>>();
const fetchedAt = new Map<string, number>();
const STALE_MS = 60000; // a role or batch the admin changed shows up within a minute of coming back to the tab
function load(who: string, fresh = false): Promise<Me | null> {
  let p = inflight.get(who);
  if (fresh && Date.now() - (fetchedAt.get(who) ?? 0) > STALE_MS) p = undefined;
  if (!p) {
    fetchedAt.set(who, Date.now());
    p = apiJson<Me>("GET", "/api/me").catch(() => { inflight.delete(who); return null; }); // a failure is not remembered
    inflight.set(who, p);
  }
  return p;
}

/**
 * The signed-in person's role as the API sees it. The menu uses it to show the review page; the API enforces it anyway,
 * so hiding a link is a convenience, never the protection. Pass something that changes when the person changes.
 */
export function useRole(who: string): { me: Me | null; ready: boolean } {
  const [state, setState] = useState<{ who: string; me: Me | null } | null>(null);
  useEffect(() => {
    if (!API_URL) return;
    let alive = true;
    load(who).then((m) => { if (alive) setState({ who, me: m }); });
    const onVisible = () => { if (document.visibilityState === "visible") load(who, true).then((m) => { if (alive) setState((cur) => (cur?.who === who && JSON.stringify(cur.me) === JSON.stringify(m) ? cur : { who, me: m })); }); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { alive = false; document.removeEventListener("visibilitychange", onVisible); };
  }, [who]);
  // A role fetched for someone else is never used: until this person's answer arrives, there is no role.
  const mine = state?.who === who ? state.me : null;
  return { me: mine, ready: !API_URL || state?.who === who };
}

export const canReview = (me: Me | null) => me?.role === "reviewer" || me?.role === "admin";

/** The role of whoever is signed in right now (or whichever test account is active in a development build). */
export function useMe(): { me: Me | null; ready: boolean } {
  const { user } = useStore();
  const persona = useDevPersona();
  return useRole(persona + "|" + (user?.email ?? ""));
}
