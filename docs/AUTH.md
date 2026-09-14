# Auth configuration (D05 / WP-01 P4)

**Status:** Signed session cookie + OAuth scaffold. In-memory isolation fixtures exist. **SEC-01 stays Fail** until an IdP is configured in production and Postgres-backed cross-user tests exist.

Do not commit secrets. Do not set `OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO=true` on any shared URL. That flag is **not** a session and **cannot** authorize OpenRouter spend.

## What this repo implements

Vanilla HTML/JS + Vercel serverless (no Auth.js/NextAuth — too heavy for this stack).

| Piece | Behavior |
|---|---|
| Session | HttpOnly `arcel_session` cookie, HMAC-SHA256 with `AUTH_SECRET` |
| Sign-in | `/api/auth/login` → GitHub and/or Google OAuth → `/api/auth/callback`; Google requires a verified `@arcelintelligence.com` email |
| Sign-out | `POST /api/auth/logout` clears cookies |
| Who am I | `GET /api/auth/session` (no secrets) |
| Spend gate | `POST /api/chat` requires a valid session **and** `OPENROUTER_API_KEY`. Missing session → `AUTH_REQUIRED`. No cookie / no `Authorization` header / client-asserted `user` names cannot bypass. |
| Object ACL (fixture only) | `lib/object-access.js` + `docs/data-model/fixtures/sec01-isolation-slice.json` — guessed IDs, revoked memberships, and cross-user reads deny closed. **Not wired to a live store.** |

Fail closed: if `AUTH_SECRET` is missing, shorter than 32 characters, or no OAuth client is set, login does not succeed and `/api/chat` stays `AUTH_REQUIRED`.

Identity is **server-derived** from the cookie. The client must not be trusted for `sub`, `display_name`, or bearer tokens.

This is **not** workspace membership, ACL, or ACC-01 session-list/remote-revoke. Those need a database (still stubbed).

## Vercel owner checklist (before OpenRouter on production)

Owner action required. Do **not** add a paid `OPENROUTER_API_KEY` on Production until all of the following are set. See this file as the source checklist.

1. Generate a secret: `openssl rand -base64 48` — store it only in Vercel; never commit it.
2. Vercel project → Settings → Environment Variables, for **Production** (and Preview if you will sign in there):
   - `AUTH_SECRET` (the value from step 1; ≥32 characters)
   - `AUTH_URL` = `https://arcel-codeworks.vercel.app` (or the preview URL you are testing)
   - `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` **or** `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`
3. Keep `OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO` **unset or false** on Production and shared Preview. CI forbids enabling it on tracked runtime paths.
4. Add `OPENROUTER_API_KEY` **only after** steps 1–3. Use separate preview vs production keys.
5. Confirm a real sign-in creates `/api/auth/session` with a `user.sub`, then retry generation.

`AUTH_*` configuration is an owner action. Session code fails closed until it is done.

When Google is used, the callback applies a second server-side restriction in addition to Google Cloud's Internal audience: `email_verified` must be `true` and the address must end exactly in `@arcelintelligence.com`. GitHub behavior is unchanged. A rejected Google identity receives `domain_restricted` and no session cookie is minted.

### GitHub OAuth App

GitHub → Settings → Developer settings → OAuth Apps → New:

- Homepage URL: `https://arcel-codeworks.vercel.app`
- Authorization callback URL: `https://arcel-codeworks.vercel.app/api/auth/callback`

Use the **client ID** (public) and **client secret** (Vercel only). For local preview, add a second redirect URL `http://127.0.0.1:4173/api/auth/callback` or a second OAuth app.

### Google OAuth client (optional)

Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client (Web):

- Authorized redirect URI: `{AUTH_URL}/api/auth/callback`

Map client ID → `AUTH_GOOGLE_ID`, client secret → `AUTH_GOOGLE_SECRET`.

## Local

```bash
cp .env.example .env.local   # gitignored
# fill AUTH_SECRET, AUTH_URL=http://127.0.0.1:4173, and one OAuth pair
node scripts/local-preview.mjs
```

`local-preview` loads `.env.local` if present and never sets the demo kill-switch.

Without those env vars, sign-in and generation fail closed (honesty banners). That is expected.

```bash
node scripts/local-preview.mjs --auth-required
```

Uses a **placeholder** (not real) OpenRouter key so you can see `AUTH_REQUIRED` without a session. It does not enable spend.

## Checks

`node scripts/ci-check.mjs` runs `scripts/test-chat-gate.mjs`, `scripts/test-auth-gate.mjs`, and `scripts/test-sec01-isolation.mjs`.

Session spend gate (`POST /api/chat`, no provider call):

| Case | Expected |
|---|---|
| missing session (omit headers/cookies) | `AUTH_REQUIRED`, no spend |
| tampered cookie | `AUTH_REQUIRED`, no spend |
| expired cookie | `AUTH_REQUIRED`, no spend |
| wrong secret | `AUTH_REQUIRED`, no spend |
| bearer token | rejected; not a session |
| client-asserted `user` / `display_name` / `sub` | rejected |
| `OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO=true` | not a bypass |
| extra identity headers (`x-user-id`) | rejected |
| valid signed cookie | provider mock may run |

In-memory object isolation (no live DB): cross-user personal workspaces, guessed IDs, revoked memberships, and client-asserted names. See [data-model README](./data-model/README.md) for **Postgres gaps**.

CI also forbids committed secrets and `OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO=true` on tracked runtime paths.

## Remaining (not this PR)

- Configure IdP + `AUTH_SECRET` on production (**owner** — Vercel checklist above)
- Durable User/Workspace/Membership store and Postgres cross-user object tests (SEC-01 / ACC-01)
- Usage ledger (REL-03), observability (OPS-01), protected preview + branch protection
- Magic-link email (not implemented; OAuth only)
