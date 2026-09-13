# ARCEL Codeworks

ARCEL Codeworks is a calm, code-native project workspace prototype. It brings durable project context, repository state, agent instructions, source chips, sessions, artifacts, and an evidence-aware composer into one responsive surface.

## Run locally

From this directory, start any static HTTP server:

```bash
cd arcel-codeworks
python3 -m http.server 4173
```

Then open [http://localhost:4173](http://localhost:4173).

The app is intentionally dependency-free: `index.html` loads the local Inter and Plus Jakarta Sans font assets, `styles.css` provides the responsive visual system, and `app.js` owns the seeded prototype state and interactions.

## Implemented experience

- Persistent low-noise dark sidebar with projects, sessions, artifacts, automations, integrations, and recent work.
- Responsive Projects index with search, sorting, durable-context summaries, status, and resume/context actions.
- Project detail workspace with Sessions, Activity, and Artifacts tabs.
- Context rail for repository/branch, instructions, sources, and agent context order.
- Composer with Ask / Research / Build / Create intent modes, Fast / Deep / Expert depth, attachment menu, focus states, and simulated progress/result states.
- New project, edit context, project actions, mobile navigation, source attachment, duplication, and archive flows.

