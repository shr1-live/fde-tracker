// In-app reminders, worked out from the live work picture. Nothing is sent outside the app:
// the person sees these when they open it (bell + the end-of-day card on the dashboard).
import { isoDay, missingWork, sameDay, type Tone } from "./backlog";
import { notesPath } from "../data/studyNotes";
import type { Work, WorkItem } from "./work";

export type Reminder = {
  id: string;
  tone: Tone;
  title: string;
  body: string;
  to: string;
  toLabel: string;
  /** The catch-up text for the end-of-day wrap-up and for missed days. */
  catchUp?: { dayTitle: string; summary?: string; keyIdeas?: string[]; notesTo: string };
};

export const DEFAULT_EOD_HOUR = 17;
export const EOD_HOURS = [15, 16, 17, 18, 19, 20];
export const eodKey = "pref:eod";
export const seenKey = "seen";

export function eodHour(entries: Record<string, unknown>): number {
  const v = Number(entries[eodKey]);
  return EOD_HOURS.includes(v) ? v : DEFAULT_EOD_HOUR;
}

const label = (i: WorkItem) => `Day ${i.state.day.n}${i.week.n === 1 ? "" : ` of week ${i.week.n}`}`;
const dayTo = (i: WorkItem) => `/week/${i.week.n}#wd${i.state.day.n}`;
const catchUpOf = (i: WorkItem): Reminder["catchUp"] => ({ dayTitle: `Week ${i.week.n}, Day ${i.state.day.n}: ${i.state.day.title}`, summary: i.state.day.summary, keyIdeas: i.state.day.keyIdeas, notesTo: notesPath(i.week.n, i.state.day.n) });
const rid = (i: WorkItem) => `w${i.week.n}d${i.state.day.n}`;

const dueSoon = (i: WorkItem, now: Date) => !!i.state.due && sameDay(i.state.due, now) && !i.state.finished;

/** Is it past the person's end-of-day hour on a working day? */
export const isEndOfDay = (now: Date, hour: number) => now.getDay() !== 0 && now.getDay() !== 6 && now.getHours() >= hour;

export function buildReminders(w: Work, hour: number): Reminder[] {
  const out: Reminder[] = [];

  if (w.newInFeed.length > 0) {
    const n = w.newInFeed.length, first = w.newInFeed[0];
    out.push({ id: `feed:${first.id}:${n}`, tone: "info", title: `${n} new in the feed`, body: `${first.author} shared "${first.title}"${n > 1 ? ` and ${n - 1} more` : ""}.`, to: "/feed", toLabel: "Open the feed" });
  }
  if ((w.sharesWaiting ?? 0) > 0) {
    const n = w.sharesWaiting!;
    out.push({ id: `shares:${n}`, tone: "warn", title: `${n} shared link${n === 1 ? "" : "s"} waiting for approval`, body: "Approve them so everyone sees them in the feed.", to: "/feed?tab=review", toLabel: "Review shares" });
  }
  if (!w.learner) {
    const n = w.counts?.submitted ?? 0;
    if (n > 0) out.push({ id: `queue:${n}`, tone: "warn", title: `${n} submission${n === 1 ? "" : "s"} waiting for your review`, body: "Learners are waiting for a decision.", to: "/review", toLabel: "Open the review queue" });
    return out;
  }

  const open = w.items.filter((i) => !i.state.finished);

  // End of day first: the one summary to read before stopping. Only for work that is really pending today:
  // a day that is due or behind, or one the person has started and not finished. A learner who is on schedule is left alone.
  const pending = open.filter((i) => i.state.missed || dueSoon(i, w.now) || (i.state.ticked > 0 && !i.state.due));
  if (isEndOfDay(w.now, hour) && pending.length > 0) {
    const f = pending.find((i) => dueSoon(i, w.now)) ?? pending[0];
    const left = pending.length;
    out.push({
      id: `eod:${isoDay(w.now)}`, tone: "info",
      title: "End-of-day wrap-up",
      body: `${left} day${left === 1 ? " needs" : "s need"} attention. Ten minutes on ${label(f)} before you stop keeps you on track.`,
      to: dayTo(f), toLabel: `Open ${label(f)}`, catchUp: catchUpOf(f),
    });
  }

  for (const i of w.missed) {
    out.push({
      id: `missed:${rid(i)}`, tone: "bad", title: `${label(i)} is missed: ${i.state.why}`,
      body: missingWork(i.state)[0] ?? "Open it to see what is left.", to: "/backlog", toLabel: "Catch up in the backlog", catchUp: catchUpOf(i),
    });
  }
  for (const i of w.dueToday) {
    if (i.state.missed) continue;
    const left = i.state.day.done.length - i.state.ticked;
    out.push({ id: `due:${rid(i)}`, tone: "warn", title: `${label(i)} is due today`, body: left > 0 ? `${left} point${left === 1 ? "" : "s"} still to tick.` : "Submit your proof to finish it.", to: dayTo(i), toLabel: `Open ${label(i)}` });
  }
  for (const i of w.proofActions) {
    out.push(i.state.proof === "changes_requested"
      ? { id: `fix:${rid(i)}`, tone: "bad", title: `A reviewer asked for changes on ${label(i)}`, body: "Read the comment, fix it and submit again.", to: dayTo(i), toLabel: "Open the comment" }
      : { id: `draft:${rid(i)}`, tone: "warn", title: `Your proof for ${label(i)} is saved but not submitted`, body: "Press Submit for review so a reviewer can see it.", to: dayTo(i), toLabel: "Submit it" });
  }
  if (w.weeksWithoutStart.length > 0 && !w.allDone) {
    out.push({ id: "start:set", tone: "info", title: "Set your start date", body: "With a start date every day gets a due date, and missed days are found for you.", to: "/backlog", toLabel: "Set the date" });
  }
  return out;
}

export type Seen = { d: string; ids: string[] };
/** The ids already seen today. Reminders come back as new the next day. */
export function seenToday(entries: Record<string, unknown>, now: Date): Set<string> {
  const v = entries[seenKey] as Seen | undefined;
  return new Set(v && v.d === isoDay(now) && Array.isArray(v.ids) ? v.ids.filter((x) => typeof x === "string") : []);
}
