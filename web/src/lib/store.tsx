import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { supabase, isOfficeEmail, ALLOWED_DOMAIN, ADMIN_EMAIL } from "./supabase";
import { PROGRAMME, dayKey } from "../data/programme";

export type TeamRow = { display_name: string | null; stack: string; pct: number; updated_at: string };
type User = { id: string; email: string };
type Profile = { display_name: string; stack: string };
type Entries = Record<string, unknown>;
export type Access = "approved" | "pending" | "rejected" | "error";
type Ctx = {
  mode: "supabase" | "local"; access: Access; isAdmin: boolean; recheck: () => void; ready: boolean; user: User | null; entries: Entries; profile: Profile; pct: number; saveError: string;
  setEntry: (k: string, v: unknown) => void; setProfile: (p: Partial<Profile>) => void;
  guestSignIn: () => void; signIn: (email: string) => Promise<string>; signInPassword: (email: string, password: string) => Promise<string>; localSignIn: (email: string) => string; signOut: () => Promise<void>;
  team: () => Promise<TeamRow[]>;
};
const C = createContext<Ctx>(null as unknown as Ctx);
export const useStore = () => useContext(C);
const LOCAL = "fde:local:";
const GUEST = "guest"; // local-only visitor: nothing is sent to the database
const nameFrom = (email: string) => email.split("@")[0].split(/[._-]/).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");

