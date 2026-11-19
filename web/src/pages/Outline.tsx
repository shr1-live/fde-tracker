import { WEEKS, EXPECT, ESSENTIAL, WORKING, NOT_MANDATORY, FORMAT } from "../data/outline";
import { DAYS } from "../data/types";
import { useStore } from "../lib/store";
import { Link } from "react-router-dom";

export default function Outline() {
  const { entries, setEntry, isAdmin } = useStore();
  return (
    <>
      <header className="ph"><h1>Six-week programme</h1>
        <p className="muted">The standard company outline: 3 hours a day, 90 hours. Tick each week's expected output as you reach it. <a href="/docs/FDE-Training-Outline-6-week.pdf" target="_blank" rel="noopener noreferrer">Open the original PDF</a>.</p></header>
      <h2>Weeks and expected outputs</h2>
      <ul className="weeklist">
        {WEEKS.map((w) => {
          const mapped = DAYS.filter((d) => d.outline.startsWith(`Outline Week ${w.n}`) || d.outline.includes(`Weeks ${w.n} `) || d.outline.includes(`to ${w.n}`));
          return (
            <li key={w.n} className="card">
              <label className="check"><input type="checkbox" checked={!!entries["wk:" + w.n]} onChange={(e) => setEntry("wk:" + w.n, e.target.checked)} />
                <span><b>Week {w.n}: {w.focus}</b><br />{w.output}</span></label>
            </li>
          );
        })}
      </ul>
      <div className="two">
        <section><h2>What is expected of you</h2><ul className="plain">{EXPECT.map((x) => <li key={x}>{x}</li>)}</ul>
          <h2>Format</h2><dl className="kv">{FORMAT.map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{v}</dd></div>))}</dl></section>
        <section><h2>Essential skills</h2><dl className="kv">{ESSENTIAL.map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{v}</dd></div>))}</dl>
          <h2>Working knowledge</h2><ul className="plain">{WORKING.map((x) => <li key={x}>{x}</li>)}</ul>
          <h2>Not mandatory</h2><ul className="plain">{NOT_MANDATORY.map((x) => <li key={x}>{x}</li>)}</ul></section>
      </div>
    </>
  );
}
