export {};

// Smoke tests for the Search Coordinator / API Governor
// Self-contained: copies the pure logic to avoid cross-package import issues.

// ── Types ──────────────────────────────────────────────────────────────────

type SearchMode =
  | "fast"
  | "balanced"
  | "deep"
  | "background_indexing"
  | "price_discovery";

interface SearchQualityMetrics {
  totalResults: number;
  verifiedCoordinateCount: number;
  unverifiedLeadCount: number;
  highTrustCount: number;
  directoryTrustCount: number;
  leadTrustCount: number;
  addressCoveragePct: number;
  phoneCoveragePct: number;
  websiteCoveragePct: number;
  duplicateRatePct: number;
  avgScore: number;
  maxScore: number;
}

interface SearchQualityThresholds {
  minTotalResults: number;
  minVerifiedCoordinateCount: number;
  minHighTrustCount: number;
  minAddressCoveragePct: number;
  minPhoneCoveragePct: number;
  maxDuplicateRatePct: number;
  minAvgScore: number;
}

interface ApiBudget {
  maxWebEvidenceSources: number;
  maxAiEnrichments: number;
  allowBrowserExtraction: boolean;
  allowVectorQuery: boolean;
  maxTotalExternalCalls: number;
}

interface SourceDecision {
  sourceId: string;
  run: boolean;
  reason: string;
  costTier: string;
}

interface SourceStatusReport {
  sourceName: string;
  envVar: string;
  configured: boolean;
  category: string;
  adapterStatus: string;
  usedBy: string[];
  runtimeReady: boolean;
  missingRequiredConfig: string[];
  notes?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function envNumber(key: string, fallback: number): number {
  const val = Number(process.env[key]);
  return Number.isFinite(val) && val >= 0 ? val : fallback;
}

function envBool(key: string, fallback: boolean): boolean {
  const val = process.env[key]?.trim().toLowerCase();
  if (val === undefined || val === "") return fallback;
  return ["1", "true", "yes", "on"].includes(val);
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80);
}

// ── Quality scoring ────────────────────────────────────────────────────────

interface MockCandidate {
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  website: string;
  coordinateStatus: string;
  trustTier: string;
  score: number;
  sourceUrl?: string;
}

function calculateSearchQuality(results: MockCandidate[]): SearchQualityMetrics {
  const totalResults = results.length;
  if (totalResults === 0) {
    return {
      totalResults: 0, verifiedCoordinateCount: 0, unverifiedLeadCount: 0,
      highTrustCount: 0, directoryTrustCount: 0, leadTrustCount: 0,
      addressCoveragePct: 0, phoneCoveragePct: 0, websiteCoveragePct: 0,
      duplicateRatePct: 0, avgScore: 0, maxScore: 0,
    };
  }

  const verifiedCoordinateCount = results.filter((r) => r.coordinateStatus !== "unverified").length;
  const unverifiedLeadCount = results.filter((r) => r.coordinateStatus === "unverified").length;
  const highTrustCount = results.filter((r) => r.trustTier === "verified" || r.trustTier === "registry").length;
  const directoryTrustCount = results.filter((r) => r.trustTier === "directory").length;
  const leadTrustCount = results.filter((r) => r.trustTier === "lead").length;

  const withAddress = results.filter((r) => r.address?.trim()).length;
  const withPhone = results.filter((r) => r.phone?.trim()).length;
  const withWebsite = results.filter((r) => r.website?.trim() || r.sourceUrl?.trim()).length;

  const addressCoveragePct = Math.round((withAddress / totalResults) * 100);
  const phoneCoveragePct = Math.round((withPhone / totalResults) * 100);
  const websiteCoveragePct = Math.round((withWebsite / totalResults) * 100);

  const seen = new Set<string>();
  let duplicates = 0;
  for (const r of results) {
    const key1 = `${normalizeName(r.name)}|${r.city?.toLowerCase()}|${r.state?.toLowerCase()}`;
    const key2 = (r.website || r.sourceUrl || "").toLowerCase().trim();
    if (seen.has(key1) || (key2 && seen.has(key2))) {
      duplicates++;
    } else {
      seen.add(key1);
      if (key2) seen.add(key2);
    }
  }
  const duplicateRatePct = Math.round((duplicates / totalResults) * 100);

  const scores = results.map((r) => r.score || 0);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / totalResults);
  const maxScore = Math.max(...scores);

  return {
    totalResults, verifiedCoordinateCount, unverifiedLeadCount,
    highTrustCount, directoryTrustCount, leadTrustCount,
    addressCoveragePct, phoneCoveragePct, websiteCoveragePct,
    duplicateRatePct, avgScore, maxScore,
  };
}

