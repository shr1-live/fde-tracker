import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { API_URL, ApiError } from "../lib/api";
import * as rep from "../lib/reportsApi";
import { useMe } from "../lib/useRole";
import { useView } from "../lib/viewAs";
import { PROGRAMME, taskKey } from "../data/programme";
import { RATING_GUIDE } from "../data/weekExpect";
import { dueDate, fmtDate, parseDay, type Tone } from "../lib/backlog";
import { Chip } from "../components/Chip";
import { Icon } from "../components/Icon";

const msg = (e: unknown) => (e instanceof ApiError ? e.message : "Could not load the report. Try again.");
const day = (iso: string | null) => (iso ? fmtDate(new Date(iso)) : "");
const STATUS: Record<string, [string, "ok" | "warn" | "bad" | "info" | "none"]> = {
  approved: ["Approved", "ok"], submitted: ["Waiting for review", "info"], changes_requested: ["Changes asked", "bad"], draft: ["Saved, not submitted", "warn"],
};

/** Working days late (Monday to Friday) between the due date and when it was handed in; 0 = on time. */
function lateBy(due: Date, handedIn: Date): number {
  const d = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const h = new Date(handedIn.getFullYear(), handedIn.getMonth(), handedIn.getDate());
  let n = 0;
  while (d < h) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) n++; }
  return n;
}

