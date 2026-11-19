// Practice lab: run the Week 1 Day 1, 2 and 3 practicals from the browser on the server's model or on the person's own Gemini key.
// Model calls go through /api/assistant/... (they may carry the key); saved runs go through /api/lab/... (never carry the key).
import { ApiError, CallOptions, apiJson } from "./api";
import type { Usage } from "./assistantApi";
import { getOwnKey } from "./llmKey";
import * as tasksApi from "./tasksApi";

/** Which model a lab call goes to. "server" never sends the key; "gemini" sends the stored key with the chosen Gemini model. */
export type ModelChoice = { source: "server" } | { source: "gemini"; model: string };

/** Headers and options for one call with this model choice. */
export function route(choice: ModelChoice, signal?: AbortSignal): { extra?: Record<string, string>; opts: CallOptions } {
  if (choice.source === "server") return { opts: { ownKey: false, signal } };
  const own = getOwnKey(); // read at call time: removing the key stops the next call from using it
  if (!own) throw new ApiError(0, "Your Gemini key is not set in this browser. Add it at the top of the page.", "no_key");
  return { extra: { "X-Gemini-Key": own.key, "X-Gemini-Model": choice.model }, opts: { ownKey: true, signal } };
}

/** The server's own model, asked WITHOUT the key so the answer is about the server, not about the person's key. */
export const serverUsage = () => apiJson<Usage>("GET", "/api/assistant/usage", undefined, undefined, { ownKey: false });

// ---- Day 1: fixed questions, two models ----
export type Day1Case = { id: string; kind: string; prompt: string };
export type Day1Answer = { case_id: string; kind: string; model: string; passed: boolean; answer: string; latency_ms: number; input_tokens: number; output_tokens: number };
export const day1Cases = () => apiJson<{ cases: Day1Case[] }>("GET", "/api/assistant/lab/day1/cases", undefined, undefined, { ownKey: false });
export function day1Run(caseId: string, choice: ModelChoice, signal?: AbortSignal) {
  const r = route(choice, signal);
  return apiJson<Day1Answer>("POST", `/api/assistant/lab/day1/${encodeURIComponent(caseId)}`, {}, r.extra, r.opts);
}

// ---- Day 2: prompt versions on the same candidates ----
export type Day2Candidate = { name: string; fit: string; expected_fit: string[]; forbidden_claims: string[]; passed: boolean; note: string };
export type Day2Batch = {
  version: string; model: string; batch: number; batches: number; latency_ms: number; input_tokens: number; output_tokens: number;
  candidates: Day2Candidate[]; passed: number; total: number; warnings: string[];
};
export function day2Run(version: string, batch: number, choice: ModelChoice, signal?: AbortSignal) {
  const r = route(choice, signal);
  return apiJson<Day2Batch>("POST", `/api/assistant/lab/day2/${encodeURIComponent(version)}?batch=${batch}`, {}, r.extra, r.opts);
}

// ---- Day 3: the real task assistant ----
export const day3 = {
  send: (message: string, choice: ModelChoice, signal?: AbortSignal) => { const r = route(choice, signal); return tasksApi.send(message, r.extra, r.opts); },
  confirm: (id: string, approve: boolean, choice: ModelChoice, signal?: AbortSignal) => { const r = route(choice, signal); return tasksApi.confirm(id, approve, r.extra, r.opts); },
  tasks: (signal?: AbortSignal) => tasksApi.tasks({ ownKey: false, signal }),
};

// ---- Results, in one shape for live runs, recorded runs and saved runs ----
export type Cell = { passed: boolean; answer: string; latency_ms: number; input_tokens: number; output_tokens: number; error?: string };
export type Day1Result = { day: 1; models: string[]; rows: { id: string; kind: string; prompt?: string; cells: (Cell | null)[] }[]; ran_at?: string; stopped?: boolean };
export type Day2Version = {
  version: string; batches: number; passed: number; total: number; latency_ms: number; input_tokens: number; output_tokens: number;
  candidates: Day2Candidate[]; warnings: string[]; errors: string[];
};
export type Day2Result = { day: 2; model: string; versions: Day2Version[]; ran_at?: string; stopped?: boolean; scoring?: string };
export type Day3Step = { name: string; pass: boolean; note: string; ms: number };
export type Day3Result = { day: 3; model: string; title: string; steps: Day3Step[]; ran_at?: string; stopped?: boolean; leftover?: boolean };
export type LabResult = Day1Result | Day2Result | Day3Result;

export type SavedRun = { id: string; day: number; label: string; models: string[]; result: LabResult; created_at: string; is_sample: boolean };

export const saveRun = (day: number, label: string, models: string[], result: LabResult) =>
  apiJson<SavedRun>("POST", "/api/lab/runs", { day, label, models, result });
export const myRuns = () => apiJson<{ runs: SavedRun[] }>("GET", "/api/lab/runs/mine");
export const deleteRun = (id: string) => apiJson<unknown>("DELETE", `/api/lab/runs/${encodeURIComponent(id)}`);
export const samples = () => apiJson<{ samples: SavedRun[] }>("GET", "/api/lab/samples");
export const pin = (id: string) => apiJson<unknown>("POST", `/api/lab/runs/${encodeURIComponent(id)}/pin`);
export const unpin = (id: string) => apiJson<unknown>("DELETE", `/api/lab/runs/${encodeURIComponent(id)}/pin`);

/** A saved result is only drawn when it has the shape of its day; anything else is skipped rather than crashing the page. */
export function isResult(v: unknown, day: number): v is LabResult {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  if (r.day !== day) return false;
  if (day === 1) return Array.isArray(r.models) && Array.isArray(r.rows);
  if (day === 2) return typeof r.model === "string" && Array.isArray(r.versions);
  return typeof r.model === "string" && Array.isArray(r.steps);
}

/** Saves a run as a JSON file the person can attach as proof. */
export function downloadJson(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const errorText = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong.");
