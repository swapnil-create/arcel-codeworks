# WP-01 — Architecture notes (PRD §22 prototype audit)

**Repo:** `swapnil-create/arcel-codeworks`  
**Source PRD:** [ARCEL-Codeworks-PRD.md](../ARCEL-Codeworks-PRD.md) (§18–§22, WP-01)  
**Audit date:** 2026-09-14 (Asia/Dubai)  
**Scope:** Architecture record for R0. A later D05 PR added a signed-session spend gate (`docs/AUTH.md`); billing/ledger and membership ACL are **not** implemented. Requirements are **not** claimed done.  
**Status:** Draft architecture record for R0. Requirements are **not** claimed done.

---

## 1. Current stack inventory

Evidence is from `main` at audit time (static checkout + `api/chat.js`). This is not a claim about live Vercel project settings, secrets presence, or production traffic.

### 1.1 Surface files

| Path | Role |
|---|---|
| `index.html` | Shell: `#app` mount, CSS/favicon only |
| `app.js` | Entire client: views, composer, chat, projects, Compare arena; Flow G-style generation-error banners |
| `lib/generation-errors.js` | Shared AUTH_REQUIRED / API-not-configured catalog (client + API) |
| `styles.css` | UI styles |
| `assets/` | Fonts (Inter, Plus Jakarta Sans), `arcel-logo-figma.svg`, `arcel-wordmark.svg`, per-letter Codeworks SVGs, hexagon mark |
| `api/chat.js` | OpenRouter proxy; requires signed session |
| `api/auth/*` | OAuth login/callback/logout/session (fail-closed without env) |
| `lib/session.js` | HMAC session cookie |
| `vercel.json` | `functions.api/chat.js.maxDuration: 60` |
| `.env.example` | `OPENROUTER_API_KEY`, `AUTH_SECRET`, OAuth client slots (empty values) |
| `README.md`, `DESIGN.md`, `DESIGN-AUDIT.md`, `ARCEL-Codeworks-PRD.md` | Product/docs |

**Also on `main`:** `DELIVERY-TRACKER.md` (D05/D06, WP-01 status).

**Not present on `main` (audit):** `package.json`, TypeScript, React/framework app, tests, `.github/` workflows, database migrations, object-storage config, auth SDK, metering/ledger, `docs/` (until this WP).

**D05 scaffold (this branch, not a claim that WP-01 is done):** `.github/workflows/ci.yml`, `docs/PREVIEW-CI.md`, `docs/data-model/` stubs, `lib/generation-errors.js`, signed-session OAuth (`docs/AUTH.md`). Still no live DB, production IdP, or ledger.

### 1.2 `/api/chat`

- **Method:** `POST` only; `405` otherwise.
- **Auth:** HMAC session cookie required (`readSession`). Missing session → `AUTH_REQUIRED`; does not call OpenRouter. OAuth (GitHub/Google) is env-configured and fail-closed. `OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO` is not a spend bypass.
- **Rate limits / quotas:** None in handler.
- **Secrets:** Key read from `process.env.OPENROUTER_API_KEY`; returned to client only as errors/content — key itself stays server-side (**keep this boundary**).
- **Input hygiene:** `cleanMessages` keeps roles `user`|`assistant`, **last 24 messages**, each content **truncated to 12 000 chars** (silent).
- **Routing:**
  - Tiers: `fast` / `balanced` / `deep` → env defaults Gemini Flash / Claude Sonnet / Claude Opus.
  - Compare: body `model` ∈ `{arcel, claude, gpt, gemini}` mapped via `COMPARE_MODELS` / tier models.
  - Default tier if invalid: `balanced`. UI primary labels (`ARCEL 1` / Fast / Deep) map via `tierForCurrentModel()` in `app.js`.
