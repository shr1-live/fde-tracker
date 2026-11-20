import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { errText } from "../lib/useProgram";
import { refreshMe, useMe } from "../lib/useRole";
import { fmtDay, programs, ROLE_LABEL, type ProgramSummary } from "../lib/v3";
import { PageHeader } from "../components/ProgramHeader";
import { Chip } from "../components/Chip";
import { Icon } from "../components/Icon";
import { CardSkeleton, EmptyState, ErrorState, Loading } from "../components/States";
import { useToast } from "../components/Toast";

/** Admin: every program, and create a new one. */
export default function Programs() {
  const { me, ready } = useMe();
  const [list, setList] = useState<ProgramSummary[] | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const load = () => programs.list().then((l) => { setList(l); setLoadErr(""); }).catch((e) => { setLoadErr(errText(e)); setList([]); });
  useEffect(() => { void load(); }, []);
  if (ready && me?.role !== "admin") return <Navigate to="/" replace />;
  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) { setErr("Give the program a name (at least 2 characters)."); document.getElementById("pc-name")?.focus(); return; }
    setBusy(true); setErr("");
    try { await programs.create({ name: name.trim(), description: description.trim() || undefined, starts_on: startsOn || undefined }); toast.success(`${name.trim()} created. Open it, then Manage to invite a coordinator.`); setName(""); setDescription(""); setStartsOn(""); await load(); refreshMe(); }
    catch (e2) { setErr(errText(e2)); } finally { setBusy(false); }
  };
  return (
    <div className="content">
      <PageHeader title="Programs" intro="As the admin you see every program. Create one, then invite its coordinator from its Manage page; the coordinator runs it from there." />
      <div className="split">
        <section aria-labelledby="pl-h">
          <h2 id="pl-h" className="section-title">All programs</h2>
          {loadErr ? <ErrorState title="Could not load programs" message={loadErr} onRetry={() => void load()} />
            : list === null ? <Loading><div className="stack"><CardSkeleton lines={2} /><CardSkeleton lines={2} /></div></Loading>
            : list.length === 0 ? <EmptyState icon="layers" title="No programs yet">Create the first one with the form. Then invite its coordinator.</EmptyState>
            : (
              <ul className="prog-grid">{list.map((p) => (
                <li key={p.id} className="card prog-card">
                  <div className="prog-top">
                    <span className="ps-tile lg" aria-hidden="true">{p.name.charAt(0)}</span>
                    <div className="grow">
                      <h3><Link to={`/p/${p.id}`}>{p.name}</Link></h3>
                      <p className="meta">{p.member_count} {p.member_count === 1 ? "person" : "people"}{p.starts_on ? ` · starts ${fmtDay(p.starts_on)}` : ""}</p>
                    </div>
                    <Chip tone="info">{ROLE_LABEL[p.my_role]}</Chip>
                  </div>
                  {p.description && <p className="prog-desc">{p.description}</p>}
                  <div className="prog-actions">
                    <Link className="btn secondary sm" to={`/p/${p.id}/manage`}><Icon name="user" size={14} />Manage<span className="sr"> {p.name}</span></Link>
                    <Link className="btn ghost sm" to={`/p/${p.id}/reports`}><Icon name="chart" size={14} />Reports<span className="sr"> {p.name}</span></Link>
                  </div>
                </li>
              ))}</ul>
            )}
        </section>
        <form className="card sticky-card" onSubmit={create} aria-labelledby="pc-h" noValidate>
          <h2 id="pc-h" className="card-title">New program</h2>
          <p className="meta">You can change all of this later.</p>
          <div className="field"><label htmlFor="pc-name">Name</label><input id="pc-name" maxLength={80} placeholder="e.g. DevOps Training Program" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!err || undefined} /></div>
          <div className="field"><label htmlFor="pc-desc">Description <span className="hint">optional</span></label><textarea id="pc-desc" rows={3} maxLength={600} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="field"><label htmlFor="pc-start">Start date <span className="hint">optional</span></label><input id="pc-start" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} /></div>
          {err && <p className="field-error" role="alert">{err}</p>}
          <button className="btn block" disabled={busy}><Icon name="plus" size={16} />{busy ? "Creating" : "Create program"}</button>
        </form>
      </div>
    </div>
  );
}
