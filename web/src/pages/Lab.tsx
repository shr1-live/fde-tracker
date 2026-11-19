// Practice lab: the Week 1 Day 1, 2 and 3 practicals, run from the browser on the server's model or on the person's own Gemini key.
// Recorded local runs are shown first, so anyone can see what a run looks like before running anything.
import { KeyboardEvent, ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { API_URL, ApiError } from "../lib/api";
import { getModels, Usage } from "../lib/assistantApi";
import { useOwnKey, OwnKey } from "../lib/llmKey";
import { useStore } from "../lib/store";
import { useMe } from "../lib/useRole";
import * as lab from "../lib/labApi";
import type { Day1Case, Day1Result, Day2Result, Day2Version, Day3Result, Day3Step, LabResult, ModelChoice, SavedRun } from "../lib/labApi";
import { RECORDED } from "../data/labSamples";
import { WEEK_DAYS } from "../data/weekPlan";
import { GeminiKeyPanel } from "../components/GeminiKeyPanel";
import { ResultView, Day3Table } from "../components/LabResults";
import { Progress } from "../components/Progress";
import { Chip } from "../components/Chip";
import { Icon } from "../components/Icon";

type Day = 1 | 2 | 3;
const DAYS: Day[] = [1, 2, 3];
const DUE = "2026-12-15"; // a fixed due date for the Day 3 test task, so every run is the same

// ---------- shared page state ----------
type Ctx = {
  connected: boolean; signedOut: boolean; usage: Usage | null; own: OwnKey | null; geminiModels: string[];
  admin: boolean; busyDay: Day | null; setBusyDay: (d: Day | null) => void;
  mine: SavedRun[] | null; samples: SavedRun[] | null; savedError: string; reloadSaved: () => void;
};

// ---------- running: one call at a time, a Stop button, and one retry after Google's free-tier limit ----------
type CallOpts = { retry?: boolean };
type Helpers = { signal: AbortSignal; say: (s: string) => void; call: <T>(f: (signal: AbortSignal) => Promise<T>, o?: CallOpts) => Promise<T> };

function useRunner(day: Day, ctx: Ctx) {
  const [status, setStatus] = useState("");
  const [waitLeft, setWaitLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  useEffect(() => () => ctrl.current?.abort(), []); // leaving the page stops the run

  const start = useCallback(async (work: (h: Helpers) => Promise<void>) => {
    const c = new AbortController();
    ctrl.current = c; setRunning(true); ctx.setBusyDay(day); setStatus("Starting.");
    const pause = (ms: number) => new Promise<void>((res) => { const t = setTimeout(res, ms); c.signal.addEventListener("abort", () => { clearTimeout(t); res(); }, { once: true }); });
    let stopReason = "";
    const call = async <T,>(f: (signal: AbortSignal) => Promise<T>, o?: CallOpts): Promise<T> => {
      try { return await f(c.signal); }
      catch (e) {
        // Our own daily limit is not a short wait: stop the whole run and say why, instead of waiting and retrying every call.
        if (e instanceof ApiError && e.kind === "daily_limit") { stopReason = e.message; c.abort(); throw e; }
        if (!(e instanceof ApiError) || e.status !== 429 || c.signal.aborted || o?.retry === false) throw e;
        const wait = Math.min(Math.max(Math.round(e.retryAfter ?? 20), 1), 120);
        setStatus(`The free limit was reached. Waiting ${wait} seconds, then trying this call once more.`);
        for (let s = wait; s > 0 && !c.signal.aborted; s--) { setWaitLeft(s); await pause(1000); }
        setWaitLeft(0);
        if (c.signal.aborted) throw new ApiError(0, "Stopped.", "stopped");
        return await f(c.signal);
      }
    };
    try { await work({ signal: c.signal, say: setStatus, call }); }
    finally {
      if (stopReason) setStatus(`Stopped: ${stopReason} Calls on your own Gemini key are counted separately.`);
      setRunning(false); setWaitLeft(0); ctx.setBusyDay(null); ctrl.current = null;
    }
  }, [ctx, day]);

  return { status, setStatus, waitLeft, running, start, stop: () => ctrl.current?.abort() };
}

// ---------- choosing a model ----------
const serverName = (u: Usage | null) => u?.model ?? "server model";
const choiceName = (c: ModelChoice, u: Usage | null) => (c.source === "server" ? serverName(u) : c.model);
const usable = (c: ModelChoice, ctx: Ctx) => (c.source === "server" ? !!ctx.usage?.configured : !!ctx.own && !!c.model);
const defaultChoice = (ctx: Ctx, prefer: "server" | "gemini"): ModelChoice => {
  const gem: ModelChoice | null = ctx.own?.model ? { source: "gemini", model: ctx.own.model } : null;
  if (prefer === "gemini" && gem) return gem;
  if (ctx.usage?.configured) return { source: "server" };
  return gem ?? { source: "server" };
};

function ModelPick({ legend, value, onChange, ctx, disabled }: { legend: string; value: ModelChoice; onChange: (c: ModelChoice) => void; ctx: Ctx; disabled: boolean }) {
  const id = useId();
  const serverOk = !!ctx.usage?.configured;
  const models = ctx.geminiModels.length ? ctx.geminiModels : ctx.own?.model ? [ctx.own.model] : [];
  return (
    <fieldset className="labpick" disabled={disabled}>
      <legend>{legend}</legend>
      <label className="pickitem" htmlFor={id + "-s"}>
        <input id={id + "-s"} type="radio" name={id} checked={value.source === "server"} disabled={!serverOk} onChange={() => onChange({ source: "server" })} />
        Server model {ctx.usage ? (serverOk ? <span className="muted">({serverName(ctx.usage)})</span> : <Chip tone="warn">Not set up on this server</Chip>) : <span className="muted">({ctx.connected ? "not checked yet" : "not connected"})</span>}
      </label>
      <label className="pickitem" htmlFor={id + "-g"}>
        <input id={id + "-g"} type="radio" name={id} checked={value.source === "gemini"} disabled={!ctx.own?.model}
          onChange={() => onChange({ source: "gemini", model: ctx.own?.model ?? "" })} />
        My Gemini key {ctx.own?.model ? <span className="muted">({ctx.own.model})</span> : <Chip tone="warn">Add your key at the top first</Chip>}
      </label>
      {value.source === "gemini" && models.length > 1 && (
        <>
          <label htmlFor={id + "-m"}>Gemini model for {legend}</label>
          <select id={id + "-m"} value={value.model} onChange={(e) => onChange({ source: "gemini", model: e.target.value })}>
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </>
      )}
    </fieldset>
  );
}

// ---------- small shared pieces ----------
function ToDo({ items }: { items: [string, boolean][] }) {
  return (
    <ol className="plain">
      {items.map(([t, done]) => <li key={t}>{t} {done && <Chip tone="ok"><Icon name="check" size={14} />Done</Chip>}</li>)}
    </ol>
  );
}

function RunStatus({ r, total, done }: { r: ReturnType<typeof useRunner>; total: number; done: number }) {
  return (
    <div className="labstatus">
      {total > 0 && (r.running || done > 0) && <><Progress value={(100 * done) / total} label="Run progress" /><p className="small muted tnum">{done} of {total} calls done</p></>}
      <p className="small" role="status" aria-live="polite">{r.status}</p>
      {r.waitLeft > 0 && <p className="small tnum" aria-hidden="true">Trying again in {r.waitLeft} s</p>}
    </div>
  );
}

function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function modelsOf(r: LabResult): string[] { return r.day === 1 ? r.models : [r.model]; }
function labelOf(r: LabResult): string {
  if (r.day === 1) return `Day 1: ${r.models.join(" vs ")}, ${r.rows.filter((x) => x.cells.some((c) => c !== null)).length} questions`;
  if (r.day === 2) return `Day 2: ${r.model}, versions ${r.versions.map((v) => v.version).join(", ")}`;
  return `Day 3: ${r.model}, ${r.title}`;
}

/** The finished run: Save (to my runs), Download JSON (as proof). */
function RunActions({ result, ctx, onSaved }: { result: LabResult; ctx: Ctx; onSaved: () => void }) {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");
  useEffect(() => { setState("idle"); setError(""); }, [result]);
  async function save() {
    setState("saving"); setError("");
    try { await lab.saveRun(result.day, labelOf(result), modelsOf(result), result); setState("saved"); onSaved(); ctx.reloadSaved(); }
    catch (e) { setState("idle"); setError(lab.errorText(e)); }
  }
  return (
    <>
      <div className="row">
        <button type="button" className="btn" onClick={save} disabled={!ctx.connected || state !== "idle"}>{state === "saved" ? "Saved" : state === "saving" ? "Saving..." : "Save this run"}</button>
        <button type="button" className="btn ghost" onClick={() => lab.downloadJson(`lab-day${result.day}-${stamp()}.json`, result)}>Download JSON</button>
        {state === "saved" && <span role="status" className="small">Saved to your runs below. Attach the JSON or a screenshot as proof.</span>}
      </div>
      {error && <p className="banner err" role="alert">Could not save: {error}</p>}
    </>
  );
}

/** Recorded local run(s), then the admin's pinned sample, then this person's saved runs for the day. */
function Samples({ day, ctx }: { day: Day; ctx: Ctx }) {
  const pinned = (ctx.samples ?? []).find((s) => s.day === day && lab.isResult(s.result, day));
  const [run3, setRun3] = useState(0);
  const rec = RECORDED[day];
  return (
    <section aria-labelledby={`lab-s${day}`}>
      <h3 id={`lab-s${day}`}>Sample runs</h3>
      <p className="muted small">Shown before you run anything, so you know what a run looks like and what to compare against.</p>
      <details className="primer" open>
        <summary>{rec.label}, {rec.date}</summary>
        <p className="muted small">{rec.note}</p>
        {day === 3 ? (
          <>
            <label htmlFor="lab-rec3">Recorded run</label>
            <select id="lab-rec3" value={run3} onChange={(e) => setRun3(Number(e.target.value))}>
              {RECORDED[3].runs.map((r, i) => <option key={i} value={i}>{r.title}</option>)}
            </select>
            <Day3Table result={RECORDED[3].runs[run3]} caption={`Day 3 recorded run ${run3 + 1}, local model`} />
          </>
        ) : <ResultView result={(day === 1 ? RECORDED[1] : RECORDED[2]).result} caption={`Day ${day} recorded run, local model`} />}
      </details>
      {pinned ? (
        <details className="primer">
          <summary>Sample run pinned by the admin (model {pinned.models.join(" vs ") || "not named"}), {new Date(pinned.created_at).toLocaleDateString()}</summary>
          <p className="muted small">{pinned.label}</p>
          <ResultView result={pinned.result} caption={`Day ${day} sample run pinned by the admin`} />
        </details>
      ) : (
        <p className="callout">{ctx.connected && ctx.samples === null && !ctx.savedError ? "Checking for a Gemini sample run..." : "No pinned sample yet. Admin: run this day once (for example with your Gemini key) and press Pin as sample."}</p>
      )}
    </section>
  );
}

function MyRuns({ day, ctx }: { day: Day; ctx: Ctx }) {
  const [open, setOpen] = useState<string | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!ctx.connected || ctx.signedOut) return null;
  const runs = (ctx.mine ?? []).filter((r) => r.day === day);
  async function act(f: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await f(); ctx.reloadSaved(); } catch (e) { setError(lab.errorText(e)); } finally { setBusy(false); setAsking(null); }
  }
  return (
    <section aria-labelledby={`lab-m${day}`}>
      <h3 id={`lab-m${day}`}>My saved runs for Day {day}</h3>
      {ctx.savedError && <p className="banner" role="status">{ctx.savedError}</p>}
      {error && <p className="banner err" role="alert">{error}</p>}
      {ctx.mine === null && !ctx.savedError ? <p className="muted small">Loading.</p> : runs.length === 0 ? <p className="muted small">No saved runs for this day yet. Run it above and press Save this run.</p> : (
        <ul className="proofs">
          {runs.map((r) => (
            <li key={r.id} className="proof labrun">
              <div className="proofbody">
                <b>{r.label}</b>
                <span className="muted small">{new Date(r.created_at).toLocaleString()} · {r.models.join(" vs ")} {r.is_sample && <Chip tone="info">Pinned as sample</Chip>}</span>
                {open === r.id && (lab.isResult(r.result, day) ? <ResultView result={r.result} caption={`Saved run ${r.label}`} /> : <p className="muted small">This saved run cannot be shown here.</p>)}
              </div>
              <div className="row tight">
                <button type="button" className="copy" aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? "Hide" : "View"}</button>
                <button type="button" className="copy" onClick={() => lab.downloadJson(`lab-day${r.day}-${r.id}.json`, r.result)}>Download JSON</button>
                {ctx.admin && (r.is_sample
                  ? <button type="button" className="copy" disabled={busy} onClick={() => act(() => lab.unpin(r.id))}>Unpin</button>
                  : <button type="button" className="copy" disabled={busy} onClick={() => act(() => lab.pin(r.id))}>Pin as sample</button>)}
                {asking === r.id ? (
                  <span className="row tight" role="group" aria-label="Confirm delete">
                    <span className="small">Delete this run?</span>
                    <button type="button" className="copy danger" disabled={busy} onClick={() => act(() => lab.deleteRun(r.id))}>Yes, delete</button>
                    <button type="button" className="copy" onClick={() => setAsking(null)}>No</button>
                  </span>
                ) : <button type="button" className="copy" onClick={() => setAsking(r.id)}>Delete</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function canRun(ctx: Ctx) {
  if (!ctx.connected) return "This site is not connected to the server, so runs are off. The recorded runs below still show what a run looks like.";
  if (ctx.signedOut) return "Sign in with your office account to run the practicals.";
  if (!ctx.usage?.configured && !ctx.own?.model) return "No model is available: the server has no model set up and you have not added a Gemini key. Add your key at the top of the page.";
  return "";
}

function Shell({ day, ctx, todo, children }: { day: Day; ctx: Ctx; todo: [string, boolean][]; children: ReactNode }) {
  const wd = WEEK_DAYS.find((d) => d.n === day);
  return (
    <>
      <section className="card" aria-labelledby={`lab-a${day}`}>
        <h2 id={`lab-a${day}`}>Day {day}: {wd?.title}</h2>
        <p><b>The sheet asks:</b> {wd?.task}</p>
        <h3>To do</h3>
        <ToDo items={todo} />
      </section>
      <section className="card gap" aria-labelledby={`lab-r${day}`}>
        <h3 id={`lab-r${day}`}>Run it</h3>
        {canRun(ctx) && <p className="banner" role="status">{canRun(ctx)}</p>}
        {ctx.busyDay && ctx.busyDay !== day && <p className="banner" role="status">A Day {ctx.busyDay} run is going on. Wait for it to finish or stop it first.</p>}
        {children}
      </section>
      <MyRuns day={day} ctx={ctx} />
      <Samples day={day} ctx={ctx} />
    </>
  );
}

// ---------- Day 1 ----------
function Day1Panel({ ctx }: { ctx: Ctx }) {
  const r = useRunner(1, ctx);
  const [cases, setCases] = useState<Day1Case[] | null>(null);
  const [casesError, setCasesError] = useState("");
  const [a, setA] = useState<ModelChoice>(() => defaultChoice(ctx, "server"));
  const [b, setB] = useState<ModelChoice>(() => defaultChoice(ctx, "gemini"));
  const [scope, setScope] = useState<"core" | "all">("core");
  const [result, setResult] = useState<Day1Result | null>(null);
  const [done, setDone] = useState(0);
  const [saved, setSaved] = useState(false);

  // When the server or key information arrives later, pick sensible defaults (until the person chooses).
  const touched = useRef(false);
  useEffect(() => { if (!touched.current) { setA(defaultChoice(ctx, "server")); setB(defaultChoice(ctx, "gemini")); } }, [ctx.usage, ctx.own]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ctx.connected || ctx.signedOut) return;
    lab.day1Cases().then((c) => setCases(c.cases)).catch((e) => setCasesError(lab.errorText(e)));
  }, [ctx.connected, ctx.signedOut]);

  const picked = cases ? (scope === "core" ? cases.slice(0, 10) : cases) : [];
  const blocked = !!canRun(ctx) || !cases || !usable(a, ctx) || !usable(b, ctx) || (ctx.busyDay !== null && ctx.busyDay !== 1);

  function run() {
    const names = [choiceName(a, ctx.usage), choiceName(b, ctx.usage)];
    const base: Day1Result = { day: 1, models: names, rows: picked.map((c) => ({ id: c.id, kind: c.kind, prompt: c.prompt, cells: [null, null] })), ran_at: new Date().toISOString() };
    setResult(base); setDone(0); setSaved(false);
    r.start(async ({ signal, say, call }) => {
      let cur = base; let n = 0;
      const total = picked.length * 2;
      for (let i = 0; i < picked.length; i++) {
        for (const [slot, choice] of [[0, a], [1, b]] as [number, ModelChoice][]) {
          if (signal.aborted) break;
          const c = picked[i];
          say(`Question ${i + 1} of ${picked.length} (${c.id}) on ${String.fromCharCode(65 + slot)}: ${names[slot]}.`);
          let cell: lab.Cell;
          try {
            const ans = await call((s) => lab.day1Run(c.id, choice, s));
            cell = { passed: ans.passed, answer: ans.answer, latency_ms: ans.latency_ms, input_tokens: ans.input_tokens, output_tokens: ans.output_tokens };
            if (ans.model && ans.model !== cur.models[slot]) cur = { ...cur, models: cur.models.map((m, k) => (k === slot ? ans.model : m)) };
          } catch (e) {
            if (signal.aborted) break;
            cell = { passed: false, answer: "", latency_ms: 0, input_tokens: 0, output_tokens: 0, error: lab.errorText(e) };
          }
          cur = { ...cur, rows: cur.rows.map((row, k) => (k === i ? { ...row, cells: row.cells.map((x, j) => (j === slot ? cell : x)) } : row)) };
          setResult(cur); setDone(++n);
        }
        if (signal.aborted) break;
      }
      if (signal.aborted) { cur = { ...cur, stopped: true }; setResult(cur); say(`Stopped after ${n} of ${total} calls. The table shows what finished.`); }
      else say(`Finished: ${total} calls. Read the summary below, then save the run.`);
    });
  }

  const todo: [string, boolean][] = [
    ["Add your free Gemini key at the top of the page (or use the server model if it is set up).", !!ctx.own?.model],
    ["Choose model A and model B. Try the server model against Gemini, or two Gemini models.", false],
    ["Run the 10 core questions (or all 20). Both models get the same questions, scored the same way.", !!result && !r.running],
    ["Read the pass rate, average time, tokens and errors, and the one-line verdict.", !!result && !r.running],
    ["Save this run, and download the JSON to attach as proof on your Day 1 entry.", saved],
  ];

  return (
    <Shell day={1} ctx={ctx} todo={todo}>
      {casesError && <p className="banner err" role="alert">Could not load the questions: {casesError}</p>}
      <div className="two">
        <ModelPick legend="Model A" value={a} onChange={(c) => { touched.current = true; setA(c); }} ctx={ctx} disabled={r.running} />
        <ModelPick legend="Model B" value={b} onChange={(c) => { touched.current = true; setB(c); }} ctx={ctx} disabled={r.running} />
      </div>
      <fieldset className="labpick" disabled={r.running}>
        <legend>Questions</legend>
        <label className="pickitem" htmlFor="lab1-core"><input id="lab1-core" type="radio" name="lab1-scope" checked={scope === "core"} onChange={() => setScope("core")} /> The 10 core questions</label>
        <label className="pickitem" htmlFor="lab1-all"><input id="lab1-all" type="radio" name="lab1-scope" checked={scope === "all"} onChange={() => setScope("all")} /> All {cases?.length ?? 20} questions</label>
      </fieldset>
      <p className="muted small">{picked.length ? `${picked.length * 2} calls in a row, one at a time.` : ""} With a free Gemini key, Google allows only a few calls a minute: if the limit is hit, the page waits and tries once more.</p>
      <div className="row">
        <button type="button" className="btn" onClick={run} disabled={blocked || r.running}>{r.running ? "Running..." : "Run Day 1"}</button>
        {r.running && <button type="button" className="btn ghost" onClick={r.stop}>Stop</button>}
      </div>
      <RunStatus r={r} total={picked.length * 2} done={done} />
      {result && (
        <div className="gap">
          <h3>Your run</h3>
          <ResultView result={result} caption="Day 1 your run" />
          {!r.running && <RunActions result={result} ctx={ctx} onSaved={() => setSaved(true)} />}
        </div>
      )}
    </Shell>
  );
}

// ---------- Day 2 ----------
const DEFAULT_VERSIONS = ["v1", "v2", "v3", "v4"];

function Day2Panel({ ctx }: { ctx: Ctx }) {
  const r = useRunner(2, ctx);
  const [m, setM] = useState<ModelChoice>(() => defaultChoice(ctx, "gemini"));
  const touched = useRef(false);
  useEffect(() => { if (!touched.current) setM(defaultChoice(ctx, "gemini")); }, [ctx.usage, ctx.own]); // eslint-disable-line react-hooks/exhaustive-deps
  const all = ctx.usage?.prompt_versions?.length ? ctx.usage.prompt_versions : ["v1", "v2", "v3", "v4", "v5", "v6", "v7"];
  const [versions, setVersions] = useState<string[]>(DEFAULT_VERSIONS);
  const [result, setResult] = useState<Day2Result | null>(null);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [saved, setSaved] = useState(false);
  const chosen = all.filter((v) => versions.includes(v));
  const blocked = !!canRun(ctx) || chosen.length === 0 || !usable(m, ctx) || (ctx.busyDay !== null && ctx.busyDay !== 2);

  function run() {
    const model = choiceName(m, ctx.usage);
    const empty = (v: string): Day2Version => ({ version: v, batches: 0, passed: 0, total: 0, latency_ms: 0, input_tokens: 0, output_tokens: 0, candidates: [], warnings: [], errors: [] });
    let cur: Day2Result = { day: 2, model, versions: chosen.map(empty), ran_at: new Date().toISOString(), scoring: "A candidate passes when the rating is one of the expected ones and none of the forbidden claims appear (checked by the server)." };
    setResult(cur); setDone(0); setTotal(chosen.length); setSaved(false);
    r.start(async ({ signal, say, call }) => {
      let n = 0; let expected = chosen.length; // grows once the server says how many batches a version has
      const put = (v: string, f: (x: Day2Version) => Day2Version) => { cur = { ...cur, versions: cur.versions.map((x) => (x.version === v ? f(x) : x)) }; setResult(cur); };
      let known = 1; // batches per version, learned from the first answer; kept so a failed first batch does not skip the others
      let learned = false; // until one answer says how many batches there are, a failed batch is followed by a try at the next one
      for (const v of chosen) {
        let batches = known;
        if (known > 1) { expected += known - 1; setTotal(expected); }
        for (let b = 0; b < batches; b++) {
          if (signal.aborted) break;
          say(`Version ${v}, batch ${b + 1}${batches > 1 ? ` of ${batches}` : ""}.`);
          try {
            const res = await call((s) => lab.day2Run(v, b, m, s));
            if (res.batches > batches) { expected += res.batches - batches; batches = res.batches; setTotal(expected); }
            known = Math.max(known, res.batches); learned = true;
            if (res.model && res.model !== cur.model) cur = { ...cur, model: res.model };
            put(v, (x) => ({
              ...x, batches: Math.max(x.batches, res.batches), passed: x.passed + res.passed, total: x.total + res.total,
              latency_ms: x.latency_ms + res.latency_ms, input_tokens: x.input_tokens + res.input_tokens, output_tokens: x.output_tokens + res.output_tokens,
              candidates: [...x.candidates, ...res.candidates], warnings: [...x.warnings, ...res.warnings],
            }));
          } catch (e) {
            if (signal.aborted) break;
            // Probing past the last batch: the server answers 400 ("Batch must be from 0 to N"), which only means there is no such batch.
            if (!learned && b > 0 && e instanceof ApiError && e.status === 400) { setDone(++n); break; }
            put(v, (x) => ({ ...x, errors: [...x.errors, `batch ${b + 1}: ${lab.errorText(e)}`] }));
            if (!learned && b === batches - 1 && batches < 6) { batches++; expected++; setTotal(expected); }
          }
          setDone(++n);
        }
        if (signal.aborted) break;
      }
      if (signal.aborted) { cur = { ...cur, stopped: true }; setResult(cur); say(`Stopped after ${n} calls. The table shows what finished.`); }
      else say(`Finished: ${n} calls. The best version is marked in the table.`);
    });
  }

  const todo: [string, boolean][] = [
    ["Add your free Gemini key at the top of the page (or use the server model).", !!ctx.own?.model],
    ["Choose the model and the prompt versions (v1 to v4 by default).", false],
    ["Run: every version gets the same job description and candidates, in small batches.", !!result && !r.running],
    ["Compare candidates passed, time and tokens per version; open a version to see each candidate.", !!result && !r.running],
    ["Save this run, and download the JSON to attach as proof on your Day 2 entry.", saved],
  ];

  return (
    <Shell day={2} ctx={ctx} todo={todo}>
      <ModelPick legend="Model" value={m} onChange={(c) => { touched.current = true; setM(c); }} ctx={ctx} disabled={r.running} />
      <fieldset className="labpick" disabled={r.running}>
        <legend>Prompt versions</legend>
        <div className="row tight">
          {all.map((v) => (
            <label key={v} className="pickitem" htmlFor={`lab2-${v}`}>
              <input id={`lab2-${v}`} type="checkbox" checked={versions.includes(v)} onChange={(e) => setVersions(e.target.checked ? [...versions, v] : versions.filter((x) => x !== v))} /> {v}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="row">
        <button type="button" className="btn" onClick={run} disabled={blocked || r.running}>{r.running ? "Running..." : "Run Day 2"}</button>
        {r.running && <button type="button" className="btn ghost" onClick={r.stop}>Stop</button>}
      </div>
      <RunStatus r={r} total={total} done={done} />
      {result && (
        <div className="gap">
          <h3>Your run</h3>
          <ResultView result={result} caption="Day 2 your run" />
          {!r.running && <RunActions result={result} ctx={ctx} onSaved={() => setSaved(true)} />}
        </div>
      )}
    </Shell>
  );
}

// ---------- Day 3 ----------
const acts = (rep: { actions: { tool: string; outcome: string }[] }) => rep.actions.map((x) => `${x.tool}:${x.outcome}`).join(", ") || "no tool call";

function Day3Panel({ ctx }: { ctx: Ctx }) {
  const r = useRunner(3, ctx);
  const [m, setM] = useState<ModelChoice>(() => defaultChoice(ctx, "gemini"));
  const touched = useRef(false);
  useEffect(() => { if (!touched.current) setM(defaultChoice(ctx, "gemini")); }, [ctx.usage, ctx.own]); // eslint-disable-line react-hooks/exhaustive-deps
  const [result, setResult] = useState<Day3Result | null>(null);
  const [done, setDone] = useState(0);
  const [saved, setSaved] = useState(false);
  const blocked = !!canRun(ctx) || !usable(m, ctx) || (ctx.busyDay !== null && ctx.busyDay !== 3);

  function run() {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    const title = `Lab check ${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    let cur: Day3Result = { day: 3, model: choiceName(m, ctx.usage), title, steps: [], ran_at: d.toISOString() };
    setResult(cur); setDone(0); setSaved(false);
    r.start(async ({ signal, say, call }) => {
      const find = async () => (await call((s) => lab.day3.tasks(s))).find((t) => t.title.trim().toLowerCase() === title.toLowerCase());
      const step = async (name: string, what: string, f: () => Promise<{ pass: boolean; note: string }>) => {
        if (signal.aborted) return;
        say(`Step ${cur.steps.length + 1} of 6: ${what}.`);
        const t0 = performance.now();
        let s: Day3Step;
        try { const o = await f(); s = { name, ...o, ms: Math.round(performance.now() - t0) }; }
        catch (e) {
          if (signal.aborted) return;
          s = { name, pass: false, note: `error: ${lab.errorText(e)}`, ms: Math.round(performance.now() - t0) };
        }
        cur = { ...cur, steps: [...cur.steps, s] }; setResult(cur); setDone(cur.steps.length);
      };
      let pendingId: string | null = null;

      await step("create", "create the task", async () => {
        const rep = await call((s) => lab.day3.send(`Add a task: ${title}, due ${DUE}, high priority`, m, s), { retry: false });
        const t = await find();
        const ok = !!t && t.priority === "high" && (t.due_date ?? "").startsWith(DUE);
        return { pass: ok, note: `${acts(rep)} | ${t ? `found, ${t.priority} priority, due ${t.due_date ?? "none"}` : "not in the task list"}` };
      });
      await step("list", "list the tasks", async () => {
        const rep = await call((s) => lab.day3.send("What tasks do I have?", m, s), { retry: false });
        const listed = rep.actions.some((x) => x.tool === "list_tasks" && x.outcome === "ok");
        const named = rep.reply.toLowerCase().includes(title.toLowerCase());
        const there = !!(await find());
        return { pass: listed && there, note: `${acts(rep)} | named it in the reply: ${named ? "yes" : "no"} | in the list: ${there ? "yes" : "no"}` };
      });
      await step("update", "mark it done", async () => {
        const rep = await call((s) => lab.day3.send(`Mark the task "${title}" as done`, m, s), { retry: false });
        const t = await find();
        return { pass: t?.status === "done", note: `${acts(rep)} | status ${t?.status ?? "task not found"}` };
      });
      await step("delete asks first", "ask to delete it", async () => {
        const rep = await call((s) => lab.day3.send(`Delete the task "${title}"`, m, s), { retry: false });
        pendingId = rep.pending?.id ?? null;
        const there = !!(await find());
        return { pass: !!pendingId && there, note: `${acts(rep)} | confirmation asked: ${pendingId ? "yes" : "no"} | still there: ${there ? "yes" : "no"}` };
      });
      await step("cancel keeps it", "say no", async () => {
        if (!pendingId) return { pass: false, note: "skipped: there was no confirmation question to answer" };
        const id = pendingId;
        await call((s) => lab.day3.confirm(id, false, m, s));
        const there = !!(await find());
        return { pass: there, note: `answered no | still there: ${there ? "yes" : "no"}` };
      });
      await step("confirm deletes", "ask again and say yes", async () => {
        const rep = await call((s) => lab.day3.send(`Delete the task "${title}"`, m, s), { retry: false });
        const id = rep.pending?.id;
        if (!id) { const there = !!(await find()); return { pass: false, note: `${acts(rep)} | no confirmation question | still there: ${there ? "yes" : "no"}` }; }
        await call((s) => lab.day3.confirm(id, true, m, s));
        const gone = !(await find());
        return { pass: gone, note: `${acts(rep)} | answered yes | gone: ${gone ? "yes" : "no"}` };
      });

      // Whatever happened, say whether the test task is still in the person's list.
      let leftover = false;
      try { leftover = !!(await lab.day3.tasks()).find((t) => t.title.trim().toLowerCase() === title.toLowerCase()); } catch { /* not known */ }
      cur = { ...cur, leftover, stopped: signal.aborted || undefined }; setResult(cur);
      say(signal.aborted ? `Stopped after ${cur.steps.length} of 6 steps.` : `Finished: ${cur.steps.filter((s) => s.pass).length} of 6 steps passed.`);
    });
  }

  const todo: [string, boolean][] = [
    ["Add your free Gemini key at the top of the page (or use the server model).", !!ctx.own?.model],
    ["Choose the model the task assistant should use.", false],
    ["Run the six steps: create, list, mark done, ask to delete, say no, delete with a yes. Each step is checked on your real task list.", !!result && !r.running],
    ["Read which steps passed and which tools the model asked for.", !!result && !r.running],
    ["Save this run, and download the JSON to attach as proof on your Day 3 entry.", saved],
  ];

  return (
    <Shell day={3} ctx={ctx} todo={todo}>
      <p className="callout warn">This uses the real task assistant on <b>your own task list</b>: it creates one task called "Lab check" plus the time, then deletes it at the end. If a step fails, the task may stay; you can delete it on the Task assistant page.</p>
      <ModelPick legend="Model" value={m} onChange={(c) => { touched.current = true; setM(c); }} ctx={ctx} disabled={r.running} />
      <div className="row">
        <button type="button" className="btn" onClick={run} disabled={blocked || r.running}>{r.running ? "Running..." : "Run Day 3"}</button>
        {r.running && <button type="button" className="btn ghost" onClick={r.stop}>Stop</button>}
      </div>
      <RunStatus r={r} total={6} done={done} />
      {result && (
        <div className="gap">
          <h3>Your run</h3>
          <ResultView result={result} caption="Day 3 your run" />
          {!r.running && <RunActions result={result} ctx={ctx} onSaved={() => setSaved(true)} />}
        </div>
      )}
    </Shell>
  );
}

// ---------- the page ----------
export default function Lab() {
  const own = useOwnKey();
  const { isAdmin } = useStore();
  const { me } = useMe();
  const connected = !!API_URL;
  const [usage, setUsage] = useState<Usage | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [usageError, setUsageError] = useState("");
  const [geminiModels, setGeminiModels] = useState<string[]>([]);
  const [busyDay, setBusyDay] = useState<Day | null>(null);
  const [mine, setMine] = useState<SavedRun[] | null>(null);
  const [samples, setSamples] = useState<SavedRun[] | null>(null);
  const [savedError, setSavedError] = useState("");
  const [tab, setTab] = useState<Day>(1);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!connected) return;
    lab.serverUsage().then((u) => { setUsage(u); setSignedOut(false); })
      .catch((e) => { if (e instanceof ApiError && e.status === 401) setSignedOut(true); else setUsageError(lab.errorText(e)); });
  }, [connected]);

  // The Gemini models this key may use, so model B can be a different Gemini model. Asked once per key.
  useEffect(() => {
    setGeminiModels([]);
    if (!connected || !own?.key) return;
    let alive = true;
    getModels(own.key).then((r) => { if (alive) setGeminiModels(r.models); }).catch(() => { /* the saved model is still offered */ });
    return () => { alive = false; };
  }, [connected, own?.key]);

  const reloadSaved = useCallback(() => {
    if (!connected) return;
    setSavedError("");
    lab.myRuns().then((r) => setMine(r.runs)).catch((e) => { setMine([]); if (!(e instanceof ApiError && e.status === 401)) setSavedError(`Saved runs are not available right now: ${lab.errorText(e)}`); });
    lab.samples().then((r) => setSamples(r.samples)).catch(() => setSamples([]));
  }, [connected]);
  useEffect(() => { reloadSaved(); }, [reloadSaved]);

  const ctx: Ctx = { connected, signedOut, usage, own, geminiModels, admin: isAdmin || me?.role === "admin", busyDay, setBusyDay, mine, samples, savedError, reloadSaved };

  function onTabKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const next = e.key === "ArrowRight" ? (i + 1) % 3 : e.key === "ArrowLeft" ? (i + 2) % 3 : e.key === "Home" ? 0 : e.key === "End" ? 2 : -1;
    if (next < 0) return;
    e.preventDefault(); setTab(DAYS[next]); tabs.current[next]?.focus();
  }

  return (
    <>
      <header className="ph"><h1>Practice lab</h1>
        <p className="muted">Run the Week 1 Day 1, 2 and 3 practicals from here, on the server's model or on your own free Gemini key, and compare them on the same fixed tests. A recorded run is shown for every day before you start.</p></header>

      <section className="card" aria-labelledby="lab-why">
        <h2 id="lab-why">What the Gemini key is for</h2>
        <ul className="plain">
          <li>The backend's own model is a small local one (qwen2.5:3b, through Ollama). It only runs on a PC, so on the live site there may be no shared model at all, and we use free tiers only.</li>
          <li>Your own free Gemini key lets you run the assistants and these practicals on a real hosted model, from the live site, at no cost.</li>
          <li>The key stays in your browser. It is sent only with a model request, used for that one request, and never saved on our server.</li>
          <li>Use the lab to compare the local model and Gemini on the same fixed tests, then save the run and attach it as proof.</li>
        </ul>
      </section>

      {!connected && <p className="banner" role="status">This copy of the site is not connected to the server. You can read the recorded runs below, but you cannot run anything.</p>}
      {signedOut && <p className="banner" role="status">Sign in with your office account to run the practicals. The recorded runs below are still shown.</p>}
      {usageError && <p className="banner err" role="alert">Could not check the server's model: {usageError}</p>}
      {connected && !signedOut && (
        <>
          <GeminiKeyPanel serverModel={usage?.model} serverConfigured={usage ? usage.configured : undefined} />
          {usage && <p className="muted small">Server model: {usage.configured ? usage.model ?? "set up" : "not set up on this server"}. {own?.model ? `Your Gemini key is set (model ${own.model}).` : "Your Gemini key is not set."}</p>}
        </>
      )}

      <div className="seg labtabs" role="tablist" aria-label="Practical day">
        {DAYS.map((d, i) => (
          <button key={d} ref={(el) => { tabs.current[i] = el; }} type="button" role="tab" id={`lab-tab${d}`} aria-controls={`lab-panel${d}`}
            aria-selected={tab === d} tabIndex={tab === d ? 0 : -1} className={tab === d ? "on" : ""} onClick={() => setTab(d)} onKeyDown={(e) => onTabKey(e, i)}>
            Day {d}{busyDay === d ? " (running)" : ""}
          </button>
        ))}
      </div>
      {/* All three stay mounted, so a run keeps going while you look at another day. */}
      <div role="tabpanel" id="lab-panel1" aria-labelledby="lab-tab1" hidden={tab !== 1}><Day1Panel ctx={ctx} /></div>
      <div role="tabpanel" id="lab-panel2" aria-labelledby="lab-tab2" hidden={tab !== 2}><Day2Panel ctx={ctx} /></div>
      <div role="tabpanel" id="lab-panel3" aria-labelledby="lab-tab3" hidden={tab !== 3}><Day3Panel ctx={ctx} /></div>
    </>
  );
}
