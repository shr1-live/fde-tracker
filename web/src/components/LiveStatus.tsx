import { useCallback, useEffect, useState } from "react";
import { API_URL, ApiError } from "../lib/api";
import { canReview, useMe } from "../lib/useRole";
import * as sub from "../lib/submissionsApi";
import { PROGRAMME, taskKey } from "../data/programme";
import { NOT_SUBMITTED, StatusTag } from "./StatusTag";
import { Kpi } from "./Kpi";

const REFRESH_MS = 15000;

type Data = { rows: sub.Row[] } | { counts: sub.Counts };

/** What is done right now, read from the server (the rest of this page is a dated snapshot). Learners see their own days; reviewers see the queue. */
export function LiveStatus() {
  const { me, ready } = useMe();
  const reviewer = canReview(me);
  const [data, setData] = useState<{ for: string; value: Data } | null>(null);
  const [error, setError] = useState("");
  const [at, setAt] = useState<Date | null>(null);
  const who = me ? `${me.email}|${me.role}` : "";

  const load = useCallback(async () => {
    if (!me) return;
    const mine = `${me.email}|${me.role}`;
    try {
      const value: Data = reviewer ? { counts: await sub.reviewCounts() } : { rows: await sub.mine() };
      setData({ for: mine, value }); setError(""); setAt(new Date());
    } catch (e) {
      setError(e instanceof ApiError && e.status === 401 ? "Sign in again to see live status." : e instanceof ApiError ? e.message : "Could not load live status.");
    }
  }, [me, reviewer]);

  useEffect(() => {
    setData(null); setError("");
    if (!API_URL || !ready || !me) return;
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [who, ready, load, me]);

  if (!API_URL) return null;
  const current = data && data.for === who ? data.value : null; // never show another account's numbers
  const week = PROGRAMME[0];

  const unknown = ready && !me; // the server did not accept this sign-in (or could not be reached)
  return (
    <section className={"card" + (current ? "" : " noprint")} aria-labelledby="live-h" aria-live="polite">
      <h2 id="live-h">Live status {at && <small className="muted">updated {at.toLocaleTimeString()}</small>}</h2>
      {error && <p className="banner err" role="alert">{error} <button type="button" className="copy" onClick={load}>Try again</button></p>}
      {unknown && !error && (
        <p className="muted">Live status needs an account the server recognises. Locally, pick a test account (learner, reviewer or admin) in the left menu; on the real site, sign in with your office account. If the server is not running, start it and <button type="button" className="copy" onClick={() => window.location.reload()}>reload</button>.</p>
      )}
      {!current && !error && !unknown && <p className="muted">Loading...</p>}
      {current && "counts" in current && (
        <>
          <p className="muted small">Work handed in by everyone, waiting for a decision. Open the Review page to act on it.</p>
          <div className="kpis">
            <Kpi icon="inbox" label="Waiting for review" value={String(current.counts.submitted)} sub="submitted" />
            <Kpi icon="tasks" label="Sent back" value={String(current.counts.changes_requested)} sub="changes requested" />
            <Kpi icon="target" label="Approved" value={String(current.counts.approved)} sub="accepted" />
          </div>
        </>
      )}
      {current && "rows" in current && (
        <>
          <p className="muted small">Where each day of your Week {week.n} work stands with the reviewers.</p>
          <ul className="plain">
            {week.days.map((d) => {
              const row = current.rows.find((r) => r.task_key === taskKey(week.n, d.n));
              return <li key={d.n}>Day {d.n}: {d.title} {row ? <StatusTag status={row.status} /> : NOT_SUBMITTED}</li>;
            })}
          </ul>
        </>
      )}
    </section>
  );
}
