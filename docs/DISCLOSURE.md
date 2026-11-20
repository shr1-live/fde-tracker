# Disclosure of earlier work

This product did not start from zero during the hackathon.

| Period | Work | Where |
|---|---|---|
| From 2026-11-13 | The owner's FDE learning tracker: a personal training tracker (plan, content feed, assistants, practice lab, reports) | Repositories `FDE-Learniing-Tracker` (web) and `fde-tracker-api` (API) |
| From 2026-11-19 | Programs V3, after a lead engineer's video review: invite-only programs, coordinators and members, plan, daily and program status, reports with Excel, social feed | Built on branch `feature/programs-v3` in both earlier repositories |
| 2026-11-19 | V3 moved into this repository | `web/` and `api/` were imported with their full git history, so every earlier commit is visible here |
| 2026-11-19 onwards | Feed at scale, design system and restyle, mobile and feed work | This repository |

What was reused from the earlier tracker:
- the API structure (MVC layers, middleware, rate limits, security headers, migration runner, test fixture);
- migrations 001-009 (users, older features, RLS lock-down);
- the web app's sign-in, API client and build setup.

What is new in V3: migrations 010 and 011, programs, roles, invites, plan, forms, status, reports, Excel exports, the feed as it is now, and the design system.

The older features (assistants, practice lab, study notes, old reports) are still in the API code but are not part of the V3 web app. They are not part of this submission.

The product was built by the owner working with AI agents (Claude Code); see [AI-DEVELOPMENT.md](AI-DEVELOPMENT.md).
