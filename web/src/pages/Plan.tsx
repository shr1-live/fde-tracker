import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { byWeek, errText, useProgram } from "../lib/useProgram";
import { canManage, checkValues, cleanValues, fmtDay, programs, status, type Day, type DayInput, type DayStatus, type Program, type Values } from "../lib/v3";
import { FormFields } from "../components/FormFields";
import { Chip } from "../components/Chip";
import { ProgramHeader } from "../components/ProgramHeader";

const EMPTY: DayInput = { week: 1, day: 1, topic: "", topics_to_cover: "", practical_task: "", resources: "" };

/** Add or edit one day of the plan (coordinators and the admin). */
function DayEditor({ program, day, onDone }: { program: Program; day?: Day; onDone: () => void }) {
  const next = (() => { const last = [...program.days].sort((a, b) => a.week - b.week || a.day - b.day).pop(); return last ? (last.day >= 5 ? { week: last.week + 1, day: 1 } : { week: last.week, day: last.day + 1 }) : { week: 1, day: 1 }; })();
  const [v, setV] = useState<DayInput>(day ? { ...day, practical_task: day.practical_task ?? "", resources: day.resources ?? "" } : { ...EMPTY, ...next });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const id = day?.id ?? "new";
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!v.topic.trim()) { setErr("Give the day a topic."); return; }
    setBusy(true); setErr("");
    const body = { ...v, topic: v.topic.trim(), practical_task: v.practical_task?.trim() || null, resources: v.resources?.trim() || null };
    try { if (day) await programs.updateDay(program.id, day.id, body); else await programs.addDay(program.id, body); onDone(); }
    catch (e2) { setErr(errText(e2)); } finally { setBusy(false); }
  };
  return (
    <form className="card dayedit" onSubmit={save} aria-label={day ? `Edit week ${day.week} day ${day.day}` : "Add a day"}>
      <h3>{day ? `Edit Week ${day.week}, Day ${day.day}` : "Add a day"}</h3>
      <div className="two">
        <div><label htmlFor={`w-${id}`}>Week</label><input id={`w-${id}`} type="number" min={1} max={52} value={v.week} onChange={(e) => setV({ ...v, week: Number(e.target.value) })} /></div>
        <div><label htmlFor={`d-${id}`}>Day</label><input id={`d-${id}`} type="number" min={1} max={7} value={v.day} onChange={(e) => setV({ ...v, day: Number(e.target.value) })} /></div>
      </div>
      <label htmlFor={`t-${id}`}>Topic</label><input id={`t-${id}`} maxLength={140} value={v.topic} onChange={(e) => setV({ ...v, topic: e.target.value })} />
      <label htmlFor={`c-${id}`}>Topics to cover <span className="small muted">(one per line)</span></label><textarea id={`c-${id}`} rows={6} maxLength={4000} value={v.topics_to_cover} onChange={(e) => setV({ ...v, topics_to_cover: e.target.value })} />
      <label htmlFor={`p-${id}`}>Practical task <span className="small muted">(optional)</span></label><textarea id={`p-${id}`} rows={4} maxLength={4000} value={v.practical_task ?? ""} onChange={(e) => setV({ ...v, practical_task: e.target.value })} />
      <label htmlFor={`r-${id}`}>Resources <span className="small muted">(optional, links or notes)</span></label><textarea id={`r-${id}`} rows={2} maxLength={2000} value={v.resources ?? ""} onChange={(e) => setV({ ...v, resources: e.target.value })} />
      {err && <p className="small err" role="alert">{err}</p>}
      <div className="row"><button className="btn" disabled={busy}>{busy ? "Saving" : "Save day"}</button><button type="button" className="btn ghost" onClick={onDone}>Cancel</button></div>
    </form>
  );
}

