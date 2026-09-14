# PRD merge status — 14 September 2026

This note records what was safely merged from the overnight PRD work and what is intentionally not implemented in the prototype. It does **not** change any PRD requirement to done.

## Merged

| Item | Evidence | Status |
|---|---|---|
| Product requirements and delivery tracker | `ARCEL-Codeworks-PRD.md`, `DELIVERY-TRACKER.md` | Merged as the planning source of truth |
| WP-01 architecture and security/NFR audits | `docs/WP-01-ARCHITECTURE.md`, `docs/WP-01-SECURITY-NFR-GATE.md` | Merged as R0 evidence; WP-01 remains in progress |
| D03 clickable flows | `docs/flows/FLOW-MAP.md`, `docs/flows/prototype/index.html` | Merged as a non-production design prototype |
| PRD §22 honesty corrections | `app.js`, `api/chat.js`, `.env.example` | Implemented: Auto/effort labels, no fake research, manual-only Compare, no silent context truncation, and explicit internal-demo gate for unauthenticated generation |

## Blocked before public generation

| Requirement group | Why it cannot be merged safely now | Required decision or infrastructure |
|---|---|---|
| SEC-01 / ACC-01 | There is no identity provider, session model, workspace membership, or authorization store. | Choose and configure an auth provider plus personal-workspace schema. |
| REL-03 / BIL-01 | No transactional database or append-only usage ledger exists. | Provision Postgres and approve a metering/reservation design. |
| FIL / PRJ persistence | Files, projects, and chats have no private object storage or access control. | Choose storage, retention policy, and signed-access model. |
| SRC-01–07 | Research currently has no retrieval, source registry, or citation verifier. | Approve search/retrieval provider and private-data policy. |
| MOD-01–06 | A real model registry, evaluation data, cost policy, and verified catalog do not exist. | Complete D04 provider spike and approve model routing rules. |
| Preview CI / Git deploy | Vercel deployment works directly, but GitHub auto-deploy could not be linked with the currently authenticated GitHub permissions. | Grant Vercel write/admin access to `swapnil-create/arcel-codeworks` and approve preview/prod policy. |

## Explicitly not represented as complete

Voice, file analysis, code execution, artifact creation, connectors, tasks, sharing, teams, billing, and AEC packs remain future PRD work packages. The interface must continue to mark unavailable capabilities clearly instead of simulating their outcomes.
