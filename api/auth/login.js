"use strict";

const { authConfigured, configuredProviders, providerCredentials, publicOrigin, queryOf, redirect } = require("../../lib/auth-config");
const { mintOAuthState, stateSetCookie } = require("../../lib/session");
const { authorizeUrl } = require("../../lib/auth-oauth");

function homeError(origin, code) {
  return `${origin || ""}/?auth_error=${encodeURIComponent(code)}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed", code: "INVALID_INPUT" });
  }

  const origin = publicOrigin(req, process.env);
  const query = queryOf(req);
  const providers = configuredProviders(process.env);
  const requested = typeof query.provider === "string" ? query.provider.trim().toLowerCase() : "";
  const selected = requested
    ? providerCredentials(process.env, requested)
    : providers[0] || null;

  if (!authConfigured(process.env) || !origin) {
    if (origin) return redirect(res, homeError(origin, "not_configured"));
    return res.status(503).json({
      error: "Sign-in is not configured. Set AUTH_SECRET, AUTH_URL, and an OAuth provider.",
      code: "AUTH_NOT_CONFIGURED"
    });
  }

  if (requested && !selected) {
    return redirect(res, homeError(origin, "unsupported_provider"));
  }

  const stateToken = mintOAuthState(selected.id, process.env);
  if (!stateToken) {
    return redirect(res, homeError(origin, "not_configured"));
  }

  const location = authorizeUrl(selected, origin, stateToken);
  if (!location) {
    return redirect(res, homeError(origin, "unsupported_provider"));
  }

  return redirect(res, location, stateSetCookie(stateToken, req, process.env));
};
