#!/usr/bin/env node
/**
 * Session cookie + OAuth config fail-closed tests. No real IdP credentials.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const login = require("../api/auth/login.js");
const sessionHandler = require("../api/auth/session.js");
const logout = require("../api/auth/logout.js");
const { mintSession, mintOAuthState, SESSION_COOKIE, STATE_COOKIE } = require("../lib/session");
const { generationGate } = require("../lib/generation-errors");
const { authConfigured } = require("../lib/auth-config");
const { googleIdentityAllowed } = require("../lib/auth-oauth");
const callback = require("../api/auth/callback.js");

const TEST_SECRET = "ci-test-auth-secret-not-for-production-use!!";

const envKeys = [
  "AUTH_SECRET",
  "AUTH_GITHUB_ID",
  "AUTH_GITHUB_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "AUTH_URL",
  "VERCEL_URL",
  "VERCEL_ENV",
  "OPENROUTER_API_KEY",
  "OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO"
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

function mockRes() {
  const captured = { headers: {}, cookies: [] };
  const res = {
    setHeader(name, value) {
      captured.headers[name.toLowerCase()] = value;
      if (name.toLowerCase() === "set-cookie") {
        captured.cookies = [].concat(value);
      }
      return this;
    },
    status(code) {
      captured.status = code;
      return this;
    },
    json(body) {
      captured.body = body;
      captured.status = captured.status || 200;
      return captured;
    },
    end() {
      captured.ended = true;
      return captured;
    }
  };
  return { res, captured };
}

async function invoke(handler, { method = "GET", env = {}, headers = {}, url = "/", query } = {}) {
  const previous = snapshotEnv();
  applyEnv(env);
  const { res, captured } = mockRes();
  const req = {
    method,
    headers,
    url,
    query
  };
  try {
    await handler(req, res);
    return captured;
  } finally {
    restore(previous);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(!authConfigured({}), "empty env is not configured");
assert(!authConfigured({ AUTH_SECRET: TEST_SECRET }), "secret without OAuth is not configured");
assert(
  authConfigured({
    AUTH_SECRET: TEST_SECRET,
    AUTH_GITHUB_ID: "client-id",
    AUTH_GITHUB_SECRET: "client-secret"
  }),
  "github pair + secret is configured"
);

assert(
  googleIdentityAllowed({ sub: "google-1", email: "person@arcelintelligence.com", email_verified: true }),
  "verified ARCEL Google identity is allowed"
);
assert(
  googleIdentityAllowed({ sub: "google-2", email: "PERSON@ARCELINTELLIGENCE.COM", email_verified: true }),
  "verified ARCEL domain matching is case-insensitive"
);
assert(
  !googleIdentityAllowed({ sub: "google-3", email: "person@arcelintelligence.com.evil", email_verified: true }),
  "lookalike domain is rejected"
);
assert(
  !googleIdentityAllowed({ sub: "google-4", email: "person@arcelintelligence.com", email_verified: false }),
  "unverified Google email is rejected"
);
assert(
  !googleIdentityAllowed({ sub: "google-5", email: "person@gmail.com", email_verified: true }),
  "outside Google Workspace domain is rejected"
);

const previousFetch = globalThis.fetch;
const previousAuthEnv = snapshotEnv();
applyEnv({
  AUTH_SECRET: TEST_SECRET,
  AUTH_URL: "https://arcel-codeworks.example",
  AUTH_GOOGLE_ID: "google-client-id",
  AUTH_GOOGLE_SECRET: "google-client-secret"
});
const state = mintOAuthState("google", process.env);
globalThis.fetch = async (url) => {
  if (String(url).includes("oauth2.googleapis.com/token")) {
    return { ok: true, status: 200, json: async () => ({ access_token: "test-access-token" }) };
  }
  return {
    ok: true,
    status: 200,
    json: async () => ({ sub: "google-6", email: "person@outside.example", email_verified: true })
  };
};
const restrictedCallback = await invoke(callback, {
  env: {
    AUTH_SECRET: TEST_SECRET,
    AUTH_URL: "https://arcel-codeworks.example",
    AUTH_GOOGLE_ID: "google-client-id",
    AUTH_GOOGLE_SECRET: "google-client-secret"
  },
  headers: { cookie: `${STATE_COOKIE}=${state}` },
  url: `/api/auth/callback?code=test-code&state=${encodeURIComponent(state)}`,
  query: { code: "test-code", state }
});
globalThis.fetch = previousFetch;
restore(previousAuthEnv);
assert(
  String(restrictedCallback.headers.location || "").includes("auth_error=domain_restricted"),
  `outside Google Workspace callback must redirect with domain_restricted, got ${restrictedCallback.headers.location}`
);
assert(
  !restrictedCallback.cookies.some(cookie => cookie.startsWith(`${SESSION_COOKIE}=`) && !cookie.includes("Max-Age=0")),
  "domain-restricted callback must not mint a session cookie"
);

const unconfiguredLogin = await invoke(login, {
  env: {},
  headers: { host: "127.0.0.1:4173" },
  url: "/api/auth/login"
});
assert(unconfiguredLogin.status === 302, `unconfigured login expected 302, got ${unconfiguredLogin.status}`);
assert(
  String(unconfiguredLogin.headers.location || "").includes("auth_error=not_configured"),
  `expected not_configured redirect, got ${unconfiguredLogin.headers.location}`
);

const productionNoOrigin = await invoke(login, {
  env: { AUTH_SECRET: TEST_SECRET, AUTH_GITHUB_ID: "id", AUTH_GITHUB_SECRET: "secret", VERCEL_ENV: "production" },
  headers: { host: "evil.example" },
  url: "/api/auth/login?provider=github"
});
assert(productionNoOrigin.status === 503, "production without AUTH_URL/VERCEL_URL must fail closed");
assert(productionNoOrigin.body?.code === "AUTH_NOT_CONFIGURED", JSON.stringify(productionNoOrigin.body));

const githubLogin = await invoke(login, {
  env: {
    AUTH_SECRET: TEST_SECRET,
    AUTH_GITHUB_ID: "test-client-id",
    AUTH_GITHUB_SECRET: "test-client-secret",
    AUTH_URL: "https://arcel-codeworks.example"
  },
  url: "/api/auth/login?provider=github",
  query: { provider: "github" }
});
assert(githubLogin.status === 302, `github login expected 302, got ${githubLogin.status}`);
assert(String(githubLogin.headers.location).startsWith("https://github.com/login/oauth/authorize"), githubLogin.headers.location);
assert(String(githubLogin.headers.location).includes("client_id=test-client-id"), "client id in authorize URL");
assert(!String(githubLogin.headers.location).includes("test-client-secret"), "client secret must not appear in redirect");
assert(githubLogin.cookies.some(cookie => cookie.startsWith("arcel_oauth_state=")), "oauth state cookie");

const anonymousSession = await invoke(sessionHandler, { env: {}, headers: {} });
assert(anonymousSession.body.user === null, "anonymous session has no user");
assert(anonymousSession.body.configured === false, "unconfigured deployment");
assert(Array.isArray(anonymousSession.body.providers) && anonymousSession.body.providers.length === 0, "no providers");

const previous = snapshotEnv();
applyEnv({ AUTH_SECRET: TEST_SECRET });
const token = mintSession({ sub: "github:99", provider: "github", name: "Pat", email: "pat@example.invalid" });
restore(previous);

const signedSession = await invoke(sessionHandler, {
  env: { AUTH_SECRET: TEST_SECRET, AUTH_GITHUB_ID: "id", AUTH_GITHUB_SECRET: "secret" },
  headers: { cookie: `${SESSION_COOKIE}=${token}` }
});
assert(signedSession.body.user?.sub === "github:99", JSON.stringify(signedSession.body));
assert(signedSession.body.configured === true, "configured when secret + github present");
assert(signedSession.body.providers.some(provider => provider.id === "github"), "github listed");

const loggedOut = await invoke(logout, { method: "POST", env: { AUTH_SECRET: TEST_SECRET } });
assert(loggedOut.status === 200, "logout 200");
assert(loggedOut.body.user === null, "logout clears user");
assert(loggedOut.cookies.some(cookie => cookie.includes(`${SESSION_COOKIE}=`) && cookie.includes("Max-Age=0")), "session cookie cleared");

assert(
  generationGate({ OPENROUTER_API_KEY: "local-preview-not-a-secret" }, null)?.code === "AUTH_REQUIRED",
  "no session => AUTH_REQUIRED"
);
assert(
  generationGate(
    { OPENROUTER_API_KEY: "local-preview-not-a-secret", OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO: "true" },
    null
  )?.code === "AUTH_REQUIRED",
  "demo flag is not a session"
);
assert(
  generationGate({ OPENROUTER_API_KEY: "local-preview-not-a-secret" }, { sub: "github:1" }) === null,
  "valid principal may pass generationGate"
);
assert(
  generationGate({ OPENROUTER_API_KEY: "local-preview-not-a-secret" }, { sub: "   " })?.code === "AUTH_REQUIRED",
  "blank sub is not a principal"
);

console.log("auth session + OAuth fail-closed checks ok");
