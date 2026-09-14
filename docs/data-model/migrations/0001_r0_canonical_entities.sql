-- STUB ONLY. Not applied.
-- D05 / WP-01 P3 scaffold for ARCEL Codeworks.
-- No database is provisioned in this environment. Do not run against production.
-- Persistence is not live; these tables document the R0 canonical entities from PRD §19.

BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('active', 'disabled', 'deleted')),
  display_name text,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS workspaces (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('personal', 'team')),
  status text NOT NULL CHECK (status IN ('active', 'suspended', 'deleted')),
  name text,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS memberships (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users (id),
  workspace_id text NOT NULL REFERENCES workspaces (id),
  role text NOT NULL CHECK (role IN ('owner', 'member', 'viewer')),
  status text NOT NULL CHECK (status IN ('active', 'revoked')),
  UNIQUE (user_id, workspace_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces (id),
  created_by_user_id text NOT NULL REFERENCES users (id),
  title text,
  status text NOT NULL CHECK (status IN ('active', 'archived', 'deleted')),
  parent_conversation_id text REFERENCES conversations (id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES conversations (id),
  parent_message_id text REFERENCES messages (id),
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  parts jsonb NOT NULL,
  run_id text,
  version integer NOT NULL CHECK (version >= 1),
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES conversations (id),
  workspace_id text NOT NULL REFERENCES workspaces (id),
  actor_user_id text NOT NULL REFERENCES users (id),
  status text NOT NULL CHECK (
    status IN ('queued', 'running', 'awaiting_approval', 'cancelling', 'completed', 'failed', 'cancelled')
  ),
  task_type text NOT NULL,
  model_selection jsonb,
  attempt integer NOT NULL CHECK (attempt >= 1),
  parent_run_id text REFERENCES runs (id),
  idempotency_key text NOT NULL UNIQUE,
  partial_content boolean NOT NULL DEFAULT false,
  error jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  terminal_at timestamptz
);

CREATE TABLE IF NOT EXISTS steps (
  id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES runs (id),
  ordinal integer NOT NULL CHECK (ordinal >= 1),
  kind text NOT NULL CHECK (kind IN ('policy', 'model', 'tool')),
  status text NOT NULL,
  model_registry_version text,
  started_at timestamptz,
  ended_at timestamptz,
  UNIQUE (run_id, ordinal)
);

CREATE TABLE IF NOT EXISTS tool_calls (
  id text PRIMARY KEY,
  step_id text NOT NULL REFERENCES steps (id),
  run_id text NOT NULL REFERENCES runs (id),
  name text NOT NULL,
  arguments_ref text,
  result_ref text,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed'))
);

CREATE TABLE IF NOT EXISTS usage_entries (
  id text PRIMARY KEY,
  idempotency_key text NOT NULL UNIQUE,
  run_id text NOT NULL REFERENCES runs (id),
  workspace_id text NOT NULL REFERENCES workspaces (id),
  provider text,
  provider_cost_usd numeric,
  user_charge_units integer,
  kind text NOT NULL CHECK (kind IN ('reservation', 'settlement', 'release')),
  status text NOT NULL CHECK (status IN ('reserved', 'settled', 'released')),
  created_at timestamptz NOT NULL
);

COMMENT ON TABLE usage_entries IS 'Append-only ledger skeleton. Application must insert-only; updates are reconciliation metadata only.';
COMMENT ON TABLE memberships IS 'Authorization uses user_id + workspace_id + role. Never authorize from display_name.';
COMMENT ON TABLE runs IS 'Terminal statuses are immutable except admin reconciliation; retries insert linked attempts.';

COMMIT;
