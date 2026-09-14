#!/usr/bin/env node
/**
 * D04 provider-spike harness (plan companion: docs/D04-PROVIDER-SPIKES.md).
 *
 * Default / --list: print the capability matrix, no network, exit 0.
 * Live OpenRouter calls require D04_ALLOW_LIVE=1 AND a positive D04_MAX_USD.
 * Missing keys → error, no invented credentials, no network.
 *
 * SEC-01: this script never calls a public /api/chat deployment. Do not enable
 * unauthenticated public spend (OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO on a
 * shared host). Provider keys stay in process env and are never logged.
 */

import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const COST_LOG = join(ROOT, "artifacts", "d04-cost-log.jsonl");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const RESERVED_STREAM_USD = 0.02;

const SPIKES = {
  streaming: {
    id: "streaming",
    requirementIds: ["MOD-06", "CHAT-01"],
    title: "Streaming completions",
    what: "OpenRouter chat/completions with stream:true, max_tokens 64 (cheap model).",
    pass: "SSE content deltas + terminal event; usage logged; cost ≤ cap; no key in logs.",
    fail: "Non-stream JSON only, splice-on-fail, or errors stored as assistant text.",
    live: "openrouter-stream"
  },
  tools: {
    id: "tools",
    requirementIds: ["MOD-06"],
    title: "Tool / function calls",
    what: "Normalize tool_call + result pairing into Run/Step/ToolCall.",
    pass: "Provider returns a well-formed tool call an adapter can map.",
    fail: "Tools ignored or hallucinated as prose.",
    live: "unsupported_stub"
  },
  search: {
    id: "search",
    requirementIds: ["SRC-01"],
    title: "Search and citations",
    what: "Retrieve permitted pages; cite only retrieved URLs; disclose failed access.",
    pass: "Cited URLs ⊆ evidence; no fabricated reads.",
    fail: "Prompt-only Research or invented sources.",
    live: "unsupported_stub"
  },
  image: {
    id: "image",
    requirementIds: ["IMG-01", "IMG-02"],
    title: "Image generate and edit",
    what: "Generate assets; revise the exact prior version; disable unsupported edits.",
    pass: "Real bytes + ancestry; no silent unrelated replacement.",
    fail: "Text describing an image, or edit that ignores the reference.",
    live: "unsupported_stub"
  },
  voice: {
    id: "voice",
    requirementIds: ["VOI-01", "VOI-02", "VOI-03", "VOI-04"],
    title: "Voice (dictation, conversation, files, privacy)",
    what: "STT/TTS or realtime duplex with consent, barge-in, and duration metering.",
    pass: "Transcript ≠ summary; mic released; no identity-recognition claims.",
    fail: "Fake transcript or policy-violating retention.",
    live: "unsupported_stub"
  }
};

function printSec01() {
  console.log(
    "[d04] SEC-01: /api/chat has no authenticated principal. This harness never calls a public /api/chat deployment. Do not set OPENROUTER_ALLOW_UNAUTHENTICATED_DEMO=true on a shared host — that is unauthenticated public spend."
  );
}

function printHelp() {
  printSec01();
  console.log(`
Usage:
  node scripts/d04-provider-spike.mjs            # same as --list
  node scripts/d04-provider-spike.mjs --list
  node scripts/d04-provider-spike.mjs --spike <id>

Spike ids: ${Object.keys(SPIKES).join(" | ")}

Live calls (operator machine only):
  D04_ALLOW_LIVE=1 D04_MAX_USD=<positive> OPENROUTER_API_KEY=... \\
    node scripts/d04-provider-spike.mjs --spike streaming

Without live flags the harness no-ops (no network, exit 0).
Missing keys with live flags → error, no invented credentials, no network.
tools | search | image | voice never fake success: they log unsupported_capability.
`.trimEnd());
}

function printMatrix() {
  printSec01();
  console.log("[d04] Provider spike matrix (no network). Live keys are not required for --list.");
  console.log("[d04] Plan: docs/D04-PROVIDER-SPIKES.md\n");
  console.log(
    [
      "id".padEnd(12),
      "requirements".padEnd(28),
      "live behaviour"
    ].join(" ")
  );
  console.log("-".repeat(78));
  for (const spike of Object.values(SPIKES)) {
    const live =
      spike.live === "openrouter-stream"
        ? "OpenRouter stream if live+key; else no-op / missing-key error"
        : "unsupported_capability stub if live+key; else no-op / missing-key error";
    console.log(
      [spike.id.padEnd(12), spike.requirementIds.join(", ").padEnd(28), live].join(" ")
    );
    console.log(`  what:  ${spike.what}`);
    console.log(`  pass:  ${spike.pass}`);
    console.log(`  fail:  ${spike.fail}`);
    console.log(`  cost:  artifacts/d04-cost-log.jsonl (gitignored)`);
    console.log(`  blocked-on-credentials: yes for a real pass\n`);
  }
  console.log("[d04] D04 is not done until live runs + redacted costs exist.");
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) return { cmd: "help" };
  if (args.length === 0 || args.includes("--list")) {
    if (args.includes("--spike")) {
      return { cmd: "error", message: "Use either --list or --spike <id>, not both." };
    }
    return { cmd: "list" };
  }
  const spikeIdx = args.indexOf("--spike");
  if (spikeIdx === -1) {
    return { cmd: "error", message: `Unknown arguments: ${args.join(" ")}. Try --help.` };
  }
  const id = args[spikeIdx + 1];
  if (!id || id.startsWith("-")) {
    return { cmd: "error", message: " --spike requires one of: " + Object.keys(SPIKES).join(", ") };
  }
  if (!SPIKES[id]) {
    return { cmd: "error", message: `Unknown spike "${id}". Known: ${Object.keys(SPIKES).join(", ")}` };
  }
  return { cmd: "spike", id };
}

