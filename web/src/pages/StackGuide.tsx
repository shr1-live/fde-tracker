import { useStore } from "../lib/store";
import { STACKS, stackById } from "../data/stacks";

export default function StackGuide() {
  const { profile, setProfile } = useStore();
  const st = stackById(profile.stack);
  return (
    <>
      <header className="ph"><h1>Stack guide</h1><p className="muted">The programme is about 70% common and 30% stack-specific. These are the stack-specific pieces for each layer.</p></header>
      <div className="seg" role="tablist" aria-label="Stack">
        {STACKS.map((s) => (<button key={s.id} role="tab" aria-selected={s.id === st.id} className={s.id === st.id ? "on" : ""} onClick={() => setProfile({ stack: s.id })}>{s.label}</button>))}
      </div>
      <p className="lead2">{st.blurb}</p>
      <div className="tablewrap"><table>
        <thead><tr><th>Layer</th><th>Tooling</th><th>Learn more</th></tr></thead>
        <tbody>{st.rows.map((r) => (
          <tr key={r.layer}><td>{r.layer}</td><td>{r.tool}</td>
            <td>{r.links.length ? <ul className="plain">{r.links.map((l) => <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer">{l.title}</a></li>)}</ul> : <span className="muted">No link checked</span>}</td></tr>))}</tbody>
      </table></div>
      <p className="muted small">Links were opened and loaded when checked. Tool names without a link come from general knowledge, so check versions before relying on them.</p>
    </>
  );
}
