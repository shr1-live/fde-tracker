# FDE Tracker (full working copy)

One repository with everything from the FDE training work so far: the tracker web app, its API, the evaluation tools and the evidence for each day.
It was put together on 2026-11-19 from the `main_backup_me` branches of the two earlier repositories, keeping their full git history.

| Folder | What it is | Came from |
|---|---|---|
| [`api/`](api/) | ASP.NET Core (.NET 10) API, Postgres migrations, tests, and the `FdeTracker.Evals` tool for the daily evaluations | `shr1-live/fde-tracker-api`, branch `main_backup_me` |
| [`web/`](web/) | React + Vite web app (dashboard, week pages, assistants, practice lab, feed, reports) | `shr1-live/FDE-Learniing-Tracker`, branch `main_backup_me` |

The daily training work (Week 1 Day 5 onwards) continues here.

## Evidence for each day

| Day | Topic | Evidence |
|---|---|---|
| 1 | LLM fundamentals and model selection | [api/docs/evidence/day1.md](api/docs/evidence/day1.md) |
| 2 | Advanced prompt engineering | [api/docs/evidence/day2.md](api/docs/evidence/day2.md) |
| 3 | Structured outputs and tool calling | [api/docs/evidence/day3.md](api/docs/evidence/day3.md) |
| 4 | Evaluation, reliability and guardrails | [api/docs/evidence/day4.md](api/docs/evidence/day4.md) |

## Run it locally (PowerShell)

You need:
- .NET 10 SDK
- Node 20 or later
- Docker, for a local Postgres and for the tests
- [Ollama](https://ollama.com) with `qwen2.5:3b` pulled, for the local model

**1. Database.** Any Postgres 16 works. This starts one in Docker:

```powershell
docker run -d --name fde-pg -e POSTGRES_PASSWORD=localpass -p 5433:5432 postgres:16-alpine
```

**2. API**, from `api/`. Migrations run by themselves at start-up:

```powershell
$env:DATABASE_URL = "postgresql://postgres:localpass@localhost:5433/postgres?sslmode=disable"
$env:SUPABASE_URL = "https://<your-project>.supabase.co"
$env:CORS_ORIGINS = "http://localhost:5173"
$env:LLM_BASE_URL = "http://127.0.0.1:11434/v1"
$env:LLM_MODEL = "qwen2.5:3b"
$env:ASPNETCORE_URLS = "http://localhost:5077"
dotnet run --project FdeTracker.Api
```

Check it with http://localhost:5077/health.

**3. Web app**, from `web/`:

```powershell
npm ci
$env:VITE_API_URL = "http://localhost:5077"
npm run dev
```

Then open http://localhost:5173. Without Supabase settings the web app runs in local mode, which keeps progress in the browser.

**Tests and evaluations**, from `api/`:

```powershell
dotnet test
$env:EVAL_ONLY = "qwen2.5:3b"; dotnet run --project FdeTracker.Evals -- day4      # or day1, day2
```

`api/evals/targets.json` sets which models an evaluation uses. Keys for hosted models come only from environment variables.

## Deploying later

- **Web (Vercel):** import this repository; nothing else to set. The top-level `vercel.json` builds `web/` and sends the security headers, and `web/.env.production` holds the public settings (API address, Supabase address and publishable key). Live at https://fde-tracker-green.vercel.app.
- **API (Render):** use `api/render.yaml` and set **Root Directory** to `api` (it builds `api/Dockerfile`). Set `DATABASE_URL`, `SUPABASE_URL` and `CORS_ORIGINS` in the Render dashboard only.

Secrets (database password, model keys) never go into this repository.

## Working rules

Every change goes on a new branch from `develop`, then a pull request into `develop`. Merging `develop` into `main` deploys.