- **Upstream:** Non-streaming `chat/completions` to OpenRouter; returns `{ content, model, usage, provider }`.
- **Modes:** System prompt variants for Chat / Research / Code (prompt-only; no real search/citation pipeline).
- **Hosting constraint:** 60s function timeout — unsuitable for long research/worker jobs (PRD §18).

### 1.3 Auth presence

| Layer | Finding |
|---|---|
| Client | Settings sign-in / sign-out wired to `/api/auth/*`; unsigned chrome (no fake identity) |
| API | Signed `arcel_session` cookie required on `POST /api/chat`; OAuth login/callback/logout/session routes |
| Data ACL | **Still missing** — no durable user-scoped objects; session `sub` is not yet membership/workspace authz |

**SEC-01 remains Fail** (no IdP in production, no cross-user object tests). Session gate is the P4 spend boundary, not ACC-01 complete. See [AUTH.md](./AUTH.md).

### 1.4 Model routing (prototype behavior)

| Mechanism | Behavior | Gap vs PRD |
|---|---|---|
| Tier buttons / primary switcher | Maps display names → `fast`/`balanced`/`deep` | No Auto vs explicit catalog; no registry IDs; served model not systematically verified against choice |
| Compare selection | Parallel `/api/chat` with `model` id | No independent run records, costs, or registry versions |
| Judge Best | **Longest response wins** (`content.length`) | Must remove/disable as “intelligent” judging (§22) |
| Combine All | Joins **first sentence** of each result | Must remove/disable as synthesis (§22) |
| Research mode | Prompt instruction only | No search/fetch/citation pipeline |

### 1.5 Storage / persistence

| Concern | Prototype |
|---|---|
| Conversations | In-memory `state.messages`; lost on refresh |
| History / search | Hard-coded `recentChats` strings; open-chat injects placeholder assistant text |
| Projects | Hard-coded `projects` array; no ProjectAccess, files, or instructions versions |
| Files / artifacts | UI affordances only; no upload/storage |
| Usage / ledger | Response may include OpenRouter `usage`; nothing persisted or reserved |
| Client storage | No `localStorage` / IndexedDB / cookies for chat |

### 1.6 Client architecture shape

- Dependency-free static site + one serverless function.
- Full re-render via `innerHTML` string templates (not typed components).
- Composer-first IA (home / chat / projects / arena) **direction to keep**.
- XSS mitigation: `escapeHTML` on rendered user/model text (good baseline; not a substitute for CSP/output policy).

---

## 2. Gap matrix vs PRD §22 Keep / Change / Action

| Existing item (§22) | Keep / change | Prototype evidence | Action for R0→R1 | Gap severity |
|---|---|---|---|---|
| Composer-first shell | Keep direction | `app.js` home + composer modes | Rebuild as typed, accessible components with stateful rendering (React+TS per §18 spike) | Medium (UX debt) |
| Official ARCEL mark | Keep approved source | `assets/arcel-logo-figma.svg` + letter-split Codeworks lockup | Fix product lockup with verified assets; do not ship unapproved mockups; logo not blocking core contracts | Low for R0 contracts |
| `/api/chat` server-side key | Keep boundary | Key only in function env | Replace handler with authenticated **gateway / run service**; retain server-side secrets | **Critical** |
| Tier mapping | Fix immediately | Tier + compare maps; UI names ≠ registry | Resolve explicit selection vs Auto; test actual served model; introduce registry IDs | High |
| Chat state and seeded history | Replace | In-memory + fake recents | Persistent store; empty states; schema/migration version | High |
| Research prompt | Replace | Mode string only | Real search/fetch/citation (post–contracts; typically R1/R2) | High (product) |
| Compare calls | Refactor | Parallel chat calls | Registry IDs, independent attempts, costs, real rubric/synthesis | High |
| Length-based judge / first-sentence combine | Remove or disable | `judge` / `combine` actions in `app.js` | Disable or label non-intelligent until real implementation | **Critical** (honesty) |
| Silent message truncation | Replace | `.slice(-24)` + `.slice(0, 12000)` | Context accounting, compaction, visible limits | High |
| No auth/rate limits in handler | Release blocker (P4 in progress) | Session cookie on `/api/chat`; no rate/quota; IdP not in prod | Finish IdP config + membership ACL + rate/quota before public key spend | **Critical** |
| GitHub/Vercel auto-deploy | Resolve with owner | No `.github/` CI in repo; deploy path unverified here | Verify CI, preview deploy, manual prod approval, rollback | High (ops) |

