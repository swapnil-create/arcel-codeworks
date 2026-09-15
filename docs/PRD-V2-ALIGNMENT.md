# PRD v2 alignment — 15 September 2026

**Source:** `ARCEL_Codeworks_Full_Platform_PRD_v2` (15 September 2026)  
**Status:** Planning alignment. This document does not claim implementation.

## Decision

PRD v2 supersedes the narrow agent-harness direction as the programme baseline.
The Hermes adapter remains useful, but becomes one implementation behind the
Codeworks execution plane—not the product architecture itself.

Codeworks owns workflow/agent authoring, registries, orchestration, governance,
deployments, run operations and execution lineage. SLM owns knowledge/graph/retrieval
internals; the LLM wrapper owns provider routing and telemetry internals. Codeworks
integrates with both through versioned contracts and must not duplicate their stores
or provider abstraction.

## What remains valid

- Browser-to-Codeworks-only boundary; no direct browser access to providers,
  harnesses, MCP servers, local tools or Bridge devices.
- Canonical tenant/workspace/run/event/approval/artifact/usage records.
- Ordered, persisted, replayable events; approvals and budget reservation before
  consequential execution; append-only audit/usage records.
- Google Cloud as the selected runtime direction, `arcel-codeworks` as project and
  `me-central2` as the intended regional default.
- Private worker-side HarnessAdapter, Tool Gateway/broker and outbound-only Bridge.

## What changes

| Earlier focus | PRD v2 baseline |
|---|---|
| Hermes proof as the first primary slice | Full platform contracts and planes built in parallel; Hermes is one agent-runtime integration |
| Parking Lots to Parks / Grasshopper as first vertical | Day-30 Drawing Intelligence/QC vertical, alongside Decision Intelligence; AEC Bridge writes later |
| Static single-app repository | Monorepo with apps, services, workers, packages, connectors, Bridge and IaC modules |
| Vercel + one worker plan | Environment strategy: local, development, preview, staging and production with IaC, telemetry and policy controls |
| OpenRouter proxy as model layer | LLM-wrapper adapter is the model boundary; OpenRouter is one hosted-provider integration behind it |

## Immediate technical consequences

1. Do not provision a one-off Cloud SQL/Cloud Run/Cloud Tasks stack before the
   environment, network, IAM, KMS, IaC state and service-boundary plan is frozen.
2. Do not extend `/api/chat` into the platform runtime. It remains legacy chat.
3. Build versioned contracts first: Tenant/Workspace, Workflow/Node/Tool, Run/Event,
   Artifact, Audit, Usage, SLM adapter, LLM-wrapper adapter and deployment contract.
4. Create a monorepo migration/bootstrap plan before adding platform services.
5. Day-30 integration target is: authenticated tenant shell → workflow registry →
   durable graph → Run Centre events → artifact upload → fake then real SLM/model →
   one authorized read tool → human approval → Drawing QC result with evidence.

## Existing repository state

The current repository is a static UI plus Vercel auth and legacy OpenRouter chat.
The harness contract, GCP architecture notes and database migrations are valuable
contract scaffolds only; no live database, queue, worker, Tool Gateway, SLM adapter,
LLM wrapper, graph compiler, registry, Bridge or IaC exists.

## Decisions needed before Cloud apply

1. **Programme path:** approve the 24-week accelerated programme or the 40–52-week
   lean programme.
2. **Repository:** migrate this repository into the v2 monorepo, or create a new
   platform repository and retain this one as the legacy web prototype.
3. **Environment topology:** separate development/staging GCP projects versus a
   single-project temporary setup. PRD v2 requires separate state/credentials and
   blocks preview/staging access to production data.
4. **Owning services:** identify the current SLM, VKI and LLM-wrapper repositories/
   teams or confirm they must be stubbed behind contracts initially.
5. **Infrastructure owner:** approve billing and an IaC apply path. Billing is
   currently disabled on `arcel-codeworks`; no GCP resources have been created.

## Next code sequence

1. Monorepo bootstrap and package boundaries.
2. Contract/event-schema package plus fake SLM, LLM-wrapper and Tool adapters.
3. IaC modules for dev/staging, with plan-only CI before any apply.
4. Tenant/workspace/control API and durable Run Centre foundation.
5. Graph compiler and four-node canvas alpha.
6. Drawing Intelligence Day-30 vertical through the shared runtime.
