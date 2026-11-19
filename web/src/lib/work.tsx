// "My work": one shared, live picture of what the signed-in person has to do, used by the dashboard cards,
// the bell, the Backlog page and the day pages. One server refresh serves all of them.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useStore } from "./store";
import { API_URL, ApiError } from "./api";
import { canReview, useMe, type Me } from "./useRole";
import { useView } from "./viewAs";
import * as sub from "./submissionsApi";
import { PROGRAMME, ProgrammeWeek } from "../data/programme";
import { DayState, logChanges, parseDay, sameDay, startKey, weekStates } from "./backlog";
import * as feedApi from "./feedApi";
import type { FeedItem } from "./feedApi";

const FEED_REFRESH_MS = 60000;
/** Where the time the person last opened the feed is kept (with their other progress). */
export const feedSeenKey = "seen:feed";

const REFRESH_MS = 15000;

export type WorkItem = { week: ProgrammeWeek; state: DayState };
export type WeekWork = { week: ProgrammeWeek; start: Date | null; states: DayState[] };

export type Work = {
  now: Date;
  me: Me | null;
  /** A reviewer reviews; they do not have days of their own to catch up on. */
  learner: boolean;
  /** "server": proof status is refreshed from the server; "local": only the person's own ticks are used. */
  source: "server" | "local";
  updatedAt: Date | null;
  error: string;
  refresh: () => void;
  weeks: WeekWork[];
  items: WorkItem[];
  missed: WorkItem[];
  dueToday: WorkItem[];
  /** Days where the reviewer asked for changes, or a proof is saved but not submitted. */
  proofActions: WorkItem[];
  /** What to do next: today's day, else the first day not yet finished and not missed, else the first missed one. */
  focus: WorkItem | null;
  allDone: boolean;
  totals: { days: number; finished: number; points: number; ticked: number };
  proofTracked: boolean;
  handedIn: number;
  counts: sub.Counts | null;
  /** Weeks with no start date set (so no due dates). */
  weeksWithoutStart: number[];
  /** The person's batch, from the server (null when not in one, or unknown). */
  batch: { id: string; name: string; startsOn: Date } | null;
  /** New feed items since the person last opened the feed, not their own. */
  newInFeed: FeedItem[];
  /** Shares waiting for a reviewer (reviewers and the admin only). */
  sharesWaiting: number | null;
};

const Ctx = createContext<Work | null>(null);
export const useWork = (): Work => {
  const w = useContext(Ctx);
  if (!w) throw new Error("useWork must be used inside WorkProvider");
  return w;
};

type Server = { for: string; proofs: Map<string, sub.Status> | null; counts: sub.Counts | null; at: Date };