**Additional gaps implied by §18–§19 (not in §22 table but WP-01 blockers):**

| Area | Prototype | Required direction |
|---|---|---|
| Canonical entities | None | User/Workspace/Membership, Conversation/Message, Project, File, Run/UsageEntry, … |
| API surface | Single `/api/chat` | `/v1/runs`, events stream, cancel, models, usage, CRUD |
| Metering | None | Append-only ledger skeleton + idempotency keys (BIL-01 path) |
| Workers | Sync 60s function | Queue/workflow for long jobs |
| AuthZ | None | Server-derived actor/workspace on every object |

---

## 3. Proposed R0 contracts

These are **proposed** contracts for product/engineering agreement. Not implemented by this document.

### 3.1 Entities (from PRD §19) — R0 minimum subset

R0 should lock schemas and invariants even if only a subset is writable in the first vertical slice (D06).

| Entity | R0 must define | R0 implement (D05/D06) | Later |
|---|---|---|---|
| User / Workspace / Membership | Stable IDs, roles, status; **no authz from display names** | Yes — identity + one personal workspace | Team roles deepen in R3 |
| Conversation / Message | Scope, branch/parent, content parts, timestamps; immutable response versions | Yes — create/list/reopen | Branching UI polish R1 |
| Project / ProjectAccess | Instructions version, owner, ACL | Stub or minimal project container | Full ACL R1+ |
| File / FileVersion | Hash, MIME, storage ref, scan/extraction status, ACL | Attach metadata + storage ref in slice | Extraction/RAG R1–R2 |
| Source / Citation | Version, locator, retrieved_at, claim link | Event/shape for cited answers | Deep research R2 |
| Artifact / ArtifactVersion | Content ref, originating run, parent, validation | Schema only unless slice needs download | R2 |
| MemoryItem | Scope, evidence, expiry | Schema only | R2–R3 |
| Run / Step / ToolCall | Status, model/registry version, attempts, usage | **Yes — core** | Tools expand later |
| Approval | Actor, action, target, payload hash | Schema; unused until agents | R3 |
| Connection | Encrypted credential ref | Schema only | R3 |
| Task | Schedule, budget, next run | Schema only | R3 |
| UsageEntry | Idempotency key, run, provider cost, user charge, reservation/settlement | **Ledger skeleton yes** | Payments R3 |

**Run states (lock now):** `queued` → `running` → (`awaiting_approval`) → `cancelling` → terminal `completed` | `failed` | `cancelled`. Terminal immutable except admin reconciliation; retries = linked attempts.

**Error taxonomy (lock now):** `auth_required`, `permission_denied`, `invalid_input`, `unsupported_capability`, `quota_exceeded`, `provider_unavailable`, `rate_limited`, `content_blocked`, `tool_failed`, `context_limit`, `cancelled` — with retryability + safe request ID (no raw upstream secrets).

### 3.2 Auth boundary

| Rule | R0 contract |
|---|---|
| Secrets | Provider keys **only** on server; never in client bundles or logs |
| Identity | Authenticated principal required for any run that calls a paid provider |
| Authorization | Derived **server-side** from membership; object IDs alone never grant access |
| Public prototype | Until auth ships: deploy previews must use **restricted** keys, IP allowlists, or disabled generation — no uncontrolled public spend (R0 exit gate) |
| Session | Prefer integrated IdP (build-vs-integrate: identity is integrate). Exact vendor = spike output, not assumed here |
| Preview vs prod | Separate env credentials; production promote requires manual approval |

