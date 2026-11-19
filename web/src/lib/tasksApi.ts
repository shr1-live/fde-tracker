import { CallOptions, apiJson } from "./api";

export type Task = { id: string; title: string; due_date: string | null; priority: "low" | "medium" | "high"; status: "open" | "done"; notes: string | null };
export type Action = { tool: string; outcome: string; summary: string };
export type Pending = { id: string; tool: string; summary: string; expires_at: string };
export type Reply = { reply: string; actions: Action[]; pending: Pending | null };
export type ToolCall = { tool: string; arguments: string | null; outcome: string; detail: string | null; latency_ms: number | null; created_at: string };

// extra / opts are optional: the Practice lab uses them to choose the model (server model or a given Gemini model) and to stop a run.
type Extra = Record<string, string> | undefined;
export const send = (message: string, extra?: Extra, opts?: CallOptions) => apiJson<Reply>("POST", "/api/task-assistant/message", { message }, extra, opts);
export const confirm = (id: string, approve: boolean, extra?: Extra, opts?: CallOptions) => apiJson<Reply>("POST", `/api/task-assistant/confirm/${id}`, { approve }, extra, opts);
export const tasks = (opts?: CallOptions) => apiJson<Task[]>("GET", "/api/task-assistant/tasks", undefined, undefined, opts);
export const log = () => apiJson<ToolCall[]>("GET", "/api/task-assistant/log");
