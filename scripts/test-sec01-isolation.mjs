#!/usr/bin/env node
/**
 * SEC-01 session gate + in-memory object isolation.
 *
 * Chat spend matrix (no OpenRouter, no real keys):
 *   missing session, tampered cookie, expired cookie, wrong secret,
 *   bearer token, client-asserted user, demo flag, extra identity headers.
 *
 * Object ACL matrix (fixture graph, no Postgres):
 *   cross-user personal workspaces, guessed IDs, revoked membership,
 *   team membership vs outsider, client-asserted names ignored.
 *
 * Gaps that still need Postgres are listed in docs/data-model/README.md
 * and asserted below so they cannot silently disappear from the docs.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const handler = require("../api/chat.js");
const {
  mintSession,
  signPayload,
  SESSION_COOKIE,
  getAuthSecret,
  readSession
} = require("../lib/session");
const { authorizeObject, evaluateCase } = require("../lib/object-access");
const { CATALOG } = require("../lib/generation-errors");

const TEST_SECRET = "ci-test-auth-secret-not-for-production-use!!";
const OTHER_SECRET = "a-different-ci-auth-secret-value-32ch";
const PLACEHOLDER_KEY = "local-preview-not-a-secret";
const SLICE = JSON.parse(
  readFileSync(join(ROOT, "docs/data-model/fixtures/sec01-isolation-slice.json"), "utf8")
);

const envKeys = [
  "OPENROUTER_API_KEY",
  "OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO",
  "AUTH_SECRET",
  "AUTH_GITHUB_ID",
  "AUTH_GITHUB_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "AUTH_URL",
  "VERCEL_URL",
  "VERCEL_ENV"
];

function snapshotEnv() {
  const previous = {};
  for (const key of envKeys) previous[key] = process.env[key];
  return previous;
}

function restore(previous) {
  for (const key of envKeys) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
}

function applyEnv(env = {}) {
  for (const key of envKeys) {
    if (env[key] === undefined || env[key] === null) delete process.env[key];
    else process.env[key] = env[key];
  }
}

function mint(user, secret = TEST_SECRET) {
  const previous = snapshotEnv();
  applyEnv({ AUTH_SECRET: secret });
  const token = mintSession(user);
  restore(previous);
  if (!token) throw new Error(`mintSession failed for ${user.sub}`);
  return token;
}

async function call({ env = {}, headers = {}, body } = {}) {
  const previous = snapshotEnv();
  applyEnv(env);
  const fetchCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    fetchCalls.push({ url: String(url), init });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: "ci-mock-completion" } }],
        model: "ci-mock",
        usage: { total_tokens: 1 }
      })
    };
  };

  const payload = body || { messages: [{ role: "user", content: "ping" }] };

  try {
    const captured = {};
    await new Promise((resolve, reject) => {
      const req = { method: "POST", headers, body: payload };
      const res = {
        setHeader() { return this; },
        status(code) { captured.status = code; return this; },
        json(body) {
          captured.body = body;
          resolve();
        },
        end() { resolve(); }
      };
      Promise.resolve(handler(req, res)).catch(reject);
    });
    captured.fetchCalls = fetchCalls;
    return captured;
  } finally {
    globalThis.fetch = originalFetch;
    restore(previous);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertDenied(result, label) {
  assert(result.status === 403, `${label}: expected 403, got ${result.status}`);
  assert(result.body?.code === "AUTH_REQUIRED", `${label}: expected AUTH_REQUIRED, got ${JSON.stringify(result.body)}`);
  assert(result.body?.taxonomy === "auth_required", `${label}: taxonomy`);
  assert(result.body?.retryable === false, `${label}: must not be retryable`);
  assert(result.fetchCalls.length === 0, `${label}: OpenRouter fetch must not run`);
}

const alice = { sub: "github:101", provider: "github", name: "Alice", email: "alice@example.invalid" };
const bob = { sub: "github:202", provider: "github", name: "Bob", email: "bob@example.invalid" };
const aliceToken = mint(alice);
const bobToken = mint(bob);

const keyEnv = { OPENROUTER_API_KEY: PLACEHOLDER_KEY, AUTH_SECRET: TEST_SECRET };

const denyMatrix = [
  {
    name: "missing session (omit headers/cookies)",
    env: { OPENROUTER_API_KEY: PLACEHOLDER_KEY },
    headers: {}
  },
  {
    name: "demo flag is not a bypass",
    env: {
      OPENROUTER_API_KEY: PLACEHOLDER_KEY,
      OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO: "true"
    },
    headers: {}
  },
  {
    name: "bearer token rejected",
    env: keyEnv,
    headers: { authorization: "Bearer admin", Authorization: "Bearer github:101" }
  },
  {
    name: "client-asserted user rejected",
    env: keyEnv,
    headers: {},
    body: {
      messages: [{ role: "user", content: "ping" }],
      user: "admin",
      display_name: "Alice",
      sub: "github:101",
      actor_user_id: "user_alice",
      workspace_id: "ws_alice",
      conversation_id: "conv_alice"
    }
  },
  {
    name: "x-user-id / x-forwarded-user headers rejected",
    env: keyEnv,
    headers: { "x-user-id": "user_alice", "x-forwarded-user": "alice" }
  },
  {
    name: "tampered cookie",
    env: keyEnv,
    headers: { cookie: `${SESSION_COOKIE}=${aliceToken.slice(0, -2)}aa` }
  },
  {
    name: "wrong secret",
    env: { OPENROUTER_API_KEY: PLACEHOLDER_KEY, AUTH_SECRET: OTHER_SECRET },
    headers: { cookie: `${SESSION_COOKIE}=${aliceToken}` }
  },
  {
    name: "malformed cookie",
    env: keyEnv,
    headers: { cookie: `${SESSION_COOKIE}=not-a-signed-token` }
  },
  {
    name: "empty session cookie",
    env: keyEnv,
    headers: { cookie: `${SESSION_COOKIE}=` }
  },
  {
    name: "wrong cookie name",
    env: keyEnv,
    headers: { cookie: `session=${aliceToken}` }
  },
  {
    name: "AUTH_SECRET missing (cookie present)",
    env: { OPENROUTER_API_KEY: PLACEHOLDER_KEY },
    headers: { cookie: `${SESSION_COOKIE}=${aliceToken}` }
  },
  {
    name: "AUTH_SECRET too short",
    env: { OPENROUTER_API_KEY: PLACEHOLDER_KEY, AUTH_SECRET: "too-short" },
    headers: { cookie: `${SESSION_COOKIE}=${aliceToken}` }
  }
];

for (const row of denyMatrix) {
  assertDenied(await call(row), row.name);
}

const previous = snapshotEnv();
applyEnv({ AUTH_SECRET: TEST_SECRET });
const expired = signPayload({
  sub: alice.sub,
  provider: alice.provider,
  name: alice.name,
  email: alice.email,
  iat: 1,
  exp: 2
}, getAuthSecret(process.env) || TEST_SECRET);
restore(previous);

assertDenied(
  await call({
    env: keyEnv,
    headers: { cookie: `${SESSION_COOKIE}=${expired}` }
  }),
  "expired cookie"
);

const aliceOk = await call({
  env: keyEnv,
  headers: { cookie: `${SESSION_COOKIE}=${aliceToken}` }
});
assert(aliceOk.status === 200, `alice session expected 200, got ${aliceOk.status}`);
assert(aliceOk.fetchCalls.length === 1, "alice session may call provider mock");

const mixed = await call({
  env: keyEnv,
  headers: { cookie: `${SESSION_COOKIE}=${aliceToken}` },
  body: {
    messages: [{ role: "user", content: "ping" }],
    user: "user_bob",
    display_name: "Bob",
    sub: bob.sub,
    conversation_id: "conv_bob"
  }
});
assert(mixed.status === 200, "alice cookie + bob body must use cookie principal, not body");
assert(mixed.fetchCalls.length === 1, "signed alice session may spend");
assert(
  readSession({ headers: { cookie: `${SESSION_COOKIE}=${aliceToken}` } }, { AUTH_SECRET: TEST_SECRET }).sub === alice.sub,
  "readSession must return alice, not client-asserted bob"
);
assert(
  readSession({ headers: { cookie: `${SESSION_COOKIE}=${bobToken}` } }, { AUTH_SECRET: TEST_SECRET }).sub === bob.sub,
  "bob cookie is a distinct principal"
);
assert(aliceToken !== bobToken, "alice and bob cookies must not be identical");

const bobReq = { headers: { cookie: `${SESSION_COOKIE}=${bobToken}` } };
assert(
  readSession(bobReq, { AUTH_SECRET: TEST_SECRET }).sub !== alice.sub,
  "bob cookie must not authenticate as alice"
);

assert(CATALOG.PERMISSION_DENIED.taxonomy === "permission_denied", "PERMISSION_DENIED catalog");
assert(CATALOG.PERMISSION_DENIED.state === "permission-denied", "PERMISSION_DENIED banner state");

for (const testCase of SLICE.cases) {
  assert(evaluateCase(SLICE, testCase), `fixture case failed: ${testCase.name}`);
}

const claimedSteal = authorizeObject({
  slice: SLICE,
  session: { sub: bob.sub },
  type: "conversation",
  id: "conv_alice",
  claimed: { display_name: "Alice", user: "admin", Authorization: "Bearer alice" }
});
assert(claimedSteal.ok === false && claimedSteal.code === "PERMISSION_DENIED", "claimed identity ignored");

const noSessionObject = authorizeObject({
  slice: SLICE,
  session: null,
  type: "conversation",
  id: "conv_alice"
});
assert(noSessionObject.code === "AUTH_REQUIRED", "objects require a session");

const requiredCases = [
  "owner can read own conversation",
  "peer cannot read other personal conversation",
  "guessed conversation id fails closed",
  "revoked membership cannot read former workspace",
  "missing session cannot read objects",
  "client-asserted display name cannot steal a conversation",
  "team member can read shared workspace conversation",
  "outsider cannot read team conversation"
];
const names = new Set(SLICE.cases.map(row => row.name));
for (const name of requiredCases) {
  assert(names.has(name), `isolation fixture missing case: ${name}`);
}

const dataModelReadme = readFileSync(join(ROOT, "docs/data-model/README.md"), "utf8");
const readmeLower = dataModelReadme.toLowerCase();
const postgresGaps = [
  "postgres",
  "row-level security",
  "revoked membership",
  "guessed id",
  "session.sub"
];
for (const needle of postgresGaps) {
  assert(readmeLower.includes(needle), `data-model README must document Postgres gap: ${needle}`);
}

const authDoc = readFileSync(join(ROOT, "docs/AUTH.md"), "utf8");
assert(authDoc.includes("Vercel owner checklist"), "AUTH.md must include the Vercel owner checklist");
assert(authDoc.includes("AUTH_SECRET"), "AUTH.md must document AUTH_SECRET");
assert(!/AUTH_SECRET=\S+/.test(authDoc), "AUTH.md must not include secret values");

console.log("sec-01 isolation: session gate matrix + in-memory ACL fixtures ok (no live DB)");