**Out of R0 implementation depth:** full SSO/SCIM, BYOK, customer-managed keys (R4 / §17).

### 3.3 Metering skeleton

| Piece | R0 expectation |
|---|---|
| `UsageEntry` | Append-only; unique **idempotency key** per charge attempt |
| Run lifecycle | Reserve on accept → settle on terminal; cancel releases/settles outstanding |
| Visibility | Internal `GET /v1/usage` (or equivalent) balances/reservations — even if UI is minimal |
| Reconciliation | Daily job stub/spec; tests that retries/timeouts do not double-debit |
| Payments | **Not** R0 — skeleton and tests only (BIL-01 R1 beta metering; R3 payment launch) |

### 3.4 Illustrative API (align to §19; names may evolve)

R0 spike should prove shapes; D06 vertical slice should exercise a thin path:

- `POST /v1/runs` — authn required; idempotency key; server derives actor/workspace; body includes `conversation_id`, `task_type`, `model_selection`, attachments, `max_usage`
- `GET /v1/runs/:id/events` — resumable cursor; authz on reconnect
- `POST /v1/runs/:id/cancel` — idempotent
- `GET /v1/models` — entitlement-filtered catalog; no secrets
- `GET /v1/usage` — balances / reservations
- CRUD stubs for conversations (and files as needed for attach)

**Events (replayable, numbered):** `accepted`, `queued`, `started`, `text_delta`, `source_added`, `usage_updated`, terminal, …  
Partial content on failed/cancelled is a **result attribute**, not success.

### 3.5 Preview CI / deploy pipeline

| Control | Proposed R0 |
|---|---|
| CI on PR | Lint/typecheck (once TS app exists), unit tests for authz + ledger idempotency, secret scan |
| Preview deploy | Per-PR preview; **no** production OpenRouter key; generation gated or capped |
| Production | Manual approval + rollback path; confirm GitHub↔Vercel permissions with owner |
| Migration tests | Schema version + empty-state fixtures for conversation migrate-from-prototype |

---

## 4. Recommended first PRs for D05 / D06 (ordered)

D05 = identity, storage permissions, canonical data model, ledger, preview deploy pipeline.  
D06 = vertical slice: sign-in → attach → model → stream cited answer → save → reopen → revoke/delete.

| Order | PR theme | Maps to | Notes |
|---|---|---|---|
| **P0** | This architecture record + ADR stubs (stack spike checklist) | WP-01 / D05 start | Docs only — **this PR** |
| **P1** | Disable dishonest Compare Judge/Combine (or hard-label as non-AI heuristics) + surface truncation limits in UI copy **+ AUTH_REQUIRED / API-not-configured banners** | §22 remove/disable; CHAT-07 / Flow G | Compare honesty landed on main; D05 adds gate banners. Do not store errors as assistant text. |
| **P2** | Preview CI skeleton: workflow + branch protection notes + Vercel preview env checklist (no prod key) | D05 pipeline | Workflow + [PREVIEW-CI.md](./PREVIEW-CI.md) scaffold; owner must still enable protection and Vercel Git permissions |
| **P3** | Data model migrations: User/Workspace/Membership, Conversation/Message, Run, UsageEntry (Postgres or equivalent) | D05 schemas | JSON Schema + SQL **stubs** + fixture invariants; **not** a live database |
| **P4** | Auth integration spike → protect run creation; replace anonymous `/api/chat` spend path | D05 auth boundary | Keep server-side key boundary |
| **P5** | Metering skeleton: reserve/settle + idempotency tests | D05 ledger | No Stripe/checkout yet |
| **P6** | Model registry + routing matrix tests (explicit vs Auto; assert served model) | MOD / tier fix | Can parallelize after P3 |
| **P7** | D06 vertical slice end-to-end on preview | D06 | Depends on P3–P5; streaming + one citation path + save/reopen/delete |

