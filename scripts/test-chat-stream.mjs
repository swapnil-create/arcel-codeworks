#!/usr/bin/env node
/**
 * Contract test for the live /api/chat transport. It uses a signed test
 * session and mocked OpenRouter SSE only; no provider key or network call.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const handler = require("../api/chat.js");
const { mintSession, SESSION_COOKIE } = require("../lib/session");

const SECRET = "ci-stream-auth-secret-not-for-production-use!!";
const previous = {};
for (const key of ["AUTH_SECRET", "OPENROUTER_API_KEY"]) previous[key] = process.env[key];
process.env.AUTH_SECRET = SECRET;
process.env.OPENROUTER_API_KEY = "local-preview-not-a-secret";

const token = mintSession({ sub: "google:ci", provider: "google", name: "CI", email: "ci@arcelintelligence.com" });
const originalFetch = globalThis.fetch;
let providerRequest;
globalThis.fetch = async (_url, init) => {
  providerRequest = JSON.parse(init.body);
  const encoder = new TextEncoder();
  const chunks = [
    'data: {"choices":[{"delta":{"content":"Live "}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"output"}}]}\n\n',
    'data: {"usage":{"total_tokens":3}}\n\n',
    'data: [DONE]\n\n'
  ];
  return new Response(new ReadableStream({ start(controller) { chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk))); controller.close(); } }), {
    status: 200,
    headers: { "Content-Type": "text/event-stream" }
  });
};

const result = { headers: {}, body: "", ended: false };
const req = {
  method: "POST",
  headers: { cookie: `${SESSION_COOKIE}=${token}` },
  body: { stream: true, messages: [{ role: "user", content: "ping" }] }
};
const res = {
  setHeader(key, value) { result.headers[key.toLowerCase()] = value; return this; },
  write(value) { result.body += value; },
  end() { result.ended = true; },
  status(code) { result.status = code; return this; },
  json(value) { result.json = value; }
};

try {
  await handler(req, res);
  if (!result.ended || !result.headers["content-type"]?.includes("text/event-stream")) throw new Error("Expected SSE response");
  if (!result.body.includes('"delta":"Live "') || !result.body.includes('"delta":"output"')) throw new Error("Expected ordered provider deltas");
  if (!result.body.includes('"type":"done"')) throw new Error("Expected terminal done event");
  if (providerRequest.stream !== true || providerRequest.stream_options?.include_usage !== true) throw new Error("Provider stream contract missing");
  console.log("api/chat stream contract: signed session receives ordered SSE deltas");
} finally {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(previous)) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
}
