// LOCAL DEMO DATA ONLY. Fills a LOCAL API (http://localhost) with realistic sample data covering every scenario:
// three programs, admin / coordinators / members (one person in two programs, a coordinator who is a member elsewhere,
// a new joiner, a pending invite), plans, day status, timesheets (complete, submitted, partial, missing days),
// old-form daily status, per-program feed posts with likes and comments, and missed-day reminders.
//
// It never runs in a deployment: nothing in the build, CI or Render calls it, and it refuses any API that is not localhost.
// It signs test tokens with the LOCAL API's dev secret, which must be passed in; the live API does not accept them.
//
//   DEV_JWT_SECRET=<the local API's SUPABASE_JWT_SECRET> API=http://localhost:5080 node scripts/seed-demo.mjs
//
// Prints a link that signs you in as any of the demo people (dev builds only).
import crypto from "node:crypto";

const API = process.env.API ?? "http://localhost:5080";
const SECRET = process.env.DEV_JWT_SECRET;
const WEB = process.env.WEB ?? "http://localhost:5189";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(API)) throw new Error("Refusing: demo data goes to a local API only.");
if (!SECRET) throw new Error("Set DEV_JWT_SECRET to the local API's SUPABASE_JWT_SECRET.");

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const token = (id, email) => {
  const h = b64({ alg: "HS256", typ: "JWT" });
  const p = b64({ sub: id, email, aud: "authenticated", iss: "https://test.supabase.co/auth/v1", email_verified: true, exp: Math.floor(Date.now() / 1000) + 12 * 3600 });
  return `${h}.${p}.${crypto.createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url")}`;
};
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const D = "fiftyfivetech.io";
const P = {
  admin: { n: 1, email: `boss@${D}`, name: "Shivanshu Rai (Admin)" },
  priya: { n: 11, email: `priya.sharma@${D}`, name: "Priya Sharma" },
  rahul: { n: 12, email: `rahul.mehta@${D}`, name: "Rahul Mehta" },
  asha: { n: 21, email: `asha.verma@${D}`, name: "Asha Verma" },
  karan: { n: 22, email: `karan.singh@${D}`, name: "Karan Singh" },
  neha: { n: 23, email: `neha.gupta@${D}`, name: "Neha Gupta" },
  arjun: { n: 24, email: `arjun.nair@${D}`, name: "Arjun Nair" },
  meera: { n: 25, email: `meera.jain@${D}`, name: "Meera Jain" },
};
for (const p of Object.values(P)) p.tok = token(uid(p.n), p.email);

