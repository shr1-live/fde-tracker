import { useMemo, useState } from "react";
import { Link, NavLink, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { STUDY_NOTES, notesPath } from "../data/studyNotes";
import { getWeek } from "../data/programme";
import { StudyNote } from "../components/StudyNote";


/** Plain-English notes for every topic, by day, with the links to read or watch. Search looks across all days. */
export default function StudyNotes() {
  const { day } = useParams();
  const [params] = useSearchParams();
  const WEEK = Number(params.get("w")) || 1; // the week is part of the address; a new week is one more entry in STUDY_NOTES
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const week = getWeek(WEEK);
  const days = STUDY_NOTES[WEEK] ?? [];
  const current = days.find((d) => d.day === Number(day)) ?? days[0];
  const plan = week?.days.find((d) => d.n === current?.day);

  const hits = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return null;
    return days.flatMap((d) => d.notes.map((note, i) => ({ d, note, i }))).filter(({ note }) => `${note.topic} ${note.plain} ${note.example}`.toLowerCase().includes(t));
  }, [q, days]);

  if (!current || !week) return <header className="ph"><h1>Study notes</h1><p className="muted">No notes yet.</p></header>;

  return (
    <>
      <header className="ph">
        <h1>Study notes</h1>
        <p className="muted">Every topic in plain words, with one example and where to read more. Short enough to read on a busy day. Read the day in short first, then the topics you need.</p>
      </header>

      <nav className="chips daychips" aria-label="Days">
        {days.map((d) => (
          <NavLink key={d.day} to={notesPath(WEEK, d.day)} className={() => (d.day === current.day && !hits ? "on" : "")} aria-current={d.day === current.day && !hits ? "page" : undefined} onClick={() => setQ("")}>
            <span>Day {d.day}</span>
          </NavLink>
        ))}
      </nav>

      <div className="card searchbox">
        <label htmlFor="notes-q">Search the notes</label>
        <input id="notes-q" type="search" value={q} placeholder="for example: tokens, injection, retries" onChange={(e) => setQ(e.target.value)} />
      </div>

      {hits ? (
        <>
          <h2>{hits.length} {hits.length === 1 ? "topic matches" : "topics match"} "{q.trim()}"</h2>
          {hits.length === 0 && <p className="muted">Nothing found. Try a shorter word.</p>}
          <div className="stackcards">
            {hits.map(({ d, note, i }) => (
              <div key={`${d.day}-${i}`}>
                <p className="eyebrow">Day {d.day}: {week.days.find((x) => x.n === d.day)?.title}</p>
                <StudyNote note={note} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <section className="card inshort" aria-labelledby="short-h">
            <p className="eyebrow">Day {current.day}</p>
            <h2 id="short-h">{plan?.title}</h2>
            <p>{current.intro}</p>
            {plan?.summary && <><h3>The day in short</h3><p>{plan.summary}</p></>}
            {plan?.keyIdeas && <ul className="plain">{plan.keyIdeas.map((k) => <li key={k}>{k}</li>)}</ul>}
            <div className="row"><Link className="btn" to={`/week/${WEEK}#wd${current.day}`}>Open Day {current.day} tasks</Link>
              {current.day < days.length && <button type="button" className="btn ghost" onClick={() => nav(notesPath(WEEK, current.day + 1))}>Next day's notes</button>}</div>
          </section>
          <h2>Topics <small>{current.notes.length}</small></h2>
          <div className="stackcards">{current.notes.map((n, i) => <StudyNote key={n.topic} note={n} id={`t${i + 1}`} />)}</div>
        </>
      )}
    </>
  );
}
