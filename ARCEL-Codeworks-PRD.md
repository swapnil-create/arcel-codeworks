# ARCEL Codeworks
## General-purpose AI client — Product Requirements Document and delivery roadmap

Version: 1.0 · Date: 13 September 2026 · Status: Proposed, for product-owner review

**Product priority: build a complete general-purpose AI client first. AEC expertise is an optional extension, not the foundation, onboarding requirement or navigation structure.**

This document supersedes the earlier vertical-first recommendation. It specifies a product to build, not features already delivered. All proposed limits, service targets, packaging and schedules require validation. No production deployment or purchase is authorized by this PRD.

## Reading guide

- **Product decisions:** sections 1–5.
- **How models are offered:** sections 6–8.
- **Detailed feature requirements:** sections 9–17.
- **Architecture, security and measurement:** sections 18–21.
- **Execution plan and launch gates:** sections 22–25.
- **Optional AEC layer and unresolved decisions:** sections 26–28.

---

## 1. Executive product decision

ARCEL Codeworks is an independent, multi-model AI client for everyday questions, writing, learning, research, document work, coding, data analysis and creation. It should be useful to someone who has never heard of AEC.

The product promise is: **Ask, research, create and get work done—with your choice of intelligence, persistent context and clear control over your data and spending.**

The name Codeworks must not imply that programming is its only purpose. Use a general-purpose descriptor such as “Your AI workspace” in onboarding and marketing. Do not label third-party foundation models as ARCEL-trained models.

### Decisions recommended for approval

1. One general-purpose client; optional expertise packs later.
2. A familiar conversation-first home, with no mandatory project setup.
3. Auto as the default intelligence setting, plus transparent named-model selection.
4. Task tools separate from model selection and reasoning effort.
5. Persistent conversations, files and outputs independent of model provider.
6. Real search, computation and artifact generation—not prompts that simulate them.
7. Public web information, personal files and connected private information have distinct permissions.
8. Subscriptions include bounded usage; costly work has a visible budget, not “unlimited” promises.
9. Responsive web first, with full client V1 acceptance gates before AEC specialization.
10. Security, evaluation and cost accounting are foundational work, not a final sprint.

### What differentiates Codeworks after baseline completion

- Switch models without abandoning your work or rebuilding context.
- Understand why a model or tool was selected and what the task cost.
- Keep sources, conversations, outputs and revisions together.
- Use a second model to review a specific result when useful.
- Add optional expertise without changing the basic client experience.

These are hypotheses to validate with users, not claims of superiority over existing clients.

## 2. Benchmark and evidence boundaries

The baseline is the **combined set of important user jobs** associated with Claude, ChatGPT, Grok and Perplexity. It is not a claim that each product offers every capability, on every plan, in every region.

Research snapshot: official documentation reviewed on 13 September 2026. Product names, models and plan entitlements change frequently. Before implementation, verify the exact API capability, regional availability and account entitlement. This PRD deliberately does not freeze a supposedly “latest” model or copy competitor pricing.

| Reference product | Verified benchmark signal | Codeworks requirement derived from that signal |
|---|---|---|
| Claude | Artifacts provide a work surface beyond chat; connectors expose external tools and data | Editable output panel, durable artifacts, governed integrations |
| ChatGPT | Projects organize ongoing work; Work supports longer tasks and deliverables | Persistent context, files, resumable work and deliverable-focused UX |
| Grok / xAI | API tooling includes web search and separately X search | Fresh information with explicit source scope; social data is optional |
| Perplexity | Research iteratively searches and synthesizes reports; Projects organize work | Quick cited answers, asynchronous deep research and reusable context |

