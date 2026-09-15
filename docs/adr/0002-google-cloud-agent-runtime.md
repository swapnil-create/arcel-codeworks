# ADR 0002: Use Google Cloud for the R0 agent runtime

**Status:** Accepted.  
**Date:** 2026-09-15

## Decision

ARCEL CodeWorks will retain Vercel for the web client and short authenticated API
operations, and use Google Cloud for durable agent execution:

```text
Vercel Run API
  -> Cloud SQL for PostgreSQL (canonical records + transactional outbox)
  -> Cloud Tasks (durable dispatch)
  -> private Cloud Run worker (isolated HarnessAdapter / Hermes runtime)
  -> Cloud Storage (encrypted artifact content and protected raw-event references)
```

The local AEC bridge makes an outbound authenticated connection to a
CodeWorks-owned broker. It is never exposed as a public Cloud Run or workstation
port. Vercel remains the only browser-facing origin in R0.

## Required environment separation

- Separate GCP projects (or at minimum separate Cloud SQL databases, buckets,
  task queues, service accounts and keys) for preview and production.
- The Vercel Run API receives only narrowly scoped service credentials needed to
  enqueue work and access the Run API data layer; worker credentials are not sent
  to the browser.
- The worker service account receives only the roles needed for its queue,
  storage prefix, Secret Manager versions and database connection.
- Provider keys and connector leases live in Secret Manager or server-only
  runtime configuration. They must never be checked into this repository.

## Why this boundary

Cloud Tasks gives retryable, durable dispatch. Cloud Run provides a separately
deployable worker suitable for the private, pinned harness container. Cloud SQL
gives transactional storage for runs, ordered events, approvals, usage and the
outbox. Cloud Storage holds immutable artifact content outside database rows.

## Guardrails

- A Run API transaction creates the Run, budget reservation, initial events and
  outbox record before dispatch. A task retry never creates another Run or debit.
- The worker has no public unauthenticated endpoint. Queue invocation is
  authenticated and scoped to the intended service.
- Per-run harness image and all workflow/tool manifests are pinned by immutable
  digests and recorded in CodeWorks canonical records.
- No Hermes, MCP, Rhino, Grasshopper or Revit endpoint is internet-exposed.
- All model-changing calls still require CodeWorks approval with a payload hash
  and document/version binding.

## Pending owner inputs

Before provisioning: exact GCP project IDs, billing owner, region, retention and
backup policy, per-run budget, and the person authorized to revoke a connector.
This ADR does not create cloud resources or grant IAM roles.
