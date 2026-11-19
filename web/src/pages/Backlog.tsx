import { Link } from "react-router-dom";
import { useWork } from "../lib/work";
import { useStore } from "../lib/store";
import { dayStatus, fmtDate, logKey, missingWork, parseDay, type LogEntry } from "../lib/backlog";
import { Icon } from "../components/Icon";
import { notesPath } from "../data/studyNotes";
import { Chip } from "../components/Chip";
import { LiveBadge } from "../components/LiveBadge";
import { StartDate } from "../components/StartDate";

const when = (s?: string) => { const d = parseDay(s); return d ? fmtDate(d) : "-"; };

/** The days a learner has fallen behind on: what is missing, the day in short, and a log of when each was missed and caught up. */
export default function Backlog() {
  const w = useWork();
  const { entries } = useStore();

  if (!w.learner) {
    return (
      <>
        <header className="ph"><h1>Backlog</h1><p className="muted">Reviewers review work and do not have days of their own to catch up on. Learners see their missed days here.</p></header>
        <div className="card"><Link className="btn" to="/review">Open the review queue</Link></div>
      </>
    );
  }

  const log = w.items
    .map((i) => ({ i, e: (entries[logKey(i.week.n, i.state.day.n)] ?? {}) as LogEntry }))
    .filter((x) => x.e.missedOn)
    .sort((a, b) => (b.e.missedOn ?? "").localeCompare(a.e.missedOn ?? ""));

  return (
    <>
      <header className="ph">
        <div className="work-head"><h1>Backlog</h1><LiveBadge /></div>
        <p className="muted">Days you have not finished in time. Each one shows what is missing and the day in a few lines, so you can catch up quickly even when you were busy on a project.</p>
      </header>

      <section className="card" aria-labelledby="bl-start">
        <h2 id="bl-start">When did you start?</h2>
        <p className="muted small">Day 1 is due on your start date, day 2 the next working day, and so on (Monday to Friday). A day counts as missed when it is past due and not finished: points unticked, or proof not submitted.</p>
        {w.weeks.map((x) => <StartDate key={x.week.n} week={x.week.n} />)}
      </section>

      <h2>Missed days <small>{w.missed.length === 0 ? "none" : w.missed.length}</small></h2>
      {w.missed.length === 0 && (
        <div className="card emptystate">
          <Icon name="check" size={28} />
          <div>
            <h3>You are not behind</h3>
            <p className="muted">{w.weeksWithoutStart.length > 0 ? "Set your start date above so due dates can be checked." : "Every day that is due is finished. Keep going."}</p>
            {w.focus && <Link className="btn" to={`/week/${w.focus.week.n}#wd${w.focus.state.day.n}`}>Open Day {w.focus.state.day.n}</Link>}
          </div>
        </div>
      )}
      <div className="stackcards">
        {w.missed.map((i) => {
          const s = i.state, st = dayStatus(s, w.now), left = missingWork(s);
          return (
            <article key={`${i.week.n}-${s.day.n}`} className="card miss" aria-labelledby={`m${i.week.n}-${s.day.n}`}>
              <div className="row tight"><Chip tone={st.tone}>{st.label}</Chip>{s.due && <span className="muted small">was due {fmtDate(s.due)}</span>}</div>
              <h3 id={`m${i.week.n}-${s.day.n}`}>Week {i.week.n}, Day {s.day.n}: {s.day.title}</h3>
              <p className="muted small">Why it is here: {s.why}.</p>
              <div className="two cards">
                <div>
                  <h4>What is missing</h4>
                  <ul className="plain">{left.map((t) => <li key={t}>{t}</li>)}</ul>
                </div>
                <div>
                  <h4>The day in short</h4>
                  <p>{s.day.summary ?? "Open the day to see what to study."}</p>
                  {s.day.keyIdeas && <ul className="plain">{s.day.keyIdeas.map((k) => <li key={k}>{k}</li>)}</ul>}
                </div>
              </div>
              <div className="row">
                <Link className="btn" to={`/week/${i.week.n}#wd${s.day.n}`}>Catch up on Day {s.day.n}</Link>
                <Link className="btn ghost" to={notesPath(i.week.n, s.day.n)}>Read the study notes</Link>
              </div>
            </article>
          );
        })}
      </div>

      <h2>Backlog log</h2>
      {log.length === 0
        ? <p className="muted">Nothing logged yet. A day is added here the first time it is found missed, and marked when you catch up.</p>
        : (
          <div className="tablewrap" tabIndex={0} role="region" aria-label="Backlog log">
            <table>
              <thead><tr><th scope="col">Day</th><th scope="col">Missed on</th><th scope="col">Caught up on</th></tr></thead>
              <tbody>
                {log.map(({ i, e }) => (
                  <tr key={`${i.week.n}-${i.state.day.n}`}>
                    <td>Week {i.week.n}, Day {i.state.day.n}: {i.state.day.title}</td>
                    <td className="tnum">{when(e.missedOn)}</td>
                    <td className="tnum">{e.clearedOn ? when(e.clearedOn) : <Chip tone="bad">Still open</Chip>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </>
  );
}
