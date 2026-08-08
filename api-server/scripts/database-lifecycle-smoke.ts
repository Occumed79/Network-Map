import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const repoRoot = path.resolve(root, "..");
const dbIndex = fs.readFileSync(path.join(repoRoot, "lib/db/src/index.ts"), "utf8");
const apiIndex = fs.readFileSync(path.join(root, "src/index.ts"), "utf8");
const health = fs.readFileSync(path.join(root, "src/routes/health.ts"), "utf8");
const explorer = fs.readFileSync(path.join(root, "src/routes/providerExplorer.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "src/db/migrations/20260806_database_lifecycle.sql"), "utf8");
const docs = fs.readFileSync(path.join(repoRoot, "DATABASE_ARCHITECTURE.md"), "utf8");
const migrationDir = path.join(root, "src/db/migrations");
const migrationFiles = fs.readdirSync(migrationDir).filter((file) => file.endsWith(".sql")).sort();

assert.equal(new Set(migrationFiles).size, migrationFiles.length, "migration filenames must be unique");
for (const required of [
  "20260806_provider_coordinate_integrity.sql",
  "20260806_provider_upload_lifecycle.sql",
  "20260806_api_security.sql",
  "20260806_database_lifecycle.sql",
]) assert.ok(migrationFiles.includes(required), `required hardening migration missing: ${required}`);

assert.match(dbIndex, /DATABASE_URL_POOLED \|\| process\.env\.DATABASE_URL/, "provider database selection must prefer pooled URL and fall back to DATABASE_URL");
assert.match(dbIndex, /DATABASE_URL_2/, "scoring database must have separate explicit ownership");
assert.match(dbIndex, /closeDatabasePools/, "database package must expose graceful pool closure");
assert.match(dbIndex, /Promise\.allSettled\(targets\.map\(\(target\) => target\.end\(\)\)\)/, "both pools must close during shutdown");
assert.match(dbIndex, /checkRequiredDatabases/, "database package must expose bounded readiness checks");
assert.match(dbIndex, /SELECT 1 AS ok/, "readiness must execute a real database query");
assert.match(dbIndex, /getPoolDiagnostics/, "pool diagnostics must be inspectable without exposing URLs");
assert.match(apiIndex, /SIGTERM/, "Render shutdown must handle SIGTERM");
assert.match(apiIndex, /SIGINT/, "interactive shutdown must handle SIGINT");
assert.match(apiIndex, /server\.close/, "shutdown must stop accepting HTTP requests before pool closure");
assert.match(apiIndex, /closeDatabasePools/, "shutdown must close database pools");
assert.match(health, /router\.get\("\/live"/, "liveness endpoint is required");
assert.match(health, /router\.get\("\/ready"/, "readiness endpoint is required");
assert.match(health, /checkRequiredDatabases/, "readiness must check both required databases");
assert.match(migration, /CREATE EXTENSION IF NOT EXISTS pgcrypto/, "UUID extension ownership must live in a migration");
assert.match(migration, /schema_migration_versions/, "migration version tracking table is required");
assert.match(migration, /provider_candidates/, "Provider Explorer candidate persistence must be migration-owned");
assert.match(migration, /provider_outreach_targets/, "Provider Explorer outreach persistence must be migration-owned");
assert.match(migration, /provider_orphan_audit/, "orphan-record detection view is required");
assert.match(migration, /provider_master_bounds_idx/, "viewport-bound provider index is required");
assert.match(migration, /provider_master_source_type_idx/, "source/type provider index is required");
assert.doesNotMatch(explorer, /CREATE\s+(?:EXTENSION|TABLE|INDEX)|ALTER\s+TABLE/i, "Provider Explorer request handlers must not own schema DDL");
assert.doesNotMatch(explorer, /UPDATE\s+provider_candidates\s+SET\s+geog/i, "Provider Explorer reads must not backfill schema/data at request time");
assert.match(explorer, /to_regclass\('public\.provider_candidates'\)/, "Provider Explorer must detect candidate schema read-only");
assert.match(explorer, /Provider Explorer persistence migration is not applied/, "candidate writes must fail clearly when migration is missing");
assert.match(explorer, /setup\.candidatePersistence[\s\S]*queryCandidates/, "candidate reads must be conditional on migration readiness");
assert.match(docs, /DATABASE_URL_POOLED/, "database connection ownership must be documented");
assert.match(docs, /Runtime request handlers must not create extensions, tables, or indexes/, "runtime schema ownership must be documented as migration-only");
assert.match(docs, /Backup \/ restore procedure/, "backup/restore verification must be documented");
assert.match(docs, /Never test restore by overwriting the production branch/, "restore procedure must explicitly protect production");

console.log(`Database lifecycle/schema consistency smoke passed across ${migrationFiles.length} SQL migrations.`);
