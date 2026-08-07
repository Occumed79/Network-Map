import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildNpiQuery,
  dedupeNpiCandidates,
  normalizeNpiResult,
  searchNpiCustom,
} from "../src/providerSources/adapters/npi";

function rawNpi(number: number, options: { organization?: string; first?: string; last?: string; taxonomy?: string } = {}) {
  return {
    number,
    enumeration_type: options.organization ? "NPI-2" : "NPI-1",
    basic: options.organization
      ? { organization_name: options.organization }
      : { first_name: options.first || "Alex", last_name: options.last || `Provider ${number}`, credential: "MD" },
    addresses: [{
      address_purpose: "LOCATION",
      address_1: `${number % 1000} Main Street`,
      city: "Fresno",
      state: "CA",
      postal_code: "93721-0000",
      telephone_number: "5595550100",
    }],
    taxonomies: [{ code: "207Q00000X", desc: options.taxonomy || "Family Medicine", primary: true }],
  };
}

const query = buildNpiQuery({
  city: " Fresno ",
  state: " ca ",
  limit: 250,
  organization_name: "Occu-Med",
  taxonomy_code: "207Q00000X",
  enumeration_type: "NPI-2",
});
assert.equal(query.get("city"), "Fresno");
assert.equal(query.get("state"), "CA");
assert.equal(query.get("organization_name"), "Occu-Med");
assert.equal(query.get("taxonomy_code"), "207Q00000X");
assert.equal(query.get("enumeration_type"), "NPI-2");
assert.equal(query.get("limit"), "200");

const organization = normalizeNpiResult(rawNpi(1000000001, {
  organization: "Central Occupational Health",
  taxonomy: "Occupational Medicine",
}), "Occupational Medicine");
assert.ok(organization);
assert.equal(organization.name, "Central Occupational Health");
assert.equal(organization.npi, "1000000001");
assert.equal(organization.coordinateStatus, "unverified");
assert.equal(organization.trustTier, "registry");
assert.equal(organization.source, "NPI");
assert.equal(organization.taxonomy, "Occupational Medicine");

const individual = normalizeNpiResult(rawNpi(1000000002, {
  first: "Jordan",
  last: "Smith",
}), "Family Medicine");
assert.ok(individual);
assert.equal(individual.name, "Jordan Smith, MD");

const deduped = dedupeNpiCandidates([
  organization,
  { ...organization, phone: "", evidence: [] },
  individual,
]);
assert.equal(deduped.length, 2);
assert.equal(deduped[0].phone, "5595550100");

const requestedUrls: URL[] = [];
const mockFetch: typeof fetch = async (input) => {
  const url = new URL(String(input));
  requestedUrls.push(url);
  const skip = Number(url.searchParams.get("skip") || 0);
  const limit = Number(url.searchParams.get("limit") || 200);
  const available = skip === 0 ? 200 : 50;
  const rows = Array.from({ length: Math.min(limit, available) }, (_, index) =>
    rawNpi(1200000000 + skip + index, { organization: `Clinic ${skip + index}` }),
  );
  return new Response(JSON.stringify({ result_count: 250, results: rows }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

const paged = await searchNpiCustom({
  city: "Fresno",
  state: "CA",
  limit: 250,
  taxonomy_description: "Occupational Medicine",
}, { fetchImpl: mockFetch });
assert.equal(requestedUrls.length, 2);
assert.equal(requestedUrls[0].searchParams.get("skip"), null);
assert.equal(requestedUrls[0].searchParams.get("limit"), "200");
assert.equal(requestedUrls[1].searchParams.get("skip"), "200");
assert.equal(requestedUrls[1].searchParams.get("limit"), "50");
assert.equal(paged.candidates.length, 250);
assert.equal(paged.audit.rawCount, 250);
assert.equal(paged.audit.successfulQueries, 2);
assert.deepEqual(paged.audit.errors, []);

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const read = (filePath: string) => readFileSync(resolve(root, filePath), "utf8");

const centralAdapter = read("api-server/src/providerSources/adapters/npi.ts");
const customRoute = read("api-server/src/routes/npiCustomSearch.ts");
const dentalRoute = read("api-server/src/routes/dentalProviderDiscovery.ts");
const priceFinder = read("api-server/src/routes/priceFinder.ts");
const app = read("occu-med-map/src/App.tsx");
const retiredProviderSearchPath = resolve(root, "api-server/src/routes/providerSearch.ts");

assert.match(centralAdapter, /https:\/\/npiregistry\.cms\.hhs\.gov\/api\//);
assert.match(customRoute, /searchNpiCustom/);
assert.doesNotMatch(customRoute, /npiregistry\.cms\.hhs\.gov\/api/);
assert.equal(existsSync(retiredProviderSearchPath), false, "obsolete providerSearch route must remain retired");
assert.match(dentalRoute, /runUnifiedSearch/);
assert.match(dentalRoute, /sourceIds:\s*\["npi"\]/);
assert.doesNotMatch(dentalRoute, /from "\.\.\/providerSources\/adapters\/npi"/);
assert.match(priceFinder, /searchNpi as searchNpiCentral/);
assert.doesNotMatch(priceFinder, /npiregistry\.cms\.hhs\.gov\/api/);
assert.doesNotMatch(app, /npiregistry\.cms\.hhs\.gov\/api/);
assert.match(app, /fetch\('\/api\/provider-sources\/npi-custom'/);

console.log("P3 central NPI adapter smoke tests passed");
