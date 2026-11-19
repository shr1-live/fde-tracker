import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useParams } from "react-router-dom";
import { errText, useProgram } from "../lib/useProgram";
import { refreshMe, useMe } from "../lib/useRole";
import { canManage, programs, type Field, type FieldType, type FormKind, type Invite, type Member, type Program } from "../lib/v3";
import { ProgramHeader } from "../components/ProgramHeader";
import { Chip } from "../components/Chip";

const TYPES: [FieldType, string][] = [["text", "Short text"], ["longtext", "Long text"], ["number", "Number (e.g. hours)"], ["rating", "Rating 1 to 5"], ["url", "Link (https)"]];
const keyFrom = (label: string, taken: Set<string>) => {
  let k = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^[^a-z]+/, "").slice(0, 36) || "field";
  if (k.length < 2) k += "_x";
  let out = k, n = 2;
  while (taken.has(out)) out = `${k}_${n++}`;
  return out;
};

function Details({ program, onSaved }: { program: Program; onSaved: () => void }) {
  const [name, setName] = useState(program.name);
  const [description, setDescription] = useState(program.description ?? "");
  const [startsOn, setStartsOn] = useState(program.starts_on ?? "");
  const [msg, setMsg] = useState("");
  const save = async (e: FormEvent) => {
    e.preventDefault(); setMsg("");
    try { await programs.update(program.id, { name: name.trim(), description: description.trim() || null, starts_on: startsOn || null }); setMsg("Saved."); onSaved(); refreshMe(); }
    catch (e2) { setMsg(errText(e2)); }
  };
  return (
    <form className="card" onSubmit={save} aria-labelledby="m-details">
      <h2 id="m-details">Program details</h2>
      <label htmlFor="m-name">Name</label><input id="m-name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
      <label htmlFor="m-desc">Description</label><textarea id="m-desc" rows={2} maxLength={600} value={description} onChange={(e) => setDescription(e.target.value)} />
      <label htmlFor="m-start">Start date <span className="small muted">(Day 1; reports count working days from here)</span></label><input id="m-start" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
      <button className="btn">Save details</button>
      {msg && <p className="small" role="status">{msg}</p>}
    </form>
  );
}

