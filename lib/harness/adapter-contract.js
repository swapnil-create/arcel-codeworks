"use strict";

/**
 * CodeWorks-owned, harness-neutral contract. This module intentionally contains
 * no Hermes URL, provider credential, or browser-facing transport. A worker
 * imports an adapter only after CodeWorks has authenticated the actor, derived
 * workspace/project policy, persisted a run, and reserved its budget.
 */

const HARNESS_ADAPTER_CONTRACT_VERSION = "1.0";
const REQUIRED_ADAPTER_METHODS = Object.freeze([
  "startRun",
  "streamEvents",
  "approveToolCall",
  "rejectToolCall",
  "cancelRun",
  "getCapabilities"
]);

const TOOL_CLASSIFICATIONS = Object.freeze(["read", "preview", "write"]);

function invariant(condition, message) {
  if (!condition) throw new TypeError(message);
}

function assertHarnessAdapter(adapter) {
  invariant(adapter && typeof adapter === "object", "Harness adapter must be an object.");
  invariant(typeof adapter.id === "string" && adapter.id.length > 0, "Harness adapter must expose a stable id.");
  invariant(
    adapter.contractVersion === HARNESS_ADAPTER_CONTRACT_VERSION,
    `Harness adapter must implement contract ${HARNESS_ADAPTER_CONTRACT_VERSION}.`
  );
  for (const method of REQUIRED_ADAPTER_METHODS) {
    invariant(typeof adapter[method] === "function", `Harness adapter is missing ${method}().`);
  }
  return adapter;
}

function assertRunInput(input) {
  invariant(input && typeof input === "object", "Run input is required.");
  invariant(/^run_/.test(input.codeworksRunId || ""), "Run input needs a CodeWorks run id.");
  invariant(Number.isInteger(input.attempt) && input.attempt >= 1, "Run input needs a positive attempt.");
  invariant(input.actor?.userId && input.actor?.workspaceId && input.actor?.role, "Run actor must be server-derived.");
  invariant(input.project?.id, "Run input needs a project id.");
  invariant(input.workflow?.id && input.workflow?.version && input.workflow?.manifestDigest, "Run input needs an immutable workflow version.");
  invariant(input.model?.registryId && input.model?.policyDigest, "Run input needs a policy-filtered model selection.");
  invariant(input.limits?.maxCostUsd && input.limits?.deadlineAt, "Run input needs a budget and deadline.");
  invariant(Array.isArray(input.tools), "Run input needs an explicit tool allowlist.");
  for (const tool of input.tools) {
    invariant(tool?.name && tool?.schemaDigest, "Every tool needs a name and schema digest.");
    invariant(TOOL_CLASSIFICATIONS.includes(tool.classification), "Every tool needs a valid classification.");
  }
  return input;
}

module.exports = {
  HARNESS_ADAPTER_CONTRACT_VERSION,
  REQUIRED_ADAPTER_METHODS,
  TOOL_CLASSIFICATIONS,
  assertHarnessAdapter,
  assertRunInput
};