**Suggested sequencing constraint:** Do not open public generation (P4 incomplete) on a shared production key. Prefer P1 early for product honesty even before full auth.

---

## 5. Explicit non-goals for R0

R0 is foundation: contracts, auth boundary, CI/preview, metering skeleton, architecture agreement. **Do not** treat the following as R0 deliverables:

1. Full paid billing / checkout / invoices (R3 payment launch; R1 is metering beta only).
2. Complete auth product (SSO, SCIM, org admin) — personal sign-in path only as needed for D06.
3. Real deep-research index or web-scale search build (integrate later; R2 deep research).
4. Production “intelligent” Judge Best / Combine All.
5. Full React rebuild of every screen — spike + path for typed app; wholesale UI rewrite can trail contracts.
6. Artifacts Office suite, code sandbox at scale, voice realtime, connectors, scheduled agents (R2–R3).
7. AEC five-pillar pack (R4 / optional).
8. BYOK, CMK, regional residency marketing claims without evidence.
9. Training foundation models.
10. Claiming any PRD acceptance ID **done** without automated/manual evidence.
11. Shipping unapproved logo lockup commits as verified brand.
12. Long-running research inside the existing 60s `/api/chat` function.

---

## 6. Audit summary for tracker / leadership

### Top 5 gaps

1. **Public paid key still blocked** — session gate exists, but production IdP + membership ACL tests are missing (SEC-01 Fail).  
2. **No durable data model** — chats/projects are ephemeral or seeded; no tenant boundary.  
3. **Dishonest Compare Judge/Combine heuristics** — length and first-sentence presented as intelligent (disabled/labelled in the prototype).  
4. **Silent context truncation** — 24 messages / 12k chars with no user-visible accounting.  
5. **Protected preview incomplete** — PR CI scaffold exists; GitHub→Vercel permissions and branch protection are not evidenced.

### Blockers

| Blocker | Owner / note |
|---|---|
| D01 product defaults sign-off (Auto vs named, packaging) | Swapnil — proceeding on PRD §28 recommended defaults until overridden |
| Identity vendor choice | GitHub/Google OAuth scaffold in-repo; Swapnil must set `AUTH_SECRET` + client IDs on Vercel ([AUTH.md](./AUTH.md)) |
| GitHub ↔ Vercel permissions / manual prod approval | Owner permission required (§22) |
| Provider spike results (streaming, tools, citations, cost) | D04 — informs gateway adapters |
| Public key exposure until auth + rate limits | Ops: keep generation off or locked on shared previews |

### WP-01 exit (from PRD) — not yet met

> Architecture record, migration tests, protected preview pipeline.

This document satisfies the **architecture record** draft. D05 adds a CI workflow scaffold, preview-policy notes, and schema/migration **stubs** with fixture invariants. Migration tests against a real database and a protected preview pipeline (branch protection + Vercel Git + env isolation) remain **not done**.

---

## Appendix A — Prototype → target mapping (quick)

| Prototype | Target (§18) |
|---|---|
| `index.html` + `app.js` | Web client (React + TypeScript; framework confirmed in spike) |
| `api/chat.js` | Application API + Model gateway (OpenRouter retained where appropriate) |
| None | Relational DB, object storage, workers, sandbox, monitoring |

## Appendix B — Evidence pointers

- Tier/compare maps and truncation: `api/chat.js` (`TIER_MODELS`, `COMPARE_MODELS`, `cleanMessages`)
- Judge/combine: `app.js` actions `judge`, `combine`
- Seeded projects/chats: `app.js` top-level `projects`, `recentChats`
- Deploy timeout: `vercel.json`
- Env contract: `.env.example`
- Product migration table: PRD §22
- Entity/API contracts: PRD §19
- Work package: PRD §24 WP-01; tracker tasks D05/D06

---

*End of WP-01 architecture notes. Implementation PRs must cite requirement IDs and attach acceptance evidence before any tracker status flips to `done`.*
