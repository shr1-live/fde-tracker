import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Route, Routes, matchPath, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "./lib/store";
import { API_URL } from "./lib/api";
import { useMe, type Me } from "./lib/useRole";
import { ROLE_LABEL } from "./lib/v3";
import { clearUnsaved, hasUnsaved } from "./lib/unsaved";
import Gate from "./pages/Gate";
import ThemeSwitch from "./components/ThemeSwitch";
import { Icon } from "./components/Icon";
import { Avatar } from "./components/Avatar";
import { DevPersonaBar } from "./components/DevPersonaBar";
import { useConfirm } from "./components/Confirm";
import { PageSkeleton } from "./components/States";
import { BrandMark } from "./components/BrandMark";
import { useDevPersona } from "./lib/devPersona";

// Every page is its own chunk, so the first load only carries the shell.
const Landing = lazy(() => import("./pages/Landing"));
const Feed = lazy(() => import("./pages/Feed"));
const PostPage = lazy(() => import("./pages/Post"));
const Plan = lazy(() => import("./pages/Plan"));
const DailyStatus = lazy(() => import("./pages/DailyStatus"));
const ProgramStatus = lazy(() => import("./pages/ProgramStatus"));
const Reports = lazy(() => import("./pages/Reports"));
const Manage = lazy(() => import("./pages/Manage"));
const Programs = lazy(() => import("./pages/Programs"));
const NotFound = lazy(() => import("./pages/NotFound"));

type Prog = NonNullable<Me["programs"]>[number];
const LAST = "fde:program";
const PAGES: [string, string][] = [["", "Plan"], ["daily", "Daily status"], ["status", "Program status"], ["reports", "Reports"], ["manage", "Manage"]];

