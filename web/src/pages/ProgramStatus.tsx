import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { byWeek, errText, useProgram } from "../lib/useProgram";
import { status, type DayStatus } from "../lib/v3";
import { ProgramHeader } from "../components/ProgramHeader";
import { Chip } from "../components/Chip";
import { EmptyState, ErrorState, PageSkeleton, TableSkeleton } from "../components/States";

/** My program status: one row per day, like a person's tab in the "Training Program Status Report" sheet. */
export default function ProgramStatus() {
  const { pid } = useParams();
  const { program, error, reload } = useProgram(pid);
  const [rows, setRows] = useState<Map<string, DayStatus> | null>(null);
  const [err, setErr] = useState("");
  const member = program?.my_role === "member" || program?.my_role === "coordinator";
  const load = () => { if (!pid) return; setErr(""); status.days(pid).then((r) => setRows(new Map(r.map((x) => [x.day_id, x])))).catch((e) => { setErr(errText(e)); setRows(new Map()); }); };
  useEffect(() => { if (member) load(); }, [pid, member]); // eslint-disable-line react-hooks/exhaustive-deps
  if (error) return <div className="content"><ErrorState title="Could not open this program" message={error} onRetry={reload} /></div>;
  if (!program) return <div className="content"><PageSkeleton /></div>;
  if (!member) {
    return (
      <div className="content">
        <ProgramHeader program={program} page="Program status" />
        <EmptyState icon="chart" title="No program status for admins" action={<Link className="btn" to={`/p/${program.id}/reports`}>Open reports</Link>}>You manage this program as the admin. Everyone's program status is on Reports.</EmptyState>
      </div>
    );
  }
  const fields = program.forms.day;
  const done = rows ? [...rows.values()].filter((r) => r.completed).length : 0;
  return (
    <div className="content">
      <ProgramHeader program={program} page="Program status" intro="Your status for each day of the plan. To fill in or change a day, open it on the Plan." />
      {err && <ErrorState title="Could not load your status" message={err} onRetry={load} />}
      {rows === null ? <TableSkeleton /> : program.days.length === 0 ? (
        <EmptyState icon="tasks" title="No days in the plan yet">When the coordinator adds days to the plan, your status for each one shows up here.</EmptyState>
      ) : (
        <>
          <div className="summary-row">
            <div className="stat"><span className="stat-num">{done}</span><span className="stat-label">of {program.days.length} days completed</span></div>
            <div className="stat"><span className="stat-num">{[...rows.values()].filter((r) => !r.completed).length}</span><span className="stat-label">in progress</span></div>
          </div>
          <div className="table-wrap" tabIndex={0} role="region" aria-label="My status per day, scrolls sideways on small screens">
            <table className="table">
              <thead><tr><th scope="col">Week</th><th scope="col">Topic</th>{fields.map((f) => <th key={f.key} scope="col">{f.label}</th>)}<th scope="col">Completed</th><th scope="col"><span className="sr">Open</span></th></tr></thead>
              <tbody>
                {byWeek(program.days).flatMap(([w, days]) => days.map((d, i) => {
                  const r = rows.get(d.id);
                  return (
                    <tr key={d.id} className={i === 0 ? "week-start" : ""}>
                      <td className="nowrap">{i === 0 ? <b>Week {w}</b> : ""}</td>
                      <td className="topic-cell"><span className="meta">Day {d.day}</span>{d.topic}</td>
                      {fields.map((f) => <td key={f.key} className="prewrap clamp">{r?.values[f.key] !== undefined ? String(r.values[f.key]) : <span className="muted">-</span>}</td>)}
                      <td>{r?.completed ? <Chip tone="ok">Yes</Chip> : r ? <Chip tone="info">In progress</Chip> : <Chip>No</Chip>}</td>
                      <td className="nowrap"><Link to={`/p/${program.id}#day-${d.id}`}>{r ? "Edit" : "Fill in"}<span className="sr"> Week {w} Day {d.day}</span></Link></td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
