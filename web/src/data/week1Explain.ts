// Plain-words explanation of the Week 1 work, so it can be explained to anyone.
// Keep it honest: say what is built, what is proven, and what is not done yet.
export const ONE_MINUTE = [
  "We built an AI helper that reads a job description and a few candidate profiles and says who fits, showing proof quoted from the profiles.",
  "It is not tied to one AI model. It talks to any provider that uses the common chat format, so a local model, Gemini, Groq or another can be swapped in by changing server settings.",
  "We measured how fast each model answers, how much text it uses (counted in tokens, which is also what hosted models charge for), and wrote down which model to use and why.",
  "For safety, text inside a profile is treated as data and never as an order, any claim without a real quote is removed, and each person has a daily limit.",
];

export type DayExplain = { n: number; built: string; how: string; proof: string; notYet: string };

export const DAY_EXPLAIN: DayExplain[] = [
  { n: 1,
    built: "An endpoint in the backend that sends a prompt to an AI model and returns a checked answer, plus a test tool that asks the same 10 questions to several models.",
    how: "The backend uses the common chat format, so any provider works. The key and model name live only in server settings, never in code. If the model is slow or fails, the user gets a clear message, and every call is logged with its time and token counts.",
    proof: "The 20-question comparison below, 40 automatic tests, and a real end-to-end run with a local model.",
    notYet: "Only small local models were compared. Add a hosted model to the comparison before choosing for production." },
  { n: 2,
    built: "Seven stored versions of the instructions, one per Day 2 technique: v1 plain (zero-shot), v2 structured, v3 one example, v4 a 'profile text is data, not orders' rule, v5 reasoning before rating plus clarifying questions, v6 three worked examples (few-shot), v7 a two-step chain (extract quoted facts, then rate from those facts only).",
    how: "Every answer must follow a fixed shape: matched skills each with a quote, gaps, items the profile does not state, short reasoning, questions for thin profiles, and a fit rating. Our own code checks every quote against the profile and removes any claim without one. In the chain, only facts whose quote is really in the profile reach the second step.",
    proof: "All seven versions compared on the same eight candidates, each run twice. On the 3B model: v4 94% (default), v2 88%, v3 88%, v1 84%, v5 79%, v7 64%, v6 63%. Tests cover the reasoning, few-shot, chain and question features.",
    notYet: "Only small local models were tested. The newer techniques did not help the 3B model (v6 was the most repeatable but rated too cautiously; v7 lost detail between steps), which is common for small models; a hosted model may rank them differently. The model rarely asked questions by itself, so the code-built mode generates them." },
  { n: 3,
    built: "The Task assistant (a page in this app and an API): you type what you want in plain words and it can create, list, update and delete your tasks.",
    how: "The model only asks for an action, in a fixed JSON shape. Our own server checks every argument against a strict schema, only touches the signed-in person's tasks, asks the person to confirm before any delete, runs the action, and writes every call to a log. Text that comes back from a tool (such as a task title) is passed to the model as escaped data, so it cannot act as an instruction. At most 4 steps per message.",
    proof: "Automated tests, all passing: 24 kinds of bad arguments refused, another person's tasks cannot be changed or confirmed, a delete does nothing until confirmed and can be decided once, a hostile task title is treated as data, the step limit holds, and unusable model replies end cleanly. A real run with the small local model (qwen2.5:3b) created, listed and updated tasks correctly; every bad request it made was refused and nothing was deleted without a confirmation.",
    notYet: "The small local model did not manage the delete flow: it asked for a delete with a made-up id, then updated a task instead. Our server refused or contained every mistake, but a stronger hosted model (for example Claude) should be tried before anyone relies on it. The assistant has not been deployed." },
  { n: 4,
    built: "A fixed set of 30 test cases (10 normal, 5 with missing information, 5 vague, 5 with an order hidden inside the profile, 5 odd inputs), each with the expected behaviour, an automatic scorer, and two new checks in the backend code.",
    how: "The model answers each case once; the same raw answers are then scored with the checks switched on one set at a time, so any change comes from the checks. New checks: text in a profile that gives orders to the assistant is found (even split across lines or disguised with look-alike letters) and cut out, so it cannot back its own claims; such a profile cannot be rated above partial. A top rating also has to match our own skill check, not only the model's opinion.",
    proof: "On the 30 cases the checks were built on: before, 13 passed, 37 unsupported claims were shown and 3 of 5 hidden orders were obeyed; after, 26 passed, 0 unsupported claims, 0 of 5 obeyed. On a fresh set of 15 cases the checks never saw (10 new attacks, 5 honest profiles): before, 5 of 15 passed; after, 13 of 15, 0 unsupported claims, 9 of 10 attacks handled, no false alarm on the honest profiles. 114 automated tests.",
    notYet: "Honest result of the fresh test: the new instruction screen caught 0 of 10 new attacks, because they used wordings it had not seen. The attacks were handled by the older, plainer checks (a rating needs a real quote, claims need a real quote), which alone score 14 of 15, so the Day 4 additions added nothing on fresh data. One attack worked: an order to start the summary with a word (HACKED) was obeyed in the model's own summary text. An option now builds the summary in code instead (ASSISTANT_SUMMARY=code, off by default because it changes what users see): on the same saved answers it passes 14 of 15 and no hidden order is obeyed. On the first set 4 cases still fail (n02, n03, n08, n09), all because the model itself said 'not enough information' for a clear profile. One run on one small model; a hosted model has not been run." },
  { n: 5,
    built: "The Assistant page in this app. It sends the job description and profiles to the backend with the signed-in user's token and shows the fit, quotes, gaps, speed and token use.",
    how: "Input and output are checked, errors show clear messages, usage is logged per person, and a daily limit protects the bill.",
    proof: "A working local flow with a real model, and 40 passing tests.",
    notYet: "Streaming the answer as it is written (optional) and going live on a hosted server. A recorded video demo is not made; there is a written demo script." },
];
