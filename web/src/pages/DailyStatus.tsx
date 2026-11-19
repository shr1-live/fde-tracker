import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { errText, useProgram } from "../lib/useProgram";
import { checkValues, cleanValues, fmtDay, isoDay, status, type DailyEntry, type Values } from "../lib/v3";
import { FormFields, ValuesView } from "../components/FormFields";
import { ProgramHeader } from "../components/ProgramHeader";
import { Chip } from "../components/Chip";

export default function DailyStatus() {
  const { pid } = useParams();
  const { program, error } = useProgram(pid);
  const today = isoDay(new Date());
  const [date, setDate] = useState(today);
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<DailyEntry[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const member = program?.my_role === "member" || program?.my_role === "coordinator";
  useEffect(() => {
    if (!pid || !member) return;
    const from = new Date(); from.setDate(from.getDate() - 60);
    status.daily(pid, { from: isoDay(from), to: today }).then((rows) => setHistory([...rows].sort((a, b) => b.on_date.localeCompare(a.on_date)))).catch((e) => { setMsg(errText(e)); setHistory([]); });
  }, [pid, member, today]);
  useEffect(() => { setValues(history?.find((h) => h.on_date === date)?.values ?? {}); setErrors({}); }, [date, history]);
  if (error) return <><header className="ph"><h1>Daily status</h1></header><p className="banner err" role="alert">{error}</p></>;
  if (!program) return <p className="muted">Loading...</p>;
  const fields = program.forms.daily;
  if (!member) {
    return (<><ProgramHeader program={program} page="Daily status" /><div className="card"><p>You manage this program as the admin, so you have no daily status of your own here. Everyone's daily status is on <Link to={`/p/${program.id}/reports`}>Reports</Link>.</p></div></>);
  }
  const existing = history?.find((h) => h.on_date === date);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const errs = checkValues(fields, values, true);
    setErrors(errs);
    if (Object.keys(errs).length) { setMsg("Fill in the marked fields."); return; }
    setBusy(true); setMsg("");
    try {
      const saved = await status.saveDaily(program.id, date, cleanValues(fields, values));
      setHistory((h) => [saved, ...(h ?? []).filter((x) => x.on_date !== date)].sort((a, b) => b.on_date.localeCompare(a.on_date)));
      setMsg(`Saved your status for ${fmtDay(date)}.`);
    } catch (e2) { setMsg(errText(e2)); } finally { setBusy(false); }
  };
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    <>
      <ProgramHeader program={program} page="Daily status" intro="What you did today for this program. Fill it in at the end of each working day; press (i) next to a field to see what to write." />
      <form className="card" onSubmit={save} aria-label="Daily status">
        <div className="row tight datebar">
          <label htmlFor="ds-date">Day</label>
          <input id="ds-date" type="date" min="2020-01-01" max={isoDay(tomorrow)} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          {existing ? <Chip tone="ok">Filled in</Chip> : <Chip tone="warn">Not filled in yet</Chip>}
        </div>
        <FormFields fields={fields} values={values} onChange={setValues} errors={errors} idPrefix="ds" disabled={busy} />
        <div className="row"><button className="btn" disabled={busy}>{busy ? "Saving" : existing ? "Update status" : "Save status"}</button></div>
        {msg && <p className="small" role="status">{msg}</p>}
      </form>
      <h2>My last 60 days</h2>
      {history === null ? <p className="muted">Loading...</p> : history.length === 0 ? <p className="muted">Nothing filled in yet.</p> : (
        <div className="hist">
          {history.map((h) => (
            <details key={h.on_date} className="card mini">
              <summary>{fmtDay(h.on_date)}{h.on_date === today ? " (today)" : ""}</summary>
              <ValuesView fields={fields} values={h.values} />
              <button type="button" className="btn ghost sm" onClick={() => { setDate(h.on_date); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit this day</button>
            </details>
          ))}
        </div>
      )}
    </>
  );
}
