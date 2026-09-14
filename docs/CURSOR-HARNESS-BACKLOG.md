# Cursor backlog — agent-harness R0 supporting work

This is deliberately secondary work. The core team owns the adapter, worker,
queue, production database, authz, budget enforcement, and connector execution.
Cursor must not create a substitute harness, wire browser code directly to Hermes,
add unrestricted tools, change production secrets, or mark an unimplemented
connector as working.

## Job 1 — Canonical run-event contract and fixtures

Add JSON Schema files under `docs/data-model/schemas/` for a versioned `RunEvent`
envelope and event payloads:

- `run.started`, `message.delta`, `tool.requested`, `tool.completed`,
  `approval.required`, `usage.updated`, `run.completed`, `run.failed`, and
  `run.cancelled`;
- every event has `run_id`, positive monotonic `seq`, `occurred_at`, `type`, and
  a payload that contains no provider secret or raw connector credential;
- include valid and invalid fixture sequences: duplicate sequence number,
  out-of-order event, terminal event followed by new activity, and approval whose
  payload hash does not match.

Extend `scripts/validate-data-model.mjs` rather than adding another validation
tool. This is a contract only; no queue or persistence implementation.

## Job 2 — OpenAPI draft for CodeWorks-owned run endpoints

Add `docs/openapi/runs-r0.yaml` documenting, but not implementing:

- `POST /v1/runs` (requires idempotency key, project/workflow/model/max budget);
- `GET /v1/runs/{id}/events` (cursor/resume semantics);
- approval, reject and cancel endpoints;
- `GET /v1/models` and `GET /v1/usage`.

Document structured errors including `AUTH_REQUIRED`, `PERMISSION_DENIED`,
`BUDGET_EXCEEDED`, `APPROVAL_REQUIRED`, `IDEMPOTENCY_CONFLICT`, and
`RUN_NOT_FOUND`. Do not expose Hermes identifiers as public identifiers.

## Job 3 — Golden-evaluation fixture pack

Create `docs/evaluations/parking-lots-to-parks-r0/` with ten **specification
fixtures**, not claimed execution results. Each case must define:

- fixture id and a minimal sanitized site brief;
- expected read-only/preview/model-changing tool classes;
- an approval checkpoint for every model-changing action;
- expected terminal state and trace fields;
- pass/fail assertions for no cross-workspace access and no unapproved write.

Use placeholder/synthetic project data only. Do not call any AEC software.

## Job 4 — Browser-boundary regression test

Add a source-level CI assertion proving browser assets (`app.js`, `index.html`,
and styles) do not contain Hermes URLs, OpenRouter keys, local bridge URLs,
or direct `/mcp` / connector calls. Permit CodeWorks `/v1/*` calls only after
the real Run API exists. Keep the test static and dependency-free.

## Delivery rules

- One PR per job, rebased on current `main`.
- Run `node scripts/ci-check.mjs` and `node scripts/validate-data-model.mjs`.
- Do not touch `api/chat.js`, authentication, environment files, production
  configuration, styling, or active schemas without first reporting a conflict.
- The PR description must state exactly which requirements remain unimplemented.
