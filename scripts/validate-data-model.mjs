#!/usr/bin/env node
/**
 * Fixture + invariant checks for docs/data-model.
 * No database. Persistence is not live. Exit 1 on failure.
 */
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { evaluateCase } = require("../lib/object-access.js");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MODEL = join(ROOT, "docs/data-model");
const SCHEMA_DIR = join(MODEL, "schemas");
const FIXTURE_DIR = join(MODEL, "fixtures");

const COLLECTIONS = {
  users: "user.schema.json",
  workspaces: "workspace.schema.json",
  memberships: "membership.schema.json",
  conversations: "conversation.schema.json",
  messages: "message.schema.json",
  runs: "run.schema.json",
  steps: "step.schema.json",
  tool_calls: "tool-call.schema.json",
  usage_entries: "usage-entry.schema.json"
};

const TERMINAL = new Set(["completed", "failed", "cancelled"]);
const ERROR_AS_ASSISTANT = /unable to complete that request|generation is disabled until authenticated|openrouter is not configured/i;

function fail(message) {
  throw new Error(message);
}

function isType(value, type) {
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "array") return Array.isArray(value);
  if (type === "string") return typeof value === "string";
  if (type === "integer") return Number.isInteger(value);
  if (type === "boolean") return typeof value === "boolean";
  if (type === "null") return value === null;
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  return false;
}

function matchesType(value, schemaType) {
  const types = Array.isArray(schemaType) ? schemaType : [schemaType];
  return types.some(type => isType(value, type));
}

