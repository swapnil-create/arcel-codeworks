-- STUB ONLY. Not applied.
-- R0 additions for the CodeWorks agent-harness boundary.
-- Apply only through a reviewed migration runner against an isolated Cloud SQL
-- test database. Do not run manually against production.

BEGIN;

CREATE TABLE IF NOT EXISTS projects (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces (id),
  created_by_user_id text NOT NULL REFERENCES users (id),
  name text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'archived', 'deleted')),
  instructions_version text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS workflows (
  id text PRIMARY KEY,
  workspace_id text REFERENCES workspaces (id),
  name text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'retired')),
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS workflow_versions (
  id text PRIMARY KEY,
  workflow_id text NOT NULL REFERENCES workflows (id),
  version text NOT NULL,
  manifest_digest text NOT NULL,
  manifest_ref text NOT NULL,
  allowed_tool_manifest_digest text NOT NULL,
  created_by_user_id text NOT NULL REFERENCES users (id),
  created_at timestamptz NOT NULL,
  UNIQUE (workflow_id, version),
  UNIQUE (workflow_id, manifest_digest)
);

ALTER TABLE runs ALTER COLUMN conversation_id DROP NOT NULL;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS project_id text REFERENCES projects (id);
ALTER TABLE runs ADD COLUMN IF NOT EXISTS workflow_version_id text REFERENCES workflow_versions (id);
ALTER TABLE runs ADD COLUMN IF NOT EXISTS adapter_name text;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS adapter_contract_version text;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS adapter_build_sha text;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS harness_version text;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS container_digest text;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS model_policy_digest text;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS tool_manifest_digest text;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS budget_limit_usd numeric;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS budget_reserved_usd numeric;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS terminal_reason text;

CREATE TABLE IF NOT EXISTS run_events (
  id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES runs (id),
  seq bigint NOT NULL CHECK (seq > 0),
  type text NOT NULL,
  payload jsonb NOT NULL,
  payload_hash text NOT NULL,
  occurred_at timestamptz NOT NULL,
  native_harness text,
  native_event_key text,
  raw_payload_ref text,
  created_at timestamptz NOT NULL,
  UNIQUE (run_id, seq),
  UNIQUE (run_id, native_harness, native_event_key)
);

CREATE TABLE IF NOT EXISTS approvals (
  id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES runs (id),
  tool_call_id text,
  workspace_id text NOT NULL REFERENCES workspaces (id),
  project_id text NOT NULL REFERENCES projects (id),
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  action_type text NOT NULL,
  payload_hash text NOT NULL,
  source_document_id text NOT NULL,
  source_document_version text NOT NULL,
  workflow_version_id text NOT NULL REFERENCES workflow_versions (id),
  requested_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  decided_by_user_id text REFERENCES users (id),
  decided_at timestamptz,
  decision_reason text,
  UNIQUE (run_id, payload_hash)
);

CREATE TABLE IF NOT EXISTS artifacts (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces (id),
  project_id text NOT NULL REFERENCES projects (id),
  originating_run_id text REFERENCES runs (id),
  status text NOT NULL CHECK (status IN ('active', 'superseded', 'deleted')),
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS artifact_versions (
  id text PRIMARY KEY,
  artifact_id text NOT NULL REFERENCES artifacts (id),
  version integer NOT NULL CHECK (version >= 1),
  storage_ref text NOT NULL,
  content_hash text NOT NULL,
  source_document_id text,
  source_document_version text,
  created_at timestamptz NOT NULL,
  UNIQUE (artifact_id, version),
  UNIQUE (artifact_id, content_hash)
);

CREATE TABLE IF NOT EXISTS connections (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces (id),
  project_id text REFERENCES projects (id),
  connector_type text NOT NULL,
  credential_ref text NOT NULL,
  device_id text,
  document_id text,
  document_version text,
  status text NOT NULL CHECK (status IN ('active', 'revoked', 'expired')),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS budget_policies (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces (id),
  project_id text REFERENCES projects (id),
  workflow_version_id text REFERENCES workflow_versions (id),
  max_run_cost_usd numeric NOT NULL CHECK (max_run_cost_usd >= 0),
  approval_threshold_usd numeric NOT NULL CHECK (approval_threshold_usd >= 0),
  status text NOT NULL CHECK (status IN ('active', 'retired')),
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox_events (
  id text PRIMARY KEY,
  topic text NOT NULL,
  aggregate_id text NOT NULL,
  payload jsonb NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('pending', 'dispatched', 'failed')),
  available_at timestamptz NOT NULL,
  dispatched_at timestamptz,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id text PRIMARY KEY,
  workspace_id text REFERENCES workspaces (id),
  actor_user_id text REFERENCES users (id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  safe_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL
);

ALTER TABLE tool_calls ADD COLUMN IF NOT EXISTS classification text;
ALTER TABLE tool_calls ADD COLUMN IF NOT EXISTS arguments_hash text;
ALTER TABLE tool_calls ADD COLUMN IF NOT EXISTS result_hash text;
ALTER TABLE tool_calls ADD COLUMN IF NOT EXISTS policy_digest text;
ALTER TABLE tool_calls ADD COLUMN IF NOT EXISTS requested_at timestamptz;
ALTER TABLE tool_calls ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE tool_calls ADD COLUMN IF NOT EXISTS connection_id text REFERENCES connections (id);
ALTER TABLE tool_calls ADD COLUMN IF NOT EXISTS source_document_id text;
ALTER TABLE tool_calls ADD COLUMN IF NOT EXISTS source_document_version text;

CREATE INDEX IF NOT EXISTS run_events_replay_idx ON run_events (run_id, seq);
CREATE INDEX IF NOT EXISTS runs_workspace_status_idx ON runs (workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS approvals_pending_idx ON approvals (run_id, status, expires_at);
CREATE INDEX IF NOT EXISTS outbox_pending_idx ON outbox_events (status, available_at);

COMMENT ON TABLE run_events IS 'Immutable canonical events. Persist before browser fan-out.';
COMMENT ON TABLE approvals IS 'Approval payload hash binds the exact tool action and source document version.';
COMMENT ON TABLE outbox_events IS 'Written in the run-creation transaction; a worker dispatch retry must not duplicate a run or debit.';
COMMENT ON TABLE connections IS 'Only encrypted credential references are stored; no connector secret or local path is persisted.';

COMMIT;
