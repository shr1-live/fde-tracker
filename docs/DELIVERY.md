# Delivery (frontend)

This page covers the frontend repository. The API is deployed from its own repository: see its [delivery page](https://github.com/shr1-live/fde-tracker-apiv2/blob/main/docs/DELIVERY.md).

## Environments

| Environment | Web | API | Database |
|---|---|---|---|
| Local | `npm run dev` on http://localhost:5173 | `dotnet run` on http://localhost:5077 | Postgres 16 in Docker |
| Production | https://fde-tracker-green.vercel.app (Vercel, from `main` of `fde-tracker-appv2`) | https://fde-tracker-v3-api.onrender.com (Render, from `main` of `fde-tracker-apiv2`) | Supabase Postgres |

There is no separate staging environment. `develop` is the integration branch in both repositories; Vercel builds preview links for frontend pull requests.

## Run locally

Needs Node 20 or later. The exact commands are in the [README](../README.md#run-locally). In short:

1. `npm ci`.
2. Set `VITE_API_URL` to the API (local: http://localhost:5077; start it from the backend repository), then `npm run dev`.
3. Checks: `npx tsc --noEmit` and `npm run build`.

## Deploy (Vercel)

Vercel imports this repository (project `fde-tracker-green`). Vite is detected, so nothing else needs setting. The root `vercel.json` rewrites routes to `index.html` and sends the security headers and CSP. `.env.production` holds only public build settings (API address, Supabase URL and publishable key). No server secret belongs here.

**Supabase.** Add the site address with `/**` to Authentication -> URL Configuration -> Redirect URLs, or sign-in links go to the Site URL instead.

## Deploy order

1. Backend first: merge, wait for Render to be live, check `/health`.
2. Then the frontend: merge, wait for Vercel to be ready, check sign-in against the live API.

Backend first, because the web app calls the API. A contract change goes out in that order. Remove a field only after the frontend no longer reads it.

## When the API address changes

1. Frontend repository: change `VITE_API_URL` in `.env.production` and the `connect-src` entry in `vercel.json`.
2. Backend: check `CORS_ORIGINS` still lists the web address.
3. Redeploy the frontend and check sign-in, `/health` and the headers.

## Migration note: the split into two repositories

Render's running service `fde-tracker-v3-api` was created from the old combined repository with Root Directory `api`. After the split it must be switched to the backend repository: Settings -> Build and Deploy -> Repository, pick `fde-tracker-apiv2`, and clear Root Directory (the `Dockerfile` and `render.yaml` are now at the repository root). Vercel project `fde-tracker-green` keeps the old repository, which is now the frontend (`fde-tracker-appv2`). Until the owner has done the Render switch and checked the live status of the new commit, the new layout is not deployed. This was not verified when this page was written.

## Planned move to the company domain

The plan is to move the web app and API to the company (55) domain. That needs, in one change:
1. the new web address in `CORS_ORIGINS` (Render, backend repository) and in the Supabase Redirect URLs;
2. the new API address in `.env.production` and in the CSP `connect-src` in `vercel.json` (frontend repository);
3. a check of sign-in, `/health` and the headers on the new addresses.

Not started yet.

## Release checklist

- [ ] Work is on a branch from `develop`; related changes grouped into one pull request.
- [ ] `npx tsc --noEmit` and `npm run build` pass.
- [ ] Browser checks with axe pass in light, dark and phone; real-API run done for flow changes.
- [ ] If the contract changed: the backend pull request is merged and live first.
- [ ] `code-reviewer` and `security-reviewer` agents have read the diff; findings fixed or written down.
- [ ] No secrets in the diff; only public settings in `.env.production`.
- [ ] One push; the owner merges into `develop`, then `develop` into `main`.
- [ ] After the merge: the Vercel status of that commit is "success"; headers present; the served bundle points at the right API.
