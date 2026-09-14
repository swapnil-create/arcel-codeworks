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
| `fixtures/invalid-*.json` | Negative cases the CI validator must reject |
| `../../scripts/validate-data-model.mjs` | Fixture + invariant checks (no DB) |

## R0 entities in this slice

Locked now (schema + invariants only):

- **User / Workspace / Membership** — stable IDs and roles; **authorization is never derived from display names**
- **Conversation / Message** — workspace scope, optional parent/branch, content parts, timestamps; assistant response versions are immutable
- **Run / Step / ToolCall** — run states, attempts, model/registry version slots, usage placeholders
- **UsageEntry** — append-only ledger row with a unique **idempotency key**; reservation vs settlement vs release

Not implemented as writable APIs: Project, File, Source, Artifact, MemoryItem, Approval, Connection, Task.

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

## Explicitly not claimed

- No live migrations, seed jobs, or empty-state product UI bound to this store
- No metering reserve/settle execution (P5)
- No identity provider (P4)
- No `/v1/runs` implementation (D06)

*Next PRs: real Postgres + migration tests against an isolated database, then authz on every object path.*
