import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { errText } from "../lib/useProgram";
import { refreshMe, useMe } from "../lib/useRole";
import { programs, ROLE_LABEL, type ProgramSummary } from "../lib/v3";
import { Chip } from "../components/Chip";

/** Admin: every program, and create a new one. */
export default function Programs() {
  const { me, ready } = useMe();
  const [list, setList] = useState<ProgramSummary[] | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => programs.list().then(setList).catch((e) => { setMsg(errText(e)); setList([]); });
  useEffect(() => { void load(); }, []);
  if (ready && me?.role !== "admin") return <Navigate to="/" replace />;
  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) { setMsg("Give the program a name (at least 2 characters)."); return; }
    setBusy(true); setMsg("");
    try { await programs.create({ name: name.trim(), description: description.trim() || undefined, starts_on: startsOn || undefined }); setName(""); setDescription(""); setStartsOn(""); setMsg("Program created. Open it, then Manage to invite a coordinator."); await load(); refreshMe(); }
    catch (e2) { setMsg(errText(e2)); } finally { setBusy(false); }
  };
  return (
    <>
      <header className="ph"><h1>Programs</h1><p className="muted">As the admin you see every program. Create one, then invite its coordinator from its Manage page; the coordinator can run it from there.</p></header>
      <div className="two cards">
        <section className="card" aria-labelledby="pl-h">
          <h2 id="pl-h">All programs</h2>
          {list === null ? <p className="muted">Loading...</p> : list.length === 0 ? <p className="muted">No programs yet.</p> : (
            <ul className="proglist">{list.map((p) => (
              <li key={p.id}>
                <Link to={`/p/${p.id}`}><b>{p.name}</b></Link> <Chip>{ROLE_LABEL[p.my_role]}</Chip>
                <div className="small muted">{p.member_count} {p.member_count === 1 ? "person" : "people"}{p.starts_on ? ` · starts ${p.starts_on}` : ""}</div>
                <div className="row tight"><Link className="btn ghost sm" to={`/p/${p.id}/manage`}>Manage<span className="sr"> {p.name}</span></Link><Link className="btn ghost sm" to={`/p/${p.id}/reports`}>Reports<span className="sr"> {p.name}</span></Link></div>
              </li>
            ))}</ul>
          )}
        </section>
        <form className="card" onSubmit={create} aria-labelledby="pc-h">
          <h2 id="pc-h">New program</h2>
          <label htmlFor="pc-name">Name</label><input id="pc-name" maxLength={80} placeholder="e.g. DevOps Training Program" value={name} onChange={(e) => setName(e.target.value)} />
          <label htmlFor="pc-desc">Description <span className="small muted">(optional)</span></label><textarea id="pc-desc" rows={2} maxLength={600} value={description} onChange={(e) => setDescription(e.target.value)} />
          <label htmlFor="pc-start">Start date <span className="small muted">(optional)</span></label><input id="pc-start" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
          <button className="btn" disabled={busy}>{busy ? "Creating" : "Create program"}</button>
          {msg && <p className="small" role="status">{msg}</p>}
        </form>
      </div>
    </>
  );
}
