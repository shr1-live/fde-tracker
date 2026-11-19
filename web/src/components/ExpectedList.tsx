import { getWeek } from "../data/programme";
import { RATING_GUIDE } from "../data/weekExpect";

/** What each acceptance point means, and what proof to attach: the standard a learner works to and a reviewer checks against. */
export function ExpectedList({ week, day, open = false }: { week: number; day: number; open?: boolean }) {
  const w = getWeek(week);
  const d = w?.days.find((x) => x.n === day);
  const e = w?.expect[day];
  if (!d || !e) return null;
  return (
    <details open={open}>
      <summary>What is expected for each point, and what proof to attach</summary>
      <p className="muted">{e.goal}</p>
      <dl className="kv">
        {d.done.map((point, i) => (
          <div key={point}>
            <dt>{point}</dt>
            <dd>{e.items[i]?.means}<br /><b>Proof to attach:</b> {e.items[i]?.proof}</dd>
          </div>
        ))}
      </dl>
      <p className="muted small"><b>How to rate yourself (1 to 5):</b> {RATING_GUIDE.map(([n, t]) => `${n} = ${t}`).join(" ")}</p>
    </details>
  );
}
