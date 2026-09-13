# ARCEL Codeworks — Experience Synthesis

## Product thesis

ARCEL Codeworks combines the strongest interaction contracts from the reviewed Claude, Perplexity, and Grok web experiences without reproducing their branding.

`Project = repository/worktree + durable instructions + reusable sources + sessions + activity history`

The project is the stable context layer. A session is the active unit of work. Artifacts, sources, agent traces, and repository state remain attached to the project so future sessions begin informed.

## Reference findings

### Claude: project backbone

- Projects are a peer to chats, not merely a chat filter.
- The project index is intentionally calm: search, activity sort, simple cards, one create action.
- Creation asks for a name and objective in natural language.
- The project workspace keeps the composer central and persistent context in a right rail.
- Instructions and files are reusable project memory.
- Existing chats can be moved into projects; archive remains distinct from deletion.

ARCEL adaptation: keep the mental model, then expose repository, branch, agent state, source freshness, and activity provenance that Claude leaves implicit.

### Perplexity: evidence and intent

- Search, deep research, and sources are visible product concepts.
- Answers can separate content from links, images, and videos.
- The source rail makes provenance inspectable without interrupting the main answer.
- Files, connectors, and spaces meet at the composer.
- Suggested tasks reduce blank-canvas anxiety.

ARCEL adaptation: make sources and repository context inspectable, give the composer explicit Ask / Research / Build / Create intents, and offer context-aware next actions.

### Grok: progress and continuation

- Model depth is easy to understand.
- Long-running work exposes elapsed time, progress language, expandable thoughts, and a stop action.
- Result cards lead naturally into follow-up actions.
- Projects extend into personal files, tasks, and shareable work.

ARCEL adaptation: separate intent from effort; show Planning / Running / Waiting / Complete states; provide Open in editor, Run tests, Explain, Create branch, and Prepare PR continuations.

## Final experience architecture

- New session
- Projects
- Sessions
- Artifacts
- Automations
- Integrations
- Skills
- Settings

### Projects index

Cards pair Claude's restraint with code-native operational metadata:

- Name and objective
- Repository and branch
- Current run state
- Last session
- Context count
- Resume affordance

### Project workspace

- Left rail: global navigation plus pinned and recent work.
- Center: project sessions, activity, artifacts, results, and the universal composer.
- Right rail: repository, instructions, files, connected sources, skills, automations, and context health.

### Composer contract

- Intent: Ask / Research / Build / Create
- Effort: Fast / Deep / Expert
- Scope: current project and branch
- Inputs: files, images, project files, recent items, and connectors
- Controls: voice, send, progress, stop
- Outputs: evidence, execution trace, artifacts, and next actions

## ARCEL visual translation

- ARCEL Blue `#191BDF` is the sole branded interaction accent.
- Ink `#111827`, Muted `#5A6470`, Pale brand fill `#F1F2FF`, and White define the UI hierarchy.
- Plus Jakarta Sans is used for product titles and headings; Inter is used for UI, body, metadata, and controls.
- The official SVG wordmark is used in the sidebar.
- The interface stays precise and editorial: warm neutral canvas, hairline borders, restrained radii, minimal shadow, no gradients, and no decorative color system.

## Sources

- [Claude Web screens](https://mobbin.com/apps/claude-web-6478dfda-4043-439e-8a86-d83354176b49/055a5688-a21e-4f31-ab1f-373a1cffcf30/screens)
- [Perplexity Web screens](https://mobbin.com/apps/perplexity-web-d0c6a94e-4988-41bd-acc3-0fc652b28b61/15fda1d9-94dd-4255-bfa9-769f689a051c/screens)
- [Grok Web screens](https://mobbin.com/apps/grok-web-1e3cbfef-02b3-430a-b802-84492126008b/40e9449c-860e-4df2-b739-37328a48c075/screens)
