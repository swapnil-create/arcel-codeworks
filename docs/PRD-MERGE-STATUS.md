# PRD merge status — 14 September 2026

This note records what was safely merged from the overnight PRD work and what is intentionally not implemented in the prototype. It does **not** change any PRD requirement to done.

## Merged

| Item | Evidence | Status |
|---|---|---|
| Product requirements and delivery tracker | `ARCEL-Codeworks-PRD.md`, `DELIVERY-TRACKER.md` | Merged as the planning source of truth |
| WP-01 architecture and security/NFR audits | `docs/WP-01-ARCHITECTURE.md`, `docs/WP-01-SECURITY-NFR-GATE.md` | Merged as R0 evidence; WP-01 remains in progress |
| D03 clickable flows | `docs/flows/FLOW-MAP.md`, `docs/flows/prototype/index.html` | Merged as a non-production design prototype |
| PRD §22 honesty corrections | `app.js`, `api/chat.js`, `.env.example` | Implemented: Auto/effort labels, no fake research, manual-only Compare, no silent context truncation, and explicit internal-demo gate for unauthenticated generation |
| D05 honesty / CI / schema scaffold | `app.js`, `lib/generation-errors.js`, `.github/workflows/ci.yml`, `docs/PREVIEW-CI.md`, `docs/data-model/` | In progress on D05: blocked generation uses Flow G-style banners (`AUTH_REQUIRED`, API-not-configured); PR static checks; schema stubs. Persistence, production IdP, and protected preview remain **not built**. |
| D05 session auth gate | `lib/session.js`, `api/auth/*`, `api/chat.js`, [AUTH.md](./AUTH.md) | Signed session cookie required before OpenRouter spend. Fail-closed without `AUTH_SECRET` + OAuth env. **SEC-01 still Fail.** |

## Blocked before public generation

| Requirement group | Why it cannot be merged safely now | Required decision or infrastructure |
|---|---|---|
| SEC-01 / ACC-01 | Session cookie gate exists; there is still no production IdP, workspace membership store, or cross-user isolation tests. | Configure AUTH_SECRET + OAuth on Vercel ([AUTH.md](./AUTH.md)); add personal-workspace schema and ACC-01 tests. |
| REL-03 / BIL-01 | No transactional database or append-only usage ledger exists. | Provision Postgres and approve a metering/reservation design. |
| FIL / PRJ persistence | Files, projects, and chats have no private object storage or access control. | Choose storage, retention policy, and signed-access model. |
| SRC-01–07 | Research currently has no retrieval, source registry, or citation verifier. | Approve search/retrieval provider and private-data policy. |
| MOD-01–06 | A real model registry, evaluation data, cost policy, and verified catalog do not exist. | Complete D04 provider spike and approve model routing rules. |
| Preview CI / Git deploy | Vercel deployment works directly. In-repo PR CI scaffold exists (`docs/PREVIEW-CI.md`). GitHub auto-deploy and branch protection could not be linked with the currently authenticated GitHub permissions. | Grant Vercel write/admin access to `swapnil-create/arcel-codeworks`, require the CI workflow, and approve preview/prod policy. Do **not** enable `OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO` on shared URLs. |

## Explicitly not represented as complete

Voice, file analysis, code execution, artifact creation, connectors, tasks, sharing, teams, billing, and AEC packs remain future PRD work packages. The interface must continue to mark unavailable capabilities clearly instead of simulating their outcomes.
