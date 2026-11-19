import { API_URL, ApiError, apiJson } from "./api";

export { API_URL, ApiError };

export type Candidate = { name: string; profile: string };
export type Analysis = {
  prompt_version: string; model: string; latency_ms: number; input_tokens: number; output_tokens: number;
  required_skills: string[]; warnings: string[];
  candidates: {
    id: number; name: string; summary: string; fit: string; gaps: string[]; not_stated: string[]; reasoning?: string; clarifying_questions?: string[]; instructions_found?: boolean;
    matched_skills: { skill: string; evidence: string }[];
    check: { matched: string[]; missing: string[]; score: number };
  }[];
};
export type Usage = { configured: boolean; model: string | null; daily_cap: number; used_today: number; prompt_versions: string[]; using_own_key?: boolean };
export type GeminiModels = { models: string[]; suggested: string | null };

/** Asks Google (through our server) which models this key can use. Also proves the key works. The key is not stored on the way. */
export const getModels = (key: string) => apiJson<GeminiModels>("GET", "/api/assistant/models", undefined, { "X-Gemini-Key": key.trim() });
export const getUsage = () => apiJson<Usage>("GET", "/api/assistant/usage");
export const analyze = (job_description: string, candidates: Candidate[], prompt_version: string) =>
  apiJson<Analysis>("POST", "/api/assistant/analyze", { job_description, candidates, prompt_version });