Sources: [Claude artifacts](https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them), [Claude connectors](https://claude.com/docs/connectors/overview), [ChatGPT Projects](https://learn.chatgpt.com/docs/projects), [ChatGPT Work](https://learn.chatgpt.com/docs/get-started-with-work), [xAI Web Search](https://docs.x.ai/developers/tools/web-search), [xAI X Search](https://docs.x.ai/developers/tools/x-search), [Perplexity Research](https://www.perplexity.ai/help-center/en/articles/10738684-what-is-research-mode), [Perplexity Projects](https://www.perplexity.ai/help-center/en/articles/10352961-what-are-spaces).

**App access is not model access.** A third-party model API does not automatically include the vendor's memory, agent runtime, search product, file management, voice experience, canvas or subscription entitlements. Codeworks must own the client layer and explicitly integrate each capability.

## 3. Users, jobs and success

| User | Primary job | Successful experience |
|---|---|---|
| Everyday user | Ask, explain, plan, translate and write | Useful answer quickly without learning model terminology |
| Researcher / student | Investigate a question and assess evidence | Cited findings, source access, uncertainty and reusable notes |
| Knowledge worker | Turn files and instructions into finished work | Editable output, correct context and easy revisions |
| Creator | Produce and revise visual or written material | Coherent versions, image reference support and export |
| Developer / analyst | Understand code, compute results and build prototypes | Executed tests or calculations, reproducible outputs and safe previews |
| Team member / admin | Collaborate with controls | Shared context, access boundaries, spend visibility and auditability |

### General-purpose acceptance scenarios

- Explain a concept, then change language or tone without starting over.
- Compare products using current sources, then save a cited comparison.
- Upload two PDFs and ask for differences with page references.
- Analyze a spreadsheet, calculate a result and download the revised workbook.
- Draft a document, edit a selected paragraph and restore an earlier version.
- Generate an image and revise it using the previous version as reference.
- Discuss a question by voice and continue the same conversation in text.
- Build a small interactive prototype, inspect its code and download it.
- Resume a project tomorrow, with explicit memory and file permissions intact.
- Schedule a recurring briefing and pause it without deleting its history.

AEC cases are excluded from the core acceptance suite until these general cases work.

## 4. Scope and release terminology

“Minimum requirements” means a complete everyday client experience, not every proprietary feature across all competitor products. Native desktop control, frontier video tooling and a public agent marketplace are extensions. They cannot be silently presented as already included.

| Release | Meaning | External positioning |
|---|---|---|
| R0 — Foundation | Architecture, security and prototype corrections | Internal development only |
| R1 — Core beta | Reliable chat, model selection, search, files and projects | Explicitly a limited beta, not full parity |
| R2 — Work beta | Research, artifacts, analysis, media and memory | Expanded beta with visible capability limits |
| R3 — Client V1 | Complete baseline including voice conversation, initial connectors, scheduling and controlled tasks | General-purpose client launch |
| R4 — Extensions | Optional AEC packs, deeper enterprise and advanced media | Additive releases after V1 gates |

All R1–R3 requirements are part of the committed **proposed V1 scope**. Phasing is delivery order, not permission to drop capabilities and still claim completion.

## 5. Experience architecture

### 5.1 Navigation

Primary sidebar: New chat, Search history, Projects, Library, Tasks. Models, Connections, Usage, Privacy and Settings live in the account/settings area; a searchable model picker is also available in the composer. Optional Assistants are accessed through the composer or a secondary directory. No AEC pillar menu appears by default.

The home page opens directly to a composer with a few general examples. Choosing an example fills or sends a real prompt; it does not open a seeded fake conversation. Projects are optional. The user can move a chat into a project later with a context/visibility confirmation.

### 5.2 Composer

Always visible: text input, attach, microphone, send/stop and intelligence selection. Tools menu: Search web, Deep research, Analyze data, Create image, Create document, Code and Tasks. Selected tools appear as removable chips; show only controls relevant to the selected task.

Auto may choose low-risk tools within the enabled scope. It must not silently access private connectors, spend beyond a cap, publish content or perform external writes. High-cost research, generation and execution display an estimate and confirmation when outside the user's pre-approved allowance.

### 5.3 Work surface

Conversation on the left; an optional resizable artifact/source panel on the right. On small screens the panel becomes a dedicated view with a clear return-to-chat action. Support source viewers, documents, tables, charts, code and image galleries. Preserve scroll position, selection and drafts during updates.

### 5.4 Required UX states

Every feature must implement empty, loading, working, completed, partial, failed, cancelled, permission-denied and quota-exhausted states where applicable. Never replace these with generic success text. Unavailable features are hidden or explicitly marked unavailable; no dead controls.

Display run summaries and tool activity, not purported private chain-of-thought. A result can say “Read 8 sources” only when records substantiate it.

### 5.5 Brand and accessibility

Use approved ARCEL assets, accessible contrast, keyboard navigation, visible focus, dark/light/system themes and reduced-motion behavior. The LED logo remains a separate unapproved design task: do not ship the reconstructed preview as a verified Figma export. Require an actual browser screenshot at desktop and mobile sizes and product-owner approval. Never sacrifice navigation usability for the logo.

## 6. Model offering: what users should see

### 6.1 Three independent layers

| Layer | Question answered | Proposed control |
|---|---|---|
| Task | What do you want to do? | Chat, Search, Research, Analyze, Create, Code |
| Intelligence | Who handles the task? | Auto or a named model |
| Effort | How much time/compute is appropriate? | Quick, Standard, Deep where supported |

Expertise is a fourth, optional context choice—not another model. Subscription is entitlement, not intelligence. Do not conflate Pro plan with a model called “Pro.”

### 6.2 Default and expert paths

**Default:** “Auto · Standard.” The user writes normally. Codeworks selects from a small evaluated, policy-approved pool and records its choice. Quick favors latency; Deep permits more reasoning and work, subject to a budget. Standard is the default balance.

**Expert:** “Choose model” opens a compact list of named, verified models with publisher, strengths, input modalities, tool compatibility, approximate speed and relative cost. Favorite and recently used models appear first. Do not expose hundreds of raw provider IDs.

Each response has a details action showing the actual model identifier, publisher, gateway/provider if known, tools used, effort mapping, fallback, duration and usage. A workflow using several models lists them by step.

Replace “ARCEL 1 / Fast / Deep” with “Auto / Quick / Standard / Deep” or equivalent routing labels. If ARCEL branding is retained in the picker, explain “ARCEL Auto selects third-party models”; do not imply proprietary foundation-model ownership.

### 6.3 Launch catalog recommendation

Offer **4–6 curated text/reasoning choices**, plus task-specific media services. Start with verified candidates from OpenAI, Anthropic and xAI; add Google or another provider when evaluation demonstrates a useful capability/cost gap. Provider inclusion is proposed, not a claim that credentials or contracts already exist.

| Catalog slot | Purpose | Selection rule |
|---|---|---|
| Fast general | Everyday responses and short transformations | Lowest cost/latency meeting the quality floor |
| Balanced general | Default writing, Q&A and file work | Strongest overall evaluation under default budget |
| Deep reasoning | Hard analysis, planning and mathematical reasoning | Measured difficult-task performance; appropriate tool support |
| Coding specialist | Code generation and repair | Pass rate on runnable tests and safe tool behavior |
| Long-context / multimodal | Larger or visually complex inputs | Verified effective context and modality performance |
| Alternative perspective | Deliberate user choice or second opinion | Independent model family, not another label for the same model |

One model may qualify for several routing slots without appearing multiple times in the picker. Search is a service capability, not necessarily a foundation-model choice. Image generation, editing, transcription and speech have separate capability registries.

Exact model IDs, live prices, retention terms and account rate limits must be resolved in a short integration spike before release. Do not reuse the prototype's fixed Sonnet/Opus/Flash mappings as evidence of current best offerings.

### 6.4 Explicit choice and fallback rules

- If the user locks a named model, use it or explain why it cannot perform the task. Offer an alternative; do not silently switch publishers.
- In Auto, fallback is permitted only within the same enabled data-policy and capability boundary and a reserved budget.
- If no compatible route exists, stop with an actionable message. Never drop attachments or tools silently.
- A refusal is not a trigger to evade safety policies using another model.
- After partial streamed output, do not splice another model's response into it. Mark the attempt partial and offer a clearly separate retry.
- If a model is retired, preserve its historical attribution; prompt for a replacement before continuing a locked conversation.

OpenRouter supports ordered model fallbacks, but Codeworks must constrain them to its own policies. Native gateway defaults are not a substitute for product-level controls. [OpenRouter fallback documentation](https://openrouter.ai/docs/guides/routing/model-fallbacks)

## 7. Model gateway and lifecycle requirements

**MOD-01 — Versioned registry (R1).** Store model_id, display_name, publisher, adapter, model_version_or_alias, supported_inputs, supported_tools, output_types, effective_context_limit, output_limit, effort_mapping, prices_and_units, pricing_effective_at, region_policy, retention_policy, availability, evaluated_at and status. Acceptance: UI never offers an unavailable or incompatible combination; historical runs retain the registry version used.

**MOD-02 — Deterministic selection (R1).** Apply permission/region filters, modality/tool filters, explicit user choice, budget, then routing score. Acceptance: table-driven tests prove that Quick/Standard/Deep can route distinctly and that an explicit model wins over Auto preferences.

**MOD-03 — Context portability (R1).** Store canonical messages and typed attachment references independently of providers. Convert through adapters; preserve tool-call/result pairing. Acceptance: switch models mid-thread without losing visible history; unsupported context yields a warning and explicit resolution.

**MOD-04 — Token-aware preparation (R1).** Count or estimate tokens with provider-appropriate logic, reserve output/tool budgets and compact older context with source pointers. Acceptance: no silent character slicing; notify when context is summarized and allow important instructions to be pinned.

**MOD-05 — Release process (R2).** Discover candidates, verify contracts and capabilities, run regression tests, canary to an opt-in cohort, monitor and promote or roll back. Suggested cadence: weekly discovery, promotion only after gates pass. Do not auto-promote a new alias target on discovery alone.

**MOD-06 — Adapter conformance (R1).** Normalize streaming, tool calls, cancellations, usage, refusals and errors. Acceptance: a shared conformance suite passes for each enabled provider; unsupported effort is shown as unavailable rather than approximated without disclosure.

**MOD-07 — Native capability escape hatch (R2).** Use direct provider APIs when gateway access lacks required tools or modalities. Acceptance: route and policy are visible; no promise that a consumer subscription unlocks API access.

## 8. Packaging, quotas and commercial model

### 8.1 Proposed packages—not approved prices

| Package | Intended user | Entitlement approach |
|---|---|---|
| Trial | Product evaluation | Small expiring allowance; no automatic paid overage |
| Personal | Regular individual use | Core tools and curated models within a monthly usage budget |
| Pro | Heavy individual work | Larger budget, higher concurrency and more Deep/research/media usage |
| Team | Shared work | Seat management, shared projects, admin controls and pooled/individual budgets |
| Enterprise, later | Procurement/governance needs | Negotiated controls only when implemented and contractually supported |

Do not introduce all five plans on day one. Validate a trial plus one paid personal plan; activate Team when collaboration and admin requirements pass. All tiers must provide honest error states and privacy controls. Expensive capabilities can have lower allowances, not fake substitutes.

### 8.2 Usage design

Display “usage remaining,” renewal date and task estimates in plain language. Internally meter model tokens, reasoning/cached tokens as applicable, search/tool calls, media units, sandbox time and storage. Disclose that a long or multi-model task costs more than a short answer.

Reserve budget before work starts; reconcile against actual use. Prevent concurrent requests from spending the same remaining balance. Release unused reservations on terminal states. External provider charges can still occur for cancelled or failed work: distinguish vendor cost from user charging policy, and state that policy before purchase.

Default: no automatic overage. When exhausted, allow viewing/downloading existing work and offer a cheaper route, renewal or explicit top-up. Any automatic top-up requires a separate opt-in and cap. Manual model choices cannot bypass quotas.

**BIL-01 (R1 beta metering; R3 payment launch):** append-only usage ledger with idempotent entries and daily reconciliation. Acceptance: duplicate webhooks/retries do not duplicate debits; cancellation settles outstanding reservations.

**BIL-02 (R3):** subscription lifecycle, invoices, cancellation, failed payment and refunds through a supported payment service. Acceptance: signed webhooks are verified; cancellation/end-of-period behavior matches UI copy; no raw card data stored.

**BIL-03 (R2):** per-run estimate and actual usage. Acceptance: multi-model compare includes every generation plus optional judge/synthesis; unavailable exact cost is labeled estimated.

### 8.3 Pricing method

Set retail prices only after a representative workload pilot. Calculate:

`Variable cost = model usage + search + media + execution + storage/egress + applicable gateway fees`

`Contribution = net revenue − variable costs − allocated payment/support costs`

Model median and heavy-user cohorts, not only an average message. Test sensitivity to a 2× increase in Deep/research usage and provider price changes. Finance/product approve unit economics and reserves before public pricing. This PRD does not assert that any fixed competitor price is sustainable for Codeworks.

BYOK is an R4 expert option, not an onboarding dependency. If added, encrypt keys, separate its metering, make data routes clear and prohibit client-bundle exposure. Do not borrow consumer session cookies or extract vendor subscriptions as API credentials.

## 9. Core conversations and account requirements

| ID / release | Requirement | Acceptance criteria |
|---|---|---|
| ACC-01 / R1 | Sign-in, recovery, sign-out and session management | Two users cannot read each other's chats; logout/revocation invalidates protected requests; session list supports remote sign-out |
| ACC-02 / R1 | Onboarding without mandatory expertise or project | User can send a first general prompt immediately after sign-in and allowance confirmation |
| CHAT-01 / R1 | Persistent multi-turn chat with streaming | Refresh/reconnect restores the saved conversation and partial output without duplicate messages |
| CHAT-02 / R1 | Stop, retry, regenerate and edit prior prompt | Editing creates a branch/version rather than destroying descendants; cancelled output is clearly partial |
| CHAT-03 / R1 | Markdown, code, tables, equations and links | Sanitized rendering; accessible code copy; no executable raw HTML from model output |
| CHAT-04 / R1 | Rename, pin, archive, search and delete conversations | Search only authorized history; archive is reversible; delete confirmation explains downstream artifacts |
| CHAT-05 / R1 | Draft persistence and keyboard behavior | Unsaved input survives navigation; IME composition does not accidentally send; Enter behavior configurable |
| CHAT-06 / R2 | Conversation export and portable import | Export messages, timestamps, attachments manifest and provenance; import supported neutral JSON/Markdown with preview and duplicate handling |
| CHAT-07 / R1 | Clear completion/error contract | Network error, provider refusal, quota and invalid input are distinct; no error text stored as ordinary assistant context |
| CHAT-08 / R2 | Response actions | Copy, save to project, open artifact, retry with another model and feedback operate on the selected response |

Importing competitor exports is best-effort only for documented/user-provided formats. Never promise that proprietary memory or hidden context is portable.

## 10. Search and deep research

**SRC-01 — Quick web search (R1).** Search, retrieve permitted pages, answer with nearby claim citations and a sources panel. Record title, URL, publisher, retrieval time and publication date when known. Acceptance: cited URLs come from retrieved evidence; failed access is disclosed, not fabricated as a successful read.

**SRC-02 — Source scope (R1).** Let users choose Web, Attached files or Both. Private connectors are separately enabled. Acceptance: “files only” generates no external search requests; a web query does not contain private document excerpts without authorized intent and policy.

**SRC-03 — Research work plan (R2).** For broad work ask only consequential clarifying questions, propose scope, show estimated time/usage and run asynchronously. Acceptance: the user can cancel, reopen and inspect progress; completion does not require keeping a tab open.

**SRC-04 — Research quality (R2).** Iteratively search/read, reconcile contradictions and produce an editable report with methodology, sources, limitations and unresolved questions. Acceptance: the evaluator checks claim support, not only citation count; unsupported statements are removed or qualified.

**SRC-05 — Research steering (R3).** Add instructions during execution and record which scope version produced the output. Acceptance: a changed scope that increases cost beyond the approved cap pauses for approval.

**SRC-06 — Source quality and freshness (R1).** Prefer primary sources for technical/official claims; distinguish retrieved date from event date; do not treat social popularity as factual authority. X search is an optional integration rather than a default requirement for every answer.

**SRC-07 — Safe retrieval (R1).** Restrict network access, private address ranges, redirects, downloads and fetch sizes. Treat instructions in sources as untrusted data. Acceptance: malicious pages cannot access secrets or grant tool permissions; blocked sites are not bypassed.

A Research label is never just an instruction to “be thorough.” It represents an actual retrieval-and-synthesis workflow. Perplexity's documented research model also distinguishes this workflow from simple model selection. [Research reference](https://www.perplexity.ai/help-center/en/articles/10738684-what-is-research-mode)

## 11. Files, library and analysis

### Proposed initial operational limits

These are test targets, not vendor limits or approved commercial entitlements: up to 10 attachments per prompt; 25 MiB per document; 20 MiB per image; asynchronous processing for larger supported documents up to 200 pages. Analyze CSV/XLSX workloads up to 100,000 rows in the worker, not in prompt context. Publish actual tested limits in the UI; never imply entire-file understanding after partial extraction.

**FIL-01 — Ingestion (R1).** Support PDF, DOCX, TXT/MD, CSV/XLSX and PNG/JPEG/WebP. Drag/drop, paste image and picker must show progress and Ready/Partial/Failed states. Verify MIME, scan/quarantine, detect password protection and reject unsafe archives/macros. Acceptance: the model cannot use a file until extraction status is explicit.

**FIL-02 — Source fidelity (R1).** Retain immutable originals, extraction version, page/sheet/cell locators and OCR warnings. Acceptance: citation opens the exact original revision/location; unreadable pages are disclosed. Visual understanding is not represented as exact measurement.

**FIL-03 — Library (R1).** Search, preview, rename, organize, download and delete files; distinguish original uploads from generated artifacts. Acceptance: renaming preserves IDs and links; deleting content prevents new retrieval and invalidates caches/index access.

**FIL-04 — Retrieval (R1).** Hybrid keyword/semantic retrieval filtered by authorization before ranking, then reranking within allowed results. Acceptance: inaccessible items cannot appear in titles, counts, snippets, citations or model context.

**DAT-01 — Computation (R2).** Analyze files using isolated Python/JavaScript tooling. Show calculation assumptions and executed-code summary. Acceptance: totals match deterministic fixtures; generated charts use actual data; failure never becomes a fabricated computed result.

**DAT-02 — Spreadsheet output (R2).** Export XLSX/CSV with formulas, units and formatting when requested. Acceptance: recalculate and reopen generated workbooks; flag unsupported formulas and sanitize untrusted formula-like text during export.

**DAT-03 — Extraction corrections (R2).** Users can correct inferred columns/types and rerun analysis without replacing originals. Acceptance: corrections are versioned and included in provenance.

## 12. Projects, memory and personalization

**PRJ-01 (R1):** project CRUD, instructions, files and grouped conversations. Project creation is optional. Acceptance: new project does not contain sample client data; moving a chat shows which instructions/access will change.

**PRJ-02 (R2):** pin sources, save responses and associate artifacts with projects. Acceptance: model changes preserve these associations; obsolete source revisions are visible.

**MEM-01 (R2):** separate user preferences, conversation state and project facts. Personal memory is opt-in; users can view/edit/delete entries with origin and timestamp. Acceptance: project-only work does not pull another project's memory; deletion prevents future injection.

**MEM-02 (R2):** distinguish approved facts from inferred preferences and tentative conclusions. Conflicting evidence must not silently overwrite a saved fact. Acceptance: show a proposed update or conflict rather than pretending both are true.

**MEM-03 (R1 temporary chat; R2 full controls):** temporary mode excludes persistent memory and normal history, with clearly stated operational retention. Acceptance: no false “zero retention” promise; temporary files and provider traces follow the published policy.

**PER-01 (R1):** custom instructions, tone, language, timezone, accessibility and theme preferences. Acceptance: user/project instructions cannot override platform security; settings persist across devices.

## 13. Artifacts, coding and creative work

**ART-01 (R2):** side-panel editing for text/Markdown, code and tables; autosave and version history. Acceptance: selection-based revision changes the selected scope, maintains history and supports restoring prior content as a new version.

**ART-02 (R2):** generate downloadable DOCX, PDF, XLSX, PPTX, images and code bundles. Acceptance: files really exist, open successfully and are previewed/validated; no “download” buttons backed by invented links. Full native Office-style in-browser editing is not required: native export plus structured editing/re-generation is acceptable and clearly labeled.

**ART-03 (R2):** persist the artifact separately from temporary execution files. Acceptance: run completion/worker cleanup does not delete delivered files; deleting a chat asks whether to retain linked artifacts and respects project policies.

**COD-01 (R1 code answers; R2 execution):** code blocks, explanation, refactoring, uploaded code and runnable sandbox tasks. Acceptance: only report tests as passed when executed; expose stdout/errors and package/runtime details without secrets.

**COD-02 (R2):** isolated HTML/application previews with resource controls. Acceptance: generated code cannot access application cookies, tokens or unrelated user files; preview domain and sandbox boundaries are tested.

**COD-03 (R3 read connector; R4 write automation):** read a selected repository with OAuth scope and allowlisted files. Commits, PRs and deployments remain separate explicit actions with review and approval. A code artifact is not automatically a deployed website.

**IMG-01 (R2):** generate images with prompt, aspect ratio and supported reference inputs; save metadata and downloadable output. Acceptance: UI shows actual generated assets and proper failed/blocked states.

**IMG-02 (R2):** revise a selected image using its exact version as reference; support masks when the adapter supports them. Acceptance: preserve originals and ancestry; disable unsupported edits instead of silently generating unrelated replacements.

**IMG-03 (R2):** gallery, full-size viewing and explicit image provenance. Acceptance: thumbnail clicks open original-resolution output; generated imagery is not presented as retrieved evidence.

Video generation/editing, live camera understanding and advanced native design/CAD authoring are R4 extensions. Their omission must be visible in capability disclosures, not hidden behind a “Create anything” promise.

## 14. Voice and multimodal continuity

**VOI-01 — Dictation (R2).** User-controlled microphone capture with editable transcript before send; handle denied permissions and no audio. Acceptance: recording indicator is visible, cancel discards capture and no text is sent prematurely.

**VOI-02 — Conversational voice (R3).** Speech input/output, interrupt/barge-in, mute, transcript and switch back to text. Acceptance: interruptions stop playback and avoid duplicate answers; microphone is released on exit; unavailable voices fall back transparently.

**VOI-03 — Audio files (R3).** Transcription and summarization of supported uploaded recordings, with duration limits, consent prompts and uncertain speaker labels. Acceptance: preserve timestamps and distinguish transcript from summary; never promise reliable identity recognition.

**VOI-04 — Privacy and usage (R3).** Separate audio retention, voice provider attribution and duration metering. Acceptance: audio deletion follows the declared lifecycle; user sees remaining allowance before starting a long session.

V1 launches an English interface and tests multilingual conversation and rendering, including Arabic/RTL content. Full translated UI is R4 unless prioritized. Language claims require an evaluation suite, not an assumption that every model/voice is equally capable.

## 15. Assistants, connectors, tasks and controlled agents

**AST-01 — Custom assistants (R3).** Users can save instructions, permitted knowledge sources, allowed tools and preferred model. Acceptance: the configuration is versioned and inspectable; invoking it cannot grant new data access. Private and workspace sharing first; public marketplace later.

**CON-01 — Initial connectors (R3).** Proposed launch set: Google Drive read/search, Microsoft OneDrive/SharePoint read/search, GitHub repository read. Verify API scopes, consent and commercial terms before committing integration dates. General file ingestion works if a connector is unavailable.

**CON-02 — Permission continuity (R3).** OAuth connection, reauthorization, disconnect, per-source scope and sync status. Acceptance: revocation immediately blocks new tool calls/retrieval; expired permissions do not leave stale searchable access.

**CON-03 — Governed connector framework (R3).** Versioned tool schemas, allowlisted servers, scoped credentials, timeouts and audit records; MCP can be supported as a protocol, not treated as inherently safe. Acceptance: new or changed write tools require review; arbitrary server registration is not public by default.

**TSK-01 — Scheduling (R3).** Create one-time/recurring tasks with preview, timezone, destination, enabled sources and spend cap. Acceptance: user confirms schedule; DST policy is deterministic; pause/delete stops future runs; failures and missed runs are visible.

**TSK-02 — Background execution (R2 research; R3 general tasks).** Durable jobs with cancellation, progress, retry and checkpoints. Acceptance: worker restart resumes from a safe point; closing a tab does not orphan the job; max steps/time/cost enforced server-side.

**AGT-01 — Bounded work mode (R3).** Plan, retrieve, compute, create output and request approval when needed. Acceptance: expose task progress and recoverable partial output, not hidden-chain-of-thought; no unbounded tool loops.

**AGT-02 — One controlled external write (R3).** Proposed pilot: save an approved artifact into one explicitly selected Drive folder. Preview exact file, destination and overwrite/version behavior. Acceptance: authorization and approval are rechecked at execution; idempotency prevents duplicate copies; receipt links to the created file.

**AGT-03 — Approval binding (R3).** Approval records actor, action, target, payload hash, expiry and permission scope. A payload or destination change invalidates approval. Acceptance: a model cannot approve itself or replay an expired authorization.

Broader browser/computer control, payments, mass sending and repository deployment are R4, gated separately. No unattended destructive actions. Scheduled tasks cannot inherit indefinite write approval simply because they are recurring.

## 16. Compare and review

Compare is a power feature, not the home page. Start with 2–3 distinct model versions; reject duplicates even if display names differ. User chooses the same prompt, attachments and source snapshot for all candidates. Normalize task budget where possible and disclose configuration differences.

**CMP-01 (R2):** parallel candidate runs with independent statuses, model reveal and side-by-side/mobile tab views. Acceptance: one failure does not erase successful results; cost includes all attempts according to charging policy.

**CMP-02 (R2):** optional blind manual voting. Acceptance: labels are hidden until reveal; votes attach to immutable response versions; no false implication of objective correctness.

**CMP-03 (R3):** rubric-based review covering instruction compliance, correctness, evidence and usefulness. Acceptance: judge references specific candidate passages; flags uncertainty and potential judge bias; response length is not a proxy for quality.

**CMP-04 (R3):** real synthesis with sources, preserved disagreements and visible synthesis model. Acceptance: does not concatenate opening sentences or silently erase conflicting claims. A judge's score does not authorize consequential action.

## 17. Sharing, teams and controls

**COL-01 (R2):** share a conversation/artifact snapshot through a revocable permissioned link; default private. Acceptance: share preview lists included content and excluded sources; connector credentials and private source access are never inherited implicitly.

**COL-02 (R3):** shared projects with owner/editor/viewer roles. Acceptance: viewer cannot edit, share or run chargeable actions unless granted separate permission; losing membership removes access to originals, search and derivatives.

**COL-03 (R3):** workspace administration for members, model allowlists, connector allowlists, quotas and audit review. Acceptance: an admin can manage membership/spend without automatically browsing private personal chats; support access is explicit and audited.

**COL-04 (R3):** optimistic concurrency for artifact edits and configuration changes. Acceptance: conflicting edits show a conflict/version choice, not silent last-write data loss.

Enterprise SSO/SCIM, legal holds, configurable regional deployment and customer-managed keys are R4 unless a contracted launch customer requires them. Do not advertise compliance certification or residency guarantees without evidence across all subprocessors.

## 18. Proposed technical architecture

Use a typed modular application with a separate durable worker tier. Avoid both an unmaintainable single script and premature microservices.

| Component | Owns | Implementation direction |
|---|---|---|
| Web client | Navigation, conversation, previews, client state | React + TypeScript with a maintained app framework; framework choice confirmed in architecture spike |
| Application API | Authentication, authorization, run creation, sharing | Modular backend; strict request schemas and server-owned permissions |
| Model gateway | Adapters, registry, routing, usage normalization | Retain OpenRouter where appropriate; direct adapters where necessary |
| Relational database | Users, projects, messages, roles, runs, ledger | Managed PostgreSQL or equivalent transactional store |
| Object storage | Immutable uploads/artifact versions | Private buckets, signed access, lifecycle policies |
| Retrieval subsystem | Extraction, chunking, embeddings, ranking | Permission filtering at source, index and serving boundaries |
| Worker/queue | Research, ingestion, generation, schedules | Durable workflow engine/queue with retries and checkpoints |
| Execution sandbox | Code, document and data tools | Ephemeral isolated environments with CPU/RAM/time/network caps |
| Monitoring | Traces, metrics, incidents, cost anomalies | Redacted structured logs and run-level observability |

Vercel can continue hosting the web tier, subject to verified deployment permissions. Do not force long research or execution into the existing 60-second function. Hosting vendor choice is separate from product requirements; no Sites migration is implied.

### Build versus integrate

Build the differentiated client, portable context, routing policy, run UX, artifact lifecycle and evaluation harness. Integrate mature identity, billing, storage, OCR/search, media and isolated execution services after security/cost review. Do not train foundation models or build a web-scale search index for V1.

## 19. Core data and API contracts

### Canonical entities

| Entity | Essential fields and invariants |
|---|---|
| User / Workspace / Membership | Stable IDs, roles, status; no authorization from display names |
| Conversation / Message | Scope, branch/parent, content parts, timestamps; immutable response versions |
| Project / ProjectAccess | Instructions version, owner, ACL; tenant boundary enforced |
| File / FileVersion | Original hash, MIME, storage ref, scan/extraction status, ACL |
| Source / Citation | Source version, locator, retrieved_at, claim association, access scope |
| Artifact / ArtifactVersion | Content ref, originating run, parent version, validation status, ACL |
| MemoryItem | Scope, content, evidence, status, origin, expiry/update metadata |
| Run / Step / ToolCall | Status, inputs, model/registry version, attempts, checkpoints, usage |
| Approval | Actor, action, target, payload hash, expiry, consumed state |
| Connection | Encrypted credential reference, scopes, owner, revocation state |
| Task | Schedule/timezone, scope, budget, next run, paused state |
| UsageEntry | Idempotency key, run, provider cost, user charge, reservation/settlement |

### API surface, illustrative internal contracts

- `POST /v1/runs`: create an authenticated run with conversation_id, task_type, model_selection, effort, attachment_version_ids, allowed_tools, source_scope and max_usage. Require an idempotency key. Derive actor/workspace permissions server-side.
- `GET /v1/runs/:id/events`: resumable event stream with cursor; authorization on reconnect.
- `POST /v1/runs/:id/cancel`: idempotent cancellation request and terminal-status reconciliation.
- `POST /v1/approvals/:id/decision`: approve/reject a specific unchanged action.
- CRUD APIs for conversations, projects, files, artifacts, connections and schedules.
- `GET /v1/models`: capability/entitlement-filtered catalog; no secrets.
- `GET /v1/usage`: balances, reservations and settled user-visible usage.

Events: accepted, queued, started, text_delta, tool_started, tool_completed, source_added, artifact_ready, approval_required, usage_updated and terminal. Events are numbered and replayable; rendering repeated events does not duplicate content or charges.

Run states: queued, running, awaiting_approval, cancelling, completed, failed, cancelled. Partial content is a result attribute on failed/cancelled runs, not a success claim. Terminal states are immutable except for administrative reconciliation metadata; retries create linked attempts.

Error taxonomy: auth_required, permission_denied, invalid_input, unsupported_capability, quota_exceeded, provider_unavailable, rate_limited, content_blocked, tool_failed, context_limit, cancelled. Include retryability and a safe request ID, not raw upstream errors containing sensitive information.

## 20. Security, privacy and non-functional requirements

All targets below are proposed launch gates, not measured current performance.

| ID | Requirement / target | Verification |
|---|---|---|
| SEC-01 | Authorization on every object, retrieval, job and tool path | Automated cross-user/cross-workspace tests including guessed IDs and revoked memberships |
| SEC-02 | Secrets server-side; encrypted credentials; rotation and least privilege | Bundle/log scans, secret rotation exercise and restricted service credentials |
| SEC-03 | Safe model output, uploads and network tools | XSS, injection, SSRF, malware, zip-bomb and sandbox escape test suites |
| SEC-04 | Policy applies before model/tool execution | Adversarial documents cannot request hidden credentials, expand scope or approve writes |
| SEC-05 | Privacy by default | No public shares or training reuse without explicit policy/consent; subprocessors and retention disclosed |
| SEC-06 | Deletion and revocation | Immediate denial of new access; proposed active-system purge within 30 days, backup expiry within 90 days, subject to lawful exceptions and contracts |
| SEC-07 | Admin security | MFA for privileged users, least-privilege support, audit of administrative access |
| REL-01 | 99.9% monthly app/API availability target | Synthetic checks and incident records; provider-dependent task failures separately reported |
| REL-02 | Recoverable state | Tested backup restore; proposed RPO ≤1 hour and RTO ≤4 hours for application records |
| REL-03 | No duplicate side effects or billing | Idempotency tests across timeout/retry/crash paths |
| PERF-01 | Interactive feedback ≤300 ms p95 | Client interaction tests; remote work acknowledged promptly |
| PERF-02 | Fast text first content ≤3 s p50, ≤8 s p95 under reference load | Measured on nominated region/network/model, excluding research/deep runs; adjust claim if provider cannot meet target |
| PERF-03 | Long work shows activity within 2 s and heartbeat at least every 15 s | Stalled job detection and progress replay tests |
| ACC-03 | WCAG 2.2 AA target; mobile 360 px and up | Keyboard/screen-reader/manual audits plus automated checks |
| OPS-01 | Per-run latency, failure and cost visibility | Dashboards segmented by model, tool, tier and workspace without default raw-content logging |

Initial load-test envelope: 100 simultaneous active sessions and 20 concurrent ordinary generations, plus queued long jobs. This is a proposed pilot capacity, not an internet-scale claim; validate provider quotas before launch and apply backpressure rather than overload workers.

Retention promises must include originals, derivatives, embeddings, caches, audit metadata and provider copies. Backup restoration must reapply deletion tombstones. Do not claim immediate deletion of already downloaded files. Personal memory is excluded from shared projects unless deliberately copied with consent.

## 21. Evaluation and analytics

Create a versioned general-purpose evaluation set before expanding models: proposed minimum 150 tasks covering writing, factual Q&A, current-source research, PDFs, spreadsheets, coding, image instructions, voice, multilingual use, privacy and failure recovery. Add adversarial and permission tests as a separate suite. Use synthetic or consented data; reserve held-out tasks to reduce overfitting.

| Metric | Proposed V1 gate / pilot hypothesis |
|---|---|
| Critical workflow completion | ≥95% across fixed reproducible tests; zero unresolved critical failures |
| Citation validity | 100% cited references resolve to a recorded retrieved source in fixtures |
| Citation support | ≥95% of sampled externally verifiable claims supported or explicitly qualified, human-reviewed |
| Model routing compliance | 100% explicit-choice, capability, permission and budget test cases |
| Artifact validity | ≥98% generated test artifacts open/recalculate/render as required |
| Security | Zero unresolved critical/high vulnerabilities at release gate |
| Billing | No duplicate charges; ledger reconciles within defined tolerance and delayed-reporting policy |
| User activation | Pilot hypothesis: ≥60% complete a meaningful first task within 10 minutes |
| Retention | Pilot hypothesis: ≥35% of activated users return in week 4 |
| Value | Track accepted outputs and correction effort, not only number of messages |

Separate deterministic tests from subjective quality ratings. Have independent reviewers assess a sample against task-specific rubrics. A model-generated judge may assist evaluation but cannot be its only authority. Compare new models against the current production baseline before promotion.

Analytics events: onboarding_completed, message_submitted, run_completed/failed/cancelled, model_selected, fallback_used, source_opened, artifact_downloaded/edited, memory_changed, quota_reached, approval_granted/denied, task_paused and feedback_submitted. Avoid raw prompt content in analytics by default.

## 22. Migration from the existing prototype

Current evidence is from the local checkout of `swapnil-create/arcel-codeworks`, inspected during this work; it is not a fresh audit of all Vercel settings or infrastructure.

| Existing item | Keep / change | Action |
|---|---|---|
| Composer-first shell | Keep direction | Rebuild as typed, accessible components with stateful rendering |
| Official ARCEL mark | Keep approved source | Fix separate product lockup using verified assets; do not ship current mockups |
| `/api/chat` server-side key | Keep boundary | Replace with authenticated gateway/run service |
| Tier mapping | Fix immediately | Resolve explicit selection versus Auto; test actual served model |
| Chat state and seeded history | Replace | Persistent store; clean empty states and migration version |
| Research prompt | Replace | Real search/fetch/citation pipeline |
| Compare calls | Refactor | Registry IDs, independent attempts, costs and actual rubric/synthesis |
| Length-based judge / first-sentence combine | Remove or disable | Never expose as intelligent judging/synthesis |
| Silent message truncation | Replace | Context accounting, compaction and visible limitations |
| No auth/rate limits in inspected handler | Release blocker | Add before enabling a public paid provider key |
| GitHub/Vercel auto-deploy issue | Resolve with owner permission | Verify CI, preview deploy, manual production approval and rollback |

Local logo commit `0847273` was ahead of `origin/main` at inspection and remains unapproved; this PRD does not approve pushing it. No logo change is a dependency for defining the core product.

## 23. Delivery roadmap and resourcing

Planning estimate, not a commitment: roughly **16–24 weeks** to a tested general-purpose V1 with an experienced team, managed infrastructure and narrow initial connectors. Re-estimate after a two-week discovery/integration spike. A smaller team should reduce parallel work or extend time—not quietly remove the V1 gates.

Suggested capacity: product owner; product designer; two frontend/full-stack engineers; two backend/AI engineers; QA automation engineer; fractional platform/security support. Roles may overlap; capacity and vendor constraints drive dates. AEC specialists are not required to validate the core client.

| Stage / indicative window | Work packages | Exit gate |
|---|---|---|
| R0 / weeks 1–2 | PRD decisions, approved UX flows, provider spikes, data model, auth, CI, tests, metering skeleton | Architecture and capability contracts agreed; no uncontrolled public API spend |
| R1 / weeks 3–6 | Persistent chat, model picker/routing, streaming, uploads, quick search, projects, settings | Core beta scenarios pass; permission and billing reservations tested |
| R2 / weeks 7–12 | Deep research, artifacts, data/code sandbox, images, memory, dictation and sharing | Work beta scenarios pass, files verified and long-run recovery demonstrated |
| R3 / weeks 13–18 | Voice conversation, initial connectors, assistants, tasks, one approved write, team controls and billing | Complete baseline feature gates pass |
| Hardening / weeks 19–24 as needed | Load/security/accessibility audits, model evaluations, pilot fixes, restore drills | General-purpose V1 release approval |
| R4 / after V1 | AEC pack, broader integrations, native apps, video, BYOK and enterprise depth | Separate product case and acceptance criteria |

The stage windows are dependencies and planning ranges, not exact sprint promises. If a provider/OAuth review blocks a committed R3 capability, remain in beta or formally revise scope; do not call the baseline complete.

## 24. Implementation work packages for engineering agents

Each package must ship code, migration/configuration, automated tests, error-state UX, observability and acceptance evidence. Agents must not invent credentials, bypass approvals or commit unfinished mock behavior as a completed requirement.

| Package | Scope / requirement groups | Dependencies | Completion evidence |
|---|---|---|---|
| WP-01 | Architecture, schemas, environments, auth and CI | Approved R0 decisions | Architecture record, migration tests, protected preview pipeline |
| WP-02 | Chat/history/settings: ACC, CHAT, PER | WP-01 | Browser tests for refresh, branching, cancellation and account separation |
| WP-03 | Model gateway/registry/metering: MOD, BIL | WP-01 | Adapter and routing matrix; ledger concurrency tests |
| WP-04 | Upload/library/retrieval: FIL, PRJ | WP-01 | Extraction fixtures, source locators, authorization/deletion tests |
| WP-05 | Search/research: SRC, background TSK | WP-02–04 | Citation audit, research replay/cancel/recovery tests |
| WP-06 | Artifacts/code/data: ART, COD, DAT | WP-02–04 | Rendered/recalculated files, sandbox security tests |
| WP-07 | Media/voice: IMG, VOI | WP-02–03, storage | Reference-edit ancestry, audio interruption/consent tests |
| WP-08 | Memory/assistants: MEM, AST | WP-02–04 | Scope isolation, memory deletion and assistant version tests |
| WP-09 | Connectors/tasks/approvals: CON, TSK, AGT | WP-03–06 | OAuth revocation, scheduler and idempotent approved-write tests |
| WP-10 | Compare/sharing/team/billing: CMP, COL, BIL | Relevant core packages | Failure-isolated comparisons, share revocation, signed webhook tests |
| WP-11 | Release validation: SEC, REL, PERF, OPS | All V1 packages | Security review, load/accessibility results, restore drill and pilot report |

Parallel implementation is possible after shared contracts freeze. One accountable technical lead owns schema changes, integration tests and release acceptance. Agents may produce PRs; passing tests and human review—not an agent's completion statement—determine readiness.

### Required task brief template

For each ticket specify: requirement IDs; user scenario; affected API/data contracts; in-scope behavior; explicit exclusions; permission rules; limits; empty/error states; acceptance tests; migration/rollback; telemetry; and proof to attach. A screenshot alone is not functional evidence. A successful API response alone is not UX evidence.

## 25. Full V1 release checklist

- [ ] Fresh user can ask a general question without selecting AEC, project or model.
- [ ] Chat history, branches and saved files persist across devices.
- [ ] Named-model choice and Auto/effort behavior are truthful and tested.
- [ ] Quick search and deep research use actual retrieval with useful citations.
- [ ] File-only scope stays private and respects extraction limits.
- [ ] Documents, spreadsheets, presentations, code and images can be created and downloaded.
- [ ] Artifacts can be revised and previous versions restored.
- [ ] Code/data execution is isolated and completion claims match execution logs.
- [ ] Image reference editing and full-resolution viewing work.
- [ ] Dictation, conversational voice and text continuity work.
- [ ] Projects, memory controls and temporary conversations work.
- [ ] Initial connectors work with revocation and least privilege.
- [ ] Custom assistants, scheduling and resumable tasks work.
- [ ] The pilot external write requires valid approval and produces a receipt.
- [ ] Compare/review does not simulate intelligence using length or string concatenation.
- [ ] Sharing, team roles and billing work without access leaks or duplicate charges.
- [ ] Mobile, accessibility, privacy/deletion, load and restore tests pass.
- [ ] Support, incident ownership, status messaging and rollback are ready.
- [ ] Capability disclosures and actual entitlements agree.
- [ ] Product owner signs off on the whole baseline before AEC expansion becomes the priority.

## 26. Optional five-pillar AEC experience

Only after the general-purpose foundation, introduce an installable/enabled expertise pack using the same projects, files, tools and artifact system. General users never need to see it.

The user's latest instruction specifies five pillars. Working grouping for review: **Development; Design & Engineering; Construction; Operation; Practice.** This grouping combines Design and Engineering rather than silently redefining the business. Final taxonomy is an open decision and does not block V1.

A pack can supply terminology, approved templates, reference collections, tool presets and specialist evaluations. It cannot replace the model catalog or override platform permissions. Domain-sensitive outputs require appropriate review. Vault/Atlas integrations must inherit their real access rules; this PRD does not redefine Konnect or assume those systems are implemented.

## 27. Risks, tradeoffs and mitigations

| Risk | Consequence | Mitigation |
|---|---|---|
| “Everything app” scope expands continuously | Never launches | Freeze V1 by this checklist; later ideas go to R4 |
| Provider features differ from consumer apps | False parity claims | Capability contracts, explicit disclosures and integration spikes |
| Cheap routing reduces quality | User distrust | Quality floor and measured evaluations before cost optimization |
| Deep/media usage overwhelms revenue | Unsustainable service | Reservations, caps, cohort economics and opt-in top-ups |
| Cross-provider data exposure | Privacy breach | Per-workspace route policies, explicit tools and audited credentials |
| Prompt injection through files/web/MCP | Unauthorized actions | Untrusted-content boundary and server-enforced approvals |
| Long jobs fail or repeat actions | Lost work/duplicate writes | Durable checkpoints, idempotency and side-effect reconciliation |
| Recreated brand assets remain unreadable | Poor product impression | Verified export and true browser QA at deployment size |
| Multi-model review mistaken for truth | False confidence | Evidence rubric, uncertainty and human review for consequential work |
| Stale model catalog | Falling behind | Weekly discovery, evaluation-led promotion, retirement process |

## 28. Decisions and immediate way forward

### Recommended defaults that allow planning to proceed

General-purpose web client; private by default; Auto plus named models; managed provider keys; no automatic overages; 4–6 curated model choices; complete R1–R3 baseline; AEC only as an optional pack after V1.

### Decisions required before paid production launch

| Decision | Proposed position | Approver / point needed |
|---|---|---|
| Audience and initial distribution | Invite-only general-purpose pilot, then public signup | Product owner / before R1 |
| Provider/model catalog | Evaluate available candidates; pin approved versions | Product + technical lead / R0 spike |
| Data region and retention | Choose supported policy across all subprocessors | Owner + security/legal / before real sensitive data |
| Packaging and retail price | Trial + one paid plan first; meter actual use | Product + finance / before billing launch |
| Team/connector launch scope | Proposed three read connectors and one approved write | Product + engineering / R0 integration plan |
| Branding | Accurate asset export and app-scale approval | Design + product / before public launch |
| Five-pillar taxonomy | Development, Design & Engineering, Construction, Operation, Practice | Product owner / R4 definition |

### Next ten working days

1. Approve product scope, naming and the separation of task/model/effort/expertise.
2. Turn this PRD into a traceable backlog using the requirement IDs and work packages.
3. Produce clickable flows for first chat, model choice, file work, research, artifact editing, voice and quota/error states.
4. Run provider spikes for streaming/tool calls, search citations, image editing and voice. Record capability gaps and actual test costs.
5. Establish identity, storage permissions, canonical data model, ledger and preview deployment pipeline.
6. Build one complete vertical slice: sign in → attach a file → select a model → stream a cited answer → save → reopen → revoke/delete.
7. Review the evidence, refine estimates and begin the R1 beta scope.

**Final direction:** complete the general AI client first. Make model choice transparent and portable. Build real tools and durable work surfaces. Then let AEC users enable their five-pillar expertise without turning every user's home screen into an industry application.
