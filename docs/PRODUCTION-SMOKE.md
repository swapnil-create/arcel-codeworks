# Production smoke-test runbook

Manual release-owner checklist for verifying a deployed ARCEL Codeworks build behaves
honestly: signed-out users cannot spend, sign-in is domain-restricted, and provider
failures stay error banners rather than invented assistant text.

Run this **after** a deploy and after completing the [AUTH.md Vercel owner checklist](AUTH.md).
It is a manual checklist, not an automated suite. For the no-network unit/contract checks,
run `node scripts/ci-check.mjs` instead.

## Scope and safety

- This runbook only observes behavior. It does not change auth logic, spend authorization,
  model routing, or environment settings.
- **Never** paste API keys, session cookies, OAuth secrets, or personal account data into
  tickets, logs, screenshots, or this file.
- **Never** set `OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO=true` on any shared URL to make a
  check pass. That flag is not authorization and must not be used to bypass the session gate.
- Use a low-cost model tier and a trivial prompt for the one billed step (see step 6).

## Prerequisites

- The deployed base URL (referred to below as `$BASE`, e.g. the production or a protected
  preview origin).
- A test identity permitted to sign in (see step 2). Keep its credentials out of this file.
- `curl` (or any HTTP client) and a browser.

## Checklist

Record Pass / Fail and the observed `code` / `request_id` (never cookies or secrets) for each row.

### 1. Signed-out session reports no user

```bash
curl -s "$BASE/api/auth/session"
```

- **Expected:** HTTP 200 with `"user": null`. `providers` reflects what is configured; no
  identity fields are present.
- **Fail if:** any user identity is returned without signing in.

### 2. Google sign-in accepts verified `@arcelintelligence.com` accounts only

In a browser, start sign-in from the app (Settings → Sign in) or `"$BASE/api/auth/login?provider=google"`.

- **Expected (allowed):** a verified `@arcelintelligence.com` Google account completes sign-in
  and `GET $BASE/api/auth/session` then reports a `user` with a `sub`.
- **Expected (denied):** a non-`@arcelintelligence.com` account, or one whose email is not
  verified, is rejected with `domain_restricted` and **no** session is created
  (`/api/auth/session` still reports `"user": null`).
- **Fail if:** any non-workspace or unverified identity obtains a session.

> GitHub sign-in, if configured, is not domain-restricted; only Google carries the
> `@arcelintelligence.com` guard. Do not record which specific account you used.

### 3. Sign-out clears the session

While signed in:

```bash
# From the browser (so the session cookie is sent):
# Settings → Sign out, or POST $BASE/api/auth/logout
```

- **Expected:** after sign-out, `GET $BASE/api/auth/session` reports `"user": null` and a
  subsequent `POST $BASE/api/chat` returns `AUTH_REQUIRED` (step 4).
- **Fail if:** the session survives sign-out.

### 4. Signed-out chat returns `AUTH_REQUIRED` and calls no provider

```bash
curl -s -X POST "$BASE/api/chat" \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"ping"}]}'
```

- **Expected:** HTTP 403 with `"code": "AUTH_REQUIRED"`, `"taxonomy": "auth_required"`,
  `"retryable": false`. No model output is returned.
- **Fail if:** any assistant content is produced, or the request appears to reach OpenRouter.

### 5. Missing OpenRouter key returns `OPENROUTER_NOT_CONFIGURED` and invents nothing

This applies to an environment where `OPENROUTER_API_KEY` is intentionally unset. Sending a
signed-in chat request there must surface a configuration error, not a fabricated answer.

- **Expected:** HTTP 503 with `"code": "OPENROUTER_NOT_CONFIGURED"`,
  `"taxonomy": "provider_unavailable"`. No assistant text.
- **Fail if:** a completion is returned when no key is configured.

> On a fully configured production deploy this state should not occur; verify it on a
> deliberately key-less preview if you need to exercise it. Do not remove the production key
> to test this.

### 6. Signed-in, approved, low-cost prompt streams visible text

While signed in as an approved identity, send a trivial prompt on the lowest-cost tier
(e.g. "Quick") through the app UI.

- **Expected:** streamed assistant text appears incrementally and finishes with a completed
  state. The network response is an SSE stream of ordered `delta` events ending in a single
  `done` event.
- **Fail if:** nothing streams, the text is truncated without a terminal event, or an error
  banner appears for a valid low-cost request.

### 7. An upstream failure stays an error banner, never assistant content

Exercise a provider failure without weakening the gate — for example, request a signed-in
generation while the provider is unreachable or returns a non-2xx (this can be observed
during an upstream incident, or on a preview pointed at an invalid provider endpoint).

- **Expected:** the UI shows a distinct error banner (`OPENROUTER_ERROR`,
  `OPENROUTER_UNREACHABLE`, or `EMPTY_COMPLETION`). The failure is **not** stored or rendered
  as an assistant message, and the copy makes clear no answer was produced.
- **Fail if:** the failure is presented as normal assistant output, or a partial/failed run is
  treated as a successful answer.

## Sign-off

| # | Check | Result | Notes (code / request_id only) |
|---|---|---|---|
| 1 | Signed-out session `user: null` | | |
| 2 | Google domain guard (allow + deny) | | |
| 3 | Sign-out clears session | | |
| 4 | Signed-out chat → `AUTH_REQUIRED` | | |
| 5 | No key → `OPENROUTER_NOT_CONFIGURED` | | |
| 6 | Signed-in low-cost prompt streams text | | |
| 7 | Upstream failure stays an error banner | | |

Release owner: ______________________  Build / commit: ______________________  Date: ____________

If any row fails, do not treat the release as smoke-tested. File an issue with the observed
`code` and `request_id` (never cookies, keys, or personal data) and re-run after the fix.