/** One person's report: a summary per week (end of week) and a row per day (end of day). */
export function ReportView({ report, own }: { report: rep.PersonReport; own: boolean }) {
  const start = report.person.batch ? parseDay(report.person.batch.starts_on) : null;
  const today = new Date();
  const byKey = useMemo(() => new Map(report.days.map((d) => [d.task_key, d])), [report]);
  return (
    <>
      <div className="kpis" aria-label="Totals">
        <div className="kpi"><div className="kh"><Icon name="check" />Approved</div><div className="kv tnum">{report.totals.approved}</div><div className="ks">days accepted by a reviewer</div></div>
        <div className="kpi"><div className="kh"><Icon name="inbox" />Waiting</div><div className="kv tnum">{report.totals.submitted}</div><div className="ks">handed in, not reviewed yet</div></div>
        <div className="kpi"><div className="kh"><Icon name="alert" />Changes asked</div><div className="kv tnum">{report.totals.changes_requested}</div><div className="ks">sent back by a reviewer</div></div>
        <div className="kpi"><div className="kh"><Icon name="target" />Average self-rating</div><div className="kv tnum">{report.totals.avg_rating ?? "-"}</div><div className="ks">out of 5, over handed-in days</div></div>
      </div>
      {PROGRAMME.map((w) => {
        const rows = w.days.map((d) => {
          const r = byKey.get(taskKey(w.n, d.n)) ?? null;
          const due = start ? dueDate(start, d.n) : null;
          const handed = r?.submitted_at ? new Date(r.submitted_at) : null;
          const late = due && handed ? lateBy(due, handed) : null;
          const overdue = !!due && !handed && due < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          return { d, r, due, handed, late, overdue };
        });
        const approved = rows.filter((x) => x.r?.status === "approved").length;
        const handedIn = rows.filter((x) => x.handed).length;
        const onTime = rows.filter((x) => x.late === 0).length;
        const ratings = rows.map((x) => x.r?.rating).filter((v): v is number => typeof v === "number");
        const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "-";
        const missing = rows.filter((x) => !x.handed).map((x) => `Day ${x.d.n}`);
        return (
          <section key={w.n} className="card reportweek" aria-labelledby={`rw-${w.n}`}>
            <div className="work-head"><h2 id={`rw-${w.n}`}>Week {w.n} report</h2><Chip tone={approved === w.days.length ? "ok" : handedIn ? "info" : "none"}>{approved === w.days.length ? "Week complete" : `${approved} of ${w.days.length} approved`}</Chip></div>
            <p className="muted">
              Handed in {handedIn} of {w.days.length}{start ? `, ${onTime} on time` : ""} · average self-rating {avg}
              {missing.length ? ` · not handed in: ${missing.join(", ")}` : ""}
            </p>
            <div className="tablewrap" tabIndex={0} role="region" aria-label={`Week ${w.n} day by day, scrolls sideways on small screens`}>
              <table>
                <thead><tr><th scope="col">Day</th><th scope="col">Status</th><th scope="col">Handed in</th><th scope="col">Self-rating</th><th scope="col">Reviewer</th></tr></thead>
                <tbody>
                  {rows.map(({ d, r, due, handed, late, overdue }) => {
                    const [label, tone]: [string, Tone] = r ? STATUS[r.status] ?? [r.status, "none"] : overdue ? ["Missed", "bad"] : ["Not handed in", "none"];
                    return (
                      <tr key={d.n}>
                        <td><b>Day {d.n}</b><br /><span className="small">{d.title}</span>{due && <><br /><span className="small muted">due {fmtDate(due)}</span></>}</td>
                        <td><Chip tone={tone}>{label}</Chip>{r && r.item_count > 0 && <><br /><span className="small muted">{r.item_count} proof item{r.item_count === 1 ? "" : "s"}</span></>}</td>
                        <td className="tnum">{handed ? <>{fmtDate(handed)}{late !== null && <><br /><span className={"small " + (late ? "err" : "muted")}>{late ? `${late} working day${late === 1 ? "" : "s"} late` : "on time"}</span></>}</> : "-"}</td>
                        <td>{r?.rating ? <span title={RATING_GUIDE[r.rating - 1]?.[1]}><b>{r.rating}</b> <span className="small muted">{RATING_GUIDE[r.rating - 1]?.[1]}</span></span> : "-"}</td>
                        <td>{r?.last_decision ? <><b>{r.last_decision === "approve" ? "Approved" : "Asked for changes"}</b>{r.last_reviewer ? ` by ${r.last_reviewer}` : ""}{r.reviewed_at ? `, ${day(r.reviewed_at)}` : ""}{r.last_comment && <p className="small wrap">"{r.last_comment}"</p>}</> : "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {rows.some((x) => x.r?.learned) && (
              <details className="mini gap"><summary>What {own ? "I" : "they"} learned, day by day</summary>
                <dl className="kv small">{rows.filter((x) => x.r?.learned).map(({ d, r }) => <div key={d.n}><dt>Day {d.n}: {d.title}</dt><dd className="wrap">{r!.learned}</dd></div>)}</dl>
              </details>
            )}
          </section>
        );
      })}
      <div className="row noprint"><button type="button" className="btn ghost" onClick={() => window.print()}>Print or save as PDF</button></div>
    </>
  );
}

function PeopleList() {
  const [rows, setRows] = useState<rep.PersonRow[] | null>(null);
  const [err, setErr] = useState("");
  const [batch, setBatch] = useState("");
  useEffect(() => { rep.people().then(setRows).catch((e) => { setErr(msg(e)); setRows([]); }); }, []);
  const batches = [...new Set((rows ?? []).map((r) => r.batch_name).filter(Boolean))] as string[];
  const shown = (rows ?? []).filter((r) => !batch || r.batch_name === batch);
  return (
    <>
      <header className="ph"><h1>Reports</h1><p className="muted">Everyone's progress, day by day and week by week, from what they handed in and what reviewers decided. Open a person for their full report.</p></header>
      {err && <p className="banner err" role="alert">{err}</p>}
      {batches.length > 0 && (
        <div className="card feedbar"><div><label htmlFor="rp-batch">Batch</label><select id="rp-batch" value={batch} onChange={(e) => setBatch(e.target.value)}><option value="">All batches</option>{batches.map((b) => <option key={b}>{b}</option>)}</select></div></div>
      )}
      {rows === null ? <p className="muted">Loading...</p> : (
        <div className="tablewrap" tabIndex={0} role="region" aria-label="People and their progress">
          <table>
            <thead><tr><th scope="col">Person</th><th scope="col">Batch</th><th scope="col">Approved</th><th scope="col">Waiting</th><th scope="col">Changes asked</th><th scope="col">Avg rating</th><th scope="col">Last activity</th></tr></thead>
            <tbody>{shown.map((r) => (
              <tr key={r.id}>
                <td><Link to={`/progress/${r.id}`}><b>{r.name}</b></Link></td>
                <td>{r.batch_name ?? <span className="muted">-</span>}</td>
                <td className="tnum">{r.approved}</td><td className="tnum">{r.submitted}</td><td className="tnum">{r.changes_requested}</td>
                <td className="tnum">{r.avg_rating ?? "-"}</td><td className="tnum">{r.last_activity ? day(r.last_activity) : "-"}</td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

function OneReport({ id }: { id: string | null }) {
  const [report, setReport] = useState<rep.PersonReport | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { setReport(null); (id ? rep.personReport(id) : rep.myReport()).then(setReport).catch((e) => setErr(msg(e))); }, [id]);
  return (
    <>
      <header className="ph">
        {id && <p className="crumb noprint"><Link to="/progress">All reports</Link></p>}
        <h1>{id ? (report ? `${report.person.name}: report` : "Report") : "My report"}</h1>
        <p className="muted">{report?.person.batch ? `${report.person.batch.name}, started ${fmtDate(parseDay(report.person.batch.starts_on) ?? new Date())}. ` : ""}End of each day: what was handed in, when, the self-rating and the reviewer's decision. End of each week: the summary at the top of each week.</p>
      </header>
      {err && <p className="banner err" role="alert">{err}</p>}
      {!report && !err && <p className="muted">Loading...</p>}
      {report && <ReportView report={report} own={!id} />}
    </>
  );
}

/** /progress: my report (learner view) or everyone's (reviewer view); /progress/:id: one person (reviewers and the admin). */
export default function Progress() {
  const { id } = useParams();
  const { me, ready } = useMe();
  const { reviewerView, canSwitch } = useView();
  if (!API_URL) return <><header className="ph"><h1>Reports</h1></header><div className="card"><p className="muted">Reports need the backend, which is not connected for this site.</p></div></>;
  if (ready && !me) return <><header className="ph"><h1>Reports</h1></header><div className="card" role="status"><p>Sign in with your office account to see reports.</p></div></>;
  if (id) return canSwitch ? <OneReport id={id} /> : ready ? <Navigate to="/progress" replace /> : <p className="muted">Loading...</p>;
  return reviewerView ? <PeopleList /> : <OneReport id={null} />;
}
