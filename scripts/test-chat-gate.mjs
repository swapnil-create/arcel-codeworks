#!/usr/bin/env node
/**
 * Exercises /api/chat generationGate without OpenRouter and without inventing real keys.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const handler = require("../api/chat.js");

function call(env) {
  const previous = {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO: process.env.OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO
  };
  if (env.OPENROUTER_API_KEY) process.env.OPENROUTER_API_KEY = env.OPENROUTER_API_KEY;
  else delete process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO = env.OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO || "false";

  return new Promise((resolve, reject) => {
    const captured = {};
    const req = { method: "POST", body: { messages: [{ role: "user", content: "ping" }] } };
    const res = {
      setHeader() { return this; },
      status(code) { captured.status = code; return this; },
      json(body) {
        captured.body = body;
        restore(previous);
        resolve(captured);
      }
    };
    Promise.resolve(handler(req, res)).catch(error => {
      restore(previous);
      reject(error);
    });
  });
}

function restore(previous) {
  if (previous.OPENROUTER_API_KEY === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = previous.OPENROUTER_API_KEY;
  if (previous.OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO === undefined) delete process.env.OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO;
  else process.env.OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO = previous.OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const missing = await call({});
assert(missing.status === 503, `expected 503, got ${missing.status}`);
assert(missing.body.code === "OPENROUTER_NOT_CONFIGURED", JSON.stringify(missing.body));
assert(missing.body.taxonomy === "provider_unavailable", "missing taxonomy");
assert(missing.body.retryable === false, "not-configured should not be retryable as auth bypass");
assert(/^req_/.test(missing.body.request_id), "missing request_id");

const auth = await call({
  OPENROUTER_API_KEY: "local-preview-not-a-secret",
  OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO: "false"
});
assert(auth.status === 403, `expected 403, got ${auth.status}`);
assert(auth.body.code === "AUTH_REQUIRED", JSON.stringify(auth.body));
assert(auth.body.taxonomy === "auth_required", "AUTH_REQUIRED taxonomy");
assert(auth.body.retryable === false, "AUTH_REQUIRED is not retryable");
assert(auth.body.error.includes("authenticated"), auth.body.error);

const blocked = await call({
  OPENROUTER_API_KEY: "local-preview-not-a-secret",
  OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO: "TRUE"
});
assert(blocked.body.code === "AUTH_REQUIRED", "demo flag must be exact lowercase true — case variants stay gated");

console.log("api/chat generation gate: structured AUTH_REQUIRED / NOT_CONFIGURED ok");
