import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { byWeek, errText, useProgram } from "../lib/useProgram";
import { status, type DayStatus } from "../lib/v3";
import { ProgramHeader } from "../components/ProgramHeader";
import { Chip } from "../components/Chip";

/** My program status: one row per day, like a person's tab in the "Training Program Status Report" sheet. */
export default function ProgramStatus() {
  const { pid } = useParams();
  const { program, error } = useProgram(pid);
  const [rows, setRows] = useState<Map<string, DayStatus> | null>(null);
  const [err, setErr] = useState("");
  const member = program?.my_role === "member" || program?.my_role === "coordinator";
  useEffect(() => {
    if (!pid || !member) return;
    status.days(pid).then((r) => setRows(new Map(r.map((x) => [x.day_id, x])))).catch((e) => { setErr(errText(e)); setRows(new Map()); });
  }, [pid, member]);
  if (error) return <><header className="ph"><h1>Program status</h1></header><p className="banner err" role="alert">{error}</p></>;
  if (!program) return <p className="muted">Loading...</p>;
  if (!member) return (<><ProgramHeader program={program} page="Program status" /><div className="card"><p>You manage this program as the admin. Everyone's program status is on <Link to={`/p/${program.id}/reports`}>Reports</Link>.</p></div></>);
  const fields = program.forms.day;
  const done = rows ? [...rows.values()].filter((r) => r.completed).length : 0;
  return (
    <>
      <ProgramHeader program={program} page="Program status" intro="Your status for each day of the plan. To fill in or change a day, open it on the Plan." />
      {err && <p className="banner err" role="alert">{err}</p>}
      <p className="muted">{done} of {program.days.length} days completed.</p>
      {rows === null ? <p className="muted">Loading...</p> : (
        <div className="tablewrap" tabIndex={0} role="region" aria-label="My status per day, scrolls sideways on small screens">
          <table className="sheet">
            <thead><tr><th scope="col">Week</th><th scope="col">Topic</th>{fields.map((f) => <th key={f.key} scope="col">{f.label}</th>)}<th scope="col">Completed</th><th scope="col"><span className="sr">Open</span></th></tr></thead>
            <tbody>
              {byWeek(program.days).flatMap(([w, days]) => days.map((d, i) => {
                const r = rows.get(d.id);
                return (
                  <tr key={d.id}>
                    <td>{i === 0 ? <b>Week {w}</b> : ""}</td>
                    <td><span className="small muted">Day {d.day}</span><br />{d.topic}</td>
                    {fields.map((f) => <td key={f.key} className="wrap small">{r?.values[f.key] !== undefined ? String(r.values[f.key]) : <span className="muted">-</span>}</td>)}
                    <td>{r?.completed ? <Chip tone="ok">Yes</Chip> : r ? <Chip tone="info">In progress</Chip> : <Chip>No</Chip>}</td>
                    <td><Link to={`/p/${program.id}#day-${d.id}`}>{r ? "Edit" : "Fill in"}<span className="sr"> Week {w} Day {d.day}</span></Link></td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
