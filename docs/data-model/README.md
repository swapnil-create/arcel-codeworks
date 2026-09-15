# Canonical data model stubs (D05 / WP-01 P3)

**Status:** Scaffold only. **Persistence is not live.**
**Source:** [PRD §19](../../ARCEL-Codeworks-PRD.md) · [WP-01 architecture §3.1](../WP-01-ARCHITECTURE.md)
**This is not a database.** There is no Postgres instance, no object store, and no runtime that writes these records.

These files freeze the R0 shapes so later auth, run-service, and ledger PRs have somewhere to land. Do not treat fixtures as user data. Do not mark REL-03, SEC-01, D05, or WP-01 done from this folder.

## What is here

| Path | Role |
|---|---|
| `schemas/*.schema.json` | JSON Schema notes for Conversation, Message, Run, Step, ToolCall, UsageEntry, plus identity stubs (User, Workspace, Membership) |
| `migrations/0001_r0_canonical_entities.sql` | Postgres DDL **stub**. Not applied. No connection string in repo. |
| `fixtures/valid-r0-slice.json` | One connected example graph for invariant checks |
| `fixtures/sec01-isolation-slice.json` | Two-user / revoked-membership / guessed-ID graph for in-memory ACL |
| `fixtures/invalid-*.json` | Negative cases the CI validator must reject |
| `../../scripts/validate-data-model.mjs` | Fixture + invariant checks (no DB) |
| `../../lib/object-access.js` | In-memory authorize-object contract (not a live API) |

## R0 entities in this slice

Locked now (schema + invariants only):

- **User / Workspace / Membership** — stable IDs and roles; **authorization is never derived from display names**
- **Conversation / Message** — workspace scope, optional parent/branch, content parts, timestamps; assistant response versions are immutable
- **Run / Step / ToolCall** — run states, attempts, model/registry version slots, usage placeholders
- **UsageEntry** — append-only ledger row with a unique **idempotency key**; reservation vs settlement vs release

The harness R0 migration stub also introduces Project, Workflow/WorkflowVersion,
RunEvent, Approval, Artifact/ArtifactVersion, Connection, BudgetPolicy, OutboxEvent
and AuditLog. These are still **not** writable APIs and do not imply a provisioned
database, queue, worker, connector or ledger.

## Run states (locked)

`queued` → `running` → (`awaiting_approval`) → `cancelling` → terminal `completed` | `failed` | `cancelled`

- Terminal states are **immutable** except administrative reconciliation metadata.
- Retries are **linked attempts** (`parent_run_id` + incremented `attempt`), not in-place status rewinds.
- Partial content on failed/cancelled runs is a **result attribute**, not success.

## Error taxonomy (locked)

`auth_required`, `permission_denied`, `invalid_input`, `unsupported_capability`, `quota_exceeded`, `provider_unavailable`, `rate_limited`, `content_blocked`, `tool_failed`, `context_limit`, `cancelled`

Client/API mapping for the current prototype lives in `lib/generation-errors.js`. Failed generations are **run failures**, not assistant Messages.

## Invariants CI asserts

1. Required identifiers and foreign-key-shaped refs are present on the valid fixture.
2. `UsageEntry.idempotency_key` is required and unique in a fixture set.
3. A terminal Run cannot change `status` in a follow-up snapshot.
4. Message rows are not used to store `AUTH_REQUIRED` / API-not-configured copy.
5. Membership authorization fields are `user_id` + `workspace_id` + `role` — a `display_name` alone is rejected.
6. Isolation fixture: owner can read own conversation; peer cannot; guessed IDs deny; revoked membership denies; missing session is `AUTH_REQUIRED`; client-asserted names do not steal objects.

`scripts/test-sec01-isolation.mjs` also proves `/api/chat` spend uses the signed cookie only (see [AUTH.md](../AUTH.md)).

## Postgres gaps (still required for SEC-01 Pass)

In-memory fixtures **do not** replace a live database. Remaining work:

| Gap | Why a live Postgres is required |
|---|---|
| Durable User / Workspace / Membership rows | `session.sub` must map to a stored `user_id`; personal workspaces provisioned on first login |
| Row-level security or equivalent server JOIN | Every object query must filter `memberships.status = 'active'` in the database, not only in a JS fixture |
| Guessed ID / enumeration tests against real queries | Timing, 404-vs-403, and index behavior cannot be proven from JSON |
| Revoked membership races | Concurrent revoke-then-read must fail closed under transactions |
| `/api/chat` conversation ACL | Chat is ephemeral; it cannot isolate durable conversations, runs, files, or tools |
| ACC-01 session list / remote revoke | Needs a session table, not only an HMAC cookie |
| Retrieval / job / tool paths | No live object routes exist yet to authorize |

*Next PRs: real Postgres + migration tests against an isolated database, then authz on every object path.*

## Explicitly not claimed

- No live migrations, seed jobs, or empty-state product UI bound to this store
- No metering reserve/settle execution (P5)
- No identity provider in production (P4) — owner must set `AUTH_*` on Vercel ([AUTH.md](../AUTH.md))
- No `/v1/runs` implementation (D06)
