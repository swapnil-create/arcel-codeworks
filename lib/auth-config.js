"use strict";

const { applyCookies, getAuthSecret } = require("./session");

const PROVIDERS = Object.freeze({
  github: Object.freeze({
    id: "github",
    label: "GitHub",
    idEnv: "AUTH_GITHUB_ID",
    secretEnv: "AUTH_GITHUB_SECRET"
  }),
  google: Object.freeze({
    id: "google",
    label: "Google",
    idEnv: "AUTH_GOOGLE_ID",
    secretEnv: "AUTH_GOOGLE_SECRET"
  })
});

function envValue(env, name) {
  const value = env?.[name];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function providerCredentials(env = process.env, id) {
  const meta = PROVIDERS[id];
  if (!meta) return null;
  const clientId = envValue(env, meta.idEnv);
  const clientSecret = envValue(env, meta.secretEnv);
  if (!clientId || !clientSecret) return null;
  return { ...meta, clientId, clientSecret };
}

function configuredProviders(env = process.env) {
  return Object.keys(PROVIDERS).map(id => providerCredentials(env, id)).filter(Boolean);
}

function authSecretConfigured(env = process.env) {
  return Boolean(getAuthSecret(env));
}

function authConfigured(env = process.env) {
  return authSecretConfigured(env) && configuredProviders(env).length > 0;
}

function stripOrigin(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function publicOrigin(req, env = process.env) {
  const fromEnv = stripOrigin(env.AUTH_URL);
  if (fromEnv) return fromEnv;
  const vercel = stripOrigin(env.VERCEL_URL).replace(/^https?:\/\//, "");
  if (vercel) return `https://${vercel}`;
  if (env.VERCEL_ENV && env.VERCEL_ENV !== "development") return null;
  const host = String(req?.headers?.host || "").split(",")[0].trim();
  if (!host) return null;
  const proto = String(req?.headers?.["x-forwarded-proto"] || "http").split(",")[0].trim() || "http";
  return `${proto}://${host}`;
}

function callbackUrl(origin) {
  return `${origin}/api/auth/callback`;
}

function queryOf(req) {
  if (req?.query && typeof req.query === "object") return req.query;
  try {
    const url = new URL(req?.url || "/", "http://127.0.0.1");
    return Object.fromEntries(url.searchParams);
  } catch {
    return {};
  }
}

function redirect(res, location, cookies) {
  applyCookies(res, cookies);
  res.setHeader("Location", location);
  if (typeof res.status === "function") {
    res.status(302);
    if (typeof res.end === "function") return res.end();
    return;
  }
  res.statusCode = 302;
  return res.end();
}

function json(res, status, body) {
  if (typeof res.status === "function" && typeof res.json === "function") {
    return res.status(status).json(body);
  }
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

module.exports = {
  PROVIDERS,
  providerCredentials,
  configuredProviders,
  authSecretConfigured,
  authConfigured,
  publicOrigin,
  callbackUrl,
  queryOf,
  redirect,
  json
};
