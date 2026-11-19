import { FormEvent, useCallback, useEffect, useState } from "react";
import { API_URL, ApiError } from "../lib/api";
import * as api from "../lib/tasksApi";
import { GeminiKeyPanel } from "../components/GeminiKeyPanel";

const OUTCOME: Record<string, { label: string; cls: string }> = {
  ok: { label: "Done", cls: "st-approved" },
  confirmed: { label: "Done (you confirmed)", cls: "st-approved" },
  needs_confirmation: { label: "Waiting for your yes", cls: "st-pending" },
  invalid: { label: "Refused: bad input", cls: "st-rejected" },
  denied: { label: "Not allowed", cls: "st-rejected" },
  failed: { label: "Failed, nothing changed", cls: "st-rejected" },
  cancelled: { label: "Cancelled", cls: "st-draft" },
  expired: { label: "Expired", cls: "st-draft" },
};
const EXAMPLES = ["Add a task: review PR 42, due next Friday, high priority", "Show my open tasks", "Mark the PR review as done", "Delete the PR review task"];

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "medium" });

function Outcome({ outcome }: { outcome: string }) {
  const o = OUTCOME[outcome] ?? { label: outcome, cls: "st-draft" };
  return <span className={"tag " + o.cls}>{o.label}</span>;
}

/** Day 3: talk to a task assistant. The model only asks; our server checks, confirms anything destructive, runs it and logs it. */
export default function TaskAssistant() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [signedOut, setSignedOut] = useState(false);
  const [result, setResult] = useState<api.Reply | null>(null);
  const [list, setList] = useState<api.Task[]>([]);
  const [calls, setCalls] = useState<api.ToolCall[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [t, l] = await Promise.all([api.tasks(), api.log()]);
      setList(t); setCalls(l); setSignedOut(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setSignedOut(true);
      else setError(e instanceof ApiError ? e.message : "Could not reach the server. Check your connection and try again.");
    }
  }, []);
  useEffect(() => { if (API_URL) refresh(); }, [refresh]);

  /** Returns true when the request worked, so the caller can keep what the person typed if it did not. */
  async function run(work: () => Promise<api.Reply>, dropPendingOnError = false): Promise<boolean> {
    setBusy(true); setError("");
    try { setResult(await work()); await refresh(); return true; }
    catch (e) {
      if (e instanceof ApiError && e.status === 401) setSignedOut(true);
      else setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
      // A confirmation that expired or was already decided cannot be retried: take the card away instead of leaving dead buttons.
      if (dropPendingOnError) setResult((r) => (r ? { ...r, pending: null } : r));
      return false;
    }
    finally { setBusy(false); }
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    if (await run(() => api.send(text.trim()))) setText("");
  }

  if (!API_URL) return <><header className="ph"><h1>Task assistant</h1></header><div className="card"><p className="muted">The backend is not connected for this site.</p></div></>;
  if (signedOut) return <><header className="ph"><h1>Task assistant</h1></header><div className="card" role="status"><p>Sign in with your office account to use the task assistant.</p></div></>;

  return (
    <>
      <header className="ph"><h1>Task assistant</h1>
        <p className="muted">Tell it what to do in plain words. It can create, list, update and delete your tasks, but it only <i>asks</i>: our server checks every request, only touches your own tasks, asks you before deleting, and writes everything to the log below.</p></header>

      <GeminiKeyPanel />
      {error && <p className="banner err" role="alert">{error}</p>}

      <div className="dash">
        <section>
          <form className="card" onSubmit={onSend}>
            <label htmlFor="msg">What should I do?</label>
            <textarea id="msg" rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder="For example: add a task to call the supplier tomorrow, high priority" />
            <div className="row">{EXAMPLES.map((x) => <button key={x} type="button" className="copy" style={{ flex: "0 1 auto", whiteSpace: "normal", textAlign: "left" }} onClick={() => setText(x)}>{x}</button>)}</div>
            <div className="row"><button className="btn" disabled={busy || !text.trim()}>{busy ? "Working..." : "Send"}</button></div>
          </form>

          {result && (
            <div className="card" role="status" aria-live="polite">
              <h3>Assistant</h3>
              <p className="wrap">{result.reply}</p>
              {result.actions.length > 0 && (
                <>
                  <b className="small">What was done</b>
                  <ul className="proofs">{result.actions.map((a, i) => <li key={i} className="proof"><div className="proofbody"><b>{a.tool}</b><span className="muted small">{a.summary}</span></div><Outcome outcome={a.outcome} /></li>)}</ul>
                </>
              )}
              {result.pending && (
                <div className="callout warn">
                  <b>Please confirm:</b> {result.pending.summary}. Nothing has been deleted yet. This question expires at {when(result.pending.expires_at)}.
                  <div className="row">
                    <button type="button" className="btn" disabled={busy} onClick={() => run(() => api.confirm(result.pending!.id, true), true)}>Yes, do it</button>
                    <button type="button" className="copy" disabled={busy} onClick={() => run(() => api.confirm(result.pending!.id, false), true)}>No, cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <aside>
          <div className="card">
            <h3>Your tasks</h3>
            {list.length === 0 ? <p className="muted small">No tasks yet.</p> : (
              <ul className="proofs">
                {list.map((t) => (
                  <li key={t.id} className="proof">
                    <div className="proofbody"><b>{t.title}</b><span className="muted small">{t.due_date ? `Due ${t.due_date}` : "No due date"} · {t.priority} priority</span></div>
                    <span className={"tag " + (t.status === "done" ? "st-approved" : "st-pending")}>{t.status === "done" ? "Done" : "Open"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <h2>Execution log</h2>
      <p className="muted small">Every tool call, including the ones that were refused. Newest first.</p>
      <div className="tablewrap" tabIndex={0} role="region" aria-label="Execution log, scrolls sideways on small screens">
        <table>
          <thead><tr><th>When</th><th>Tool</th><th>Result</th><th>Detail</th><th>Speed</th></tr></thead>
          <tbody>
            {calls.length === 0 && <tr><td colSpan={5} className="muted">Nothing yet.</td></tr>}
            {calls.map((c, i) => (
              <tr key={i}><td>{when(c.created_at)}</td><td>{c.tool}</td><td><Outcome outcome={c.outcome} /></td><td>{c.detail}</td><td>{c.latency_ms === null ? "" : `${c.latency_ms} ms`}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
