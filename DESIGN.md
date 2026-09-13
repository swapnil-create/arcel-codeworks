# ARCEL Codeworks — brand implementation

## Source of truth

The implementation follows the ARCEL System frame at Figma node `293:2790`. The prior glass-dashboard direction was removed after comparison with the supplied brand system.

## Extracted rules

- Canvas: white working field with a fixed black operating-system rail.
- Hierarchy: large, tightly tracked Plus Jakarta Sans statements; Inter for product copy and UI metadata.
- Palette: ARCEL Blue `#191BDF`, black, Dark Gray `#4E4E4E`, Neutral Gray `#6E6E73`, line gray `#CECECF`, pale blue `#F4F5FF`, and white.
- Structure: editorial grids, wide negative space, exact alignment, thin rules, squared containers, compact labels, and numbered sections.
- Brand asset: technical diagrams and geometric identities are primary visual language—not gradients, glow, glass, floating cards, or ornamental depth.
- Motion: restrained and structural. Content reveals, line progress, and hover movement clarify state without changing the visual identity.

## Codeworks translation

- Projects remain the durable unit of work, following the earlier product analysis.
- The projects home is organized as an ARCEL intelligence map: the master hexagon connects to project-domain nodes and the repository → context → sessions → artifacts lifecycle.
- Project rows use the exact domain assets exported from the supplied Figma file.
- The project workspace uses the same numbered, ruled, editorial grammar for Sessions, Activity, Artifacts, Context, and the agent composer.
- `/` and `⌘K` open search; `⌘Enter` runs the project agent.

## MVP boundary

This is a dependency-free front-end MVP. Authentication, persistence, repository APIs, streaming model output, and file transport remain the backend integration layer.
