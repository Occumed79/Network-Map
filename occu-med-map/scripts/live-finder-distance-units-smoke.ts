import assert from "node:assert/strict";
import { fmtDist, metersToMiles, normalizeResultDistMiles } from "../src/features/liveFinder/liveFinderDistance";
import { liveResultToEtaCandidate } from "../src/features/driveTime/providerCandidateAdapter";

const center = { lat: 32.7767, lng: -96.797 };
// ~4.2 miles north of the center.
const nearby = { lat: center.lat + 4.2 / 69.05, lng: center.lng };

// API rows already carry miles: keep them as-is and render "4.2 mi".
const apiMiles = normalizeResultDistMiles(4.2, center.lat, center.lng, nearby.lat, nearby.lng);
assert.equal(apiMiles, 4.2);
assert.equal(fmtDist(apiMiles), "4.2 mi");
assert.equal(normalizeResultDistMiles("4.2", center.lat, center.lng, nearby.lat, nearby.lng), 4.2);

// Missing / zero-sentinel dist falls back to a haversine computed in miles, not meters.
for (const raw of [undefined, null, "", "n/a", 0]) {
  const fallback = normalizeResultDistMiles(raw, center.lat, center.lng, nearby.lat, nearby.lng);
  assert.ok(Math.abs(fallback - 4.2) < 0.05, `fallback for ${String(raw)} should be ~4.2 mi, got ${fallback}`);
  assert.equal(fmtDist(fallback), "4.2 mi");
}

assert.ok(Math.abs(metersToMiles(6759.2) - 4.2) < 0.001);
assert.equal(fmtDist(0.05), "264 ft");
assert.equal(fmtDist(12), "12.0 mi");
assert.equal(fmtDist(Number.NaN), "—");

// Mixed API and fallback rows sort in a single unit.
const rows = [
  { name: "far-api", dist: normalizeResultDistMiles(9.5, center.lat, center.lng, 0, 0) },
  { name: "near-fallback", dist: normalizeResultDistMiles(undefined, center.lat, center.lng, nearby.lat, nearby.lng) },
  { name: "mid-api", dist: normalizeResultDistMiles(6.1, center.lat, center.lng, 0, 0) },
].sort((a, b) => a.dist - b.dist);
assert.deepEqual(rows.map((r) => r.name), ["near-fallback", "mid-api", "far-api"]);

// Drive-time adapter receives miles.
const candidate = liveResultToEtaCandidate({ id: "x", name: "Clinic", lat: nearby.lat, lng: nearby.lng, dist: apiMiles }, 0);
assert.equal(candidate?.straightMiles, 4.2);

console.log("live finder distance units smoke: ok");
