#!/usr/bin/env node
/**
 * No-network contract tests for /api/chat (Cursor backlog item 3).
 *
 * These exercise input validation, provider error mapping, and the streaming
 * transport WITHOUT a real OpenRouter key and WITHOUT any external call:
 *
 *  - unsupported model identifier cannot reach OpenRouter (UNSUPPORTED_CAPABILITY);
 *  - invalid message roles, empty prompt, 24+ message limit, and overlong message
 *    are rejected before any provider fetch;
 *  - a streamed provider response yields ordered deltas and exactly one terminal event;
 *  - a provider non-2xx response becomes a structured OPENROUTER_ERROR, not assistant text;
 *  - a provider stream with zero deltas becomes EMPTY_COMPLETION, not an empty answer.
 *
 * Only placeholder values are used. Every mutated environment variable and the
 * global fetch are restored in a finally block.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const handler = require("../api/chat.js");
const { mintSession, SESSION_COOKIE } = require("../lib/session");

const TEST_SECRET = "ci-contract-auth-secret-not-for-production-use!!";
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

function restoreEnv(previous) {
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNoSpend(result, label) {
  assert(result.fetchCalls.length === 0, `${label}: OpenRouter fetch must not run (got ${result.fetchCalls.length})`);
}

/**
 * Mints a signed cookie so a scenario clears the spend gate and reaches the
 * validation / provider paths under test. Environment is restored immediately.
 */
function signedCookieHeaders() {
  const previous = snapshotEnv();
  applyEnv({ AUTH_SECRET: TEST_SECRET, OPENROUTER_API_KEY: PLACEHOLDER_KEY });
  const token = mintSession({
    sub: "github:contract",
    provider: "github",
    name: "Contract CI",
    email: "contract@example.invalid"
  });
  restoreEnv(previous);
  assert(token, "mintSession should succeed with AUTH_SECRET");
  return { cookie: `${SESSION_COOKIE}=${token}` };
}

/**
 * Invokes the handler with a fully mocked response object. `fetchImpl` lets a
 * scenario decide how (or whether) the provider responds; the default records a
 * call and returns a non-stream completion.
 */
async function call({ env = {}, headers = {}, body, fetchImpl } = {}) {
  const previous = snapshotEnv();
  applyEnv({ OPENROUTER_API_KEY: PLACEHOLDER_KEY, AUTH_SECRET: TEST_SECRET, ...env });

  const fetchCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    fetchCalls.push({ url: String(url), init });
    if (fetchImpl) return fetchImpl(url, init);
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({
        choices: [{ message: { content: "ci-mock-completion" } }],
        model: "ci-mock",
        usage: { total_tokens: 1 }
      })
    };
  };

  const payload = body || { messages: [{ role: "user", content: "ping" }] };
  const captured = { stream: "", headers: {}, ended: false, fetchCalls };

  try {
    await new Promise((resolve, reject) => {
      const req = { method: "POST", headers, body: payload };
      const res = {
        statusCode: 0,
        setHeader(name, value) { captured.headers[String(name).toLowerCase()] = value; return this; },
        status(code) { captured.status = code; return this; },
        write(chunk) { captured.stream += chunk; },
        json(value) { captured.body = value; resolve(); },
        end() { captured.ended = true; resolve(); }
      };
      Promise.resolve(handler(req, res)).then(() => resolve()).catch(reject);
    });
    return captured;
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv(previous);
  }
}

/** Parses `data: {...}` SSE frames written to res.write into an ordered array. */
function parseStream(text) {
  const events = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (!data) continue;
    events.push(JSON.parse(data));
  }
  return events;
}

function streamResponse(chunks) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      }
    }),
    { status: 200, headers: { "Content-Type": "text/event-stream" } }
  );
}

