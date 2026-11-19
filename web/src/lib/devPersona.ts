// DEV BUILDS ONLY. Lets a developer act as a member, a reviewer or an admin against a local API without Supabase,
// using test tokens. Every function does nothing in a production build (import.meta.env.DEV is false there),
// so no test token can ever be used on the live site.
import { useEffect, useState } from "react";

const PERSONAS = "fde:dev-personas";
const ACTIVE = "fde:dev-persona";
const EVENT = "fde:persona";

export type Personas = Record<string, string>;

/** Reads #personas=name:token,name:token from the address once, stores it, then removes it from the address bar. */
function readHash(): void {
  if (!import.meta.env.DEV) return;
  const m = /personas=([^&]+)/.exec(window.location.hash);
  if (!m) return;
  const map: Personas = {};
  for (const part of decodeURIComponent(m[1]).split(",")) {
    const i = part.indexOf(":");
    if (i > 0) map[part.slice(0, i)] = part.slice(i + 1);
  }
  try {
    localStorage.setItem(PERSONAS, JSON.stringify(map));
    localStorage.setItem(ACTIVE, Object.keys(map)[0] ?? "");
  } catch { /* storage unavailable */ }
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}
readHash();

export function getPersonas(): Personas {
  if (!import.meta.env.DEV) return {};
  try { return JSON.parse(localStorage.getItem(PERSONAS) ?? "{}") as Personas; } catch { return {}; }
}

export function getActive(): string {
  if (!import.meta.env.DEV) return "";
  try { return localStorage.getItem(ACTIVE) ?? ""; } catch { return ""; }
}

export function setActive(name: string): void {
  if (!import.meta.env.DEV) return;
  try { localStorage.setItem(ACTIVE, name); } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVENT));
}

/** The bearer token of the active test account, or null. Always null in production builds. */
export function devToken(): string | null {
  if (!import.meta.env.DEV) return null;
  return getPersonas()[getActive()] ?? null;
}

/** The active test account's name; changes when the developer switches. Empty in production builds. */
export function useDevPersona(): string {
  const [name, setName] = useState(getActive());
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const on = () => setName(getActive());
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return name;
}
