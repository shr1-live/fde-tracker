# Engineering standards

These are the rules the code follows today, not goals.

## API (`api/`)

- **Layers:** Controllers -> Services -> Repositories.
  - Controllers handle HTTP only: read the request, call a service, return a view model.
  - Services hold the rules: validation, limits, per-program role checks, transactions.
  - Repositories hold all SQL (Dapper). One class per table group.
- **SQL:** parameterised only. No string-built SQL with user input. Search treats `%` and `_` as plain characters.
- **JSON:** snake_case in and out. Unknown fields are refused. Errors use `{ "error": "..." }` and never leak internals.
- **Validation:** every input is checked on the server (lengths, types, https-only links, date ranges), even when the web app checks it too.
- **Migrations:** numbered SQL files in `api/migrations/`, run once each at start-up. Each is idempotent (`if not exists`, guarded `alter`), turns RLS on and revokes the public roles for new tables.
- **Tests:** xUnit integration tests against a real Postgres (Testcontainers). Every rule and every permission check gets a test.

## Web (`web/`)

- **Design tokens** live once, at the top of `web/src/styles.css`. Pages use tokens only. [DESIGN.md](../DESIGN.md) is the source of truth.
- **API calls** go through one client module (`web/src/lib/`), which adds the token and handles errors.
- **Pages are lazy-loaded** so each page is its own chunk.
- **Accessibility (WCAG 2.2 AA):**
  - a label on every control; words as well as colour for status;
  - text contrast 4.5:1, control borders and focus rings 3:1;
  - visible focus; focus moves to the main region on page change;
  - targets 24 px or larger; no sideways scroll from 320 px wide;
  - light and dark mode; reduced motion respected.
- **Checks before a PR:** `npx tsc --noEmit`, `npm run build`, browser check in light, dark and phone width.

## Git and delivery

- New branch from `develop` for every change -> pull request into `develop` -> `develop` into `main` deploys.
- Nobody (and no AI agent) commits straight to `develop` or `main`. The owner merges.
- Few, big pushes. Every push starts a Vercel and Render build on free quotas, so work is committed locally and pushed once per finished, reviewed change.
- Commit messages say what changed and why, in plain words.
- Secrets never go in the repo. Only public settings go in `web/.env.production`.

## Writing

Plain English, short sentences, sentence case. Buttons say what happens ("Save status"). Docs state limits and what is not done.
