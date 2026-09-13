# ARCEL Codeworks — Delivery Tracker

**Source of truth for done vs not-done.** Update this file (or Notion mirror) whenever a task finishes.  
PRD: [ARCEL-Codeworks-PRD.md](./ARCEL-Codeworks-PRD.md) · Repo: `swapnil-create/arcel-codeworks`  
Last updated: 2026-09-14 · Zone: Asia/Dubai (GST)

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
| D03 | Clickable flows: first chat, model choice, files, research, artifacts, voice, quota/errors | UI UX Expert | not started | |
| D04 | Provider spikes: streaming/tools, search citations, image edit, voice; log gaps + cost | Coder | not started | Depends on D01 defaults OK |
| D05 | Identity, storage permissions, canonical data model, ledger, preview deploy pipeline | Coder + Standards | not started | WP-01 core |
| D06 | Vertical slice: sign-in → attach → model → stream cited answer → save → reopen → revoke/delete | Coder | not started | After D05 contracts |
| D07 | Review evidence, refine estimates, start R1 beta scope | All + Swapnil | not started | End of first 10 days |

---

## B. Work packages (V1)

| Package | Scope | Depends | Status | Evidence |
|---|---|---|---|---|
| WP-01 | Architecture, schemas, env, auth, CI | R0 decisions | not started | |
| WP-02 | Chat/history/settings (ACC, CHAT, PER) | WP-01 | not started | |
| WP-03 | Model gateway/registry/metering (MOD, BIL) | WP-01 | not started | |
| WP-04 | Upload/library/retrieval (FIL, PRJ) | WP-01 | not started | |
| WP-05 | Search/research (SRC, TSK bg) | WP-02–04 | not started | |
| WP-06 | Artifacts/code/data (ART, COD, DAT) | WP-02–04 | not started | |
| WP-07 | Media/voice (IMG, VOI) | WP-02–03 | not started | |
| WP-08 | Memory/assistants (MEM, AST) | WP-02–04 | not started | |
| WP-09 | Connectors/tasks/approvals (CON, TSK, AGT) | WP-03–06 | not started | |
| WP-10 | Compare/sharing/team/billing (CMP, COL, BIL) | Core pkgs | not started | |
| WP-11 | Release validation (SEC, REL, PERF, OPS) | All V1 | not started | |

---

## C. Active agent assignments (wave 1)

| Agent | Assignment | Status |
|---|---|---|
| Coder | Tracker + backlog; WP-01 audit of current prototype vs PRD §22; kickoff PRs | in progress |
| UI UX Expert | D03 clickable flows from PRD §5 + acceptance scenarios §3 | not started |
| Standards Expert | Security/authz/NFR checklist from PRD §20; review WP-01 contracts | not started |
| Chief of Staff | Ops cadence; keep Swapnil unblocked on D01 decisions | not started |

---

## D. Change log

| When (GST) | What |
|---|---|
| 2026-09-14 02:38 | Tracker created; PRD already on `main` (`ARCEL-Codeworks-PRD.md`) |
| 2026-09-14 02:38 | Tracker pushed to `main` (`53b4a0f`) |
| 2026-09-14 02:39 | Notion Codeworks Tasks board seeded — https://app.notion.com/p/ea26e00cc54643ab8d9849e89320c31e |
| 2026-09-14 02:40 | D01 formal sign-off skipped; proceeding on PRD §28 defaults (D01 → in progress, D02 → done) |
