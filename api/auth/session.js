"use strict";

const { authConfigured, configuredProviders, json } = require("../../lib/auth-config");
const { publicUser, readSession } = require("../../lib/session");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Method not allowed", code: "INVALID_INPUT" });
  }

  const session = readSession(req, process.env);
  const providers = configuredProviders(process.env).map(provider => ({
    id: provider.id,
    label: provider.label
  }));

  return json(res, 200, {
    configured: authConfigured(process.env),
    providers,
    user: publicUser(session)
  });
};