function liveIntent() {
  return process.env.D04_ALLOW_LIVE === "1";
}

function maxUsd() {
  const raw = process.env.D04_MAX_USD;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

function liveAllowed() {
  const cap = maxUsd();
  return liveIntent() && cap > 0;
}

function requireOpenRouterKey() {
  const key = process.env.OPENROUTER_API_KEY;
  if (typeof key === "string" && key.trim()) return key.trim();
  return null;
}

function isoNow() {
  return new Date().toISOString();
}

function baseRecord(spike, extra) {
  return {
    ts: isoNow(),
    spike_id: spike.id,
    requirement_ids: spike.requirementIds,
    status: extra.status,
    result: extra.result,
    provider: extra.provider ?? "none",
    endpoint: extra.endpoint ?? "none",
    called_public_chat_api: false,
    notes: extra.notes,
    error: extra.error ?? null,
    ...Object.fromEntries(
      Object.entries(extra).filter(([k]) =>
        ![
          "status",
          "result",
          "provider",
          "endpoint",
          "notes",
          "error"
        ].includes(k)
      )
    )
  };
}

function assertNoSecrets(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (/sk-[a-zA-Z0-9]{10,}|OPENROUTER_API_KEY\s*=\s*\S+/.test(text)) {
    throw new Error("Refusing to write a cost-log line that looks like it contains a secret.");
  }
}

async function appendCostLog(record) {
  assertNoSecrets(record);
  await mkdir(join(ROOT, "artifacts"), { recursive: true });
  await appendFile(COST_LOG, `${JSON.stringify(record)}\n`, "utf8");
}

async function spentUsdFromLog() {
  try {
    const text = await readFile(COST_LOG, "utf8");
    let spent = 0;
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      let row;
      try {
        row = JSON.parse(line);
      } catch {
        continue;
      }
      const n = Number(row.provider_cost_usd ?? row.estimated_usd ?? 0);
      if (Number.isFinite(n) && n > 0) spent += n;
    }
    return spent;
  } catch (error) {
    if (error && error.code === "ENOENT") return 0;
    throw error;
  }
}

async function runNoop(spike) {
  printSec01();
  console.log(
    `[d04] Spike "${spike.id}" no-op: D04_ALLOW_LIVE=1 and a positive D04_MAX_USD are required for any live call.`
  );
  console.log("[d04] No network. Not inventing credentials. Adapters remain plan-only.");
  console.log(`[d04] Requirements: ${spike.requirementIds.join(", ")}`);
}

async function runStub(spike, cap, remaining) {
  printSec01();
  const record = baseRecord(spike, {
    status: "unsupported_capability",
    result: "blocked",
    provider: "none",
    endpoint: "none",
    cap_usd: cap,
    remaining_cap_usd: remaining,
    notes:
      "Adapters are plan-only. Harness will not fake a search, image, voice, or tools success. No provider HTTP."
  });
  await appendCostLog(record);
  console.log(
    `[d04] Spike "${spike.id}": unsupported_capability (logged). Requirements: ${spike.requirementIds.join(", ")}`
  );
  console.log(`[d04] Wrote stub to artifacts/d04-cost-log.jsonl — result=blocked, not pass.`);
}

async function consumeSse(response) {
  const chunks = [];
  let usage = null;
  let model = null;
  let finishReason = null;
  let sawDelta = false;
  const body = response.body;
  if (!body || typeof body.getReader !== "function") {
    const text = await response.text();
    return { content: text, usage, model, finishReason, sawDelta: false, raw: text };
  }
  const decoder = new TextDecoder();
  const reader = body.getReader();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") continue;
      let payload;
      try {
        payload = JSON.parse(data);
      } catch {
        continue;
      }
      if (payload.model) model = payload.model;
      if (payload.usage) usage = payload.usage;
      const choice = payload.choices?.[0];
      const delta = choice?.delta?.content;
      if (typeof delta === "string" && delta.length) {
        chunks.push(delta);
        sawDelta = true;
      }
      if (choice?.finish_reason) finishReason = choice.finish_reason;
    }
  }
  return { content: chunks.join(""), usage, model, finishReason, sawDelta };
}

