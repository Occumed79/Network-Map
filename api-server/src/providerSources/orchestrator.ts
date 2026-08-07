import type { ProviderCandidate, SearchParams, SourceResult, UnifiedSearchResponse, TrustTier } from "./types";
import { searchNpi } from "./adapters/npi";
import { searchFmcsa } from "./adapters/fmcsa";
import { searchClinicImports } from "./adapters/clinicImportsDb";
import { searchMapInventory } from "./adapters/mapInventory";
import { searchOpenStreetMap } from "./adapters/openStreetMap";
import { searchWebEvidence, type WebEvidenceOptions } from "./adapters/webEvidence";
import { dedupeCandidates } from "./dedupe";
import { geocodeProviders } from "./geocode";
import { haversineMiles, isValidCoordinate } from "./distance";
import { applyProviderIntegrity, coordinateAllowed } from "./integrity";
import { getBaselineProviderSources, type ProviderSourceId } from "./serviceRouting";
import { scoreProvider, assignTrustTier } from "./scoring";
import { searchProviders as searchRapidApiProviders } from "../services/rapidApi/adapters/providerSearchAdapter.js";
import { getSourceStatusReport } from "../lib/apiSourceRegistry";
import { buildSearchPlan, calculateSearchQuality, type SearchMode, type SearchCoordinatorAudit } from "./searchCoordinator";

const SOURCE_LABELS: Record<string, string> = {
  npi: "NPI Registry",
  fmcsa: "FMCSA National Registry",
  clinicimports: "Imported Clinics (DB)",
  mapinventory: "Network Map Provider Inventory",
  osm: "OpenStreetMap",
  rapidapi: "RapidAPI Provider Search",
  webevidence: "Unified Web Evidence",
};

type Adapter = (city: string, state: string, serviceType: string, params: SearchParams) => Promise<ProviderCandidate[]>;

const ADAPTER_REGISTRY: Partial<Record<ProviderSourceId, Adapter>> = {
  npi: (city, state, serviceType) => searchNpi(city, state, serviceType),
  fmcsa: (city, state) => searchFmcsa(city, state),
  clinicimports: (city, state) => searchClinicImports(city, state),
  mapinventory: (_city, _state, _serviceType, params) => searchMapInventory(params),
  rapidapi: (_city, _state, _serviceType, params) => searchRapidApiFromOrchestrator(params),
  webevidence: (city, state, serviceType, params) => searchWebEvidence(city, state, serviceType, params),
};

