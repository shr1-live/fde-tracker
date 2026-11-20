import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { errText, useProgram } from "../lib/useProgram";
import { checkValues, cleanValues, fmtDay, isoDay, status, type DailyEntry, type Field, type Values } from "../lib/v3";
import { sameValues, useUnsaved } from "../lib/unsaved";
import { FormFields } from "../components/FormFields";
import { ProgramHeader } from "../components/ProgramHeader";
import { Chip } from "../components/Chip";
import { Icon } from "../components/Icon";
import { EmptyState, ErrorState, PageSkeleton } from "../components/States";
import { useConfirm } from "../components/Confirm";
import { useToast } from "../components/Toast";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const parse = (iso: string) => new Date(iso + "T00:00:00");
const addDays = (iso: string, n: number) => { const d = parse(iso); d.setDate(d.getDate() + n); return isoDay(d); };
/** The Monday of the week that holds this day. */
const mondayOf = (iso: string) => addDays(iso, -((parse(iso).getDay() + 6) % 7));
const weekend = (iso: string) => { const g = parse(iso).getDay(); return g === 0 || g === 6; };
const range = (from: string) => {
  const a = parse(from), b = parse(addDays(from, 6));
  const f = (d: Date, y: boolean) => d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: y ? "numeric" : undefined });
  return `${f(a, a.getFullYear() !== b.getFullYear())} – ${f(b, true)}`;
};
const short = (v: string | number | undefined, f: Field) => (v === undefined || v === "" ? "" : f.type === "rating" ? `${v} / 5` : String(v));

type DayState = "filled" | "missed" | "today" | "open" | "future" | "weekend";
const LABEL: Record<DayState, string> = { filled: "Filled in", missed: "Missing", today: "Today, not filled in", open: "Not filled in", future: "Not open yet", weekend: "Weekend" };

/**
 * Daily status as a weekly timesheet: the whole week at a glance (what is filled, what is missing), and the chosen day's form
 * underneath. A reminder link (?date=YYYY-MM-DD) opens straight on the missed day.
 */