export function WorkProvider({ children }: { children: ReactNode }) {
  const { entries, setEntry } = useStore();
  const { me, ready } = useMe();
  const [now, setNow] = useState(() => new Date());
  const [server, setServer] = useState<Server | null>(null);
  const [error, setError] = useState("");
  const who = me ? `${me.email}|${me.role}` : "";
  const reviewer = me?.role === "reviewer";
  const { reviewerView } = useView();

  // the clock: due dates and the end-of-day hour roll over without a reload
  useEffect(() => { const t = window.setInterval(() => setNow(new Date()), 60000); return () => window.clearInterval(t); }, []);

  const load = useCallback(async () => {
    if (!me) return;
    const mineKey = `${me.email}|${me.role}`;
    try {
      const [rows, counts] = await Promise.all([
        me.role === "reviewer" ? Promise.resolve(null) : sub.mine(),
        canReview(me) ? sub.reviewCounts() : Promise.resolve(null),
      ]);
      setServer({ for: mineKey, proofs: rows ? new Map(rows.map((r) => [r.task_key, r.status])) : null, counts, at: new Date() });
      setError("");
    } catch (e) {
      setError(e instanceof ApiError && e.status === 401 ? "Sign in again to see your latest status." : "Could not reach the server; showing what is saved in this browser.");
    }
  }, [me]);

  useEffect(() => {
    setServer(null); setError("");
    if (!API_URL || !ready || !me) return;
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, REFRESH_MS); // a hidden tab does not poll
    const onVisible = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [who, ready, load, me]);

  const current = server && server.for === who ? server : null; // never show another account's numbers
  const proofs = current?.proofs ?? null;
  const batchStart = me?.batch ? parseDay(me.batch.starts_on) : null;

  // The feed changes slowly: once a minute is enough to tell people something new was shared.
  const [feedState, setFeedState] = useState<{ for: string; items: FeedItem[]; mine: Set<string>; waiting: number | null } | null>(null);
  useEffect(() => {
    setFeedState(null);
    if (!API_URL || !ready || !me || me.access !== "approved") return;
    const key = `${me.email}|${me.role}`;
    const pull = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const [f, m, q] = await Promise.all([
          feedApi.feed({ limit: 30 }), feedApi.mine().catch(() => []),
          canReview(me) ? feedApi.queue().then((x) => x.length).catch(() => null) : Promise.resolve(null),
        ]);
        setFeedState({ for: key, items: f.items, mine: new Set(m.map((x) => x.id)), waiting: q });
      } catch { /* the feed is extra: a failure leaves the rest of the page working */ }
    };
    void pull();
    const t = window.setInterval(pull, FEED_REFRESH_MS);
    return () => window.clearInterval(t);
  }, [who, ready, me]);
  const feedNow = feedState && feedState.for === who ? feedState : null;

  const weeks: WeekWork[] = useMemo(
    () => PROGRAMME.map((week) => ({ week, start: batchStart ?? parseDay(entries[startKey(week.n)]), states: weekStates(week, entries, proofs, now, batchStart) })),
    [entries, proofs, now, batchStart?.getTime()], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // The backlog log is only written when the proof status is known, so a slow server never marks a day "caught up" by mistake.
  const canLog = !API_URL || (ready && !!me && (reviewer || !!current));
  useEffect(() => {
    if (!canLog || reviewer) return;
    for (const w of weeks) for (const [k, v] of logChanges(w.week, w.states, entries, now)) setEntry(k, v);
  }, [weeks, canLog, reviewer]); // eslint-disable-line react-hooks/exhaustive-deps

  const value: Work = useMemo(() => {
    const items = weeks.flatMap((w) => w.states.map((state) => ({ week: w.week, state })));
    const missed = items.filter((i) => i.state.missed);
    const dueToday = items.filter((i) => !i.state.finished && i.state.due && sameDay(i.state.due, now));
    const proofActions = items.filter((i) => i.state.proof === "changes_requested" || i.state.proof === "draft");
    const open = items.filter((i) => !i.state.finished);
    const focus = dueToday[0] ?? open.find((i) => !i.state.missed) ?? open[0] ?? null;
    const proofTracked = proofs !== null;
    return {
      now, me, learner: !reviewerView, source: current ? "server" : "local", updatedAt: current?.at ?? null, error, refresh: () => void load(),
      weeks, items, missed, dueToday, proofActions, focus, allDone: items.length > 0 && open.length === 0,
      totals: {
        days: items.length, finished: items.filter((i) => i.state.finished).length,
        points: items.reduce((a, i) => a + i.state.day.done.length, 0), ticked: items.reduce((a, i) => a + i.state.ticked, 0),
      },
      proofTracked, handedIn: items.filter((i) => i.state.proof === "submitted" || i.state.proof === "approved").length,
      counts: current?.counts ?? null, weeksWithoutStart: weeks.filter((w) => !w.start).map((w) => w.week.n),
      batch: me?.batch && batchStart ? { id: me.batch.id, name: me.batch.name, startsOn: batchStart } : null,
      newInFeed: newSince(feedNow?.items ?? [], feedNow?.mine ?? new Set(), entries[feedSeenKey]),
      sharesWaiting: feedNow?.waiting ?? null,
    };
  }, [weeks, now, me, reviewer, reviewerView, current, error, proofs, load, feedNow, entries, batchStart]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Feed items approved after the person last opened the feed, not shared by them. First visit: only the last 7 days count as new. */
function newSince(items: FeedItem[], mine: Set<string>, seen: unknown): FeedItem[] {
  const since = typeof seen === "string" && !Number.isNaN(Date.parse(seen)) ? Date.parse(seen) : Date.now() - 7 * 86400000;
  return items.filter((i) => !mine.has(i.id) && i.approved_at && Date.parse(i.approved_at) > since);
}
