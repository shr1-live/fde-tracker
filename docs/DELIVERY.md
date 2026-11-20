# Delivery

## Environments

| Environment | Web | API | Database |
|---|---|---|---|
| Local | `npm run dev` on http://localhost:5173 | `dotnet run` on http://localhost:5077 | Postgres 16 in Docker |
| Production | https://fde-tracker-green.vercel.app (Vercel, from `main`) | https://fde-tracker-v3-api.onrender.com (Render, from `main`) | Supabase Postgres |

There is no separate staging environment. `develop` is the integration branch; Vercel builds preview links for pull requests.

## Run locally

Needs the .NET 10 SDK, Node 20 or later, and Docker. The exact commands are in the [README](../README.md#run-locally-powershell). In short:

1. Start Postgres in Docker.
2. In `api/`, set `DATABASE_URL`, `SUPABASE_URL`, `CORS_ORIGINS`, `ASPNETCORE_URLS`, then `dotnet run --project FdeTracker.Api`. Migrations run at start-up.
3. In `web/`, `npm ci`, set `VITE_API_URL`, then `npm run dev`.
4. Tests: `dotnet test` in `api/` (Docker must be running).

## Deploy

**Web (Vercel).** The root `vercel.json` installs and builds `web/`, serves `web/dist`, rewrites routes to `index.html`, and sends the security headers and CSP. `web/.env.production` holds the public settings (API address, Supabase URL and publishable key).

**API (Render).** The root `render.yaml` is a blueprint for one free Docker web service, `fde-tracker-v3-api`, built from `api/` with a health check at `/health`.

Environment variables (names only; values live in the Render dashboard):

| Name | Set where | Notes |
|---|---|---|
| `DATABASE_URL` | Render dashboard | Secret |
| `SUPABASE_URL` | Render dashboard | Used to verify sign-in tokens |
| `LLM_API_KEY`, `LLM_MODEL` | Render dashboard | Optional; only the older assistant features use them |
| `ALLOWED_DOMAIN`, `ADMIN_EMAIL`, `FREE_SEATS`, `CORS_ORIGINS` | `render.yaml` | Not secret |
| `LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_MAX_TOKENS`, `LLM_DAILY_CAP`, `ASSISTANT_SUMMARY` | `render.yaml` | Not secret |
| `RATE_LIMIT_PER_MINUTE`, `WRITE_LIMIT_PER_MINUTE` | Optional | Defaults 240 and 40 |

**Supabase.** Add the site address with `/**` to Authentication -> URL Configuration -> Redirect URLs, or sign-in links go to the Site URL instead.

## Planned move to the company domain

The plan is to move the web app and API to the company (55) domain. That needs, in one change:
1. the new web address in `CORS_ORIGINS` (Render) and in the Supabase Redirect URLs;
2. the new API address in `web/.env.production` and in the CSP `connect-src` in `vercel.json`;
3. a check of sign-in, `/health` and the headers on the new addresses.

Not started yet.

## Release checklist

- [ ] Work is on a branch from `develop`; related changes grouped into one pull request.
- [ ] `dotnet test` passes (exact count recorded).
- [ ] `npx tsc --noEmit` and `npm run build` pass in `web/`.
- [ ] Browser checks with axe pass in light, dark and phone; real-API run done for flow changes.
- [ ] `code-reviewer` and `security-reviewer` agents have read the diff; findings fixed or written down.
- [ ] New migration is idempotent and turns RLS on for new tables.
- [ ] No secrets in the diff.
- [ ] One push; the owner merges into `develop`, then `develop` into `main`.
- [ ] After the merge: Vercel and Render status of that commit is "success"; `/health` answers; signed-out calls return 401; headers present; the served bundle points at the right API.
