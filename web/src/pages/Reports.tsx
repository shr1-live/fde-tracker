import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { byWeek, errText, useProgram } from "../lib/useProgram";
import { canManage, fmtDay, isoDay, reports, saveBlob, type DailyReport, type Program, type ProgramReport, type Values } from "../lib/v3";
import { ProgramHeader } from "../components/ProgramHeader";
import { ValuesView } from "../components/FormFields";
import { Chip } from "../components/Chip";
import { Icon } from "../components/Icon";
import { Avatar } from "../components/Avatar";
import { EmptyState, ErrorState, PageSkeleton, TableSkeleton } from "../components/States";
import { useToast } from "../components/Toast";

const started = (r: { values: Values; completed: boolean }) => r.completed || Object.values(r.values ?? {}).some((v) => String(v).trim() !== "");
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "program";

function DownloadButton({ label, get, name }: { label: string; get: () => Promise<Blob>; name: string }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <button type="button" className="btn" disabled={busy} onClick={async () => { setBusy(true); try { saveBlob(await get(), name); toast.success("Excel file downloaded."); } catch (e) { toast.error(errText(e)); } finally { setBusy(false); } }}>
      <Icon name="download" size={16} />{busy ? "Preparing" : label}
    </button>
  );
}

function Daily({ program }: { program: Program }) {
  const today = new Date();
  const start = new Date(); start.setDate(start.getDate() - 13);
  const [from, setFrom] = useState(isoDay(program.starts_on && new Date(program.starts_on) > start ? new Date(program.starts_on + "T00:00:00") : start));
  const [to, setTo] = useState(isoDay(today));
  const [data, setData] = useState<DailyReport | null>(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<{ name: string; date: string; values: Values } | null>(null);
  const detail = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const load = () => { setData(null); setErr(""); reports.daily(program.id, from, to).then(setData).catch((e) => { setErr(errText(e)); setData({ fields: [], people: [], dates: [], cells: [] }); }); };
  useEffect(load, [program.id, from, to]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) detail.current?.focus(); }, [open]);
  const cells = useMemo(() => new Map((data?.cells ?? []).map((c) => [`${c.user_id}|${c.on_date}`, c.values])), [data]);
  return (
    <>
      <div className="card toolbar">
        <div className="field"><label htmlFor="r-from">From</label><input id="r-from" type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} /></div>
        <div className="field"><label htmlFor="r-to">To</label><input id="r-to" type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} /></div>
        <div className="toolbar-end"><DownloadButton label="Download Excel" get={() => reports.dailyXlsx(program.id, from, to)} name={`${slug(program.name)}-daily-${from}-${to}.xlsx`} /></div>
      </div>
      {err ? <ErrorState title="Could not load the report" message={err} onRetry={load} />
        : !data ? <TableSkeleton rows={4} cols={7} />
        : data.people.length === 0 ? <EmptyState icon="user" title="Nobody in this report yet">Invite people on the Manage page; their daily status shows up here once they fill it in.</EmptyState>
        : (
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Daily status by person and day, scrolls sideways">
            <table className="table sheet">
              <thead><tr><th scope="col" className="sticky-col">Name</th>{data.dates.map((d) => <th key={d} scope="col" className="tnum nowrap">{fmtDay(d)}</th>)}</tr></thead>
              <tbody>{data.people.map((p) => (
                <tr key={p.user_id}>
                  <th scope="row" className="sticky-col"><span className="person"><Avatar name={p.name} size="sm" />{p.name}</span></th>
                  {data.dates.map((d) => {
                    const v = cells.get(`${p.user_id}|${d}`);
                    const on = open?.name === p.name && open.date === d;
                    return <td key={d} className="cell-center">{v
                      ? <button type="button" className={"cellbtn" + (on ? " on" : "")} aria-pressed={on} onClick={(e) => { opener.current = e.currentTarget; setOpen({ name: p.name, date: d, values: v }); }} aria-label={`${p.name}, ${fmtDay(d)}: view`}><Icon name="check" size={14} />View</button>
                      : <span className="cell-empty" aria-label="not filled">-</span>}</td>;
                  })}
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      {open && data && (
        <section ref={detail} tabIndex={-1} className="card detail" aria-label="Selected status">
          <div className="card-head"><h3 className="card-title">{open.name} · {fmtDay(open.date)}</h3><button type="button" className="iconbtn" aria-label="Close" onClick={() => { setOpen(null); opener.current?.focus(); }}><Icon name="x" size={16} /></button></div>
          <ValuesView fields={data.fields} values={open.values} />
        </section>
      )}
    </>
  );
}

function ProgramWise({ program }: { program: Program }) {
  const [data, setData] = useState<ProgramReport | null>(null);
  const [err, setErr] = useState("");
  const [who, setWho] = useState("");
  const load = () => { setErr(""); setData(null); reports.program(program.id).then((d) => { setData(d); setWho((w) => w || d.people[0]?.user_id || ""); }).catch((e) => { setErr(errText(e)); setData({ days: [], fields: [], people: [] }); }); };
  useEffect(load, [program.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const person = data?.people.find((p) => p.user_id === who);
  // The server sends a row for every day; a row with nothing filled in and not completed counts as not started.
  const rows = useMemo(() => new Map((person?.rows ?? []).filter(started).map((r) => [r.day_id, r])), [person]);
  const many = (data?.people.length ?? 0) > 1;
  return (
    <>
      <div className="card toolbar">
        {many && <div className="field"><label htmlFor="r-who">Person</label><div className="select-wrap"><select id="r-who" value={who} onChange={(e) => setWho(e.target.value)}>{data!.people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}</select></div></div>}
        <div className="toolbar-end"><DownloadButton label="Download Excel" get={() => reports.programXlsx(program.id)} name={`${slug(program.name)}-status-report.xlsx`} /></div>
      </div>
      {err ? <ErrorState title="Could not load the report" message={err} onRetry={load} /> : !data ? <TableSkeleton /> : data.people.length === 0 ? (
        <EmptyState icon="user" title="Nobody in this report yet">Invite people on the Manage page; their program status shows up here.</EmptyState>
      ) : (
        <>
          {many && (
            <div className="table-wrap gap-b" tabIndex={0} role="region" aria-label="Days completed per person">
              <table className="table">
                <thead><tr><th scope="col">Name</th><th scope="col">Days completed</th><th scope="col">In progress</th><th scope="col"><span className="sr">Open</span></th></tr></thead>
                <tbody>{data.people.map((p) => {
                  const c = p.rows.filter((r) => r.completed).length;
                  const pct = data.days.length ? Math.round((c / data.days.length) * 100) : 0;
                  return (
                    <tr key={p.user_id} className={who === p.user_id ? "selected" : ""}>
                      <th scope="row"><span className="person"><Avatar name={p.name} size="sm" />{p.name}</span></th>
                      <td><span className="mini-progress"><span className="progress sm" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span><span className="tnum">{c} of {data.days.length}</span></span></td>
                      <td className="tnum">{p.rows.filter((r) => !r.completed && started(r)).length}</td>
                      <td><button type="button" className="btn ghost sm" onClick={() => setWho(p.user_id)} aria-pressed={who === p.user_id}>Show<span className="sr"> {p.name}</span></button></td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          )}
          {person && (
            <>
              <h2 className="section-title">{person.name}</h2>
              <div className="table-wrap" tabIndex={0} role="region" aria-label={`${person.name}: status per day`}>
                <table className="table">
                  <thead><tr><th scope="col">Week</th><th scope="col">Topic</th><th scope="col">Practical task</th>{data.fields.map((f) => <th key={f.key} scope="col">{f.label}</th>)}<th scope="col">Completed</th></tr></thead>
                  <tbody>{byWeek(data.days).flatMap(([w, days]) => days.map((d, i) => {
                    const r = rows.get(d.id);
                    return (
                      <tr key={d.id} className={i === 0 ? "week-start" : ""}>
                        <td className="nowrap">{i === 0 ? <b>Week {w}</b> : ""}</td>
                        <td className="topic-cell"><span className="meta">Day {d.day}</span>{d.topic}</td>
                        <td className="prewrap clamp">{d.practical_task ?? <span className="muted">-</span>}</td>
                        {data.fields.map((f) => <td key={f.key} className="prewrap clamp">{r?.values[f.key] !== undefined ? String(r.values[f.key]) : <span className="muted">-</span>}</td>)}
                        <td>{r?.completed ? <Chip tone="ok">Yes</Chip> : r ? <Chip tone="info">In progress</Chip> : <Chip>No</Chip>}</td>
                      </tr>
                    );
                  }))}</tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

export default function Reports() {
  const { pid } = useParams();
  const { program, error, reload } = useProgram(pid);
  const [tab, setTab] = useState<"daily" | "program">("daily");
  if (error) return <div className="content"><ErrorState title="Could not open this program" message={error} onRetry={reload} /></div>;
  if (!program) return <div className="content"><PageSkeleton /></div>;
  const all = canManage(program.my_role);
  return (
    <div className="content">
      <ProgramHeader program={program} page="Reports" intro={all ? "Everyone's daily status and program status in this program. Download either one as Excel in the same layout as the sheets." : "Your own daily status and program status. Download either one as Excel."} />
      <div className="seg" role="group" aria-label="Report">
        <button type="button" aria-pressed={tab === "daily"} onClick={() => setTab("daily")}><Icon name="calendar" size={16} />Daily status</button>
        <button type="button" aria-pressed={tab === "program"} onClick={() => setTab("program")}><Icon name="tasks" size={16} />Program status</button>
      </div>
      {tab === "daily" ? <Daily program={program} /> : <ProgramWise program={program} />}
    </div>
  );
}
