import { useStore } from "../lib/store";

/** Shown when the server has not let this account in: not invited yet, removed, or the server could not be reached. */
export default function Gate({ reason }: { reason: "pending" | "rejected" | "error" }) {
  const { user, signOut } = useStore();
  const title = reason === "pending" ? "You have not been invited yet" : reason === "rejected" ? "Access not granted" : "We could not check your access";
  return (
    <main className="gate">
      <section className="card gatecard">
        <h1>{title}</h1>
        <p className="muted">
          {reason === "pending" && <>This site is invite-only. Ask the admin or your program's coordinator to invite <b>{user?.email}</b>. Once they do, press Check again or sign in again.</>}
          {reason === "rejected" && <>The admin removed this account's access. Contact them if you think this is a mistake.</>}
          {reason === "error" && <>The server did not answer. If it was idle it can take about 30 seconds to wake up; try again.</>}
        </p>
        <p className="small muted">Signed in as {user?.email}</p>
        <div className="row">
          <button className="btn" onClick={() => window.location.reload()}>Check again</button>
          <button className="btn ghost" onClick={signOut}>Sign out</button>
        </div>
      </section>
    </main>
  );
}
