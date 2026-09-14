"use strict";

const { authConfigured, callbackUrl, providerCredentials, publicOrigin, queryOf, redirect } = require("../../lib/auth-config");
const {
  mintSession,
  readOAuthState,
  sessionSetCookie,
  stateClearCookie,
  verifyToken,
  getAuthSecret
} = require("../../lib/session");
const { exchangeCode } = require("../../lib/auth-oauth");

function home(origin, error) {
  const base = origin || "";
  return error ? `${base}/?auth_error=${encodeURIComponent(error)}` : `${base}/`;
}

module.exports = async function handler(req, res) {
  const origin = publicOrigin(req, process.env);
  const clearState = origin ? stateClearCookie(req, process.env) : null;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed", code: "INVALID_INPUT" });
  }

  if (!authConfigured(process.env) || !origin) {
    if (origin) return redirect(res, home(origin, "not_configured"), clearState);
    return res.status(503).json({
      error: "Sign-in is not configured.",
      code: "AUTH_NOT_CONFIGURED"
    });
  }

  const query = queryOf(req);
  if (query.error) {
    return redirect(res, home(origin, "provider_error"), clearState);
  }

  const code = typeof query.code === "string" ? query.code : "";
  const stateParam = typeof query.state === "string" ? query.state : "";
  if (!code || !stateParam) {
    return redirect(res, home(origin, "callback_failed"), clearState);
  }

  const cookieState = readOAuthState(req, process.env);
  const secret = getAuthSecret(process.env);
  const paramState = secret ? verifyToken(stateParam, secret) : null;
  if (!cookieState || !paramState || cookieState.n !== paramState.n || cookieState.p !== paramState.p) {
    return redirect(res, home(origin, "state_mismatch"), clearState);
  }

  const provider = providerCredentials(process.env, cookieState.p);
  if (!provider) {
    return redirect(res, home(origin, "unsupported_provider"), clearState);
  }

  try {
    const user = await exchangeCode(provider, origin, code);
    const token = mintSession(user, process.env);
    if (!user?.sub || !token) {
      return redirect(res, home(origin, "callback_failed"), clearState);
    }
    return redirect(res, home(origin), [
      sessionSetCookie(token, req, process.env),
      stateClearCookie(req, process.env)
    ]);
  } catch (error) {
    const code = error?.message === "google_domain_restricted" ? "domain_restricted" : "callback_failed";
    return redirect(res, home(origin, code), clearState);
  }
};

module.exports.callbackUrl = callbackUrl;
