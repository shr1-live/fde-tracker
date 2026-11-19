import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { errText, useProgram } from "../lib/useProgram";
import { checkValues, cleanValues, fmtDay, isoDay, status, type DailyEntry, type Values } from "../lib/v3";
import { sameValues, useUnsaved } from "../lib/unsaved";
import { FormFields, ValuesView } from "../components/FormFields";
import { ProgramHeader } from "../components/ProgramHeader";
import { Chip } from "../components/Chip";
import { Icon } from "../components/Icon";
import { EmptyState, ErrorState, Loading, PageSkeleton, Skeleton } from "../components/States";
import { useConfirm } from "../components/Confirm";
import { useToast } from "../components/Toast";

export default function DailyStatus() {
  const { pid } = useParams();
  const { program, error, reload } = useProgram(pid);
  const today = isoDay(new Date());
  const [date, setDate] = useState(today);
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<DailyEntry[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const confirm = useConfirm();
  const toast = useToast();
  const member = program?.my_role === "member" || program?.my_role === "coordinator";
  useEffect(() => {
    if (!pid || !member) return;
    const from = new Date(); from.setDate(from.getDate() - 60);
    status.daily(pid, { from: isoDay(from), to: today }).then((rows) => setHistory([...rows].sort((a, b) => b.on_date.localeCompare(a.on_date)))).catch((e) => { toast.error(errText(e)); setHistory([]); });
  }, [pid, member, today, toast]);
  const existing = history?.find((h) => h.on_date === date);
  useEffect(() => { setValues(existing?.values ?? {}); setErrors({}); setMsg(""); }, [date, history]); // eslint-disable-line react-hooks/exhaustive-deps
  useUnsaved("daily-status", !!member && history !== null && !sameValues(values, existing?.values ?? {}));
  if (error) return <div className="content"><ErrorState title="Could not open this program" message={error} onRetry={reload} /></div>;
  if (!program) return <div className="content"><PageSkeleton /></div>;
  const fields = program.forms.daily;
  if (!member) {
    return (
      <div className="content">
        <ProgramHeader program={program} page="Daily status" />
        <EmptyState icon="chart" title="No daily status for admins" action={<Link className="btn" to={`/p/${program.id}/reports`}>Open reports</Link>}>
          You manage this program as the admin, so you have no daily status of your own here. Everyone's daily status is on Reports.
        </EmptyState>
      </div>
    );
  }
  const dirty = !sameValues(values, existing?.values ?? {});
  const pick = async (d: string) => {
    if (d === date) return;
    if (dirty && !(await confirm({ title: "Switch day without saving?", body: `Your changes for ${fmtDay(date)} are not saved yet.`, confirm: "Switch day", cancel: "Stay", danger: true }))) return;
    setDate(d);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => document.getElementById("ds-date")?.focus({ preventScroll: true }), 0);
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const errs = checkValues(fields, values, true);
    setErrors(errs);
    if (Object.keys(errs).length) { setMsg("Fill in the marked fields."); document.getElementById(`ds-${Object.keys(errs)[0]}`)?.focus(); return; }
    setBusy(true); setMsg("");
    try {
      const saved = await status.saveDaily(program.id, date, cleanValues(fields, values));
      setHistory((h) => [saved, ...(h ?? []).filter((x) => x.on_date !== date)].sort((a, b) => b.on_date.localeCompare(a.on_date)));
      toast.success(`Saved your status for ${fmtDay(date)}.`);
    } catch (e2) { toast.error(errText(e2)); } finally { setBusy(false); }
  };
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    <div className="content">
      <ProgramHeader program={program} page="Daily status" intro="What you did today for this program. Fill it in at the end of each working day; press (i) next to a field to see what to write." />
      <div className="split">
        <form className="card" onSubmit={save} aria-label="Daily status" noValidate>
          <div className="card-head">
            <div className="field inline">
              <label htmlFor="ds-date">Day</label>
              <input id="ds-date" type="date" min="2020-01-01" max={isoDay(tomorrow)} value={date} onChange={(e) => e.target.value && void pick(e.target.value)} />
            </div>
            {existing ? <Chip tone="ok">Filled in</Chip> : <Chip tone="warn">Not filled in yet</Chip>}
          </div>
          <FormFields fields={fields} values={values} onChange={(v) => { setValues(v); if (Object.keys(errors).length) { setErrors({}); setMsg(""); } }} errors={errors} idPrefix="ds" disabled={busy} />
          {msg && <p className="field-error" role="alert">{msg}</p>}
          <div className="card-foot">
            {dirty && <span className="meta unsaved"><span className="dot" aria-hidden="true" />Unsaved changes</span>}
            <button className="btn" disabled={busy}>{busy ? "Saving" : existing ? "Update status" : "Save status"}</button>
          </div>
        </form>
        <section className="card history" aria-labelledby="hist-h">
          <h2 id="hist-h" className="card-title">My last 60 days</h2>
          {history === null ? (
            <Loading label="Loading your history">{[0, 1, 2, 3].map((i) => <div key={i} className="hist-skel"><Skeleton w="50%" /><Skeleton w="30%" h={12} /></div>)}</Loading>
          ) : history.length === 0 ? (
            <EmptyState icon="calendar" title="Nothing filled in yet">Your first saved day shows up here.</EmptyState>
          ) : (
            <ul className="hist-list">
              {history.map((h) => (
                <li key={h.on_date}>
                  <details className={h.on_date === date ? "current" : ""}>
                    <summary><Icon name="check" size={14} /><span className="grow">{fmtDay(h.on_date)}{h.on_date === today ? " (today)" : ""}</span><Icon name="down" size={14} /></summary>
                    <div className="hist-body">
                      <ValuesView fields={fields} values={h.values} />
                      <button type="button" className="btn secondary sm" onClick={() => void pick(h.on_date)}><Icon name="edit" size={14} />Edit this day</button>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
