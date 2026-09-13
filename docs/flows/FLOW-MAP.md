# ARCEL Codeworks — D03 Flow Map (R0)

**Task:** D03 · Clickable flows for the core general-purpose client  
**Owner:** UI UX Expert  
**PRD:** §5 Experience architecture · §3 Users, jobs and success · §6 Model offering · §8 Packaging, quotas and commercial model  
**Status:** Done (clickable R0; not production implementation)  
**Companion artifacts:**
- Clickable prototype: [`docs/flows/prototype/index.html`](./prototype/index.html)
- Figma overview: [D03 — Flow overview](https://www.figma.com/design/I7B2hqfQshLuqukyq73rNC)

**Product rule:** general-purpose only. No AEC pillar menu, no industry onboarding, no LED-logo lockup.

---

## 1. Purpose

This map is the interaction contract for R0 clickable flows. It tells Coder *what to build toward*, not how to implement the production stack.

Every flow below is a real user path from PRD §5, with named screens, click targets, required states (PRD §5.4), and a pointer into the HTML prototype. Example chips on home **fill or send a real prompt**; they must not open a seeded fake conversation.

---

## 2. Information architecture (PRD §5.1)

### Primary sidebar

| Item | Role | Clickable result |
|---|---|---|
| **New chat** | Start a general conversation | Opens **A1** empty home / composer. No project or expertise required. |
| **Search history** | Find authorized conversations | Overlay; results are history only. Archive is reversible; delete confirms downstream artifacts. |
| **Projects** | Optional folders for related chats + files | Empty or user-created projects. Moving a chat here shows a context/visibility confirmation. |
| **Library** | Uploads and generated artifacts | Distinguish originals from generated files. Preview / rename / download / delete. |
| **Tasks** | One-time and recurring work | List, pause, and inspect background jobs. Pause does not delete history. |

### Account / settings area (not primary nav)

| Item | Role |
|---|---|
| **Models** | Curated catalog + Auto routing explanation. Searchable picker also lives in the composer. |
| **Connections** | Optional connectors; none required to start. Revoke blocks new retrieval. |
| **Usage** | Remaining allowance, renewal date, task estimates. No “unlimited” copy. |
| **Privacy** | Temporary chat, memory controls, deletion/retention in plain language. |
| **Settings** | Instructions, tone, language, theme (light / dark / system), Enter behavior. |

Optional Assistants are reached from the composer or a secondary directory — not a fifth primary pillar.

### Composer (always visible on conversation surfaces)

Always present: text input · **Attach** · **Tools** · **Mic** · **Auto · Standard** (intelligence + effort) · **Send** / **Stop**.

**Tools menu:** Search web · Deep research · Analyze data · Create image · Create document · Code · Tasks. Selected tools become removable chips. Show only controls relevant to the selected task.

**Intelligence vs effort (PRD §6.1):**
- Task = what to do (tools).
- Intelligence = who handles it (**Auto** or a **named model**).
- Effort = how much compute (**Quick / Standard / Deep**).
- Expertise is *not* a model and does not appear in this R0 IA.

Default label: **Auto · Standard**. “Choose model” opens the compact catalog (PRD §6.2). A response **Details** action shows the actual model id, publisher, tools, effort mapping, duration and usage.

### Work surface (PRD §5.3)

Conversation on the left. Optional resizable **artifact / source** panel on the right. On small screens the panel is a dedicated view with **Return to chat**.

---

## 3. Flows A–G

Click targets in **bold**. Prototype screen ids match this map.

### Flow A — First chat

*Empty home → stream → actions. PRD §5.1, §5.2, ACC-02, CHAT-01, CHAT-02, CHAT-08.*

| Screen | Name | What the user sees | Primary clicks | Required states |
|---|---|---|---|---|
| **A1** | Empty home | Composer-first home. Wordmark + “Your AI workspace.” A few **general** examples (explain, compare, write, analyze). No AEC, no forced project, no forced model. | Example chip fills or sends the prompt. **Send** with typed text. **Attach / Tools / Mic / Auto · Standard**. Sidebar **New chat** returns here. | Empty |
| **A2** | Streaming reply | User bubble + assistant stream. Run summary / tool activity only (never private chain-of-thought). **Stop** replaces Send. | **Stop** marks output **partial**. Stream completes → **A3**. | Loading · Working |
| **A3** | Response actions | Completed answer. Actions: Copy · Save to project · Open artifact · Retry with another model · Feedback · **Details** (model, tools, usage). | **Details** shows Auto’s chosen named model. **Retry with another model** jumps to **B2**. **Open artifact** jumps to **E1** when an artifact exists. | Completed · Partial (if stopped) |

**A notes for Coder**
- Home examples must not open a canned transcript.
- Refresh/reconnect later must restore the saved conversation and any partial stream without duplicating messages (CHAT-01).
- Editing a prior prompt creates a branch; it does not destroy descendants (CHAT-02).

---

### Flow B — Model choice

*Auto vs lock · effort separate. PRD §6.*

| Screen | Name | What the user sees | Primary clicks | Required states |
|---|---|---|---|---|
| **B1** | Auto · Standard | Composer intelligence control reads **Auto · Standard**. Popover: Auto (explained: “selects third-party models”) + effort **Quick / Standard / Deep**. Task tools stay outside this control. | Change effort. **Choose model** → **B2**. | Empty / default |
| **B2** | Choose model | Compact curated list (4–6 slots): Fast general · Balanced · Deep reasoning · Coding specialist · Long-context / multimodal · Alternative perspective. Each row: display name, publisher, strengths, modalities, tool compatibility, relative speed and cost. Favorites / recent first. No raw provider IDs. | **Lock** a named model. Incompatible combo is disabled with reason. **Use Auto** returns to **B1**. | Permission-denied (incompatible) · Unavailable (retired / region) |

**B notes for Coder**
- Locked named model: use it or explain why it cannot; offer an alternative; never silently switch publishers.
- Auto fallback stays inside the same data-policy and budget; otherwise stop with an actionable message.
- After a partial stream, a retry is a **new** attempt — do not splice another model into the same bubble.
- Replace prototype labels “ARCEL 1 / Fast / Deep” with Auto / Quick / Standard / Deep.

---

### Flow C — File work

*Upload states → cited pages. PRD §5.2, FIL-01–02, DAT-01.*

| Screen | Name | What the user sees | Primary clicks | Required states |
|---|---|---|---|---|
| **C1** | Upload states | Attach tray: two PDFs (or CSV/XLSX). Each file shows **Ready / Partial / Failed**, size, type. Drag/drop, picker, paste-image all share the same states. Model cannot use a file until status is explicit. | Attach files. Retry a Failed file. Remove a chip. **Send** when at least one file is Ready → **C2**. | Empty · Loading · Partial · Failed · Ready |
| **C2** | Cited pages | Answer with **page / sheet locators**. Source panel opens the **exact original revision**. Unreadable pages are disclosed, not implied as understood. | Citation chip opens the page in the source panel. **Download revised workbook** when analysis produced one. | Completed · Partial (some pages unreadable) · Failed |

**C notes for Coder**
- “Files only” source scope must generate **no** external search requests (SRC-02).
- Totals and charts must come from executed analysis, never fabricated numbers (DAT-01).
- Publish tested limits in the UI (attachments per prompt, MiB, page/row caps). Do not imply whole-file understanding after partial extraction.

---

### Flow D — Research

*Plan → async → report. PRD §10 SRC-01–05.*

| Screen | Name | What the user sees | Primary clicks | Required states |
|---|---|---|---|---|
| **D1** | Plan + estimate | Deep research selected. Scope (Web / Files / Both). Clarifying questions only when consequential. Plan + **time / usage estimate**. Confirmation required when cost is outside the pre-approved allowance. | **Start research** (or **Confirm estimate**) → **D2**. **Cancel** returns to composer. | Empty · Estimate / confirmation |
| **D2** | Async report | Job continues if the tab closes. Progress: queries run, sources read, heartbeat. User can **Cancel**, **Reopen**, add steering (pauses if cost exceeds cap). Completed: editable report with methodology, sources, limitations, unresolved questions. “Read N sources” only when records exist. | **Cancel** → cancelled / partial. Source row opens the source panel. **Save report** as artifact → **E1**. | Working · Completed · Partial · Failed · Cancelled · Quota-exhausted |

**D notes for Coder**
- Research is a retrieval-and-synthesis **workflow**, not a “be thorough” prompt.
- Cited URLs come from retrieved evidence. Failed fetches are disclosed.
- Private connectors are separately enabled; they are not implied by “Web.”

---

### Flow E — Artifact editing

*Select revise · version restore. PRD §5.3, ART-01–03.*

| Screen | Name | What the user sees | Primary clicks | Required states |
|---|---|---|---|---|
| **E1** | Artifact panel | Split surface: conversation left, document / table / code / image gallery right. Selection-based revise. Autosave + **Version history**. Restore creates a **new** version (does not destroy current). | Select a paragraph → **Revise selection**. **History** → pick version → **Restore as new version**. **Download** only if a real file exists. Small-screen: **Return to chat**. | Empty · Working · Completed · Failed |

**E notes for Coder**
- Deleting a chat asks whether to keep linked artifacts.
- Run cleanup must not delete delivered files (ART-03).
- Native Office-style in-browser editing is **not** required; structured edit + native export is enough if labeled.

---

### Flow F — Voice

*Dictation → text continuity. PRD §14 VOI-01, VOI-02.*

| Screen | Name | What the user sees | Primary clicks | Required states |
|---|---|---|---|---|
| **F1** | Voice continuity | **Mic** starts a visible recording indicator. Transcript is **editable before send**. Denied permission and no-audio are explicit. Conversational voice (R3) can **Mute**, interrupt, and **Continue in text** in the same thread. Mic released on exit. | **Mic** → record. **Cancel** discards capture (nothing sent). **Insert** puts transcript in the composer. **Continue in text** keeps the same conversation. | Empty · Working (recording) · Permission-denied · Failed (no audio) · Completed |

**F notes for Coder**
- No text is sent prematurely from dictation.
- Interrupt/barge-in must stop playback and avoid a duplicate answer (VOI-02).
- Audio retention and duration metering are separate from text usage (VOI-04).

---

### Flow G — Quota / Errors

*Distinct failure + no auto overage. PRD §5.4, §8.2, CHAT-07.*

| Screen | Name | What the user sees | Primary clicks | Required states |
|---|---|---|---|---|
| **G1** | Quota & errors | Distinct banners — never generic success and never stored as ordinary assistant text: **quota-exhausted**, **provider unavailable**, **rate limited**, **permission denied**, **content blocked**, **network error**, **invalid input**. Quota banner: usage remaining = 0, renewal date, **cheaper route**, **wait for renewal**, optional **explicit top-up**. Existing work stays viewable/downloadable. | **Use cheaper route** (e.g. Auto · Quick, no Deep/research). **View usage**. Top-up only if the account opted in with a cap. Dismiss does not invent a retry that bypasses quota. | Quota-exhausted · Failed (each class) · Permission-denied |

**G notes for Coder**
- Default: **no automatic overage**. Manual named-model choice cannot bypass quotas.
- Reserve budget before work; concurrent runs cannot spend the same remaining balance.
- Error taxonomy (PRD §19): `auth_required`, `permission_denied`, `invalid_input`, `unsupported_capability`, `quota_exceeded`, `provider_unavailable`, `rate_limited`, `content_blocked`, `tool_failed`, `context_limit`, `cancelled`.

---

## 4. §3 scenario coverage

General-purpose acceptance scenarios (PRD §3). AEC cases are **excluded** from this suite.

| §3 scenario | Covered by | Prototype screens |
|---|---|---|
| Explain a concept, then change language or tone without starting over | First chat + composer follow-up (same thread) | **A1 → A2 → A3** |
| Compare products using current sources, then save a cited comparison | Research + save artifact | **D1 → D2** · save → **E1** |
| Upload two PDFs and ask for differences with page references | File work | **C1 → C2** |
| Analyze a spreadsheet, calculate a result and download the revised workbook | File work (Analyze data tool) | **C1 → C2** (workbook download) |
| Draft a document, edit a selected paragraph and restore an earlier version | Artifact editing | **E1** |
| Generate an image and revise it using the previous version as reference | Artifact panel (image gallery + ancestry) | **E1** (image version) |
| Discuss a question by voice and continue the same conversation in text | Voice | **F1** |
| Build a small interactive prototype, inspect its code and download it | Artifact (code preview) | **E1** (code) + **A3** Open artifact |
| Resume a project tomorrow, with explicit memory and file permissions intact | Projects + Library + Privacy | Sidebar **Projects / Library / Privacy** |
| Schedule a recurring briefing and pause it without deleting its history | Tasks | Sidebar **Tasks** |

---

## 5. Required UX states (every flow)

Per PRD §5.4, implement where applicable and **never** replace with generic success copy:

| State | Shown as |
|---|---|
| Empty | Composer / home / zero files / zero tasks |
| Loading | Immediate acknowledgement (target ≤300 ms perceived) |
| Working | Stream, research heartbeat, recording indicator |
| Completed | Distinct from partial; run summary substantiated |
| Partial | Stopped, some pages unreadable, cancelled research |
| Failed | Named error class + safe request id |
| Cancelled | Explicit; unused reservation released |
| Permission-denied | Missing scope or revoked connection |
| Quota-exhausted | Remaining = 0 + cheaper route / renewal / opt-in top-up |

### ACC-03 — machine-readable screen state

Do **not** scrape visible copy. Query the screen root:

```
[data-state][data-screen]
```

Open a specific view with `docs/flows/prototype/index.html?screen=A2` (optional `&state=partial|cancelled|working|permission-denied|quota-exhausted|failed`).

Prototype hook: `#screenRoot` (also matches that selector). Canonical `data-state` values are exactly:

`empty` | `loading` | `working` | `completed` | `partial` | `failed` | `cancelled` | `permission-denied` | `quota-exhausted`

`data-screen` is the map id (`A1`…`G1`). One canonical `data-state` per view; it updates on navigation and in-screen transitions.

| Screen | Canonical `#screenRoot` `data-state` |
|---|---|
| **A1** | `empty` |
| **A2** streaming | `loading` |
| **A2** after Stop | `partial` |
| **A2** after Cancel run | `cancelled` |
| **A3** | `completed` |
| **B1** (picker open) | prior screen’s `data-state` (else `empty`) |
| **B2** | `completed` |
| **C1** | `loading` (file cards keep their own `data-state`: `ready` / `partial` / `failed`) |
| **C2** | `working` (mixed file cards keep their own `data-state`; root may be `failed` only while a Failed file is highlighted) |
| **D1** plan | `empty` |
| **D1** running | `working` |
| **D1** cancel | `cancelled` |
| **D2** | `completed` |
| **E1** | `completed` (editing is still a completed artifact) |
| **F1** recording | `working` |
| **F1** permission denied | `permission-denied` |
| **G1** default / ready | `empty` |
| **G1** quota banner | `quota-exhausted` |
| **G1** network / refusal | `failed` |
| **G1** permission banner | `permission-denied` |

Unavailable features are **hidden or marked unavailable**. No dead controls. High-cost research, generation and execution show an estimate and confirmation when outside the allowance. Auto must not silently access private connectors, spend beyond a cap, publish, or perform external writes.

---

## 6. Tracker marks for Coder

Update `DELIVERY-TRACKER.md` (and the Notion Codeworks Tasks board) when this PR lands:

| Field | Value |
|---|---|
| Task | **D03** |
| Owner | UI UX Expert |
| Status | `done` (R0 clickable flows). Production implementation remains WP-02…07. |
| Evidence | `docs/flows/FLOW-MAP.md` · `docs/flows/prototype/index.html` · [Figma I7B2hqfQshLuqukyq73rNC](https://www.figma.com/design/I7B2hqfQshLuqukyq73rNC) |
| Does **not** complete | D04 provider spikes · D05 identity/data model · D06 vertical slice · WP-02…11 |

**Hand-off**
1. Treat this map + prototype as the UX contract for the D06 vertical slice (sign-in → attach → model → stream cited answer → save → reopen → revoke/delete).
2. Replace current prototype labels (ARCEL 1 / Fast / Deep, seeded chats, simulated research) per PRD §22.
3. Sync the Notion row **D03 Clickable flows** to `done` and paste the evidence links.
4. Do not implement AEC, LED logo, or production backends from this PR.

---

## 7. Out of scope (explicit)

| Excluded | Why |
|---|---|
| **AEC / five-pillar UI** | Optional pack after V1 (PRD §26). Must not appear in default nav or home examples. |
| **LED logo** | Separate unapproved design task (PRD §5.5). Do not ship the reconstructed preview. |
| **Production implementation** | No auth, gateway, ledger, workers, or real provider calls in this deliverable. |
| Native desktop / video / agent marketplace | R4 / extensions. |
| Public connector marketplace / unbounded writes | R4. One governed write is R3 and is not in these flows. |
| BYOK | R4 expert option. |
| Compare / Prompt Arena as home | Power feature; not part of D03 home IA. |

---

## 8. Prototype how to review

1. Open [`docs/flows/prototype/index.html`](./prototype/index.html) in a browser (or serve the repo root / `docs/flows/prototype/`).
2. Use the **A–G** tabs or in-screen click targets. Screen ids in the chrome match this map.
3. Walk the §3 table once. Confirm there is no AEC navigation and no LED lockup.
4. Composer chrome on every conversation screen: Attach · Tools · Mic · Auto · Standard · Send/Stop.
5. **G1** must show distinct quota vs provider vs permission banners, and must not offer silent overage.
6. ACC-03: every A–G view stamps `#screenRoot` with `data-screen` and exactly one `data-state`. Query `[data-state][data-screen]`.

This is the R0 UX sign-off package for D03.
