#!/usr/bin/env node
/**
 * Local static + /api/chat preview for honesty-UX checks.
 * Never enables OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO.
 * Does not invent or load real provider credentials.
 *
 *   node scripts/local-preview.mjs                 → OPENROUTER_NOT_CONFIGURED
 *   node scripts/local-preview.mjs --auth-required → AUTH_REQUIRED
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const handler = require("../api/chat.js");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

const authRequired = process.argv.includes("--auth-required");
process.env.OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO = "false";
if (authRequired) {
  process.env.OPENROUTER_API_KEY = "local-preview-not-a-secret";
} else {
  delete process.env.OPENROUTER_API_KEY;
}

const port = Number(process.env.PORT) || 4173;

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function vercelRes(res) {
  return {
    setHeader(name, value) {
      res.setHeader(name, value);
      return this;
    },
    status(code) {
      res.statusCode = code;
      return this;
    },
    json(body) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(body));
    }
  };
}

function safePath(urlPath) {
  const decoded = decodeURIComponent((urlPath || "/").split("?")[0]);
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const resolved = normalize(join(ROOT, relative));
  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  if (url.pathname === "/api/chat") {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": "POST"
      });
      return res.end();
    }
    const body = req.method === "POST" ? await readBody(req) : {};
    if (body === null) return json(res, 400, { error: "Invalid JSON body.", code: "INVALID_INPUT" });
    req.body = body;
    return handler(req, vercelRes(res));
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD, POST" });
    return res.end();
  }

  let path = safePath(url.pathname);
  if (!path || !existsSync(path) || statSync(path).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Not found");
  }
  res.writeHead(200, { "Content-Type": TYPES[extname(path)] || "application/octet-stream" });
  if (req.method === "HEAD") return res.end();
  createReadStream(path).pipe(res);
});

server.listen(port, "127.0.0.1", () => {
  const mode = authRequired ? "AUTH_REQUIRED" : "OPENROUTER_NOT_CONFIGURED";
  console.log(`local-preview ${mode}  http://127.0.0.1:${port}`);
  console.log("OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO=false (shared-path spend stays gated)");
});
