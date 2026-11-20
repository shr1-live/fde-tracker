import { FormEvent, useState } from "react";
import { useStore } from "../lib/store";
import { ALLOWED_DOMAIN } from "../lib/supabase";
import ThemeSwitch from "../components/ThemeSwitch";
import { Icon, type IconName } from "../components/Icon";
import { BrandMark } from "../components/BrandMark";

const FEATURES: [IconName, string, string][] = [
  ["book", "A plan for every program", "Weeks, days and topics, with a practical task and a tick for each day you finish."],
  ["calendar", "Daily and program status", "Short forms your coordinator sets up. Fill them in once a day; nothing else to chase."],
  ["chart", "Reports in the sheet layout", "Everyone's progress at a glance, and an Excel download that matches the training sheets."],
  ["rss", "A feed for the whole team", "Share videos, articles and what you built; like and discuss what others share."],
];

export default function Landing() {
  const { mode, signIn, signInPassword, guestSignIn, localSignIn } = useStore();
  const [email, setEmail] = useState(""); const [msg, setMsg] = useState(""); const [sent, setSent] = useState(false); const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState(""); const [usePw, setUsePw] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMsg("");
    if (mode === "supabase" && usePw) { const err = await signInPassword(email, pw); if (err) setMsg(err); }
    else if (mode === "supabase") { const err = await signIn(email); if (err) setMsg(err); else setSent(true); }
    else { const err = localSignIn(email); if (err) setMsg(err); }
    setBusy(false);
  }
  return (
    <div className="landing">
      <header className="landing-top">
        <span className="brand"><BrandMark />FDE Tracker</span>
        <ThemeSwitch compact />
      </header>
      <main className="landing-main" id="main">
        <section className="landing-hero">
          <p className="pill"><Icon name="shield" size={14} />Invite-only for the learning team</p>
          <h1>Run every learning program in one calm place.</h1>
          <p className="lead">Plans, daily status, progress reports and a team feed for FDE, DevOps and every program that comes next.</p>
          <ul className="features">
            {FEATURES.map(([ic, t, d]) => (
              <li key={t}><span className="feature-icon" aria-hidden="true"><Icon name={ic} size={18} /></span><span><b>{t}</b><span>{d}</span></span></li>
            ))}
          </ul>
        </section>
        <section className="card signin" aria-labelledby="signin-h">
          <h2 id="signin-h">Sign in</h2>
          <p className="muted">Use the office email you were invited with.</p>
          {sent ? (
            <div className="sent" role="status"><Icon name="inbox" size={20} /><p>Check your inbox at <b>{email}</b>. The link signs you in on this device.</p></div>
          ) : (
            <form onSubmit={submit} className="stack-sm">
              <div className="field">
                <label htmlFor="email">Office email</label>
                <input id="email" type="email" required autoComplete="email" placeholder={`you@${ALLOWED_DOMAIN}`} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {usePw && (
                <div className="field">
                  <label htmlFor="pw">Password</label>
                  <input id="pw" type="password" required autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
                </div>
              )}
              {msg && <p className="field-error" role="alert">{msg}</p>}
              <button className="btn block" disabled={busy}>{busy ? "One moment" : mode !== "supabase" ? "Continue" : usePw ? "Sign in" : "Email me a sign-in link"}</button>
              {mode === "supabase" && import.meta.env.VITE_ENABLE_GUEST !== "0" && <button type="button" className="btn secondary block" onClick={guestSignIn}>Continue as guest (this browser only)</button>}
              {mode === "supabase" && <button type="button" className="textbtn" onClick={() => { setUsePw(!usePw); setMsg(""); }}>{usePw ? "Use an email link instead" : "Email not arriving? Sign in with a password"}</button>}
            </form>
          )}
          <p className="meta signin-note">Only @{ALLOWED_DOMAIN} addresses that the admin or a coordinator invited can get in.{mode === "local" && " This deployment has no database connected yet, so data stays in this browser."}</p>
        </section>
      </main>
    </div>
  );
}