/** Text with links turned into links (resources) and line breaks kept. */
function Rich({ text }: { text: string }) {
  return <>{text.split(/(https:\/\/[^\s)]+)/g).map((part, i) => (/^https:\/\//.test(part) ? <a key={i} href={part} target="_blank" rel="noreferrer noopener">{part}</a> : <span key={i}>{part}</span>))}</>;
}

function DayCard({ program, day, mine, member, editing, onSaved, onEdit, onDelete }: {
  program: Program; day: Day; mine?: DayStatus; member: boolean; editing: boolean; onSaved: (s: DayStatus) => void; onEdit: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(() => location.hash === `#day-${day.id}`);
  const [values, setValues] = useState<Values>(mine?.values ?? {});
  const [completed, setCompleted] = useState(mine?.completed ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => { setValues(mine?.values ?? {}); setCompleted(mine?.completed ?? false); }, [mine]);
  const fields = program.forms.day;
  const save = async (done: boolean) => {
    const errs = checkValues(fields, values, done);
    setErrors(errs);
    if (Object.keys(errs).length) { setOpen(true); setMsg(done ? "Fill in the marked fields to mark this day completed." : "Fix the marked fields."); return; }
    setBusy(true); setMsg("");
    try { const s = await status.saveDay(program.id, day.id, cleanValues(fields, values), done); onSaved(s); setCompleted(done); setMsg(done ? "Saved. Day marked completed." : "Saved."); }
    catch (e) { setMsg(errText(e)); } finally { setBusy(false); }
  };
  const lines = day.topics_to_cover.split("\n").map((l) => l.replace(/^[\s•\-*]+/, "").trim()).filter(Boolean);
  return (
    <section id={`day-${day.id}`} className={"card daycard" + (mine?.completed ? " done" : "")} aria-labelledby={`dh-${day.id}`}>
      <div className="dayc-top">
        {member && (
          <label className="daycheck" title="Mark this day completed">
            <input type="checkbox" checked={!!mine?.completed} disabled={busy} onChange={(e) => (e.target.checked ? save(true) : save(false))} />
            <span className="sr">Day {day.day} completed</span>
          </label>
        )}
        <div className="grow">
          <p className="eyebrow">Week {day.week} · Day {day.day}</p>
          <h3 id={`dh-${day.id}`}>{day.topic}</h3>
        </div>
        {member && (mine?.completed ? <Chip tone="ok">Completed</Chip> : mine ? <Chip tone="info">In progress</Chip> : <Chip>Not started</Chip>)}
      </div>
      <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary>{open ? "Hide details" : "Topics, practical task" + (member ? " and my status" : "")}</summary>
        <h4>Topics to cover</h4>
        <ul className="topics">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
        {day.practical_task && <><h4>Practical task</h4><p className="wrap">{day.practical_task}</p></>}
        {day.resources && <><h4>Resources</h4><p className="wrap"><Rich text={day.resources} /></p></>}
        {member && (
          <div className="mystatus">
            <h4>My status for this day</h4>
            <FormFields fields={fields} values={values} onChange={setValues} errors={errors} idPrefix={`ds-${day.id}`} disabled={busy} />
            <div className="row">
              <button type="button" className="btn" disabled={busy} onClick={() => save(true)}>{completed ? "Save" : "Save and mark completed"}</button>
              {!completed && <button type="button" className="btn ghost" disabled={busy} onClick={() => save(false)}>Save as in progress</button>}
              {completed && <button type="button" className="btn ghost" disabled={busy} onClick={() => save(false)}>Mark not completed</button>}
            </div>
          </div>
        )}
        {msg && <p className="small" role="status">{msg}</p>}
      </details>
      {editing && <div className="row"><button type="button" className="btn ghost sm" onClick={onEdit}>Edit day</button><button type="button" className="btn ghost sm" onClick={onDelete}>Delete day</button></div>}
    </section>
  );
}

export default function Plan() {
  const { pid } = useParams();
  const { program, error, reload } = useProgram(pid);
  const [mine, setMine] = useState<Map<string, DayStatus>>(new Map());
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState<Day | "new" | null>(null);
  const [err, setErr] = useState("");
  const member = program?.my_role === "member" || program?.my_role === "coordinator";
  useEffect(() => {
    if (!pid || !member) return;
    status.days(pid).then((rows) => setMine(new Map(rows.map((r) => [r.day_id, r])))).catch((e) => setErr(errText(e)));
  }, [pid, member]);
  useEffect(() => { if (program && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView(); }, [program]);
  if (error) return <><header className="ph"><h1>Plan</h1></header><p className="banner err" role="alert">{error}</p></>;
  if (!program) return <p className="muted">Loading...</p>;
  const manage = canManage(program.my_role);
  const weeks = byWeek(program.days);
  const remove = async (d: Day) => {
    if (!window.confirm(`Delete Week ${d.week}, Day ${d.day} "${d.topic}"? Everyone's status for this day is deleted too.`)) return;
    try { await programs.deleteDay(program.id, d.id); await reload(); } catch (e) { setErr(errText(e)); }
  };
  const doneCount = [...mine.values()].filter((s) => s.completed).length;
  return (
    <>
      <ProgramHeader program={program} page="Plan" />
      {member && program.days.length > 0 && <p className="muted">{doneCount} of {program.days.length} days completed{program.starts_on ? ` · started ${fmtDay(program.starts_on)}` : ""}</p>}
      {manage && (
        <div className="row tight noprint">
          <button type="button" className={"btn" + (editing ? "" : " ghost")} aria-pressed={editing} onClick={() => { setEditing((x) => !x); setEdit(null); }}>{editing ? "Done editing" : "Edit plan"}</button>
          {editing && <button type="button" className="btn ghost" onClick={() => setEdit("new")}>Add a day</button>}
        </div>
      )}
      {err && <p className="banner err" role="alert">{err}</p>}
      {edit === "new" && <DayEditor program={program} onDone={() => { setEdit(null); void reload(); }} />}
      {weeks.length === 0 && <div className="card gap"><p className="muted">No days in this plan yet.{manage ? " Press Edit plan, then Add a day." : " The coordinator will add them."}</p></div>}
      {weeks.map(([w, days]) => {
        const done = days.filter((d) => mine.get(d.id)?.completed).length;
        return (
          <section key={w} className="weekblock" aria-labelledby={`wk-${w}`}>
            <div className="weekhead">
              <h2 id={`wk-${w}`}>Week {w}</h2>
              {member && <Chip tone={done === days.length ? "ok" : done ? "info" : "none"}>{done === days.length ? "Week completed" : `${done} of ${days.length} days done`}</Chip>}
            </div>
            {days.map((d) => (edit !== "new" && edit?.id === d.id
              ? <DayEditor key={d.id} program={program} day={d} onDone={() => { setEdit(null); void reload(); }} />
              : <DayCard key={d.id} program={program} day={d} mine={mine.get(d.id)} member={member} editing={editing} onEdit={() => setEdit(d)} onDelete={() => remove(d)}
                  onSaved={(s) => setMine((m) => new Map(m).set(s.day_id, s))} />))}
          </section>
        );
      })}
    </>
  );
}
