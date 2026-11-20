// The Feed badge in the side panel: how many posts arrived since this person last looked at the feed.
// "Last looked" is the newest post time they have seen, kept in this browser only.
import { useEffect, useState } from "react";
import { API_URL } from "./api";
import { feed } from "./v3";

const KEY = "fde:feed-seen";
const EVENT = "fde:feed-seen";
const POLL_MS = 120000;

const read = (): number => { try { return Number(localStorage.getItem(KEY) ?? 0) || 0; } catch { return 0; } };

/** The feed calls this with the newest post time it showed. */
export function markFeedSeen(iso: string | undefined) {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t) || t <= read()) return;
  try { localStorage.setItem(KEY, String(t)); } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(EVENT));
}

/** Posts by other people newer than the last one seen. 0 while on the feed, or before the feed was ever opened here. */
export function useUnseenPosts(meId: string | undefined, onFeed: boolean, programId: string | undefined): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (onFeed || !API_URL || !meId || !programId) { setN(0); return; }
    let alive = true;
    const check = async () => {
      const seen = read();
      if (!seen || document.visibilityState !== "visible") { if (!seen) setN(0); return; }
      try {
        const r = await feed.list({ program_id: programId, sort: "new", limit: 10 });
        if (alive) setN(r.items.filter((p) => p.author.id !== meId && Date.parse(p.created_at) > seen).length);
      } catch { /* the badge is a nicety; a failed check changes nothing */ }
    };
    void check();
    const t = window.setInterval(() => void check(), POLL_MS);
    const onSeen = () => void check();
    document.addEventListener("visibilitychange", onSeen);
    window.addEventListener(EVENT, onSeen);
    return () => { alive = false; window.clearInterval(t); document.removeEventListener("visibilitychange", onSeen); window.removeEventListener(EVENT, onSeen); };
  }, [meId, onFeed, programId]);
  return n;
}
