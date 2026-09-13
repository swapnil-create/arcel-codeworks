# ARCEL Codeworks — D03 Flow Map (R0)

**Task:** D03 · Clickable flows for the core general-purpose client  
**Owner:** UI UX Expert  
**PRD:** §5 Experience architecture · §3 Users, jobs and success · §6 Model offering · §8 Packaging, quotas  
**Status:** `done` (R0 clickable; not production)  
**Product rule:** general-purpose only. No AEC pillar menu, no industry onboarding, no LED-logo lockup.

This file is **authoritative**. The HTML prototype must match these screens, IA, layers, and states.

---

## 1. Artifacts

| Artifact | Path / URL |
|---|---|
| Flow map (this file) | [`docs/flows/FLOW-MAP.md`](./FLOW-MAP.md) |
| Clickable prototype | [`docs/flows/prototype/index.html`](./prototype/index.html) |
| Figma — D03 Flow overview | https://www.figma.com/design/I7B2hqfQshLuqukyq73rNC |

Open the prototype in a browser (or serve `docs/flows/prototype/`). Deep-link a screen: `index.html?screen=A2&state=partial`.

---

## 2. Information architecture (PRD §5.1)

### Primary sidebar

| Item | Role | Click |
|---|---|---|
| **New chat** | Start a general conversation | **A1**. No project or expertise required. |
| **Search history** | Find authorized conversations | Overlay; history only. Archive reversible; delete confirms downstream artifacts. |
| **Projects** | Optional folders for chats + files | Empty or user-created. Moving a chat shows context/visibility confirmation. |
| **Library** | Uploads and generated artifacts | Distinguish originals from generated. Preview / rename / download / delete. |
| **Tasks** | One-time and recurring work | List, pause, inspect. Pause does not delete history. |

### Account / settings (not primary nav)

| Item | Role |
|---|---|
| **Models** | Curated catalog + Auto routing copy. Searchable picker also lives in the composer. |
| **Connections** | Optional; none required to start. Revoke blocks new retrieval. |
| **Usage** | Remaining allowance, renewal date, estimates. No “unlimited” copy. |
| **Privacy** | Temporary chat, memory, deletion/retention in plain language. |
| **Settings** | Instructions, tone, language, theme, Enter behavior. |

Optional Assistants are reached from the composer or a secondary directory — not a fifth primary pillar. **No AEC menu.**

### Composer (always on conversation surfaces)

Always visible: text · **Attach** · **Tools** · **Mic** · **Auto · Standard** picker · **Send** / **Stop**.

**Tools:** Search web · Deep research · Analyze data · Create image · Create document · Code · Tasks. Selected tools become **removable chips**. Show only controls relevant to the selected task.

### Work surface (PRD §5.3)

Conversation left. Optional resizable **artifact / source** panel right. Small screens: dedicated view + **Return to chat**.

---

## 3. Task / Intelligence / Effort layers (PRD §6.1)

Three independent layers. Do not collapse them into one “model” control.

| Layer | Question | Control |
|---|---|---|
| **Task** | What do you want to do? | Tools menu: Chat (default), Search web, Deep research, Analyze data, Create image, Create document, Code, Tasks |
| **Intelligence** | Who handles the task? | **Auto** or a **named** curated model |
| **Effort** | How much time/compute? | **Quick** · **Standard** (default) · **Deep** |

Expertise is a fourth, optional context choice — **not** a model and **not** in this R0 IA. Subscription is entitlement, not intelligence. Do not label a model “Pro.”

**Default chrome:** `Auto · Standard`.  
**Auto** means “selects third-party models”; it is not an ARCEL-trained foundation model.  
**B1** opens the model modal (Auto + curated named). **B2** shows response **Details** (actual model, publisher, tools, effort, duration, usage) and the effort control.

---

## 4. Flows A–G

Click targets in **bold**. Prototype screen ids match this map. Every view stamps `#screenRoot` with `data-screen` and one canonical `data-state` (see §7).

### Flow A — First chat

