import { useState } from "react";
import { NavLink, Route, Routes, Navigate } from "react-router-dom";
import { useStore } from "./lib/store";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Feed from "./pages/Feed";
import ProgressPage from "./pages/Progress";
import { setView, useView } from "./lib/viewAs";
import { API_URL } from "./lib/api";
import Outline from "./pages/Outline";
import WeekPlan from "./pages/WeekPlan";
import Assistant from "./pages/Assistant";
import Week1Report from "./pages/Week1Report";
import Readiness from "./pages/Readiness";
import StackGuide from "./pages/StackGuide";
import Admin from "./pages/Admin";
import MyPlan from "./pages/MyPlan";
import Gate from "./pages/Gate";
import Docs from "./pages/Docs";
import BackButton from "./components/BackButton";
import ThemeSwitch from "./components/ThemeSwitch";
import { Icon, IconName } from "./components/Icon";
import { Progress } from "./components/Progress";
import Review from "./pages/Review";
import TaskAssistant from "./pages/TaskAssistant";
import Lab from "./pages/Lab";
import Backlog from "./pages/Backlog";
import StudyNotes from "./pages/StudyNotes";
import { WorkProvider, useWork } from "./lib/work";
import { NotificationBell } from "./components/NotificationBell";
import { PROGRAMME } from "./data/programme";
import { DevPersonaBar } from "./components/DevPersonaBar";
import { useDevPersona } from "./lib/devPersona";
import { canReview, useMe } from "./lib/useRole";

const ADMIN_ONLY = new Set<string>(); // nothing in the menu is admin-only now; the Admin page is added separately
const NAV: [string, string][] = [["/", "Dashboard"], ["/myplan", "My plan"], ["/outline", "Six-week programme"], ...PROGRAMME.map((w): [string, string] => [`/week/${w.n}`, `Week ${w.n} tasks`]), ["/backlog", "Backlog"], ["/notes", "Study notes"], ["/feed", "Feed"], ["/assistant", "Assistant"], ["/task-assistant", "Task assistant"], ["/lab", "Practice lab"], ["/report", "Week 1 report"], ["/stack", "Stack guide"], ["/readiness", "Readiness"], ["/docs", "Downloads"]];

const NAV_ICON: Record<string, IconName> = {
  "/": "home", "/feed": "rss", "/progress": "chart", "/backlog": "calendar", "/notes": "book", "/myplan": "user", "/outline": "book", "/assistant": "spark", "/task-assistant": "list", "/lab": "chip", "/report": "chart", "/review": "inbox",
  "/stack": "compass", "/readiness": "target", "/docs": "download", "/admin": "shield",
};

/** The number of missed days, shown next to "Backlog" in the menu (words in the label, number as a hint). */
/** Who the server says you are. When the server cannot confirm the account, say so instead of silently hiding role features. */
function RoleBadge() {
  const { me, ready } = useMe();
  const { batch } = useWork();
  if (!API_URL) return null;
  if (!ready) return null;
  if (!me) return <p className="rolebadge warn" role="status">The server has not confirmed your account, so reviewer and admin features are hidden. Sign out and in again; if it stays, tell the admin.</p>;
  const label = me.role === "admin" ? "Admin" : me.role === "reviewer" ? "Reviewer" : "Learner";
  return <p className="rolebadge">Role: <b>{label}</b>{me.access !== "approved" ? " (waiting for approval)" : ""}{batch ? <><br />Batch: <b>{batch.name}</b></> : null}</p>;
}

/** Reviewers and the admin: switch between what a learner sees and what a reviewer sees. */
function ViewSwitch() {
  const { view, canSwitch } = useView();
  if (!canSwitch) return null;
  return (
    <div className="viewsw" role="group" aria-label="View as">
      <span>View as</span>
      <div className="themesw">
        <button type="button" aria-pressed={view === "learner"} onClick={() => setView("learner")}>Learner</button>
        <button type="button" aria-pressed={view === "reviewer"} onClick={() => setView("reviewer")}>Reviewer</button>
      </div>
    </div>
  );
}

