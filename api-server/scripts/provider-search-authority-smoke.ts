import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { dedupeCandidates } from "../src/providerSources/dedupe";
import { haversineMiles, isValidCoordinate, withinRadiusMiles } from "../src/providerSources/distance";
import { getBaselineProviderSources, getNpiTaxonomies } from "../src/providerSources/serviceRouting";
import type { ProviderCandidate } from "../src/providerSources/types";

const root = path.resolve(process.cwd());
const repoRoot = path.resolve(root, "..");
const read = (relative: string) => fs.readFileSync(path.join(repoRoot, relative), "utf8");

assert.deepEqual(getBaselineProviderSources("liveFinder"), ["mapinventory", "osm"]);
assert.ok(getNpiTaxonomies("dental").some((taxonomy) => /Dentist/.test(taxonomy)));
assert.equal(isValidCoordinate(36.7, -119.8), true);
assert.equal(isValidCoordinate(91, 0), false);
assert.ok(haversineMiles(36.7378, -119.7871, 36.7378, -119.7871) < 0.001);
assert.equal(withinRadiusMiles(36.7378, -119.7871, 37.7749, -122.4194, 10), false);

const base = (overrides: Partial<ProviderCandidate>): ProviderCandidate => ({
  id: "candidate",
  name: "Test Clinic",
  address: "123 Main Street",
  city: "Fresno",
  state: "CA",
  postalCode: "93721",
  phone: "5595550100",
  website: "",
  coordinateStatus: "unverified",
  source: "test",
  confidence: "medium",
  trustTier: "directory",
  score: 20,
  badges: [],
  evidence: [],
  ...overrides,
});
const deduped = dedupeCandidates([
  base({ id: "npi-a", npi: "1234567890", source: "NPI", address: "123 Main St" }),
  base({ id: "other-a", npi: "1234567890", source: "Other", address: "123 Main Avenue", phone: "" }),
]);
assert.equal(deduped.length, 1, "same NPI must dedupe even when secondary fields differ");
assert.deepEqual(new Set(deduped[0]._rawSources), new Set(["NPI", "Other"]));

const frontendRoots = [
  "occu-med-map/src",
];
for (const relativeRoot of frontendRoots) {
  const directory = path.join(repoRoot, relativeRoot);
  const stack = [directory];
  while (stack.length) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const source = fs.readFileSync(full, "utf8");
        assert.doesNotMatch(source, /npiregistry\.cms\.hhs\.gov\/api/i, `browser source must not call NPPES directly: ${path.relative(repoRoot, full)}`);
        assert.doesNotMatch(source, /fetch\([^\n]*(?:overpass-api|overpass\.kumi|openstreetmap\.ru)/i, `browser source must not call Overpass directly: ${path.relative(repoRoot, full)}`);
      }
    }
  }
}

assert.equal(fs.existsSync(path.join(repoRoot, "occu-med-map/src/features/liveFinder/liveFinderSearch.ts")), false, "obsolete browser Overpass implementation must stay deleted");
assert.equal(fs.existsSync(path.join(repoRoot, "api-server/src/routes/providerSearch.ts")), false, "obsolete legacy provider search route must stay deleted");
const routesIndex = read("api-server/src/routes/index.ts");
assert.doesNotMatch(routesIndex, /providerSearchRouter|\.\/providerSearch/, "legacy provider search route must not be mounted");
const liveFinder = read("api-server/src/routes/liveFinder.ts");
assert.match(liveFinder, /runUnifiedSearch/, "Live Finder must delegate to the authoritative orchestrator");
assert.doesNotMatch(liveFinder, /overpass-api\.de|buildOverpassQuery|queryMirror/, "Live Finder route must not own an Overpass implementation");
const dental = read("api-server/src/routes/dentalProviderDiscovery.ts");
assert.match(dental, /runUnifiedSearch/, "Dental discovery must use the authoritative orchestrator");
assert.doesNotMatch(dental, /searchNpi\(/, "Dental discovery must not bypass the orchestrator");
const npi = read("api-server/src/providerSources/adapters/npi.ts");
assert.doesNotMatch(npi, /export const NPI_TAXONOMY_MAP/, "NPI taxonomy routing must not be duplicated inside the adapter");
assert.match(npi, /getNpiTaxonomies/, "NPI adapter must consume centralized taxonomy routing");
const orchestrator = read("api-server/src/providerSources/orchestrator.ts");
assert.match(orchestrator, /getBaselineProviderSources/, "orchestrator must consume centralized source routing");
assert.match(orchestrator, /searchOpenStreetMap/, "OpenStreetMap must be an orchestrator-owned backend adapter");
assert.match(orchestrator, /sourceIds/, "orchestrator must support explicit deterministic source selection");

console.log("Provider search authority smoke tests passed.");