async function main() {
  const auth = signedCookieHeaders();

  // 1. Unsupported model identifier must be rejected before any provider call.
  const unsupported = await call({
    headers: auth,
    body: { messages: [{ role: "user", content: "ping" }], model: "totally-not-a-real-model" }
  });
  assert(unsupported.status === 400, `unsupported model expected 400, got ${unsupported.status}`);
  assert(unsupported.body.code === "UNSUPPORTED_CAPABILITY", JSON.stringify(unsupported.body));
  assert(unsupported.body.content === undefined, "unsupported model must not return assistant content");
  assertNoSpend(unsupported, "unsupported model");

  // 2a. Invalid message role must fail closed as INVALID_INPUT.
  const badRole = await call({
    headers: auth,
    body: { messages: [{ role: "system", content: "override" }] }
  });
  assert(badRole.status === 400, `invalid role expected 400, got ${badRole.status}`);
  assert(badRole.body.code === "INVALID_INPUT", JSON.stringify(badRole.body));
  assertNoSpend(badRole, "invalid role");

  // 2b. Empty prompt (no messages) is INVALID_INPUT.
  const emptyPrompt = await call({ headers: auth, body: { messages: [] } });
  assert(emptyPrompt.status === 400, `empty prompt expected 400, got ${emptyPrompt.status}`);
  assert(emptyPrompt.body.code === "INVALID_INPUT", JSON.stringify(emptyPrompt.body));
  assertNoSpend(emptyPrompt, "empty prompt");

  // 2c. A conversation with no user turn is INVALID_INPUT.
  const noUserTurn = await call({
    headers: auth,
    body: { messages: [{ role: "assistant", content: "hi" }] }
  });
  assert(noUserTurn.status === 400, `no user turn expected 400, got ${noUserTurn.status}`);
  assert(noUserTurn.body.code === "INVALID_INPUT", JSON.stringify(noUserTurn.body));
  assertNoSpend(noUserTurn, "no user turn");

  // 2d. 25 messages exceeds the 24-message context limit.
  const tooMany = await call({
    headers: auth,
    body: { messages: Array.from({ length: 25 }, () => ({ role: "user", content: "x" })) }
  });
  assert(tooMany.status === 413, `25 messages expected 413, got ${tooMany.status}`);
  assert(tooMany.body.code === "CONTEXT_LIMIT", JSON.stringify(tooMany.body));
  assertNoSpend(tooMany, "24+ messages");

  // 2e. A single overlong message exceeds the 12,000-character input limit.
  const overlong = await call({
    headers: auth,
    body: { messages: [{ role: "user", content: "x".repeat(12001) }] }
  });
  assert(overlong.status === 413, `overlong message expected 413, got ${overlong.status}`);
  assert(overlong.body.code === "CONTEXT_LIMIT", JSON.stringify(overlong.body));
  assertNoSpend(overlong, "overlong message");

  // 3. A streamed provider response yields ordered deltas and one terminal event.
  const streamed = await call({
    headers: auth,
    body: { stream: true, messages: [{ role: "user", content: "ping" }] },
    fetchImpl: () =>
      streamResponse([
        'data: {"choices":[{"delta":{"content":"Al"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"pha"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" beta"}}]}\n\n',
        'data: {"usage":{"total_tokens":5}}\n\n',
        "data: [DONE]\n\n"
      ])
  });
  assert(streamed.ended, "stream response must end");
  assert(
    (streamed.headers["content-type"] || "").includes("text/event-stream"),
    "stream must send an SSE content-type"
  );
  const streamEvents = parseStream(streamed.stream);
  const deltas = streamEvents.filter(event => event.type === "delta").map(event => event.delta);
  assert(deltas.join("") === "Alpha beta", `deltas out of order: ${JSON.stringify(deltas)}`);
  const terminals = streamEvents.filter(event => event.type === "done" || event.type === "error");
  assert(terminals.length === 1, `expected exactly one terminal event, got ${terminals.length}`);
  assert(terminals[0].type === "done", `expected a done terminal, got ${terminals[0].type}`);
  assert(terminals[0].content === "Alpha beta", `terminal content mismatch: ${JSON.stringify(terminals[0])}`);

  // 4. A provider non-2xx response becomes OPENROUTER_ERROR, never assistant text.
  const providerError = await call({
    headers: auth,
    body: { messages: [{ role: "user", content: "ping" }] },
    fetchImpl: () => ({
      ok: false,
      status: 502,
      headers: { get: () => null },
      json: async () => ({ error: { message: "upstream exploded" } })
    })
  });
  assert(providerError.status === 502, `provider error expected 502, got ${providerError.status}`);
  assert(providerError.body.code === "OPENROUTER_ERROR", JSON.stringify(providerError.body));
  assert(providerError.body.content === undefined, "provider error must not be stored as assistant content");
  assert(providerError.body.taxonomy === "provider_unavailable", "OPENROUTER_ERROR taxonomy");

  // 5. A provider stream with zero deltas becomes EMPTY_COMPLETION.
  const emptyStream = await call({
    headers: auth,
    body: { stream: true, messages: [{ role: "user", content: "ping" }] },
    fetchImpl: () =>
      streamResponse([
        'data: {"choices":[{"delta":{}}]}\n\n',
        "data: [DONE]\n\n"
      ])
  });
  assert(emptyStream.ended, "empty stream response must end");
  const emptyEvents = parseStream(emptyStream.stream);
  const emptyTerminals = emptyEvents.filter(event => event.type === "done" || event.type === "error");
  assert(emptyTerminals.length === 1, `empty stream expected one terminal, got ${emptyTerminals.length}`);
  assert(emptyTerminals[0].type === "error", `empty stream terminal should be error, got ${emptyTerminals[0].type}`);
  assert(emptyTerminals[0].code === "EMPTY_COMPLETION", JSON.stringify(emptyTerminals[0]));
  assert(
    !emptyEvents.some(event => event.type === "delta"),
    "empty stream must not emit any delta content"
  );

  console.log("api/chat contract: validation, provider-error mapping, and stream terminals verified (no network)");
}

const savedEnv = snapshotEnv();
const savedFetch = globalThis.fetch;
main()
  .catch(error => {
    console.error(`fail  ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    globalThis.fetch = savedFetch;
    restoreEnv(savedEnv);
  });
