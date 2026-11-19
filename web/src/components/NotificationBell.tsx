import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useWork } from "../lib/work";
import { useStore } from "../lib/store";
import { buildReminders, eodHour, eodKey, EOD_HOURS, seenKey, seenToday } from "../lib/reminders";
import { isoDay } from "../lib/backlog";
import { Icon } from "./Icon";
import { Chip } from "./Chip";

const KIND: Record<string, string> = { bad: "Missed", warn: "Today", info: "Note", ok: "Done", none: "Note" };

/** In-app reminders. They appear when the person opens the app; nothing is sent by email or chat. */
export function NotificationBell() {
  const w = useWork();
  const { entries, setEntry } = useStore();
  const [open, setOpen] = useState(false);
  const panel = useId();
  const box = useRef<HTMLDivElement>(null);
  const hour = eodHour(entries);
  const list = useMemo(() => buildReminders(w, hour), [w, hour]);
  const seen = seenToday(entries, w.now);
  const unread = list.filter((r) => !seen.has(r.id)).length;

  const show = () => {
    setOpen(true);
    // opening the panel counts as reading it
    if (unread > 0) setEntry(seenKey, { d: isoDay(w.now), ids: list.map((r) => r.id) });
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [open]);

  return (
    <div className="bell" ref={box}>
      <button type="button" className="bellbtn" aria-expanded={open} aria-controls={panel}
        aria-label={unread ? `Reminders, ${unread} new` : "Reminders"} onClick={() => (open ? setOpen(false) : show())}>
        <Icon name="bell" />
        {unread > 0 && <span className="badge" aria-hidden="true">{unread}</span>}
      </button>
      {open && (
        <div className="bellpanel" id={panel} role="region" aria-label="Reminders">
          <h2>Reminders</h2>
          {list.length === 0 && <p className="muted">Nothing needs you right now.</p>}
          <ul className="notifs">
            {list.map((r) => (
              <li key={r.id}>
                <div className="row tight"><Chip tone={r.tone}>{KIND[r.tone]}</Chip><b>{r.title}</b></div>
                <p className="muted small">{r.body}</p>
                {r.catchUp?.summary && <details className="mini"><summary>Read the summary</summary><p>{r.catchUp.summary}</p></details>}
                <div className="row tight">
                  <Link to={r.to} onClick={() => setOpen(false)}>{r.toLabel}</Link>
                  {r.catchUp && <Link to={r.catchUp.notesTo} onClick={() => setOpen(false)}>Study notes</Link>}
                </div>
              </li>
            ))}
          </ul>
          {w.learner && (
            <div className="bellfoot">
              <label htmlFor={panel + "-eod"}>End-of-day wrap-up from</label>
              <select id={panel + "-eod"} value={hour} onChange={(e) => setEntry(eodKey, Number(e.target.value))}>
                {EOD_HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
              </select>
              <p className="muted small">Reminders show here when you open the app. They are not sent by email.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
