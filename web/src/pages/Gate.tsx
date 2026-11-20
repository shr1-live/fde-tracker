import { useStore } from "../lib/store";
import { Icon } from "../components/Icon";

/** Shown when the server has not let this account in: not invited yet, removed, or the server could not be reached. */
export default function Gate({ reason }: { reason: "pending" | "rejected" | "error" }) {
  const { user, signOut } = useStore();
  const title = reason === "pending" ? "You have not been invited yet" : reason === "rejected" ? "Access not granted" : "We could not check your access";
  return (
    <main className="center-page" id="main">
      <section className="card center-card gatecard">
        <span className={"center-icon" + (reason === "error" ? " warn" : "")} aria-hidden="true"><Icon name={reason === "error" ? "alert" : "shield"} size={22} /></span>
        <h1>{title}</h1>
        <p className="muted">
          {reason === "pending" && <>This site is invite-only. Ask the admin or your program's coordinator to invite <b>{user?.email}</b>. Once they do, press Check again.</>}
          {reason === "rejected" && <>The admin removed this account's access. Contact them if you think this is a mistake.</>}
          {reason === "error" && <>The server did not answer. If it was idle it can take about 30 seconds to wake up; try again.</>}
        </p>
        <p className="meta">Signed in as {user?.email}</p>
        <div className="row center">
          <button type="button" className="btn" onClick={() => window.location.reload()}>Check again</button>
          <button type="button" className="btn secondary" onClick={signOut}>Sign out</button>
        </div>
      </section>
    </main>
  );
}
