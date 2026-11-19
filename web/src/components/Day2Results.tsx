// Day 2: every stored prompt version on the same candidates, run twice. Reads src/data/runs/day2-*.json (written by the Evals tool).
type Row = { Model: string; Version: string; Repeat: number; Batch?: number; Clarifies?: boolean; HasReasoning?: boolean; Candidate: string; Parsed: boolean; Present: boolean; Grounded: boolean; FitOk: boolean; NoForbidden: boolean; IncompleteOk: boolean; Fit: string; Skills: string[] };

const isRows = (v: unknown): v is Row[] =>
  Array.isArray(v) && v.length > 0 && v.every((r) => !!r && typeof r === "object" && typeof (r as Row).Version === "string" && typeof (r as Row).Candidate === "string" && typeof (r as Row).Parsed === "boolean");

const RUNS = Object.entries(import.meta.glob("../data/runs/day2-*.json", { eager: true, import: "default" }) as Record<string, unknown>)
  .filter(([, rows]) => isRows(rows))
  .map(([path, rows]) => ({ id: path.split("/").pop()!.replace(".json", ""), rows: rows as Row[] }))
  .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

function summarise(rows: Row[], model: string, version: string) {
  const mine = rows.filter((r) => r.Model === model && r.Version === version);
  // One call covers a batch of candidates, so a call is a (repeat, batch) pair.
  const callKey = (r: Row) => `${r.Repeat}-${r.Batch ?? 0}`;
  const calls = new Set(mine.map(callKey)).size;
  const callsOk = new Set(mine.filter((r) => r.Parsed).map(callKey)).size;
  const people = [...new Set(mine.map((r) => r.Candidate))];
  const runs = new Set(mine.map((r) => r.Repeat)).size;
  // Repeatable: the same rating and the same claimed skills in every run.
  const consistent = people.filter((p) => {
    const ok = mine.filter((r) => r.Candidate === p && r.Parsed);
    return ok.length === runs && new Set(ok.map((r) => r.Fit + "|" + [...r.Skills].sort().join(","))).size === 1;
  }).length;
  const n = mine.length;
  const thin = mine.filter((r) => r.Parsed && r.Fit === "insufficient_information");
  const asked = thin.filter((r) => r.Clarifies).length;
  const reasoned = mine.filter((r) => r.HasReasoning).length;
  const c = (f: (r: Row) => boolean) => mine.filter(f).length;
  const overall = c((r) => r.Present) + c((r) => r.Grounded) + c((r) => r.FitOk) + c((r) => r.NoForbidden) + c((r) => r.IncompleteOk && r.Parsed);
  return { version, asked, thin: thin.length, reasoned, calls, callsOk, n, people: people.length, consistent, grounded: c((r) => r.Grounded), fit: c((r) => r.FitOk), clean: c((r) => r.NoForbidden), missing: c((r) => r.IncompleteOk && r.Parsed), overall, max: n * 5 };
}

const pct = (a: number, b: number) => (b === 0 ? "-" : `${Math.round((100 * a) / b)}%`);

export function Day2Results() {
  if (RUNS.length === 0) return null;
  // Several results files can each cover some versions (the first four, then the newer three): for each model and version the latest file wins.
  const latest = new Map<string, Row[]>();
  for (const r of RUNS) for (const key of new Set(r.rows.map((x) => `${x.Model}|${x.Version}`))) latest.set(key, r.rows.filter((x) => `${x.Model}|${x.Version}` === key));
  const run = { rows: [...latest.values()].flat() };
  const models = [...new Set(run.rows.map((r) => r.Model))];
  const versions = [...new Set(run.rows.map((r) => r.Version))].sort();
  const candidates = new Set(run.rows.map((r) => r.Candidate)).size;
  return (
    <>
      <h2>Day 2: prompt versions compared</h2>
      <p className="muted">Every prompt version got the same job description and the same {candidates} candidates (strong, partial and weak matches, a near-empty profile, and a profile with an instruction aimed at the model), sent in small batches. Each version ran twice to see whether results stay the same.</p>
      {models.map((m) => {
        const stats = versions.map((v) => summarise(run.rows, m, v));
        const best = [...stats].sort((a, b) => b.overall - a.overall || b.consistent - a.consistent)[0];
        return (
          <section key={m} className="card" aria-labelledby={`d2-${m}`}>
            <h3 id={`d2-${m}`}>Model: {m}</h3>
            <div className="tablewrap" tabIndex={0} role="region" aria-label={`Prompt version results for ${m}, scrolls sideways on small screens`}>
              <table>
                <thead><tr><th>Version</th><th>Usable calls (batches)</th><th>Grounded</th><th>Fit sensible</th><th>No invented skills</th><th>Missing info shown</th><th>Repeatable</th><th>Overall</th><th>Asks a question when it cannot judge</th><th>Gives reasoning</th></tr></thead>
                <tbody>{stats.map((s) => (
                  <tr key={s.version}><td>{s.version}</td><td>{s.callsOk}/{s.calls}</td><td>{s.grounded}/{s.n}</td><td>{s.fit}/{s.n}</td><td>{s.clean}/{s.n}</td><td>{s.missing}/{s.n}</td><td>{s.consistent}/{s.people}</td><td>{pct(s.overall, s.max)}</td><td>{s.asked}/{s.thin}</td><td>{s.reasoned}/{s.n}</td></tr>
                ))}</tbody>
              </table>
            </div>
            <p><b>Best for {m}: {best.version}</b> ({pct(best.overall, best.max)} of checks passed, {best.consistent} of {best.people} candidates repeatable). Versions are ranked by checks passed; repeatability breaks ties.</p>
          </section>
        );
      })}
      <p className="muted small">Version 1 is the plain baseline, version 2 adds structure and constraints, version 3 adds explicit rules and one worked example, version 4 states the data-versus-instructions rule up front, version 5 asks the model to reason from the evidence before it rates and to suggest questions for thin profiles, version 6 adds three worked examples (few-shot), and version 7 is a two-step chain: step 1 pulls out quoted facts, step 2 rates from those facts only. Scores come from simple rules, so they show a trend, not a guarantee, and small local models vary between runs.</p>
    </>
  );
}
