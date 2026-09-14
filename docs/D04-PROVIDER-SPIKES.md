# D04 — Provider spikes: plan, capability matrix, and cost harness

**Repo:** `swapnil-create/arcel-codeworks`  
**Branch:** `docs/d04-provider-spikes` (PR-only; never commit this work to `main` directly)  
**Source PRD:** [ARCEL-Codeworks-PRD.md](../ARCEL-Codeworks-PRD.md) — next-ten-days item 4; §§6–7, 10, 13–14  
**Related:** [WP-01 architecture](./WP-01-ARCHITECTURE.md) · [WP-01 security/NFR gate](./WP-01-SECURITY-NFR-GATE.md) · [delivery tracker](../DELIVERY-TRACKER.md)  
**Harness:** [scripts/d04-provider-spike.mjs](../scripts/d04-provider-spike.mjs)  
**Date:** 2026-09-14 (Asia/Dubai)  
**Status:** **in progress** — plan + no-op harness only. Live keys are unavailable in this environment. **D04 is not done.**

---

## 1. Purpose

PRD §28 next-ten-days item 4 (tracker **D04**):

> Run provider spikes for streaming/tool calls, search citations, image editing and voice. Record capability gaps and actual test costs.

This document is the R0 spike plan for those four surfaces, mapped to the PRD sections that define them:

| PRD | What D04 must inform |
|---|---|
| **§6 Model offering** | Task / intelligence / effort layers; Auto vs named models; 4–6 curated catalog slots; no silent publisher switch; actual served model + usage in response details. Prototype Fast/Balanced/Deep maps are **not** evidence of a current catalog (§6.3). |
| **§7 Model gateway** | Especially **MOD-06** adapter conformance (streaming, tool calls, cancel, usage, refusals, errors) and **MOD-07** native escape hatch when the gateway lacks a modality. Also feeds MOD-01 registry fields (tools, inputs, prices) and MOD-04 token-aware prep. |
| **§10 Search and deep research** | **SRC-01** quick web search with nearby citations and a sources panel. A Research label is never “be thorough” in a system prompt. |
| **§13 Artifacts / images** | **IMG-01** generate; **IMG-02** revise a selected image version (masks if the adapter supports them). Disable unsupported edits; do not silently generate a replacement. |
| **§14 Voice** | **VOI-01** dictation (R2); **VOI-02** conversational voice (R3); **VOI-03** audio files (R3); **VOI-04** privacy/usage (R3). |

D04 does **not** implement the model gateway, search pipeline, image adapters, or voice product. It records what the current prototype can (not) do, what a cost-capped live spike would prove, and which contracts D05/WP-03/05/07 must freeze.

**This PR is evidence of planning and a safe harness — not of live capability.** Tracker honesty: D04 stays `in progress` until live runs exist and redacted costs are attached.

---

## 2. Hard constraints

| Constraint | Rule |
|---|---|
| **PR-only** | Land on `docs/d04-provider-spikes` via PR to `main`. Do not commit D04 work on `main` locally. |
| **No invented credentials** | Do not commit, generate, or placeholder-fake API keys. Missing env → error, no network. `.env` / `.env.*` are gitignored; only `.env.example` is tracked. |
| **No unauthenticated public spend (SEC-01)** | **Fail** on `api/chat.js`: there is still no authenticated principal. `OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO` is a kill-switch, not authorization. **Do not set it true on a shared/public deployment.** The harness **never** calls a public `/api/chat` URL. |
| **Server-side secrets** | Provider keys stay in process env (SEC-02 boundary to keep). Never send keys to the browser, logs, JSONL cost file, or git. |
| **Cost-capped spikes** | Any live OpenRouter call requires `D04_ALLOW_LIVE=1` **and** a **positive** `D04_MAX_USD`. Default harness mode is list/no-op (no network). |
| **No fake success** | Unsupported modalities log `unsupported_capability` stubs. Do not mark D04, MOD-06, SRC-01, IMG-*, or VOI-* `done` without live evidence. |

