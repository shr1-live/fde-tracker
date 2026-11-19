// Practice lab result tables. The same tables draw a live run, a recorded local run and a saved or pinned run.
import type { Cell, Day1Result, Day2Result, Day3Result, LabResult } from "../lib/labApi";
import { DAY3_STEPS } from "../data/labSamples";
import { Kpi } from "./Kpi";
import { Chip } from "./Chip";

const secs = (ms: number) => (ms >= 10000 ? `${Math.round(ms / 1000)} s` : `${(ms / 1000).toFixed(1)} s`);
const short = (s: string, n = 90) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function Verdict({ cell }: { cell: Cell | null }) {
  if (!cell) return <span className="tag st-draft">Not run</span>;
  if (cell.error) return <span className="tag st-draft">Error</span>;
  return cell.passed ? <span className="tag st-approved">Pass</span> : <span className="tag st-rejected">Fail</span>;
}

export type ModelStats = { model: string; passed: number; n: number; errors: number; avgMs: number; tin: number; tout: number };

export function day1Stats(r: Day1Result): ModelStats[] {
  return r.models.map((model, i) => {
    const cells = r.rows.map((x) => x.cells[i]).filter((c): c is Cell => !!c);
    const ok = cells.filter((c) => !c.error);
    return {
      model, n: cells.length, passed: cells.filter((c) => c.passed && !c.error).length, errors: cells.length - ok.length,
      avgMs: ok.length ? Math.round(ok.reduce((a, c) => a + c.latency_ms, 0) / ok.length) : 0,
      tin: cells.reduce((a, c) => a + c.input_tokens, 0), tout: cells.reduce((a, c) => a + c.output_tokens, 0),
    };
  });
}

/** One plain sentence from the numbers: quality first (passes, then fewer errors), then speed. */
export function day1Verdict(stats: ModelStats[], names: string[]): string {
  if (stats.length < 2 || stats.some((s) => s.n === 0)) return "";
  const [a, b] = stats;
  const rate = (s: ModelStats) => s.passed / s.n;
  const tie = rate(a) === rate(b) && a.errors === b.errors;
  if (tie) {
    if (a.avgMs === b.avgMs) return `${names[0]} and ${names[1]} did equally well here: ${a.passed} of ${a.n} passed each, at the same average time.`;
    const [f, s, fn, sn] = a.avgMs < b.avgMs ? [a, b, names[0], names[1]] : [b, a, names[1], names[0]];
    return `Same quality (${a.passed} of ${a.n} passed each), so speed decides: ${fn} answered in ${secs(f.avgMs)} on average against ${secs(s.avgMs)} for ${sn}.`;
  }
  const aBetter = rate(a) !== rate(b) ? rate(a) > rate(b) : a.errors < b.errors;
  const [w, l, wn, ln] = aBetter ? [a, b, names[0], names[1]] : [b, a, names[1], names[0]];
  const speed = w.avgMs && l.avgMs ? (w.avgMs <= l.avgMs ? `, and it was also faster (${secs(w.avgMs)} against ${secs(l.avgMs)} on average)` : `, although it was slower (${secs(w.avgMs)} against ${secs(l.avgMs)} on average)`) : "";
  const errs = w.errors || l.errors ? ` Errors: ${w.errors} for ${wn}, ${l.errors} for ${ln}.` : "";
  return `${wn} is the better choice on this test: ${w.passed} of ${w.n} passed against ${l.passed} of ${l.n} for ${ln}${speed}.${errs} This is a small fixed test, so it shows a trend, not a guarantee.`;
}

/** "Model A (x)" labels, so two runs of the same model are still told apart. */
export const slotNames = (models: string[]) => models.map((m, i) => `${String.fromCharCode(65 + i)}: ${m}`);

