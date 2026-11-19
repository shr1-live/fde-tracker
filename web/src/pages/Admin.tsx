import { FormEvent, useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useStore } from "../lib/store";
import { API_URL, ApiError } from "../lib/api";
import * as admin from "../lib/adminApi";
import { useMe } from "../lib/useRole";
import { Chip } from "../components/Chip";

type Req = { email: string; status: "pending" | "approved" | "rejected"; requested_at: string };
const msg = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong. Try again.");
const ROLE_NOTE = "Reviewers check proof and shared links, approve them and recommend items. The admin can do everything.";

/** People, roles and batches as the backend sees them. The backend enforces every rule; this is the admin's screen for it. */
function PeopleAndRoles() {
  const [people, setPeople] = useState<admin.Person[] | null>(null);
  const [batches, setBatches] = useState<admin.Batch[]>([]);
  const [err, setErr] = useState("");
  const [name, setName] = useState(""); const [start, setStart] = useState("");
  const load = useCallback(async () => {
    try { const [p, b] = await Promise.all([admin.people(), admin.batches().catch(() => [])]); setPeople(p); setBatches(b); setErr(""); }
    catch (e) { setErr(msg(e)); setPeople([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const run = async (f: () => Promise<unknown>) => { setErr(""); try { await f(); await load(); return true; } catch (e) { setErr(msg(e)); return false; } };

  async function addBatch(e: FormEvent) {
    e.preventDefault();
    if (await run(() => admin.createBatch(name, start))) { setName(""); setStart(""); }
  }

  return (
    <>
      <h2>People and roles</h2>
      <p className="muted small">{ROLE_NOTE} Approve people here so they can use the programme features (proof, feed, assistants).</p>
      {err && <p className="banner err" role="alert">{err}</p>}
      {people === null ? <p className="muted">Loading...</p> : (
        <div className="tablewrap" tabIndex={0} role="region" aria-label="People and roles">
          <table>
            <thead><tr><th scope="col">Person</th><th scope="col">Access</th><th scope="col">Role</th><th scope="col">Batch</th></tr></thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.display_name || p.email.split("@")[0]}</b><br /><small className="muted">{p.email}</small></td>
                  <td>
                    <Chip tone={p.access_status === "approved" ? "ok" : p.access_status === "pending" ? "warn" : "bad"}>{p.access_status}</Chip>{" "}
                    {p.role !== "admin" && (p.access_status === "approved"
                      ? <button type="button" className="copy" onClick={() => run(() => admin.setAccess(p.id, "rejected"))}>Revoke</button>
                      : <button type="button" className="copy" onClick={() => run(() => admin.setAccess(p.id, "approved"))}>Approve</button>)}
                  </td>
                  <td>
                    {p.role === "admin" ? <Chip tone="info">admin</Chip> : (
                      <><label className="sr" htmlFor={`role-${p.id}`}>Role for {p.email}</label>
                        <select id={`role-${p.id}`} value={p.role} onChange={(e) => run(() => admin.setRole(p.id, e.target.value as "member" | "reviewer"))}>
                          <option value="member">Learner</option><option value="reviewer">Reviewer</option>
                        </select></>
                    )}
                  </td>
                  <td>
                    <label className="sr" htmlFor={`batch-${p.id}`}>Batch for {p.email}</label>
                    <select id={`batch-${p.id}`} value={p.batch_id ?? ""} onChange={(e) => run(() => admin.setBatch(p.id, e.target.value || null))}>
                      <option value="">No batch</option>
                      {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Batches</h2>
      <p className="muted small">A batch is a group that starts the programme together. Its start date sets everyone's due dates: day 1 on the start date, then one day per working day.</p>
      {batches.length > 0 && (
        <ul className="stackcards tight">{batches.map((b) => <li key={b.id} className="card"><b>{b.name}</b> <span className="muted small">starts {new Date(b.starts_on + "T00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · {b.members ?? 0} people</span></li>)}</ul>
      )}
      <form className="card gap" onSubmit={addBatch}>
        <h3>New batch</h3>
        <label htmlFor="b-name">Name</label>
        <input id="b-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Batch 2" />
        <label htmlFor="b-start">Starts on</label>
        <input id="b-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        <div className="row"><button className="btn" disabled={name.trim().length < 2 || !start}>Create batch</button></div>
      </form>
    </>
  );
}

export default function Admin() {
  const { isAdmin } = useStore();
  const { me, ready } = useMe();
  const serverAdmin = me?.role === "admin";
  const [reqs, setReqs] = useState<Req[] | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    if (!supabase) return;
    const a = await supabase.from("access_requests").select("email,status,requested_at").order("requested_at", { ascending: false });
    if (a.error) setErr(a.error.message);
    setReqs((a.data as Req[]) ?? []);
  }, []);
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, load]);
  // Wait for the server's answer before deciding: redirecting while the role is still loading would send the admin away.
  if (!isAdmin && !serverAdmin) return ready ? <Navigate to="/" replace /> : <p className="muted">Loading...</p>;
  async function decide(email: string, status: "approved" | "rejected") {
    if (!supabase) return;
    const { error } = await supabase.from("access_requests").update({ status, decided_at: new Date().toISOString() }).eq("email", email);
    if (error) setErr(error.message); else void load();
  }
  const pend = (reqs ?? []).filter((r) => r.status === "pending");
  return (
    <>
      <header className="ph"><h1>Admin</h1><p className="muted">Only the admin sees this page: who can sign in, who reviews, and which batch each person is in.</p></header>
      {API_URL && serverAdmin ? <PeopleAndRoles /> : API_URL && <p className="banner" role="status">People and roles appear once the server confirms you are the admin. If this stays, sign out and in again.</p>}

      {supabase && isAdmin && (
        <>
          <h2>Sign-in requests <small>{pend.length}</small></h2>
          <p className="muted small">The first three people get in automatically; everyone after that waits here.</p>
          {err && <p className="banner err" role="alert">{err}</p>}
          {reqs === null ? <p className="muted">Loading</p> : pend.length === 0 ? <p className="muted">No one is waiting.</p> : (
            <ul className="reqs">{pend.map((r) => (
              <li key={r.email} className="card">
                <div><b>{r.email}</b><br /><small className="muted">asked {new Date(r.requested_at).toLocaleString()}</small></div>
                <div className="row"><button className="btn" onClick={() => decide(r.email, "approved")}>Approve</button><button className="btn ghost" onClick={() => decide(r.email, "rejected")}>Reject</button></div>
              </li>))}</ul>
          )}
        </>
      )}
    </>
  );
}
