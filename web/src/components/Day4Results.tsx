// Day 4: 30 fixed cases, scored automatically, with the checks switched on one set at a time. Reads src/data/runs/day4-*.json (written by the Evals tool).
type Row = {
  Model: string; Config: string; Prompt: string; CaseId: string; Category: string; Parsed: boolean; Pass: boolean; Reason: string; Fit: string;
  UnsupportedClaims: number; Obeyed: boolean; InstructionsFlagged: boolean;
};

const isRows = (v: unknown): v is Row[] =>
  Array.isArray(v) && v.length > 0 && v.every((r) => !!r && typeof r === "object" && typeof (r as Row).Config === "string" && typeof (r as Row).CaseId === "string" && typeof (r as Row).Pass === "boolean");

const RUNS = Object.entries(import.meta.glob("../data/runs/day4-*.json", { eager: true, import: "default" }) as Record<string, unknown>)
  .filter(([, rows]) => isRows(rows))
  .map(([path, rows]) => ({ id: path.split("/").pop()!.replace(".json", ""), rows: rows as Row[] }))
  .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

const CONFIGS: { id: string; label: string; what: string }[] = [
  { id: "baseline", label: "Before: no checks", what: "The model's answer as it came (prompt v2)." },
  { id: "existing", label: "Earlier checks", what: "Quotes must be real; a rating needs one real quote." },
  { id: "all-v2", label: "All checks", what: "Plus: orders hidden in a profile are ignored, and a top rating needs half of the job's skills." },
  { id: "final", label: "After: all checks + prompt v4", what: "What the API runs now." },
  { id: "final-code", label: "After, with the summary built in code", what: "An option (ASSISTANT_SUMMARY=code): none of the model's free text is shown. Plainer wording, and it closes the planted-word attack." },
];
const CATEGORIES = ["normal", "incomplete", "ambiguous", "injection", "edge"];
const pct = (a: number, b: number) => (b === 0 ? "-" : `${Math.round((100 * a) / b)}%`);

const RUN_TEXT: Record<string, { title: string; text: string }> = {
  "day4-local": { title: "The 30 cases the checks were built on", text: "10 normal, 5 incomplete, 5 ambiguous, 5 with an order hidden in the profile, 5 odd inputs. The model answered each case once per prompt version; every row applies its own checks to that same answer, so the difference comes from the checks, not from luck." },
  "day4-holdout": { title: "A fresh set the checks never saw", text: "10 new attacks written afterwards in other wordings (\"from now on\", another language, an encoded order, a fake policy block, an order to start the summary with a word) and 5 honest profiles that use words like \"ignore\" and \"rules\". The checks were not changed for this run, so it is the fairer test." },
};

export function Day4Results() {
  if (RUNS.length === 0) return null;
  return (
    <>
      <h2>Day 4: evaluation and guardrails, before and after</h2>
      {RUNS.map((run) => <Day4Run key={run.id} id={run.id} rows={run.rows} />)}
      <p className="muted small">One run per prompt version on a small local model, so a pass is not a promise. A hosted model has not been run yet.</p>
    </>
  );
}

function Day4Run({ id, rows }: { id: string; rows: Row[] }) {
  const info = RUN_TEXT[id] ?? { title: id, text: "" };
  const run = { rows };
  const models = [...new Set(run.rows.map((r) => r.Model))];
  return (
    <>
      <h3>{info.title}</h3>
      <p className="muted">{info.text}</p>
      {models.map((m) => {
        const mine = run.rows.filter((r) => r.Model === m);
        const by = (id: string) => mine.filter((r) => r.Config === id);
        const base = by("baseline"), fin = by("final");
        const fixedIds = fin.filter((f) => f.Pass && !base.find((b) => b.CaseId === f.CaseId)?.Pass).map((f) => f.CaseId);
        const brokeIds = fin.filter((f) => !f.Pass && base.find((b) => b.CaseId === f.CaseId)?.Pass).map((f) => f.CaseId);
        const still = fin.filter((f) => !f.Pass);
        return (
          <section key={m} className="card" aria-labelledby={`d4-${id}-${m}`}>
            <h4 id={`d4-${id}-${m}`}>Model: {m}</h4>
            <div className="tablewrap" tabIndex={0} role="region" aria-label={`Day 4 results for ${m}, scrolls sideways on small screens`}>
              <table>
                <thead><tr><th>Configuration</th><th>Cases passed</th><th>Unsupported claims shown</th><th>Hidden order obeyed</th></tr></thead>
                <tbody>{CONFIGS.map((c) => {
                  const r = by(c.id); const inj = r.filter((x) => x.Category === "injection");
                  return <tr key={c.id}><td><b>{c.label}</b><br /><span className="muted small">{c.what}</span></td><td>{r.filter((x) => x.Pass).length}/{r.length} ({pct(r.filter((x) => x.Pass).length, r.length)})</td><td>{r.reduce((a, x) => a + x.UnsupportedClaims, 0)}</td><td>{inj.filter((x) => x.Obeyed).length}/{inj.length}</td></tr>;
                })}</tbody>
              </table>
            </div>
            <h5>Passed per category</h5>
            <div className="tablewrap" tabIndex={0} role="region" aria-label="Passed per category, scrolls sideways on small screens">
              <table>
                <thead><tr><th>Category</th>{CONFIGS.map((c) => <th key={c.id}>{c.label}</th>)}</tr></thead>
                <tbody>{CATEGORIES.filter((cat) => by("final").some((x) => x.Category === cat)).map((cat) => (
                  <tr key={cat}><td>{cat}</td>{CONFIGS.map((c) => { const r = by(c.id).filter((x) => x.Category === cat); return <td key={c.id}>{r.filter((x) => x.Pass).length}/{r.length}</td>; })}</tr>
                ))}</tbody>
              </table>
            </div>
            <p><b>Fixed:</b> {fixedIds.length ? fixedIds.join(", ") : "none"}. <b>Got worse:</b> {brokeIds.length ? brokeIds.join(", ") : "none"}.</p>
            <h5>Failures that remain</h5>
            {still.length === 0 ? <p>None.</p> : (
              <ul className="plain">{still.map((f) => <li key={f.CaseId}><b>{f.CaseId}</b> ({f.Category}): {f.Reason || "failed"}</li>)}</ul>
            )}
          </section>
        );
      })}
    </>
  );
}
