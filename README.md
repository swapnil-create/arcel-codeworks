# ARCEL Codeworks

ARCEL Codeworks is a clean, composer-first AI workspace combining chat, research, coding, projects, and multi-model comparison.

## Run locally

```bash
cd arcel-codeworks
python3 -m http.server 4173
```

Open [http://localhost:4173](http://localhost:4173).

## OpenRouter setup

The browser calls the local Vercel function at `/api/chat`; it never receives the OpenRouter key. Copy `.env.example` to `.env.local` for local development, then set `OPENROUTER_API_KEY` in Vercel for Development, Preview, and Production. Tier and compare model slugs are configurable through the optional `OPENROUTER_MODEL_*` variables.

The default tiers are Fast (Gemini Flash), Balanced (Claude Sonnet), and Deep (Claude Opus). Update the defaults in the Vercel environment if your OpenRouter account uses different model availability or spend limits.

## MVP capabilities

- ChatGPT/Claude-style conversation shell and history
- Claude-style Projects as a supporting workspace feature
- Perplexity-style Research mode with visible sources
- Chat, Research, and Code response modes
- Prompt Arena comparison with model selection, blind responses, voting, Judge Best, and Combine All
- Responsive sidebar, search overlay, keyboard shortcuts, and loading states
- Official ARCEL wordmark, ARCEL Blue, Plus Jakarta Sans headings, and Inter interface typography

The prototype is dependency-free. OpenRouter generation runs through Vercel; persistence, authentication, repository operations, and uploads remain MVP interaction states.
