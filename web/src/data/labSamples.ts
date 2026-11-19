// Recorded runs shown in the Practice lab before anyone runs anything. These are REAL runs of the local model,
// read from src/data/runs (the same files the Week 1 report uses), turned into the lab's result shape. No numbers are made up here.
import day1Raw from "./runs/day1-local-v2.json";
import day2RawA from "./runs/day2-local-v2.json";
import day2RawB from "./runs/day2-local-v3.json";
import day3Raw from "./runs/day3-local.json";
import type { Day1Result, Day2Result, Day2Version, Day3Result } from "../lib/labApi";

export type Recorded<T> = { label: string; date: string; note: string; result: T };

type D1Row = { Model: string; CaseId: string; Kind: string; Passed: boolean; Answer: string; LatencyMs: number; InputTokens: number; OutputTokens: number; Error: string | null };
type D2Row = { Model: string; Version: string; Repeat: number; Batch?: number; Candidate: string; Parsed: boolean; Present: boolean; Grounded: boolean; FitOk: boolean; NoForbidden: boolean; IncompleteOk: boolean; Fit: string; LatencyMs?: number; InputTokens?: number; OutputTokens?: number; Error?: string | null };
type D3Run = { run: number; steps: Record<string, { pass: boolean; note: string; ms: number }> };

function day1(): Day1Result {
  const rows = day1Raw as D1Row[];
  const models = [...new Set(rows.map((r) => r.Model))];
  const ids = [...new Set(rows.map((r) => r.CaseId))];
  return {
    day: 1, models,
    rows: ids.map((id) => {
      const mine = rows.filter((r) => r.CaseId === id);
      return {
        id, kind: mine[0]?.Kind ?? "",
        cells: models.map((m) => {
          const r = mine.find((x) => x.Model === m);
          return r ? { passed: r.Passed, answer: r.Answer, latency_ms: r.LatencyMs, input_tokens: r.InputTokens, output_tokens: r.OutputTokens, error: r.Error ?? undefined } : null;
        }),
      };
    }),
  };
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function day2(): Day2Result {
  // The first file holds v1 to v4, the second v5 to v7 (same rule as the report: the latest file wins for a version). First repeat only.
  const all = [...(day2RawA as D2Row[]), ...(day2RawB as D2Row[])].filter((r) => r.Repeat === 1);
  const model = all[0]?.Model ?? "qwen2.5:3b";
  const versions = [...new Set(all.map((r) => r.Version))].sort();
  return {
    day: 2, model,
    scoring: "Recorded with the Evals tool: a candidate counts as passed when every check held (answer parsed, claims quoted, a sensible fit, no invented skills, missing information shown). Times and tokens are averaged per batch from the per-candidate records. First of two repeats.",
    versions: versions.map((v): Day2Version => {
      const mine = all.filter((r) => r.Version === v && r.Model === model);
      const batches = [...new Set(mine.map((r) => r.Batch ?? 0))];
      const perBatch = (f: (r: D2Row) => number) => Math.round(batches.reduce((a, b) => a + mean(mine.filter((r) => (r.Batch ?? 0) === b).map(f)), 0));
      const candidates = mine.map((r) => {
        const ok = r.Parsed && r.Present && r.Grounded && r.FitOk && r.NoForbidden && r.IncompleteOk;
        const failed = [!r.Parsed && "answer not readable", !r.Grounded && "a claim without a quote", !r.FitOk && "fit not sensible", !r.NoForbidden && "invented a skill", !r.IncompleteOk && "missing information not shown"].filter(Boolean);
        return { name: r.Candidate, fit: r.Fit, expected_fit: [], forbidden_claims: [], passed: ok, note: ok ? "All checks held." : `Failed: ${failed.join(", ")}.` };
      });
      return {
        version: v, batches: batches.length, passed: candidates.filter((c) => c.passed).length, total: candidates.length,
        latency_ms: perBatch((r) => r.LatencyMs ?? 0), input_tokens: perBatch((r) => r.InputTokens ?? 0), output_tokens: perBatch((r) => r.OutputTokens ?? 0),
        candidates, warnings: [], errors: mine.filter((r) => r.Error).map((r) => `${r.Candidate}: ${r.Error}`),
      };
    }),
  };
}

// The Day 3 step names, in the order the lab runs them (the same names as the recorded file).
export const DAY3_STEPS: [string, string][] = [
  ["create", "Create a task (title, due date, high priority) from one sentence"],
  ["list", "List my tasks: the new task is there"],
  ["update", "Mark the task done, found by its title"],
  ["delete asks first", "Ask to delete: a confirmation question comes back and the task is still there"],
  ["cancel keeps it", "Say no: the task is still there"],
  ["confirm deletes", "Ask to delete again and say yes: the task is gone"],
];

function day3(): Day3Result[] {
  const runs = (day3Raw as { runs: D3Run[] }).runs;
  return runs.map((r) => ({
    day: 3, model: "qwen2.5:3b", title: `Recorded run ${r.run}`,
    steps: DAY3_STEPS.filter(([k]) => r.steps[k]).map(([k]) => ({ name: k, pass: r.steps[k].pass, note: r.steps[k].note, ms: r.steps[k].ms })),
  }));
}

const LOCAL = "Recorded run: local model qwen2.5:3b";

export const RECORDED = {
  1: { label: `${LOCAL} (with qwen2.5:1.5b as the second model)`, date: "2026-11-16", note: "All 20 fixed questions, run by the Evals tool on a PC with Ollama.", result: day1() } as Recorded<Day1Result>,
  2: { label: LOCAL, date: "2026-11-16 (v1 to v4) and 2026-11-18 (v5 to v7)", note: "The same job description and 8 candidates for every prompt version, run by the Evals tool on a PC with Ollama.", result: day2() } as Recorded<Day2Result>,
  3: { label: LOCAL, date: "2026-11-19", note: "The real task assistant through the real API, checked on the database, five times.", runs: day3() },
};
