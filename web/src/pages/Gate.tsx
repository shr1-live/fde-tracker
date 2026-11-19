import { useStore } from "../lib/store";

export default function Gate() {
  const { access, user, signOut, recheck } = useStore();
  const pending = access === "pending";
  return (
    <main className="gate">
      <section className="card gatecard">
        <h1>{pending ? "Waiting for approval" : access === "rejected" ? "Access not granted" : "Something went wrong"}</h1>
        <p className="muted">
          {pending && <>The free seats are taken, so your request was sent to the admin. This page opens by itself as soon as you are approved.</>}
          {access === "rejected" && <>The admin did not approve this account. Contact them if you think this is a mistake.</>}
          {access === "error" && <>We could not check your access. Make sure the database setup has been run, then try again.</>}
        </p>
        <p className="small muted">Signed in as {user?.email}</p>
        <div className="row">
          <button className="btn" onClick={recheck}>Check again</button>
          <button className="btn ghost" onClick={signOut}>Sign out</button>
        </div>
      </section>
    </main>
  );
}
