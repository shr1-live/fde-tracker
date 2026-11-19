import { FormEvent, useState } from "react";
import { useStore } from "../lib/store";
import { ALLOWED_DOMAIN } from "../lib/supabase";
import { WEEKS } from "../data/outline";
import ThemeSwitch from "../components/ThemeSwitch";

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
    <main className="landing">
      <div className="ltheme"><ThemeSwitch /></div>
      <section className="lhero">
        <h1>Build the AI skills your role needs, one layer a day</h1>
        <p className="lead">The company FDE programme as a working tracker: the six-week outline, a guide for your stack, and your own plan. Tick what you finish, keep your notes, and see your progress build up.</p>
        <ol className="weeks">{WEEKS.map((w) => (<li key={w.n}><b>Week {w.n}</b><span>{w.focus}</span></li>))}</ol>
      </section>
      <section className="lform card">
        <h2>Sign in with your office email</h2>
        {sent ? (
          <p role="status">Check your inbox at <b>{email}</b>. The link signs you in on this device.</p>
        ) : (
          <form onSubmit={submit}>
            <label htmlFor="email">Office email</label>
            <input id="email" type="email" required autoComplete="email" placeholder={`you@${ALLOWED_DOMAIN}`} value={email} onChange={(e) => setEmail(e.target.value)} />
            {usePw && (<><label htmlFor="pw">Password</label><input id="pw" type="password" required autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} /></>)}
            <button className="btn" disabled={busy}>{mode !== "supabase" ? "Continue" : usePw ? "Sign in" : "Email me a sign-in link"}</button>
            {mode === "supabase" && import.meta.env.VITE_ENABLE_GUEST !== "0" && <button type="button" className="btn ghost wide" onClick={guestSignIn}>Continue as guest (this browser only)</button>}
            {mode === "supabase" && <button type="button" className="linkbtn alt" onClick={() => { setUsePw(!usePw); setMsg(""); }}>{usePw ? "Use an email link instead" : "Email not arriving? Sign in with a password"}</button>}
            {msg && <p className="err" role="alert">{msg}</p>}
          </form>
        )}
        <p className="muted small">Only @{ALLOWED_DOMAIN} addresses can sign in. The first 3 people get in straight away; after that the admin approves each request.{mode === "local" && " This deployment has no database connected yet, so progress is saved in this browser only."}</p>
      </section>
    </main>
  );
}