// ── Thresholds ─────────────────────────────────────────────────────────────

function getThresholdsForMode(mode: SearchMode): SearchQualityThresholds {
  const defaults: Record<SearchMode, SearchQualityThresholds> = {
    fast: { minTotalResults: 8, minVerifiedCoordinateCount: 5, minHighTrustCount: 2, minAddressCoveragePct: 50, minPhoneCoveragePct: 25, maxDuplicateRatePct: 40, minAvgScore: 35 },
    balanced: { minTotalResults: 15, minVerifiedCoordinateCount: 8, minHighTrustCount: 3, minAddressCoveragePct: 60, minPhoneCoveragePct: 35, maxDuplicateRatePct: 35, minAvgScore: 45 },
    deep: { minTotalResults: 25, minVerifiedCoordinateCount: 12, minHighTrustCount: 5, minAddressCoveragePct: 70, minPhoneCoveragePct: 45, maxDuplicateRatePct: 30, minAvgScore: 50 },
    background_indexing: { minTotalResults: 50, minVerifiedCoordinateCount: 20, minHighTrustCount: 5, minAddressCoveragePct: 50, minPhoneCoveragePct: 20, maxDuplicateRatePct: 45, minAvgScore: 35 },
    price_discovery: { minTotalResults: 5, minVerifiedCoordinateCount: 0, minHighTrustCount: 0, minAddressCoveragePct: 20, minPhoneCoveragePct: 0, maxDuplicateRatePct: 50, minAvgScore: 25 },
  };
  const base = defaults[mode];
  return {
    minTotalResults: envNumber("SEARCH_MIN_TOTAL_RESULTS", base.minTotalResults),
    minVerifiedCoordinateCount: envNumber("SEARCH_MIN_VERIFIED_COORDINATES", base.minVerifiedCoordinateCount),
    minHighTrustCount: envNumber("SEARCH_MIN_HIGH_TRUST_RESULTS", base.minHighTrustCount),
    minAddressCoveragePct: envNumber("SEARCH_MIN_ADDRESS_COVERAGE_PCT", base.minAddressCoveragePct),
    minPhoneCoveragePct: envNumber("SEARCH_MIN_PHONE_COVERAGE_PCT", base.minPhoneCoveragePct),
    maxDuplicateRatePct: envNumber("SEARCH_MAX_DUPLICATE_RATE_PCT", base.maxDuplicateRatePct),
    minAvgScore: envNumber("SEARCH_MIN_AVG_SCORE", base.minAvgScore),
  };
}

// ── Budgets ────────────────────────────────────────────────────────────────

function getBudgetForMode(mode: SearchMode): ApiBudget {
  const defaults: Record<SearchMode, ApiBudget> = {
    fast: { maxWebEvidenceSources: 0, maxAiEnrichments: 0, allowBrowserExtraction: false, allowVectorQuery: false, maxTotalExternalCalls: 0 },
    balanced: { maxWebEvidenceSources: 2, maxAiEnrichments: 2, allowBrowserExtraction: false, allowVectorQuery: true, maxTotalExternalCalls: 4 },
    deep: { maxWebEvidenceSources: 5, maxAiEnrichments: 5, allowBrowserExtraction: false, allowVectorQuery: true, maxTotalExternalCalls: 10 },
    background_indexing: { maxWebEvidenceSources: 5, maxAiEnrichments: 10, allowBrowserExtraction: true, allowVectorQuery: true, maxTotalExternalCalls: 25 },
    price_discovery: { maxWebEvidenceSources: 3, maxAiEnrichments: 5, allowBrowserExtraction: true, allowVectorQuery: true, maxTotalExternalCalls: 15 },
  };
  const base = defaults[mode];
  return {
    maxWebEvidenceSources: envNumber("SEARCH_MAX_WEB_EVIDENCE_SOURCES", base.maxWebEvidenceSources),
    maxAiEnrichments: envNumber("SEARCH_MAX_AI_ENRICHMENTS", base.maxAiEnrichments),
    allowBrowserExtraction: envBool("SEARCH_ALLOW_BROWSER_EXTRACTION", base.allowBrowserExtraction),
    allowVectorQuery: envBool("SEARCH_ALLOW_VECTOR_QUERY", base.allowVectorQuery),
    maxTotalExternalCalls: envNumber("SEARCH_MAX_TOTAL_EXTERNAL_CALLS", base.maxTotalExternalCalls),
  };
}