---

## 3. Code-inspection baseline (this checkout)

Inspection is of the working tree on this branch (aligned with `main` at branch creation plus tracker/gitignore). It is **not** a claim about live Vercel secrets or production traffic.

### 3.1 `api/chat.js` — non-streaming OpenRouter proxy

| Topic | Finding |
|---|---|
| Surface | Sole backend: Vercel serverless `POST` handler. `405` otherwise. |
| Upstream | `https://openrouter.ai/api/v1/chat/completions` — **non-streaming** JSON body (`stream` is never set). Returns `{ content, model, usage, provider }`. |
| Auth | **No session, JWT, API key, or workspace membership check.** SEC-01 **Fail** ([WP-01 security gate](./WP-01-SECURITY-NFR-GATE.md)). |
| Demo kill-switch | If `OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO !== "true"`, handler returns `403` `AUTH_REQUIRED`. Default in `.env.example` is `false`. This **disables generation**; it is not ACC-01/SEC-01 authorization. Setting it `true` on a public URL re-enables **anyone** to spend the server-side key. |
| Tools | Request body has `model`, `messages`, `temperature`, `max_tokens` only. **No `tools` / `tool_choice` / function-calling.** |
| Research | `MODE_INSTRUCTIONS.Research` is a system-prompt string (“evidence-led… include source names or links when supplied in the prompt”). **No retrieval.** |
| Usage | OpenRouter `usage` may be returned to the client; **nothing is persisted** (no `UsageEntry` / ledger). |
| Context | `validateMessages`: max 24 messages, 12 000 chars each; over-limit → `413`/`400` `CONTEXT_LIMIT`. This is a character cap, not MOD-04 token accounting. (WP-01 originally recorded silent `.slice`; the merge honesty pass replaced slice with an error — the cap is still crude.) |
| Model map | Fixed `TIER_MODELS` / `COMPARE_MODELS` from env defaults (Flash / Sonnet / Opus / gpt-latest / Gemini Pro). Not a versioned registry (MOD-01). |

### 3.2 `.env.example`

Tracked contract is **OpenRouter-only**: `OPENROUTER_API_KEY`, `OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO`, optional `OPENROUTER_MODEL_*` slugs, optional `OPENROUTER_SITE_URL`.

**Not present:** search provider keys, image-generation keys, speech-to-text / TTS keys, webhook secrets, database URLs, IdP credentials.

### 3.3 Vercel timeout

`vercel.json` sets `functions.api/chat.js.maxDuration: 60`. Unsuitable for deep research, long tool loops, or conversational voice sessions (PRD §18 workers).

### 3.4 Client (`app.js`)

- `requestCompletion` is a single non-streaming `fetch("/api/chat")`; the UI waits for the full JSON body.
- Research composer control is **disabled** (“Real retrieval and citations are not connected yet”).
- No tool-call UI, image canvas, microphone capture, or usage ledger views.
- In-memory `state.messages` only — CHAT-01 refresh/reconnect is not possible.

### 3.5 What this means for spikes

The prototype can, at most, prove **one** cheap non-streaming text completion through a server-side key — and even that must stay off public deployments until auth exists. Streaming, tools, search, image, and voice are **not implemented**. Live D04 work must talk to **provider APIs from a private, capped harness**, never by flipping the unauthenticated demo flag on Vercel.

---

## 4. Spike matrix

Harness IDs match `--spike <id>` on [scripts/d04-provider-spike.mjs](../scripts/d04-provider-spike.mjs). `--list` prints this matrix with **no network**.

### 4.1 Streaming + tools — `streaming` / `tools` (MOD-06, CHAT-01)

