# Run-event contract (agent-harness R0)

**Status:** Contract only. **No queue, transport, or persistence is implemented.**
This defines the versioned event envelope that a future CodeWorks-owned run service would
emit. The core team owns the adapter, worker, queue, database, authz, budget enforcement, and
connector execution — these files do not substitute for any of that.

## Envelope

`schemas/run-event.schema.json` — every event carries:

| Field | Rule |
|---|---|
| `version` | `"r0"` |
| `run_id` | `run_`-prefixed run identifier |
| `seq` | positive integer, **strictly increasing** within a run |
| `occurred_at` | RFC 3339 date-time |
| `type` | one of the nine event types below |
| `payload` | typed object; **never** contains a provider secret or raw connector credential |

## Event types and payloads

| `type` | Payload schema | Notes |
|---|---|---|
| `run.started` | `run-event-run-started.schema.json` | project/workflow refs, model selection, `max_budget_units` |
| `message.delta` | `run-event-message-delta.schema.json` | incremental assistant text; order via envelope `seq` |
| `tool.requested` | `run-event-tool-requested.schema.json` | `tool_class` ∈ read_only / preview / model_changing; args by ref only |
| `tool.completed` | `run-event-tool-completed.schema.json` | terminal per tool call; result by ref only |
| `approval.required` | `run-event-approval-required.schema.json` | gates a model-changing call; `payload_hash` binds to the tool.requested |
| `usage.updated` | `run-event-usage-updated.schema.json` | budget units only (reservation/settlement/release) |
| `run.completed` | `run-event-run-completed.schema.json` | terminal |
| `run.failed` | `run-event-run-failed.schema.json` | terminal; structured error taxonomy |
| `run.cancelled` | `run-event-run-cancelled.schema.json` | terminal; server-derived canceller ref |

## Sequence invariants (enforced by `scripts/validate-data-model.mjs`)

1. Each event validates against the envelope schema and its per-type payload schema.
2. `seq` is strictly increasing; a single `run_id` per sequence.
3. No event may follow a terminal event (`run.completed` / `run.failed` / `run.cancelled`).
4. `approval.required.payload_hash` must equal `sha256:<hex>` of the canonical
   `{name, tool_class, arguments_ref}` of the `tool.requested` it references.
5. No payload may contain a secret-like key (e.g. `api_key`, `authorization`, `password`) or a
   secret-shaped value (OpenRouter key, private key, bearer token).

## Fixtures

- `fixtures/runevent-valid-sequence.json` — a well-formed run with a model-changing tool gated
  by a matching approval and a single terminal event.
- `fixtures/invalid-runevent-duplicate-seq.json` — repeated `seq` (rejected).
- `fixtures/invalid-runevent-out-of-order.json` — `seq` 1, 3, 2 (rejected).
- `fixtures/invalid-runevent-activity-after-terminal.json` — activity after `run.completed` (rejected).
- `fixtures/invalid-runevent-approval-hash-mismatch.json` — approval hash does not match its
  tool.requested (rejected).

## Not implemented (out of scope for this contract)

- No queue, stream transport, cursor/resume, or storage of events.
- No approval **decision** events (grant/reject) — only `approval.required` is modeled here.
- No budget enforcement; `usage.updated` is a shape, not a meter.
- No connector execution or AEC integration.