// ── Escalation ─────────────────────────────────────────────────────────────

function shouldEscalateSearch(
  quality: SearchQualityMetrics,
  thresholds: SearchQualityThresholds,
): { shouldEscalate: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (quality.totalResults < thresholds.minTotalResults) reasons.push("too_few_total_results");
  if (quality.verifiedCoordinateCount < thresholds.minVerifiedCoordinateCount) reasons.push("too_few_verified_coordinates");
  if (quality.highTrustCount < thresholds.minHighTrustCount) reasons.push("too_few_high_trust_results");
  if (quality.addressCoveragePct < thresholds.minAddressCoveragePct) reasons.push("weak_address_coverage");
  if (quality.phoneCoveragePct < thresholds.minPhoneCoveragePct) reasons.push("weak_phone_coverage");
  if (quality.duplicateRatePct > thresholds.maxDuplicateRatePct) reasons.push("high_duplicate_rate");
  if (quality.avgScore < thresholds.minAvgScore) reasons.push("weak_average_score");
  return { shouldEscalate: reasons.length > 0, reasons };
}

// ── Source planning ────────────────────────────────────────────────────────

function isWebEvidenceSourceReady(sources: SourceStatusReport[]): boolean {
  return sources.some((s) => s.category === "web_search" && s.runtimeReady);
}

function isAiSourceReady(sources: SourceStatusReport[]): boolean {
  return sources.some((s) => s.category === "ai_extraction" && s.runtimeReady);
}

function isBrowserSourceReady(sources: SourceStatusReport[]): boolean {
  return sources.some((s) => s.category === "web_extraction" && s.sourceName !== "Firecrawl" && s.runtimeReady);
}

function isVectorSourceReady(sources: SourceStatusReport[]): boolean {
  return sources.some((s) => s.category === "vector_index" && s.runtimeReady);
}

function isRapidApiReady(sources: SourceStatusReport[]): boolean {
  return sources.some((s) => s.sourceName === "RapidAPI Provider Search" && s.runtimeReady);
}

const FMCSA_SERVICES = new Set(["dotExam"]);

