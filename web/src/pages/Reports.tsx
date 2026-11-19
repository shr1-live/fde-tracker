import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { byWeek, errText, useProgram } from "../lib/useProgram";
import { canManage, fmtDay, isoDay, reports, saveBlob, type DailyReport, type Program, type ProgramReport, type Values } from "../lib/v3";
import { ProgramHeader } from "../components/ProgramHeader";
import { ValuesView } from "../components/FormFields";
import { Chip } from "../components/Chip";
import { Icon } from "../components/Icon";

const started = (r: { values: Values; completed: boolean }) => r.completed || Object.values(r.values ?? {}).some((v) => String(v).trim() !== "");
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "program";

function DownloadButton({ label, get, name }: { label: string; get: () => Promise<Blob>; name: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <span className="dl">
      <button type="button" className="btn" disabled={busy} onClick={async () => { setBusy(true); setErr(""); try { saveBlob(await get(), name); } catch (e) { setErr(errText(e)); } finally { setBusy(false); } }}>
        <Icon name="download" />{busy ? "Preparing" : label}
      </button>
      {err && <span className="small err" role="alert"> {err}</span>}
    </span>
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
  useEffect(() => { setData(null); reports.daily(program.id, from, to).then(setData).catch((e) => { setErr(errText(e)); setData({ fields: [], people: [], dates: [], cells: [] }); }); }, [program.id, from, to]);
  const cells = useMemo(() => new Map((data?.cells ?? []).map((c) => [`${c.user_id}|${c.on_date}`, c.values])), [data]);
  return (
    <>
      <div className="card feedbar noprint">
        <div><label htmlFor="r-from">From</label><input id="r-from" type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} /></div>
        <div><label htmlFor="r-to">To</label><input id="r-to" type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} /></div>
        <div className="dlcell"><DownloadButton label="Download Excel" get={() => reports.dailyXlsx(program.id, from, to)} name={`${slug(program.name)}-daily-${from}-${to}.xlsx`} /></div>
      </div>
      {err && <p className="banner err" role="alert">{err}</p>}
      {!data ? <p className="muted">Loading...</p> : data.people.length === 0 ? <p className="muted">Nobody in this report yet.</p> : (
        <div className="tablewrap" tabIndex={0} role="region" aria-label="Daily status by person and day, scrolls sideways">
          <table className="sheet grid">
            <thead><tr><th scope="col">Name</th>{data.dates.map((d) => <th key={d} scope="col" className="tnum">{fmtDay(d)}</th>)}</tr></thead>
            <tbody>{data.people.map((p) => (
              <tr key={p.user_id}>
                <th scope="row">{p.name}</th>
                {data.dates.map((d) => {
                  const v = cells.get(`${p.user_id}|${d}`);
                  return <td key={d}>{v ? <button type="button" className="cellbtn" onClick={() => setOpen({ name: p.name, date: d, values: v })} aria-label={`${p.name}, ${fmtDay(d)}: open`}><Icon name="check" />View</button> : <span className="muted" aria-label="not filled">-</span>}</td>;
                })}
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {open && data && (
        <section className="card gap" aria-live="polite" aria-label="Selected status">
          <div className="work-head"><h3>{open.name}, {fmtDay(open.date)}</h3><button type="button" className="btn ghost sm" onClick={() => setOpen(null)}>Close</button></div>
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
  useEffect(() => { reports.program(program.id).then((d) => { setData(d); setWho((w) => w || d.people[0]?.user_id || ""); }).catch((e) => { setErr(errText(e)); setData({ days: [], fields: [], people: [] }); }); }, [program.id]);
  const person = data?.people.find((p) => p.user_id === who);
  // The server sends a row for every day; a row with nothing filled in and not completed counts as not started.
  const rows = useMemo(() => new Map((person?.rows ?? []).filter(started).map((r) => [r.day_id, r])), [person]);
  const many = (data?.people.length ?? 0) > 1;
  return (
    <>
      <div className="card feedbar noprint">
        {many && <div><label htmlFor="r-who">Person</label><select id="r-who" value={who} onChange={(e) => setWho(e.target.value)}>{data!.people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}</select></div>}
        <div className="dlcell"><DownloadButton label="Download Excel" get={() => reports.programXlsx(program.id)} name={`${slug(program.name)}-status-report.xlsx`} /></div>
      </div>
      {err && <p className="banner err" role="alert">{err}</p>}
      {!data ? <p className="muted">Loading...</p> : (
        <>
          {many && (
            <div className="tablewrap gapb" tabIndex={0} role="region" aria-label="Days completed per person">
              <table className="sheet">
                <thead><tr><th scope="col">Name</th><th scope="col">Days completed</th><th scope="col">In progress</th><th scope="col"><span className="sr">Open</span></th></tr></thead>
                <tbody>{data.people.map((p) => {
                  const c = p.rows.filter((r) => r.completed).length;
                  return <tr key={p.user_id}><th scope="row">{p.name}</th><td className="tnum">{c} of {data.days.length}</td><td className="tnum">{p.rows.filter((r) => !r.completed && started(r)).length}</td><td><button type="button" className="linkish" onClick={() => setWho(p.user_id)} aria-pressed={who === p.user_id}>Show<span className="sr"> {p.name}</span></button></td></tr>;
                })}</tbody>
              </table>
            </div>
          )}
          {person && (
            <>
              <h2>{person.name}</h2>
              <div className="tablewrap" tabIndex={0} role="region" aria-label={`${person.name}: status per day`}>
                <table className="sheet">
                  <thead><tr><th scope="col">Week</th><th scope="col">Topic</th><th scope="col">Practical task</th>{data.fields.map((f) => <th key={f.key} scope="col">{f.label}</th>)}<th scope="col">Completed</th></tr></thead>
                  <tbody>{byWeek(data.days).flatMap(([w, days]) => days.map((d, i) => {
                    const r = rows.get(d.id);
                    return (
                      <tr key={d.id}>
                        <td>{i === 0 ? <b>Week {w}</b> : ""}</td>
                        <td><span className="small muted">Day {d.day}</span><br />{d.topic}</td>
                        <td className="small wrap clamp">{d.practical_task ?? <span className="muted">-</span>}</td>
                        {data.fields.map((f) => <td key={f.key} className="small wrap">{r?.values[f.key] !== undefined ? String(r.values[f.key]) : <span className="muted">-</span>}</td>)}
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
  const { program, error } = useProgram(pid);
  const [tab, setTab] = useState<"daily" | "program">("daily");
  if (error) return <><header className="ph"><h1>Reports</h1></header><p className="banner err" role="alert">{error}</p></>;
  if (!program) return <p className="muted">Loading...</p>;
  const all = canManage(program.my_role);
  return (
    <>
      <ProgramHeader program={program} page="Reports" intro={all ? "Everyone's daily status and program status in this program. Download either one as Excel in the same layout as the sheets." : "Your own daily status and program status. Download either one as Excel."} />
      <div className="seg" role="group" aria-label="Report">
        <button type="button" className={tab === "daily" ? "on" : ""} aria-pressed={tab === "daily"} onClick={() => setTab("daily")}>Daily status</button>
        <button type="button" className={tab === "program" ? "on" : ""} aria-pressed={tab === "program"} onClick={() => setTab("program")}>Program status</button>
      </div>
      {tab === "daily" ? <Daily program={program} /> : <ProgramWise program={program} />}
    </>
  );
}