async function searchRapidApiFromOrchestrator(params: SearchParams): Promise<ProviderCandidate[]> {
  const { city, state, radiusMiles, serviceType, centerLat, centerLng } = params;
  const result = await searchRapidApiProviders({
    location: `${city}, ${state}`,
    lat: centerLat,
    lng: centerLng,
    radiusMiles,
    serviceKeywords: [serviceType],
    city,
    adminArea: state,
    limit: 20,
  });
  const observedAt = new Date().toISOString();
  return result.providers.map((provider, index) => ({
    id: provider.id || `rapidapi-${index}-${provider.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: provider.name,
    address: provider.address || "",
    city: provider.city || city,
    state: provider.adminArea || state,
    postalCode: provider.postalCode || "",
    country: "US",
    phone: provider.phone || "",
    website: provider.website || "",
    lat: provider.lat ?? undefined,
    lng: provider.lng ?? undefined,
    coordinateStatus: provider.lat != null && provider.lng != null ? "verified_address" as const : "unverified" as const,
    coordinateSource: provider.lat != null && provider.lng != null ? "RapidAPI upstream" : undefined,
    providerCategory: serviceType,
    services: [serviceType],
    source: "rapidapi",
    sourceDetail: result.debug.succeeded || "rapidapi",
    sourceUrl: provider.sourceUrl ?? undefined,
    confidence: provider.confidence >= 75 ? "high" : provider.confidence >= 50 ? "medium" : "low",
    trustTier: "directory" as const,
    score: provider.confidence,
    badges: ["RapidAPI"],
    evidence: provider.evidence.map((evidence) => ({
      serviceDetected: serviceType,
      evidenceUrl: provider.sourceUrl || "",
      evidenceTextSnippet: evidence,
      confidence: provider.confidence,
      source: "rapidapi",
    })),
    provenance: [{ source: "RapidAPI", sourceRecordId: provider.id || undefined, sourceUrl: provider.sourceUrl ?? undefined, observedAt, coordinateSource: provider.lat != null && provider.lng != null ? "RapidAPI upstream" : undefined }],
    lastSeenAt: observedAt,
    matchReason: `RapidAPI service match: ${serviceType}`,
    distanceMiles: provider.distanceMiles ?? undefined,
    _rawSources: ["rapidapi"],
  }));
}

async function runSource(id: ProviderSourceId, params: SearchParams): Promise<{ candidates: ProviderCandidate[]; statuses: SourceResult[] }> {
  if (id === "osm") {
    const output = await searchOpenStreetMap(params);
    return {
      candidates: output.candidates,
      statuses: output.sources.map((source) => ({
        sourceId: source.sourceId,
        sourceLabel: source.sourceLabel,
        ok: source.ok,
        count: source.count,
        error: source.error,
        durationMs: source.durationMs,
        timedOut: source.timedOut,
      })),
    };
  }
  const adapter = ADAPTER_REGISTRY[id];
  if (!adapter) return { candidates: [], statuses: [{ sourceId: id, sourceLabel: SOURCE_LABELS[id] || id, ok: false, count: 0, error: "Adapter is not registered" }] };
  const startedAt = Date.now();
  try {
    const candidates = await adapter(params.city, params.state, params.serviceType, params);
    return { candidates, statuses: [{ sourceId: id, sourceLabel: SOURCE_LABELS[id] || id, ok: true, count: candidates.length, durationMs: Date.now() - startedAt }] };
  } catch (error) {
    return { candidates: [], statuses: [{ sourceId: id, sourceLabel: SOURCE_LABELS[id] || id, ok: false, count: 0, error: error instanceof Error ? error.message : String(error), durationMs: Date.now() - startedAt }] };
  }
}

export { haversineMiles } from "./distance";

export async function runUnifiedSearch(params: SearchParams): Promise<UnifiedSearchResponse> {
  const startMs = performance.now();
  const { radiusMiles, serviceType, centerLat, centerLng } = params;
  const coordinatePolicy = params.coordinatePolicy || "include_unverified";
  const mode: SearchMode = params.mode || (process.env.SEARCH_DEFAULT_MODE as SearchMode) || "balanced";
  const sourceStatus = getSourceStatusReport();
  const configuredApiSources = sourceStatus.filter((source) => source.configured).map((source) => source.sourceName);
  const missingApiSources = sourceStatus.filter((source) => !source.configured).map((source) => source.sourceName);
  const configuredButNotWired = sourceStatus.filter((source) => source.configured && source.adapterStatus === "configured_not_wired").map((source) => source.sourceName);

  const sourceResults: SourceResult[] = [];
  const allCandidates: ProviderCandidate[] = [];
  const errorsBySource: Record<string, string> = {};
  const rawResultCounts: Record<string, number> = {};
  const requestedBaseline = (params.sourceIds?.length ? params.sourceIds : getBaselineProviderSources(serviceType))
    .filter((id): id is ProviderSourceId => ["npi", "fmcsa", "clinicimports", "mapinventory", "osm", "rapidapi", "webevidence"].includes(id));

  const baselineSettled = await Promise.all(requestedBaseline.map((id) => runSource(id, params)));
  baselineSettled.forEach((output, index) => {
    const id = requestedBaseline[index];
    allCandidates.push(...output.candidates);
    rawResultCounts[id] = output.candidates.length;
    for (const status of output.statuses) {
      sourceResults.push(status);
      if (!status.ok && status.error) errorsBySource[status.sourceId] = status.error;
    }
  });

  const baselineDeduped = dedupeCandidates(allCandidates);
  const baselineScored = baselineDeduped.map((candidate) => ({ ...candidate, score: scoreProvider(candidate), trustTier: assignTrustTier(candidate) as TrustTier }));
  const baselineQuality = calculateSearchQuality(baselineScored);
  const plan = buildSearchPlan({ mode, serviceType, baselineQuality, configuredSources: sourceStatus });

  if (!params.sourceIds?.length) {
    const externalIds: ProviderSourceId[] = [];
    if (plan.sourceDecisions.find((decision) => decision.sourceId === "webevidence")?.run) externalIds.push("webevidence");
    if (plan.sourceDecisions.find((decision) => decision.sourceId === "rapidapi")?.run) externalIds.push("rapidapi");
    for (const id of externalIds) {
      if (id === "webevidence") {
        const decision = plan.sourceDecisions.find((item) => item.sourceId === "ai_enrichment");
        const options: WebEvidenceOptions = { maxSources: plan.budget.maxWebEvidenceSources, maxAiEnrichments: plan.budget.maxAiEnrichments, allowAiEnrichment: decision?.run === true };
        const startedAt = Date.now();
        try {
          const candidates = await searchWebEvidence(params.city, params.state, serviceType, params, options);
          allCandidates.push(...candidates);
          rawResultCounts[id] = candidates.length;
          sourceResults.push({ sourceId: id, sourceLabel: SOURCE_LABELS[id], ok: true, count: candidates.length, durationMs: Date.now() - startedAt });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errorsBySource[id] = message;
          sourceResults.push({ sourceId: id, sourceLabel: SOURCE_LABELS[id], ok: false, count: 0, error: message, durationMs: Date.now() - startedAt });
        }
      } else {
        const output = await runSource(id, params);
        allCandidates.push(...output.candidates);
        rawResultCounts[id] = output.candidates.length;
        for (const status of output.statuses) {
          sourceResults.push(status);
          if (!status.ok && status.error) errorsBySource[status.sourceId] = status.error;
        }
      }
    }
  }

  const normalizedCount = allCandidates.length;
  const deduped = dedupeCandidates(allCandidates);
  const dedupedCount = deduped.length;
  const scored = deduped.map((candidate) => {
    const score = scoreProvider(candidate);
    const confidence: "high" | "medium" | "low" = score >= 100 ? "high" : score >= 50 ? "medium" : "low";
    return { ...candidate, score, confidence, trustTier: assignTrustTier(candidate) as TrustTier };
  });

  const geocoded = await geocodeProviders(scored, centerLat, centerLng);
  const integrityChecked = geocoded.map(applyProviderIntegrity);
  const quarantined = integrityChecked.filter((candidate) => candidate.quarantineStatus === "quarantined");
  const accepted = integrityChecked.filter((candidate) => candidate.quarantineStatus !== "quarantined");
  const geocodedCount = accepted.filter((candidate) => coordinateAllowed(candidate.coordinateStatus, "include_city_centroid")).length;
  const validCenter = isValidCoordinate(centerLat, centerLng);
  const withDistance = accepted.map((candidate) => {
    if (!validCenter || candidate.lat === undefined || candidate.lng === undefined) return candidate;
    return { ...candidate, distanceMiles: haversineMiles(centerLat, centerLng, candidate.lat, candidate.lng) };
  });
  const radiusFiltered = radiusMiles > 0 && validCenter
    ? withDistance.filter((candidate) => candidate.coordinateStatus === "unverified" || (candidate.distanceMiles !== undefined && candidate.distanceMiles <= radiusMiles))
    : withDistance;
  const coordinateFiltered = radiusFiltered.filter((candidate) => coordinateAllowed(candidate.coordinateStatus, coordinatePolicy));
  const normalResults = params.includeQuarantined ? [...coordinateFiltered, ...quarantined] : coordinateFiltered;
  const sorted = normalResults.sort((a, b) => {
    const aPlaced = a.coordinateStatus !== "unverified" && a.coordinateStatus !== "invalid" ? 0 : 1;
    const bPlaced = b.coordinateStatus !== "unverified" && b.coordinateStatus !== "invalid" ? 0 : 1;
    if (aPlaced !== bPlaced) return aPlaced - bPlaced;
    if (b.score !== a.score) return b.score - a.score;
    return (a.distanceMiles ?? 999) - (b.distanceMiles ?? 999);
  });

  const finalMarkerCount = sorted.filter((candidate) => candidate.lat !== undefined && candidate.lng !== undefined && coordinateAllowed(candidate.coordinateStatus, coordinatePolicy)).length;
  const durationMs = Math.round(performance.now() - startMs);
  const finalQuality = calculateSearchQuality(scored);
  const coordinatorAudit: SearchCoordinatorAudit = {
    mode,
    qualityBeforeEscalation: baselineQuality,
    qualityAfterEscalation: finalQuality,
    thresholds: plan.thresholds,
    budget: plan.budget,
    sourceDecisions: plan.sourceDecisions,
    escalationReasons: plan.escalationReasons,
    skippedSources: plan.sourceDecisions.filter((decision) => !decision.run).map((decision) => ({ sourceId: decision.sourceId, reason: decision.reason })),
  };
  const degradedSources = sourceResults.filter((source) => !source.ok).map((source) => source.sourceLabel);

  return {
    params: { ...params, coordinatePolicy },
    results: sorted,
    quarantinedResults: quarantined,
    sourceResults,
    incomplete: degradedSources.length > 0,
    degradedSources,
    audit: {
      serviceType,
      activeAdapters: sourceResults.map((source) => source.sourceId),
      urlsRequested: [],
      rawResultCounts,
      normalizedCount,
      dedupedCount,
      geocodedCount,
      finalMarkerCount,
      quarantinedCount: quarantined.length,
      invalidCoordinateCount: integrityChecked.filter((candidate) => candidate.coordinateStatus === "invalid").length,
      errorsBySource,
      durationMs,
      configuredApiSources,
      missingApiSources,
      configuredButNotWired,
      searchCoordinator: coordinatorAudit,
    },
  };
}
