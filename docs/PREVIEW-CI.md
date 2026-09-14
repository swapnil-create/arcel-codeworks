# Preview CI and protected deploy expectations (D05 / WP-01 P2)

**Status:** In-repo CI **scaffold**. Protected preview / production policy is **not complete**.
**Does not satisfy** the WP-01 exit gate by itself. Owner actions below are still required.

## What this repo now runs on pull requests

Workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) → `node scripts/ci-check.mjs`

The check is dependency-free (no `package.json` / npm install) and matches this vanilla HTML + Vercel function repo:

| Check | Intent |
|---|---|
| `node --check` on `api/`, `app.js`, `lib/`, `scripts/` | Syntax |
| JSON parse `vercel.json` + data-model schemas/fixtures | Static validity |
| Data-model invariant fixtures | P3 stubs are coherent (not a live DB) |
| Generation-gate unit checks | `AUTH_REQUIRED` without a session (including omitted headers); API-not-configured without keys |
| Session / OAuth fail-closed | Signed cookie required; demo flag, bearer tokens, and client-asserted names cannot spend |
| SEC-01 isolation matrix | Missing/tampered/expired/wrong-secret cookies; guessed IDs and revoked memberships in fixtures (not a live DB) |
| Demo-flag scan | Tracked runtime paths must not set `OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO=true` |
| Secret scan | Reject committed `.env` (except `.env.example`) and obvious key material |

This is **not** typecheck, authz tests, ledger idempotency tests, or a secret-rotation exercise.

## Protected preview expectations (owner)

Until GitHub→Vercel auto-deploy is linked with sufficient permissions (see [PRD merge status](./PRD-MERGE-STATUS.md)), treat these as the required policy even if automation is incomplete:

| Environment | Provider key | `OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO` | Generation |
|---|---|---|---|
| **PR preview** | Restricted / capped key **or none** — never the production OpenRouter key | **`false`** | Requires a valid signed session (`AUTH_REQUIRED` or API-not-configured otherwise). No public unauthenticated spend. |
| **Production** | Separate credentials; promote only with **manual approval** | **`false`** | Same session gate. **Owner action:** configure `AUTH_SECRET` + OAuth using the [AUTH.md Vercel owner checklist](./AUTH.md) before enabling a paid key. Do not flip the demo flag on the public URL. |
| **Internal demo** | Tightly capped key, IP allowlist or equivalent | **Do not use.** The flag is not a session and cannot authorize spend. | Use a real signed-in session instead. |

`OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO` is **not** an identity provider and **not** a spend bypass. Do not enable it on any shared path.

## Branch protection (requested, not configured by this PR)

This PR cannot enable GitHub rulesets. Swapnil / repo admins should require:

1. The `CI` workflow to pass on PRs into `main`
2. No direct pushes to `main` (PR-only)
3. Manual production promote on Vercel; rollback is redeploy previous deployment
4. Preview env vars reviewed so production `OPENROUTER_API_KEY` is not reused

## Still blocked (honest)

- Vercel Git integration write/admin access was not available to the merge-status author
- Auth provider env (`AUTH_SECRET`, OAuth client) is **not** configured in production yet — session code fails closed. Owner must complete the [AUTH.md Vercel owner checklist](./AUTH.md) before OpenRouter on production.
- No migration tests against a real database; in-memory isolation fixtures exist, but Postgres-backed cross-user object ACL tests do not (SEC-01 remains Fail)
- No observability dashboards (OPS-01)

*CI scaffold ≠ protected preview pipeline done.*
