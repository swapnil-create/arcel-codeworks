# ARCEL Codeworks

ARCEL Codeworks is a dependency-free front-end MVP for a project-based agent workspace. Its visual system is translated directly from the supplied ARCEL Figma brand system: black operating rail, white editorial canvas, strict rules, cobalt emphasis, and technical intelligence geometry.

## Run locally

```bash
cd arcel-codeworks
python3 -m http.server 4173
```

Open [http://localhost:4173](http://localhost:4173).

## Implemented

- Project intelligence map using exported ARCEL Figma geometry
- Durable Projects with repository, branch, sources, sessions, activity, and artifacts
- Context-aware composer with Ask, Research, Build, and Create modes
- Staged agent progress and result states
- Project creation, editing, duplication, archival, filtering, and sorting
- Command search with `/` or `⌘K`
- Responsive navigation and project context drawer
- Reduced-motion support

See `DESIGN.md` for the Figma-derived implementation rules and `DESIGN-AUDIT.md` for the earlier Claude, Perplexity, and Grok product-flow analysis.
