# ARCEL Codeworks

Composer-first AI workspace **prototype**. The intended product combines chat, research, coding, projects, and multi-model comparison; **those capabilities are not shipped**. This repo is a static UI shell plus a gated OpenRouter proxy.

**Live UI:** [https://arcel-codeworks.vercel.app](https://arcel-codeworks.vercel.app)

**Completion boundary:** [docs/PRD-MERGE-STATUS.md](docs/PRD-MERGE-STATUS.md) is the accurate record of what was merged vs intentionally not built (Swapnil's 2026-09-14 handoff). Do not treat this README or on-screen copy as done-status.

## Shipped UI

Dependency-free static client (`index.html`, `app.js`, `styles.css`). Conversation state is in-memory and resets on refresh.

- **Chat shell** — composer-first home, Chat and Code prompt modes, Auto · Quick / Standard / Deep effort tiers, loading state
- **Projects UI stub** — hardcoded cards; not a real workspace
- **Search overlay** — UI only; lists seeded recents, does not search
- **Compare UI** — model selection, side-by-side cards, manual Choose (names stay hidden until you pick)
- **Responsive states** — sidebar / mobile overlay, keyboard shortcuts (⌘K new chat, Esc close, ⌘Enter send)
- **Brand** — ARCEL wordmark, ARCEL Blue, Plus Jakarta Sans headings, Inter UI type

## Not built

Do not describe these as shipped:

- Auth, sessions, or workspace membership
- Persistence or durable chat history
- Real research / web search with visible sources (Research is disabled in the composer)
- File uploads
- Model registry or verified catalog
- Arena Judge Best or Combine All (manual choose only)
- Voice, image generation, or code execution
- CI and GitHub→Vercel preview/prod policy

Public OpenRouter generation is **disabled until auth**. `OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO` is a kill-switch for a **restricted internal demo with a tightly capped key**. Do not enable it on the public deploy.

## Run locally

```bash
python3 -m http.server 4173
```

Open [http://localhost:4173](http://localhost:4173). This serves the static UI only. `/api/chat` is a Vercel function.

## OpenRouter (server-side)

The browser calls `/api/chat`; it never receives the OpenRouter key. Copy `.env.example` to `.env.local` for local Vercel use, then set `OPENROUTER_API_KEY` in the Vercel project. Keep `OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO=false` on shared URLs.

Optional `OPENROUTER_MODEL_*` slugs map the prototype tiers (Fast / Balanced / Deep) and Compare models. Those env maps are not a model registry.

## Docs

| Doc | Role |
|---|---|
| [PRD merge status](docs/PRD-MERGE-STATUS.md) | Honest completion boundary |
| [PRD](ARCEL-Codeworks-PRD.md) | Product requirements |
| [WP-01 architecture](docs/WP-01-ARCHITECTURE.md) | Prototype audit and R0 contracts |
| [WP-01 security/NFR gate](docs/WP-01-SECURITY-NFR-GATE.md) | §20 checklist; WP-01 not done |
| [D04 provider spikes](docs/D04-PROVIDER-SPIKES.md) | Spike plan + harness; D04 not done |
| [FLOW-MAP](docs/flows/FLOW-MAP.md) | D03 clickable-flow map |
| [Delivery tracker](DELIVERY-TRACKER.md) | Done vs not-done |