| Field | Content |
|---|---|
| **IDs** | **MOD-06** adapter conformance (streaming, tool calls, cancel, usage, refusals, errors). **CHAT-01** persistent multi-turn chat with streaming (refresh/reconnect restores partial output without duplicates). |
| **What to test (when live)** | **`streaming`:** `POST` OpenRouter `chat/completions` with `stream: true`, `max_tokens: 64`, cheap catalog model. Confirm SSE `text_delta` chunks, terminal usage if provided, and that a mid-stream abort can be distinguished from success. **`tools`:** would send a tiny function/tool schema and assert normalized `ToolCall` / result pairing. **Not implemented in-repo** — live tools path is a documented stub. |
| **Pass** | Stream: at least one content delta + clean terminal event; usage logged; cost ≤ cap; no key in logs. Tools: provider returns a well-formed tool call that an adapter can map to Run/Step/ToolCall (WP-01 §3.1). |
| **Fail** | Non-stream JSON only; truncated/silent splice across models (§6.4); tools ignored or hallucinated as text; errors indistinguishable from content (CHAT-07). |
| **Cost logging** | JSONL row per attempt (`artifacts/d04-cost-log.jsonl`, gitignored). Streaming live row includes model, token usage if present, `estimated_usd` / provider `usage.cost` when available. |
| **Blocked on credentials?** | **Yes** for a real pass. Without `OPENROUTER_API_KEY` + live flags the harness no-ops (`--list`) or errors (live without key). Tools stay `unsupported_capability` even with a key until an adapter exists. |

### 4.2 Search / citations — `search` (SRC-01)

| Field | Content |
|---|---|
| **IDs** | **SRC-01** quick web search: retrieve permitted pages, nearby claim citations, sources panel (title, URL, publisher, retrieved_at, publication date when known). Related: SRC-02 scope, SRC-06 freshness, SRC-07 safe retrieval. |
| **What to test** | A retrieval path that (1) actually fetches, (2) cites only retrieved URLs, (3) discloses failed access instead of fabricating a read. Prototype Research prompt is **out of scope as a pass**. |
| **Pass** | Cited URLs ⊆ retrieved evidence; failed fetches disclosed; no private-file leakage into the query (SRC-02). |
| **Fail** | Prompt-only “sources”; invented URLs; treating Research mode as thoroughness. |
| **Cost logging** | Stub row `unsupported_capability` until a search adapter is chosen. Live search spend (when a provider is approved) logs query count + USD separately from completions. |
| **Blocked on credentials?** | **Yes.** No search/retrieval key in `.env.example`. Even with OpenRouter, this harness does **not** pretend plugins/search succeeded. |

### 4.3 Image generate / edit — `image` (IMG-01, IMG-02)

| Field | Content |
|---|---|
| **IDs** | **IMG-01** generate (prompt, aspect, references; real assets + failed/blocked states). **IMG-02** revise selected **exact version**; masks if supported; preserve ancestry; disable unsupported edits. |
| **What to test** | Provider image generate + a follow-up edit that consumes the prior asset id/bytes. Confirm originals are not overwritten. |
| **Pass** | Downloadable bytes exist; ancestry preserved; unsupported mask/edit is disabled or explicit `unsupported_capability`, not a silent unrelated image. |
| **Fail** | Text model describing an image; broken download links (ART-02 honesty); edit that ignores the reference version. |
| **Cost logging** | Stub until an image adapter is implemented. Live rows must include image count, resolution class, and USD. |
| **Blocked on credentials?** | **Yes.** No image-provider env contract. OpenRouter image models are **not** invoked by this harness (plan-only adapter). |

### 4.4 Voice — `voice` (VOI-01…04)

