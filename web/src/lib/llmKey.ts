// A person's own Gemini key, kept in THEIR browser only.
// By default it lives in this tab (sessionStorage) and is gone when the tab closes; "remember" keeps it in this browser (localStorage).
// It is sent to our server only on assistant requests (see ownKeyHeaders), where it is used for that one request and never stored.
import { useEffect, useState } from "react";

const KEY = "fde:gemini";
const EVENT = "fde:gemini-changed";

export type OwnKey = { key: string; model: string; remember: boolean };

/** Google API keys come as the classic "AIza..." or the newer "AQ...." (letters, digits, "_", "-", "."). The server checks the same shapes. */
export const isGeminiKeyShape = (s: string) => /^(AIza[0-9A-Za-z_-]{30,60}|AQ\.[0-9A-Za-z_.-]{20,300})$/.test(s.trim());

function read(store: Storage | undefined): { key: string; model: string } | null {
  try {
    const raw = store?.getItem(KEY);
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v.key === "string" && isGeminiKeyShape(v.key) ? { key: v.key, model: typeof v.model === "string" ? v.model : "" } : null;
  } catch { return null; }
}

const safe = (f: () => Storage) => { try { return f(); } catch { return undefined; } };

export function getOwnKey(): OwnKey | null {
  const s = read(safe(() => sessionStorage));
  if (s) return { ...s, remember: false };
  const l = read(safe(() => localStorage));
  return l ? { ...l, remember: true } : null;
}

export function setOwnKey(key: string, model: string, remember: boolean): void {
  const value = JSON.stringify({ key: key.trim(), model: model.trim() });
  try {
    sessionStorage.removeItem(KEY); localStorage.removeItem(KEY);
    (remember ? localStorage : sessionStorage).setItem(KEY, value);
  } catch { /* storage unavailable: the key then lasts only until the page is reloaded */ }
  window.dispatchEvent(new Event(EVENT));
}

export function clearOwnKey(): void {
  try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVENT));
}

/** The headers that carry the key. Empty when the person has not chosen to use their own key, or has not picked a model yet. */
export function ownKeyHeaders(): Record<string, string> {
  const k = getOwnKey();
  return k && k.model ? { "X-Gemini-Key": k.key, "X-Gemini-Model": k.model } : {};
}

/** Only assistant requests carry the key; no other request ever sees it. */
export const usesModel = (path: string) => path.startsWith("/api/assistant") || path.startsWith("/api/task-assistant");

export function useOwnKey(): OwnKey | null {
  const [k, setK] = useState(getOwnKey);
  useEffect(() => {
    const on = () => setK(getOwnKey());
    window.addEventListener(EVENT, on);
    window.addEventListener("storage", on);
    return () => { window.removeEventListener(EVENT, on); window.removeEventListener("storage", on); };
  }, []);
  return k;
}

/** "AIza…wxyz": enough to recognise, not enough to use. */
export const maskKey = (key: string) => `${key.slice(0, 4)}…${key.slice(-4)}`;
