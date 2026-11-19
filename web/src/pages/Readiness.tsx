import { READINESS } from "../data/types";
import { useStore } from "../lib/store";

export default function Readiness() {
  const { entries, setEntry } = useStore();
  const sel = (k: string, label: string) => (
    <select aria-label={label} value={String(entries[k] ?? "")} onChange={(e) => setEntry(k, e.target.value === "" ? null : Number(e.target.value))}>
      <option value="">-</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
    </select>
  );
  return (
    <>
      <header className="ph"><h1>Readiness</h1><p className="muted">Rate yourself from 1 to 5 against the outline's skills table. Do it on Day 1 and again on Day 10.</p></header>
      <div className="tablewrap"><table>
        <thead><tr><th>Skill</th><th>Target proficiency</th><th>Practised</th><th>Day 1</th><th>Day 10</th></tr></thead>
        <tbody>{READINESS.map((r, i) => (
          <tr key={r.skill}><td>{r.skill}</td><td>{r.target}</td><td>{r.where}</td><td>{sel(`rate:base:${i}`, r.skill + " day 1")}</td><td>{sel(`rate:final:${i}`, r.skill + " day 10")}</td></tr>))}</tbody>
      </table></div>
    </>
  );
}
