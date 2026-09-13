# ARCEL Codeworks — design direction

## Product thesis

ARCEL Codeworks is a spatial project workspace, not a generic chat client. A Project is the durable home for repository state, instructions, approved sources, sessions, activity, and artifacts. The composer is the action surface; the project is the memory.

## Open-source reference audit

This implementation was informed by direct inspection of the following public repositories on 13 September 2026:

- [assistant-ui](https://github.com/assistant-ui/assistant-ui): composer, thread, message, attachment, action-bar, keyboard, and accessibility primitives. Applied here as a persistent, context-aware composer with shortcuts, attachment controls, and visible agent states.
- [Glass](https://github.com/Glass-HQ/Glass): browser, editor, and terminal unified into one native-feeling environment. Applied here as a coherent workspace shell rather than disconnected tool pages.
- [ThanasOS](https://github.com/Thanas-R/thanas-os): interactive desktop behaviors, custom widgets, focus states, and a mix of CSS and motion primitives. Applied here as tactile controls, live workspace indicators, a command palette, and layered panels.
- [liquid-glass](https://github.com/rizzytoday/liquid-glass): optical edge treatment, saturation, and browser fallbacks. Applied here with dependency-free CSS translucency, specular highlights, blur fallbacks, and `prefers-reduced-transparency` support rather than a Chromium-only filter.
- [bolt.diy](https://github.com/stackblitz-labs/bolt.diy): project restoration, repository operations, diffs, attachments, and agent-driven building. Applied here as repository-aware projects, session history, contextual sources, and staged run feedback.
- [LobeHub](https://github.com/lobehub/lobehub): projects and agents as durable units of work. Applied here as explicit project context, source visibility, and mode/depth controls.

## Visual system

- Brand anchor: ARCEL Blue `#191BDF`, Ink `#111827`, Muted `#5A6470`, Pale `#F1F2FF`, White.
- Typography: Plus Jakarta Sans for display and interface hierarchy; Inter for body and dense UI.
- Material: translucent white surfaces over a pale spatial field, high-contrast hairlines, inset highlights, optical bloom, and restrained shadows.
- Skeuomorphism: pressed controls, lens-like project orbs, inset wells, progress dials, and physical layering. No imitation of proprietary Apple icons or product chrome.
- Motion: spring-like entry, hover lift, pointer-responsive specular light, subtle project-card tilt, pulsing live status, and explicit four-stage agent progress.

## Interaction model

- `/` or `⌘K` opens the command palette.
- Project cards respond to pointer position and expose status, repository state, session count, context count, and project pulse.
- Project tabs preserve a single workspace hierarchy: Sessions, Activity, Artifacts.
- Agent runs advance through understanding, context inspection, solution shaping, and output preparation before creating a result.
- New Project, project context editing, project duplication/archive, filters, attachments, and responsive context rail are functional in the prototype.
- `prefers-reduced-motion` and `prefers-reduced-transparency` are respected.

## MVP boundary

The prototype is intentionally dependency-free so it can ship immediately. Repository APIs, persistence, authentication, streaming model output, and file upload transport are represented by complete interaction surfaces and are the next backend integration layer.
