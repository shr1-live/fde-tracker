import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useParams } from "react-router-dom";
import { errText, useProgram } from "../lib/useProgram";
import { refreshMe, useMe } from "../lib/useRole";
import { canManage, programs, type Field, type FieldType, type FormKind, type Invite, type Member, type Program } from "../lib/v3";
import { useUnsaved } from "../lib/unsaved";
import { ProgramHeader } from "../components/ProgramHeader";
import { Chip } from "../components/Chip";
import { Icon } from "../components/Icon";
import { Avatar } from "../components/Avatar";
import { ErrorState, PageSkeleton, TableSkeleton } from "../components/States";
import { useConfirm } from "../components/Confirm";
import { useToast } from "../components/Toast";

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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const toast = useToast();
  const dirty = name !== program.name || description !== (program.description ?? "") || startsOn !== (program.starts_on ?? "");
  useUnsaved("manage-details", dirty);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) { setErr("Give the program a name (at least 2 characters)."); return; }
    setBusy(true); setErr("");
    try { await programs.update(program.id, { name: name.trim(), description: description.trim() || null, starts_on: startsOn || null }); toast.success("Program details saved."); onSaved(); refreshMe(); }
    catch (e2) { toast.error(errText(e2)); } finally { setBusy(false); }
  };
  return (
    <form className="card" onSubmit={save} aria-labelledby="m-details">
      <div className="card-head"><div><h2 id="m-details" className="card-title">Program details</h2><p className="meta">The name and start date everyone sees.</p></div></div>
      <div className="grid-2">
        <div className="field"><label htmlFor="m-name">Name</label><input id="m-name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label htmlFor="m-start">Start date <span className="hint">Day 1; reports count working days from here</span></label><input id="m-start" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} /></div>
      </div>
      <div className="field"><label htmlFor="m-desc">Description</label><textarea id="m-desc" rows={2} maxLength={600} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      {err && <p className="field-error" role="alert">{err}</p>}
      <div className="card-foot">{dirty && <span className="meta unsaved"><span className="dot" aria-hidden="true" />Unsaved changes</span>}<button className="btn" disabled={busy}>{busy ? "Saving" : "Save details"}</button></div>
    </form>
  );
}

