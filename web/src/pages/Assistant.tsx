import { FormEvent, useEffect, useState } from "react";
import { API_URL, ApiError, Analysis, Candidate, Usage, analyze, getUsage } from "../lib/assistantApi";
import { GeminiKeyPanel } from "../components/GeminiKeyPanel";

const FIT_LABEL: Record<string, string> = { strong: "Strong fit", partial: "Partial fit", weak: "Weak fit", insufficient_information: "Not enough information" };
const MAX_CANDIDATES = 5;
const blank = (): Candidate => ({ name: "", profile: "" });

// What each stored prompt version does, in a few words (v4 is the default; see the Week 1 report for the comparison).
const VERSION_NOTE: Record<string, string> = { v1: "plain", v2: "structured", v3: "one example", v4: "recommended", v5: "reasons first, asks questions", v6: "three examples", v7: "two steps" };

export default function Assistant() {
  const [job, setJob] = useState("");
  const [cands, setCands] = useState<Candidate[]>([blank()]);
  const [version, setVersion] = useState("v4");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [signedOut, setSignedOut] = useState(false);
  const [result, setResult] = useState<Analysis | null>(null);

  const refreshUsage = () => getUsage().then((u) => { setSignedOut(false); setUsage(u); }).catch((e: ApiError) => { if (e.status === 401) setSignedOut(true); else if (e.status !== 403) setError(e.message); });
  useEffect(() => { if (API_URL) refreshUsage(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  if (!API_URL) {
    return (
      <>
        <header className="ph"><h1>Recruitment assistant</h1></header>
        <div className="card"><p className="muted">The assistant is not connected yet. The backend address is not set for this site.</p></div>
      </>
    );
  }

  if (signedOut) {
    return (
      <>
        <header className="ph"><h1>Recruitment assistant</h1></header>
        <div className="card" role="status"><p>Sign in with your office account to use the assistant.</p><p className="muted small">If you are in guest or local mode, sign out and sign in with your office account: the assistant needs your account to enforce the daily limit.</p></div>
      </>
    );
  }

  const setC = (i: number, patch: Partial<Candidate>) => setCands((c) => c.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const ready = job.trim().length >= 20 && cands.every((c) => c.name.trim() && c.profile.trim().length >= 20) && !busy && usage?.configured !== false;

  async function run(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setResult(null);
    try { setResult(await analyze(job.trim(), cands.map((c) => ({ name: c.name.trim(), profile: c.profile.trim() })), version)); }
    catch (err) {
      if (err instanceof ApiError && err.status === 401) setSignedOut(true);
      else setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    }
    finally { setBusy(false); refreshUsage(); }
  }

  return (
    <>
      <header className="ph"><h1>Recruitment assistant</h1>
        <p className="muted">Paste a job description and up to {MAX_CANDIDATES} candidate profiles. The assistant lists matched skills with a quote from the profile, gaps, and what the profile does not say. Use made-up or anonymised profiles only.</p></header>
      <GeminiKeyPanel serverModel={usage && !usage.using_own_key ? usage.model : null} serverConfigured={usage ? usage.configured || !!usage.using_own_key : undefined} onChange={refreshUsage} />
      {usage && <p className="muted small">{usage.used_today} of {usage.daily_cap} analyses used in the last 24 hours{usage.model ? ` · model: ${usage.model}` : ""}{usage.using_own_key ? " · your own Gemini key" : ""}.</p>}
      {usage && !usage.configured && !usage.using_own_key && <p className="banner" role="status">No shared model is set up on the server. Paste your own Gemini key above to use the assistant.</p>}
      {error && <p className="banner err" role="alert">{error}</p>}
      <div className="dash">
        <section>
          <form className="card" onSubmit={run}>
            <label htmlFor="job">Job description</label>
            <textarea id="job" rows={6} maxLength={6000} value={job} onChange={(e) => setJob(e.target.value)} placeholder="Role, must-have skills, nice-to-haves" />
            {cands.map((c, i) => (
              <div key={i}>
                <h3>Candidate {i + 1}</h3>
                <label htmlFor={`n${i}`}>Name (made up is fine)</label>
                <input id={`n${i}`} maxLength={80} value={c.name} onChange={(e) => setC(i, { name: e.target.value })} />
                <label htmlFor={`p${i}`}>Profile</label>
                <textarea id={`p${i}`} rows={5} maxLength={4000} value={c.profile} onChange={(e) => setC(i, { profile: e.target.value })} />
                {cands.length > 1 && <button type="button" className="copy" onClick={() => setCands((x) => x.filter((_, j) => j !== i))}>Remove candidate {i + 1}</button>}
              </div>
            ))}
            <div className="row">
              {cands.length < MAX_CANDIDATES && <button type="button" className="copy" onClick={() => setCands((x) => [...x, blank()])}>Add another candidate</button>}
            </div>
            <label htmlFor="ver">Prompt version</label>
            <select id="ver" value={version} onChange={(e) => setVersion(e.target.value)}>
              {(usage?.prompt_versions ?? ["v1", "v2", "v3", "v4", "v5", "v6", "v7"]).map((v) => <option key={v} value={v}>{v}{VERSION_NOTE[v] ? ` (${VERSION_NOTE[v]})` : ""}</option>)}
            </select>
            <div className="row"><button className="btn" disabled={!ready}>{busy ? "Analysing..." : "Analyse"}</button></div>
          </form>
        </section>
        <aside>
          {busy && <div className="card" role="status"><p className="muted">Analysing. This can take up to half a minute.</p></div>}
          {result && (
            <>
              <div className="card">
                <h3>Run details</h3>
                <p className="muted small">Model {result.model} · prompt {result.prompt_version} · {result.latency_ms} ms · {result.input_tokens} tokens in, {result.output_tokens} out</p>
                {result.required_skills.length > 0 && <p className="small"><b>Skills found in the job text:</b> {result.required_skills.join(", ")}</p>}
                {result.warnings.map((w) => <p key={w} className="err small">{w}</p>)}
              </div>
              {result.candidates.map((c) => (
                <div key={c.id} className="card">
                  <h3>{c.name}: {FIT_LABEL[c.fit] ?? c.fit}</h3>
                  {c.summary && <p>{c.summary}</p>}
                  {c.reasoning && <p className="muted"><b className="small">Reasoning: </b>{c.reasoning}</p>}
                  {(c.clarifying_questions?.length ?? 0) > 0 && <><b className="small">Questions to ask this candidate</b><ul className="plain">{c.clarifying_questions!.map((q) => <li key={q}>{q}</li>)}</ul></>}
                  {c.matched_skills.length > 0 && <><b className="small">Matched skills, with the profile's own words</b>
                    <ul className="plain">{c.matched_skills.map((m) => <li key={m.skill}><b>{m.skill}</b>: “{m.evidence}”</li>)}</ul></>}
                  {c.gaps.length > 0 && <><b className="small">Gaps</b><ul className="plain">{c.gaps.map((g) => <li key={g}>{g}</li>)}</ul></>}
                  {c.not_stated.length > 0 && <><b className="small">Not stated in the profile</b><ul className="plain">{c.not_stated.map((g) => <li key={g}>{g}</li>)}</ul></>}
                  <p className="muted small">Plain keyword check (not the model): {c.check.score}% of the job's known skills found{c.check.missing.length ? `; missing: ${c.check.missing.join(", ")}` : ""}.</p>
                </div>
              ))}
            </>
          )}
        </aside>
      </div>
    </>
  );
}