Empty home → stream → actions. PRD §5.1–5.2, ACC-02, CHAT-01, CHAT-02, CHAT-08.

| Screen | Steps | States |
|---|---|---|
| **A1** Empty + examples | Composer-first home. “Your AI workspace.” General examples (explain, compare, write, analyze). No AEC, no forced project, no forced model. Example chip **fills or sends a real prompt** — never a seeded fake transcript. | `empty` |
| **A2** Streaming | User bubble + stream. Run summary / tool activity only (no private chain-of-thought). **Stop** replaces Send → **partial**. **Cancel run** → `cancelled`. Complete → **A3**. | `loading` → `partial` / `cancelled` |
| **A3** Actions | Completed answer. **Copy** · **Save to project** · **Open artifact** · **Retry with another model** · **Feedback** · **Details**. | `completed` |

### Flow B — Model choice

Auto vs lock · effort separate. PRD §6.

| Screen | Steps | States |
|---|---|---|
| **B1** Model modal | Modal: **Auto** (routing explanation) + curated named slots (Fast general, Balanced, Deep reasoning, Coding specialist, Long-context / multimodal, Alternative perspective). Each named row: display name, publisher, strengths, modalities, tools, relative speed/cost. Favorites/recent first. No raw provider IDs. **Lock** a named model or **Use Auto**. Incompatible rows disabled. | Keeps prior `data-state`, else `empty` |
| **B2** Details + effort | Response details: actual model id, publisher, tools, effort mapping, duration, usage. Effort **Quick / Standard / Deep**. Locked named model: use it or explain why not — never silent publisher switch. | `completed` |

### Flow C — File work

Upload states → cited pages. FIL-01–02, DAT-01.

| Screen | Steps | States |
|---|---|---|
| **C1** Uploading | Attach tray in progress. Two files (PDFs or CSV/XLSX). Progress, MIME, size. Model cannot use a file until status is explicit. | Root `loading` |
| **C2** Ready / Partial / Failed | Mixed file cards with their own `data-state` (`ready` / `partial` / `failed`). PDF **diff with page locators**. **Download** revised spreadsheet only if a real file exists. Unreadable pages disclosed. | Root `working` (or `failed` while a Failed file is highlighted) |

### Flow D — Research

Plan → async → report. SRC-01–05.

| Screen | Steps | States |
|---|---|---|
| **D1** Plan + confirm | Deep research selected. Scope Web / Files / Both. Plan + time/usage **estimate**. **Confirm** / **Start research** when outside allowance. **Cancel** stays on D1. Running phase stays on D1 until the report is ready. | Plan `empty` · running `working` · cancel `cancelled` |
| **D2** Report panel | Editable report + source panel: methodology, sources, limitations, unresolved questions. “Read N sources” only when records exist. **Cancel**, **Reopen**, **Save as artifact**. | `completed` |

### Flow E — Artifact editing

Select revise · version restore. ART-01–03.

| Screen | Steps | States |
|---|---|---|
| **E1** Select-revise + restore | Split: conversation + document/table/code/image. Select a paragraph → **Revise selection**. **Version history** → **Restore as new version** (does not destroy current). **Download** only if the file exists. **Return to chat** on small screens. | `completed` |

### Flow F — Voice

Dictation → text continuity. VOI-01–02.

| Screen | Steps | States |
|---|---|---|
| **F1** Mic + transcript | **Mic** shows a recording indicator. Transcript is **editable in the composer before send**. **Cancel** discards capture. **Continue in text** keeps the same thread. **Permission denied** and no-audio are explicit. Mic released on exit. | Idle `empty` · recording `working` · denied `permission-denied` · after insert `completed` |

### Flow G — Quota / Errors

Distinct failure + **no automatic overage**. §5.4, §8.2, CHAT-07.

