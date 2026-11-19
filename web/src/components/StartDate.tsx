import { useId } from "react";
import { useStore } from "../lib/store";
import { fmtDate, parseDay, startKey } from "../lib/backlog";
import { useWork } from "../lib/work";

/** The learner's own start date for a week. With it, day N is due N-1 working days later and missed days are found for them. */
export function StartDate({ week, compact = false }: { week: number; compact?: boolean }) {
  const { entries, setEntry } = useStore();
  const { batch } = useWork();
  const id = useId();
  if (batch) return <p className={"startdate" + (compact ? " compact" : "")}>Your batch, <b>{batch.name}</b>, started on <b>{fmtDate(batch.startsOn)}</b>. Due dates follow it.</p>;
  const raw = entries[startKey(week)];
  const value = typeof raw === "string" && parseDay(raw) ? raw : "";
  return (
    <div className={"startdate" + (compact ? " compact" : "")}>
      <label htmlFor={id}>I started week {week} on</label>
      <input id={id} type="date" value={value} onChange={(e) => setEntry(startKey(week), parseDay(e.target.value) ? e.target.value : "")} />
    </div>
  );
}
