"use strict";

const { json, publicOrigin, redirect } = require("../../lib/auth-config");
const { applyCookies, sessionClearCookie, stateClearCookie } = require("../../lib/session");

module.exports = async function handler(req, res) {
  const cookies = [
    sessionClearCookie(req, process.env),
    stateClearCookie(req, process.env)
  ];

  if (req.method === "GET") {
    const origin = publicOrigin(req, process.env) || "";
    return redirect(res, `${origin}/`, cookies);
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return json(res, 405, { error: "Method not allowed", code: "INVALID_INPUT" });
  }

  applyCookies(res, cookies);
  return json(res, 200, { ok: true, user: null });
};
