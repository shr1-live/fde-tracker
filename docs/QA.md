# Quality and testing (frontend)

AI agents wrote and ran most checks. The owner checked the numbers, looked at screenshots and asked for runs against the real API. The API tests (xUnit, 264 pass) are described in the [backend repository](https://github.com/shr1-live/fde-tracker-apiv2/blob/main/docs/QA.md).

## Layers

| Layer | Tool | Size | Runs |
|---|---|---|---|
| Types and build | `npx tsc --noEmit`, `npm run build` | Both must pass | Before every push; also in CI |
| Browser checks, mocked API | Playwright (Edge) + axe-core | 166 of 166 checks pass; axe 0 violations in light, dark and phone | Before every push of web changes |
| Browser checks, real API | Playwright against a local API and Postgres | 105 of 106 passed; the one failure was fixed (typed text wiped on a slow load) | Before the feed and design push |
| Review | `code-reviewer` and `security-reviewer` agents | Last round: 0 serious findings, 4 small ones fixed | Before every push |
| Live checks | curl and browser | Signed-out 401, CORS, security headers, served bundle | After a deploy |

Playwright and axe are installed in a scratch folder, not in the repo, so the repo has no browser test files.

## Browser checks

- Every V3 page at phone and desktop width, light and dark.
- axe (WCAG 2.2 AA) on each page; fail on any page error or sideways scroll.
- Flows: post, like, comment, edit, delete, copy link, single post page, sort, filter, search, load more; fill and save daily and program status; unsaved-change warning; reports and download.


## How AI output was checked

- Screenshots were looked at by the designer agent and the owner, not only the test result.
- A mocked run is not enough: the real-API run found a bug the mocks hid.
- When a test failed, the cause was found before the test was changed (for example, the UTC date bug was in the test, not the app).

## Not automated

- No browser tests in CI; they run on the developer's machine. CI (`.github/workflows/ci.yml`) runs the type check, the build, `npm audit` and a secret scan. It has not been checked on GitHub from this split yet.
- Real phones (iOS Safari, Android Chrome) are checked by hand, not by tests.
- Supabase sign-in emails are checked by hand.
