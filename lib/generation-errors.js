"use strict";

/**
 * Shared generation-error catalog for the prototype client and /api/chat.
 * Maps API codes onto PRD §19 taxonomy and D03 Flow G banner states.
 * Errors must never be stored as ordinary assistant messages.
 */

const GATE_CTAS = Object.freeze([
  Object.freeze({ action: "open-settings", label: "Open settings" }),
  Object.freeze({ action: "view-existing-work", label: "View existing work" })
]);

const CATALOG = Object.freeze({
  AUTH_REQUIRED: Object.freeze({
    code: "AUTH_REQUIRED",
    httpStatus: 403,
    taxonomy: "auth_required",
    title: "Sign-in required",
    detail: "Generation is disabled until authenticated access is configured. This is not an assistant reply.",
    state: "permission-denied",
    retryable: false,
    ctas: GATE_CTAS
  }),
  OPENROUTER_NOT_CONFIGURED: Object.freeze({
    code: "OPENROUTER_NOT_CONFIGURED",
    httpStatus: 503,
    taxonomy: "provider_unavailable",
    title: "API not configured",
    detail: "OpenRouter is not configured on this deployment. No model ran.",
    state: "failed",
    retryable: false,
    ctas: GATE_CTAS
  }),
  QUOTA_EXHAUSTED: Object.freeze({
    code: "QUOTA_EXHAUSTED",
    httpStatus: 429,
    taxonomy: "quota_exceeded",
    title: "Quota exhausted",
    detail: "Generation is paused until allowance renews. Existing work stays viewable. There is no automatic overage. This catalog entry is reserved — the prototype does not meter or bill.",
    state: "quota-exhausted",
    retryable: false,
    ctas: GATE_CTAS
  }),
  OPENROUTER_ERROR: Object.freeze({
    code: "OPENROUTER_ERROR",
    httpStatus: 502,
    taxonomy: "provider_unavailable",
    title: "Provider error",
    detail: "OpenRouter could not complete this request.",
    state: "failed",
    retryable: true,
    ctas: GATE_CTAS
  }),
  OPENROUTER_UNREACHABLE: Object.freeze({
    code: "OPENROUTER_UNREACHABLE",
    httpStatus: 502,
    taxonomy: "provider_unavailable",
    title: "Provider unreachable",
    detail: "Unable to reach OpenRouter.",
    state: "failed",
    retryable: true,
    ctas: GATE_CTAS
  }),
  EMPTY_COMPLETION: Object.freeze({
    code: "EMPTY_COMPLETION",
    httpStatus: 502,
    taxonomy: "provider_unavailable",
    title: "Empty completion",
    detail: "The selected model returned no content.",
    state: "failed",
    retryable: true,
    ctas: GATE_CTAS
  }),
  CONTEXT_LIMIT: Object.freeze({
    code: "CONTEXT_LIMIT",
    httpStatus: 413,
    taxonomy: "context_limit",
    title: "Context limit",
    detail: "This conversation exceeds the current context limit. Compaction is not available yet.",
    state: "failed",
    retryable: false,
    ctas: GATE_CTAS
  }),
  UNSUPPORTED_CAPABILITY: Object.freeze({
    code: "UNSUPPORTED_CAPABILITY",
    httpStatus: 400,
    taxonomy: "unsupported_capability",
    title: "Unavailable capability",
    detail: "This model is not available in the current catalog.",
    state: "failed",
    retryable: false,
    ctas: GATE_CTAS
  }),
  INVALID_INPUT: Object.freeze({
    code: "INVALID_INPUT",
    httpStatus: 400,
    taxonomy: "invalid_input",
    title: "Invalid input",
    detail: "The request could not be accepted.",
    state: "failed",
    retryable: false,
    ctas: GATE_CTAS
  }),
  API_UNAVAILABLE: Object.freeze({
    code: "API_UNAVAILABLE",
    httpStatus: 404,
    taxonomy: "provider_unavailable",
    title: "Chat API unavailable",
    detail: "The chat API is not available on this host. Static file servers do not run /api/chat.",
    state: "failed",
    retryable: false,
    ctas: GATE_CTAS
  }),
  NETWORK: Object.freeze({
    code: "NETWORK",
    httpStatus: 0,
    taxonomy: "provider_unavailable",
    title: "Network error",
    detail: "The browser could not reach the chat API. Nothing was stored as an assistant message.",
    state: "failed",
    retryable: true,
    ctas: GATE_CTAS
  }),
  UNKNOWN: Object.freeze({
    code: "UNKNOWN",
    httpStatus: 500,
    taxonomy: "provider_unavailable",
    title: "Request failed",
    detail: "The model could not complete this request.",
    state: "failed",
    retryable: true,
    ctas: GATE_CTAS
  })
});

