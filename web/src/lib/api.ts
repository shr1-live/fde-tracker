import { supabase } from "./supabase";
import { devToken } from "./devPersona";
import { ownKeyHeaders, usesModel } from "./llmKey";

// Address of the backend API (Render). Not a secret. Without it, pages that need the API say they are not connected.
export const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  /** kind / retryable / retryAfter come from the server's error body when it sends them (for example a 429 from Google). */
  constructor(public status: number, message: string, public kind?: string, public retryable?: boolean, public retryAfter?: number) { super(message); }
}

/**
 * ownKey: false sends an assistant request WITHOUT the person's Gemini key, so the server uses its own model.
 * signal: lets a long run be stopped. Non-assistant paths never carry the key whatever is passed here.
 */
export type CallOptions = { ownKey?: boolean; signal?: AbortSignal };

const SIGN_IN = "Sign in with your office account to use this.";

/** The sign-in token for the API: the Supabase session, or (dev builds only) a test account's token. */
async function bearer(): Promise<string> {
  const dev = devToken(); // null on the live site; in dev builds an active test account is used first
  if (dev) return dev;
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const t = data.session?.access_token;
    if (t) return t;
  }
  throw new ApiError(401, SIGN_IN);
}

async function send(method: string, path: string, body?: BodyInit, json = false, extra?: Record<string, string>, opts?: CallOptions): Promise<Response> {
  const token = await bearer();
  // The person's own Gemini key goes only on assistant requests; every other request never carries it.
  // With ownKey: false the stored key is left off, so the request goes to the server's own model.
  const own = usesModel(path) ? { ...(opts?.ownKey === false ? {} : ownKeyHeaders()), ...extra } : {};
  try {
    return await fetch(API_URL + path, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...own, ...(json ? { "Content-Type": "application/json" } : {}) },
      body,
      signal: opts?.signal,
    });
  } catch {
    if (opts?.signal?.aborted) throw new ApiError(0, "Stopped.", "stopped");
    throw new ApiError(0, "Could not reach the service. If it was idle it may need about 30 seconds to wake up; try again.");
  }
}

async function failure(res: Response): Promise<ApiError> {
  const body = await res.json().catch(() => null);
  const header = Number(res.headers.get("Retry-After"));
  const after = typeof body?.retry_after_seconds === "number" ? body.retry_after_seconds : Number.isFinite(header) && header > 0 ? header : undefined;
  return new ApiError(res.status, typeof body?.error === "string" ? body.error : "Something went wrong. Try again.",
    typeof body?.kind === "string" ? body.kind : undefined, typeof body?.retryable === "boolean" ? body.retryable : undefined, after);
}

export async function apiJson<T>(method: "GET" | "POST" | "PUT" | "DELETE", path: string, payload?: unknown, extra?: Record<string, string>, opts?: CallOptions): Promise<T> {
  const res = await send(method, path, payload === undefined ? undefined : JSON.stringify(payload), payload !== undefined, extra, opts);
  if (!res.ok) throw await failure(res);
  if (res.status === 204 || res.headers.get("Content-Length") === "0") return undefined as T; // e.g. DELETE answers with no body
  return (await res.json()) as T;
}

export async function apiForm<T>(path: string, form: FormData): Promise<T> {
  const res = await send("POST", path, form); // the browser sets the multipart boundary itself
  if (!res.ok) throw await failure(res);
  return (await res.json()) as T;
}

/** A file, fetched with the sign-in token (an <img> or link cannot send one). */
export async function apiBlob(path: string): Promise<Blob> {
  const res = await send("GET", path);
  if (!res.ok) throw await failure(res);
  return res.blob();
}
