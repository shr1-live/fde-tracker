import { Link } from "react-router-dom";
import { useWork, WorkItem } from "../lib/work";
import { useStore } from "../lib/store";
import { dayStatus, fmtDate, missingWork } from "../lib/backlog";
import { buildReminders, eodHour } from "../lib/reminders";
import { Icon } from "./Icon";
import { Progress } from "./Progress";
import { LiveBadge } from "./LiveBadge";
import { StartDate } from "./StartDate";
import { Chip } from "./Chip";
import { notesPath } from "../data/studyNotes";

const dayTitle = (i: WorkItem) => `Week ${i.week.n}, Day ${i.state.day.n}`;
const dayLink = (i: WorkItem) => `/week/${i.week.n}#wd${i.state.day.n}`;

function Focus({ item, today }: { item: WorkItem; today: Date }) {
  const s = item.state;
  const st = dayStatus(s, today);
  const left = missingWork(s);
  const total = s.day.done.length;
  const dueToday = st.label === "Due today";
  return (
    <article className={"wcard focus" + (dueToday ? " warn" : "")} aria-labelledby="w-focus">
      <p className="eyebrow">{dueToday ? "Do this today" : "Up next"}</p>
      <h3 id="w-focus">{dayTitle(item)}: {s.day.title}</h3>
      <div className="row tight">
        <Chip tone={st.tone}>{st.label}</Chip>
        {s.due && !dueToday && <span className="muted small">Due {fmtDate(s.due)}</span>}
      </div>
      <Progress value={total ? (s.ticked / total) * 100 : 0} label={`${dayTitle(item)} points done`} />
      <p className="muted small tnum">{s.ticked} of {total} points ticked</p>
      {left.length > 0 && (
        <ul className="plain">
          {left.slice(0, 3).map((t) => <li key={t}>{t}</li>)}
          {left.length > 3 && <li className="muted">and {left.length - 3} more</li>}
        </ul>
      )}
      <div className="row">
        <Link className="btn" to={dayLink(item)}>Open Day {s.day.n}</Link>
        <Link className="btn ghost" to={notesPath(item.week.n, s.day.n)}>Study notes</Link>
      </div>
    </article>
  );
}

function ReviewerWork() {
  const w = useWork();
  const c = w.counts;
  return (
    <article className={"wcard focus " + ((c?.submitted ?? 0) > 0 ? "warn" : "ok")} aria-labelledby="w-queue">
      <p className="eyebrow">Your work as a reviewer</p>
      <h3 id="w-queue">{c ? (c.submitted > 0 ? `${c.submitted} waiting for your review` : "Nothing waiting for review") : "Loading the review queue"}</h3>
      {c && <p className="muted tnum">{c.changes_requested} sent back for changes, {c.approved} approved so far.</p>}
      <div className="row"><Link className="btn" to="/review">Open the review queue</Link></div>
    </article>
  );
}

/** What this person has to do: live cards at the top of the dashboard, for learners, reviewers and the admin. */
export function WorkToday() {
  const w = useWork();
  const { entries } = useStore();
  const wrap = buildReminders(w, eodHour(entries)).find((r) => r.id.startsWith("eod:"));
  return (
    <section className="work" aria-labelledby="work-h">
      <div className="work-head"><h2 id="work-h">Your work</h2><LiveBadge /></div>

      {!w.learner ? <div className="wgrid"><ReviewerWork /></div> : (
        <>
          {w.weeksWithoutStart.length > 0 && !w.allDone && (
            <div className="callout warn" role="note">
              <b>Set your start date.</b> Every day then gets a due date, and a missed day is found for you.
              <StartDate week={w.weeksWithoutStart[0]} compact />
            </div>
          )}
          {wrap?.catchUp && (
            <article className="wcard wrapup" aria-labelledby="w-eod">
              <p className="eyebrow">End of day</p>
              <h3 id="w-eod">Before you stop: {wrap.catchUp.dayTitle}</h3>
              <p>{wrap.catchUp.summary}</p>
              {wrap.catchUp.keyIdeas && <ul className="plain">{wrap.catchUp.keyIdeas.map((k) => <li key={k}>{k}</li>)}</ul>}
              <div className="row"><Link className="btn" to={wrap.catchUp.notesTo}>Read the study notes for this day</Link></div>
            </article>
          )}
          <div className="wgrid">
            {w.allDone && (
              <article className="wcard ok focus">
                <p className="eyebrow">All caught up</p>
                <h3><Icon name="check" /> Every day of the programme is done</h3>
                <p className="muted">New weeks appear here when they are added.</p>
              </article>
            )}
            {w.focus && <Focus item={w.focus} today={w.now} />}

            <article className={"wcard " + (w.missed.length ? "bad" : "ok")} aria-labelledby="w-backlog">
              <p className="eyebrow">Backlog</p>
              <h3 id="w-backlog"><span className="bignum tnum">{w.missed.length}</span> missed day{w.missed.length === 1 ? "" : "s"}</h3>
              {w.missed.length === 0
                ? <p className="muted">You are not behind.</p>
                : <ul className="plain">{w.missed.slice(0, 3).map((i) => <li key={dayTitle(i)}>{dayTitle(i)}: {i.state.why}</li>)}</ul>}
              <div className="row"><Link className="btn ghost" to="/backlog">{w.missed.length ? "Catch up" : "Open the backlog"}</Link></div>
            </article>

          </div>
        </>
      )}
    </section>
  );
}