function People({ program }: { program: Program }) {
  const { me } = useMe();
  const [data, setData] = useState<{ members: Member[]; invites: Invite[] } | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Member["role"]>("member");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => programs.members(program.id).then(setData).catch((e) => setMsg(errText(e)));
  useEffect(() => { void load(); }, [program.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const invite = async (e: FormEvent) => {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setMsg("Enter a valid email address."); return; }
    setBusy(true); setMsg("");
    try {
      const r = await programs.invite(program.id, em, role);
      setMsg(r.status === "added" ? `${em} already had an account and is now in this program.` : `Invite saved. Send ${em} the site link; they get in as soon as they sign in with this email.`);
      setEmail(""); await load();
    } catch (e2) { setMsg(errText(e2)); } finally { setBusy(false); }
  };
  const act = async (f: () => Promise<unknown>, ok: string) => { setMsg(""); try { await f(); setMsg(ok); await load(); refreshMe(); } catch (e) { setMsg(errText(e)); } };
  return (
    <section className="card gap" aria-labelledby="m-people">
      <h2 id="m-people">People</h2>
      <p className="small muted">Only invited people can sign in. A coordinator has full access to this program (plan, forms, people, everyone's status); a member fills in their own status. Coordinators can invite members and other coordinators.</p>
      <form className="invite" onSubmit={invite} aria-label="Invite someone">
        <div><label htmlFor="i-email">Email</label><input id="i-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" /></div>
        <div><label htmlFor="i-role">Role</label><select id="i-role" value={role} onChange={(e) => setRole(e.target.value as Member["role"])}><option value="member">Member</option><option value="coordinator">Coordinator</option></select></div>
        <button className="btn" disabled={busy}>{busy ? "Inviting" : "Invite"}</button>
      </form>
      {msg && <p className="small" role="status">{msg}</p>}
      {!data ? <p className="muted">Loading...</p> : (
        <>
          <div className="tablewrap gap" tabIndex={0} role="region" aria-label="Members of this program">
            <table>
              <thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col"><span className="sr">Remove</span></th></tr></thead>
              <tbody>{data.members.map((m) => {
                const self = m.user_id === me?.id;
                return (
                  <tr key={m.user_id}>
                    <td>{m.name}{self && <span className="small muted"> (you)</span>}</td>
                    <td className="small wrap">{m.email}</td>
                    <td>{self ? <Chip tone="info">{m.role === "coordinator" ? "Coordinator" : "Member"}</Chip> : (
                      <select aria-label={`Role of ${m.name}`} value={m.role} onChange={(e) => act(() => programs.setRole(program.id, m.user_id, e.target.value as Member["role"]), `${m.name} is now a ${e.target.value}.`)}>
                        <option value="member">Member</option><option value="coordinator">Coordinator</option>
                      </select>)}</td>
                    <td>{!self && <button type="button" className="btn ghost sm" onClick={() => window.confirm(`Remove ${m.name} from ${program.name}? Their status entries are kept.`) && act(() => programs.removeMember(program.id, m.user_id), `${m.name} was removed.`)}>Remove</button>}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
          {data.invites.length > 0 && (
            <>
              <h3>Invited, not signed in yet</h3>
              <ul className="plainlist">{data.invites.map((i) => (
                <li key={i.id}><span className="wrap">{i.email}</span> <Chip>{i.role === "coordinator" ? "Coordinator" : "Member"}</Chip> <button type="button" className="linkish small" onClick={() => act(() => programs.cancelInvite(program.id, i.id), "Invite cancelled.")}>Cancel invite<span className="sr"> for {i.email}</span></button></li>
              ))}</ul>
            </>
          )}
        </>
      )}
    </section>
  );
}

function FormEditor({ program, form, onSaved }: { program: Program; form: FormKind; onSaved: () => void }) {
  const [fields, setFields] = useState<Field[]>(program.forms[form]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setFields(program.forms[form]), [program, form]);
  const set = (i: number, patch: Partial<Field>) => setFields((f) => f.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: -1 | 1) => setFields((f) => { const n = [...f]; [n[i], n[i + d]] = [n[i + d]!, n[i]!]; return n; });
  const add = () => setFields((f) => [...f, { key: keyFrom("New field", new Set(f.map((x) => x.key))), label: "New field", description: "", type: "text", required: false }]);
  const save = async () => {
    if (fields.some((f) => !f.label.trim())) { setMsg("Every field needs a name."); return; }
    setBusy(true); setMsg("");
    try { await programs.saveForm(program.id, form, fields.map((f) => ({ ...f, label: f.label.trim(), description: f.description?.trim() || null }))); setMsg("Form saved. Everyone sees the new fields now."); onSaved(); }
    catch (e) { setMsg(errText(e)); } finally { setBusy(false); }
  };
  const title = form === "daily" ? "Daily status form" : "Program status form (per day)";
  const pid = `f-${form}`;
  return (
    <section className="card gap" aria-labelledby={pid}>
      <h2 id={pid}>{title}</h2>
      <p className="small muted">{form === "daily" ? "What everyone fills in at the end of each working day." : "What everyone fills in for each day of the plan."} The description is shown when people press (i) next to the field. Removing a field hides it; answers already given are kept.</p>
      <ol className="fedit">
        {fields.map((f, i) => (
          <li key={f.key} className="fitem">
            <div className="two">
              <div><label htmlFor={`${pid}-${f.key}-l`}>Field name</label><input id={`${pid}-${f.key}-l`} maxLength={80} value={f.label} onChange={(e) => set(i, { label: e.target.value })} /></div>
              <div><label htmlFor={`${pid}-${f.key}-t`}>Type</label><select id={`${pid}-${f.key}-t`} value={f.type} onChange={(e) => set(i, { type: e.target.value as FieldType })}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            </div>
            <label htmlFor={`${pid}-${f.key}-d`}>Description (shown on the (i) button)</label>
            <textarea id={`${pid}-${f.key}-d`} rows={2} maxLength={400} value={f.description ?? ""} onChange={(e) => set(i, { description: e.target.value })} />
            <div className="row tight">
              <label className="pickitem"><input type="checkbox" checked={f.required} onChange={(e) => set(i, { required: e.target.checked })} />Required</label>
              <button type="button" className="btn ghost sm" disabled={i === 0} onClick={() => move(i, -1)}>Up<span className="sr"> {f.label}</span></button>
              <button type="button" className="btn ghost sm" disabled={i === fields.length - 1} onClick={() => move(i, 1)}>Down<span className="sr"> {f.label}</span></button>
              <button type="button" className="btn ghost sm" disabled={fields.length === 1} onClick={() => setFields((x) => x.filter((_, j) => j !== i))}>Remove<span className="sr"> {f.label}</span></button>
            </div>
          </li>
        ))}
      </ol>
      <div className="row"><button type="button" className="btn ghost" onClick={add} disabled={fields.length >= 20}>Add a field</button><button type="button" className="btn" onClick={save} disabled={busy}>{busy ? "Saving" : "Save form"}</button></div>
      {msg && <p className="small" role="status">{msg}</p>}
    </section>
  );
}

export default function Manage() {
  const { pid } = useParams();
  const { program, error, reload } = useProgram(pid);
  if (error) return <><header className="ph"><h1>Manage</h1></header><p className="banner err" role="alert">{error}</p></>;
  if (!program) return <p className="muted">Loading...</p>;
  if (!canManage(program.my_role)) return <Navigate to={`/p/${program.id}`} replace />;
  return (
    <>
      <ProgramHeader program={program} page="Manage" intro="Invite people, set their roles, and decide what the status forms ask. The plan itself is edited on the Plan page (Edit plan)." />
      <Details program={program} onSaved={reload} />
      <People program={program} />
      <FormEditor program={program} form="daily" onSaved={reload} />
      <FormEditor program={program} form="day" onSaved={reload} />
    </>
  );
}
