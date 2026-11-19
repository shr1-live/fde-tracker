import { FormEvent, useState } from "react";
import { useStore } from "../lib/store";
import { Progress } from "../components/Progress";

type Item = { id: string; t: string; n: string; d: boolean };
const KEY = "myplan"; // stored per user; the database only lets each person read their own
const MAX_ITEMS = 40;

export default function MyPlan() {
  const { entries, setEntry } = useStore();
  const items: Item[] = Array.isArray(entries[KEY]) ? (entries[KEY] as Item[]) : [];
  const [title, setTitle] = useState(""); const [note, setNote] = useState("");
  const save = (next: Item[]) => setEntry(KEY, next);
  const done = items.filter((i) => i.d).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  function add(e: FormEvent) {
    e.preventDefault();
    const t = title.trim().slice(0, 100);
    if (!t || items.length >= MAX_ITEMS) return;
    save([...items, { id: Date.now().toString(36), t, n: note.trim().slice(0, 200), d: false }]);
    setTitle(""); setNote("");
  }
  const toggle = (id: string) => save(items.map((i) => (i.id === id ? { ...i, d: !i.d } : i)));
  const remove = (id: string) => save(items.filter((i) => i.id !== id));
  const move = (id: string, dir: -1 | 1) => {
    const i = items.findIndex((x) => x.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= items.length) return;
    const next = [...items]; [next[i], next[j]] = [next[j], next[i]]; save(next);
  };

  return (
    <>
      <header className="ph"><h1>My plan</h1><p className="muted">Build your own learning plan: add the topics, tasks and projects you want to work through, in the order you choose. Only you can see it.</p></header>
      <div className="dash">
        <section>
          <h2>Your steps <small>{done} of {items.length} done</small></h2>
          {items.length === 0 ? (
            <div className="card"><p className="muted">Nothing here yet. Add your first step on the right, for example "Build a small chat feature with an LLM".</p></div>
          ) : (
            <ol className="mylist">
              {items.map((i, idx) => (
                <li key={i.id} className={"card" + (i.d ? " isdone" : "")}>
                  <label className="check"><input type="checkbox" checked={i.d} onChange={() => toggle(i.id)} />
                    <span><b>{i.t}</b>{i.n && <><br /><span className="muted">{i.n}</span></>}</span></label>
                  <div className="mytools">
                    <button type="button" className="copy" onClick={() => move(i.id, -1)} disabled={idx === 0} aria-label={`Move ${i.t} up`}>Up</button>
                    <button type="button" className="copy" onClick={() => move(i.id, 1)} disabled={idx === items.length - 1} aria-label={`Move ${i.t} down`}>Down</button>
                    <button type="button" className="copy" onClick={() => remove(i.id)} aria-label={`Delete ${i.t}`}>Delete</button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
        <aside>
          <form className="card" onSubmit={add}>
            <h3>Add a step</h3>
            <label htmlFor="mt">What will you do?</label>
            <input id="mt" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Week 2: build a tool-calling demo" />
            <label htmlFor="mn">Notes (optional)</label>
            <textarea id="mn" rows={3} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="row"><button className="btn" disabled={!title.trim() || items.length >= MAX_ITEMS}>Add to my plan</button></div>
            {items.length >= MAX_ITEMS && <p className="err small">You have reached {MAX_ITEMS} steps. Delete one to add another.</p>}
          </form>
          <div className="card"><h3>Progress</h3><Progress value={pct} label="My plan progress" /><p className="muted small">{done} of {items.length} steps complete</p></div>
        </aside>
      </div>
    </>
  );
}
