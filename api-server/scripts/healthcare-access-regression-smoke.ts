/**
 * Regression tests for healthcare-access scoring defect fixes.
 * Updated after independent review to cover additional blockers:
 *
 * A. provider DB failure != zero-provider scarcity
 * B. successful zero-provider search = scarcity
 * C. successful zero-facility search = capacity scarcity
 * D. failed facility search = missing capacity
 * E. actual international_access_scores persistence uses real DB schema
 *    (source_years=jsonb, source_names=text[], missing_indicators=text[])
 * F. HRSA upstream failure = null, never false
 * G. vaccinations/occMed/drugTest/audiometry SERVICE_TERMS keys present
 * H. missing international indicator reduces confidence, stays between 1 and 5
 *
 * Run with:
 *   node --import ../occu-med-map/node_modules/tsx/dist/loader.mjs scripts/healthcare-access-regression-smoke.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateUnifiedAccessScore } from "../src/lib/healthcareAccessScoring";
import { scoringRouteInternals } from "../src/routes/scoringDatabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// providerEvidenceAvailable controls whether zero is scarcity or missing
const provider = (
  relevant: number,
  facilities: number,
  nearestMiles: number | null,
  evidenceAvailable = true,
) => ({
  relevant, facilities, nearestMiles,
  nearestName: nearestMiles !== null ? "Test Facility" : null,
  nearestLat: nearestMiles !== null ? 0 : null,
  nearestLng: nearestMiles !== null ? 0 : null,
  providerEvidenceAvailable: evidenceAvailable,
  successfulSources: evidenceAvailable ? 1 : 0,
  failedSources: evidenceAvailable ? 0 : 1,
});
const travel = (minutes: number | null) => ({ minutes, source: minutes !== null ? "Mapbox Directions" : null });
const shortage = (
  hpsaScore: number | null,
  hpsaDesignated: boolean | null,
  muaDesignated: boolean | null,
  facilityCount: number | null = null,
) => ({ hpsaScore, hpsaDesignated, muaDesignated, facilityCount, sourceYear: 2025 });

const urbanCounty = {
  countyFips: "06037", countyName: "Los Angeles County", state: "CA",
  population: 10_000_000, landSquareMiles: 4_058, density: 2_465, sourceYear: 2024,
};
const ruralCounty = {
  countyFips: "30069", countyName: "Petroleum County", state: "MT",
  population: 519, landSquareMiles: 1_655, density: 0.31, sourceYear: 2024,
};

// ─── Test A: provider DB failure must NOT become scarcity ─────────────────────

{
  // All provider DB queries failed → evidenceAvailable=false
  const dbFailure = scoringRouteInternals.usInputs(
    urbanCounty,
    shortage(null, null, null),
    provider(0, 0, null, false), // evidenceAvailable=false
    travel(null),
  );

  // workforce and coverage must be MISSING (not scored) when evidence unavailable
  assert.equal((dbFailure as any).workforce, undefined,
    "A: DB failure must omit workforce (not score as scarcity)");
  assert.equal((dbFailure as any).coverage, undefined,
    "A: DB failure must omit coverage (not score as scarcity)");

  const dbFailScore = calculateUnifiedAccessScore(dbFailure as any);
  // geographic is still present (from census), so score won't throw — but confidence is reduced
  assert.ok(dbFailScore.confidence < 1,
    `A: DB failure must reduce confidence below 1, got ${dbFailScore.confidence}`);
  assert.ok(dbFailScore.missingIndicators.includes("workforce"),
    "A: workforce must be listed as missing when DB failed");

  console.log(`  A ✓  DB failure: workforce=missing, confidence=${dbFailScore.confidence}`);
}

// ─── Test B: successful zero-provider search = scarcity ───────────────────────

{
  // Evidence available but zero relevant providers found
  const zeroProviders = scoringRouteInternals.usInputs(
    urbanCounty,
    shortage(null, null, null),
    provider(0, 0, null, true), // evidenceAvailable=true, relevant=0
    travel(null),
  );

  assert.ok("workforce" in zeroProviders,
    "B: successful zero-provider search must produce workforce component");
  assert.equal((zeroProviders as any).workforce?.score, 5,
    "B: zero providers (evidence available) must score workforce at max scarcity");
  assert.equal((zeroProviders as any).coverage?.score, 5,
    "B: zero providers (evidence available) must score coverage at max scarcity");
  assert.equal((zeroProviders as any).workforce?.evidence?.observedScarcity, true,
    "B: observedScarcity flag must be true when relevant=0 and evidence available");

  const zeroScore = calculateUnifiedAccessScore(zeroProviders as any);
  assert.ok(zeroScore.score > 3, `B: zero-provider score must be >3 (Difficult+), got ${zeroScore.score}`);

  console.log(`  B ✓  zero providers (evidence available): workforce.score=5, overall=${zeroScore.score}`);
}

// ─── Test C: successful zero-facility search = capacity scarcity ──────────────

{
  // Provider evidence available, facility count confirmed as zero (not from HRSA, from DB)
  const zeroFacilities = scoringRouteInternals.usInputs(
    urbanCounty,
    shortage(null, null, null, null), // facilityCount=null (no HRSA)
    provider(5, 0, 2.0, true),       // facilities=0, evidenceAvailable=true
    travel(10),
  );

  // capacity must be present with score 5 (zero confirmed via DB)
  assert.ok("capacity" in zeroFacilities,
    "C: zero facilities with evidence available must produce capacity component");
  assert.equal((zeroFacilities as any).capacity?.score, 5,
    "C: zero confirmed facilities must score capacity at max scarcity");
  assert.equal((zeroFacilities as any).capacity?.evidence?.observedScarcity, true,
    "C: capacity observedScarcity must be true when facilities=0 and evidence available");

  console.log("  C ✓  zero facilities (evidence available): capacity.score=5");
}

// ─── Test D: failed facility source = missing capacity ────────────────────────

{
  // DB failed and no HRSA facility count → capacity must be MISSING
  const noFacilityEvidence = scoringRouteInternals.usInputs(
    urbanCounty,
    shortage(null, null, null, null), // facilityCount=null (HRSA unavailable)
    provider(0, 0, null, false),      // DB failed → db_facilities=null
    travel(null),
  );

  assert.equal((noFacilityEvidence as any).capacity, undefined,
    "D: failed DB + no HRSA → capacity must be omitted (not scarcity)");

  console.log("  D ✓  DB failure + no HRSA: capacity=missing");
}

// ─── Test E: actual schema — source_years is jsonb, not integer[] ─────────────

{
  const routeSrc = readFileSync(new URL("../src/routes/scoringDatabase.ts", import.meta.url), "utf8");
  const jobSrc = readFileSync(new URL("../src/jobs/syncHealthcareAccessIndicators.ts", import.meta.url), "utf8");

  // source_years must use ::jsonb (confirmed live column type)
  assert.match(routeSrc, /source_years=\$\d+::jsonb/,
    "E: scoringDatabase.ts UPDATE must cast source_years as ::jsonb (live schema is jsonb, not integer[])");
  assert.match(jobSrc, /source_years=\$\d+::jsonb/,
    "E: syncJob UPDATE must cast source_years as ::jsonb");

  // source_names and missing_indicators remain text[]
  assert.match(routeSrc, /source_names=\$\d+::text\[\]/,
    "E: source_names must be cast ::text[]");
  assert.match(routeSrc, /missing_indicators=\$\d+::text\[\]/,
    "E: missing_indicators must be cast ::text[]");

  // Must NOT use the wrong integer[] cast for source_years
  assert.doesNotMatch(routeSrc, /source_years=\$\d+::integer\[\]/,
    "E: source_years must NOT use ::integer[] (column is jsonb)");
  assert.doesNotMatch(jobSrc, /source_years=\$\d+::integer\[\]/,
    "E: syncJob source_years must NOT use ::integer[]");

  // sourceYears must be JSON-serialized before passing as parameter
  assert.match(routeSrc, /JSON\.stringify\(result\.sourceYears\)/,
    "E: routeDB must JSON.stringify(sourceYears) before passing to query");
  assert.match(jobSrc, /JSON\.stringify\(score\.sourceYears\)/,
    "E: syncJob must JSON.stringify(score.sourceYears) before passing to query");

  // Verify INSERT also uses ::jsonb for source_years
  assert.match(routeSrc, /\$\d+::jsonb,\$\d+::text\[\],\$\d+::text\[\]/,
    "E: INSERT must have ::jsonb then ::text[] ::text[] for source_years, source_names, missing_indicators");

  console.log("  E ✓  source_years=jsonb confirmed in both UPDATE and INSERT SQL");
}

// ─── Test F: HRSA upstream failure = null, never false ────────────────────────

{
  const routeSrc = readFileSync(new URL("../src/routes/scoringDatabase.ts", import.meta.url), "utf8");

  // Must use Promise.allSettled (not Promise.all with catch)
  assert.match(routeSrc, /Promise\.allSettled/,
    "F: HRSA fetches must use Promise.allSettled to capture failures without converting to false");

  // Must track availability separately
  assert.match(routeSrc, /hpsaAvailable/,
    "F: hrsaEvidence must track hpsaAvailable to distinguish null from false");
  assert.match(routeSrc, /muaAvailable/,
    "F: hrsaEvidence must track muaAvailable separately");

  // Behavioral: usInputs with null HRSA designation must not penalise as false
  const withNullHrsa = scoringRouteInternals.usInputs(
    ruralCounty,
    shortage(null, null, null), // all null = HRSA unavailable
    provider(1, 1, 47.8, true),
    travel(83),
  );
  assert.equal((withNullHrsa as any).coverage?.evidence?.muaDesignated, null,
    "F: null HRSA must stay null in coverage evidence");
  assert.equal((withNullHrsa as any).workforce?.evidence?.hpsaDesignated, null,
    "F: null HRSA must stay null in workforce evidence");

  console.log("  F ✓  HRSA unavailability stays null throughout");
}

// ─── Test G: vaccinations/occMed/drugTest/audiometry SERVICE_TERMS ────────────

{
  const routeSrc = readFileSync(new URL("../src/routes/scoringDatabase.ts", import.meta.url), "utf8");

  for (const key of ["vaccinations", "occMed", "drugTest", "audiometry"]) {
    assert.match(routeSrc, new RegExp(`\\b${key}\\s*:`),
      `G: SERVICE_TERMS must define '${key}' as a primary key`);
  }
  assert.match(routeSrc, /vaccinations:.*vaccin/s, "G: vaccinations must include vaccine term");
  assert.match(routeSrc, /occMed:.*occupational/s, "G: occMed must include occupational term");
  assert.match(routeSrc, /drugTest:.*drug/s, "G: drugTest must include drug term");
  assert.match(routeSrc, /audiometry:.*audiometr/s, "G: audiometry must include audiometry term");

  console.log("  G ✓  vaccinations/occMed/drugTest/audiometry all primary keys in SERVICE_TERMS");
}

// ─── Test H: missing indicator reduces confidence, no Easy/Critical extremes ──

{
  type IndicatorRow = {
    indicator_code: string; indicator_name: string; value: unknown; year: unknown;
    source_name: string; geography_level: string;
    admin1_code?: string | null; admin1_name?: string | null;
  };

  const rows = (workforce: number | null): IndicatorRow[] => [
    ...(workforce !== null ? [{ indicator_code: "SH.MED.PHYS.ZS", indicator_name: "Physicians",
      value: workforce, year: 2023, source_name: "World Bank", geography_level: "country" }] : []),
    { indicator_code: "SH.MED.BEDS.ZS", indicator_name: "Beds", value: 2.4, year: 2022,
      source_name: "World Bank", geography_level: "country" },
    { indicator_code: "SH.UHC.SRVS.CV.XD", indicator_name: "UHC", value: 82, year: 2021,
      source_name: "WHO / World Bank", geography_level: "country" },
    { indicator_code: "SP.RUR.TOTL.ZS", indicator_name: "Rural", value: 39.8, year: 2024,
      source_name: "World Bank", geography_level: "country" },
    { indicator_code: "EN.POP.DNST", indicator_name: "Density", value: 124, year: 2024,
      source_name: "World Bank", geography_level: "country" },
  ];

  const withWorkforce = calculateUnifiedAccessScore(
    scoringRouteInternals.internationalInputs(rows(2.8), provider(18, 6, 4.9), travel(14)),
  );
  const withoutWorkforce = calculateUnifiedAccessScore(
    scoringRouteInternals.internationalInputs(rows(null), provider(18, 6, 4.9), travel(14)),
  );

  assert.ok(withoutWorkforce.missingIndicators.includes("workforce"),
    "H: missing workforce must appear in missingIndicators");
  assert.ok(withoutWorkforce.confidence < withWorkforce.confidence,
    `H: missing workforce must reduce confidence (${withoutWorkforce.confidence} < ${withWorkforce.confidence})`);
  assert.ok(withoutWorkforce.score > 1, `H: score must not collapse to Easy=1, got ${withoutWorkforce.score}`);
  assert.ok(withoutWorkforce.score < 5, `H: score must not collapse to Critical=5, got ${withoutWorkforce.score}`);
  assert.equal(withoutWorkforce.components.workforce, undefined,
    "H: missing workforce must have no component entry");

  console.log(`  H ✓  missing workforce: confidence=${withoutWorkforce.confidence} < ${withWorkforce.confidence}, score=${withoutWorkforce.score}`);
}

console.log("\nAll healthcare-access regression tests passed ✓");
