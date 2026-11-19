import type { Note } from "../data/studyNotes";

/** One topic in plain words: what it is, one example, where to read more. Collapsible inside a day, open on the Notes page. */
export function StudyNote({ note, collapsible = false, id }: { note: Note; collapsible?: boolean; id?: string }) {
  const body = (
    <>
      <p className="note-plain">{note.plain}</p>
      <p className="note-ex"><b>For example.</b> {note.example}</p>
      <p className="note-read"><b>Read or watch</b></p>
      <ul className="note-links">
        {note.links.map((l) => (
          <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer">{l.label}<span className="sr"> (opens in a new tab)</span></a></li>
        ))}
      </ul>
    </>
  );
  return collapsible
    ? <details className="note" id={id}><summary>{note.topic}</summary><div className="note-body">{body}</div></details>
    : <article className="note open" id={id}><h3>{note.topic}</h3><div className="note-body">{body}</div></article>;
}