| Field | Content |
|---|---|
| **IDs** | **VOI-01** dictation (R2): mic, editable transcript, deny/no-audio. **VOI-02** conversational voice (R3): barge-in, mute, release mic. **VOI-03** audio files (R3). **VOI-04** privacy/usage (R3). |
| **What to test** | STT round-trip on a short fixture (VOI-01/03); later, realtime duplex (VOI-02) and retention/metering (VOI-04). Browser permission UX is product work, not this harness. |
| **Pass** | Transcript distinguishable from summary; no premature send; duration metering path exists. |
| **Fail** | Fake transcript; identity recognition claims (VOI-03); audio retained contrary to policy (VOI-04). |
| **Cost logging** | Stub. Live rows: duration seconds + USD; never store raw audio in git. |
| **Blocked on credentials?** | **Yes.** No STT/TTS env vars. Harness will not call a voice API. |

### 4.5 Matrix summary

| Spike `--id` | Requirement IDs | Live network? | Expected result **without** keys | Expected result **with** live flags + keys **today** |
|---|---|---|---|---|
| `streaming` | MOD-06, CHAT-01 | Only if `D04_ALLOW_LIVE=1` and `D04_MAX_USD>0` | `--list` / no-op; live without key → error | Cost-capped OpenRouter stream (`max_tokens: 64`); JSONL attempt |
| `tools` | MOD-06 | None (stub) | no-op / live-without-key error | `unsupported_capability` JSONL (adapters plan-only) |
| `search` | SRC-01 | None (stub) | no-op / live-without-key error | `unsupported_capability` JSONL |
| `image` | IMG-01, IMG-02 | None (stub) | no-op / live-without-key error | `unsupported_capability` JSONL |
| `voice` | VOI-01, VOI-02, VOI-03, VOI-04 | None (stub) | no-op / live-without-key error | `unsupported_capability` JSONL |

---

## 5. Expected gates (before any tracker `done`)

| Gate | Bar |
|---|---|
| **SEC-01** | Must remain **Fail** until D05 auth protects run creation. D04 must **not** enable unauthenticated public spend (`OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO=true` on a public host, or wiring the harness at a public `/api/chat`). |
| **Spend cap** | Live calls require an explicit USD cap. Exceeding remaining cap → no request. Costs go to gitignored JSONL; PR evidence is **redacted** summaries only. |
| **Secret hygiene** | No keys in git, harness stdout, or cost logs. Bundle/log scans of this PR should find only `.env.example` placeholders. |
| **Honesty for tracker `done`** | D04 `done` needs: (1) live streaming (and documented tool/search/image/voice results or explicit gaps), (2) redacted cost appendix, (3) this plan updated with pass/fail. **This PR does not meet that bar.** |

---

## 6. Cost logging schema

Path: `artifacts/d04-cost-log.jsonl` (directory gitignored; **do not commit**). One JSON object per line, UTF-8, no secrets.

```json
{
  "ts": "2026-09-14T07:45:00.000Z",
  "spike_id": "streaming",
  "requirement_ids": ["MOD-06", "CHAT-01"],
  "status": "attempted",
  "result": "pass",
  "provider": "openrouter",
  "endpoint": "https://openrouter.ai/api/v1/chat/completions",
  "model": "google/gemini-2.5-flash",
  "stream": true,
  "max_tokens": 64,
  "prompt_tokens": 12,
  "completion_tokens": 18,
  "estimated_usd": 0.0001,
  "provider_cost_usd": 0.0001,
  "cap_usd": 1.0,
  "remaining_cap_usd": 0.9999,
  "called_public_chat_api": false,
  "notes": "SSE deltas received; usage from stream trailer.",
  "error": null
}
```

