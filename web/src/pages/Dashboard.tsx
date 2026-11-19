import { Link } from "react-router-dom";
import { useStore } from "../lib/store";
import { useWork } from "../lib/work";
import { useView } from "../lib/viewAs";
import { STACKS } from "../data/stacks";
import { Kpi } from "../components/Kpi";
import { WorkToday } from "../components/WorkToday";
import { fmtDate } from "../lib/backlog";
import { youTubeId } from "../components/Bits";

/** Working days from the batch start to today, as "day N" of the programme (Monday to Friday). */
function programmeDay(start: Date, today: Date): number {
  if (today < start) return 0;
  let n = 0;
  for (const d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) if (d.getDay() !== 0 && d.getDay() !== 6) n++;
  return n;
}

/** One dashboard for everyone: what to do now, the numbers that matter, and what is new in the feed. */
export default function Dashboard() {
  const { profile, setProfile, pct } = useStore();
  const w = useWork();
  const { reviewerView: reviewer } = useView();
  const first = profile.display_name ? profile.display_name.split(" ")[0] : "";
  const day = w.batch ? programmeDay(w.batch.startsOn, w.now) : 0;
  const totalDays = w.totals.days;
  const latest = w.newInFeed.slice(0, 3);
  return (
    <>
      <header className="ph">
        <h1>{first ? `Hello, ${first}` : "Dashboard"}</h1>
        <p className="muted">
          {w.batch
            ? <>{w.batch.name} · started {fmtDate(w.batch.startsOn)} · {day === 0 ? "starts soon" : day > totalDays ? "programme days are over: catch up and finish" : `day ${day} of ${totalDays}`}</>
            : "One day of the programme per working day: learn the theory, build the practical task, hand in your proof."}
        </p>
      </header>

      <div className="kpis" aria-label="Key numbers">
        <Kpi icon="target" label="Programme" value={`${w.totals.finished} of ${totalDays}`} sub={`days done · ${pct}% of points`} />
        {w.learner && <Kpi icon="calendar" label="Backlog" value={String(w.missed.length)} sub={w.missed.length ? "missed days to catch up" : w.dueToday.length ? `${w.dueToday.length} due today` : "you are not behind"} />}
        {w.learner && w.proofTracked && <Kpi icon="file" label="Proof handed in" value={`${w.handedIn} of ${totalDays}`} sub={w.proofActions.length ? `${w.proofActions.length} need you` : "nothing waiting on you"} />}
        <Kpi icon="rss" label="New in the feed" value={String(w.newInFeed.length)} sub="since your last visit" />
        {reviewer && <Kpi icon="inbox" label="Proof to review" value={w.counts ? String(w.counts.submitted) : "-"} sub={w.counts ? `${w.counts.approved} approved so far` : "loading"} />}
        {reviewer && <Kpi icon="link" label="Shares to approve" value={w.sharesWaiting === null ? "-" : String(w.sharesWaiting)} sub="links waiting for the feed" />}
      </div>

      <WorkToday />

      <div className="dash">
        <section aria-labelledby="feed-h">
          <div className="work-head"><h2 id="feed-h">New in the feed</h2><Link to="/feed">Open the feed</Link></div>
          {latest.length === 0
            ? <div className="card"><p className="muted">Nothing new since your last visit. Found a good video or blog? <Link to="/feed">Share it</Link> so everyone sees it.</p></div>
            : (
              <ul className="stackcards tight">
                {latest.map((i) => {
                  const id = i.url ? youTubeId(i.url) : null;
                  return (
                    <li key={i.id} className="card feedmini">
                      {id && <img src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`} alt="" loading="lazy" />}
                      <div><Link to="/feed"><b>{i.title}</b></Link><p className="meta">{i.topic_title} · shared by {i.author}{i.recommended ? " · recommended" : ""}</p></div>
                    </li>
                  );
                })}
              </ul>
            )}
        </section>
        <aside>
          <div className="card">
            <h3>Your stack</h3>
            <label htmlFor="stack" className="sr">Stack</label>
            <select id="stack" value={profile.stack} onChange={(e) => setProfile({ stack: e.target.value })}>
              {STACKS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <p className="muted small">The Stack guide follows this choice.</p>
            <label htmlFor="dn">Display name</label>
            <input id="dn" value={profile.display_name} onChange={(e) => setProfile({ display_name: e.target.value })} />
          </div>
          <div className="card">
            <h3>Programme</h3>
            <p className="muted small">Weeks of five working days, as in the programme sheet: topic, topics to cover, practical task, what you learn, proof, rating.</p>
            <div className="row"><Link className="btn ghost" to="/week/1">Week 1 tasks</Link><Link className="btn ghost" to="/outline">All six weeks</Link></div>
          </div>
        </aside>
      </div>
    </>
  );
}