function buildSearchPlan(args: {
  mode: SearchMode;
  serviceType: string;
  baselineQuality?: SearchQualityMetrics;
  configuredSources: SourceStatusReport[];
}): { sourceDecisions: SourceDecision[]; shouldEscalate: boolean; escalationReasons: string[]; budget: ApiBudget } {
  const { mode, serviceType, baselineQuality, configuredSources } = args;
  const budget = getBudgetForMode(mode);
  const thresholds = getThresholdsForMode(mode);
  const decisions: SourceDecision[] = [];
  const escalationReasons: string[] = [];

  let shouldEscalate = false;
  if (baselineQuality) {
    const esc = shouldEscalateSearch(baselineQuality, thresholds);
    shouldEscalate = esc.shouldEscalate;
    escalationReasons.push(...esc.reasons);
  }

  // Internal/free
  decisions.push({ sourceId: "clinicimports", run: true, reason: "free_internal", costTier: "free_internal" });
  decisions.push({ sourceId: "npi", run: true, reason: "free_internal", costTier: "free_internal" });
  decisions.push({
    sourceId: "fmcsa",
    run: FMCSA_SERVICES.has(serviceType),
    reason: FMCSA_SERVICES.has(serviceType) ? "relevant" : "not relevant",
    costTier: "free_internal",
  });

  // Web evidence
  const webReady = isWebEvidenceSourceReady(configuredSources);
  const modesAllowingWeb: SearchMode[] = ["balanced", "deep", "background_indexing", "price_discovery"];
  if (modesAllowingWeb.includes(mode) && shouldEscalate && webReady && budget.maxWebEvidenceSources > 0) {
    decisions.push({ sourceId: "webevidence", run: true, reason: "escalation triggered", costTier: "low_cost_api" });
  } else {
    decisions.push({
      sourceId: "webevidence",
      run: false,
      reason: !modesAllowingWeb.includes(mode) ? `mode "${mode}" disallows web evidence`
        : !shouldEscalate ? "baseline sufficient"
        : !webReady ? "no runtime-ready web source"
        : "budget is 0",
      costTier: "low_cost_api",
    });
  }

  // RapidAPI
  const rapidReady = isRapidApiReady(configuredSources);
  if (modesAllowingWeb.includes(mode) && shouldEscalate && rapidReady) {
    decisions.push({ sourceId: "rapidapi", run: true, reason: "escalation triggered", costTier: "metered_api" });
  } else {
    decisions.push({
      sourceId: "rapidapi",
      run: false,
      reason: !rapidReady ? "not runtime-ready" : !shouldEscalate ? "baseline sufficient" : `mode "${mode}" disallows`,
      costTier: "metered_api",
    });
  }

  // AI enrichment
  const aiReady = isAiSourceReady(configuredSources);
  const webRunning = decisions.find((d) => d.sourceId === "webevidence")?.run === true;
  if (aiReady && (webRunning || (baselineQuality && baselineQuality.leadTrustCount > 0)) && budget.maxAiEnrichments > 0) {
    decisions.push({ sourceId: "ai_enrichment", run: true, reason: `capped at ${budget.maxAiEnrichments}`, costTier: "low_cost_api" });
  } else {
    decisions.push({
      sourceId: "ai_enrichment",
      run: false,
      reason: !aiReady ? "no runtime-ready AI source" : budget.maxAiEnrichments === 0 ? "budget is 0" : "no web results to enrich",
      costTier: "low_cost_api",
    });
  }

  // Browser extraction
  const browserReady = isBrowserSourceReady(configuredSources);
  if (browserReady && budget.allowBrowserExtraction) {
    decisions.push({ sourceId: "browser_extraction", run: true, reason: `allowed in "${mode}"`, costTier: "expensive_browser" });
  } else {
    decisions.push({
      sourceId: "browser_extraction",
      run: false,
      reason: !browserReady ? "not runtime-ready" : `mode "${mode}" disallows browser`,
      costTier: "expensive_browser",
    });
  }

  // Vector
  const vectorReady = isVectorSourceReady(configuredSources);
  if (vectorReady && budget.allowVectorQuery) {
    decisions.push({ sourceId: "vector_query", run: true, reason: `allowed in "${mode}"`, costTier: "vector" });
  } else {
    decisions.push({
      sourceId: "vector_query",
      run: false,
      reason: !vectorReady ? "not runtime-ready" : `mode "${mode}" disallows vector`,
      costTier: "vector",
    });
  }

  return { sourceDecisions: decisions, shouldEscalate, escalationReasons, budget };
}

// ── Test helpers ───────────────────────────────────────────────────────────

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`ASSERT FAILED: ${message}`);
}

const envBackup: Record<string, string | undefined> = {};

