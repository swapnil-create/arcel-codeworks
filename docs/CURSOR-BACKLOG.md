# Cursor backlog — low priority, non-blocking

These tasks intentionally sit behind the authenticated chat, OpenRouter, durable data,
and real project workflows. Cursor must not change visual styling, auth logic, spend
authorization, model routing, database migrations, or production environment settings.

## 1. Production smoke-test runbook

Create `docs/PRODUCTION-SMOKE.md` with a manual checklist for a release owner:

- signed-out `/api/auth/session` reports `user: null`;
- Google sign-in accepts verified `@arcelintelligence.com` accounts only;
- sign-out clears the session;
- signed-out `POST /api/chat` returns `AUTH_REQUIRED` and cannot call a provider;
- no OpenRouter key returns `OPENROUTER_NOT_CONFIGURED` and no answer is invented;
- a signed-in, approved low-cost test prompt produces visible streamed text;
- test an upstream failure and verify it stays an error banner, never assistant content.

Do not include keys, cookies, personal data, or instructions to enable the demo flag.

## 2. Accessibility and keyboard regression checklist

Create `docs/ACCESSIBILITY-QA.md`. Cover keyboard reachability, visible focus,
Escape behavior, semantic labels for icon-only controls, contrast, reduced motion,
small-screen overflow, and screen-reader announcement of live generation states.
Document findings only; do not redesign the UI.

## 3. Expand no-network contract tests

Add mocked tests (no keys, no external calls) for these `/api/chat` conditions:

- unsupported model identifier cannot reach OpenRouter;
- invalid message roles, empty prompt, 24+ message limit, and overlong message;
- streamed provider response has ordered deltas and one terminal event;
- provider non-2xx produces structured `OPENROUTER_ERROR`, not assistant text;
- provider stream with zero deltas produces `EMPTY_COMPLETION`.

Tests must use placeholder values only and restore mutated environment variables.

## 4. Data fixture documentation

Explain the current JSON schemas and fixtures in `docs/data-model/README.md`,
including the explicit fact that they are not a database and do not provide ACL or
persistence. Do not alter entity shapes or claim RLS exists.

## Definition of done

Run the existing scripts plus the added tests. Submit one small PR containing only
documentation and tests. If any item needs a product decision or production access,
stop and leave a concise note rather than making a substitute implementation.