async function runStreaming(spike, key, cap) {
  printSec01();
  const spent = await spentUsdFromLog();
  const remaining = cap - spent;
  if (remaining < RESERVED_STREAM_USD) {
    const record = baseRecord(spike, {
      status: "blocked_on_cap",
      result: "blocked",
      provider: "openrouter",
      endpoint: OPENROUTER_URL,
      cap_usd: cap,
      remaining_cap_usd: remaining,
      estimated_usd: RESERVED_STREAM_USD,
      notes: `Remaining cap ${remaining} USD is below reserved ${RESERVED_STREAM_USD} USD. No network.`
    });
    await appendCostLog(record);
    console.error("[d04] ERROR: spend cap exhausted; not calling OpenRouter.");
    process.exitCode = 1;
    return;
  }

  const model =
    process.env.OPENROUTER_MODEL_FAST || "google/gemini-2.5-flash";
  const site = process.env.OPENROUTER_SITE_URL || "https://arcel-codeworks.vercel.app";

  let response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": site,
        "X-OpenRouter-Title": "ARCEL Codeworks D04 spike"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: "Reply with one short sentence confirming that streaming works."
          }
        ],
        stream: true,
        max_tokens: 64,
        stream_options: { include_usage: true }
      })
    });
  } catch (error) {
    const record = baseRecord(spike, {
      status: "attempted",
      result: "fail",
      provider: "openrouter",
      endpoint: OPENROUTER_URL,
      model,
      stream: true,
      max_tokens: 64,
      cap_usd: cap,
      remaining_cap_usd: remaining,
      notes: "Transport failure talking to OpenRouter (not /api/chat).",
      error: error instanceof Error ? error.message : "unreachable"
    });
    await appendCostLog(record);
    console.error("[d04] ERROR: unable to reach OpenRouter.");
    process.exitCode = 1;
    return;
  }

  if (!response.ok) {
    const safeStatus = response.status;
    const record = baseRecord(spike, {
      status: "attempted",
      result: "fail",
      provider: "openrouter",
      endpoint: OPENROUTER_URL,
      model,
      stream: true,
      max_tokens: 64,
      cap_usd: cap,
      remaining_cap_usd: remaining,
      notes: "OpenRouter rejected the streaming request.",
      error: `HTTP ${safeStatus}`
    });
    await appendCostLog(record);
    console.error(`[d04] ERROR: OpenRouter HTTP ${safeStatus}.`);
    process.exitCode = 1;
    return;
  }

  const parsed = await consumeSse(response);
  const promptTokens = parsed.usage?.prompt_tokens ?? null;
  const completionTokens = parsed.usage?.completion_tokens ?? null;
  const providerCost =
    typeof parsed.usage?.cost === "number" ? parsed.usage.cost : null;
  const estimated = providerCost ?? RESERVED_STREAM_USD;
  const pass = parsed.sawDelta === true;
  const record = baseRecord(spike, {
    status: "attempted",
    result: pass ? "pass" : "fail",
    provider: "openrouter",
    endpoint: OPENROUTER_URL,
    model: parsed.model || model,
    stream: true,
    max_tokens: 64,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    estimated_usd: estimated,
    provider_cost_usd: providerCost,
    cap_usd: cap,
    remaining_cap_usd: remaining - (Number(providerCost) > 0 ? providerCost : 0),
    finish_reason: parsed.finishReason ?? null,
    notes: pass
      ? "SSE deltas received from OpenRouter. Public /api/chat was not called."
      : "No SSE content deltas. Public /api/chat was not called.",
    error: pass ? null : "no_stream_deltas"
  });
  await appendCostLog(record);
  console.log(
    `[d04] streaming ${pass ? "pass" : "fail"}: model=${record.model} deltas=${parsed.sawDelta} cost_usd=${providerCost ?? "unknown"}`
  );
  console.log("[d04] Logged attempt to artifacts/d04-cost-log.jsonl (gitignored).");
  if (!pass) process.exitCode = 1;
}

async function runSpike(id) {
  const spike = SPIKES[id];
  if (liveIntent() && !(maxUsd() > 0)) {
    printSec01();
    console.error(
      "[d04] ERROR: D04_ALLOW_LIVE=1 requires a positive D04_MAX_USD before any live call. No network."
    );
    process.exit(1);
  }

  if (!liveAllowed()) {
    await runNoop(spike);
    return;
  }

  const key = requireOpenRouterKey();
  if (!key) {
    printSec01();
    console.error(
      "[d04] ERROR: OPENROUTER_API_KEY is not set. Refusing to invent credentials. No network."
    );
    process.exit(1);
  }

  const cap = maxUsd();
  const remaining = cap - (await spentUsdFromLog());

  if (spike.live === "openrouter-stream") {
    await runStreaming(spike, key, cap);
    return;
  }
  await runStub(spike, cap, remaining);
}

const parsed = parseArgs(process.argv);
if (parsed.cmd === "help") {
  printHelp();
} else if (parsed.cmd === "list") {
  printMatrix();
} else if (parsed.cmd === "error") {
  printSec01();
  console.error(`[d04] ERROR: ${parsed.message}`);
  process.exit(1);
} else {
  await runSpike(parsed.id);
}
