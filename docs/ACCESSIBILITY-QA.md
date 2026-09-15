# Accessibility & keyboard regression checklist

Manual QA checklist for the shipped static shell (`index.html`, `app.js`, `styles.css`).
It records **findings only** — it does not redesign the UI or change styling. Use it to catch
regressions in keyboard access, focus, semantics, contrast, motion, and small-screen behavior.

Statuses below reflect an audit of the current source. "OK" = implemented and expected to pass;
"Check" = verify manually each release (behavior depends on browser/AT); "Gap" = a known
limitation to watch, documented without prescribing a redesign.

How to run: open the app (`node scripts/local-preview.mjs`, then `http://127.0.0.1:4173`),
sign-in gate aside, and drive the checks below with keyboard and a screen reader.

## 1. Keyboard reachability

- [ ] Every interactive control (composer textarea, send/stop, mode and effort toggles,
      sidebar nav, project cards, command palette, model switcher, settings, toasts) is
      reachable and operable with Tab / Shift+Tab and Enter/Space.
- [ ] Global shortcuts work: `⌘/Ctrl K` opens the command palette, `⌘/Ctrl /` opens the
      palette, `⌘/Ctrl Enter` sends the focused composer, `Esc` closes overlays/toasts.
- [ ] Command palette list is navigable with Arrow Up/Down and activates with Enter.

Findings: OK — a single `keydown` handler implements the shortcuts and palette arrow
navigation; interactive elements are native `button` / `textarea` / `input` / `a[href]`.

## 2. Visible focus

- [ ] A visible focus ring appears on keyboard focus for all controls.
- [ ] Focus is not shown on mouse click where `:focus-visible` suppresses it (expected).

Findings: OK — `styles.css` sets `:focus { outline: none }` and
`:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px }`, plus
`:focus-within` treatments on the composer and inputs. Check: in browsers without
`:focus-visible`, programmatic focus (e.g. after opening a dialog) may show no ring; verify
the current browser matrix.

## 3. Escape behavior and focus management

- [ ] `Esc` closes the command palette, settings sheet, model switcher, nav sheet, and
      dismisses toasts.
- [ ] Opening a dialog moves focus into it (autofocus target), and Tab is trapped inside the
      open dialog (Tab from the last control wraps to the first, Shift+Tab from the first wraps
      to the last).
- [ ] The background app shell is inert while an overlay is open.

Findings: OK — `Esc` handling closes menus/toasts; open dialogs receive focus via the
`[data-autofocus]` / first-focusable logic; a Tab focus trap runs against `[data-dialog]`; the
app shell renders with `inert aria-hidden="true"` while an overlay is open. Gap: focus is not
explicitly restored to the triggering control after a dialog closes — verify focus lands
somewhere sensible and does not jump to the top of the page.

## 4. Semantic labels for icon-only controls

- [ ] Icon-only buttons expose an accessible name (menu, back, close, dismiss toast, new
      project, account/sign-in).
- [ ] Decorative graphics are hidden from assistive tech.

Findings: OK — icon buttons carry `aria-label` (e.g. "Open navigation", "Back", "Close",
"Dismiss", "New project", and "Account"/"Sign in" on the user chip). The LED board uses
`role="img"` with a label and its dot images use empty `alt`. Check: the model switcher /
menu triggers expose `aria-haspopup`/`aria-expanded` on only some controls — verify that any
control opening a menu announces its expanded state, and add labels for any newly added icon
buttons.

## 5. Contrast

- [ ] Body and UI text meet WCAG AA (4.5:1 normal, 3:1 large) against their backgrounds.
- [ ] Disabled controls are visibly disabled (lower contrast is acceptable for disabled state).
- [ ] Error/banner and focus colors are distinguishable.

Findings: Check — measured token ratios: ink `#111826` on white ≈ 17.8:1 and blue `#191bdf` on
white ≈ 9.3:1 (both pass AAA); muted `#5a6470` on white ≈ 6.0:1 (passes AA for normal text);
danger `#cc3838` on `#fff0f0` ≈ 4.5:1 (passes AA for normal text, but only marginally — re-check
if danger text is ever rendered small or over a different background); disabled `#999ea6` on
`#ededf0` ≈ 2.3:1 (below AA, acceptable for the disabled state). Verify these hold wherever the
tokens are actually applied and log any failing real-world pair as a finding — do not restyle to
fix here.

## 6. Reduced motion

- [ ] With `prefers-reduced-motion: reduce`, overlay/message/toast animations are minimized and
      looping/loading animations (send spinner, skeletons) are stilled.

Findings: OK — `@media (prefers-reduced-motion: reduce)` swaps sheet/palette/message/toast
animations for a short fade, disables the send spinner and skeleton animation, and removes the
sidebar transition.

## 7. Small-screen overflow

- [ ] On narrow viewports the sidebar becomes a sheet, overlays render as bottom sheets, and no
      content is clipped or horizontally scrolled unexpectedly.
- [ ] The mobile menu, back, and account controls are reachable and labeled.

Findings: OK — a `compact` state and responsive media queries switch to sheet/bottom-sheet
layouts and a mobile menu button. Check: verify the composer, long chat messages, and Compare
cards do not overflow at ~320px width.

## 8. Screen-reader announcement of live generation states

- [ ] Starting generation announces a working/"Generating" state.
- [ ] Error and gate banners are announced.
- [ ] Toasts are announced without stealing focus.

Findings: OK — the in-progress assistant placeholder uses `aria-live="polite"` with an
`aria-label="Generating"`; error/gate banners render with `role="alert"`; the toast region uses
`role="status" aria-live="polite"`. Gap: completed streamed answer text is not itself inside a
live region, so the final answer may not be automatically announced when streaming finishes —
verify how your screen reader handles this and log it as a finding rather than restructuring the
DOM here.

## Sign-off

| # | Area | Result | Notes |
|---|---|---|---|
| 1 | Keyboard reachability | | |
| 2 | Visible focus | | |
| 3 | Escape + focus management | | |
| 4 | Icon-only labels | | |
| 5 | Contrast | | |
| 6 | Reduced motion | | |
| 7 | Small-screen overflow | | |
| 8 | Live generation announcements | | |

Reviewer: ______________________  Build / commit: ______________________  Date: ____________

Log failures as issues with the control, viewport, and assistive technology used. This document
records findings; changes to styling or layout are out of scope for this checklist.
