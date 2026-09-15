#!/usr/bin/env node
/**
 * Validates the golden-evaluation specification fixtures under
 * docs/evaluations/. These are SPECIFICATION fixtures, not claimed execution
 * results: the checks below enforce structure and the two safety assertions
 * (no cross-workspace access, no unapproved write) plus the rule that every
 * model-changing tool class has an approval checkpoint. No AEC software is
 * called; only synthetic placeholder data is used. Exit 1 on failure.
 *
 * Standalone by design so it does not touch scripts/ci-check.mjs.
 */
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PACK = join(ROOT, "docs/evaluations/parking-lots-to-parks-r0");
const CASES = join(PACK, "cases");

const TERMINAL_STATES = new Set(["completed", "failed", "cancelled"]);
const REQUIRED_TRACE_FIELDS = ["run_id", "seq"];
const SECRET_VALUE_PATTERNS = [
  /sk-or-v1-[a-z0-9]{10,}/i,
  /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,
  /\bBearer\s+[A-Za-z0-9._-]{8,}/
];
const SECRET_KEY_NAMES = /^(api[_-]?key|secret|password|passwd|credential|credentials|authorization|access[_-]?token|refresh[_-]?token|private[_-]?key|bearer)$/i;

const failures = [];
function check(name, fn) {
  try {
    fn();
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function scanNoSecrets(value, path) {
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    for (const pattern of SECRET_VALUE_PATTERNS) {
      if (pattern.test(value)) throw new Error(`${path}: fixture appears to contain a secret or credential`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanNoSecrets(item, `${path}[${index}]`));
    return;
  }
  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (SECRET_KEY_NAMES.test(key)) throw new Error(`${path}.${key}: secret-like field is not allowed in a fixture`);
      scanNoSecrets(child, `${path}.${key}`);
    }
  }
}

function validateFixture(name, fixture) {
  assert(fixture && typeof fixture === "object", "fixture must be an object");
  assert(typeof fixture.fixture_id === "string" && fixture.fixture_id, "fixture_id is required");
  assert(fixture.kind === "specification-fixture", "kind must be 'specification-fixture'");
  assert(fixture.not_execution_results === true, "not_execution_results must be true (these are specs, not results)");

  const brief = fixture.site_brief;
  assert(brief && typeof brief === "object", "site_brief is required");
  assert(/^site_/.test(brief.site_ref || ""), "site_brief.site_ref must be a placeholder site_ ref");
  assert(/^ws_/.test(brief.workspace_ref || ""), "site_brief.workspace_ref must be a placeholder ws_ ref");
  assert(typeof brief.summary === "string" && brief.summary.length > 0, "site_brief.summary is required");
  assert(Array.isArray(brief.constraints) && brief.constraints.some(c => /synthetic/i.test(c)), "site_brief.constraints must mark data as synthetic");

  const classes = fixture.expected_tool_classes;
  assert(classes && typeof classes === "object", "expected_tool_classes is required");
  for (const cls of ["read_only", "preview", "model_changing"]) {
    assert(Array.isArray(classes[cls]), `expected_tool_classes.${cls} must be an array`);
  }

  const checkpoints = fixture.approval_checkpoints;
  assert(Array.isArray(checkpoints), "approval_checkpoints must be an array");
  const gatedTools = new Set();
  for (const cp of checkpoints) {
    assert(typeof cp.for_tool === "string", "approval_checkpoint.for_tool is required");
    assert(/^apr_/.test(cp.approval_id || ""), `approval_checkpoint for ${cp.for_tool} needs an apr_ approval_id`);
    assert(cp.required === true, `approval_checkpoint for ${cp.for_tool} must be required:true`);
    assert(["granted", "rejected", "pending"].includes(cp.decision), `approval_checkpoint for ${cp.for_tool} needs a decision`);
    gatedTools.add(cp.for_tool);
  }
  // Every model-changing tool must have an approval checkpoint.
  for (const tool of classes.model_changing) {
    assert(gatedTools.has(tool), `model-changing tool ${tool} has no approval checkpoint`);
  }

  assert(TERMINAL_STATES.has(fixture.expected_terminal_state), `expected_terminal_state must be one of ${[...TERMINAL_STATES].join(", ")}`);

  assert(Array.isArray(fixture.trace_fields) && fixture.trace_fields.length > 0, "trace_fields must be a non-empty array");
  for (const field of REQUIRED_TRACE_FIELDS) {
    assert(fixture.trace_fields.includes(field), `trace_fields must include ${field}`);
  }
  if (classes.model_changing.length > 0) {
    assert(fixture.trace_fields.includes("approval_id"), "trace_fields must include approval_id when a model-changing tool is used");
  }

  const asserts = fixture.assertions;
  assert(asserts && typeof asserts === "object", "assertions is required");
  for (const key of ["no_cross_workspace_access", "no_unapproved_write"]) {
    assert(asserts[key] && asserts[key].expect === "pass", `assertions.${key}.expect must be 'pass'`);
    assert(typeof asserts[key].detail === "string" && asserts[key].detail.length > 0, `assertions.${key}.detail is required`);
  }

  scanNoSecrets(fixture, name);
}

async function main() {
  let files;
  try {
    files = (await readdir(CASES)).filter(n => n.endsWith(".json")).sort();
  } catch {
    console.error(`evaluation cases directory not found: ${CASES}`);
    process.exit(1);
  }

  if (files.length < 10) {
    console.error(`expected at least 10 specification fixtures, found ${files.length}`);
    process.exit(1);
  }

  const seenIds = new Set();
  for (const file of files) {
    const fixture = JSON.parse(await readFile(join(CASES, file), "utf8"));
    check(file, () => {
      validateFixture(file, fixture);
      if (seenIds.has(fixture.fixture_id)) throw new Error(`duplicate fixture_id ${fixture.fixture_id}`);
      seenIds.add(fixture.fixture_id);
    });
  }

  if (failures.length) {
    for (const failure of failures) console.error(`fail  ${failure}`);
    console.error(`\n${failures.length} evaluation fixture check(s) failed`);
    process.exit(1);
  }
  console.log(`golden-evaluation pack: ${files.length} specification fixtures ok (specs only, no execution, no AEC calls)`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
