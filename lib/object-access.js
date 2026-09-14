"use strict";

/**
 * In-memory object isolation contract (SEC-01 / ACC-01).
 *
 * This is not a database. It encodes the authorization rules later APIs must
 * apply against User / Workspace / Membership / Conversation / Run rows:
 *
 *   - Actor is server-derived (session.sub → user_id).
 *   - Client-asserted display_name / user / sub / bearer tokens are ignored.
 *   - Missing session → AUTH_REQUIRED.
 *   - Guessed IDs, cross-workspace reads, and revoked memberships → PERMISSION_DENIED
 *     (fail closed; do not leak whether the object exists).
 *
 * Postgres still required for durable ACL, RLS, concurrent revoke, and live
 * /v1 object routes. See docs/data-model/README.md.
 */

const { CATALOG } = require("./generation-errors");

const AUTH_REQUIRED = Object.freeze({
  ok: false,
  code: CATALOG.AUTH_REQUIRED.code,
  taxonomy: CATALOG.AUTH_REQUIRED.taxonomy,
  status: CATALOG.AUTH_REQUIRED.httpStatus
});

const PERMISSION_DENIED = Object.freeze({
  ok: false,
  code: CATALOG.PERMISSION_DENIED.code,
  taxonomy: CATALOG.PERMISSION_DENIED.taxonomy,
  status: CATALOG.PERMISSION_DENIED.httpStatus
});

function denyAuth() {
  return { ...AUTH_REQUIRED };
}

function denyPermission() {
  return { ...PERMISSION_DENIED };
}

function sessionSub(session) {
  if (!session || typeof session.sub !== "string") return null;
  const sub = session.sub.trim();
  return sub || null;
}

function resolveUserId(slice, session) {
  const sub = sessionSub(session);
  if (!sub) return null;
  const identities = Array.isArray(slice?.identities) ? slice.identities : [];
  const mapped = identities.find(row => row && row.sub === sub && typeof row.user_id === "string");
  if (mapped) return mapped.user_id;
  if (sub.startsWith("user_")) return sub;
  return null;
}

function byId(records, id) {
  if (!id || !Array.isArray(records)) return null;
  return records.find(record => record && record.id === id) || null;
}

function conversationOf(slice, conversationId) {
  return byId(slice.conversations, conversationId);
}

function workspaceOf(slice, workspaceId) {
  return byId(slice.workspaces, workspaceId);
}

function activeMembership(slice, userId, workspaceId) {
  if (!userId || !workspaceId) return null;
  return (slice.memberships || []).find(
    row =>
      row &&
      row.user_id === userId &&
      row.workspace_id === workspaceId &&
      row.status === "active" &&
      row.role
  ) || null;
}

function lookupResource(slice, type, id) {
  if (!slice || !type || !id) return null;
  if (type === "workspace") {
    const workspace = workspaceOf(slice, id);
    return workspace ? { type, id, workspace_id: workspace.id, record: workspace } : null;
  }
  if (type === "conversation") {
    const conversation = conversationOf(slice, id);
    return conversation
      ? { type, id, workspace_id: conversation.workspace_id, record: conversation }
      : null;
  }
  if (type === "message") {
    const message = byId(slice.messages, id);
    if (!message) return null;
    const conversation = conversationOf(slice, message.conversation_id);
    if (!conversation) return null;
    return { type, id, workspace_id: conversation.workspace_id, record: message };
  }
  if (type === "run") {
    const run = byId(slice.runs, id);
    return run ? { type, id, workspace_id: run.workspace_id, record: run } : null;
  }
  return null;
}

/**
 * @param {object} input
 * @param {object} input.slice fixture graph (users, workspaces, memberships, …)
 * @param {object|null} input.session server-derived session (readSession output)
 * @param {"workspace"|"conversation"|"message"|"run"} input.type
 * @param {string} input.id
 * @param {object} [input.claimed] client-asserted identity; never used for authz
 */
function authorizeObject({ slice, session, type, id, claimed } = {}) {
  void claimed;
  const userId = resolveUserId(slice, session);
  if (!sessionSub(session) || !userId) return denyAuth();

  const resource = lookupResource(slice, type, id);
  if (!resource || !resource.workspace_id) return denyPermission();

  const workspace = workspaceOf(slice, resource.workspace_id);
  if (!workspace || workspace.status !== "active") return denyPermission();

  const membership = activeMembership(slice, userId, resource.workspace_id);
  if (!membership) return denyPermission();

  if (type === "run" && resource.record.workspace_id !== resource.workspace_id) {
    return denyPermission();
  }

  return {
    ok: true,
    actor_user_id: userId,
    workspace_id: resource.workspace_id,
    role: membership.role,
    type,
    id
  };
}

function evaluateCase(slice, testCase) {
  const session = testCase.sub ? { sub: testCase.sub } : testCase.session || null;
  const result = authorizeObject({
    slice,
    session,
    type: testCase.type,
    id: testCase.id,
    claimed: testCase.claimed
  });
  const expected = testCase.expect;
  if (expected === "allow") {
    return result.ok === true;
  }
  if (expected === "AUTH_REQUIRED") {
    return result.ok === false && result.code === "AUTH_REQUIRED";
  }
  if (expected === "PERMISSION_DENIED") {
    return result.ok === false && result.code === "PERMISSION_DENIED";
  }
  return false;
}

module.exports = {
  AUTH_REQUIRED,
  PERMISSION_DENIED,
  resolveUserId,
  authorizeObject,
  evaluateCase
};
