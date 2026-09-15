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

Not implemented as writable APIs: Project, File, Source, Artifact, MemoryItem, Approval, Connection, Task.

## Schema reference (field-by-field)

These are JSON Schema **notes**, not DDL and not a live validator surface. Every schema sets
`additionalProperties: false`, and IDs use a typed prefix (e.g. `conv_`, `run_`) enforced by a
`pattern`. `docs/data-model/schemas` is checked by `scripts/validate-data-model.mjs`, a small
hand-rolled walker — **there is no database, no ACL enforcement, and no row-level security
behind these files.** Timestamps are `date-time` strings, not stored rows.

- **`user.schema.json`** (`user_`): `id`, `status` (`active` | `disabled` | `deleted`),
  `created_at` required; optional `display_name`. A display name is descriptive only and is
  **never** an authorization input.
- **`workspace.schema.json`** (`ws_`): `id`, `kind` (`personal` | `team`), `status`
  (`active` | `suspended` | `deleted`), `created_at` required; optional `name`. Personal vs team
  is a shape distinction only; nothing provisions or persists workspaces yet.
- **`membership.schema.json`** (`mem_`): `id`, `user_id`, `workspace_id`, `role`
  (`owner` | `member` | `viewer`), `status` (`active` | `revoked`) required. Authorization is
  derived from `user_id` + `workspace_id` + `role` + `status` — the schema deliberately has no
  place for a `display_name`, so a name-only membership is rejected.
- **`conversation.schema.json`** (`conv_`): `id`, `workspace_id`, `created_by_user_id`, `status`
  (`active` | `archived` | `deleted`), `created_at`, `updated_at` required; optional `title` and
  `parent_conversation_id` (branch pointer). Scope is the workspace; ownership does not by itself
  grant cross-workspace reads.
- **`message.schema.json`** (`msg_`): `id`, `conversation_id`, `role`
  (`user` | `assistant` | `system`), `parts` (≥1 item, each `text` or `refusal`), `version`
  (≥1), `created_at` required; optional `parent_message_id` and `run_id`. Assistant response
  versions are immutable, and generation failures must be **Run errors, not Messages** — an
  assistant message carrying gate copy (e.g. "OpenRouter is not configured") is rejected by the
  validator.
- **`run.schema.json`** (`run_`): `id`, `conversation_id`, `workspace_id`, `actor_user_id`,
  `status`, `task_type` (`chat` | `compare` | `research` | `code`), `attempt` (≥1),
  `idempotency_key` (≥8 chars), `created_at`, `updated_at` required; optional `model_selection`
  (`mode` `auto`/`named`, `effort` `quick`/`standard`/`deep`, `named_model_id`), `parent_run_id`
  (retry linkage), `partial_content`, `error` (taxonomy/code/retryable/request_id), and
  `terminal_at`. Run `status` moves `queued → running → (awaiting_approval) → cancelling →`
  terminal `completed`/`failed`/`cancelled`; terminal rows are treated as immutable.
- **`step.schema.json`** (`step_`): `id`, `run_id`, `ordinal` (≥1), `kind`
  (`policy` | `model` | `tool`), `status` required; optional `model_registry_version`,
  `started_at`, `ended_at`. Steps are ordered children of a run.
- **`tool-call.schema.json`** (`tool_`): `id`, `step_id`, `run_id`, `name`, `status`
  (`pending` | `completed` | `failed`) required; optional `arguments_ref` / `result_ref`
  (references only — no payloads or blobs are stored here).
- **`usage-entry.schema.json`** (`use_`): `id`, `idempotency_key` (≥8 chars, unique within a
  fixture set), `run_id`, `workspace_id`, `kind` (`reservation` | `settlement` | `release`),
  `status` (`reserved` | `settled` | `released`), `created_at` required; optional `provider`,
  `provider_cost_usd` (string), `user_charge_units`. This is the append-only ledger **shape**;
  the prototype does not meter, reserve, settle, or bill.

## Fixture reference

Fixtures are static JSON graphs used by `scripts/validate-data-model.mjs`. They are **not user
data and not a store** — nothing reads or writes them at runtime. Positive fixtures must pass
schema + graph invariants; `invalid-*` fixtures exist to prove the checks reject bad shapes.

- **`valid-r0-slice.json`** — one connected example: a personal workspace with an owner
  membership, a conversation, a user message, and a **failed** `AUTH_REQUIRED` run with a policy
  step and a matching usage `release`. It demonstrates that a gated failure is recorded as a Run
  error (not an assistant message) and that a released reservation costs nothing.
- **`sec01-isolation-slice.json`** — a two-personal-workspace + shared-team graph with a
  **revoked** membership and mapped `sub → user_id` identities. Its `cases[]` array is the
  authorization matrix exercised by `lib/object-access.js` via `evaluateCase`: owner reads own
  objects (allow); a peer, a guessed ID, a revoked member, and an outsider all fail closed
  (`PERMISSION_DENIED`); a missing session is `AUTH_REQUIRED`; a client-asserted display
  name/`sub` cannot steal another user's object; and a team member can read the shared team
  conversation but not a peer's personal one. **This is in-memory only** — it does not prove
  real query behavior, timing, or transactions, and it is not RLS.
- **`invalid-membership-display-name.json`** — a membership with only a `display_name` (no
  `user_id`/`workspace_id`/`role`); must be **rejected**, proving names are not authorization.
- **`invalid-error-as-assistant-message.json`** — an assistant message whose text is a gate
  failure ("Unable to complete that request… authenticated access…"); must be **rejected** so
  failures stay Run errors.
- **`invalid-run-terminal-mutate.json`** — a `before`/`after` pair that flips a terminal
  `failed` run back to `running` in place; must be **rejected** (retries create a linked attempt
  instead).
- **`invalid-usage-missing-idempotency.json`** — a `UsageEntry` without `idempotency_key`; must
  be **rejected** so ledger rows cannot double-charge.

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