function People({ program }: { program: Program }) {
  const { me } = useMe();
  const [data, setData] = useState<{ members: Member[]; invites: Invite[] } | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Member["role"]>("member");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();
  const load = () => programs.members(program.id).then((d) => { setData(d); setLoadErr(""); }).catch((e) => setLoadErr(errText(e)));
  useEffect(() => { void load(); }, [program.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const invite = async (e: FormEvent) => {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setErr("Enter a valid email address."); document.getElementById("i-email")?.focus(); return; }
    setBusy(true); setErr("");
    try {
      const r = await programs.invite(program.id, em, role);
      toast.success(r.status === "added" ? `${em} already had an account and is now in this program.` : `Invite saved. Send ${em} the site link; they get in when they sign in with this email.`);
      setEmail(""); await load(); document.getElementById("i-email")?.focus();
    } catch (e2) { setErr(errText(e2)); } finally { setBusy(false); }
  };
  const act = async (f: () => Promise<unknown>, ok: string) => { try { await f(); toast.success(ok); await load(); refreshMe(); } catch (e) { toast.error(errText(e)); } };
  const roleName = (r: Member["role"]) => (r === "coordinator" ? "Coordinator" : "Member");
  return (
    <section className="card" aria-labelledby="m-people">
      <div className="card-head"><div><h2 id="m-people" className="card-title">People</h2>
        <p className="meta">Only invited people can sign in. A coordinator has full access to this program (plan, forms, people, everyone's status); a member fills in their own status.</p></div></div>
      <form className="invite" onSubmit={invite} aria-label="Invite someone" noValidate>
        <div className="field grow"><label htmlFor="i-email">Email</label><input id="i-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" aria-invalid={!!err || undefined} aria-describedby={err ? "i-err" : undefined} /></div>
        <div className="field"><label htmlFor="i-role">Role</label><div className="select-wrap"><select id="i-role" value={role} onChange={(e) => setRole(e.target.value as Member["role"])}><option value="member">Member</option><option value="coordinator">Coordinator</option></select></div></div>
        <button className="btn" disabled={busy}><Icon name="plus" size={16} />{busy ? "Inviting" : "Invite"}</button>
      </form>
      {err && <p id="i-err" className="field-error" role="alert">{err}</p>}
      {loadErr ? <ErrorState title="Could not load people" message={loadErr} onRetry={() => void load()} /> : !data ? <TableSkeleton rows={3} cols={4} /> : (
        <>
          <ul className="member-list" aria-label="Members of this program">{data.members.map((m) => {
            const self = m.user_id === me?.id;
            return (
              <li key={m.user_id}>
                <Avatar name={m.name} />
                <div className="member-text"><span className="member-name">{m.name}{self && <span className="meta"> (you)</span>}</span><span className="meta break">{m.email}</span></div>
                <div className="member-actions">
                  {self ? <Chip tone="info">{roleName(m.role)}</Chip> : (
                    <div className="select-wrap sm">
                      <select aria-label={`Role of ${m.name}`} value={m.role} onChange={(e) => { const r = e.target.value as Member["role"]; void act(() => programs.setRole(program.id, m.user_id, r), `${m.name} is now a ${r}.`); }}>
                        <option value="member">Member</option><option value="coordinator">Coordinator</option>
                      </select>
                    </div>)}
                  {!self && <button type="button" className="btn ghost sm danger-text" onClick={async () => {
                    if (await confirm({ title: `Remove ${m.name}?`, body: `${m.name} loses access to ${program.name}. Their status entries are kept.`, confirm: "Remove", danger: true })) void act(() => programs.removeMember(program.id, m.user_id), `${m.name} was removed.`);
                  }}>Remove<span className="sr"> {m.name}</span></button>}
                </div>
              </li>
            );
          })}</ul>
          {data.invites.length > 0 && (
            <div className="invites">
              <h3 className="subhead">Invited, not signed in yet</h3>
              <ul className="list">{data.invites.map((i) => (
                <li key={i.id}>
                  <span className="invite-icon" aria-hidden="true"><Icon name="inbox" size={14} /></span>
                  <span className="grow break">{i.email}</span>
                  <Chip>{roleName(i.role)}</Chip>
                  <button type="button" className="btn ghost sm" onClick={() => void act(() => programs.cancelInvite(program.id, i.id), "Invite cancelled.")}>Cancel invite<span className="sr"> for {i.email}</span></button>
                </li>
              ))}</ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function FormEditor({ program, form, onSaved }: { program: Program; form: FormKind; onSaved: () => void }) {
  const [fields, setFields] = useState<Field[]>(program.forms[form]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  useEffect(() => setFields(program.forms[form]), [program, form]);
  const dirty = JSON.stringify(fields) !== JSON.stringify(program.forms[form]);
  useUnsaved(`form-${form}`, dirty);
  const set = (i: number, patch: Partial<Field>) => setFields((f) => f.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: -1 | 1) => setFields((f) => { const n = [...f]; [n[i], n[i + d]] = [n[i + d]!, n[i]!]; return n; });
  const add = () => {
    const key = keyFrom("New field", new Set(fields.map((x) => x.key)));
    setFields((f) => [...f, { key, label: "New field", description: "", type: "text", required: false }]);
    setTimeout(() => (document.getElementById(`f-${form}-${key}-l`) as HTMLInputElement | null)?.select(), 0);
  };
  const save = async () => {
    if (fields.some((f) => !f.label.trim())) { setErr("Every field needs a name."); return; }
    setBusy(true); setErr("");
    try { await programs.saveForm(program.id, form, fields.map((f) => ({ ...f, label: f.label.trim(), description: f.description?.trim() || null }))); toast.success("Form saved. Everyone sees the new fields now."); onSaved(); }
    catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };
  const title = form === "daily" ? "Daily status form" : "Program status form (per day)";
  const pid = `f-${form}`;
  return (
    <section className="card" aria-labelledby={pid}>
      <div className="card-head"><div><h2 id={pid} className="card-title">{title}</h2>
        <p className="meta">{form === "daily" ? "What everyone fills in at the end of each working day." : "What everyone fills in for each day of the plan."} The description shows when people press (i) next to the field. Removing a field hides it; answers already given are kept.</p></div></div>
      <ol className="fedit">
        {fields.map((f, i) => (
          <li key={f.key} className="fitem">
            <span className="fitem-num" aria-hidden="true">{i + 1}</span>
            <div className="grow">
              <div className="grid-2">
                <div className="field"><label htmlFor={`${pid}-${f.key}-l`}>Field name</label><input id={`${pid}-${f.key}-l`} maxLength={80} value={f.label} onChange={(e) => set(i, { label: e.target.value })} /></div>
                <div className="field"><label htmlFor={`${pid}-${f.key}-t`}>Type</label><div className="select-wrap"><select id={`${pid}-${f.key}-t`} value={f.type} onChange={(e) => set(i, { type: e.target.value as FieldType })}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div></div>
              </div>
              <div className="field"><label htmlFor={`${pid}-${f.key}-d`}>Description <span className="hint">shown on the (i) button</span></label>
                <textarea id={`${pid}-${f.key}-d`} rows={2} maxLength={400} value={f.description ?? ""} onChange={(e) => set(i, { description: e.target.value })} /></div>
              <div className="fitem-foot">
                <label className="check"><input type="checkbox" checked={f.required} onChange={(e) => set(i, { required: e.target.checked })} />Required</label>
                <span className="grow" />
                <button type="button" className="iconbtn flip" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${f.label} up`} title="Move up"><Icon name="down" size={16} /></button>
                <button type="button" className="iconbtn" disabled={i === fields.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${f.label} down`} title="Move down"><Icon name="down" size={16} /></button>
                <button type="button" className="btn ghost sm danger-text" disabled={fields.length === 1} onClick={() => setFields((x) => x.filter((_, j) => j !== i))}><Icon name="trash" size={14} />Remove<span className="sr"> {f.label}</span></button>
              </div>
            </div>
          </li>
        ))}
      </ol>
      {err && <p className="field-error" role="alert">{err}</p>}
      <div className="card-foot">
        <button type="button" className="btn secondary" onClick={add} disabled={fields.length >= 20}><Icon name="plus" size={16} />Add a field</button>
        <span className="grow" />
        {dirty && <span className="meta unsaved"><span className="dot" aria-hidden="true" />Unsaved changes</span>}
        <button type="button" className="btn" onClick={save} disabled={busy}>{busy ? "Saving" : "Save form"}</button>
      </div>
    </section>
  );
}

export default function Manage() {
  const { pid } = useParams();
  const { program, error, reload } = useProgram(pid);
  if (error) return <div className="content"><ErrorState title="Could not open this program" message={error} onRetry={reload} /></div>;
  if (!program) return <div className="content"><PageSkeleton /></div>;
  if (!canManage(program.my_role)) return <Navigate to={`/p/${program.id}`} replace />;
  return (
    <div className="content">
      <ProgramHeader program={program} page="Manage" intro="Invite people, set their roles, and decide what the status forms ask. The plan itself is edited on the Plan page (Edit plan)." />
      <div className="stack-lg">
        <Details program={program} onSaved={reload} />
        <People program={program} />
        <FormEditor program={program} form="daily" onSaved={reload} />
        <FormEditor program={program} form="day" onSaved={reload} />
      </div>
    </div>
  );
}
