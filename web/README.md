# FDE Learning Tracker

A learning tracker for the company FDE (forward deployed engineer) programme. It holds the standard six-week outline, a ten-day fast-track plan built one layer a day, a stack guide for .NET, MERN/Node, Java and Python, and a curated .NET path. Anyone with an office email can sign in and track their own progress.

Built with React, TypeScript and Vite. Sign-in and storage use Supabase (email link, no passwords). Without Supabase configured, the app still works in local mode and saves progress in the browser only.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173 and sign in with any address at the allowed domain. With no `.env.local`, progress is saved in your browser.

## Turn on shared sign-in and the team board (Supabase)

1. Create a free project at https://supabase.com.
2. In **SQL Editor**, paste and run `supabase/schema.sql`. If your office email domain is not `fiftyfivetech.io`, change it in the `is_office_user()` function first. The policies restrict every row to that domain, so the check holds even if someone bypasses the page.
3. In **Authentication > Providers**, keep Email enabled (magic link). In **Authentication > URL Configuration**, set **Site URL** to your Vercel URL and add it to **Redirect URLs**. Add `http://localhost:5173` for local testing.
4. In **Project Settings > API**, copy the project URL and the anon public key.

## Deploy on Vercel

1. Import this GitHub repo in Vercel. Framework preset: Vite. Build command `npm run build`, output `dist` (defaults).
2. Add environment variables under Project Settings > Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ALLOWED_DOMAIN` (default `fiftyfivetech.io`)
3. Deploy. `vercel.json` already rewrites all routes to the app.

The anon key is meant to be public. Never put the service role key in this project.

## Where things are

| Path | What |
|---|---|
| `src/data/plan.json` | Ten-day plan: days, links, build steps, practice, done checks |
| `src/data/outline.ts` | Six-week outline text from the company PDF |
| `src/data/stacks.ts` | Stack guide for each language (only links that loaded when checked) |
| `src/lib/store.tsx` | Sign-in, saving, team board |
| `public/docs/` | The six-week outline PDF and repo scaffold (public). The ten-day plan and playbook PDFs are admin-only in a private Supabase bucket, see `supabase/private-docs.sql` |
| `supabase/schema.sql` | Tables and row-level security |

## Notes

- Videos were checked to exist and match their titles; they were not watched. Reading links were opened when checked.
- The ten-day plan steps are written for .NET. Other stacks see the same plan with a banner and use the Stack guide for equivalents.
- Edit `src/data/plan.json` to change content; no code changes needed.
