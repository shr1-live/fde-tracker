# Quality and testing

AI agents wrote and ran most tests. The owner checked the numbers, looked at screenshots and asked for runs against the real API.

## Layers

| Layer | Tool | Size | Runs |
|---|---|---|---|
| API integration tests | xUnit + Testcontainers (a real Postgres per run) | 264 tests pass (`dotnet test` in `api/`) | Before every push; needs Docker |
| Browser checks, mocked API | Playwright (Edge) + axe-core | 166 of 166 checks pass; axe 0 violations in light, dark and phone | Before every push of web changes |
| Browser checks, real API | Playwright against a local API and Postgres | 105 of 106 passed; the one failure was fixed (see below) | Before the feed and design push |
| Review | `code-reviewer` and `security-reviewer` agents | Last round: 0 serious findings, 4 small ones fixed | Before every push |
| Live checks | curl and browser | `/health`, 401 when signed out, CORS, security headers, served bundle | After a deploy |

Playwright and axe are installed in a scratch folder, not in the repo, so the repo has no browser test files.

## What the API tests cover

- **Permissions (negative tests):** a member reading another person's status gets 403; a person outside a program gets 403 or 404; only coordinators and the admin can change plans, forms and members; only the author can edit a post; nobody can change or remove themselves; the admin account cannot be removed.
- **Invite-only:** unknown emails stay pending; invites become memberships at sign-in; an invite never lifts a rejection.
- **Validation:** unknown form keys, wrong types, values out of range, http (not https) links, dates outside 2020-01-01 to tomorrow, too-long text; bad feed sort, kind, limit, search or cursor give 400.
- **Edge cases:** keyset paging with equal counts and equal times; a cursor from another sort; `%` and `_` in search are literal; days with nothing filled in show as not started; Excel files read back (file name, sheets, layout); the daily post limit (30).
- **Data rules:** counters stay right after likes and comments are added and removed; RLS is on and public roles are revoked for every table.

## Browser checks

- Every V3 page at phone and desktop width, light and dark.
- axe (WCAG 2.2 AA) on each page; fail on any page error or sideways scroll.
- Flows: post, like, comment, edit, delete, copy link, single post page, sort, filter, search, load more; fill and save daily and program status; unsaved-change warning; reports and download.

## How AI output was checked

- Tests are run every time; the exact pass count is reported, never "should pass".
- Screenshots were looked at by the designer agent and the owner, not only the test result.
- A mocked run is not enough: the real-API run found a bug the mocks hid (typed text wiped on a slow load).
- When a test failed, the cause was found before the test was changed (for example, the UTC date bug was in the test, not the app).

## Not automated

- No browser tests in CI; they run on the developer's machine. A CI workflow for the API tests and the web build is being added on this branch and has not run on GitHub yet.
- No load test. Feed paging and indexes were designed for scale but not measured under load.
- No test opens the Excel files in Excel itself; tests read them back with ClosedXML.
- Real phones (iOS Safari, Android Chrome) are checked by hand, not by tests.
- Supabase sign-in emails are checked by hand.
