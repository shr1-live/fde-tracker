// Checks that the study notes and the week plan agree: same days, same topics in the same order, every note has text and a link.
// Run with: node scripts/check-notes.mts   (needs Node 22.18 or newer)
import { WEEK_DAYS } from "../src/data/weekPlan.ts";
import { STUDY_NOTES } from "../src/data/studyNotes.ts";

let bad = 0;
const fail = (m: string) => { console.error("FAIL", m); bad++; };
for (const d of WEEK_DAYS) {
  const n = STUDY_NOTES[1]?.find((x) => x.day === d.n);
  if (!n) { fail(`day ${d.n} has no notes`); continue; }
  if (n.notes.length !== d.topics.length) fail(`day ${d.n}: ${n.notes.length} notes for ${d.topics.length} topics`);
  d.topics.forEach((t, i) => { if (n.notes[i]?.topic !== t) fail(`day ${d.n} topic ${i + 1} differs from the plan: "${t}"`); });
  for (const x of n.notes) if (!x.plain || !x.example || x.links.length === 0) fail(`day ${d.n} "${x.topic}" is missing text or links`);
  if (!d.summary || !d.keyIdeas?.length) fail(`day ${d.n} has no catch-up summary or key ideas`);
}
console.log(bad ? `${bad} problem(s)` : `ok: ${WEEK_DAYS.length} days, ${WEEK_DAYS.reduce((a, d) => a + d.topics.length, 0)} topics`);
process.exitCode = bad ? 1 : 0;