| Field | Required | Notes |
|---|---|---|
| `ts` | yes | ISO-8601 UTC |
| `spike_id` | yes | `streaming` \| `tools` \| `search` \| `image` \| `voice` |
| `requirement_ids` | yes | PRD IDs from the matrix |
| `status` | yes | `listed` \| `noop` \| `blocked_on_credentials` \| `blocked_on_cap` \| `unsupported_capability` \| `attempted` |
| `result` | yes | `n/a` \| `pass` \| `fail` \| `blocked` — **never `pass` for stubs** |
| `provider` | yes | `openrouter` \| `none` \| planned adapter name |
| `endpoint` | yes | Provider URL or `none`. Must not be a public Codeworks `/api/chat` |
| `model` | no | Served or requested slug; omit if unused |
| `stream` | no | Boolean when relevant |
| `max_tokens` | no | Capped for D04 |
| `prompt_tokens` / `completion_tokens` | no | From provider usage when present |
| `estimated_usd` | no | Harness estimate or `null` |
| `provider_cost_usd` | no | OpenRouter `usage.cost` when present |
| `cap_usd` / `remaining_cap_usd` | when live | From `D04_MAX_USD` minus prior JSONL spend |
| `called_public_chat_api` | yes | Always `false` |
| `notes` | yes | Human-readable, no secrets |
| `error` | yes | `null` or safe error message (no headers/bodies that might echo keys) |

Statuses used by the current harness:

- **Default / `--list`:** prints matrix; does not write JSONL; no network.
- **`--spike` without live flags:** console no-op; optional JSONL `noop` is **not** written (keep artifacts empty until a live or explicit stub-under-live run).
- **Live, missing key:** stderr error, exit 1, no network, no invented credentials.
- **Live + key + `streaming`:** `attempted` + `pass`/`fail`.
- **Live + key + `tools|search|image|voice`:** `unsupported_capability`, `result: blocked`.

---

## 7. Gaps from inspection (G1–G10)

| ID | Gap | Severity | PRD / gate |
|---|---|---|---|
| **G1** | **SEC-01 critical:** `/api/chat` has no authenticated actor. Kill-switch off = no generation; kill-switch on = **unauthenticated public spend**. | Critical / R0 blocker | SEC-01, §22, WP-01 |
| **G2** | **Non-streaming** proxy and client; no SSE, no reconnect cursor, no partial-output restore. | High (R1) | MOD-06, CHAT-01 |
| **G3** | **No tools** on the completion request; no ToolCall entity; no cancel/approval path. | High (R1 tools / R3 agents) | MOD-06, AGT |
| **G4** | **Research is prompt-only**; UI Research is disabled. No retrieve/cite pipeline. | High (product honesty) | SRC-01…07, §10, §22 |
| **G5** | **No image or voice** adapters, env contract, or storage ancestry. | Medium now / High by R2–R3 | IMG-01/02, VOI-01…04 |
| **G6** | **Usage not persisted.** `usage` may return from OpenRouter and is dropped. No reservation/settle. | High / R0 blocker (REL-03) | BIL, OPS-01, WP-01 §3.3 |
| **G7** | **60s serverless ceiling** — no worker/queue for research, long tools, or voice. | High for those modes | §18, SRC-03, VOI-02 |
| **G8** | **Context accounting missing.** Hard 24-message / 12k-char reject (formerly silent slice in WP-01 audit). Not token-aware; no compaction/pin (MOD-04). | High | MOD-04, §22 truncation row |
| **G9** | **Fixed model map** (env slugs), not a versioned registry; Auto vs named not implemented as §6 layers. | High | MOD-01/02, §6.3 |
| **G10** | **No adapter conformance suite.** Nothing asserts streaming, tools, refusals, or errors per provider. | High (R1) | MOD-06 acceptance |

Additional honesty gaps (already tracked in WP-01, not duplicated as G11+): Compare Judge/Combine heuristics historically; current prototype may have been relabeled — D04 still must not treat Compare as evaluated routing.

---

## 8. Blocked-on-credentials checklist

Do **not** invent values for any of these. Check when a private, capped key is available on an operator machine (never in git).

