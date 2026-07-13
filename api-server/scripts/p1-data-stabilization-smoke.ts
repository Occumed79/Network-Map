import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  canonicalMapEligibilitySql,
  isMapEligibleCoordinatePair,
  isUsableProviderName,
  legacyMapEligibilitySql,
  normalizedProviderName,
  providerQualityReasons,
} from "../src/lib/providerDataQuality";

assert.equal(normalizedProviderName("  Fresno Occupational-Medicine, Inc. "), "fresno occupational medicine inc");
assert.equal(isUsableProviderName("Fresno Occupational Medicine"), true);
assert.equal(isUsableProviderName("nan"), false);
assert.equal(isUsableProviderName("Unnamed clinic"), false);
assert.equal(isUsableProviderName("   "), false);

assert.equal(isMapEligibleCoordinatePair({ lat: 36.7378, lng: -119.7871 }), true);
assert.equal(isMapEligibleCoordinatePair({ lat: 0, lng: 0 }), false);
assert.equal(isMapEligibleCoordinatePair({ lat: 91, lng: 10 }), false);
assert.equal(isMapEligibleCoordinatePair({ lat: "", lng: "" }), false);

assert.deepEqual(
  providerQualityReasons({ name: "nan", address: "nan", lat: 0, lng: 0 }).sort(),
  ["placeholder_address", "placeholder_name", "zero_coordinates"].sort(),
);
assert.deepEqual(
  providerQualityReasons({ name: "Valid Clinic", address: "123 Main St", lat: 36.7, lng: -119.8 }),
  [],
);

const legacySql = legacyMapEligibilitySql("mp");
assert.match(legacySql, /mp\.lat BETWEEN -90 AND 90/);
assert.match(legacySql, /mp\.lat <> 0 OR mp\.lng <> 0/);
assert.match(legacySql, /unnamed clinic/);

const canonicalSql = canonicalMapEligibilitySql("pm");
assert.match(canonicalSql, /pm\.active = true/);
assert.match(canonicalSql, /placeholder|unnamed clinic/);

const here = dirname(fileURLToPath(import.meta.url));
const migrationRoot = resolve(here, "../src/db/migrations");
const schemaMigration = readFileSync(
  resolve(migrationRoot, "20260713_p1_data_stabilization_01_schema.sql"),
  "utf8",
);
const quarantineFunction = readFileSync(
  resolve(migrationRoot, "20260713_p1_data_stabilization_02_quarantine_function.sql"),
  "utf8",
);
const migrateFunction = readFileSync(
  resolve(migrationRoot, "20260713_p1_data_stabilization_03_migrate_function.sql"),
  "utf8",
);
const monitoringMigration = readFileSync(
  resolve(migrationRoot, "20260713_p1_data_stabilization_04_query_monitoring.sql"),
  "utf8",
);
const allMigrations = [schemaMigration, quarantineFunction, migrateFunction, monitoringMigration].join("\n");

assert.match(schemaMigration, /CREATE TABLE IF NOT EXISTS public\.provider_schema_state/);
assert.match(schemaMigration, /canonical_read_enabled boolean NOT NULL DEFAULT false/);
assert.match(schemaMigration, /CREATE TABLE IF NOT EXISTS public\.provider_quarantine/);
assert.match(schemaMigration, /CREATE OR REPLACE VIEW public\.provider_map_eligible/);
assert.match(schemaMigration, /CREATE OR REPLACE VIEW public\.provider_duplicate_candidates/);
assert.match(quarantineFunction, /CREATE OR REPLACE FUNCTION public\.network_map_refresh_quarantine/);
assert.match(quarantineFunction, /\$network_map_refresh_quarantine\$/);
assert.match(migrateFunction, /CREATE OR REPLACE FUNCTION public\.network_map_migrate_legacy_batch/);
assert.match(migrateFunction, /DISTINCT ON \(master_key\)/);
assert.match(migrateFunction, /DISTINCT ON \(source_key, source_record_id\)/);
assert.match(monitoringMigration, /pg_stat_statements/);
assert.doesNotMatch(allMigrations, /DO \$\$/);
assert.doesNotMatch(allMigrations, /DELETE FROM public\.medical_providers/i);
assert.doesNotMatch(allMigrations, /DROP TABLE public\.medical_providers/i);

console.log("P1 data stabilization smoke tests passed");