export function Day1Table({ result, caption }: { result: Day1Result; caption: string }) {
  const stats = day1Stats(result);
  const names = slotNames(result.models);
  const verdict = day1Verdict(stats, names);
  return (
    <>
      <div className="kpis">
        {stats.map((s, i) => (
          <Kpi key={i} icon="target" label={names[i]} value={s.n ? `${s.passed} of ${s.n} passed` : "Not run"}
            sub={`Average ${secs(s.avgMs)} · ${s.tin + s.tout} tokens (${s.tin} in, ${s.tout} out) · ${s.errors} error${s.errors === 1 ? "" : "s"}`} />
        ))}
      </div>
      {verdict && <p><b>Which is better and why:</b> {verdict}</p>}
      <div className="tablewrap" tabIndex={0} role="region" aria-label={`${caption}, scrolls sideways on small screens`}>
        <table>
          <caption className="sr">{caption}</caption>
          <thead><tr><th scope="col">Question</th><th scope="col">Kind</th>{names.map((n) => <th key={n} scope="col">{n}</th>)}</tr></thead>
          <tbody>
            {result.rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}{r.prompt && <><br /><span className="muted small">{short(r.prompt, 120)}</span></>}</td>
                <td>{r.kind}</td>
                {r.cells.map((c, i) => (
                  <td key={i}>
                    <Verdict cell={c} />
                    {c && <><br /><span className="small">{c.error ? short(c.error) : short(c.answer || "(empty answer)")}</span><br /><span className="muted small tnum">{secs(c.latency_ms)} · {c.input_tokens + c.output_tokens} tokens</span></>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const share = (v: { passed: number; total: number }) => (v.total ? v.passed / v.total : -1);

export function bestVersion(r: Day2Result) {
  // Only versions that scored every candidate compete: a version with a failed batch could otherwise win on fewer candidates.
  const most = Math.max(0, ...r.versions.map((v) => v.total));
  const done = r.versions.filter((v) => v.total > 0 && v.total === most);
  return [...done].sort((a, b) => share(b) - share(a) || a.latency_ms - b.latency_ms)[0]?.version;
}

export function Day2Table({ result, caption }: { result: Day2Result; caption: string }) {
  const best = bestVersion(result);
  const b = result.versions.find((v) => v.version === best);
  return (
    <>
      {b && <p><b>Best version: {b.version}</b>: {b.passed} of {b.total} candidates passed{result.versions.length > 1 ? ". Ranked by the share of candidates passed, then by time" : ""}.</p>}
      {result.scoring && <p className="muted small">{result.scoring}</p>}
      <div className="tablewrap" tabIndex={0} role="region" aria-label={`${caption}, scrolls sideways on small screens`}>
        <table>
          <caption className="sr">{caption}</caption>
          <thead><tr><th scope="col">Version</th><th scope="col">Candidates passed</th><th scope="col">Batches</th><th scope="col">Time</th><th scope="col">Tokens (in / out)</th><th scope="col">Problems</th></tr></thead>
          <tbody>
            {result.versions.map((v) => (
              <tr key={v.version}>
                <td>{v.version === best ? <b>{v.version}</b> : v.version} {v.version === best && <Chip tone="ok">Best</Chip>}</td>
                <td className="tnum">{v.passed} of {v.total}</td>
                <td className="tnum">{v.batches}</td>
                <td className="tnum">{secs(v.latency_ms)}</td>
                <td className="tnum">{v.input_tokens} / {v.output_tokens}</td>
                <td className="small">{v.errors.length + v.warnings.length === 0 ? "None" : [...v.errors, ...v.warnings].map((x) => short(x, 120)).join("; ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.versions.map((v) => v.candidates.length > 0 && (
        <details key={v.version} className="mini">
          <summary>Each candidate for {v.version} ({v.passed} of {v.total} passed)</summary>
          <ul className="plain small">
            {v.candidates.map((c, i) => (
              <li key={i}>
                <b>{c.name}</b>: {c.passed ? "Pass" : "Fail"}. Rated <i>{c.fit || "nothing"}</i>
                {c.expected_fit.length > 0 && <> (expected {c.expected_fit.join(" or ")})</>}
                {c.forbidden_claims.length > 0 && <>; must not claim {c.forbidden_claims.join(", ")}</>}. {c.note}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </>
  );
}

const STEP_LABEL = Object.fromEntries(DAY3_STEPS);

export function Day3Table({ result, caption }: { result: Day3Result; caption: string }) {
  const passed = result.steps.filter((s) => s.pass).length;
  return (
    <>
      <p><b>{passed} of {DAY3_STEPS.length} steps passed</b>{passed === DAY3_STEPS.length ? ": the whole flow worked." : "."}{result.stopped ? " The run was stopped before the end." : ""}</p>
      {result.leftover && <p className="callout warn">The test task "{result.title}" is still in your task list. Delete it on the Task assistant page.</p>}
      <div className="tablewrap" tabIndex={0} role="region" aria-label={`${caption}, scrolls sideways on small screens`}>
        <table>
          <caption className="sr">{caption}</caption>
          <thead><tr><th scope="col">Step</th><th scope="col">Result</th><th scope="col">What happened</th><th scope="col">Time</th></tr></thead>
          <tbody>
            {DAY3_STEPS.map(([k, label]) => {
              const s = result.steps.find((x) => x.name === k);
              return (
                <tr key={k}>
                  <td>{STEP_LABEL[k] ?? label}</td>
                  <td>{!s ? <span className="tag st-draft">Not run</span> : s.pass ? <span className="tag st-approved">Pass</span> : <span className="tag st-rejected">Fail</span>}</td>
                  <td className="small">{s ? s.note : ""}</td>
                  <td className="tnum">{s ? secs(s.ms) : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function ResultView({ result, caption }: { result: LabResult; caption: string }) {
  if (result.day === 1) return <Day1Table result={result} caption={caption} />;
  if (result.day === 2) return <Day2Table result={result} caption={caption} />;
  return <Day3Table result={result} caption={caption} />;
}
