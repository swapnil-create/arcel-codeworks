"use strict";

const { callbackUrl } = require("./auth-config");

function authorizeUrl(provider, origin, state) {
  const redirectUri = encodeURIComponent(callbackUrl(origin));
  const encodedState = encodeURIComponent(state);
  if (provider.id === "github") {
    const scope = encodeURIComponent("read:user user:email");
    return `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(provider.clientId)}&redirect_uri=${redirectUri}&state=${encodedState}&scope=${scope}`;
  }
  if (provider.id === "google") {
    const scope = encodeURIComponent("openid email profile");
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(provider.clientId)}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${encodedState}&access_type=online&prompt=select_account`;
  }
  return null;
}

async function exchangeCode(provider, origin, code) {
  if (provider.id === "github") return exchangeGitHub(provider, origin, code);
  if (provider.id === "google") return exchangeGoogle(provider, origin, code);
  return null;
}

async function exchangeGitHub(provider, origin, code) {
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      code,
      redirect_uri: callbackUrl(origin)
    })
  });
  const tokenPayload = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    throw new Error("github_token");
  }
  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${tokenPayload.access_token}`,
      "User-Agent": "ARCEL-Codeworks",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });
  const user = await userResponse.json().catch(() => ({}));
  if (!userResponse.ok || !user.id) throw new Error("github_user");
  let email = typeof user.email === "string" ? user.email : "";
  if (!email) {
    const emailsResponse = await fetch("https://api.github.com/user/emails", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${tokenPayload.access_token}`,
        "User-Agent": "ARCEL-Codeworks",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
    const emails = await emailsResponse.json().catch(() => []);
    if (Array.isArray(emails)) {
      const primary = emails.find(item => item && item.primary && item.email) || emails.find(item => item && item.email);
      email = primary?.email || "";
    }
  }
  return {
    sub: `github:${user.id}`,
    provider: "github",
    name: user.name || user.login || "",
    email
  };
}

async function exchangeGoogle(provider, origin, code) {
  const body = new URLSearchParams({
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: callbackUrl(origin)
  });
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const tokenPayload = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenPayload.access_token) throw new Error("google_token");
  const userResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenPayload.access_token}` }
  });
  const user = await userResponse.json().catch(() => ({}));
  if (!userResponse.ok || !user.sub) throw new Error("google_user");
  return {
    sub: `google:${user.sub}`,
    provider: "google",
    name: user.name || "",
    email: user.email || ""
  };
}

module.exports = { authorizeUrl, exchangeCode };