async function call(who, method, path, body) {
  const r = await fetch(API + path, { method, headers: { authorization: `Bearer ${P[who].tok}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text();
  if (!r.ok) { console.warn(`  ${who} ${method} ${path} -> ${r.status} ${t.slice(0, 160)}`); return null; }
  return t ? JSON.parse(t) : null;
}

// ---- dates
const iso = (d) => d.toISOString().slice(0, 10);
const day = (s, n) => { const d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const today = iso(new Date());
const thisMonday = day(today, -((new Date(today + "T00:00:00Z").getUTCDay() + 6) % 7));
const weeks = [day(thisMonday, -14), day(thisMonday, -7), thisMonday];
const workdays = (mon) => [0, 1, 2, 3, 4].map((i) => day(mon, i)).filter((d) => d <= today);
const ago = (n) => day(today, -n);

console.log("1. People and programs");
for (const k of Object.keys(P)) await call(k, "GET", "/api/me"); // first sign-in (admin is approved by email)
const me = await call("admin", "GET", "/api/me");
let all = await call("admin", "GET", "/api/programs");
const ensure = async (name, description, starts_on) => all.find((p) => p.name === name) ?? await call("admin", "POST", "/api/programs", { name, description, starts_on });
const fde = all.find((p) => p.name === "FDE Training Program") ?? me.programs[0];
await call("admin", "PATCH", `/api/programs/${fde.id}`, { starts_on: weeks[0] });
const devops = await ensure("DevOps Training Program", "CI/CD, containers, Kubernetes and cloud basics for the platform team.", weeks[1]);
const data = await ensure("Data Engineering Bootcamp", "Pipelines, warehousing and dbt. Starts next month.", day(thisMonday, 21));
all = await call("admin", "GET", "/api/programs");

const invite = (pid, k, role) => call("admin", "POST", `/api/programs/${pid}/invites`, { email: P[k].email, role });
await invite(fde.id, "priya", "coordinator");
for (const k of ["asha", "karan", "neha", "meera", "rahul"]) await invite(fde.id, k, "member");
await invite(devops.id, "rahul", "coordinator");
for (const k of ["karan", "arjun"]) await invite(devops.id, k, "member");
await invite(data.id, "priya", "coordinator");
await call("admin", "POST", `/api/programs/${data.id}/invites`, { email: `vikram.rao@${D}`, role: "member" }); // never signed in: pending invite
for (const [k, p] of Object.entries(P)) await call(k, "PATCH", "/api/me", { display_name: p.name });

console.log("2. Plans");
const FDE_PLAN = [
  ["LLM Fundamentals & Model Selection", "Tokens, context windows, sampling, cost and latency trade-offs; picking a model for a task.", "Compare three models on the same 20 prompts and write a one-page recommendation."],
  ["Advanced Prompt Engineering", "System prompts, few-shot, chain of thought, prompt versioning.", "Build a prompt library with tests for a support-ticket classifier."],
  ["Structured Outputs & Tool Calling", "JSON schemas, function calling, validation and retries.", "Extract invoice fields into JSON with schema validation."],
  ["LLM Evaluation, Reliability & Guardrails", "Golden sets, LLM-as-judge, regression evals, input and output guardrails.", "Add an eval suite of 30 cases to the classifier."],
  ["Embeddings & Vector Search", "Embedding models, chunking, similarity, pgvector.", "Index the handbook in pgvector and query it."],
  ["Retrieval-Augmented Generation", "Retriever + generator, citations, hybrid search.", "Answer handbook questions with citations."],
  ["RAG Evaluation", "Faithfulness, answer relevance, context recall.", "Score the RAG bot on 40 questions."],
  ["Agents & Orchestration", "Tool loops, planning, memory, failure handling.", "Agent that files a Jira ticket from a Slack thread."],
  ["Security for LLM Apps", "Prompt injection, data exfiltration, PII handling.", "Red-team your agent and fix two findings."],
  ["Week 2 Demo Day", "Show your RAG bot and agent; peer review.", "10-minute demo + written retro."],
  ["Deploying LLM Apps", "Containers, secrets, rate limits, caching.", "Deploy the RAG bot behind an API."],
  ["Observability & Cost", "Tracing, token cost dashboards, alerts.", "Add tracing and a daily cost report."],
  ["Customer Discovery as an FDE", "Running discovery calls, mapping workflows.", "Write a discovery brief for a sample customer."],
  ["Capstone Build", "Scope, build and test the capstone assistant.", "Working capstone with evals."],
  ["Capstone Delivery", "Hand-over, docs, demo to stakeholders.", "Final demo and hand-over pack."],
];
const DEVOPS_PLAN = [
  ["Linux & Shell Essentials", "Processes, permissions, systemd, bash scripting.", "Script a log-rotation job."],
  ["Git Workflows", "Branching, PRs, rebasing, protected branches.", "Set up branch protection and a PR template."],
  ["CI with GitHub Actions", "Workflows, caching, matrices, secrets.", "CI pipeline with tests and lint."],
  ["Docker Deep Dive", "Images, layers, multi-stage builds, scanning.", "Slim a 1 GB image below 200 MB."],
  ["Container Networking", "Bridge networks, compose, health checks.", "Compose app with Postgres and health checks."],
  ["Kubernetes Basics", "Pods, deployments, services, config maps.", "Deploy the app to kind."],
  ["Helm & Config", "Charts, values, environments.", "Helm chart with dev and prod values."],
  ["Infrastructure as Code", "Terraform state, modules, plans.", "Terraform a VPC and a database."],
  ["Monitoring & Alerting", "Prometheus, Grafana, SLOs.", "Dashboard + two alerts."],
  ["Incident Drill", "On-call, runbooks, post-mortems.", "Run a drill and write the post-mortem."],
];
async function plan(pid, items, links) {
  const prog = await call("admin", "GET", `/api/programs/${pid}`);
  if (prog.days.length >= items.length) return prog;
  for (let i = prog.days.length; i < items.length; i++) {
    const [topic, cover, task] = items[i];
    await call("admin", "POST", `/api/programs/${pid}/days`, { week: Math.floor(i / 5) + 1, day: (i % 5) + 1, topic, topics_to_cover: cover, practical_task: task, resources: links[i % links.length] });
  }
  return call("admin", "GET", `/api/programs/${pid}`);
}
const fdeP = await plan(fde.id, FDE_PLAN, ["https://platform.openai.com/docs/guides/prompt-engineering", "https://docs.anthropic.com/en/docs/build-with-claude/tool-use", "https://www.pinecone.io/learn/retrieval-augmented-generation/"]);
const devP = await plan(devops.id, DEVOPS_PLAN, ["https://docs.github.com/actions", "https://docs.docker.com/build/building/multi-stage/", "https://kubernetes.io/docs/tutorials/kubernetes-basics/"]);
await plan(data.id, [["Data Modelling", "Star schemas, slowly changing dimensions.", "Model the sales domain."], ["Batch Pipelines", "Airflow, idempotency, backfills.", "Daily pipeline with backfill."]], ["https://docs.getdbt.com/"]);

console.log("3. Day status (plan progress)");
const dayStatus = async (k, prog, n, inProgress = 0) => {
  const days = [...prog.days].sort((a, b) => a.week - b.week || a.day - b.day);
  for (let i = 0; i < n + inProgress && i < days.length; i++) {
    const done = i < n;
    await call(k, "PUT", `/api/programs/${prog.id}/day-status/${days[i].id}`, {
      completed: done,
      values: done ? { learned: `Covered ${days[i].topic.toLowerCase()}; the practical is done and pushed.`, proof: "https://github.com/fiftyfive-demo/fde-practicals", rating: 3 + (i % 3) } : { learned: "Halfway through the practical." },
    });
  }
};
await dayStatus("asha", fdeP, 11);
await dayStatus("karan", fdeP, 8, 1);
await dayStatus("neha", fdeP, 5, 2);
await dayStatus("rahul", fdeP, 6);
await dayStatus("meera", fdeP, 2);
await dayStatus("arjun", devP, 8);
await dayStatus("karan", devP, 6, 1);

console.log("4. Timesheets (hours + notes)");
const T = (title, h) => ({ title, h });
const sheet = async (k, pid, mon, rows, skip = [], submit = false) => {
  const days = workdays(mon).filter((d) => !skip.includes(d));
  const tasks = rows.map((r, ri) => ({
    title: r.title,
    cells: days.map((d, di) => ({ date: d, minutes: Math.round((r.h[di % r.h.length]) * 60), note: ri === 0 ? ["Read the docs and took notes", "Paired with a teammate", "Finished the exercises", "Reviewed my notes", "Wrote a summary"][di % 5] : null })).filter((c) => c.minutes > 0),
  }));
  return call(k, "PUT", `/api/programs/${pid}/timesheet/${mon}`, { tasks, submit });
};
const FDE_ROWS = [T("Training theory", [3, 2.5, 3, 2, 3]), T("Practical task", [2.5, 3, 2, 3, 2.5]), T("Client project: Acme support bot", [2, 2, 2.5, 2, 1.5])];
for (const [i, mon] of weeks.entries()) {
  const current = i === 2;
  await sheet("asha", fde.id, mon, FDE_ROWS, [], !current);                                  // always on time; past weeks submitted
  await sheet("karan", fde.id, mon, FDE_ROWS.slice(0, 2), current ? [ago(1)] : [], !current); // missed yesterday in FDE only
  await sheet("neha", fde.id, mon, FDE_ROWS.slice(0, 2), current ? [day(mon, 2), day(mon, 3)] : i === 1 ? [day(mon, 4)] : []); // gaps, never submits
  await sheet("rahul", fde.id, mon, [T("Training theory", [2, 2, 1.5, 2, 2])], [], !current);
  if (mon >= day(thisMonday, -7)) {
    await sheet("arjun", devops.id, mon, [T("Training theory", [3, 3, 2.5, 3, 3]), T("Lab: pipelines", [3, 2.5, 3, 3, 2])], [], !current);
    await sheet("karan", devops.id, mon, [T("DevOps labs", [1.5, 2, 1.5, 2, 1])], [], !current); // filled DevOps every day
  }
}
await sheet("meera", fde.id, thisMonday, [T("Onboarding and setup", [0, 0, 4, 3.5, 3]), T("Training theory", [0, 0, 2, 3, 3])]); // joined mid-week

console.log("5. Old-form daily status (from before the timesheet)");
for (const d of workdays(weeks[0]).slice(0, 3))
  await call("neha", "PUT", `/api/programs/${fde.id}/daily/${d}`, { values: { project: "None", theory: "Week 1 topics, 3 h", practical: "Model comparison sheet in progress" } });

console.log("6. Feed per program");
const post = (k, pid, body, url) => call(k, "POST", "/api/feed", { body, url, program_id: pid });
const fdePosts = [
  await post("priya", fde.id, "Welcome to the FDE program! Post anything useful you find, and your demos. Week 2 demo day is on Friday.", undefined),
  await post("asha", fde.id, "This talk on building effective agents made tool calling click for me.", "https://www.youtube.com/watch?v=D7_ipDqhtwk"),
  await post("karan", fde.id, "Wrote up how I cut our RAG bot's token cost by 40% with smaller chunks and caching.", "https://www.anthropic.com/news/contextual-retrieval"),
  await post("neha", fde.id, "Anyone else stuck on schema validation retries? Here is the pattern that finally worked for me.", undefined),
  await post("meera", fde.id, "First week here! Thanks for the onboarding notes, Priya.", undefined),
];
const devPosts = [
  await post("rahul", devops.id, "Reminder: the incident drill is next Thursday. Read the runbook first.", "https://sre.google/sre-book/managing-incidents/"),
  await post("arjun", devops.id, "Got our image from 1.1 GB to 180 MB with a multi-stage build.", "https://docs.docker.com/build/building/multi-stage/"),
  await post("karan", devops.id, "Kubernetes basics in 30 minutes, the best intro I have found.", "https://www.youtube.com/watch?v=s_o8dwzRlu4"),
];
const like = (k, p) => p && call(k, "POST", `/api/feed/${p.id}/like`);
const comment = (k, p, body) => p && call(k, "POST", `/api/feed/${p.id}/comments`, { body });
for (const k of ["asha", "karan", "neha", "meera", "rahul"]) await like(k, fdePosts[0]);
for (const k of ["priya", "karan", "neha"]) await like(k, fdePosts[1]);
for (const k of ["asha", "priya", "rahul", "meera"]) await like(k, fdePosts[2]);
await comment("priya", fdePosts[2], "Great write-up. Can you show it at demo day?");
await comment("karan", fdePosts[2], "Sure, I will add the before/after numbers.");
await comment("asha", fdePosts[3], "Validate, then retry once with the error message in the prompt. Works for me.");
await comment("priya", fdePosts[4], "Welcome, Meera! Ping me with any questions.");
for (const k of ["karan", "arjun"]) await like(k, devPosts[0]);
await like("rahul", devPosts[1]);
await comment("rahul", devPosts[1], "Nice. Add it to the team wiki?");

console.log("7. Reminders (catch-up runs when each person opens the app)");
for (const k of Object.keys(P)) await call(k, "GET", "/api/notifications");

const order = ["karan", "asha", "neha", "meera", "arjun", "priya", "rahul", "admin"];
const personas = order.map((k) => `${P[k].name.split(" ")[0].replace(/[(),:]/g, "")}:${P[k].tok}`).join(",");
console.log(`\nDone. Programs: ${all.map((p) => p.name).join(", ")}`);
console.log(`Sign in (dev build only): ${WEB}/#personas=${encodeURIComponent(personas)}`);
