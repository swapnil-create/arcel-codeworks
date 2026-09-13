# ARCEL Codeworks

ARCEL Codeworks is a responsive, high-fidelity spatial workspace for ambitious projects. It combines durable context, repository state, sessions, artifacts, and agent controls in a glassy, tactile interface.

## Run locally

```bash
cd arcel-codeworks
python3 -m http.server 4173
```

Then open [http://localhost:4173](http://localhost:4173).

The MVP is dependency-free: `index.html` loads local Inter and Plus Jakarta Sans assets, `styles.css` provides the responsive visual and motion system, and `app.js` owns prototype state and interactions.

## Implemented experience

- Spatial glass interface with pointer-responsive light and project cards
- Project index with search, sorting, status, repository state, and project pulse
- Project workspace with Sessions, Activity, and Artifacts tabs
- Persistent or responsive project context rail
- Composer with work modes, reasoning depth, attachments, staged agent progress, and simulated results
- Create, edit, duplicate, and archive project interactions
- Command palette (`/` or `⌘K`), toast feedback, and keyboard run shortcut
- Reduced-motion and reduced-transparency fallbacks

See `DESIGN.md` for the open-source interface audit and resulting design system. `DESIGN-AUDIT.md` contains the earlier Claude, Perplexity, and Grok product-flow audit.
