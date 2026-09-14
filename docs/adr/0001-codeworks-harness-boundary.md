# ADR 0001: CodeWorks owns the run boundary

**Status:** Accepted for R0 contract work, pending infrastructure selection.  
**Date:** 2026-09-15

## Decision

CodeWorks owns public run APIs, identity, server-derived workspace authorization,
project/workflow policy, budget reservation and settlement, canonical IDs, event
sequence allocation, approvals, artifacts and audit records.

Hermes is the first replaceable execution harness behind a private worker-side
`HarnessAdapter`. Browser clients communicate only with CodeWorks `/v1/*` APIs.
They never communicate with Hermes, a model provider, MCP server, connector broker,
or local AEC application.

The R0 adapter contract is defined in
[`lib/harness/adapter-contract.js`](../../lib/harness/adapter-contract.js). It
requires start, event stream, approve, reject, cancel and capability operations.
Harness-native events are untrusted input; CodeWorks normalizes, persists and
numbers them before client fan-out.

## Consequences

- The existing request-bound `/api/chat` remains legacy short-form chat and must
  not become the long-running agent runner.
- Long-running execution requires a queue-backed isolated worker and durable
  Postgres records; neither exists in this repository yet.
- Hermes receives a least-privilege, expiring task manifest only. It does not
  receive browser sessions, broad workspace credentials or unrestricted MCP tools.
- All AEC writes are enforced by a CodeWorks-owned connector broker using an
  allowlist, schema validation, document-version binding and approval payload hash.
- Every run must record adapter contract/build, harness source/version, immutable
  container digest, workflow/model/tool manifests and connector version.

## Explicitly deferred

The Postgres/object-storage host, queue/worker host, exact Hermes image digest and
license approval, model budget policy, and first AEC connector remain owner decisions.
No production Hermes or connector integration is authorized by this ADR.
