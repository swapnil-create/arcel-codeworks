#!/usr/bin/env node
/**
 * Exercises /api/chat generationGate without OpenRouter and without inventing real keys.
 * Unauthenticated requests must not reach fetch() even when a placeholder key and the
 * demo flag are present.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const handler = require("../api/chat.js");
const { mintSession, signPayload, SESSION_COOKIE, getAuthSecret } = require("../lib/session");

const TEST_SECRET = "ci-test-auth-secret-not-for-production-use!!";
const PLACEHOLDER_KEY = "local-preview-not-a-secret";

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

function assertNoSpend(result, label) {
  assert(result.fetchCalls.length === 0, `${label}: OpenRouter fetch must not run (${result.fetchCalls.length})`);
}

const missing = await call({ env: {} });
assert(missing.status === 503, `expected 503, got ${missing.status}`);
assert(missing.body.code === "OPENROUTER_NOT_CONFIGURED", JSON.stringify(missing.body));
assert(missing.body.taxonomy === "provider_unavailable", "missing taxonomy");
assert(missing.body.retryable === false, "not-configured should not be retryable as auth bypass");
assert(/^req_/.test(missing.body.request_id), "missing request_id");
assertNoSpend(missing, "missing key");

const noHeaders = await call({
  env: { OPENROUTER_API_KEY: PLACEHOLDER_KEY },
  headers: {}
});
assert(noHeaders.status === 403, `omit headers expected 403, got ${noHeaders.status}`);
assert(noHeaders.body.code === "AUTH_REQUIRED", JSON.stringify(noHeaders.body));
assert(noHeaders.body.taxonomy === "auth_required", "AUTH_REQUIRED taxonomy");
assert(noHeaders.body.retryable === false, "AUTH_REQUIRED is not retryable");
assertNoSpend(noHeaders, "omit headers");

const demoFlag = await call({
  env: {
    OPENROUTER_API_KEY: PLACEHOLDER_KEY,
    OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO: "true"
  },
  headers: {}
});
assert(demoFlag.body.code === "AUTH_REQUIRED", "demo flag must not authorize spend");
assertNoSpend(demoFlag, "demo flag");

const bearer = await call({
  env: { OPENROUTER_API_KEY: PLACEHOLDER_KEY, AUTH_SECRET: TEST_SECRET },
  headers: { authorization: "Bearer admin", Authorization: "Bearer admin" }
});
assert(bearer.body.code === "AUTH_REQUIRED", "Authorization header must not bypass session");
assertNoSpend(bearer, "bearer");

const asserted = await call({
  env: { OPENROUTER_API_KEY: PLACEHOLDER_KEY, AUTH_SECRET: TEST_SECRET },
  headers: {},
  body: {
    messages: [{ role: "user", content: "ping" }],
    user: "admin",
    display_name: "Swapnil",
    sub: "github:1"
  }
});
assert(asserted.body.code === "AUTH_REQUIRED", "client-asserted identity must not authorize");
assertNoSpend(asserted, "client-asserted identity");

const previous = snapshotEnv();
applyEnv({ AUTH_SECRET: TEST_SECRET, OPENROUTER_API_KEY: PLACEHOLDER_KEY });
const validToken = mintSession({
  sub: "github:1",
  provider: "github",
  name: "CI User",
  email: "ci@example.invalid"
});
restore(previous);
assert(validToken, "mintSession should succeed with AUTH_SECRET");

const valid = await call({
  env: { OPENROUTER_API_KEY: PLACEHOLDER_KEY, AUTH_SECRET: TEST_SECRET },
  headers: { cookie: `${SESSION_COOKIE}=${validToken}` }
});
assert(valid.status === 200, `valid session expected 200, got ${valid.status} ${JSON.stringify(valid.body)}`);
assert(valid.body.content === "ci-mock-completion", JSON.stringify(valid.body));
assert(valid.fetchCalls.length === 1, "valid session may call provider mock");
assert(valid.fetchCalls[0].url.includes("openrouter.ai"), valid.fetchCalls[0].url);

const tampered = await call({
  env: { OPENROUTER_API_KEY: PLACEHOLDER_KEY, AUTH_SECRET: TEST_SECRET },
  headers: { cookie: `${SESSION_COOKIE}=${validToken.slice(0, -2)}aa` }
});
assert(tampered.body.code === "AUTH_REQUIRED", "tampered cookie must fail closed");
assertNoSpend(tampered, "tampered cookie");

applyEnv({ AUTH_SECRET: TEST_SECRET });
const expired = signPayload({
  sub: "github:1",
  provider: "github",
  name: "CI User",
  email: "ci@example.invalid",
  iat: 1,
  exp: 2
}, getAuthSecret(process.env) || TEST_SECRET);
restore(previous);

const expiredResult = await call({
  env: { OPENROUTER_API_KEY: PLACEHOLDER_KEY, AUTH_SECRET: TEST_SECRET },
  headers: { cookie: `${SESSION_COOKIE}=${expired}` }
});
assert(expiredResult.body.code === "AUTH_REQUIRED", "expired session must fail closed");
assertNoSpend(expiredResult, "expired session");

const otherSecret = await call({
  env: {
    OPENROUTER_API_KEY: PLACEHOLDER_KEY,
    AUTH_SECRET: "a-different-ci-auth-secret-value-32ch"
  },
  headers: { cookie: `${SESSION_COOKIE}=${validToken}` }
});
assert(otherSecret.body.code === "AUTH_REQUIRED", "cookie signed with another secret must fail");
assertNoSpend(otherSecret, "wrong secret");

console.log("api/chat session gate: unauthenticated spend blocked; signed cookie required");
