#!/usr/bin/env node
/**
 * Dependency-free CI for the vanilla HTML + Vercel function repo.
 * Syntax, JSON, generation-gate unit checks, secret/demo-flag scan, data-model stubs.
 */
import { execFileSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { generationGate, classifyGenerationFailure, CATALOG } = require("../lib/generation-errors.js");

const failures = [];

function check(name, fn) {
  try {
    fn();
    console.log(`ok  ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.error(`fail  ${name}: ${error.message}`);
  }
}

async function walk(dir, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "artifacts") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path, acc);
    else acc.push(path);
  }
  return acc;
}

function nodeCheck(file) {
  execFileSync("node", ["--check", file], { cwd: ROOT, stdio: "pipe" });
}

async function main() {
  const files = await walk(ROOT);
  const jsFiles = files.filter(file => /\.(js|mjs|cjs)$/.test(file) && !file.includes("/docs/flows/"));

  check("syntax: javascript", () => {
    for (const file of jsFiles) nodeCheck(file);
  });

  check("json: vercel.json", () => {
    JSON.parse(require("node:fs").readFileSync(join(ROOT, "vercel.json"), "utf8"));
  });

  check("json: data-model schemas and fixtures", () => {
    const fs = require("node:fs");
    const parseDir = dir => {
      for (const name of fs.readdirSync(dir)) {
        if (!name.endsWith(".json")) continue;
        JSON.parse(fs.readFileSync(join(dir, name), "utf8"));
      }
    };
    parseDir(join(ROOT, "docs/data-model/schemas"));
    parseDir(join(ROOT, "docs/data-model/fixtures"));
  });

  check("env: demo flag default is false", () => {
    const example = require("node:fs").readFileSync(join(ROOT, ".env.example"), "utf8");
    if (!/^OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO=false$/m.test(example)) {
      throw new Error(".env.example must set OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO=false");
    }
    if (/OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO=true/.test(example)) {
      throw new Error(".env.example must not enable the unauthenticated demo flag");
    }
    if (/^OPENROUTER_API_KEY=.+$/m.test(example) && !/^OPENROUTER_API_KEY=$/m.test(example)) {
      throw new Error(".env.example must not contain an API key value");
    }
    for (const name of ["AUTH_SECRET", "AUTH_GITHUB_SECRET", "AUTH_GOOGLE_SECRET"]) {
      if (new RegExp(`^${name}=.+$`, "m").test(example) && !new RegExp(`^${name}=$`, "m").test(example)) {
        throw new Error(`.env.example must not contain a ${name} value`);
      }
    }
    if (!/^AUTH_SECRET=$/m.test(example) || !/^AUTH_GITHUB_ID=$/m.test(example)) {
      throw new Error(".env.example must document empty AUTH_SECRET and OAuth client slots");
    }
  });

  check("gate: missing key => OPENROUTER_NOT_CONFIGURED", () => {
    const result = generationGate({});
    if (!result || result.code !== "OPENROUTER_NOT_CONFIGURED" || result.status !== 503) {
      throw new Error(JSON.stringify(result));
    }
  });

  check("gate: key without session => AUTH_REQUIRED", () => {
    const result = generationGate({
      OPENROUTER_API_KEY: "local-preview-not-a-secret",
      OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO: "false"
    });
    if (!result || result.code !== "AUTH_REQUIRED" || result.status !== 403) {
      throw new Error(JSON.stringify(result));
    }
  });

  check("gate: demo flag is not authorization", () => {
    const unset = generationGate({ OPENROUTER_API_KEY: "local-preview-not-a-secret" });
    const flagged = generationGate({
      OPENROUTER_API_KEY: "local-preview-not-a-secret",
      OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO: "true"
    });
    if (unset?.code !== "AUTH_REQUIRED" || flagged?.code !== "AUTH_REQUIRED") {
      throw new Error("unauthenticated spend must stay blocked even if the demo flag is true");
    }
  });

  check("gate: session principal required to pass", () => {
    const passed = generationGate(
      { OPENROUTER_API_KEY: "local-preview-not-a-secret" },
      { sub: "github:1" }
    );
    const blank = generationGate(
      { OPENROUTER_API_KEY: "local-preview-not-a-secret" },
      { sub: "  " }
    );
    if (passed !== null) throw new Error(JSON.stringify(passed));
    if (blank?.code !== "AUTH_REQUIRED") throw new Error("blank sub must fail closed");
  });

  check("classify: AUTH_REQUIRED is permission-denied, not assistant text", () => {
    const failure = classifyGenerationFailure({ status: 403, code: "AUTH_REQUIRED" });
    if (failure.state !== "permission-denied" || failure.taxonomy !== "auth_required" || failure.retryable) {
      throw new Error(JSON.stringify(failure));
    }
    const labels = (failure.ctas || []).map(cta => cta.label);
    if (!labels.includes("Sign in") || !labels.includes("Open settings") || !labels.includes("View existing work")) {
      throw new Error("AUTH_REQUIRED catalog missing sign-in CTA");
    }
  });

  check("classify: OPENROUTER_NOT_CONFIGURED is failed / provider_unavailable", () => {
    const failure = classifyGenerationFailure({ status: 503, code: "OPENROUTER_NOT_CONFIGURED" });
    if (failure.state !== "failed" || failure.taxonomy !== "provider_unavailable") {
      throw new Error(JSON.stringify(failure));
    }
  });

  check("client: does not store gate failures as assistant copy", () => {
    const app = require("node:fs").readFileSync(join(ROOT, "app.js"), "utf8");
    if (/Unable to complete that request/.test(app) || /This model could not respond:/.test(app)) {
      throw new Error("app.js still formats generation failures as assistant/model text");
    }
    if (!/runBanner/.test(app) || !/generationError/.test(app)) {
      throw new Error("app.js missing honesty banner state");
    }
    if (!/Open settings/.test(app) || !/View existing work/.test(app) || !/open-settings/.test(app) || !/view-existing-work/.test(app)) {
      throw new Error("app.js missing Figma gate CTAs");
    }
    if (!/action === "sign-in"/.test(app) || !/\/api\/auth\/session/.test(app) || !/credentials: "include"/.test(app)) {
      throw new Error("app.js missing real sign-in session wiring");
    }
    if (/<strong>Swapnil<\/strong>/.test(app)) {
      throw new Error("app.js must not hardcode a signed-in identity");
    }
  });

  check("catalog: QUOTA_EXHAUSTED is reserved, not billed", () => {
    const entry = CATALOG.QUOTA_EXHAUSTED;
    if (!entry || entry.state !== "quota-exhausted" || entry.taxonomy !== "quota_exceeded" || entry.retryable) {
      throw new Error(JSON.stringify(entry));
    }
    const classified = classifyGenerationFailure({ code: "QUOTA_EXHAUSTED" });
    if (classified.state !== "quota-exhausted") throw new Error(JSON.stringify(classified));
    const labels = (classified.ctas || []).map(cta => cta.label);
    if (!labels.includes("Open settings") || !labels.includes("View existing work") || !labels.includes("Sign in")) {
      throw new Error("quota catalog missing Figma CTAs");
    }
    if (!/does not meter or bill/i.test(entry.detail) || !/no automatic overage/i.test(entry.detail)) {
      throw new Error("quota catalog must not invent live billing");
    }
  });

  check("gate: never emits quota or demo spend", () => {
    const missing = generationGate({});
    const auth = generationGate({ OPENROUTER_API_KEY: "local-preview-not-a-secret" });
    if (missing?.code === "QUOTA_EXHAUSTED" || auth?.code === "QUOTA_EXHAUSTED") {
      throw new Error("generationGate must not invent quota/billing");
    }
  });

  check("catalog: Flow G states are canonical", () => {
    const allowed = new Set(["empty", "loading", "working", "completed", "partial", "failed", "cancelled", "permission-denied", "quota-exhausted"]);
    for (const entry of Object.values(CATALOG)) {
      if (!allowed.has(entry.state)) throw new Error(`${entry.code} uses non-canonical state ${entry.state}`);
    }
  });

  check("scan: demo flag not enabled on runtime paths", () => {
    const fs = require("node:fs");
    const assignedTrue = /^OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO=true$/m;
    const envAssignedTrue = /process\.env\.OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO\s*=\s*["']true["']/;
    for (const file of files) {
      if (!/\.(js|mjs|cjs|json|yml|yaml|html|example)$/.test(file)) continue;
      const text = fs.readFileSync(file, "utf8");
      if (assignedTrue.test(text) || envAssignedTrue.test(text)) {
        throw new Error(`${relative(ROOT, file)} enables OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO`);
      }
    }
  });

  check("scan: no committed secrets", () => {
    const fs = require("node:fs");
    const blockedName = /(^|\/)\.env($|\.(?!example$))/;
    const blocked = [
      /sk-or-v1-[a-z0-9]{10,}/i,
      /-----BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY-----/,
      /sk-live-[a-z0-9]{10,}/i
    ];
    for (const file of files) {
      const rel = relative(ROOT, file);
      if (blockedName.test(rel.replaceAll("\\", "/"))) throw new Error(`committed env file ${rel}`);
      if (!/\.(js|mjs|cjs|json|yml|yaml|html|md|sql|example)$/.test(rel)) continue;
      const text = fs.readFileSync(file, "utf8");
      for (const pattern of blocked) {
        if (pattern.test(text)) throw new Error(`possible secret in ${rel}`);
      }
    }
  });

  check("api/chat: structured gate errors", () => {
    execFileSync("node", [join(ROOT, "scripts/test-chat-gate.mjs")], { cwd: ROOT, stdio: "pipe" });
  });

  check("api/auth: session cookie fail-closed", () => {
    execFileSync("node", [join(ROOT, "scripts/test-auth-gate.mjs")], { cwd: ROOT, stdio: "pipe" });
  });

  check("docs: AUTH.md present and secret-free", () => {
    const fs = require("node:fs");
    const auth = fs.readFileSync(join(ROOT, "docs/AUTH.md"), "utf8");
    if (!/AUTH_SECRET/.test(auth) || !/AUTH_GITHUB_ID/.test(auth) || !/\/api\/chat/.test(auth)) {
      throw new Error("AUTH.md missing configuration instructions");
    }
    if (/sk-or-v1-/i.test(auth) || /AUTH_SECRET=\S+/.test(auth)) {
      throw new Error("AUTH.md must not include secret values");
    }
  });

  check("chat: demo flag is not a spend path", () => {
    const chat = require("node:fs").readFileSync(join(ROOT, "api/chat.js"), "utf8");
    if (/OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO/.test(chat)) {
      throw new Error("api/chat.js must not use the demo flag; session is the spend gate");
    }
    if (!/readSession/.test(chat)) throw new Error("api/chat.js must derive the actor from readSession");
  });

  check("data-model: fixture invariants", () => {
    execFileSync("node", [join(ROOT, "scripts/validate-data-model.mjs")], { cwd: ROOT, stdio: "pipe" });
  });

  check("migration stub exists and is marked not-applied", () => {
    const sql = require("node:fs").readFileSync(
      join(ROOT, "docs/data-model/migrations/0001_r0_canonical_entities.sql"),
      "utf8"
    );
    if (!/STUB ONLY/.test(sql) || !/usage_entries/.test(sql) || !/CREATE TABLE IF NOT EXISTS runs/.test(sql)) {
      throw new Error("migration stub missing required entities or stub banner");
    }
  });

  if (failures.length) {
    console.error(`\n${failures.length} CI check(s) failed`);
    process.exit(1);
  }
  console.log("\nci-check passed");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
