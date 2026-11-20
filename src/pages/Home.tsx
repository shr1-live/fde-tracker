import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { errText } from "../lib/useProgram";
import { fmtDay, programs, ROLE_LABEL, type ProgramSummary } from "../lib/v3";
import { EmptyState, ErrorState, PageSkeleton } from "../components/States";
import { Chip } from "../components/Chip";
import { Icon } from "../components/Icon";

/** The first screen: choose a program. Everything else (feed, plan, daily status, reports) is per program. */
export default function Home() {
  const [list, setList] = useState<ProgramSummary[] | null>(null);
  const [err, setErr] = useState("");
  const load = () => { setErr(""); programs.list().then(setList).catch((e) => setErr(errText(e))); };
  useEffect(load, []);
  if (err) return <div className="content"><ErrorState title="Could not load your programs" message={err} onRetry={load} /></div>;
  if (!list) return <div className="content"><PageSkeleton /></div>;
  return (
    <div className="content">
      <header className="page-head">
        <h1>Choose a program</h1>
        <p className="page-sub">Pick the program to work in. Its feed, plan, daily status and reports open together; switch any time from the side panel.</p>
      </header>
      {list.length === 0 ? (
        <EmptyState icon="grid" title="You are not in a program yet">The admin or a coordinator adds you. You get an email when they do.</EmptyState>
      ) : (
        <ul className="program-grid">
          {list.map((p) => (
            <li key={p.id}>
              <Link to={`/p/${p.id}/feed`} className="card program-pick">
                <span className="program-avatar" aria-hidden="true">{p.name.slice(0, 1).toUpperCase()}</span>
                <span className="grow">
                  <span className="program-pick-name">{p.name}</span>
                  <span className="meta">{p.member_count} {p.member_count === 1 ? "person" : "people"}{p.starts_on ? ` · starts ${fmtDay(p.starts_on)}` : ""}</span>
                  {p.description && <span className="program-pick-desc">{p.description}</span>}
                </span>
                <Chip tone="info">{ROLE_LABEL[p.my_role]}</Chip>
                <Icon name="right" size={18} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
