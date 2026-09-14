# ARCEL Codeworks — Delivery Tracker

**Source of truth for done vs not-done.** Update this file (or Notion mirror) whenever a task finishes.  
PRD: [ARCEL-Codeworks-PRD.md](./ARCEL-Codeworks-PRD.md) · Repo: `swapnil-create/arcel-codeworks`  
Last updated: 2026-09-14 (PR #14 Research chip; D05 SEC-01 isolation tests; visual overhaul approved) · Zone: Asia/Dubai (GST)

## How to update
- Status values: `not started` | `in progress` | `blocked` | `done` | `needs review`
- When marking `done`, add evidence (PR link, Notion page, commit SHA) in Notes.
- Agents must not mark a requirement `done` without acceptance evidence from the PRD.

## Assumptions (R0 defaults — pending product-owner sign-off)
- General-purpose web client first; AEC is optional pack after V1
- Auto + named models; task / intelligence / effort are separate
- Managed provider keys; no automatic overages
- Trial + one paid personal plan first
- Proceeding on these defaults until Swapnil overrides

---

## A. Next 10 working days

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| D01 | Approve product scope, naming, task/model/effort/expertise split | Swapnil (product) | in progress | Formal sign-off skipped 2026-09-14; proceeding on PRD §28 defaults until overridden. |
| D02 | Traceable backlog from requirement IDs + WP-01…11 | Coder | done | Tracker commit `53b4a0f` + Notion board https://app.notion.com/p/ea26e00cc54643ab8d9849e89320c31e |
| D03 | Clickable flows: first chat, model choice, files, research, artifacts, voice, quota/errors | UI UX Expert | done | R0 clickable (general-purpose only). Landed on main via merged [PR #2](https://github.com/swapnil-create/arcel-codeworks/pull/2) (`59cd67d`). Evidence: [FLOW-MAP.md](./docs/flows/FLOW-MAP.md) · [prototype](./docs/flows/prototype/index.html) · [Figma](https://www.figma.com/design/I7B2hqfQshLuqukyq73rNC). Coder: sync Notion D03 to done. |
| D04 | Provider spikes: streaming/tools, search citations, image edit, voice; log gaps + cost | Coder | in progress | Private live streaming pass done; tools/search/image/voice remain `unsupported_capability`. Visual overhaul approved — resume remaining spikes after `AUTH_*` is live. **Not done.** |
| D05 | Identity, storage permissions, canonical data model, ledger, preview deploy pipeline | Coder + Standards | in progress | Session/OAuth gate is on main ([PR #11](https://github.com/swapnil-create/arcel-codeworks/pull/11)); this slice adds session-gate + in-memory isolation tests. Next: production `AUTH_*` / IdP, Postgres cross-user tests, ledger, and protected preview. SEC-01 remains Fail. **Owner action:** set `AUTH_*` on Vercel ([AUTH.md](./docs/AUTH.md) checklist) before OpenRouter on production. |
| D06 | Vertical slice: sign-in → attach → model → stream cited answer → save → reopen → revoke/delete | Coder | not started | After D05 contracts |
| D07 | Review evidence, refine estimates, start R1 beta scope | All + Swapnil | not started | End of first 10 days |

---

## B. Work packages (V1)

| Package | Scope | Depends | Status | Evidence |
|---|---|---|---|---|
| WP-01 | Architecture, schemas, env, auth, CI | R0 decisions | in progress | Architecture, security gate, session/OAuth gate, and in-memory isolation fixtures are merged. Still **not done** — SEC-01 remains Fail until production IdP (`AUTH_*` owner action) and Postgres cross-user tests; real DB, REL-03, OPS-01, and protected preview remain. |
| WP-02 | Chat/history/settings (ACC, CHAT, PER) | WP-01 | not started | |
| WP-03 | Model gateway/registry/metering (MOD, BIL) | WP-01 | not started | Informed by D04 spike matrix (streaming/tools/cost). |
| WP-04 | Upload/library/retrieval (FIL, PRJ) | WP-01 | not started | |
| WP-05 | Search/research (SRC, TSK bg) | WP-02–04 | not started | Informed by D04 search/citations spike. |
| WP-06 | Artifacts/code/data (ART, COD, DAT) | WP-02–04 | not started | |
| WP-07 | Media/voice (IMG, VOI) | WP-02–03 | not started | Informed by D04 image/voice spikes. |
| WP-08 | Memory/assistants (MEM, AST) | WP-02–04 | not started | |
| WP-09 | Connectors/tasks/approvals (CON, TSK, AGT) | WP-03–06 | not started | |
| WP-10 | Compare/sharing/team/billing (CMP, COL, BIL) | Core pkgs | not started | |
| WP-11 | Release validation (SEC, REL, PERF, OPS) | All V1 | not started | |

---

## C. Active agent assignments (wave 1)

| Agent | Assignment | Status |
|---|---|---|
| Coder | Visual pause lifted. D04/D05 backend resumed (not done); `AUTH_*`, IdP, DB, ledger, and provider capability work remain. | in progress |
| UI UX Expert | ARCEL visual overhaul on main via [PR #13](https://github.com/swapnil-create/arcel-codeworks/pull/13) + [PR #14](https://github.com/swapnil-create/arcel-codeworks/pull/14) Research · Unavailable chip (`690a336`). Post-deploy visual QA approved 2026-09-14. | done |
| Standards Expert | Security/authz/NFR review; SEC-01 isolation + `AUTH_*` gate before OpenRouter. | in progress |
| Chief of Staff | Ops cadence; keep Swapnil unblocked on D01 decisions | not started |

---

## D. Change log

| When (GST) | What |
|---|---|
| 2026-09-14 02:38 | Tracker created; PRD already on `main` (`ARCEL-Codeworks-PRD.md`) |
| 2026-09-14 02:38 | Tracker pushed to `main` (`53b4a0f`) |
| 2026-09-14 02:39 | Notion Codeworks Tasks board seeded — https://app.notion.com/p/ea26e00cc54643ab8d9849e89320c31e |
| 2026-09-14 02:40 | D01 formal sign-off skipped; proceeding on PRD §28 defaults (D01 → in progress, D02 → done) |
| 2026-09-14 02:42 | WP-01 notes PR opened — https://github.com/swapnil-create/arcel-codeworks/pull/1 (architecture draft; WP-01 remains in progress) |
| 2026-09-14 02:50 | D03 clickable flows (UI UX Expert): FLOW-MAP + HTML prototype + Figma I7B2hqfQshLuqukyq73rNC → done |
| 2026-09-14 03:00 | WP-01 §20 security/NFR gate PR opened — https://github.com/swapnil-create/arcel-codeworks/pull/3 (Standards Expert; WP-01 remains in progress / not done) |
| 2026-09-14 03:05 | D03 FLOW-MAP marked authoritative; dark-theme prototype rewritten to match screens A–G + ACC-03 stamps |
| 2026-09-14 03:12 | D03 ACC-03 / §5.4 state coverage mapped and tagged (flow-level only; WP-11 still owns full a11y). WP-01 unchanged. |
| 2026-09-14 09:00 | Merged overnight PRD, WP-01 audits, and D03 prototype. Applied PRD §22 honesty corrections to the prototype; blockers and required decisions are recorded in `docs/PRD-MERGE-STATUS.md`. |
| 2026-09-14 10:38 | [PR #3](https://github.com/swapnil-create/arcel-codeworks/pull/3) §20 security/NFR gate merged to main (`7ba380e` → `docs/WP-01-SECURITY-NFR-GATE.md`, tip `b33991b`). Same window: [PR #1](https://github.com/swapnil-create/arcel-codeworks/pull/1) architecture (`ac69866`) and [PR #2](https://github.com/swapnil-create/arcel-codeworks/pull/2) D03 (`59cd67d`) on main. WP-01 remains in progress. |
| 2026-09-14 11:45 | D04 → in progress: provider spike plan + capability matrix + no-op harness (`docs/D04-PROVIDER-SPIKES.md`, `scripts/d04-provider-spike.mjs`). Live costs blocked on credentials; SEC-01 blocks unauthenticated public spend. |
| 2026-09-14 13:33 | [PR #6](https://github.com/swapnil-create/arcel-codeworks/pull/6) merged to main (`eb5f2d5`): D04 plan/harness on main; D04 still in progress / not done. |
| 2026-09-14 14:34 | D05 → **in progress** (not done): honesty/auth-required UX, PR CI scaffold, Conversation/Message/Run/UsageEntry stubs. WP-01 remains in progress. |
| 2026-09-14 14:50 | D05 polish on PR #8: gate banner CTAs (Open settings / View existing work) + reserved `quota-exhausted` catalog. Still not done; no demo kill-switch. |
| 2026-09-14 14:55 | Private D04 live spike (operator harness): streaming pass (~0.000013 USD, `google/gemini-2.5-flash`); tools/search/image/voice `unsupported_capability`. Evidence: [docs/D04-LIVE-RESULTS.md](./docs/D04-LIVE-RESULTS.md). D04 still in progress / not done. |
| 2026-09-14 16:47 | [PR #11](https://github.com/swapnil-create/arcel-codeworks/pull/11) merged — D05 session/OAuth gate; SEC-01 remains **Fail**. |
| 2026-09-14 17:18 | [PR #13](https://github.com/swapnil-create/arcel-codeworks/pull/13) merged — ARCEL visual overhaul: tokens, motion, composer, model/effort split, honesty banners, command palette, and mobile sheets. |
| 2026-09-14 17:51 | [PR #14](https://github.com/swapnil-create/arcel-codeworks/pull/14) merged (`690a336`) — Research · Unavailable chip on all viewports (no D/WP status change). |
| 2026-09-14 17:53 | Visual overhaul **approved**. D04/D05 backend resumed. D05 SEC-01 isolation tests (session matrix + in-memory ACL fixtures). **Owner action:** `AUTH_*` on Vercel before OpenRouter on production — [AUTH.md](./docs/AUTH.md) checklist. SEC-01 remains Fail. |
