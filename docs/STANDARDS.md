# Engineering standards

These are the rules the code follows today, not goals. They cover the frontend. The backend rules are in the [backend repository](https://github.com/shr1-live/fde-tracker-apiv2/blob/main/docs/STANDARDS.md).

## Web app (this repository)

- **Design tokens** live once, at the top of `src/styles.css`. Pages use tokens only. [DESIGN.md](../DESIGN.md) is the source of truth.
- **API calls** go through one client module (`src/lib/`), which adds the token and handles errors.
- **Pages are lazy-loaded** so each page is its own chunk.
- **Accessibility (WCAG 2.2 AA):**
  - a label on every control; words as well as colour for status;
  - text contrast 4.5:1, control borders and focus rings 3:1;
  - visible focus; focus moves to the main region on page change;
  - targets 24 px or larger; no sideways scroll from 320 px wide;
  - light and dark mode; reduced motion respected.
- **Checks before a PR:** `npx tsc --noEmit`, `npm run build`, browser check in light, dark and phone width.

- **Links and text from users:** React escapes text; links are shown only when they are https; embeds only from `youtube-nocookie.com`.
- **API contract:** the web app follows the [API contract](https://github.com/shr1-live/fde-tracker-apiv2/blob/main/docs/PROGRAMS-V3.md) in the backend repository. A contract change starts there.

## Git and delivery

- New branch from `develop` for every change -> pull request into `develop` -> `develop` into `main` deploys.
- Nobody (and no AI agent) commits straight to `develop` or `main`. The owner merges.
- Few, big pushes. Every push starts a Vercel build on a free quota, so work is committed locally and pushed once per finished, reviewed change.
- Commit messages say what changed and why, in plain words.
- Secrets never go in the repo. Only public build settings go in `.env.production`.

## Writing

Plain English, short sentences, sentence case. Buttons say what happens ("Save status"). Docs state limits and what is not done.
