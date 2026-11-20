# FDE Tracker: web app (Programs V3 frontend)

An invite-only platform for running several learning programs (FDE, DevOps, ...). This repository is the **frontend**; the backend is [`fde-tracker-apiv2`](https://github.com/shr1-live/fde-tracker-apiv2).

- **Feed** (home page): post text or a link, YouTube plays in place; like, comment, sort, filter, search.
- **Programs:** the admin creates them. Each has coordinators (full access to that program) and members.
- **Plan:** week, then day, then topics and practical task, with a "completed" tick per day.
- **Daily status** and **program status:** forms the coordinator defines; each field has an (i) button with its description.
- **Reports:** daily and program-wise, downloadable as Excel in the same layout as the training sheets.

| | |
|---|---|
| Stack | React 18, Vite, TypeScript, Lucide icons; Inter |
| Runs on | Vercel: https://fde-tracker-green.vercel.app |
| Talks to | the API at `VITE_API_URL` (Render), signed in with Supabase |
| Design | [DESIGN.md](DESIGN.md) |
| Docs | [docs/](docs/) and [AGENTS.md](AGENTS.md) |

## Run locally

You need Node 20 or later, and the API running (see the backend repository's README).

```powershell
npm ci
$env:VITE_API_URL = "http://localhost:5077"   # where your local API listens
npm run dev                                   # http://localhost:5173
```

Without Supabase settings the app runs in local mode: type any office email on the sign-in page. In a development build a "Test account" box lets you act as admin, coordinator or member against a local API.

Checks before a push: `npx tsc --noEmit` and `npm run build`.

## Deploy (Vercel)

Import this repository in Vercel. Nothing else needs setting: Vite is detected, [`vercel.json`](vercel.json) sends the security headers (Content-Security-Policy and more), and [`.env.production`](.env.production) holds only public build settings (API address, Supabase URL and publishable key). In Supabase, add the site address to Authentication, then URL Configuration, then Redirect URLs.

If the API moves to a different address, change `VITE_API_URL` in `.env.production` and the `connect-src` entry in `vercel.json`.

Secrets (database passwords, service keys, model keys) never go into this repository.

## Working rules

New branch from `develop`, pull request into `develop`, and `develop` into `main` deploys. CI (type-check, build, audit, secret scan) runs on every pull request.