function withMeta(entry, overrides) {
  return {
    code: overrides.code || entry.code,
    title: entry.title,
    message: overrides.message || entry.detail,
    detail: entry.detail,
    state: entry.state,
    taxonomy: entry.taxonomy,
    retryable: entry.retryable,
    request_id: overrides.request_id || null,
    httpStatus: overrides.status || entry.httpStatus,
    ctas: entry.ctas || GATE_CTAS
  };
}

function classifyGenerationFailure(input = {}) {
  const status = Number(input.status) || 0;
  const code = typeof input.code === "string" ? input.code : "";
  const request_id = input.request_id || null;
  const message = typeof input.error === "string" && input.error ? input.error : "";

  if (code && CATALOG[code]) {
    return withMeta(CATALOG[code], { code, message: message || CATALOG[code].detail, request_id, status: CATALOG[code].httpStatus });
  }

  if (input.offline || code === "NETWORK") {
    return withMeta(CATALOG.NETWORK, { code: "NETWORK", message: message || CATALOG.NETWORK.detail, request_id });
  }

  if (status === 404 || status === 405) {
    return withMeta(CATALOG.API_UNAVAILABLE, {
      code: "API_UNAVAILABLE",
      message: message || CATALOG.API_UNAVAILABLE.detail,
      request_id,
      status
    });
  }

  if (status === 403) {
    return withMeta(CATALOG.AUTH_REQUIRED, {
      code: "AUTH_REQUIRED",
      message: message || CATALOG.AUTH_REQUIRED.detail,
      request_id,
      status
    });
  }

  if (status === 503) {
    return withMeta(CATALOG.OPENROUTER_NOT_CONFIGURED, {
      code: "OPENROUTER_NOT_CONFIGURED",
      message: message || CATALOG.OPENROUTER_NOT_CONFIGURED.detail,
      request_id,
      status
    });
  }

  return withMeta(CATALOG.UNKNOWN, {
    code: code || "UNKNOWN",
    message: message || CATALOG.UNKNOWN.detail,
    request_id,
    status
  });
}

function generationGate(env = process.env) {
  if (!env || !env.OPENROUTER_API_KEY) {
    return {
      status: CATALOG.OPENROUTER_NOT_CONFIGURED.httpStatus,
      code: "OPENROUTER_NOT_CONFIGURED",
      error: "OpenRouter is not configured."
    };
  }
  if (env.OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO !== "true") {
    return {
      status: CATALOG.AUTH_REQUIRED.httpStatus,
      code: "AUTH_REQUIRED",
      error: "Generation is disabled until authenticated access is configured. Unauthenticated demo spend must stay off on shared deployments."
    };
  }
  return null;
}

function attachErrorMeta(body = {}, status) {
  const classified = classifyGenerationFailure({
    status,
    code: body.code,
    error: body.error,
    request_id: body.request_id
  });
  return {
    error: body.error || classified.message,
    code: classified.code,
    taxonomy: classified.taxonomy,
    retryable: classified.retryable,
    request_id: body.request_id || null
  };
}

const api = { CATALOG, GATE_CTAS, classifyGenerationFailure, generationGate, attachErrorMeta };

if (typeof module === "object" && module.exports) {
  module.exports = api;
}
if (typeof globalThis !== "undefined") {
  globalThis.ArcelGenerationErrors = api;
}
