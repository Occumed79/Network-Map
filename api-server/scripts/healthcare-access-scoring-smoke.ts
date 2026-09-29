import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateUnifiedAccessScore } from "../src/lib/healthcareAccessScoring";

const complete = calculateUnifiedAccessScore({
  workforce: { score: 5, evidence: {}, sources: ["HRSA"], year: 2025 },
  capacity: { score: 4, evidence: {}, sources: ["CMS"], year: 2025 },
  coverage: { score: 3, evidence: {}, sources: ["WHO"], year: 2024 },
  geographic: { score: 2, evidence: {}, sources: ["USDA"] },
  localAccess: { score: 1, evidence: {}, sources: ["Network Map"] },
});
assert.equal(complete.score, 3.35, "documented component weights must be applied");
assert.equal(complete.confidence, 1);

const missing = calculateUnifiedAccessScore({
  workforce: { score: 2, evidence: {}, sources: ["NPPES"] },
});
assert.equal(missing.score, 2, "missing components must not act like zero or Critical");
assert.equal(missing.confidence, 0.3, "missing components must reduce confidence");
assert.deepEqual(missing.missingIndicators, ["capacity", "coverage", "geographic", "localAccess"]);

const route = readFileSync(new URL("../src/routes/scoringDatabase.ts", import.meta.url), "utf8");
assert.match(route, /international_access_scores/, "international scoring must use the existing scoring database");
assert.match(route, /provider_master_map_view/, "local evidence must use existing provider databases");
assert.match(route, /api\.census\.gov/, "U.S. population must come from the server-side Census API");
assert.doesNotMatch(route, /\bLOCS\b|estimateDifficultyFromNeighbors/, "backend scoring must not use legacy frontend scorecards");

console.log("Unified healthcare-access scoring smoke test passed.");