function BacklogCount() {
  const { missed, learner } = useWork();
  if (!learner || missed.length === 0) return null;
  return <span className="navcount" aria-label={`${missed.length} missed`}>{missed.length}</span>;
}

export default function App() {
  const { ready, user, signOut, saveError, pct, access, isAdmin } = useStore();
  const [collapsed, setCollapsed] = useState(() => { try { const v = localStorage.getItem("fde:nav"); return v === null ? window.innerWidth < 900 : v === "1"; } catch { return false; } });
  const persona = useDevPersona(); // empty on the live site
  const { me } = useMe();
  const { reviewerView } = useView();
  const toggle = () => setCollapsed((c) => { try { localStorage.setItem("fde:nav", c ? "0" : "1"); } catch { /* ignore */ } return !c; });
  if (!ready) return <main className="center"><p className="muted">Loading</p></main>;
  if (!user) return <Landing />;
  if (access !== "approved") return <Gate />;
  const adminHere = isAdmin || me?.role === "admin";
  const nav: [string, string][] = adminHere ? [...NAV, ["/admin", "Admin"]] : NAV.filter(([to]) => !ADMIN_ONLY.has(to));
  // Reviewers and admins (as the API says) get the review page. The API enforces this too; the link is only a convenience.
  nav.splice(nav.findIndex(([to]) => to === "/report") + 1, 0, ["/progress", reviewerView ? "Reports" : "My report"]);
  if (reviewerView) nav.splice(nav.findIndex(([to]) => to === "/progress"), 0, ["/review", "Review submissions"]);
  return (
    <WorkProvider>
    <div className={"shell" + (collapsed ? " collapsed" : "")}>
      <aside className="side">
        <div className="side-head">
          <div className="brand"><span className="mark" aria-hidden="true"><i /><i /><i /></span>FDE Tracker</div>
          <button type="button" className="burger" onClick={toggle} aria-expanded={!collapsed} aria-label="Show or hide the side menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
        <nav aria-label="Main">{nav.map(([to, label]) => (<NavLink key={to} to={to} end={to === "/"}><Icon name={NAV_ICON[to] ?? (to.startsWith("/week/") ? "tasks" : "list")} />{label}{to === "/backlog" && <BacklogCount />}</NavLink>))}</nav>
        <div className="who"><DevPersonaBar /><RoleBadge /><ViewSwitch /><ThemeSwitch /><Progress value={pct} label="Overall progress" small /><small>{user.email}</small><button className="linkbtn" onClick={signOut}>Sign out</button></div>
      </aside>
      <main className="main">
        <div className="topbar">
          <button type="button" className="burger" onClick={toggle} aria-expanded={!collapsed} aria-label="Show or hide the side menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <BackButton />
          <div className="topright"><NotificationBell /></div>
        </div>
        {saveError && <p className="banner err" role="alert">Could not save to the database: {saveError}</p>}
        <Routes key={persona}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/plan/*" element={<Navigate to="/" replace />} />
          <Route path="/myplan" element={<MyPlan />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/progress/:id" element={<ProgressPage />} />
          <Route path="/outline" element={<Outline />} />
          <Route path="/week" element={<Navigate to="/week/1" replace />} />
          <Route path="/week/:n" element={<WeekPlan />} />
          <Route path="/backlog" element={<Backlog />} />
          <Route path="/notes" element={<StudyNotes />} />
          <Route path="/notes/:day" element={<StudyNotes />} />
          <Route path="/task-assistant" element={<TaskAssistant />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/lab" element={<Lab />} />
          <Route path="/report" element={<Week1Report />} />
          <Route path="/review" element={<Review />} />
          <Route path="/stack" element={<StackGuide />} />
          <Route path="/curated" element={<Navigate to="/" replace />} />
          <Route path="/readiness" element={<Readiness />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
    </WorkProvider>
  );
}
