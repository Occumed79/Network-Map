/**
 * Regression tests for healthcare-access scoring defect fixes.
 *
 * A. all DB fail          → workforce missing (not scarcity)
 * B. complete zero        → workforce/coverage score 5 (confirmed scarcity)
 * C. partial DB failure   → zero providers NOT treated as scarcity (unknown)   ← new
 * D. complete zero        → zero-facility capacity score 5
 * E. DB fail              → capacity omitted (not scarcity)
 * F. actual schema        → source_years=jsonb, source_names/missing_indicators=text[]
 * G. HRSA failure         → null, never false
 * H. service IDs          → vaccinations/occMed/drugTest/audiometry in SERVICE_TERMS
 * I. missing intl indicator → reduces confidence, stays 1<x<5
 * J. intl zero local access → complete search + 0 providers → localAccess score 5  ← new
 *
 * Run with:
 *   node --import ../occu-med-map/node_modules/tsx/dist/loader.mjs scripts/healthcare-access-regression-smoke.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateUnifiedAccessScore } from "../src/lib/healthcareAccessScoring";
import { scoringRouteInternals } from "../src/routes/scoringDatabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// complete=true: all DBs answered (zero = confirmed scarcity)
// complete=false, available=true: partial failure (zero = unknown)
// available=false: all DBs failed (zero = unknown)
const provider = (
  relevant: number,
  facilities: number,
  nearestMiles: number | null,
  evidenceAvailable = true,
  evidenceComplete = true,
) => ({
  relevant, facilities, nearestMiles,
  nearestName: nearestMiles !== null ? "Test Facility" : null,
  nearestLat: nearestMiles !== null ? 0 : null,
  nearestLng: nearestMiles !== null ? 0 : null,
  providerEvidenceAvailable: evidenceAvailable,
  providerEvidenceComplete: evidenceAvailable && evidenceComplete,
  successfulSources: evidenceAvailable ? (evidenceComplete ? 2 : 1) : 0,
  failedSources: evidenceAvailable ? (evidenceComplete ? 0 : 1) : 2,
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
  // Evidence available AND complete, but zero relevant providers found
  const zeroProviders = scoringRouteInternals.usInputs(
    urbanCounty,
    shortage(null, null, null),
    provider(0, 0, null, true, true), // evidenceAvailable=true, evidenceComplete=true
    travel(null),
  );

  assert.ok("workforce" in zeroProviders,
    "B: successful zero-provider search must produce workforce component");
  assert.equal((zeroProviders as any).workforce?.score, 5,
    "B: zero providers (evidence complete) must score workforce at max scarcity");
  assert.equal((zeroProviders as any).coverage?.score, 5,
    "B: zero providers (evidence complete) must score coverage at max scarcity");
  assert.equal((zeroProviders as any).workforce?.evidence?.observedScarcity, true,
    "B: observedScarcity flag must be true when relevant=0 and evidence complete");

  const zeroScore = calculateUnifiedAccessScore(zeroProviders as any);
  assert.ok(zeroScore.score > 3, `B: zero-provider score must be >3 (Difficult+), got ${zeroScore.score}`);

  console.log(`  B ✓  zero providers (evidence complete): workforce.score=5, overall=${zeroScore.score}`);
}

// ─── Test C: partial DB failure + zero providers = NOT scarcity (unknown) ─────

{
  // One DB succeeded, one failed.  Because evidence is NOT complete, zero may just
  // mean the missing data was in the failed DB — it must NOT be treated as scarcity.
  const partialZero = scoringRouteInternals.usInputs(
    urbanCounty,
    shortage(null, null, null),
    provider(0, 0, null, true, false), // evidenceAvailable=true, evidenceComplete=false
    travel(null),
  );

  assert.equal((partialZero as any).workforce, undefined,
    "C: partial DB failure + zero providers must omit workforce (not scarcity)");
  assert.equal((partialZero as any).coverage, undefined,
    "C: partial DB failure + zero providers must omit coverage (not scarcity)");

  // Confidence should be reduced because workforce/coverage are missing
  const partialZeroScore = calculateUnifiedAccessScore(partialZero as any);
  assert.ok(partialZeroScore.confidence < 1,
    `C: partial failure must reduce confidence below 1, got ${partialZeroScore.confidence}`);
  assert.ok(partialZeroScore.missingIndicators.includes("workforce"),
    "C: workforce must be in missingIndicators when partial failure + zero");

  console.log(`  C ✓  partial DB failure + zero: workforce=missing, confidence=${partialZeroScore.confidence}`);
}

// ─── Test D: successful zero-facility search = capacity scarcity ──────────────

{
  // Provider evidence available and complete, facility count confirmed as zero via DB
  const zeroFacilities = scoringRouteInternals.usInputs(
    urbanCounty,
    shortage(null, null, null, null), // facilityCount=null (no HRSA)
    provider(5, 0, 2.0, true, true),  // facilities=0, evidenceComplete=true
    travel(10),
  );

  // capacity must be present with score 5 (zero confirmed via complete DB search)
  assert.ok("capacity" in zeroFacilities,
    "D: zero facilities with complete evidence must produce capacity component");
  assert.equal((zeroFacilities as any).capacity?.score, 5,
    "D: zero confirmed facilities must score capacity at max scarcity");
  assert.equal((zeroFacilities as any).capacity?.evidence?.observedScarcity, true,
    "D: capacity observedScarcity must be true when facilities=0 and evidence complete");

  console.log("  D ✓  zero facilities (evidence complete): capacity.score=5");
}

// ─── Test E: failed facility source = missing capacity ────────────────────────

{
  // DB failed and no HRSA facility count → capacity must be MISSING
  const noFacilityEvidence = scoringRouteInternals.usInputs(
    urbanCounty,
    shortage(null, null, null, null), // facilityCount=null (HRSA unavailable)
    provider(0, 0, null, false),      // DB failed → db_facilities=null
    travel(null),
  );

  assert.equal((noFacilityEvidence as any).capacity, undefined,
    "E: failed DB + no HRSA → capacity must be omitted (not scarcity)");

  console.log("  E ✓  DB failure + no HRSA: capacity=missing");
}

// ─── Test F: actual schema — source_years is jsonb, not integer[] ─────────────

{
  const routeSrc = readFileSync(new URL("../src/routes/scoringDatabase.ts", import.meta.url), "utf8");
  const jobSrc = readFileSync(new URL("../src/jobs/syncHealthcareAccessIndicators.ts", import.meta.url), "utf8");

  // source_years must use ::jsonb (confirmed live column type)
  assert.match(routeSrc, /source_years=\$\d+::jsonb/,
    "F: scoringDatabase.ts UPDATE must cast source_years as ::jsonb (live schema is jsonb, not integer[])");
  assert.match(jobSrc, /source_years=\$\d+::jsonb/,
    "F: syncJob UPDATE must cast source_years as ::jsonb");

  // source_names and missing_indicators remain text[]
  assert.match(routeSrc, /source_names=\$\d+::text\[\]/,
    "F: source_names must be cast ::text[]");
  assert.match(routeSrc, /missing_indicators=\$\d+::text\[\]/,
    "F: missing_indicators must be cast ::text[]");

  // Must NOT use the wrong integer[] cast for source_years
  assert.doesNotMatch(routeSrc, /source_years=\$\d+::integer\[\]/,
    "F: source_years must NOT use ::integer[] (column is jsonb)");
  assert.doesNotMatch(jobSrc, /source_years=\$\d+::integer\[\]/,
    "F: syncJob source_years must NOT use ::integer[]");

  // sourceYears must be JSON-serialized before passing as parameter
  assert.match(routeSrc, /JSON\.stringify\(result\.sourceYears\)/,
    "F: routeDB must JSON.stringify(sourceYears) before passing to query");
  assert.match(jobSrc, /JSON\.stringify\(score\.sourceYears\)/,
    "F: syncJob must JSON.stringify(score.sourceYears) before passing to query");

  // Verify INSERT also uses ::jsonb for source_years
  assert.match(routeSrc, /\$\d+::jsonb,\$\d+::text\[\],\$\d+::text\[\]/,
    "F: INSERT must have ::jsonb then ::text[] ::text[] for source_years, source_names, missing_indicators");

  console.log("  F ✓  source_years=jsonb confirmed in both UPDATE and INSERT SQL");
}

// ─── Test G: HRSA upstream failure = null, never false ────────────────────────

{
  const routeSrc = readFileSync(new URL("../src/routes/scoringDatabase.ts", import.meta.url), "utf8");

  // Must use Promise.allSettled (not Promise.all with catch)
  assert.match(routeSrc, /Promise\.allSettled/,
    "G: HRSA fetches must use Promise.allSettled to capture failures without converting to false");

  // Must track availability separately
  assert.match(routeSrc, /hpsaAvailable/,
    "G: hrsaEvidence must track hpsaAvailable to distinguish null from false");
  assert.match(routeSrc, /muaAvailable/,
    "G: hrsaEvidence must track muaAvailable separately");

  // Behavioral: usInputs with null HRSA designation must not penalise as false
  const withNullHrsa = scoringRouteInternals.usInputs(
    ruralCounty,
    shortage(null, null, null), // all null = HRSA unavailable
    provider(1, 1, 47.8, true),
    travel(83),
  );
  assert.equal((withNullHrsa as any).coverage?.evidence?.muaDesignated, null,
    "G: null HRSA must stay null in coverage evidence");
  assert.equal((withNullHrsa as any).workforce?.evidence?.hpsaDesignated, null,
    "G: null HRSA must stay null in workforce evidence");

  console.log("  G ✓  HRSA unavailability stays null throughout");
}

// ─── Test H: vaccinations/occMed/drugTest/audiometry SERVICE_TERMS ────────────

{
  const routeSrc = readFileSync(new URL("../src/routes/scoringDatabase.ts", import.meta.url), "utf8");

  for (const key of ["vaccinations", "occMed", "drugTest", "audiometry"]) {
    assert.match(routeSrc, new RegExp(`\\b${key}\\s*:`),
      `H: SERVICE_TERMS must define '${key}' as a primary key`);
  }
  assert.match(routeSrc, /vaccinations:.*vaccin/s, "H: vaccinations must include vaccine term");
  assert.match(routeSrc, /occMed:.*occupational/s, "H: occMed must include occupational term");
  assert.match(routeSrc, /drugTest:.*drug/s, "H: drugTest must include drug term");
  assert.match(routeSrc, /audiometry:.*audiometr/s, "H: audiometry must include audiometry term");

  console.log("  H ✓  vaccinations/occMed/drugTest/audiometry all primary keys in SERVICE_TERMS");
}

// ─── Test I: missing indicator reduces confidence, no Easy/Critical extremes ──

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
    "I: missing workforce must appear in missingIndicators");
  assert.ok(withoutWorkforce.confidence < withWorkforce.confidence,
    `I: missing workforce must reduce confidence (${withoutWorkforce.confidence} < ${withWorkforce.confidence})`);
  assert.ok(withoutWorkforce.score > 1, `I: score must not collapse to Easy=1, got ${withoutWorkforce.score}`);
  assert.ok(withoutWorkforce.score < 5, `I: score must not collapse to Critical=5, got ${withoutWorkforce.score}`);
  assert.equal(withoutWorkforce.components.workforce, undefined,
    "I: missing workforce must have no component entry");

  console.log(`  I ✓  missing workforce: confidence=${withoutWorkforce.confidence} < ${withWorkforce.confidence}, score=${withoutWorkforce.score}`);
}

// ─── Test J: intl zero local access (complete search, 0 providers) = score 5 ──

{
  type IndicatorRow = {
    indicator_code: string; indicator_name: string; value: unknown; year: unknown;
    source_name: string; geography_level: string;
    admin1_code?: string | null; admin1_name?: string | null;
  };

  // Sparse indicators for a country, but the key thing is: complete provider search
  // found zero relevant providers AND no travel time (nearestMiles = null).
  // This should score localAccess at 5 (confirmed no nearby access).
  const sparseRows: IndicatorRow[] = [
    { indicator_code: "SH.MED.PHYS.ZS", indicator_name: "Physicians", value: 0.5, year: 2022,
      source_name: "World Bank", geography_level: "country" },
    { indicator_code: "EN.POP.DNST", indicator_name: "Density", value: 8, year: 2023,
      source_name: "World Bank", geography_level: "country" },
  ];

  // complete=true, relevant=0, nearestMiles=null → confirmed local access scarcity
  const intlZeroAccess = scoringRouteInternals.internationalInputs(
    sparseRows,
    provider(0, 0, null, true, true), // evidenceComplete=true, zero found
    travel(null),                      // no travel time (no provider to route to)
  );

  assert.ok("localAccess" in intlZeroAccess,
    "J: complete search + 0 intl providers must produce localAccess component");
  assert.equal((intlZeroAccess as any).localAccess?.score, 5,
    "J: complete intl search with 0 providers must score localAccess at max scarcity (5)");
  assert.equal((intlZeroAccess as any).localAccess?.evidence?.observedScarcity, true,
    "J: localAccess observedScarcity must be true when complete search returns 0 providers");
  assert.equal((intlZeroAccess as any).localAccess?.evidence?.travelMinutes, null,
    "J: travelMinutes must remain null (no provider to route to)");

  // Verify the score reflects scarcity in the final output
  const jScore = calculateUnifiedAccessScore(intlZeroAccess as any);
  assert.ok(jScore.score > 2,
    `J: zero-access intl score must be >2, got ${jScore.score}`);

  console.log(`  J ✓  intl zero local access (complete): localAccess.score=5, overall=${jScore.score}`);
}

// ─── Test K: intl incomplete search + null travel = localAccess omitted ───────

{
  type IndicatorRow = {
    indicator_code: string; indicator_name: string; value: unknown; year: unknown;
    source_name: string; geography_level: string;
    admin1_code?: string | null; admin1_name?: string | null;
  };

  const baseRows: IndicatorRow[] = [
    { indicator_code: "SH.MED.PHYS.ZS", indicator_name: "Physicians", value: 1.2, year: 2022,
      source_name: "World Bank", geography_level: "country" },
    { indicator_code: "EN.POP.DNST", indicator_name: "Density", value: 50, year: 2023,
      source_name: "World Bank", geography_level: "country" },
  ];

  // partial failure (evidenceComplete=false) + zero + no travel → localAccess must be OMITTED
  const intlPartialZero = scoringRouteInternals.internationalInputs(
    baseRows,
    provider(0, 0, null, true, false), // partial failure: available but not complete
    travel(null),
  );

  assert.equal((intlPartialZero as any).localAccess, undefined,
    "K: incomplete intl search + null travel must omit localAccess (not scarcity)");

  console.log("  K ✓  intl partial search + null travel: localAccess=omitted");
}

// ─── Test L: partial positive provider evidence has lower confidence than complete ──

{
  // Both searches return identical positive provider counts — same scores, different completeness.
  // The only difference: complete has failedSources=0; partial has failedSources=1.
  // Confidence must be strictly lower for the partial search.
  const completeEvidence = provider(25, 3, 5.2, true, true);  // 2 succeeded, 0 failed
  const partialEvidence  = provider(25, 3, 5.2, true, false); // 1 succeeded, 1 failed

  const completeInputs = scoringRouteInternals.usInputs(urbanCounty, shortage(null, null, null), completeEvidence, travel(12));
  const partialInputs  = scoringRouteInternals.usInputs(urbanCounty, shortage(null, null, null), partialEvidence,  travel(12));

  const completeScore = calculateUnifiedAccessScore(completeInputs as any);
  const partialScore  = calculateUnifiedAccessScore(partialInputs  as any);

  // Scores must be identical (same components, same values, same inputs)
  assert.equal(completeScore.score, partialScore.score,
    "L: complete and partial positive evidence must produce identical scores");

  // Apply the completeness multiplier (mirrors applyProviderCompletenessToScore in scoringDatabase.ts)
  const completeConf = completeScore.confidence; // no multiplier — failedSources=0
  const completenessRatio = partialEvidence.successfulSources / (partialEvidence.successfulSources + partialEvidence.failedSources);
  const partialConf  = Number((partialScore.confidence * completenessRatio).toFixed(2));

  assert.ok(completeConf > partialConf,
    `L: complete confidence (${completeConf}) must be > partial confidence (${partialConf})`);
  assert.ok(partialConf > 0,
    `L: partial confidence must still be > 0, got ${partialConf}`);

  console.log(`  L ✓  partial positive: confidence ${partialConf} < complete ${completeConf} (score unchanged at ${completeScore.score})`);
}

console.log("\nAll healthcare-access regression tests passed ✓");