| Screen | Steps | States |
|---|---|---|
| **G1** Usage + banners | Usage remaining, renewal date, estimates. Distinct banners — never generic success, never stored as ordinary assistant text: **network**, **refusal**, **quota-exhausted**, **rate limited**, **high-cost confirm**, **permission denied**. Quota: cheaper route, wait for renewal, optional **explicit** top-up with cap. Existing work stays viewable. Manual model choice cannot bypass quota. | Default `empty` · quota `quota-exhausted` · network/refusal/rate `failed` · permission `permission-denied` |

---

## 5. §3 scenario coverage

General-purpose acceptance (PRD §3). AEC cases are **excluded**.

| §3 scenario | Flow | Screens |
|---|---|---|
| Explain a concept, then change language or tone without starting over | First chat | **A1 → A2 → A3** |
| Compare products using current sources, then save a cited comparison | Research + artifact | **D1 → D2** → save **E1** |
| Upload two PDFs and ask for differences with page references | Files | **C1 → C2** |
| Analyze a spreadsheet, calculate a result and download the revised workbook | Files (Analyze data) | **C1 → C2** (workbook download) |
| Draft a document, edit a selected paragraph and restore an earlier version | Artifact | **E1** |
| Generate an image and revise it using the previous version as reference | Artifact (gallery + ancestry) | **E1** |
| Discuss a question by voice and continue the same conversation in text | Voice | **F1** |
| Build a small interactive prototype, inspect its code and download it | Artifact + actions | **E1** + **A3** Open artifact |
| Resume a project tomorrow, with explicit memory and file permissions intact | IA | Sidebar **Projects / Library / Privacy** |
| Schedule a recurring briefing and pause it without deleting its history | IA | Sidebar **Tasks** |

---

## 6. Tracker marks for Coder

Update `DELIVERY-TRACKER.md` and the Notion Codeworks Tasks board:

| Field | Value |
|---|---|
| Task | **D03** |
| Owner | UI UX Expert |
| Status | **`done`** (R0 clickable flows). Production remains WP-02…07. |
| Evidence | `docs/flows/FLOW-MAP.md` · `docs/flows/prototype/index.html` · [Figma I7B2hqfQshLuqukyq73rNC](https://www.figma.com/design/I7B2hqfQshLuqukyq73rNC) |
| Does **not** complete | D04 · D05 · D06 · WP-02…11 |

**Hand-off**
1. Treat this map + prototype as the UX contract for the D06 vertical slice.
2. Replace current app labels (ARCEL 1 / Fast / Deep, seeded chats, simulated research) per PRD §22.
3. Sync Notion **D03 Clickable flows** to `done` and paste the evidence links.
4. Do not implement AEC, LED logo, or production backends from this PR.

---

## 7. ACC-03 — machine-readable state

Do **not** scrape visible copy. Query:

```
[data-state][data-screen]
```

Hook: `#screenRoot`. Canonical `data-state` values are exactly:

`empty` | `loading` | `working` | `completed` | `partial` | `failed` | `cancelled` | `permission-denied` | `quota-exhausted`

`data-screen` is `A1`…`G1`. One value per view; update on navigation and in-screen transitions.

---

## 8. Out of scope

| Excluded | Why |
|---|---|
| **AEC / five-pillar UI** | Optional pack after V1 (PRD §26). Must not appear in default nav or home examples. |
| **LED logo** | Separate unapproved design task (PRD §5.5). Do not ship the reconstructed preview. |
| **Production implementation** | No auth, gateway, ledger, workers, or real provider calls. |
| Native desktop / video / agent marketplace | R4. |
| Public connector marketplace / unbounded writes | R4. |
| BYOK | R4. |
| Compare / Prompt Arena as home | Power feature; not D03 home IA. |

---

## 9. How to review

1. Open [`docs/flows/prototype/index.html`](./prototype/index.html).
2. Walk tabs **A–G** and the §3 table. Confirm no AEC nav and no LED lockup.
3. Composer on every conversation screen: Attach · Tools · Mic · Auto · Standard · Send/Stop · removable chips.
4. **G1** shows usage plus distinct network / refusal / quota / rate / high-cost banners, and must not offer silent overage.
5. ACC-03: every A–G view has `#screenRoot[data-state][data-screen]`.
