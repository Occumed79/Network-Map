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
const migration = readFileSync(resolve(here, "../src/db/migrations/20260713_p1_data_stabilization.sql"), "utf8");
assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.provider_schema_state/);
assert.match(migration, /canonical_read_enabled boolean NOT NULL DEFAULT false/);
assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.provider_quarantine/);
assert.match(migration, /CREATE OR REPLACE VIEW public\.provider_map_eligible/);
assert.match(migration, /CREATE OR REPLACE VIEW public\.provider_duplicate_candidates/);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.network_map_migrate_legacy_batch/);
assert.match(migration, /pg_stat_statements/);
assert.doesNotMatch(migration, /DELETE FROM public\.medical_providers/i);
assert.doesNotMatch(migration, /DROP TABLE public\.medical_providers/i);

console.log("P1 data stabilization smoke tests passed");
