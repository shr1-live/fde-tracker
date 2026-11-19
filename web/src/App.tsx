import { useState } from "react";
import { NavLink, Route, Routes, Navigate } from "react-router-dom";
import { useStore } from "./lib/store";
import { API_URL } from "./lib/api";
import { useMe } from "./lib/useRole";
import { ROLE_LABEL } from "./lib/v3";
import Landing from "./pages/Landing";
import Gate from "./pages/Gate";
import Feed from "./pages/Feed";
import Plan from "./pages/Plan";
import DailyStatus from "./pages/DailyStatus";
import ProgramStatus from "./pages/ProgramStatus";
import Reports from "./pages/Reports";
import Manage from "./pages/Manage";
import Programs from "./pages/Programs";
import ThemeSwitch from "./components/ThemeSwitch";
import { Icon } from "./components/Icon";
import { DevPersonaBar } from "./components/DevPersonaBar";
import { useDevPersona } from "./lib/devPersona";

const Burger = ({ onClick, open }: { onClick: () => void; open: boolean }) => (
  <button type="button" className="burger" onClick={onClick} aria-expanded={open} aria-label="Show or hide the side menu">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
  </button>
);

export default function App() {
  const { ready, user, signOut } = useStore();
  const [collapsed, setCollapsed] = useState(() => { try { const v = localStorage.getItem("fde:nav"); return v === null ? window.innerWidth < 900 : v === "1"; } catch { return false; } });
  const persona = useDevPersona(); // empty on the live site
  const { me, ready: meReady } = useMe();
  const toggle = () => setCollapsed((c) => { try { localStorage.setItem("fde:nav", c ? "0" : "1"); } catch { /* ignore */ } return !c; });
  // Close the menu after picking a page on a phone.
  const pick = () => { if (window.innerWidth < 900) setCollapsed(true); };
  if (!ready) return <main className="center"><p className="muted">Loading</p></main>;
  if (!user) return <Landing />;
  if (!API_URL) return <main className="center"><p className="muted">This site is not connected to its server yet.</p></main>;
  if (!meReady) return <main className="center"><p className="muted">Checking your access</p></main>;
  // Invite-only: the server decides who gets in.
  if (!me) return <Gate reason="error" />;
  if (me.access !== "approved") return <Gate reason={me.access === "rejected" ? "rejected" : "pending"} />;
  const progs = me.programs ?? [];
  const isAdmin = me.role === "admin";
  return (
    <div className={"shell" + (collapsed ? " collapsed" : "")}>
      <aside className="side">
        <div className="side-head">
          <div className="brand"><span className="mark" aria-hidden="true"><i /><i /><i /></span>FDE Tracker</div>
          <Burger onClick={toggle} open={!collapsed} />
        </div>
        <nav aria-label="Main" onClick={pick}>
          <NavLink to="/" end><Icon name="rss" />Feed</NavLink>
          {isAdmin && <NavLink to="/programs"><Icon name="shield" />Programs</NavLink>}
          {progs.map((p) => (
            <div key={p.id} className="navgroup" role="group" aria-label={p.name}>
              <p className="navhead">{p.name}<span>{ROLE_LABEL[p.role]}</span></p>
              <NavLink to={`/p/${p.id}`} end><Icon name="book" />Plan</NavLink>
              <NavLink to={`/p/${p.id}/daily`}><Icon name="calendar" />Daily status</NavLink>
              <NavLink to={`/p/${p.id}/status`}><Icon name="tasks" />Program status</NavLink>
              <NavLink to={`/p/${p.id}/reports`}><Icon name="chart" />Reports</NavLink>
              {p.role !== "member" && <NavLink to={`/p/${p.id}/manage`}><Icon name="user" />Manage and invite</NavLink>}
            </div>
          ))}
          {progs.length === 0 && <p className="navnote">You are not in a program yet. The admin or a coordinator adds you.</p>}
        </nav>
        <div className="who"><DevPersonaBar /><ThemeSwitch /><small>{user.email}{isAdmin ? " · Admin" : ""}</small><button className="linkbtn" onClick={signOut}>Sign out</button></div>
      </aside>
      <main className="main">
        <div className="topbar"><Burger onClick={toggle} open={!collapsed} /></div>
        <Routes key={persona}>
          <Route path="/" element={<Feed />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/p/:pid" element={<Plan />} />
          <Route path="/p/:pid/daily" element={<DailyStatus />} />
          <Route path="/p/:pid/status" element={<ProgramStatus />} />
          <Route path="/p/:pid/reports" element={<Reports />} />
          <Route path="/p/:pid/manage" element={<Manage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