function useIsPhone() {
  const q = "(max-width: 899px)";
  const [phone, setPhone] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setPhone(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return phone;
}

function Centered({ children }: { children: ReactNode }) {
  return <main className="center-page" id="main"><div className="center-card card">{children}</div></main>;
}

function Brand() {
  return <Link to="/" className="brand"><BrandMark />FDE Tracker</Link>;
}

/** The current program, with a list to switch to another one. */
function ProgramSwitcher({ programs, current }: { programs: Prog[]; current: Prog }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("mousedown", away); document.addEventListener("keydown", esc);
    box.current?.querySelector<HTMLAnchorElement>(".switch-list a")?.focus();
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  const face = (
    <>
      <span className="ps-tile" aria-hidden="true">{current.name.charAt(0)}</span>
      <span className="ps-text"><span className="ps-name">{current.name}</span><span className="ps-role">{ROLE_LABEL[current.role]}</span></span>
    </>
  );
  if (programs.length < 2) return <div className="switcher single">{face}</div>;
  return (
    <div className="switcher-wrap" ref={box}>
      <button ref={btn} type="button" className="switcher" aria-expanded={open} aria-controls="program-list" onClick={() => setOpen((o) => !o)}>
        <span className="sr">Switch program. Current: </span>{face}<Icon name="updown" size={16} />
      </button>
      {open && (
        <div id="program-list" className="switch-list">
          <p className="overline">Your programs</p>
          {programs.map((p) => (
            <Link key={p.id} to={`/p/${p.id}`} aria-current={p.id === current.id ? "true" : undefined} onClick={() => setOpen(false)}>
              <span className="ps-tile sm" aria-hidden="true">{p.name.charAt(0)}</span><span className="grow">{p.name}</span><span className="ps-role">{ROLE_LABEL[p.role]}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function crumbs(path: string, programs: Prog[]): string[] {
  if (path === "/") return ["Feed"];
  if (path.startsWith("/post/")) return ["Feed", "Post"];
  if (path === "/programs") return ["Programs"];
  const m = matchPath("/p/:pid/*", path);
  if (m) {
    const p = programs.find((x) => x.id === m.params.pid);
    const sub = (m.params["*"] ?? "").split("/")[0] ?? "";
    return [p?.name ?? "Program", PAGES.find(([k]) => k === sub)?.[1] ?? "Page not found"];
  }
  return ["Page not found"];
}

function Shell({ me }: { me: Me }) {
  const { user, signOut } = useStore();
  const persona = useDevPersona();
  const loc = useLocation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const phone = useIsPhone();
  const [open, setOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const burger = useRef<HTMLButtonElement>(null);
  const side = useRef<HTMLElement>(null);
  const lastPath = useRef(loc.pathname);
  const progs = me.programs ?? [];
  const isAdmin = me.role === "admin";

  const urlPid = matchPath("/p/:pid/*", loc.pathname)?.params.pid;
  const stored = (() => { try { return localStorage.getItem(LAST); } catch { return null; } })();
  const current = progs.find((p) => p.id === urlPid) ?? progs.find((p) => p.id === stored) ?? progs[0];
  useEffect(() => { if (current) { try { localStorage.setItem(LAST, current.id); } catch { /* ignore */ } } }, [current]);

  // A new page: close the drawer, go to the top and move focus to the page so screen readers announce it.
  useEffect(() => {
    setOpen(false);
    if (lastPath.current === loc.pathname) return;
    lastPath.current = loc.pathname;
    if (!loc.hash) window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [loc.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (side.current) side.current.inert = phone && !open; }, [phone, open]);
  // The drawer on phones: focus goes in, Esc closes, the page behind is inert.
  useEffect(() => {
    const col = mainRef.current?.parentElement;
    if (col) col.inert = phone && open;
    if (!phone || !open) return;
    side.current?.querySelector<HTMLElement>("nav a")?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); burger.current?.focus(); } };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open, phone]);

  // Unsaved changes: ask before following a link inside the app.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!hasUnsaved() || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target || a.origin !== window.location.origin || a.pathname === window.location.pathname) return;
      e.preventDefault(); e.stopPropagation();
      const to = a.pathname + a.search + a.hash;
      void confirm({ title: "Leave without saving?", body: "You have changes on this page that are not saved yet. If you leave now, they are lost.", confirm: "Leave page", cancel: "Stay on this page", danger: true })
        .then((ok) => { if (ok) { clearUnsaved(); navigate(to); } });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [confirm, navigate]);

  const closeDrawer = () => { setOpen(false); burger.current?.focus(); };
  const trail = crumbs(loc.pathname, progs);
  const name = me.display_name || user?.email.split("@")[0] || "You";
  const base = current ? `/p/${current.id}` : "";

  return (
    <div className={"app" + (open ? " drawer-open" : "")}>
      <a href="#main" className="skip" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>Skip to content</a>
      <aside ref={side} className="sidebar" aria-label="Sidebar">
        <div className="side-top">
          <Brand />
          {phone && <button type="button" className="iconbtn" aria-label="Close the menu" onClick={closeDrawer}><Icon name="x" /></button>}
        </div>
        {current && <ProgramSwitcher programs={progs} current={current} />}
        <nav aria-label="Main" className="nav">
          <NavLink to="/" end><Icon name="rss" />Feed</NavLink>
          {isAdmin && <NavLink to="/programs"><Icon name="shield" />Programs</NavLink>}
          {current && (
            <div className="nav-group" role="group" aria-label={current.name}>
              <p className="overline" aria-hidden="true">{current.name}</p>
              <NavLink to={base} end><Icon name="book" />Plan</NavLink>
              <NavLink to={`${base}/daily`}><Icon name="calendar" />Daily status</NavLink>
              <NavLink to={`${base}/status`}><Icon name="tasks" />Program status</NavLink>
              <NavLink to={`${base}/reports`}><Icon name="chart" />Reports</NavLink>
              {current.role !== "member" && <NavLink to={`${base}/manage`}><Icon name="user" />Manage and invite</NavLink>}
            </div>
          )}
          {progs.length === 0 && <p className="nav-note">You are not in a program yet. The admin or a coordinator adds you.</p>}
        </nav>
        <div className="side-foot">
          <DevPersonaBar />
          <ThemeSwitch />
          <div className="account">
            <Avatar name={name} size="sm" />
            <div className="account-text"><span className="account-name">{name}{isAdmin && <span className="badge">Admin</span>}</span><span className="account-mail" title={user?.email}>{user?.email}</span></div>
            <button type="button" className="iconbtn" aria-label="Sign out" title="Sign out" onClick={signOut}><Icon name="logout" size={16} /></button>
          </div>
        </div>
      </aside>
      {phone && open && <div className="scrim" onClick={closeDrawer} aria-hidden="true" />}
      <div className="main-col">
        <header className="topbar">
          {phone && <button ref={burger} type="button" className="iconbtn" aria-label="Open the menu" aria-expanded={open} onClick={() => setOpen(true)}><Icon name="menu" /></button>}
          <nav aria-label="Breadcrumb" className="crumbs">
            <ol>{trail.map((c, i) => <li key={i} aria-current={i === trail.length - 1 ? "page" : undefined}>{c}</li>)}</ol>
          </nav>
        </header>
        <main ref={mainRef} id="main" className="main" tabIndex={-1}>
          <Suspense fallback={<div className="content"><PageSkeleton /></div>}>
            <Routes key={persona}>
              <Route path="/" element={<Feed />} />
              <Route path="/post/:id" element={<PostPage />} />
              <Route path="/programs" element={<Programs />} />
              <Route path="/p/:pid" element={<Plan />} />
              <Route path="/p/:pid/daily" element={<DailyStatus />} />
              <Route path="/p/:pid/status" element={<ProgramStatus />} />
              <Route path="/p/:pid/reports" element={<Reports />} />
              <Route path="/p/:pid/manage" element={<Manage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { ready, user, signOut } = useStore();
  const { me, ready: meReady } = useMe();
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    const on = () => setExpired(true);
    window.addEventListener("fde:session-expired", on);
    return () => window.removeEventListener("fde:session-expired", on);
  }, []);
  useEffect(() => { setExpired(false); }, [user?.email]);
  const loading = (t: string) => <Centered><p className="muted" role="status">{t}</p></Centered>;
  if (!ready) return loading("Loading");
  if (!user) return <Suspense fallback={loading("Loading")}><Landing /></Suspense>;
  if (expired) {
    return (
      <Centered>
        <span className="center-icon" aria-hidden="true"><Icon name="clock" size={22} /></span>
        <h1>Your session has expired</h1>
        <p className="muted">You were signed out after a while, to keep your account safe. Sign in again to carry on; everything you saved is kept.</p>
        <div className="row center"><button type="button" className="btn" onClick={() => { setExpired(false); void signOut(); }}>Sign in again</button></div>
      </Centered>
    );
  }
  if (!API_URL) return <Centered><h1>Not connected</h1><p className="muted">This site is not connected to its server yet.</p></Centered>;
  if (!meReady) return loading("Checking your access");
  // Invite-only: the server decides who gets in.
  if (!me) return <Gate reason="error" />;
  if (me.access !== "approved") return <Gate reason={me.access === "rejected" ? "rejected" : "pending"} />;
  return <Shell me={me} />;
}
