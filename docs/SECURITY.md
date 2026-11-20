# Security

## Threat model (summary)

| Threat | Control |
|---|---|
| Someone outside the company signs in | Supabase Auth only; the API checks the email domain (`ALLOWED_DOMAIN`) and requires an invite |
| A forged or expired token | The API verifies every JWT against the Supabase issuer and signing keys |
| A member reads another member's status or reports | Per-program role checks in services; 403 for another person's data; tested |
| A coordinator acts outside their program, or undoes an admin decision | Role checked per program; invites never lift a rejection; nobody changes their own role; the admin cannot be removed |
| SQL injection | Parameterised SQL only (Dapper); search treats `%` and `_` as text |
| Bad or oversized input | Server-side validation of every field; bodies capped at 64 KB; unknown JSON fields refused |
| Script injection in the feed | React escapes text; links must be https; YouTube plays through `youtube-nocookie.com` only |
| Abuse and floods | Rate limits: 240 requests per minute per address, 40 writes per minute per person; 30 posts and 200 comments per person per day |
| Direct database access with the public key | RLS is on for every table and the `anon` and `authenticated` roles are revoked; all data goes through the API |
| Other sites calling the API | CORS allow-list (`CORS_ORIGINS`) |
| Clickjacking, content injection | Vercel headers: CSP with a short allow-list, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, HSTS, `nosniff`, Referrer-Policy, Permissions-Policy |
| Leaked secrets | No secrets in the repo; Render values are `sync: false`; only public settings in `web/.env.production`; errors never echo internals |
| Spreadsheet formula injection | Excel cells are written as plain values (text or number), never as formulas |

## Known gaps

- No dedicated test yet proves that a value starting with `=` stays text in the Excel file.
- No audit screen for program changes (who invited whom, who changed a form); the old audit log covers older admin actions only.
- Rate limits are per server instance and reset on restart.
- `style-src 'unsafe-inline'` is allowed in the CSP for inline styles.
- CI (`.github/workflows/ci.yml`: API tests, web build, vulnerable-package check, gitleaks secret scan), Dependabot and a local hook that blocks secrets in agent edits (`.claude/hooks/block-secrets.mjs`) are being added on this branch. They have not run on GitHub yet.
- Render free tier and Supabase free tier have no uptime promise.

## Reporting a problem

Do not open a public issue for a security problem. Contact the repository owner directly through GitHub (`shr1-live`) and describe what you found and how to repeat it. Please do not test against real users' data.
