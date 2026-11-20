# Instructions for AI agents (frontend)

These are the rules AI coding agents follow in this repository. The owner keeps a local copy (`CLAUDE.md`) and a local task list (`TASKS.md`); both are git-ignored. This file is the shareable version.

This is the **frontend** of the Programs V3 product (invite-only learning programs: plan, daily and program status, Excel reports, social feed): React 18 + Vite + TypeScript, deployed on Vercel. The **backend** is a separate repository, `shr1-live/fde-tracker-apiv2` (local folder `D:/Downloads/fde-tracker-apiv2`). The two talk only through the API contract in that repository, `docs/PROGRAMS-V3.md`: if a screen needs a different API shape, change the contract and the backend first.

## Rules

- Read the task list before work; update it after (tick items, recount, change "Last updated").
- Production product: precise, small, reviewed changes. No unrelated refactors.
- Free tiers only. Never ask for, print, log or commit a secret. Only public settings (API address, Supabase URL and publishable key) may go in `.env.production`.
- Git flow: new branch from `develop` -> pull request into `develop` -> `develop` into `main` deploys (Vercel). Agents never push to `develop` or `main`; the owner merges.
- Few, big pushes: every push builds on Vercel. Commit locally; push once per finished, reviewed change.
- Per task: plan -> add tasks -> build -> self-review with the review agents -> push -> give compare links -> tick tasks.
- Design: follow [DESIGN.md](DESIGN.md). Tokens live once at the top of `src/styles.css`. WCAG 2.2 AA, light and dark, phone width with no sideways scroll (iPhone, Android, tablet, laptop, wide).
- Security: no `dangerouslySetInnerHTML`; user-supplied links are https only and open with `rel="noopener noreferrer"`; every permission is enforced by the API, so hiding a button is a convenience, never the protection; the Content-Security-Policy in `vercel.json` must keep working (fonts only from fonts.googleapis.com and fonts.gstatic.com, no new external origins).
- `npx tsc --noEmit` and `npm run build` must pass before a push. Browser checks use Playwright + axe; report exact counts and never call a run green that was not.
- Do not say "deployed" until the Vercel status of that commit and the live bundle have been checked.

## Agents (`.claude/agents/`)

| Agent | Use it for |
|---|---|
| `architect` | Planning a change before code (read-only) |
| `frontend-dev` | Pages, components, data layer |
| `ui-ux-designer` | Screen design and screenshot critique |
| `qa-engineer` | Playwright + axe, device checks, live checks |
| `code-reviewer` | Diff review before a pull request (read-only) |
| `security-reviewer` | XSS, links, CSP, permissions-in-UI review (read-only) |
| `devops` | Vercel setup, CI, live checks |
| `docs-writer` | README, `docs/`, design notes |
| `task-manager` | Task list, branches, compare links |
| `backend-dev` | Not used in this repository (it works in the backend repository) |

## Guardrails for AI work

- `.claude/settings.json` denies reading `.env` files and keys, force-pushes, pushes to `main` or `develop`, and `reset --hard`.
- `.claude/hooks/block-secrets.mjs` blocks any write that looks like a secret.
- CI (`.github/workflows/ci.yml`) type-checks, builds, audits packages and scans the whole history for secrets.
- A human reads, runs and merges every change. AI output is validated (type-check, build, browser checks, screenshots), not trusted.

## Docs

- Design system: [DESIGN.md](DESIGN.md)
- Product: [docs/PRODUCT.md](docs/PRODUCT.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Standards: [docs/STANDARDS.md](docs/STANDARDS.md)
- How AI was used: [docs/AI-DEVELOPMENT.md](docs/AI-DEVELOPMENT.md)
- QA: [docs/QA.md](docs/QA.md)
- Security: [docs/SECURITY.md](docs/SECURITY.md)
- Delivery: [docs/DELIVERY.md](docs/DELIVERY.md)
- Decisions: [docs/DECISIONS.md](docs/DECISIONS.md)
- Disclosure of earlier work: [docs/DISCLOSURE.md](docs/DISCLOSURE.md)
- API contract: in the backend repository, `docs/PROGRAMS-V3.md`

The product-level docs (product, architecture, AI development, decisions, disclosure) are kept identical in both repositories; the backend repository is the source of truth for them.