export function StoreProvider({ children }: { children: ReactNode }) {
  const mode: "supabase" | "local" = supabase ? "supabase" : "local";
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<Entries>({});
  const [profile, setProf] = useState<Profile>({ display_name: "", stack: "dotnet" });
  const [saveError, setSaveError] = useState("");
  const [access, setAccess] = useState<Access>("approved");
  // Admin pages can be previewed in local mode only in a development build started with VITE_DEV_ADMIN=1; production builds drop this branch.
  const devAdmin = import.meta.env.DEV && import.meta.env.VITE_DEV_ADMIN === "1";
  const isAdmin = (mode === "supabase" || devAdmin) && user?.email.toLowerCase() === ADMIN_EMAIL;
  const pending = useRef<Record<string, unknown>>({});
  const timer = useRef<number | undefined>(undefined);

  // Progress = points ticked across the programme weeks (the Excel programme: weeks of five working days).
  const pct = useMemo(() => {
    let done = 0, total = 0;
    for (const w of PROGRAMME) for (const d of w.days) {
      total += d.done.length;
      const f = entries[dayKey(w.n, d.n)];
      if (Array.isArray(f)) done += f.slice(0, d.done.length).filter((v) => v === true).length;
    }
    return total ? Math.round((done / total) * 100) : 0;
  }, [entries]);

  const loadFor = useCallback(async (u: User) => {
    setUser(u);
    if (supabase && u.id !== GUEST) {
      const { data: st, error: aerr } = await supabase.rpc("request_access");
      if (aerr) { setAccess("error"); setSaveError(""); setReady(true); return; }
      if (st === "new_pending") {
        const { data: ses } = await supabase.auth.getSession();
        if (ses.session) fetch("/api/notify-admin", { method: "POST", headers: { Authorization: `Bearer ${ses.session.access_token}` } }).catch(() => {});
      }
      const acc: Access = st === "approved" ? "approved" : st === "rejected" ? "rejected" : "pending";
      setAccess(acc);
      if (acc !== "approved") { setEntries({}); setReady(true); return; }
      const [e, p] = await Promise.all([
        supabase.from("entries").select("key,value").eq("user_id", u.id),
        supabase.from("profiles").select("display_name,stack").eq("user_id", u.id).maybeSingle(),
      ]);
      const map: Entries = {};
      (e.data ?? []).forEach((r: { key: string; value: unknown }) => (map[r.key] = r.value));
      let stack = p.data?.stack || "dotnet";
      // One-time import: progress saved in this browser before the database was connected (or as a guest) moves into the account.
      const flag = "fde:imported:" + u.id;
      if (!e.error && Object.keys(map).length === 0 && !localStorage.getItem(flag)) {
        try {
          const read = (k: string) => JSON.parse(localStorage.getItem(LOCAL + k) || "{}");
          const own = read(u.email); const guest = u.email.toLowerCase() === ADMIN_EMAIL ? read(GUEST) : {};
          const merged: Entries = { ...(guest.entries ?? {}), ...(own.entries ?? {}) };
          const keys = Object.keys(merged).filter((k) => /^[a-zA-Z0-9:_-]{1,40}$/.test(k));
          if (keys.length) {
            const now = new Date().toISOString();
            const { error } = await supabase.from("entries").upsert(keys.map((key) => ({ user_id: u.id, key, value: merged[key], updated_at: now })));
            if (!error) { keys.forEach((k) => (map[k] = merged[k])); stack = own.profile?.stack || guest.profile?.stack || stack; localStorage.setItem(flag, "1"); }
          } else localStorage.setItem(flag, "1");
        } catch { /* nothing to import */ }
      }
      setEntries(map);
      setProf({ display_name: p.data?.display_name || nameFrom(u.email), stack });
      if (e.error) setSaveError(e.error.message);
    } else {
      try {
        const raw = JSON.parse(localStorage.getItem(LOCAL + u.email) || "{}");
        setEntries(raw.entries ?? {}); setProf(raw.profile ?? { display_name: nameFrom(u.email), stack: "dotnet" });
      } catch { setEntries({}); setProf({ display_name: nameFrom(u.email), stack: "dotnet" }); }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        const s = data.session;
        if (s?.user?.email && isOfficeEmail(s.user.email)) loadFor({ id: s.user.id, email: s.user.email });
        else if (sessionStorage.getItem("fde:guest")) loadFor({ id: GUEST, email: GUEST });
        else setReady(true);
      });
      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
        if (s?.user?.email && isOfficeEmail(s.user.email)) loadFor({ id: s.user.id, email: s.user.email });
        else if (!s) { setUser(null); setEntries({}); }
      });
      return () => sub.subscription.unsubscribe();
    }
    const last = localStorage.getItem(LOCAL + "last");
    if (last) loadFor({ id: last, email: last }); else setReady(true);
  }, [loadFor]);

  const recheck = useCallback(() => { if (user) void loadFor(user); }, [user, loadFor]);
  // while waiting for approval, check again every 10s so the page opens by itself once approved
  useEffect(() => {
    if (access !== "pending" || !user) return;
    const t = window.setInterval(() => { void loadFor(user); }, 10000);
    return () => window.clearInterval(t);
  }, [access, user, loadFor]);

  const flush = useCallback(async () => {
    if (!user) return;
    const batch = pending.current; pending.current = {};
    const keys = Object.keys(batch);
    if (!keys.length) return;
    if (supabase && user.id !== GUEST) {
      const rows = keys.map((key) => ({ user_id: user.id, key, value: batch[key], updated_at: new Date().toISOString() }));
      const { error } = await supabase.from("entries").upsert(rows);
      setSaveError(error ? error.message : "");
    }
  }, [user]);

  const persistLocal = useCallback((e: Entries, p: Profile) => {
    if (!user || (supabase && user.id !== GUEST)) return;
    try { localStorage.setItem(LOCAL + user.email, JSON.stringify({ entries: e, profile: p })); } catch { /* storage unavailable */ }
  }, [user]);

  const setEntry = useCallback((k: string, v: unknown) => {
    setEntries((prev) => { const n = { ...prev, [k]: v }; persistLocal(n, profile); return n; });
    pending.current[k] = v;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 600);
  }, [flush, persistLocal, profile]);

  const setProfile = useCallback((p: Partial<Profile>) => {
    setProf((prev) => { const n = { ...prev, ...p }; persistLocal(entries, n); return n; });
  }, [entries, persistLocal]);

  // keep the team board row current
  useEffect(() => {
    if (!supabase || !user || user.id === GUEST || !ready || access !== "approved") return;
    const t = window.setTimeout(async () => {
      const { error } = await supabase!.from("profiles").upsert({ user_id: user.id, email: user.email, display_name: profile.display_name, stack: profile.stack, pct, updated_at: new Date().toISOString() });
      if (error) setSaveError(error.message);
    }, 1200);
    return () => window.clearTimeout(t);
  }, [pct, profile, user, ready, access]);

  const signIn = useCallback(async (email: string) => {
    if (!supabase) return "Supabase is not configured for this deployment.";
    if (!isOfficeEmail(email)) return `Use your @${ALLOWED_DOMAIN} email address.`;
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { emailRedirectTo: window.location.origin } });
    return error ? error.message : "";
  }, []);
  const signInPassword = useCallback(async (email: string, password: string) => {
    if (!supabase) return "Password sign-in needs the database connected.";
    if (!isOfficeEmail(email)) return `Use your @${ALLOWED_DOMAIN} email address.`;
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    return error ? "Wrong email or password, or no password has been set for this account." : "";
  }, []);
  const guestSignIn = useCallback(() => {
    try { sessionStorage.setItem("fde:guest", "1"); } catch { /* ignore */ }
    setAccess("approved"); void loadFor({ id: GUEST, email: GUEST });
  }, [loadFor]);
  const localSignIn = useCallback((email: string) => {
    if (!isOfficeEmail(email)) return `Use your @${ALLOWED_DOMAIN} email address.`;
    const e = email.trim().toLowerCase();
    try { localStorage.setItem(LOCAL + "last", e); } catch { /* ignore */ }
    loadFor({ id: e, email: e }); return "";
  }, [loadFor]);
  const signOut = useCallback(async () => {
    try { sessionStorage.removeItem("fde:guest"); } catch { /* ignore */ }
    if (supabase && user?.id !== GUEST) await supabase.auth.signOut(); else { try { localStorage.removeItem(LOCAL + "last"); } catch { /* ignore */ } }
    setUser(null); setEntries({});
  }, [user]);
  const team = useCallback(async (): Promise<TeamRow[]> => {
    if (!supabase) return user ? [{ display_name: profile.display_name, stack: profile.stack, pct, updated_at: new Date().toISOString() }] : [];
    const { data } = await supabase.from("profiles").select("display_name,stack,pct,updated_at").order("pct", { ascending: false });
    return (data as TeamRow[]) ?? [];
  }, [user, profile, pct]);

  const value: Ctx = { mode, access, isAdmin, recheck, ready, user, entries, profile, pct, saveError, setEntry, setProfile, signIn, signInPassword, guestSignIn, localSignIn, signOut, team };
  return <C.Provider value={value}>{children}</C.Provider>;
}
