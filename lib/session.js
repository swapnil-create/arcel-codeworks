"use strict";

const crypto = require("crypto");

const SESSION_COOKIE = "arcel_session";
const STATE_COOKIE = "arcel_oauth_state";
const SESSION_MAX_AGE_SEC = 7 * 24 * 60 * 60;
const STATE_MAX_AGE_SEC = 10 * 60;
const MIN_SECRET_LENGTH = 32;

function getAuthSecret(env = process.env) {
  const secret = typeof env.AUTH_SECRET === "string" ? env.AUTH_SECRET.trim() : "";
  if (secret.length < MIN_SECRET_LENGTH) return null;
  return secret;
}

function b64urlJson(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function hmac(body, secret) {
  return crypto.createHmac("sha256", secret).update(body).digest("base64url");
}

function signPayload(payload, secret) {
  const body = b64urlJson(payload);
  return `${body}.${hmac(body, secret)}`;
}

function verifyToken(token, secret) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const split = token.split(".");
  if (split.length !== 2) return null;
  const [body, mac] = split;
  if (!body || !mac) return null;
  let expected;
  let given;
  try {
    expected = Buffer.from(hmac(body, secret), "utf8");
    given = Buffer.from(mac, "utf8");
  } catch {
    return null;
  }
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;
  const exp = Number(payload.exp);
  if (!Number.isFinite(exp) || exp * 1000 <= Date.now()) return null;
  return payload;
}

function parseCookieHeader(header) {
  const cookies = {};
  if (!header || typeof header !== "string") return cookies;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name) cookies[name] = decodeURIComponent(value);
  }
  return cookies;
}

function cookiesFromRequest(req) {
  if (req && req.cookies && typeof req.cookies === "object" && !Array.isArray(req.cookies)) {
    return { ...req.cookies };
  }
  const header = req?.headers?.cookie || req?.headers?.Cookie || "";
  return parseCookieHeader(header);
}

function getCookie(req, name) {
  const cookies = cookiesFromRequest(req);
  const value = cookies[name];
  return typeof value === "string" && value ? value : null;
}

function serializeCookie(name, value, { maxAge, secure, httpOnly = true, sameSite = "Lax", path = "/" } = {}) {
  const encoded = `${name}=${encodeURIComponent(value)}`;
  const parts = [encoded, `Path=${path}`, `SameSite=${sameSite}`];
  if (maxAge !== undefined) parts.push(`Max-Age=${Math.max(0, Number(maxAge) || 0)}`);
  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function cookieOptions(req, env = process.env, maxAge) {
  return {
    maxAge,
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    secure: cookieSecure(req, env)
  };
}

function cookieSecure(req, env = process.env) {
  if (env.COOKIE_SECURE === "true") return true;
  if (env.COOKIE_SECURE === "false") return false;
  if (env.VERCEL_ENV === "production" || env.VERCEL_ENV === "preview") return true;
  const proto = String(req?.headers?.["x-forwarded-proto"] || "").split(",")[0].trim();
  if (proto === "https") return true;
  return false;
}

function mintSession(user, env = process.env, now = Date.now()) {
  const secret = getAuthSecret(env);
  if (!secret) return null;
  const iat = Math.floor(now / 1000);
  const payload = {
    sub: String(user.sub),
    provider: String(user.provider || "unknown"),
    name: typeof user.name === "string" ? user.name.slice(0, 120) : "",
    email: typeof user.email === "string" ? user.email.slice(0, 254) : "",
    iat,
    exp: iat + SESSION_MAX_AGE_SEC
  };
  if (!payload.sub) return null;
  return signPayload(payload, secret);
}

function readSession(req, env = process.env) {
  const secret = getAuthSecret(env);
  if (!secret) return null;
  const token = getCookie(req, SESSION_COOKIE);
  if (!token) return null;
  const payload = verifyToken(token, secret);
  if (!payload || typeof payload.sub !== "string" || !payload.sub) return null;
  return {
    sub: payload.sub,
    provider: typeof payload.provider === "string" ? payload.provider : "",
    name: typeof payload.name === "string" ? payload.name : "",
    email: typeof payload.email === "string" ? payload.email : "",
    iat: payload.iat,
    exp: payload.exp
  };
}

function mintOAuthState(provider, env = process.env, now = Date.now()) {
  const secret = getAuthSecret(env);
  if (!secret) return null;
  const iat = Math.floor(now / 1000);
  return signPayload({
    n: crypto.randomBytes(16).toString("hex"),
    p: provider,
    iat,
    exp: iat + STATE_MAX_AGE_SEC
  }, secret);
}

function readOAuthState(req, env = process.env) {
  const secret = getAuthSecret(env);
  if (!secret) return null;
  const token = getCookie(req, STATE_COOKIE);
  if (!token) return null;
  const payload = verifyToken(token, secret);
  if (!payload || typeof payload.n !== "string" || typeof payload.p !== "string") return null;
  return payload;
}

function sessionSetCookie(token, req, env = process.env) {
  return serializeCookie(SESSION_COOKIE, token, cookieOptions(req, env, SESSION_MAX_AGE_SEC));
}

function sessionClearCookie(req, env = process.env) {
  return serializeCookie(SESSION_COOKIE, "", cookieOptions(req, env, 0));
}

function stateSetCookie(token, req, env = process.env) {
  return serializeCookie(STATE_COOKIE, token, cookieOptions(req, env, STATE_MAX_AGE_SEC));
}

function stateClearCookie(req, env = process.env) {
  return serializeCookie(STATE_COOKIE, "", cookieOptions(req, env, 0));
}

function applyCookies(res, cookies) {
  const list = [].concat(cookies).filter(Boolean);
  if (!list.length) return;
  res.setHeader("Set-Cookie", list.length === 1 ? list[0] : list);
}

function publicUser(session) {
  if (!session || !session.sub) return null;
  return {
    sub: session.sub,
    provider: session.provider || "",
    name: session.name || "",
    email: session.email || ""
  };
}

module.exports = {
  SESSION_COOKIE,
  STATE_COOKIE,
  SESSION_MAX_AGE_SEC,
  MIN_SECRET_LENGTH,
  getAuthSecret,
  signPayload,
  verifyToken,
  cookiesFromRequest,
  getCookie,
  serializeCookie,
  cookieSecure,
  mintSession,
  readSession,
  mintOAuthState,
  readOAuthState,
  sessionSetCookie,
  sessionClearCookie,
  stateSetCookie,
  stateClearCookie,
  applyCookies,
  publicUser
};
