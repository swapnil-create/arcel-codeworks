# Google Cloud R0 runtime checklist

This is an infrastructure plan, not an apply script. Provision only after the
project IDs, billing owner, region and retention policy are approved.

## Resources

| Resource | Purpose | Public access |
|---|---|---|
| Cloud SQL for PostgreSQL | Canonical data, event log, approvals, ledger, transactional outbox | None |
| Cloud Storage buckets | Artifact versions and redacted/raw event references | None |
| Cloud Tasks queue | At-least-once durable run dispatch | None |
| Cloud Run worker | Private, pinned harness worker | IAM only |
| Secret Manager | Provider secrets, database credentials, connector signing material | None |
| Artifact Registry | Internally built/signed Hermes worker image by digest | None |

## Service-account separation

Create separate identities for:

1. **Run API dispatcher** — can create a task and call the minimal data-access
   surface. It cannot read artifacts or connector secrets.
2. **Worker** — can claim one run, write normalized events, settle usage and use
   its own Cloud Storage prefix. It cannot impersonate workspace users.
3. **Migration operator** — used only for controlled schema migrations; not a
   runtime identity.
4. **Connector broker** — validates short-lived bridge leases; it has no broad
   Cloud SQL or worker-administration permission.

## Provisioning order

1. Create isolated preview and production boundaries.
2. Enable audit logging, backups, deletion/retention policies and secret access
   logging before application deployment.
3. Create Cloud SQL and a non-production migration database; apply migrations
   only after real migration tests exist.
4. Create private buckets with versioning and lifecycle rules.
5. Create queue, dead-letter policy and IAM-only Cloud Run worker.
6. Publish a reviewed, signed harness image to Artifact Registry by immutable
   digest—never deploy `latest`.
7. Add only server-side configuration to Vercel/Cloud Run. Do not put any value
   in browser bundles or `.env.example`.
8. Prove the FakeHarnessAdapter run lifecycle before Hermes or AEC access.

## Do not provision yet

- Public Cloud Run ingress for the worker or local bridge.
- Broad Owner/Editor service accounts.
- Production connector secrets or AEC document files.
- A real Hermes image before version, source commit, digest and license review
  are approved.