| Credential / decision | In `.env.example` today? | Needed for | Status in this environment |
|---|---|---|---|
| `OPENROUTER_API_KEY` (restricted, low-limit) | Yes (empty) | `streaming` live; later WP-03 gateway | **Unavailable** — harness no-ops |
| `D04_ALLOW_LIVE=1` | No (operator-only, not a product secret) | Any live call | Unset in CI / this agent |
| `D04_MAX_USD` > 0 | No (operator-only) | Spend cap | Unset |
| Search / retrieval provider key + policy | No | SRC-01 live | Missing — adapter not chosen |
| Image generation/edit key | No | IMG-01/02 live | Missing |
| STT / TTS / realtime voice key | No | VOI-* live | Missing |
| Identity provider (D05) | No | Public generation | Missing — **auth before public keys** |
| Production OpenRouter key on Vercel | N/A | Must stay gated | **Do not** enable `OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO=true` publicly |

Operator live recipe (private shell only):

```bash
# Never commit the exported values. Never point this at a public /api/chat.
export D04_ALLOW_LIVE=1
export D04_MAX_USD=1
export OPENROUTER_API_KEY="..."   # restricted key
node scripts/d04-provider-spike.mjs --spike streaming
```

---

## 9. Harness

**Script:** [`scripts/d04-provider-spike.mjs`](../scripts/d04-provider-spike.mjs) (Node ESM, no npm dependencies).

| Invocation | Network | Exit |
|---|---|---|
| `node scripts/d04-provider-spike.mjs` | None | 0 |
| `node scripts/d04-provider-spike.mjs --list` | None | 0 |
| `node scripts/d04-provider-spike.mjs --spike streaming` without live flags | None (no-op) | 0 |
| Same with live flags, missing `OPENROUTER_API_KEY` | None | 1 (error, no invented credentials) |
| Live + key + `--spike streaming` | OpenRouter only | 0/1 from stream pass/fail |
| Live + key + `--spike tools\|search\|image\|voice` | None | 0 — writes `unsupported_capability` stub |

Every run prints a **SEC-01** reminder: do not spend via unauthenticated public `/api/chat`.

---

## 10. How D04 becomes `done`

All of the following, with evidence in a follow-up PR (not this one):

1. Live `streaming` spike against OpenRouter (capped, private key) — pass/fail recorded.
2. Live or explicitly blocked results for tools, search, image, voice — **no fake passes**.
3. Redacted cost summary (totals, models, spike ids) committed or attached; raw JSONL remains gitignored.
4. Gaps G1–G10 updated with empirical notes (especially MOD-06 stream shape and tool support).
5. Tracker D04 → `done` only then, with PR link. **This PR stays `in progress`.**

---

## 11. D05 handoff (do not start public keys)

Streaming/tool findings feed **Run / Step / ToolCall** and event names (`text_delta`, terminal usage) in WP-01 §3.1–3.4. Search/image/voice stay later packages; D05 still must not claim them.

Execute WP-01 architecture **P1–P5** before exposing a paid key on a shared URL:

| Order | Theme | Why D04 cares |
|---|---|---|
| **P1** | Honesty UX: truncation copy; no fake intelligence | Matches D04 “no fake success” and G8 |
| **P2** | Preview CI; no prod key on previews | Same spend-cap discipline as this harness |
| **P3** | Migrations: User/Workspace, Conversation/Message, Run, UsageEntry | G6 ledger; CHAT-01 persistence |
| **P4** | Auth on run creation; replace anonymous `/api/chat` spend | **G1 SEC-01** — **auth before public keys** |
| **P5** | Metering reserve/settle + idempotency tests | Cost logging in D04 is a file; production needs `UsageEntry` |

**Sequencing constraint (WP-01 §4):** do not open public generation while P4 is incomplete. Prefer P1 early. D04 live spikes stay on an operator machine with a **restricted** key.

Informed packages (not started):

- **WP-03** (MOD, BIL) — streaming/tools/cost matrix.
- **WP-05** (SRC) — search/citations spike.
- **WP-07** (IMG, VOI) — image/voice spikes.

---

*End of D04 provider-spike plan. Agents must not mark D04 or any MOD/SRC/IMG/VOI ID `done` from this document alone.*
