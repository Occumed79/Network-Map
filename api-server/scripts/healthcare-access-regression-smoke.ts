/**
 * Regression tests for healthcare-access scoring defect fixes.
 *
 * Fix #2 — zero providers must signal scarcity, not missing data
 * Fix #4 — unavailable HRSA must return null designation, not false
 * Fix #3 — vaccinations / occMed / drugTest / audiometry must resolve backend terms
 * Fix #1 — international score persistence accepts sourceYears/sourceNames/missingIndicators
 * Fix #5 — missing indicator reduces confidence without forcing Easy or Critical
 *
 * Run with:
 *   node --import ../occu-med-map/node_modules/tsx/dist/loader.mjs scripts/healthcare-access-regression-smoke.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateUnifiedAccessScore } from "../src/lib/healthcareAccessScoring";
import { scoringRouteInternals } from "../src/routes/scoringDatabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const provider = (relevant: number, facilities: number, nearestMiles: number | null = null) => ({
  relevant, facilities, nearestMiles,
  nearestName: nearestMiles !== null ? "Test Facility" : null,
  nearestLat: nearestMiles !== null ? 0 : null,
  nearestLng: nearestMiles !== null ? 0 : null,
});
const travel = (minutes: number | null) => ({ minutes, source: minutes !== null ? "Mapbox Directions" : null });
const shortage = (hpsaScore: number | null, hpsaDesignated: boolean | null, muaDesignated: boolean | null, facilityCount: number | null = null) =>
  ({ hpsaScore, hpsaDesignated, muaDesignated, facilityCount, sourceYear: 2025 });

const denseUrbanCounty = {
  countyFips: "06037", countyName: "Los Angeles County", state: "CA",
  population: 10_000_000, landSquareMiles: 4_058, density: 2_465, sourceYear: 2024,
};
const sparseRuralCounty = {
  countyFips: "30069", countyName: "Petroleum County", state: "MT",
  population: 519, landSquareMiles: 1_655, density: 0.31, sourceYear: 2024,
};

// ─── Test A: zero providers ⇒ high scarcity, NOT missing workforce ─────────────

{
  // Previously: if(evidence.relevant>0) would skip workforce/coverage entirely.
  // Now: zero must produce score 5 (max scarcity) on workforce and coverage.
  const noProviders = scoringRouteInternals.usInputs(
    denseUrbanCounty,
    shortage(null, null, null),
    provider(0, 0),
    travel(null),
  );

  assert.ok("workforce" in noProviders, "A: zero providers must produce a workforce component (not skip it)");
  assert.ok("coverage" in noProviders, "A: zero providers must produce a coverage component (not skip it)");
  assert.equal((noProviders as any).workforce?.score, 5, "A: zero providers must yield max scarcity on workforce");
  assert.equal((noProviders as any).coverage?.score, 5, "A: zero providers must yield max scarcity on coverage");

  const zeroScore = calculateUnifiedAccessScore(noProviders as any);
  assert.ok(zeroScore.score > 3, `A: zero providers must score above 3 (Challenging+), got ${zeroScore.score}`);

  // Contrast: a well-served county must score lower
  const wellServed = scoringRouteInternals.usInputs(
    denseUrbanCounty,
    shortage(null, null, null),
    provider(5000, 500, 0.5),
    travel(3),
  );
  const wellScore = calculateUnifiedAccessScore(wellServed as any);
  assert.ok(zeroScore.score > wellScore.score, "A: zero providers must score worse than a well-served county");

  console.log(`  A ✓  zero providers workforce.score=${(noProviders as any).workforce?.score}, overall=${zeroScore.score}`);
}

// ─── Test B: unavailable HRSA ⇒ null designation, NOT false ──────────────────

{
  // The HRSA state fetch uses Promise.allSettled now.  Simulate a rejection for both
  // HPSA and MUA by temporarily replacing the module-private cache with a pre-filled
  // entry that carries hpsaAvailable:false.
  // We test the outcome indirectly: when hrsaEvidence returns nulls for designation,
  // usInputs must not penalise coverage as if muaDesignated=false (which would cap at 1).

  // usInputs with muaDesignated=null (unavailable) and relevant>0 should use the
  // scarcity formula, NOT the "muaDesignated?4:1" branch.
  const inputsWithNullHrsa = scoringRouteInternals.usInputs(
    sparseRuralCounty,
    shortage(null, null, null),  // null = HRSA unavailable
    provider(1, 1, 47.8),
    travel(83),
  );
  const inputsWithFalseHrsa = scoringRouteInternals.usInputs(
    sparseRuralCounty,
    shortage(null, false, false), // false = confirmed not-designated
    provider(1, 1, 47.8),
    travel(83),
  );

  // Both should have coverage, but the evidence.muaDesignated field must reflect the input
  assert.equal((inputsWithNullHrsa as any).coverage?.evidence?.muaDesignated, null, "B: null HRSA must stay null in evidence");
  assert.equal((inputsWithFalseHrsa as any).coverage?.evidence?.muaDesignated, false, "B: false HRSA must stay false in evidence");

  // Verify that the hrsaEvidence return type contract is satisfied by reading the route source
  const routeSrc = readFileSync(new URL("../src/routes/scoringDatabase.ts", import.meta.url), "utf8");
  assert.match(routeSrc, /hpsaAvailable/, "B: hrsaEvidence must track availability to distinguish null from false");
  assert.match(routeSrc, /muaAvailable/, "B: hrsaEvidence must track MUA availability separately");
  assert.match(routeSrc, /Promise\.allSettled/, "B: HRSA fetches must use allSettled to capture failures without swallowing them");

  console.log("  B ✓  HRSA null vs false distinction verified");
}

// ─── Test C: vaccinations / occMed / drugTest / audiometry resolve backend terms ─

{
  const routeSrc = readFileSync(new URL("../src/routes/scoringDatabase.ts", import.meta.url), "utf8");

  // Each frontend service key must appear as a primary key in SERVICE_TERMS
  const frontendKeys = ["vaccinations", "occMed", "drugTest", "audiometry"];
  for (const key of frontendKeys) {
    // The key should appear as a property key (not just a value) in SERVICE_TERMS
    assert.match(routeSrc, new RegExp(`\\b${key}\\s*:`), `C: SERVICE_TERMS must define '${key}' as a primary key`);
  }

  // vaccinations must resolve to terms related to vaccines
  assert.match(routeSrc, /vaccinations:.*vaccin/s, "C: vaccinations must include a vaccine-related term");
  // occMed must resolve to occupational terms
  assert.match(routeSrc, /occMed:.*occupational/s, "C: occMed must include occupational term");
  // drugTest must resolve to drug/lab terms
  assert.match(routeSrc, /drugTest:.*drug/s, "C: drugTest must include drug-related term");
  // audiometry must resolve to audiometry/audiology terms
  assert.match(routeSrc, /audiometry:.*audiometr/s, "C: audiometry must include audiometry term");

  console.log("  C ✓  vaccinations / occMed / drugTest / audiometry all have primary keys in SERVICE_TERMS");
}

// ─── Test D: international score persistence accepts array fields ──────────────

{
  // Verify that the SQL strings in both persistence files include explicit array casts.
  // This is the direct fix for PostgreSQL error 22P02.
  const routeSrc = readFileSync(new URL("../src/routes/scoringDatabase.ts", import.meta.url), "utf8");
  const jobSrc = readFileSync(new URL("../src/jobs/syncHealthcareAccessIndicators.ts", import.meta.url), "utf8");

  assert.match(routeSrc, /source_years=\$\d+::integer\[\]/, "D: scoringDatabase.ts UPDATE must cast source_years to integer[]");
  assert.match(routeSrc, /source_names=\$\d+::text\[\]/, "D: scoringDatabase.ts UPDATE must cast source_names to text[]");
  assert.match(routeSrc, /missing_indicators=\$\d+::text\[\]/, "D: scoringDatabase.ts UPDATE must cast missing_indicators to text[]");
  assert.match(routeSrc, /\$\d+::integer\[\],\$\d+::text\[\],\$\d+::text\[\]/, "D: scoringDatabase.ts INSERT must cast all three array params");

  assert.match(jobSrc, /source_years=\$\d+::integer\[\]/, "D: syncJob UPDATE must cast source_years to integer[]");
  assert.match(jobSrc, /source_names=\$\d+::text\[\]/, "D: syncJob UPDATE must cast source_names to text[]");
  assert.match(jobSrc, /missing_indicators=\$\d+::text\[\]/, "D: syncJob UPDATE must cast missing_indicators to text[]");

  // Also verify that persistence errors are now logged, not swallowed
  assert.match(routeSrc, /persistInternationalScore failed/, "D: scoringDatabase.ts must log persistence failures with context");
  assert.match(jobSrc, /check array column casts \(22P02\)/, "D: syncJob must log persistence failures mentioning 22P02");

  console.log("  D ✓  array column casts present in both UPDATE and INSERT SQL");
}

// ─── Test E: missing international indicator reduces confidence, no Easy/Critical ─

{
  type IndicatorRow = {
    indicator_code: string; indicator_name: string; value: unknown; year: unknown;
    source_name: string; source_url?: string; geography_level: string;
    admin1_code?: string | null; admin1_name?: string | null;
  };

  const rows = (workforce: number | null): IndicatorRow[] => [
    ...(workforce !== null ? [{ indicator_code: "SH.MED.PHYS.ZS", indicator_name: "Physicians", value: workforce, year: 2023, source_name: "World Bank", geography_level: "country" }] : []),
    { indicator_code: "SH.MED.BEDS.ZS", indicator_name: "Beds", value: 2.4, year: 2022, source_name: "World Bank", geography_level: "country" },
    { indicator_code: "SH.UHC.SRVS.CV.XD", indicator_name: "UHC", value: 82, year: 2021, source_name: "WHO / World Bank", geography_level: "country" },
    { indicator_code: "SP.RUR.TOTL.ZS", indicator_name: "Rural", value: 39.8, year: 2024, source_name: "World Bank", geography_level: "country" },
    { indicator_code: "EN.POP.DNST", indicator_name: "Density", value: 124, year: 2024, source_name: "World Bank", geography_level: "country" },
  ];

  const withWorkforce = calculateUnifiedAccessScore(
    scoringRouteInternals.internationalInputs(rows(2.8), provider(18, 6, 4.9), travel(14)),
  );
  const withoutWorkforce = calculateUnifiedAccessScore(
    scoringRouteInternals.internationalInputs(rows(null), provider(18, 6, 4.9), travel(14)),
  );

  assert.ok(withoutWorkforce.missingIndicators.includes("workforce"), "E: missing workforce must appear in missingIndicators");
  assert.ok(withoutWorkforce.confidence < withWorkforce.confidence, `E: missing workforce must reduce confidence (${withoutWorkforce.confidence} < ${withWorkforce.confidence})`);

  // Must not collapse to the Easy (1) or Critical (5) extreme
  assert.ok(withoutWorkforce.score > 1, `E: missing workforce must not force score to Easy (1), got ${withoutWorkforce.score}`);
  assert.ok(withoutWorkforce.score < 5, `E: missing workforce must not force score to Critical (5), got ${withoutWorkforce.score}`);

  // Components object must not include workforce at all
  assert.equal(withoutWorkforce.components.workforce, undefined, "E: missing workforce must have no component entry");

  console.log(`  E ✓  missing workforce: confidence=${withoutWorkforce.confidence} < ${withWorkforce.confidence}, score=${withoutWorkforce.score} (not 1 or 5)`);
}

console.log("\nAll healthcare-access regression tests passed ✓");
