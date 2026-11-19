import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { API_URL, ApiError } from "../lib/api";
import * as api from "../lib/submissionsApi";
import { ProofList } from "./ProofList";
import { NOT_SUBMITTED, StatusTag } from "./StatusTag";
import { ASSESSMENT_AREAS, RATING_GUIDE } from "../data/weekExpect";
import { hintFor } from "../data/programme";

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "");

/** "Submit your proof" for one task: a note, links and files, then send it to the reviewers. */
export function SubmitPanel({ taskKey, exists, listLoaded }: { taskKey: string; exists?: boolean; listLoaded: boolean }) {
  const [sub, setSub] = useState<api.Submission | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [learned, setLearned] = useState("");
  const [rating, setRating] = useState<number | "">("");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [fileLabel, setFileLabel] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const apply = useCallback((s: api.Submission | null) => { setSub(s); setNote(s?.note ?? ""); setLearned(s?.learned ?? ""); setRating(s?.rating ?? ""); }, []);

  useEffect(() => {
    if (!API_URL) { setLoaded(true); return; }
    if (!listLoaded) return;            // wait for the page's one list request
    if (exists === false) { setLoaded(true); return; } // the list says nothing exists yet: the first save creates it. Unknown (undefined) means ask the server.
    let alive = true;
    api.get(taskKey)
      .then((s) => { if (alive) { apply(s); setSignedOut(false); } })
      .catch((e: ApiError) => { if (alive && e.status === 401) setSignedOut(true); else if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [taskKey, apply, exists, listLoaded]);

  /** Runs one change. Returns true when it worked, so a form is only cleared after success. */
  async function run(work: () => Promise<api.Submission>, done: string): Promise<boolean> {
    setBusy(true); setError(""); setMessage("");
    try { apply(await work()); setMessage(done); return true; }
    catch (e) { setError(e instanceof ApiError ? e.message : "Something went wrong. Try again."); return false; }
    finally { setBusy(false); }
  }

  if (!API_URL) return null;
  if (!loaded) return <p className="muted small">Loading your submission...</p>;
  if (signedOut) return <p className="muted small">Sign in with your office account to submit proof for this day.</p>;

  const editable = !sub || sub.editable;
  const latest = sub?.reviews[0];
  const hint = hintFor(taskKey);
  const dirty = note !== (sub?.note ?? "") || learned !== (sub?.learned ?? "") || rating !== (sub?.rating ?? "");
  // What is still missing before this can be sent to a reviewer
  const missing = [
    ...(!sub || sub.items.length === 0 ? ["add at least one link or file"] : []),
    ...(!sub?.learned?.trim() ? ["write what you learned"] : []),
    ...(sub?.rating == null ? ["rate yourself from 1 to 5"] : []),
    ...(dirty ? ["save your details"] : []),
  ];

  function onAddLink(e: FormEvent) {
    e.preventDefault();
    run(() => api.addLink(taskKey, label.trim(), url.trim()), "Link added.").then((ok) => { if (ok) { setLabel(""); setUrl(""); } });
  }

  function onAddFile(e: FormEvent) {
    e.preventDefault();
    const f = file.current?.files?.[0];
    if (!f) { setError("Choose a file first."); return; }
    if (f.size > api.MAX_FILE_BYTES) { setError("Files can be up to 2 MB."); return; }
    run(() => api.addFile(taskKey, f, fileLabel), "File added.").then((ok) => { if (ok) { setFileLabel(""); if (file.current) file.current.value = ""; } });
  }

  return (
    <div className="submitpanel" aria-label="Submit your proof">
      <h3>Submit your proof {sub ? <StatusTag status={sub.status} /> : NOT_SUBMITTED}</h3>

      {latest && (
        <div className={"callout " + (latest.decision === "approve" ? "ok" : "warn")} role="status">
          <b>{latest.decision === "approve" ? "Approved" : "Changes requested"}</b> by {latest.reviewer}, {when(latest.created_at)}
          {latest.comment && <p>{latest.comment}</p>}
        </div>
      )}
      {sub?.status === "submitted" && (
        <div className="row">
          <p className="muted">Sent on {when(sub.submitted_at)}. A reviewer will look at it; it is locked while it waits.</p>
          <button type="button" className="copy" disabled={busy} onClick={() => run(() => api.withdraw(taskKey), "Withdrawn. You can edit it and submit again.")}>Withdraw to edit</button>
        </div>
      )}
      {sub?.status === "approved" && <p className="muted">This task is approved. Nothing more to do.</p>}

      {editable && (
        <ol className="plain small howto">
          <li>Add proof: a link (for example your repository) or a file (a screenshot, a report).</li>
          <li>Write what you learned and rate yourself 1 to 5, then press Save details.</li>
          <li>Press Submit for review. A reviewer checks it and approves it or sends it back with a comment.</li>
        </ol>
      )}

      <ProofList items={sub?.items ?? []} onRemove={editable ? (id) => run(() => api.removeItem(taskKey, id), "Removed.") : undefined} busy={busy} />

      {editable && (
        <>
          <label htmlFor={`note-${taskKey}`}>What you did (optional)</label>
          <textarea id={`note-${taskKey}`} rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
          <label htmlFor={`learned-${taskKey}`}>What you learned (needed)</label>
          <textarea id={`learned-${taskKey}`} rows={3} maxLength={2000} value={learned} onChange={(e) => setLearned(e.target.value)} placeholder={hint} />
          <label htmlFor={`rate-${taskKey}`}>Rate yourself (needed)</label>
          <select id={`rate-${taskKey}`} value={rating} onChange={(e) => setRating(e.target.value === "" ? "" : Number(e.target.value))}>
            <option value="">Choose 1 to 5</option>
            {RATING_GUIDE.map(([n, t]) => <option key={n} value={n}>{n}: {t}</option>)}
          </select>
          <details className="mini"><summary>How to rate (the readiness guide)</summary>
            <p className="small">Rate the day against these five areas. Evidence can be in any stack: a demo, code or a PR, a diagram, an API contract, a test or evaluation report, deployment notes or a walkthrough.</p>
            <dl className="kv small">{ASSESSMENT_AREAS.map(([a, q]) => <div key={a}><dt>{a}</dt><dd>{q}</dd></div>)}</dl>
            <ol className="plain small">{RATING_GUIDE.map(([n, t]) => <li key={n}><b>{n}</b>: {t}</li>)}</ol>
          </details>
          <div className="row"><button type="button" className="copy" disabled={busy || !dirty} onClick={() => run(() => api.saveDetails(taskKey, { note, learned, rating: rating === "" ? null : rating }), "Details saved.")}>Save details</button></div>

          <details className="addproof" open={!sub || sub.items.length === 0}>
            <summary>Add a link or a file</summary>
          <form className="proofform" onSubmit={onAddLink}>
            <fieldset><legend>Add a link (for example your repository or a demo)</legend>
              <label htmlFor={`ll-${taskKey}`}>Name</label>
              <input id={`ll-${taskKey}`} required maxLength={120} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Repository" />
              <label htmlFor={`lu-${taskKey}`}>Address (https)</label>
              <input id={`lu-${taskKey}`} required type="url" maxLength={500} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/you/project" />
              <div className="row"><button className="copy" disabled={busy || !label.trim() || !url.trim()}>Add link</button></div>
            </fieldset>
          </form>

          <form className="proofform" onSubmit={onAddFile}>
            <fieldset><legend>Add a file (png, jpg, gif, webp, pdf, text, zip; up to 2 MB)</legend>
              <label htmlFor={`fl-${taskKey}`}>Name (optional)</label>
              <input id={`fl-${taskKey}`} maxLength={120} value={fileLabel} onChange={(e) => setFileLabel(e.target.value)} placeholder="Screenshot of the results" />
              <label htmlFor={`ff-${taskKey}`}>File</label>
              <input id={`ff-${taskKey}`} ref={file} type="file" accept={api.ACCEPT} />
              <div className="row"><button className="copy" disabled={busy}>Add file</button></div>
            </fieldset>
          </form>

          </details>

          <div className="row">
            <button type="button" className="btn" disabled={busy || missing.length > 0} onClick={() => run(() => api.submit(taskKey), "Submitted for review.")}>
              {sub?.status === "changes_requested" ? "Submit again for review" : "Submit for review"}
            </button>
            {missing.length > 0 && <span className="muted small"> To submit: {missing.join(", ")}.</span>}
          </div>
        </>
      )}
      <p className="small" role="status" aria-live="polite">{message}</p>
      {error && <p className="err small" role="alert">{error}</p>}
    </div>
  );
}
