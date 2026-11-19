// The backlog: days a learner has fallen behind on, and what exactly is missing on each.
// One place for the rule, so the Backlog page, the week page and the dashboard always agree.
import type { WeekDay } from "../data/weekPlan";
import { dayKey, taskKey, type ProgrammeWeek } from "../data/programme";
import type { Status } from "./submissionsApi";

/** Where the learner's start date for a week is stored (with their other progress). */
export const startKey = (week: number) => `start:wp${week}`;
/** Where the backlog log for one day is stored: when it was first seen missed, and when it was caught up. */
export const logKey = (week: number, day: number) => `blog:wp${week}:d${day}`;
export type LogEntry = { missedOn?: string; clearedOn?: string };

const flags = (v: unknown, len: number): boolean[] => Array.from({ length: len }, (_, i) => Array.isArray(v) && v[i] === true);

/** "2026-11-16" as a local date, or null for anything else. */
export function parseDay(s: unknown): Date | null {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}
export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Day N is due N-1 working days (Monday to Friday) after the start date. A start on a weekend counts from the next Monday. */
export function dueDate(start: Date, dayNumber: number): Date {
  const d = new Date(start);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  for (let left = dayNumber - 1; left > 0; ) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) left--;
  }
  return d;
}

/** Whole calendar days between two dates (b after a gives a positive number). */
const daysBetween = (a: Date, b: Date) => Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime() - new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()) / 86400000);

/** How many days overdue, counted in working days (Monday to Friday) like the due dates. A day past due counts as at least 1. */
function overdueWorkingDays(due: Date, today: Date): number {
  if (daysBetween(due, today) <= 0) return 0;
  let n = 0;
  for (const d = new Date(due); daysBetween(d, today) > 0; ) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) n++;
  }
  return Math.max(1, n);
}

export type DayState = {
  day: WeekDay;
  task: string;
  due: Date | null;
  ticked: number;
  /** The "done when" points not ticked yet. */
  missingPoints: string[];
  /** Where the proof stands: null when proof is not tracked here (no server). */
  proof: Status | "none" | null;
  finished: boolean;
  missed: boolean;
  /** Why it counts as missed, in plain words. */
  why: string;
  overdueDays: number;
};

/**
 * Works out every day of a week for one learner.
 * A day is FINISHED when all its points are ticked and, where proof is tracked, the proof is submitted or approved.
 * A day is MISSED when it is not finished and either its due date has passed, or (with no start date set) a later day has been started.
 */
export function weekStates(week: ProgrammeWeek, entries: Record<string, unknown>, proofs: Map<string, Status> | null, today = new Date(), batchStart: Date | null = null): DayState[] {
  // The batch's start date decides due dates; a personal start date is only used when the person is in no batch.
  const start = batchStart ?? parseDay(entries[startKey(week.n)]);
  const started = week.days.map((d) => flags(entries[dayKey(week.n, d.n)], d.done.length).some(Boolean) || (proofs?.has(taskKey(week.n, d.n)) ?? false));
  return week.days.map((day, i) => {
    const task = taskKey(week.n, day.n);
    const f = flags(entries[dayKey(week.n, day.n)], day.done.length);
    const ticked = f.filter(Boolean).length;
    const proof: DayState["proof"] = proofs ? proofs.get(task) ?? "none" : null;
    const proofOk = proof === null || proof === "submitted" || proof === "approved";
    const finished = ticked === day.done.length && proofOk;
    const due = start ? dueDate(start, day.n) : null;
    const overdueDays = due ? overdueWorkingDays(due, today) : 0;
    const laterStarted = started.slice(i + 1).some(Boolean);
    const missed = !finished && (due ? overdueDays > 0 : laterStarted);
    const why = !missed ? "" : due ? `${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue` : "a later day was started before this one was finished";
    return { day, task, due, ticked, missingPoints: day.done.filter((_, j) => !f[j]), proof, finished, missed, why, overdueDays };
  });
}

/** What is still missing on a day, in the words a learner can act on. */
export function missingWork(s: DayState): string[] {
  const out = s.missingPoints.map((p) => `Tick when true: ${p}`);
  if (s.proof === "none") out.push("Submit your proof (a link, a screenshot or a file) for a reviewer.");
  if (s.proof === "draft") out.push("Your proof is saved but not submitted yet: press Submit for review.");
  if (s.proof === "changes_requested") out.push("The reviewer asked for changes: read the comment, fix, and submit again.");
  return out;
}

/**
 * Keeps the backlog log up to date: a day that is missed and has no date gets today's date as "missed on";
 * a day that was missed and is now finished gets "caught up on". A day that falls behind again starts a new entry.
 * Returns the changes to save (nothing when the log is already right).
 */
export function logChanges(week: ProgrammeWeek, states: DayState[], entries: Record<string, unknown>, today = new Date()): [string, LogEntry][] {
  const out: [string, LogEntry][] = [];
  for (const s of states) {
    const key = logKey(week.n, s.day.n);
    const cur = (entries[key] && typeof entries[key] === "object" ? entries[key] : {}) as LogEntry;
    if (s.missed && (!cur.missedOn || cur.clearedOn)) out.push([key, { missedOn: isoDay(today) }]);
    else if (!s.missed && s.finished && cur.missedOn && !cur.clearedOn) out.push([key, { ...cur, clearedOn: isoDay(today) }]);
    // no longer missed without being finished (for example the start date was corrected): the entry was a mistake, so it is removed
    else if (!s.missed && !s.finished && cur.missedOn && !cur.clearedOn) out.push([key, {}]);
  }
  return out;
}

// ---- how a day is shown to the learner (one place, so every screen uses the same words) ----

export const sameDay = (a: Date, b: Date) => isoDay(a) === isoDay(b);
export const fmtDate = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
export type Tone = "ok" | "warn" | "bad" | "info" | "none";

/** The status chip for a day: what a learner should read at a glance. */
export function dayStatus(s: DayState, today = new Date()): { label: string; tone: Tone } {
  if (s.finished) return { label: "Done", tone: "ok" };
  if (s.missed) return { label: s.due ? `Overdue ${s.overdueDays} day${s.overdueDays === 1 ? "" : "s"}` : "Behind", tone: "bad" };
  if (s.due && sameDay(s.due, today)) return { label: "Due today", tone: "warn" };
  if (s.due) return { label: `Due ${fmtDate(s.due)}`, tone: "info" };
  if (s.ticked > 0) return { label: "In progress", tone: "info" };
  return { label: "Not started", tone: "none" };
}