export default function DailyStatus() {
  const { pid } = useParams();
  const [sp, setSp] = useSearchParams();
  const { program, error, reload } = useProgram(pid);
  const today = isoDay(new Date());
  const maxDay = addDays(today, 1);
  const asked = sp.get("date");
  const start = asked && ISO.test(asked) && asked <= maxDay && asked >= "2020-01-01" ? asked : today;
  const [date, setDate] = useState(start);
  const [week, setWeek] = useState(mondayOf(start));
  const [entries, setEntries] = useState<Map<string, DailyEntry>>(new Map());
  const [loaded, setLoaded] = useState<Set<string>>(new Set()); // the weeks fetched so far
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const confirm = useConfirm();
  const toast = useToast();
  const member = program?.my_role === "member" || program?.my_role === "coordinator";
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(week, i)), [week]);
  const weekReady = loaded.has(week);

  // A reminder link while the page is already open: jump to that day.
  useEffect(() => {
    if (asked && ISO.test(asked) && asked <= maxDay && asked !== date) { setDate(asked); setWeek(mondayOf(asked)); }
  }, [asked]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pid || !member || loaded.has(week)) return;
    let alive = true;
    status.daily(pid, { from: week, to: addDays(week, 6) })
      .then((rows) => { if (!alive) return; setEntries((m) => { const n = new Map(m); rows.forEach((r) => n.set(r.on_date, r)); return n; }); setLoaded((s) => new Set(s).add(week)); })
      .catch((e) => { if (alive) { toast.error(errText(e)); setLoaded((s) => new Set(s).add(week)); } });
    return () => { alive = false; };
  }, [pid, member, week, loaded, toast]);

  const existing = entries.get(date);
  useEffect(() => { setValues(existing?.values ?? {}); setErrors({}); setMsg(""); }, [date, existing]);
  const dirty = !sameValues(values, existing?.values ?? {});
  useUnsaved("daily-status", !!member && weekReady && dirty);

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

  const startsOn = program.starts_on ?? "2020-01-01";
  const stateOf = (d: string): DayState =>
    entries.has(d) ? "filled" : d === today ? "today" : d > maxDay ? "future" : weekend(d) ? "weekend" : d < today && d >= startsOn ? "missed" : "open";
  const workdays = days.filter((d) => !weekend(d) && d <= today && d >= startsOn);
  const filled = workdays.filter((d) => entries.has(d)).length;
  const missed = days.filter((d) => stateOf(d) === "missed").length;
  const thisWeek = mondayOf(today);

  const leaveOk = async () => !dirty || await confirm({ title: "Switch day without saving?", body: `Your changes for ${fmtDay(date)} are not saved yet.`, confirm: "Switch day", cancel: "Stay", danger: true });
  const pick = async (d: string) => {
    if (d === date || d > maxDay || !(await leaveOk())) return;
    setDate(d);
    if (sp.has("date")) setSp((p) => { p.delete("date"); return p; }, { replace: true });
    setTimeout(() => document.getElementById("ds-form")?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 0);
  };
  const goWeek = async (monday: string) => {
    if (!(await leaveOk())) return;
    setWeek(monday);
    if (sp.has("date")) setSp((p) => { p.delete("date"); return p; }, { replace: true });
    // Open on today in the current week, otherwise on that week's Friday (or Monday for a week still to come).
    setDate(monday === thisWeek ? today : monday > today ? monday : addDays(monday, 4));
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const errs = checkValues(fields, values, true);
    setErrors(errs);
    if (Object.keys(errs).length) { setMsg("Fill in the marked fields."); document.getElementById(`ds-${Object.keys(errs)[0]}`)?.focus(); return; }
    setBusy(true); setMsg("");
    try {
      const saved = await status.saveDaily(program.id, date, cleanValues(fields, values));
      setEntries((m) => new Map(m).set(saved.on_date, saved));
      window.dispatchEvent(new Event("fde:daily-saved")); // the bell drops the reminder for this day
      const next = days.find((d) => d !== date && stateOf(d) === "missed");
      toast.success(`Saved your status for ${fmtDay(date)}.${next ? ` ${fmtDay(next)} is still missing.` : ""}`);
    } catch (e2) { toast.error(errText(e2)); } finally { setBusy(false); }
  };

  return (
    <div className="content">
      <ProgramHeader program={program} page="Daily status" intro="Your week at a glance. Pick a day to fill it in or change it; press (i) next to a field to see what to write." />
      <section className="card timesheet-card" aria-labelledby="ts-h">
        <div className="ts-toolbar">
          <div className="ts-nav">
            <button type="button" className="iconbtn" aria-label="Previous week" onClick={() => void goWeek(addDays(week, -7))}><Icon name="left" /></button>
            <h2 id="ts-h" className="ts-range">{range(week)}</h2>
            <button type="button" className="iconbtn" aria-label="Next week" disabled={addDays(week, 7) > maxDay} onClick={() => void goWeek(addDays(week, 7))}><Icon name="right" /></button>
            {week !== thisWeek && <button type="button" className="btn ghost sm" onClick={() => void goWeek(thisWeek)}>This week</button>}
          </div>
          <div className="ts-summary" aria-live="polite">
            <span><b>{filled} / {workdays.length}</b> <span className="meta">working days filled</span></span>
            {missed > 0 && <Chip tone="warn">{missed} missing</Chip>}
          </div>
        </div>
        <div className="progress ts-progress" role="progressbar" aria-label="Working days filled this week" aria-valuenow={filled} aria-valuemin={0} aria-valuemax={workdays.length}>
          <span style={{ width: `${workdays.length ? Math.round((filled / workdays.length) * 100) : 0}%` }} />
        </div>
        <div className="ts-scroll" role="region" aria-label="This week's daily status" tabIndex={0}>
          <table className="timesheet">
            <thead>
              <tr>
                <th scope="col" className="ts-field">Field</th>
                {days.map((d) => {
                  const st = stateOf(d);
                  const dt = parse(d);
                  return (
                    <th key={d} scope="col" className={`ts-day ${st}${d === date ? " current" : ""}`}>
                      <button type="button" onClick={() => void pick(d)} disabled={st === "future"} aria-pressed={d === date} aria-label={`${fmtDay(d)}: ${LABEL[st]}`}>
                        <span className="ts-dow">{dt.toLocaleDateString(undefined, { weekday: "short" })}</span>
                        <span className="ts-date">{dt.getDate()} {dt.toLocaleDateString(undefined, { month: "short" })}</span>
                        <span className={`ts-mark ${st}`} aria-hidden="true">{st === "filled" ? <Icon name="check" size={12} strokeWidth={3} /> : st === "missed" ? "!" : ""}</span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.key}>
                  <th scope="row" className="ts-field">{f.label}</th>
                  {days.map((d) => {
                    const st = stateOf(d);
                    const v = short(entries.get(d)?.values[f.key], f);
                    return (
                      <td key={d} className={`${st}${d === date ? " current" : ""}`} onClick={() => void pick(d)}>
                        {!weekReady ? <span className="ts-skel" /> : v ? <span className="ts-val" title={v}>{v}</span> : <span className="ts-empty">{st === "missed" ? "Missing" : "–"}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="meta ts-legend">
          <span className="ts-mark filled" aria-hidden="true"><Icon name="check" size={10} strokeWidth={3} /></span> filled
          <span className="ts-mark missed" aria-hidden="true">!</span> missing: you get a reminder at 10:00 the next working day
        </p>
      </section>

      <form id="ds-form" className="card" onSubmit={save} aria-label={`Daily status for ${fmtDay(date)}`} noValidate>
        <div className="card-head">
          <h2 className="card-title">{fmtDay(date)}{date === today ? " (today)" : ""}</h2>
          {existing ? <Chip tone="ok">Filled in</Chip> : stateOf(date) === "missed" ? <Chip tone="warn">Missing</Chip> : <Chip tone="none">Not filled in yet</Chip>}
        </div>
        <FormFields fields={fields} values={values} onChange={(v) => { setValues(v); if (Object.keys(errors).length) { setErrors({}); setMsg(""); } }} errors={errors} idPrefix="ds" disabled={busy || !weekReady} />
        {msg && <p className="field-error" role="alert">{msg}</p>}
        <div className="card-foot">
          {dirty && <span className="meta unsaved"><span className="dot" aria-hidden="true" />Unsaved changes</span>}
          <button className="btn" disabled={busy || !weekReady}>{!weekReady ? "Loading" : busy ? "Saving" : existing ? "Update status" : "Save status"}</button>
        </div>
      </form>
    </div>
  );
}
