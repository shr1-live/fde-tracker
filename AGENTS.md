# Instructions for AI agents

These are the rules AI coding agents follow in this repository. The owner keeps a local copy (`CLAUDE.md`) and a local task list (`TASKS.md`); both are git-ignored. This file is the shareable version.

## Rules

- Read the task list before work; update it after (tick items, recount, change "Last updated").
- This repo is the V3 product (invite-only programs, plan, status, Excel reports, feed). The daily training tracker lives in other repositories; never mix the two.
- Free tiers only. Never ask for, print, log or commit a secret. Public settings (API address, Supabase publishable key) may go in `web/.env.production`.
- Git flow: new branch from `develop` -> pull request into `develop` -> `develop` into `main` deploys. Agents never push to `develop` or `main`; the owner merges.
- Few, big pushes: each push builds on Vercel and Render. Commit locally; push once per finished, reviewed change.
- Per task: plan -> add tasks -> build -> self-review with the review agents -> push -> give compare links -> tick tasks.
- Design: follow [DESIGN.md](DESIGN.md). Tokens live once in `web/src/styles.css`. WCAG 2.2 AA, light and dark, phone width with no sideways scroll.
- Security: validate every input on the server, parameterised SQL only, per-program permission checks in services, https-only links.
- Do not say "deployed" until the Vercel or Render status of that commit, the live bundle and `/health` have been checked.
- Report exact test counts. Never call a run green that was not.

## Agents (`.claude/agents/`)

| Agent | Use it for |
|---|---|
| `architect` | Planning a change before code (read-only) |
| `backend-dev` | API, migrations, xUnit tests |
| `frontend-dev` | Web pages and components |
| `ui-ux-designer` | Screen design and screenshot critique |
| `qa-engineer` | xUnit runs, Playwright + axe, live checks |
| `code-reviewer` | Diff review before a pull request (read-only) |
| `security-reviewer` | Auth, permissions, injection, secrets review (read-only) |
| `devops` | Vercel and Render setup and live checks |
| `docs-writer` | README and `docs/` |
| `task-manager` | Task list, branches, compare links |

## Docs

- Product: [docs/PRODUCT.md](docs/PRODUCT.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- API contract: [api/docs/PROGRAMS-V3.md](api/docs/PROGRAMS-V3.md)
- Standards: [docs/STANDARDS.md](docs/STANDARDS.md)
- How AI was used: [docs/AI-DEVELOPMENT.md](docs/AI-DEVELOPMENT.md)
- QA: [docs/QA.md](docs/QA.md)
- Security: [docs/SECURITY.md](docs/SECURITY.md)
- Delivery: [docs/DELIVERY.md](docs/DELIVERY.md)
- Decisions: [docs/DECISIONS.md](docs/DECISIONS.md)
- Earlier work: [docs/DISCLOSURE.md](docs/DISCLOSURE.md)