function setEnv(key: string, value: string | undefined) {
  if (!(key in envBackup)) envBackup[key] = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function restoreEnv() {
  for (const [key, value] of Object.entries(envBackup)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function clearSearchEnv() {
  const keys = [
    "SEARCH_MIN_TOTAL_RESULTS", "SEARCH_MIN_VERIFIED_COORDINATES", "SEARCH_MIN_HIGH_TRUST_RESULTS",
    "SEARCH_MIN_ADDRESS_COVERAGE_PCT", "SEARCH_MIN_PHONE_COVERAGE_PCT",
    "SEARCH_MAX_DUPLICATE_RATE_PCT", "SEARCH_MIN_AVG_SCORE",
    "SEARCH_MAX_WEB_EVIDENCE_SOURCES", "SEARCH_MAX_AI_ENRICHMENTS",
    "SEARCH_ALLOW_BROWSER_EXTRACTION", "SEARCH_ALLOW_VECTOR_QUERY",
    "SEARCH_MAX_TOTAL_EXTERNAL_CALLS",
  ];
  for (const key of keys) setEnv(key, undefined);
}

function makeGoodBaseline(): MockCandidate[] {
  return Array.from({ length: 20 }, (_, i) => ({
    name: `Clinic ${i}`,
    address: `${i} Main St`,
    city: "Dallas",
    state: "TX",
    phone: `555-000${i}`,
    website: `https://clinic${i}.com`,
    coordinateStatus: "geocoded",
    trustTier: i < 5 ? "verified" : "directory",
    score: 60 + i,
  }));
}

function makeWeakBaseline(): MockCandidate[] {
  return Array.from({ length: 3 }, (_, i) => ({
    name: `Lead ${i}`,
    address: "",
    city: "Dallas",
    state: "TX",
    phone: "",
    website: `https://lead${i}.com`,
    coordinateStatus: "unverified",
    trustTier: "lead",
    score: 20,
  }));
}

function makeHighDuplicateBaseline(): MockCandidate[] {
  return Array.from({ length: 20 }, (_, i) => ({
    name: "Same Clinic",
    address: "100 Main St",
    city: "Dallas",
    state: "TX",
    phone: "555-0000",
    website: "https://sameclinic.com",
    coordinateStatus: "geocoded",
    trustTier: "verified",
    score: 60,
  }));
}

function makeWebReadySources(): SourceStatusReport[] {
  return [
    { sourceName: "LangSearch", envVar: "LANGSEARCH_API_KEY", configured: true, category: "web_search", adapterStatus: "active", usedBy: ["provider_discovery"], runtimeReady: true, missingRequiredConfig: [] },
    { sourceName: "Gemini", envVar: "GEMINI_API_KEY", configured: true, category: "ai_extraction", adapterStatus: "active", usedBy: ["enrichment"], runtimeReady: true, missingRequiredConfig: [] },
    { sourceName: "Browse AI", envVar: "BROWSE_AI_API_KEY", configured: true, category: "web_extraction", adapterStatus: "active", usedBy: ["enrichment"], runtimeReady: true, missingRequiredConfig: [] },
    { sourceName: "Pinecone", envVar: "PINECONE_API_KEY", configured: true, category: "vector_index", adapterStatus: "active", usedBy: ["indexing"], runtimeReady: true, missingRequiredConfig: [] },
    { sourceName: "RapidAPI Provider Search", envVar: "RAPIDAPI_PROVIDER_SEARCH_ENABLED", configured: true, category: "geocoding", adapterStatus: "active", usedBy: ["provider_discovery"], runtimeReady: true, missingRequiredConfig: [] },
  ];
}

function makeNoWebSources(): SourceStatusReport[] {
  return [
    { sourceName: "Gemini", envVar: "GEMINI_API_KEY", configured: true, category: "ai_extraction", adapterStatus: "active", usedBy: ["enrichment"], runtimeReady: true, missingRequiredConfig: [] },
  ];
}

function makeNoAiSources(): SourceStatusReport[] {
  return [
    { sourceName: "LangSearch", envVar: "LANGSEARCH_API_KEY", configured: true, category: "web_search", adapterStatus: "active", usedBy: ["provider_discovery"], runtimeReady: true, missingRequiredConfig: [] },
  ];
}

function getDecision(decisions: SourceDecision[], id: string): SourceDecision | undefined {
  return decisions.find((d) => d.sourceId === id);
}

// ── Tests ──────────────────────────────────────────────────────────────────

interface TestCase {
  name: string;
  setup: () => void;
  check: () => void;
}

const tests: TestCase[] = [
  {
    name: "Good baseline results → no escalation",
    setup: () => clearSearchEnv(),
    check: () => {
      const q = calculateSearchQuality(makeGoodBaseline());
      const t = getThresholdsForMode("balanced");
      const esc = shouldEscalateSearch(q, t);
      assert(!esc.shouldEscalate, `Should not escalate with good baseline. Reasons: ${esc.reasons.join(", ")}`);
    },
  },
  {
    name: "Too few total results → escalation",
    setup: () => clearSearchEnv(),
    check: () => {
      const q = calculateSearchQuality(makeWeakBaseline());
      const t = getThresholdsForMode("balanced");
      const esc = shouldEscalateSearch(q, t);
      assert(esc.shouldEscalate, "Should escalate with weak baseline");
      assert(esc.reasons.includes("too_few_total_results"), "Should report too_few_total_results");
    },
  },
  {
    name: "Too few verified coords → escalation",
    setup: () => clearSearchEnv(),
    check: () => {
      const q = calculateSearchQuality(makeWeakBaseline());
      const t = getThresholdsForMode("balanced");
      const esc = shouldEscalateSearch(q, t);
      assert(esc.reasons.includes("too_few_verified_coordinates"), "Should report too_few_verified_coordinates");
    },
  },
  {
    name: "Weak phone coverage → escalation",
    setup: () => clearSearchEnv(),
    check: () => {
      const candidates = Array.from({ length: 20 }, (_, i) => ({
        name: `Clinic ${i}`, address: `${i} Main St`, city: "Dallas", state: "TX",
        phone: i < 3 ? "555-0000" : "", website: `https://c${i}.com`,
        coordinateStatus: "geocoded", trustTier: "verified", score: 60,
      }));
      const q = calculateSearchQuality(candidates);
      const t = getThresholdsForMode("balanced");
      const esc = shouldEscalateSearch(q, t);
      assert(esc.reasons.includes("weak_phone_coverage"), `Should report weak_phone_coverage (phone: ${q.phoneCoveragePct}%)`);
    },
  },
  {
    name: "High duplicate rate → escalation",
    setup: () => clearSearchEnv(),
    check: () => {
      const q = calculateSearchQuality(makeHighDuplicateBaseline());
      const t = getThresholdsForMode("balanced");
      const esc = shouldEscalateSearch(q, t);
      assert(esc.reasons.includes("high_duplicate_rate"), `Should report high_duplicate_rate (dup: ${q.duplicateRatePct}%)`);
    },
  },
  {
    name: "Fast mode → no web/AI/browser budget",
    setup: () => clearSearchEnv(),
    check: () => {
      const b = getBudgetForMode("fast");
      assert(b.maxWebEvidenceSources === 0, "Fast mode should allow 0 web sources");
      assert(b.maxAiEnrichments === 0, "Fast mode should allow 0 AI enrichments");
      assert(!b.allowBrowserExtraction, "Fast mode should not allow browser extraction");
      assert(!b.allowVectorQuery, "Fast mode should not allow vector query");
      assert(b.maxTotalExternalCalls === 0, "Fast mode should allow 0 external calls");
    },
  },
  {
    name: "Balanced mode → small web/AI budget, no browser",
    setup: () => clearSearchEnv(),
    check: () => {
      const b = getBudgetForMode("balanced");
      assert(b.maxWebEvidenceSources === 2, "Balanced should allow 2 web sources");
      assert(b.maxAiEnrichments === 2, "Balanced should allow 2 AI enrichments");
      assert(!b.allowBrowserExtraction, "Balanced should not allow browser extraction");
      assert(b.allowVectorQuery, "Balanced should allow vector query");
    },
  },
  {
    name: "Deep mode → larger web/AI budget, no browser",
    setup: () => clearSearchEnv(),
    check: () => {
      const b = getBudgetForMode("deep");
      assert(b.maxWebEvidenceSources === 5, "Deep should allow 5 web sources");
      assert(b.maxAiEnrichments === 5, "Deep should allow 5 AI enrichments");
      assert(!b.allowBrowserExtraction, "Deep should not allow browser extraction");
    },
  },
  {
    name: "Background indexing → browser allowed",
    setup: () => clearSearchEnv(),
    check: () => {
      const b = getBudgetForMode("background_indexing");
      assert(b.allowBrowserExtraction, "Background indexing should allow browser extraction");
      assert(b.maxTotalExternalCalls === 25, "Background indexing should allow 25 external calls");
    },
  },
  {
    name: "Price discovery → browser allowed",
    setup: () => clearSearchEnv(),
    check: () => {
      const b = getBudgetForMode("price_discovery");
      assert(b.allowBrowserExtraction, "Price discovery should allow browser extraction");
    },
  },
  {
    name: "No runtime-ready web source → skip web evidence with reason",
    setup: () => clearSearchEnv(),
    check: () => {
      const q = calculateSearchQuality(makeWeakBaseline());
      const plan = buildSearchPlan({ mode: "balanced", serviceType: "occupational", baselineQuality: q, configuredSources: makeNoWebSources() });
      const web = getDecision(plan.sourceDecisions, "webevidence");
      assert(!!(web && !web.run), "Web evidence should not run without runtime-ready web source");
      assert(web!.reason.includes("no runtime-ready"), `Reason should mention no runtime-ready source, got: ${web!.reason}`);
    },
  },
  {
    name: "Runtime-ready web source + weak baseline → run limited web evidence",
    setup: () => clearSearchEnv(),
    check: () => {
      const q = calculateSearchQuality(makeWeakBaseline());
      const plan = buildSearchPlan({ mode: "balanced", serviceType: "occupational", baselineQuality: q, configuredSources: makeWebReadySources() });
      const web = getDecision(plan.sourceDecisions, "webevidence");
      assert(!!(web && web.run), "Web evidence should run with weak baseline and ready source");
      assert(plan.budget.maxWebEvidenceSources === 2, "Balanced mode should cap at 2 web sources");
    },
  },
  {
    name: "AI source ready + weak leads → allow capped AI enrichment",
    setup: () => clearSearchEnv(),
    check: () => {
      const q = calculateSearchQuality(makeWeakBaseline());
      const plan = buildSearchPlan({ mode: "balanced", serviceType: "occupational", baselineQuality: q, configuredSources: makeWebReadySources() });
      const ai = getDecision(plan.sourceDecisions, "ai_enrichment");
      assert(!!(ai && ai.run), "AI enrichment should run with weak leads and ready AI source");
      assert(plan.budget.maxAiEnrichments === 2, "Balanced mode should cap at 2 AI enrichments");
    },
  },
  {
    name: "Browser source ready in balanced mode → skipped because mode disallows browser",
    setup: () => clearSearchEnv(),
    check: () => {
      const q = calculateSearchQuality(makeWeakBaseline());
      const plan = buildSearchPlan({ mode: "balanced", serviceType: "occupational", baselineQuality: q, configuredSources: makeWebReadySources() });
      const browser = getDecision(plan.sourceDecisions, "browser_extraction");
      assert(!!(browser && !browser.run), "Browser extraction should not run in balanced mode");
      assert(browser!.reason.includes("disallows"), `Reason should mention mode disallows, got: ${browser!.reason}`);
    },
  },
  {
    name: "Pinecone ready + balanced mode → vector allowed",
    setup: () => clearSearchEnv(),
    check: () => {
      const q = calculateSearchQuality(makeGoodBaseline());
      const plan = buildSearchPlan({ mode: "balanced", serviceType: "occupational", baselineQuality: q, configuredSources: makeWebReadySources() });
      const vector = getDecision(plan.sourceDecisions, "vector_query");
      assert(!!(vector && vector.run), "Vector query should be allowed in balanced mode when ready");
    },
  },
];

// ── Run ────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

for (const test of tests) {
  try {
    test.setup();
    test.check();
    console.log(`  PASS: ${test.name}`);
    passed++;
  } catch (error) {
    console.error(`  FAIL: ${test.name} — ${String(error)}`);
    failed++;
  }
}

restoreEnv();
console.log(`\n${passed}/${tests.length} tests passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