function validateSchema(value, schema, path) {
  if (schema.type && !matchesType(value, schema.type)) {
    fail(`${path}: expected ${schema.type}, got ${value === null ? "null" : typeof value}`);
  }
  if (schema.enum && !schema.enum.includes(value)) {
    fail(`${path}: ${JSON.stringify(value)} not in enum`);
  }
  if (typeof value === "string") {
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      fail(`${path}: does not match ${schema.pattern}`);
    }
    if (schema.minLength && value.length < schema.minLength) {
      fail(`${path}: shorter than minLength ${schema.minLength}`);
    }
  }
  if (Number.isInteger(value) && schema.minimum != null && value < schema.minimum) {
    fail(`${path}: below minimum ${schema.minimum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems && value.length < schema.minItems) fail(`${path}: minItems ${schema.minItems}`);
    if (schema.items) value.forEach((item, index) => validateSchema(item, schema.items, `${path}[${index}]`));
  }
  if (isType(value, "object") && schema.properties) {
    for (const key of schema.required || []) {
      if (!(key in value)) fail(`${path}: missing required ${key}`);
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!schema.properties[key]) fail(`${path}: unexpected property ${key}`);
      }
    }
    for (const [key, child] of Object.entries(schema.properties)) {
      if (key in value) validateSchema(value[key], child, `${path}.${key}`);
    }
  }
}

async function loadJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function ids(records = []) {
  return new Set(records.map(record => record.id));
}

function assertGraph(slice) {
  const userIds = ids(slice.users);
  const workspaceIds = ids(slice.workspaces);
  const conversationIds = ids(slice.conversations);
  const runIds = ids(slice.runs);
  const stepIds = ids(slice.steps);

  for (const membership of slice.memberships || []) {
    if (!userIds.has(membership.user_id) || !workspaceIds.has(membership.workspace_id)) {
      fail(`membership ${membership.id} references missing user/workspace`);
    }
    if (membership.display_name && (!membership.user_id || !membership.workspace_id || !membership.role)) {
      fail("membership cannot authorize from display_name alone");
    }
  }
  for (const conversation of slice.conversations || []) {
    if (!workspaceIds.has(conversation.workspace_id) || !userIds.has(conversation.created_by_user_id)) {
      fail(`conversation ${conversation.id} has dangling scope`);
    }
  }
  for (const message of slice.messages || []) {
    if (!conversationIds.has(message.conversation_id)) fail(`message ${message.id} missing conversation`);
    if (message.role === "assistant") {
      const text = (message.parts || []).map(part => part.text || "").join("\n");
      if (ERROR_AS_ASSISTANT.test(text)) {
        fail(`message ${message.id} stores a generation gate as assistant text`);
      }
    }
  }
  for (const run of slice.runs || []) {
    if (!conversationIds.has(run.conversation_id) || !workspaceIds.has(run.workspace_id) || !userIds.has(run.actor_user_id)) {
      fail(`run ${run.id} has dangling refs`);
    }
    if (TERMINAL.has(run.status) && !run.terminal_at) fail(`terminal run ${run.id} missing terminal_at`);
  }
  const usageKeys = new Set();
  for (const entry of slice.usage_entries || []) {
    if (!runIds.has(entry.run_id)) fail(`usage ${entry.id} missing run`);
    if (usageKeys.has(entry.idempotency_key)) fail(`duplicate usage idempotency_key ${entry.idempotency_key}`);
    usageKeys.add(entry.idempotency_key);
  }
  for (const step of slice.steps || []) {
    if (!runIds.has(step.run_id)) fail(`step ${step.id} missing run`);
  }
  for (const tool of slice.tool_calls || []) {
    if (!stepIds.has(tool.step_id) || !runIds.has(tool.run_id)) fail(`tool ${tool.id} missing refs`);
  }
}

function assertTerminalImmutable(fixture) {
  if (!TERMINAL.has(fixture.before.status)) fail("terminal mutate fixture before.status must be terminal");
  if (fixture.before.id !== fixture.after.id) fail("terminal mutate fixture id mismatch");
  if (fixture.before.status !== fixture.after.status) {
    fail("terminal run status changed in place; retries must insert a linked attempt");
  }
}

async function main() {
  const schemaFiles = (await readdir(SCHEMA_DIR)).filter(name => name.endsWith(".schema.json"));
  const schemas = {};
  for (const name of schemaFiles) {
    schemas[name] = await loadJson(join(SCHEMA_DIR, name));
  }

  const valid = await loadJson(join(FIXTURE_DIR, "valid-r0-slice.json"));
  for (const [collection, schemaName] of Object.entries(COLLECTIONS)) {
    const schema = schemas[schemaName];
    if (!schema) fail(`missing schema ${schemaName}`);
    for (const [index, record] of (valid[collection] || []).entries()) {
      validateSchema(record, schema, `${collection}[${index}]`);
    }
  }
  assertGraph(valid);

  const missingKey = await loadJson(join(FIXTURE_DIR, "invalid-usage-missing-idempotency.json"));
  let rejected = false;
  try {
    validateSchema(missingKey.usage_entries[0], schemas["usage-entry.schema.json"], "invalid.usage");
  } catch {
    rejected = true;
  }
  if (!rejected) fail("expected missing idempotency_key to fail schema validation");

  const displayName = await loadJson(join(FIXTURE_DIR, "invalid-membership-display-name.json"));
  rejected = false;
  try {
    validateSchema(displayName.memberships[0], schemas["membership.schema.json"], "invalid.membership");
  } catch {
    rejected = true;
  }
  if (!rejected) fail("expected display-name membership to fail schema validation");

  const fakeAssistant = await loadJson(join(FIXTURE_DIR, "invalid-error-as-assistant-message.json"));
  rejected = false;
  try {
    validateSchema(fakeAssistant.messages[0], schemas["message.schema.json"], "invalid.message");
    assertGraph({ ...valid, messages: fakeAssistant.messages });
  } catch {
    rejected = true;
  }
  if (!rejected) fail("expected AUTH_REQUIRED assistant message to be rejected");

  const mutate = await loadJson(join(FIXTURE_DIR, "invalid-run-terminal-mutate.json"));
  rejected = false;
  try {
    assertTerminalImmutable(mutate);
  } catch {
    rejected = true;
  }
  if (!rejected) fail("expected in-place terminal status change to be rejected");

  const isolation = await loadJson(join(FIXTURE_DIR, "sec01-isolation-slice.json"));
  for (const [collection, schemaName] of Object.entries(COLLECTIONS)) {
    const schema = schemas[schemaName];
    for (const [index, record] of (isolation[collection] || []).entries()) {
      validateSchema(record, schema, `isolation.${collection}[${index}]`);
    }
  }
  assertGraph(isolation);
  if (!Array.isArray(isolation.cases) || isolation.cases.length < 8) {
    fail("sec01-isolation-slice.json must include isolation cases");
  }
  for (const testCase of isolation.cases) {
    if (!evaluateCase(isolation, testCase)) {
      fail(`isolation case failed: ${testCase.name}`);
    }
  }

  console.log("data-model stubs: schemas + invariants ok (persistence is not live)");
}

main().catch(error => {
  console.error(`data-model validation failed: ${error.message}`);
  process.exit(1);
});
