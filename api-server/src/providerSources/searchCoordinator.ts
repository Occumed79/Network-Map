import type { ProviderCandidate } from "./types";
import type { SourceStatusReport } from "../lib/apiSourceRegistry";

// ── Types ──────────────────────────────────────────────────────────────────

export type SearchMode =
  | "fast"
  | "balanced"
  | "deep"
  | "background_indexing"
  | "price_discovery";

export type SourceCostTier =
  | "free_internal"
  | "free_public"
  | "low_cost_api"
  | "metered_api"
  | "expensive_browser"
  | "vector";

export interface SearchQualityMetrics {
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

export interface SearchQualityThresholds {
  minTotalResults: number;
  minVerifiedCoordinateCount: number;
  minHighTrustCount: number;
  minAddressCoveragePct: number;
  minPhoneCoveragePct: number;
  maxDuplicateRatePct: number;
  minAvgScore: number;
}

export interface ApiBudget {
  maxWebEvidenceSources: number;
  maxAiEnrichments: number;
  allowBrowserExtraction: boolean;
  allowVectorQuery: boolean;
  maxTotalExternalCalls: number;
}

export interface SourceDecision {
  sourceId: string;
  run: boolean;
  reason: string;
  costTier: SourceCostTier;
}

export interface SearchPlan {
  mode: SearchMode;
  stage: string;
  sourceDecisions: SourceDecision[];
  budget: ApiBudget;
  thresholds: SearchQualityThresholds;
  shouldEscalate: boolean;
  escalationReasons: string[];
}

export interface SearchCoordinatorAudit {
  mode: SearchMode;
  qualityBeforeEscalation?: SearchQualityMetrics;
  qualityAfterEscalation?: SearchQualityMetrics;
  thresholds: SearchQualityThresholds;
  budget: ApiBudget;
  sourceDecisions: SourceDecision[];
  escalationReasons: string[];
  skippedSources: Array<{
    sourceId: string;
    reason: string;
  }>;
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

// ── TASK 2: Quality scoring ────────────────────────────────────────────────

/**
 * Compute aggregate quality metrics from a set of provider candidates.
 * Returns counts by trust tier, coverage percentages for address/phone/website,
 * an estimated duplicate rate, and score statistics.
 */
export function calculateSearchQuality(results: ProviderCandidate[]): SearchQualityMetrics {
  const totalResults = results.length;
  if (totalResults === 0) {
    return {
      totalResults: 0,
      verifiedCoordinateCount: 0,
      unverifiedLeadCount: 0,
      highTrustCount: 0,
      directoryTrustCount: 0,
      leadTrustCount: 0,
      addressCoveragePct: 0,
      phoneCoveragePct: 0,
      websiteCoveragePct: 0,
      duplicateRatePct: 0,
      avgScore: 0,
      maxScore: 0,
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

  // Duplicate estimation: repeated normalized name+city+state or repeated website
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
    totalResults,
    verifiedCoordinateCount,
    unverifiedLeadCount,
    highTrustCount,
    directoryTrustCount,
    leadTrustCount,
    addressCoveragePct,
    phoneCoveragePct,
    websiteCoveragePct,
    duplicateRatePct,
    avgScore,
    maxScore,
  };
}

// ── TASK 3: Thresholds by mode ─────────────────────────────────────────────

/**
 * Return the quality thresholds for a given search mode.
 * Each threshold can be overridden by a corresponding SEARCH_* environment variable.
 */
export function getThresholdsForMode(mode: SearchMode): SearchQualityThresholds {
  const defaults: Record<SearchMode, SearchQualityThresholds> = {
    fast: {
      minTotalResults: 8,
      minVerifiedCoordinateCount: 5,
      minHighTrustCount: 2,
      minAddressCoveragePct: 50,
      minPhoneCoveragePct: 25,
      maxDuplicateRatePct: 40,
      minAvgScore: 35,
    },
    balanced: {
      minTotalResults: 15,
      minVerifiedCoordinateCount: 8,
      minHighTrustCount: 3,
      minAddressCoveragePct: 60,
      minPhoneCoveragePct: 35,
      maxDuplicateRatePct: 35,
      minAvgScore: 45,
    },
    deep: {
      minTotalResults: 25,
      minVerifiedCoordinateCount: 12,
      minHighTrustCount: 5,
      minAddressCoveragePct: 70,
      minPhoneCoveragePct: 45,
      maxDuplicateRatePct: 30,
      minAvgScore: 50,
    },
    background_indexing: {
      minTotalResults: 50,
      minVerifiedCoordinateCount: 20,
      minHighTrustCount: 5,
      minAddressCoveragePct: 50,
      minPhoneCoveragePct: 20,
      maxDuplicateRatePct: 45,
      minAvgScore: 35,
    },
    price_discovery: {
      minTotalResults: 5,
      minVerifiedCoordinateCount: 0,
      minHighTrustCount: 0,
      minAddressCoveragePct: 20,
      minPhoneCoveragePct: 0,
      maxDuplicateRatePct: 50,
      minAvgScore: 25,
    },
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

// ── TASK 4: API budgets by mode ────────────────────────────────────────────

/**
 * Return the API call budget for a given search mode.
 * Controls how many web evidence sources, AI enrichments, and whether
 * browser extraction or vector queries are permitted.
 * Each field can be overridden by a corresponding SEARCH_* environment variable.
 */
export function getBudgetForMode(mode: SearchMode): ApiBudget {
  const defaults: Record<SearchMode, ApiBudget> = {
    fast: {
      maxWebEvidenceSources: 0,
      maxAiEnrichments: 0,
      allowBrowserExtraction: false,
      allowVectorQuery: false,
      maxTotalExternalCalls: 0,
    },
    balanced: {
      maxWebEvidenceSources: 2,
      maxAiEnrichments: 2,
      allowBrowserExtraction: false,
      allowVectorQuery: true,
      maxTotalExternalCalls: 4,
    },
    deep: {
      maxWebEvidenceSources: 5,
      maxAiEnrichments: 5,
      allowBrowserExtraction: false,
      allowVectorQuery: true,
      maxTotalExternalCalls: 10,
    },
    background_indexing: {
      maxWebEvidenceSources: 5,
      maxAiEnrichments: 10,
      allowBrowserExtraction: true,
      allowVectorQuery: true,
      maxTotalExternalCalls: 25,
    },
    price_discovery: {
      maxWebEvidenceSources: 3,
      maxAiEnrichments: 5,
      allowBrowserExtraction: true,
      allowVectorQuery: true,
      maxTotalExternalCalls: 15,
    },
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

// ── TASK 5: Escalation decision ────────────────────────────────────────────

/**
 * Compare quality metrics against thresholds and decide whether to escalate.
 * Returns a boolean and a list of machine-readable reason codes explaining
 * which threshold was missed (e.g. "too_few_total_results", "weak_phone_coverage").
 */
export function shouldEscalateSearch(
  quality: SearchQualityMetrics,
  thresholds: SearchQualityThresholds,
): { shouldEscalate: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (quality.totalResults < thresholds.minTotalResults) {
    reasons.push("too_few_total_results");
  }
  if (quality.verifiedCoordinateCount < thresholds.minVerifiedCoordinateCount) {
    reasons.push("too_few_verified_coordinates");
  }
  if (quality.highTrustCount < thresholds.minHighTrustCount) {
    reasons.push("too_few_high_trust_results");
  }
  if (quality.addressCoveragePct < thresholds.minAddressCoveragePct) {
    reasons.push("weak_address_coverage");
  }
  if (quality.phoneCoveragePct < thresholds.minPhoneCoveragePct) {
    reasons.push("weak_phone_coverage");
  }
  if (quality.duplicateRatePct > thresholds.maxDuplicateRatePct) {
    reasons.push("high_duplicate_rate");
  }
  if (quality.avgScore < thresholds.minAvgScore) {
    reasons.push("weak_average_score");
  }

  return { shouldEscalate: reasons.length > 0, reasons };
}

// ── TASK 6: Source planning ────────────────────────────────────────────────

function isWebEvidenceSourceReady(sources: SourceStatusReport[]): boolean {
  const webSearchSources = sources.filter(
    (s) => s.category === "web_search" && s.runtimeReady,
  );
  return webSearchSources.length > 0;
}

function isAiSourceReady(sources: SourceStatusReport[]): boolean {
  const aiSources = sources.filter(
    (s) => s.category === "ai_extraction" && s.runtimeReady,
  );
  return aiSources.length > 0;
}

function isBrowserSourceReady(sources: SourceStatusReport[]): boolean {
  const browserSources = sources.filter(
    (s) => s.category === "web_extraction" && s.sourceName !== "Firecrawl" && s.runtimeReady,
  );
  return browserSources.length > 0;
}

function isVectorSourceReady(sources: SourceStatusReport[]): boolean {
  const vectorSources = sources.filter(
    (s) => s.category === "vector_index" && s.runtimeReady,
  );
  return vectorSources.length > 0;
}

function isRapidApiReady(sources: SourceStatusReport[]): boolean {
  return sources.some(
    (s) => s.sourceName === "RapidAPI Provider Search" && s.runtimeReady,
  );
}

const FMCSA_SERVICES = new Set(["dotExam"]);

/**
 * Build a complete search plan that decides which sources to run, in what order,
 * and whether escalation is warranted.
 *
 * Internal/free sources always run. External sources (web evidence, RapidAPI,
 * AI enrichment, browser extraction, vector query) run only when the baseline
 * quality fails thresholds, the source is runtime-ready, and the mode's budget
 * permits it. Every decision includes a human-readable reason.
 */
export function buildSearchPlan(args: {
  mode: SearchMode;
  serviceType: string;
  baselineQuality?: SearchQualityMetrics;
  configuredSources: SourceStatusReport[];
}): SearchPlan {
  const { mode, serviceType, baselineQuality, configuredSources } = args;
  const budget = getBudgetForMode(mode);
  const thresholds = getThresholdsForMode(mode);

  const decisions: SourceDecision[] = [];
  const escalationReasons: string[] = [];

  // Determine if we should escalate
  let shouldEscalate = false;
  if (baselineQuality) {
    const esc = shouldEscalateSearch(baselineQuality, thresholds);
    shouldEscalate = esc.shouldEscalate;
    escalationReasons.push(...esc.reasons);
  }

  // ── Internal/free sources: always run ──
  decisions.push({
    sourceId: "clinicimports",
    run: true,
    reason: "free_internal — always run as baseline",
    costTier: "free_internal",
  });

  decisions.push({
    sourceId: "npi",
    run: true,
    reason: "free_internal — always run as baseline",
    costTier: "free_internal",
  });

  if (FMCSA_SERVICES.has(serviceType)) {
    decisions.push({
      sourceId: "fmcsa",
      run: true,
      reason: "free_internal — relevant for DOT exam searches",
      costTier: "free_internal",
    });
  } else {
    decisions.push({
      sourceId: "fmcsa",
      run: false,
      reason: "skipped — not relevant for this service type",
      costTier: "free_internal",
    });
  }

  // ── Web evidence ──
  const webReady = isWebEvidenceSourceReady(configuredSources);
  const modesAllowingWeb: SearchMode[] = ["balanced", "deep", "background_indexing", "price_discovery"];
  if (modesAllowingWeb.includes(mode) && shouldEscalate && webReady && budget.maxWebEvidenceSources > 0) {
    decisions.push({
      sourceId: "webevidence",
      run: true,
      reason: `escalation triggered (${escalationReasons.join(", ")}) — ${budget.maxWebEvidenceSources} source(s) capped`,
      costTier: "low_cost_api",
    });
  } else if (!modesAllowingWeb.includes(mode)) {
    decisions.push({
      sourceId: "webevidence",
      run: false,
      reason: `skipped — mode "${mode}" does not allow web evidence`,
      costTier: "low_cost_api",
    });
  } else if (!shouldEscalate) {
    decisions.push({
      sourceId: "webevidence",
      run: false,
      reason: "skipped — baseline quality meets thresholds",
      costTier: "low_cost_api",
    });
  } else if (!webReady) {
    decisions.push({
      sourceId: "webevidence",
      run: false,
      reason: "skipped — no runtime-ready web evidence source configured",
      costTier: "low_cost_api",
    });
  } else {
    decisions.push({
      sourceId: "webevidence",
      run: false,
      reason: `skipped — budget allows ${budget.maxWebEvidenceSources} web sources but conditions not met`,
      costTier: "low_cost_api",
    });
  }

  // ── RapidAPI ──
  const rapidReady = isRapidApiReady(configuredSources);
  if (modesAllowingWeb.includes(mode) && shouldEscalate && rapidReady) {
    decisions.push({
      sourceId: "rapidapi",
      run: true,
      reason: "escalation triggered — RapidAPI provider search available",
      costTier: "metered_api",
    });
  } else if (!rapidReady) {
    decisions.push({
      sourceId: "rapidapi",
      run: false,
      reason: "skipped — RapidAPI not runtime-ready",
      costTier: "metered_api",
    });
  } else if (!shouldEscalate) {
    decisions.push({
      sourceId: "rapidapi",
      run: false,
      reason: "skipped — baseline quality meets thresholds",
      costTier: "metered_api",
    });
  } else {
    decisions.push({
      sourceId: "rapidapi",
      run: false,
      reason: `skipped — mode "${mode}" does not allow RapidAPI escalation`,
      costTier: "metered_api",
    });
  }

  // ── AI enrichment ──
  const aiReady = isAiSourceReady(configuredSources);
  const webRunning = decisions.find((d) => d.sourceId === "webevidence")?.run === true;
  if (aiReady && (webRunning || (baselineQuality && baselineQuality.leadTrustCount > 0)) && budget.maxAiEnrichments > 0) {
    decisions.push({
      sourceId: "ai_enrichment",
      run: true,
      reason: `AI enrichment capped at ${budget.maxAiEnrichments} enrichment(s)`,
      costTier: "low_cost_api",
    });
  } else if (!aiReady) {
    decisions.push({
      sourceId: "ai_enrichment",
      run: false,
      reason: "skipped — no runtime-ready AI extraction source",
      costTier: "low_cost_api",
    });
  } else if (budget.maxAiEnrichments === 0) {
    decisions.push({
      sourceId: "ai_enrichment",
      run: false,
      reason: `skipped — mode "${mode}" budget allows 0 AI enrichments`,
      costTier: "low_cost_api",
    });
  } else {
    decisions.push({
      sourceId: "ai_enrichment",
      run: false,
      reason: "skipped — no web evidence results to enrich and no existing leads",
      costTier: "low_cost_api",
    });
  }

  // ── Browser extraction ──
  const browserReady = isBrowserSourceReady(configuredSources);
  if (browserReady && budget.allowBrowserExtraction) {
    decisions.push({
      sourceId: "browser_extraction",
      run: true,
      reason: `browser extraction allowed in "${mode}" mode`,
      costTier: "expensive_browser",
    });
  } else if (!browserReady) {
    decisions.push({
      sourceId: "browser_extraction",
      run: false,
      reason: "skipped — no runtime-ready browser extraction source",
      costTier: "expensive_browser",
    });
  } else {
    decisions.push({
      sourceId: "browser_extraction",
      run: false,
      reason: `skipped — mode "${mode}" does not allow browser extraction`,
      costTier: "expensive_browser",
    });
  }

  // ── Vector retrieval ──
  const vectorReady = isVectorSourceReady(configuredSources);
  if (vectorReady && budget.allowVectorQuery) {
    decisions.push({
      sourceId: "vector_query",
      run: true,
      reason: `vector query allowed in "${mode}" mode`,
      costTier: "vector",
    });
  } else if (!vectorReady) {
    decisions.push({
      sourceId: "vector_query",
      run: false,
      reason: "skipped — Pinecone not runtime-ready",
      costTier: "vector",
    });
  } else {
    decisions.push({
      sourceId: "vector_query",
      run: false,
      reason: `skipped — mode "${mode}" does not allow vector query`,
      costTier: "vector",
    });
  }

  return {
    mode,
    stage: shouldEscalate ? "escalated" : "baseline_sufficient",
    sourceDecisions: decisions,
    budget,
    thresholds,
    shouldEscalate,
    escalationReasons,
  };
}
