# D04 — Live provider spike results (private harness)

**Repo:** `swapnil-create/arcel-codeworks`  
**Harness:** [scripts/d04-provider-spike.mjs](../scripts/d04-provider-spike.mjs)  
**Plan:** [docs/D04-PROVIDER-SPIKES.md](./D04-PROVIDER-SPIKES.md)  
**Operator run:** 2026-09-14 ~14:55 Asia/Dubai (UTC+4)  
**Status:** **in progress** — live streaming passed; tools/search/image/voice remain `unsupported_capability`. **D04 is not done.**

This is a redacted summary of a private operator run. Raw JSONL stays under gitignored `artifacts/`. No keys, `.env` files, or cost-log artifacts are committed here.

---

## Hard constraints observed

| Constraint | Observed |
|---|---|
| Private harness only | `https://openrouter.ai/api/v1/chat/completions` |
| Public chat API | `called_public_chat_api: false` on every JSONL row |
| Unauthenticated demo flag | `OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO` **unset** (not enabled) |
| Live flags | `D04_ALLOW_LIVE=1`, `D04_MAX_USD=1` |
| Key hygiene | Key from operator env only; not printed, logged, or committed. Raw JSONL under gitignored `artifacts/` |

The harness did **not** call or deploy to a public Vercel `/api/chat`.

---

## Spike outcomes

| Spike | Requirement IDs | Status | Result | Notes |
|---|---|---|---|---|
| `streaming` | MOD-06, CHAT-01 | `attempted` | **pass** | SSE content deltas; `finish_reason` `stop` |
| `tools` | MOD-06 | `unsupported_capability` | blocked | No tools adapter |
| `search` | SRC-01 | `unsupported_capability` | blocked | No retrieval adapter |
| `image` | IMG-01, IMG-02 | `unsupported_capability` | blocked | No image adapter |
| `voice` | VOI-01…04 | `unsupported_capability` | blocked | No STT/TTS adapter |

---

## Streaming detail

| Field | Value |
|---|---|
| Model | `google/gemini-2.5-flash` |
| Stream | `true` |
| `max_tokens` | 64 |
| `prompt_tokens` | 10 |
| `completion_tokens` | 4 |
| `provider_cost_usd` | ~0.000013 |
| Cap / remaining | 1.00 / ~0.999987 |
| Public chat API | not called |

**Approx total cost this run:** ~0.000013 USD

---

## Remaining gaps

- Tools, search, image, and voice adapters are still missing (`unsupported_capability` stubs only).
- `api/chat.js` is still **non-streaming** and **SEC-01 Fail**.
- Keep D04 **in progress**. Do not mark D04, MOD-06, SRC-01, IMG-*, or VOI-* `done` from this run.

---

*End of private live-spike results. Agents must not commit secrets, API keys, `.env` files, or `artifacts/` JSONL.*
