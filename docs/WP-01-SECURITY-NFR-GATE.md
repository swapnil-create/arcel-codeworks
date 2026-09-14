# WP-01 — Security / NFR gate checklist (PRD §20)

**Repo:** `swapnil-create/arcel-codeworks`  
**Source PRD:** [ARCEL-Codeworks-PRD.md](../ARCEL-Codeworks-PRD.md) §20 (Security, privacy and non-functional requirements)  
**Related architecture notes:** [WP-01-ARCHITECTURE.md](./WP-01-ARCHITECTURE.md) ([PR #1](https://github.com/swapnil-create/arcel-codeworks/pull/1))  
**Audit date:** 2026-09-14 (Asia/Dubai)  
**Scope:** Evidence-only gate checklist for Wave-1 / R0. **Does not implement** auth, ledger, CI, or observability.  
**Verdict:** **WP-01 stays NOT done.**

---

## Explicit WP-01 completion rule

Per PRD §24, WP-01 completion evidence requires **all three**:

1. Architecture record  
2. Migration tests  
3. Protected preview pipeline  

| Evidence item | Status |
|---|---|
| Architecture record | Draft in [PR #1](https://github.com/swapnil-create/arcel-codeworks/pull/1) (`docs/WP-01-ARCHITECTURE.md`) — **necessary but not sufficient** |
| Migration tests | **Fail / not started against a real DB** — JSON Schema + SQL stubs + fixture invariants exist under `docs/data-model/`; nothing is provisioned or applied |
| Protected preview pipeline | **Fail / incomplete** — PR workflow scaffold in `.github/workflows/ci.yml` and [PREVIEW-CI.md](./PREVIEW-CI.md); branch protection, Vercel Git permissions, and preview/prod key isolation are **not** evidenced |

**This document does not flip WP-01 to done.** It records §20 Pass / Partial / Fail against the current static prototype so engineering can prioritize R0 blockers. WP-01 remains **not done** until migration tests, protected preview, and the Fail items below (especially R0 blockers) are addressed with acceptance evidence.

**Aligned with [PR #1](https://github.com/swapnil-create/arcel-codeworks/pull/1) on:** unauthenticated chat, dishonest Judge/Combine heuristics, silent truncation, and missing run/error contracts.  
**Next implementation order (unchanged):** P1 → P5 from architecture notes (honesty UX → preview CI → migrations → auth → metering skeleton).

---

## Status legend

| Status | Meaning |
|---|---|
| **Pass** | Concrete prototype / process evidence meets acceptance for this gate |
| **Partial** | Direction or boundary is correct, but automated/manual acceptance is incomplete |
| **Fail** | Requirement not met; blocker or high-risk gap for R0 / public key spend |

---

## R0 blockers (must clear before public paid-provider generation)

| ID | Status | Why it blocks R0 |
|---|---|---|
| **SEC-01** | **Fail** | No auth on `/api/chat` or any object path — any caller can spend the server-side OpenRouter key |
| **REL-03** | **Fail** | No usage ledger, idempotency keys, or retry/crash side-effect tests |
| **OPS-01** | **Fail** | No per-run latency / failure / cost observability |
| **Preview CI** (WP-01 exit) | **Fail** | Workflow scaffold exists; protected preview + manual prod approval + Vercel Git permissions not evidenced |

Secondary high-priority gaps (not all named R0 blockers above, but tied to honesty / release readiness): dishonest Compare Judge/Combine, silent truncation, missing run/error contracts — see architecture PR and rows below.

---

## Gate matrix — SEC

### SEC-01 — Authorization on every object, retrieval, job and tool path

| Field | Content |
|---|---|
| **Requirement summary** | Every object, retrieval, job, and tool path enforces authorization; guessed IDs and revoked memberships must fail closed. |
| **Acceptance criteria** | Automated cross-user / cross-workspace tests (including guessed IDs and revoked memberships) prove unauthorized access is denied; server derives actor/workspace (never from client-asserted display names alone). |
| **Current prototype status** | **Fail** |
| **Evidence** | `api/chat.js`: no session/JWT/API-key check; POST open to any caller. Client (`app.js`): no sign-in / session UI. No durable user-scoped objects or ACL. Architecture notes §1.3, §2 (auth row), [PR #1](https://github.com/swapnil-create/arcel-codeworks/pull/1). |
| **R0 blocker** | **Yes** — release blocker before public paid provider key (PRD §22). |

### SEC-02 — Secrets server-side; encrypted credentials; rotation and least privilege

| Field | Content |
|---|---|
| **Requirement summary** | Provider and credential secrets stay server-side; credentials encrypted at rest where stored; rotation and least-privilege service credentials. |
| **Acceptance criteria** | Bundle/log scans find no secrets; secret rotation exercise documented; restricted service credentials per environment; client bundles never embed keys. |
| **Current prototype status** | **Partial** |
| **Evidence** | **Pass aspect:** `OPENROUTER_API_KEY` read from `process.env` in `api/chat.js`; key not returned to client (only errors/content). `.env.example` documents env contract without real secrets. **Fail aspect:** no encrypted credential store, no rotation exercise, no bundle/log secret-scan CI, no least-privilege credential matrix across preview/prod. Architecture notes §1.2 / §3.2. |
| **R0 blocker** | No (boundary to keep); still incomplete for full SEC-02 Pass. |

### SEC-03 — Safe model output, uploads and network tools

| Field | Content |
|---|---|
| **Requirement summary** | Defend against XSS, injection, SSRF, malware, zip-bombs, and sandbox escape on model output, uploads, and network tools. |
| **Acceptance criteria** | XSS / injection / SSRF / malware / zip-bomb / sandbox-escape suites pass for enabled surfaces. |
| **Current prototype status** | **Fail** |
| **Evidence** | Baseline: `escapeHTML` on rendered text in `app.js` (good start, not a suite). No upload pipeline, no network retrieval tools, no sandbox, no CSP policy evidenced, no automated security suites. Silent truncation and prompt-only Research mode do not constitute safe retrieval (PRD SRC-07 / SEC-03). |
| **R0 blocker** | Not named in Wave-1 R0 blocker set; still Fail for any upload/tool enablement. |

### SEC-04 — Policy applies before model/tool execution

| Field | Content |
|---|---|
| **Requirement summary** | Platform policy is enforced before model/tool execution; adversarial documents cannot expand scope, request hidden credentials, or approve writes. |
| **Acceptance criteria** | Adversarial document/prompt fixtures cannot grant credentials, expand tool scope, or self-approve writes; policy checks are server-side and pre-execution. |
| **Current prototype status** | **Fail** |
| **Evidence** | No policy engine, no tool allowlists, no Approval entity enforcement. `/api/chat` forwards cleaned messages to OpenRouter with mode system prompts only. No untrusted-content boundary tests. |
| **R0 blocker** | Not named in Wave-1 R0 blocker set; required before tools/connectors. |

### SEC-05 — Privacy by default

| Field | Content |
|---|---|
| **Requirement summary** | No public shares or training reuse without explicit policy/consent; subprocessors and retention disclosed. |
| **Acceptance criteria** | Default private; share/training reuse requires explicit consent/policy; subprocessors and retention published and matched in product copy. |
| **Current prototype status** | **Fail** |
| **Evidence** | No sharing product, no retention policy UI, no subprocessor disclosure in-app. Ephemeral in-memory chats reduce persistence risk incidentally but do **not** satisfy privacy-by-default product controls. Provider (OpenRouter) data handling not disclosed in product. |
| **R0 blocker** | No for R0 docs gate; required before real user data / public beta claims. |

### SEC-06 — Deletion and revocation

| Field | Content |
|---|---|
| **Requirement summary** | Deletion/revocation immediately denies new access; proposed active purge ≤30 days and backup expiry ≤90 days (lawful exceptions/contracts apply). |
| **Acceptance criteria** | Revocation blocks new access immediately; purge/backup expiry drills documented; tombstones reapplied on restore. |
| **Current prototype status** | **Fail** |
| **Evidence** | No durable store, no deletion APIs, no session revocation, no purge/backup policy implementation. Architecture notes storage table §1.5. |
| **R0 blocker** | No for docs-only R0; required with D05/D06 persistence + auth. |

### SEC-07 — Admin security

| Field | Content |
|---|---|
| **Requirement summary** | MFA for privileged users, least-privilege support access, audit of administrative access. |
| **Acceptance criteria** | Privileged accounts require MFA; support access is least-privilege and audited. |
| **Current prototype status** | **Fail** |
| **Evidence** | No admin surface, no MFA, no audit log of administrative access. Out of deep R0 product scope per architecture non-goals, but §20 gate remains Fail until implemented for launch. |
| **R0 blocker** | No for Wave-1 R0 blocker set. |

---

## Gate matrix — REL

### REL-01 — 99.9% monthly app/API availability target

| Field | Content |
|---|---|
| **Requirement summary** | Proposed 99.9% monthly availability for app/API; provider-dependent task failures reported separately. |
| **Acceptance criteria** | Synthetic checks and incident records; provider failures segmented from app/API SLA. |
| **Current prototype status** | **Fail** |
| **Evidence** | No synthetic monitors, no incident process evidenced in-repo, no SLA measurement. Single 60s serverless function is not an availability program. |
| **R0 blocker** | No (launch/hardening gate); track under WP-11 / ops. |

### REL-02 — Recoverable state

| Field | Content |
|---|---|
| **Requirement summary** | Tested backup restore; proposed RPO ≤1 hour and RTO ≤4 hours for application records. |
| **Acceptance criteria** | Documented restore drill meeting RPO/RTO targets; deletion tombstones reapplied on restore. |
| **Current prototype status** | **Fail** |
| **Evidence** | No database, no backups, no restore drill. Chat state lost on refresh (architecture §1.5). |
| **R0 blocker** | No until durable store lands; then required with migrations. |

### REL-03 — No duplicate side effects or billing

| Field | Content |
|---|---|
| **Requirement summary** | Idempotency across timeout / retry / crash paths so side effects and billing are not duplicated. |
| **Acceptance criteria** | Idempotency tests for runs and `UsageEntry`; duplicate webhooks/retries do not double-debit; cancel settles/releases reservations (aligns BIL-01). |
| **Current prototype status** | **Fail** |
| **Evidence** | No `UsageEntry`, no idempotency keys on `/api/chat`, no reserve/settle lifecycle, no concurrency/retry tests. Architecture notes §3.3 metering skeleton still proposed only. |
| **R0 blocker** | **Yes** |

---

## Gate matrix — PERF

### PERF-01 — Interactive feedback ≤300 ms p95

| Field | Content |
|---|---|
| **Requirement summary** | Client interaction feedback ≤300 ms p95; remote work acknowledged promptly. |
| **Acceptance criteria** | Client interaction tests under reference conditions meet p95. |
| **Current prototype status** | **Fail** |
| **Evidence** | No performance harness or p95 measurements. Local `innerHTML` re-renders are unmeasured; not evidence of Pass. |
| **R0 blocker** | No. |

### PERF-02 — Fast text first content ≤3 s p50, ≤8 s p95

| Field | Content |
|---|---|
| **Requirement summary** | Fast text first content under reference load/region/model (excluding research/deep); adjust claim if provider cannot meet target. |
| **Acceptance criteria** | Measured p50/p95 on nominated region/network/model. |
| **Current prototype status** | **Fail** |
| **Evidence** | Non-streaming OpenRouter `chat/completions` in `api/chat.js` — entire response waits for completion (hurts first-content latency). No load or latency measurements. |
| **R0 blocker** | No; streaming + measurement belong with run service work. |

### PERF-03 — Long work activity within 2 s; heartbeat ≤15 s

| Field | Content |
|---|---|
| **Requirement summary** | Long work shows activity within 2 s and heartbeat at least every 15 s; stalled jobs detectable; progress replayable. |
| **Acceptance criteria** | Stalled-job detection and progress replay tests pass. |
| **Current prototype status** | **Fail** |
| **Evidence** | No run event stream, no heartbeats, 60s `vercel.json` maxDuration unsuitable for long research/worker jobs (PRD §18; architecture §1.2). |
| **R0 blocker** | No for short chat; blocks long-job claims. |

---

## Gate matrix — ACC-03

### ACC-03 — WCAG 2.2 AA; mobile 360 px and up

| Field | Content |
|---|---|
| **Requirement summary** | WCAG 2.2 AA target; usable from mobile 360 px width upward. |
| **Acceptance criteria** | Keyboard / screen-reader / manual audits plus automated checks; layouts verified at 360 px+. When [PR #2](https://github.com/swapnil-create/arcel-codeworks/pull/2) lands with `data-state` / `data-screen` hooks on A–G screen roots, those hooks become the ACC-03 audit path (queryable DOM hooks; **no copy scraping**). |
| **Current prototype status** | **Fail** |
| **Evidence** | No accessibility audit artifacts, no automated a11y CI, no documented screen-reader pass. Responsive CSS may exist visually but is not acceptance evidence. PRD §5.5 / §20. **Forward path:** [PR #2](https://github.com/swapnil-create/arcel-codeworks/pull/2) (D03 clickable flows) will expose `data-state` / `data-screen` on A–G screen roots — use those as the ACC-03 audit surface once merged (queryable hooks, not scraped copy). Status stays **Fail** until that audit path exists and passes. |
| **R0 blocker** | No for Wave-1 R0 blocker set; required before V1 claim. |

---

## Gate matrix — OPS

### OPS-01 — Per-run latency, failure and cost visibility

| Field | Content |
|---|---|
| **Requirement summary** | Per-run latency, failure, and cost visibility; dashboards segmented by model, tool, tier, and workspace without default raw-content logging. |
| **Acceptance criteria** | Dashboards/metrics exist with those segments; raw prompts not logged by default; run-level traces support incident response. |
| **Current prototype status** | **Fail** |
| **Evidence** | OpenRouter may return `usage` on a response, but nothing is persisted, aggregated, or dashboarded. No structured run IDs, no failure taxonomy metrics, no cost anomaly alerts. Architecture §1.5 / §3.3. |
| **R0 blocker** | **Yes** |

---

## Cross-cutting prototype honesty gaps (aligned with PR #1)

These are not separate §20 IDs but interact with SEC/REL/OPS readiness and product trust. Tracked here so the gate and architecture notes stay consistent.

| Gap | Prototype behavior | Gate / contract link |
|---|---|---|
| Unauthenticated chat | Open `POST /api/chat` spends server key | **SEC-01 Fail** (R0 blocker) |
| Dishonest Judge Best | Longest `content.length` wins | Product honesty; disable/label (architecture P1) |
| Dishonest Combine All | First-sentence join presented as synthesis | Product honesty; disable/label (architecture P1) |
| Silent truncation | Last 24 messages; 12k chars/content | Context accounting; ties to safe/run contracts |
| Missing run / error contracts | Single chat response; no run states / error taxonomy | PRD §19; needed for REL-03 / OPS-01 |
| Preview CI missing | PR workflow + preview policy notes only; owner setup incomplete | WP-01 exit Fail (R0 blocker) |

---

## Summary scorecard

| ID | Status | R0 blocker? |
|---|---|---|
| SEC-01 | **Fail** | **Yes** |
| SEC-02 | **Partial** | No (keep server-side key boundary) |
| SEC-03 | **Fail** | No* |
| SEC-04 | **Fail** | No* |
| SEC-05 | **Fail** | No* |
| SEC-06 | **Fail** | No* |
| SEC-07 | **Fail** | No* |
| REL-01 | **Fail** | No* |
| REL-02 | **Fail** | No* |
| REL-03 | **Fail** | **Yes** |
| PERF-01 | **Fail** | No* |
| PERF-02 | **Fail** | No* |
| PERF-03 | **Fail** | No* |
| ACC-03 | **Fail** | No* |
| OPS-01 | **Fail** | **Yes** |
| Migration tests (WP-01 exit) | **Fail** | **Yes** (WP-01) |
| Protected preview pipeline (WP-01 exit) | **Fail** | **Yes** (WP-01) |

\*Still Fail for launch/V1; not in the Wave-1 named R0 blocker quartet (SEC-01, REL-03, OPS-01, preview CI).

**Pass count:** 0  
**Partial count:** 1 (SEC-02)  
**Fail count:** all other §20 IDs in scope + both WP-01 exit engineering items beyond architecture record

---

## Recommended next order (from architecture notes)

Unchanged P1→P5 priority:

1. **P1** — Disable or hard-label dishonest Judge/Combine; surface truncation limits  
2. **P2** — Preview CI skeleton (workflow, branch protection notes, Vercel preview env checklist; no prod key)  
3. **P3** — Data model migrations + invariant tests (User/Workspace/Membership, Conversation/Message, Run, UsageEntry)  
4. **P4** — Auth integration; protect run creation; replace anonymous `/api/chat` spend path  
5. **P5** — Metering skeleton: reserve/settle + idempotency tests (feeds REL-03 / OPS-01)

Do **not** open public generation on a shared production key until P4 (and rate/quota controls) are in place.

---

## Document control

| Item | Value |
|---|---|
| Authoring context | Standards Expert Wave-1 / executor docs PR |
| Does this complete WP-01? | **No** |
| Tracker update | Not applied on `main` by this PR; optional same-branch tracker link may land separately after merge |
| Supersedes | Nothing — complements [WP-01-ARCHITECTURE.md](./WP-01-ARCHITECTURE.md) |

*End of WP-01 §20 security/NFR gate checklist. Implementation PRs must cite requirement IDs and attach acceptance evidence before any tracker status flips to `done`.*
