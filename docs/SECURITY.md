# Security (frontend)

This page covers the browser side. Server-side checks (tokens, roles, SQL, validation, rate limits, RLS) are in the [backend repository](https://github.com/shr1-live/fde-tracker-apiv2/blob/main/docs/SECURITY.md); the web app never replaces them.

## Threat model (summary)

| Threat | Control |
|---|---|
| Someone outside the company signs in | Supabase Auth only; the API decides access (domain, invite). The web app only shows what the API allows |
| The public Supabase key reads data | It only covers sign-in; the backend locks every table |
| Script injection in the feed | React escapes text; links must be https; YouTube plays through `youtube-nocookie.com` only; the CSP allows no inline script |
| Clickjacking, content injection | Vercel headers from the root `vercel.json`: CSP with a short allow-list, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, HSTS, `nosniff`, Referrer-Policy, Permissions-Policy |
| Leaked secrets | No secrets in the repo; only public build settings in `.env.production` (API address, Supabase URL and publishable key) |

## Known gaps

- `style-src 'unsafe-inline'` is allowed in the CSP for inline styles.
- CI (`.github/workflows/ci.yml`: type check, build, `npm audit`, gitleaks secret scan), Dependabot and a local hook that blocks secrets in agent edits (`.claude/hooks/block-secrets.mjs`) exist in the repository. They have not been checked on GitHub from this split yet.
- Vercel, Render and Supabase free tiers have no uptime promise.
- When the API address changes, the CSP `connect-src` in `vercel.json` must change too, or the browser blocks the calls.

## Reporting a problem

Do not open a public issue for a security problem. Contact the repository owner directly through GitHub (`shr1-live`) and describe what you found and how to repeat it. Please do not test against real users' data.
