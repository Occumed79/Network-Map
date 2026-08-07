# Network Map database architecture and recovery

## Connection ownership

| Environment variable | Purpose | Selection rule |
| --- | --- | --- |
| `DATABASE_URL_POOLED` | Preferred provider/map database connection through the Neon pooler | Used first when present. All provider inventory, upload, map/search, audit, and operational metadata use this database. |
| `DATABASE_URL` | Provider/map database fallback/direct connection | Used only when `DATABASE_URL_POOLED` is absent. It is not a second logical provider database. |
| `DATABASE_URL_2` | Separate scoring / health-indicator database | Required by scoring routes/jobs only and checked separately for readiness. Never use it for provider inventory. |

Default pool ceilings remain intentionally small for Render/Neon: provider/map pool 4 connections, scoring pool 2. Both can be tuned only through the documented pool environment variables. The API closes both pools on `SIGTERM`/`SIGINT` after stopping new HTTP connections.

## Liveness and readiness

`/api/live` proves only that the HTTP process can respond. `/api/ready` executes bounded `SELECT 1` checks against the provider/map and scoring databases. A scoring/provider dependency failure therefore makes readiness fail without falsely reporting the process dead.

`/api/admin/database-health` exposes bounded dependency timing, pool counts, and the *names* of the selected connection variables; it never returns connection strings or credentials.

## Migrations and drift

SQL migrations live under `api-server/src/db/migrations`. New schema changes must have a repository migration and a matching schema/type change when applicable. `schema_migration_versions` records migration versions that are explicitly applied. CI's database lifecycle test verifies migration filename uniqueness, required integrity migrations, connection ownership, readiness behavior, and schema/index expectations.

No migration in this hardening program automatically drops legacy provider tables. Table removal requires a separate reconciliation report proving no live consumer/data depends on it.

## Orphan/dead-record audit

`provider_orphan_audit` is a read-only view covering master-source, master-type, and stage-raw relationships. Its expected row count is zero. Detection is intentionally separate from repair: no scheduled job automatically deletes or rewrites orphan findings.

## Transaction boundaries

Bulk provider writes must be transactional. Provider upload commits/rollbacks use explicit `BEGIN`/`COMMIT`/`ROLLBACK`, retain an immutable upload ID, and snapshot changed master rows. Search/read operations do not open unnecessary long transactions.

## Backup / restore procedure

Before schema migration or high-volume provider import:

1. Create/verify a Neon restore point or branch for the provider/map database and separately for the scoring database.
2. Record the source branch/database and deployed Git revision in the change ticket.
3. Apply the migration to a non-production/restored branch first.
4. Run `/api/ready`, provider integrity/search tests, upload preview/commit/rollback tests, and `SELECT count(*) FROM provider_orphan_audit`.
5. Only then apply to production through the normal deployment/migration procedure.

Restore verification is successful when a fresh non-production branch created from the backup can run the API typecheck/migration checks, answer both readiness probes, and reproduce representative provider counts without unexpected orphan findings. Never test restore by overwriting the production branch.

## Rollback policy

Forward-safe additive migrations are preferred. Constraint validation is deliberately separated from adding `NOT VALID` constraints when legacy records need reconciliation. For a failed deploy, roll the application back to the previous known-good Git revision and restore database state from the pre-change Neon branch/restore point only when the migration cannot safely coexist with the prior application.
