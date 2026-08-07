import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  assessProviderIntegrity,
  coordinateAllowed,
  coordinateStatusFromLegacy,
  detectNearDuplicateLocations,
  isValidNpi,
} from "../src/providerSources/integrity";
import type { ProviderCandidate } from "../src/providerSources/types";

const candidate = (overrides: Partial<ProviderCandidate> = {}): ProviderCandidate => ({
  id: "test-1",
  name: "Integrity Clinic",
  address: "123 Main St",
  city: "Fresno",
  state: "CA",
  postalCode: "93721",
  country: "US",
  phone: "",
  website: "",
  coordinateStatus: "unverified",
  source: "test",
  confidence: "medium",
  trustTier: "directory",
  score: 50,
  badges: [],
  evidence: [],
  ...overrides,
});

// Legacy labels must be normalized conservatively. An imported/geocoded point
// is useful, but it is not evidence of an exact rooftop coordinate.
assert.equal(coordinateStatusFromLegacy("imported", true), "verified_address");
assert.equal(coordinateStatusFromLegacy("geocoded", true), "verified_address");
assert.equal(coordinateStatusFromLegacy("address", true), "verified_address");
assert.equal(coordinateStatusFromLegacy("verified", true), "verified_exact");
assert.equal(coordinateStatusFromLegacy("exact", true), "verified_exact");
assert.equal(coordinateStatusFromLegacy("city_centroid", true), "city_centroid");
assert.equal(coordinateStatusFromLegacy("imported", false), "invalid");
assert.equal(coordinateStatusFromLegacy("verified_exact", false), "invalid");
assert.equal(coordinateStatusFromLegacy("unverified", false), "unverified");
assert.equal(coordinateAllowed("city_centroid", "address_or_better"), false);
assert.equal(coordinateAllowed("verified_address", "address_or_better"), true);
assert.equal(coordinateAllowed("verified_exact", "exact_only"), true);
assert.equal(coordinateAllowed("verified_address", "exact_only"), false);
assert.equal(coordinateAllowed("invalid", "include_unverified"), false);

assert.equal(assessProviderIntegrity(candidate({ lat: 91, lng: -119, coordinateStatus: "verified_exact" })).coordinateStatus, "invalid");
assert.equal(assessProviderIntegrity(candidate({ lat: 36.7, lng: undefined, coordinateStatus: "verified_exact" })).quarantined, true);
assert.equal(assessProviderIntegrity(candidate({ country: "US", state: "ZZ" })).quarantined, true);
assert.equal(
  assessProviderIntegrity(candidate({ lat: 36.7378, lng: -119.7871, coordinateStatus: "verified_address" })).coordinateStatus,
  "verified_address",
);

// CMS example NPI with a valid checksum.
assert.equal(isValidNpi("1234567893"), true);
assert.equal(isValidNpi("1234567890"), false);

const near = detectNearDuplicateLocations([
  candidate({ id: "a", lat: 36.7378, lng: -119.7871, coordinateStatus: "verified_exact" }),
  candidate({ id: "b", lat: 36.73781, lng: -119.78711, coordinateStatus: "verified_exact" }),
]);
assert.deepEqual(near, [["a", "b"]]);

const repoRoot = path.resolve(process.cwd(), "..");
const migration = fs.readFileSync(path.join(process.cwd(), "src/db/migrations/20260806_provider_coordinate_integrity.sql"), "utf8");
for (const status of ["verified_exact", "verified_address", "city_centroid", "unverified", "invalid"]) {
  assert.match(migration, new RegExp(status), `migration must include ${status}`);
}
assert.match(migration, /CHECK \(coordinate_status IN/, "database must constrain coordinate state");
assert.match(migration, /lat BETWEEN -90 AND 90/, "database must validate latitude range");
assert.match(migration, /lng BETWEEN -180 AND 180/, "database must validate longitude range");
assert.match(migration, /NOT VALID/, "migration must not blindly validate legacy rows before audit");

const geocode = fs.readFileSync(path.join(process.cwd(), "src/providerSources/geocode.ts"), "utf8");
assert.doesNotMatch(geocode, /jitter/i, "geocoding must not fabricate coordinate jitter");
assert.match(geocode, /verified_address/, "address geocoder must label verified-address coordinates");
const orchestrator = fs.readFileSync(path.join(process.cwd(), "src/providerSources/orchestrator.ts"), "utf8");
assert.match(orchestrator, /applyProviderIntegrity/, "orchestrator must assess every normalized candidate");
assert.match(orchestrator, /quarantinedResults/, "orchestrator must preserve quarantined rows for audit");
assert.match(orchestrator, /coordinatePolicy/, "orchestrator must support selectable coordinate accuracy policy");
const schema = fs.readFileSync(path.join(repoRoot, "lib/db/src/schema/providers.ts"), "utf8");
assert.match(schema, /quarantineStatus/, "provider schema must persist quarantine state");
assert.match(schema, /integrityFindings/, "provider schema must persist integrity findings");
assert.match(schema, /coordinateSource/, "location schema must persist coordinate provenance");

console.log("Provider coordinate/data integrity smoke tests passed.");
