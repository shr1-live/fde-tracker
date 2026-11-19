# FDE Tracker V3

An invite-only platform for running several learning programs (FDE, DevOps, ...), built from the lead engineer's review on 2026-11-19.

- **Feed** (home page): anyone posts text or a link (YouTube plays in place), likes and comments.
- **Programs:** the admin creates them. Each program has **coordinators** (full access to that program) and **members**. One person can be a member of one program and a coordinator of another.
- **Plan:** week, then day, then topic, topics to cover and an optional practical task, with a "completed" checkbox per day.
- **Daily status** and **program status:** forms the coordinator defines. Each field has an (i) button with its description.
- **Reports:** daily and program-wise, downloadable as Excel in the same layout as the training sheets.

The contract between the two parts is [api/docs/PROGRAMS-V3.md](api/docs/PROGRAMS-V3.md).

| Folder | What it is |
|---|---|
| [`api/`](api/) | ASP.NET Core (.NET 10) API, Postgres migrations, tests |
| [`web/`](web/) | React + Vite web app |

Both folders keep their full git history from the earlier repositories (`fde-tracker-api` and `FDE-Learniing-Tracker`, branch `feature/programs-v3`).

## Deploy

- **Web (Vercel):** import this repository. Nothing else needs setting: the top-level `vercel.json` builds `web/` and sends the security headers, and `web/.env.production` holds the public settings. Live at https://fde-tracker-green.vercel.app.
- **API (Render):** New, then Blueprint, then this repository. The top-level `render.yaml` creates the `fde-tracker-v3-api` service from `api/`. In the Render dashboard, set `DATABASE_URL` (Supabase connection string), `SUPABASE_URL`, and optionally `LLM_API_KEY` / `LLM_MODEL`. The web app expects the API at https://fde-tracker-v3-api.onrender.com; if Render gives a different address, change `web/.env.production` and the `connect-src` entry in `vercel.json`.
- **Supabase:** under Authentication, then URL Configuration, add `https://fde-tracker-green.vercel.app/**` to the Redirect URLs.

Secrets (database password, model keys) never go into this repository.

## Run locally (PowerShell)

You need the .NET 10 SDK, Node 20 or later, and Docker.

```powershell
docker run -d --name fde-pg -e POSTGRES_PASSWORD=localpass -p 5433:5432 postgres:16-alpine

# API, from api/ (migrations run at start-up)
$env:DATABASE_URL = "postgresql://postgres:localpass@localhost:5433/postgres?sslmode=disable"
$env:SUPABASE_URL = "https://<your-project>.supabase.co"
$env:CORS_ORIGINS = "http://localhost:5173"
$env:ASPNETCORE_URLS = "http://localhost:5077"
dotnet run --project FdeTracker.Api

# Web, from web/
npm ci
$env:VITE_API_URL = "http://localhost:5077"
npm run dev
```

Tests: `dotnet test` in `api/`. It needs Docker, because each test run starts its own Postgres.

## Working rules

Every change goes on a new branch from `develop`, then a pull request into `develop`. Merging `develop` into `main` deploys.
