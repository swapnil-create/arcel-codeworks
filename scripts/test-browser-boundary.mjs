#!/usr/bin/env node
/**
 * Browser-boundary regression test (Cursor harness backlog, Job 4).
 *
 * Static, dependency-free assertion that the browser-shipped assets never embed
 * harness/provider internals. Browser code must talk only to the same-origin
 * /api/* endpoints — never directly to Hermes, OpenRouter, a local bridge, or an
 * /mcp / connector endpoint, and it must never contain a provider key.
 *
 * CodeWorks-owned /v1/* calls are permitted ONLY after the real Run API exists.
 * Until then RUN_API_AVAILABLE stays false and any /v1/ reference in a browser
 * asset fails this test. Flip RUN_API_AVAILABLE to true once /v1/* is real.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Assets actually delivered to the browser (index.html loads app.js and
// lib/generation-errors.js; styles.css is linked). Server-only files under
// api/ and the rest of lib/ are intentionally excluded.
const BROWSER_ASSETS = ["index.html", "app.js", "styles.css", "lib/generation-errors.js"];

const RUN_API_AVAILABLE = false;

const FORBIDDEN = [
  { name: "Hermes reference", pattern: /hermes/i },
  { name: "OpenRouter API key", pattern: /sk-or-(?:v1-)?[a-z0-9]{6,}/i },
  { name: "direct OpenRouter/provider host", pattern: /openrouter\.ai/i },
  { name: "local bridge URL", pattern: /(?:https?|wss?):\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?/i },
  { name: "bridge scheme", pattern: /\bbridge:\/\//i },
  { name: "direct /mcp or connector call", pattern: /(?:\/mcp\b|mcp:\/\/)/i }
];

if (!RUN_API_AVAILABLE) {
  FORBIDDEN.push({
    name: "CodeWorks /v1/* call before the Run API exists",
    pattern: /\/v1\//
  });
}

const failures = [];

for (const asset of BROWSER_ASSETS) {
  let text;
  try {
    text = readFileSync(join(ROOT, asset), "utf8");
  } catch (error) {
    failures.push(`${asset}: could not read browser asset (${error.message})`);
    continue;
  }
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const { name, pattern } of FORBIDDEN) {
      const match = pattern.exec(line);
      if (match) {
        failures.push(`${asset}:${index + 1}: ${name} — matched ${JSON.stringify(match[0])}`);
      }
    }
  });
}

if (failures.length) {
  for (const failure of failures) console.error(`fail  ${failure}`);
  console.error(`\nbrowser-boundary: ${failures.length} violation(s) found`);
  process.exit(1);
}

console.log(`browser-boundary: ${BROWSER_ASSETS.length} assets clean (no Hermes/provider key/bridge/mcp; /v1/* gated: RUN_API_AVAILABLE=${RUN_API_AVAILABLE})`);
