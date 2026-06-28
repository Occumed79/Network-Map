import type { ProviderCandidate, SearchParams, SourceResult, SearchAudit, UnifiedSearchResponse, TrustTier } from "./types";
import { searchNpi } from "./adapters/npi";
import { searchFmcsa } from "./adapters/fmcsa";
import { searchClinicImports } from "./adapters/clinicImportsDb";
import { searchLangSearchEvidence } from "./adapters/langSearch";
import { searchWebEvidence } from "./adapters/webEvidence";
import { isLangSearchConfigured } from "../lib/langSearchClient";
import { dedupeCandidates } from "./dedupe";
import { geocodeProviders } from "./geocode";
import { scoreProvider, assignTrustTier } from "./scoring";
import { searchProviders as searchRapidApiProviders } from "../services/rapidApi/adapters/providerSearchAdapter.js";
import { getSourceStatusReport } from "../lib/apiSourceRegistry";

const SERVICE_ROUTING: Record<string, string[]> = {
  dotExam: ["npi", "fmcsa", "clinicimports"],
  faamedical: ["npi", "clinicimports"],
  physicalExam: ["npi", "clinicimports"],
  urgentCare: ["npi", "clinicimports"],
  mammogram: ["npi", "clinicimports"],
  radiology: ["npi", "clinicimports"],
  stressTest: ["npi", "clinicimports"],
  drugscreen: ["npi", "clinicimports"],
  lab: ["npi", "clinicimports"],
  audiology: ["npi", "clinicimports"],
  dental: ["npi", "clinicimports"],
  physio: ["npi", "clinicimports"],
  chiropractic: ["npi", "clinicimports"],
  behavioral: ["npi", "clinicimports"],
  pulmonary: ["npi", "clinicimports"],
  occupational: ["npi", "clinicimports"],
  primaryCare: ["npi", "clinicimports"],
};

const ADAPTER_REGISTRY: Record<string, (city: string, state: string, serviceType: string, params: SearchParams) => Promise<ProviderCandidate[]>> = {
  npi: (c, s, _st, _p) => searchNpi(c, s, _st),
  fmcsa: (c, _s, _st, _p) => searchFmcsa(c, _s),
  clinicimports: (c, s, _st, _p) => searchClinicImports(c, s),
  langsearch: (c, s, st, _p) => searchLangSearchEvidence(c, s, st),
  rapidapi: (_c, _s, _st, p) => searchRapidApiFromOrchestrator(p),
  webevidence: (c, s, st, p) => searchWebEvidence(c, s, st, p),
};

const SOURCE_LABELS: Record<string, string> = {
  npi: "NPI Registry",
  fmcsa: "FMCSA National Registry",
  clinicimports: "Imported Clinics (DB)",
  langsearch: "LangSearch Web Evidence",
  rapidapi: "RapidAPI",
  webevidence: "Web Evidence",
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
    state,
    limit: 20,
  });

  // Convert RapidAPI ProviderCandidate to the internal ProviderCandidate format
  return result.providers.map((p) => ({
    id: p.id || `rapidapi-${Date.now()}-${Math.random()}`,
    name: p.name,
    address: p.address || '',
    city: p.city || city,
    state: p.state || state,
    postalCode: p.postalCode || '',
    phone: p.phone || '',
    website: p.website || '',
    lat: p.lat,
    lng: p.lng,
    coordinateStatus: 'geocoded' as const,
    source: 'rapidapi',
    sourceDetail: result.debug.succeeded || 'rapidapi',
    sourceUrl: p.sourceUrl,
    confidence: p.confidence >= 75 ? 'high' : p.confidence >= 50 ? 'medium' : 'low',
    trustTier: 'directory' as const,
    score: p.confidence,
    badges: ['RapidAPI'],
    evidence: p.evidence.map((e) => ({
      serviceDetected: serviceType,
      evidenceUrl: p.sourceUrl || '',
      evidenceTextSnippet: e,
      confidence: p.confidence,
      source: 'rapidapi',
    })),
    distanceMiles: p.distanceMiles,
    _rawSources: ['rapidapi'],
  }));
}

function activeAdapterIds(serviceType: string): string[] {
  const adapterIds = [...(SERVICE_ROUTING[serviceType] || ["npi"] )];

  // LangSearch is an optional lead/evidence layer. It never replaces NPI/imported data,
  // and it only runs when the backend has LANGSEARCH_API_KEY configured.
  if (
    process.env.LANGSEARCH_PROVIDER_EVIDENCE !== "false" &&
    isLangSearchConfigured() &&
    !adapterIds.includes("langsearch")
  ) {
    adapterIds.push("langsearch");
  }

  return adapterIds;
}

export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function runUnifiedSearch(params: SearchParams): Promise<UnifiedSearchResponse> {
  const startMs = performance.now();
  const { city, state, radiusMiles, serviceType, centerLat, centerLng } = params;
  const adapterIds = activeAdapterIds(serviceType);
  const adapters = adapterIds
    .map((id) => ({ id, fn: ADAPTER_REGISTRY[id] }))
    .filter((a): a is { id: string; fn: (c: string, s: string, st: string, p: SearchParams) => Promise<ProviderCandidate[]> } => Boolean(a.fn));

  const sourceResults: SourceResult[] = [];
  const allCandidates: ProviderCandidate[] = [];
  const errorsBySource: Record<string, string> = {};
  const rawResultCounts: Record<string, number> = {};

  // Get API source status for the audit
  const sourceStatus = getSourceStatusReport();
  const configuredApiSources = sourceStatus.filter((s) => s.configured).map((s) => s.sourceName);
  const missingApiSources = sourceStatus.filter((s) => !s.configured).map((s) => s.sourceName);
  const configuredButNotWired = sourceStatus.filter((s) => s.configured && s.adapterStatus === "configured_not_wired").map((s) => s.sourceName);

  const settled = await Promise.allSettled(
    adapters.map(async ({ id, fn }) => {
      const results = await fn(city, state, serviceType, params);
      return { id, results };
    }),
  );

  settled.forEach((outcome, i) => {
    const { id } = adapters[i];
    if (outcome.status === "fulfilled") {
      rawResultCounts[id] = outcome.value.results.length;
      allCandidates.push(...outcome.value.results);
      sourceResults.push({ sourceId: id, sourceLabel: SOURCE_LABELS[id] || id, ok: true, count: outcome.value.results.length });
    } else {
      const err = String(outcome.reason?.message || outcome.reason || "failed");
      errorsBySource[id] = err;
      sourceResults.push({ sourceId: id, sourceLabel: SOURCE_LABELS[id] || id, ok: false, count: 0, error: err });
    }
  });

  const normalizedCount = allCandidates.length;
  const deduped = dedupeCandidates(allCandidates);
  const dedupedCount = deduped.length;

  const scored = deduped.map((c) => {
    const score = scoreProvider(c);
    let confidence: "high" | "medium" | "low" = "low";
    if (score >= 100) confidence = "high";
    else if (score >= 50) confidence = "medium";
    const trustTier: TrustTier = assignTrustTier(c);
    return { ...c, score, confidence, trustTier };
  });

  const geocoded = await geocodeProviders(scored, centerLat, centerLng);
  const geocodedCount = geocoded.filter((p) => p.coordinateStatus !== "unverified").length;

  const withDistance = geocoded.map((p) => {
    if (p.lat === undefined || p.lng === undefined) return p;
    return { ...p, distanceMiles: haversineMiles(centerLat, centerLng, p.lat, p.lng) };
  });

  // Enforce radius filtering for radius-mode searches
  const filtered = radiusMiles > 0
    ? withDistance.filter((p) => {
        // Always include unplaced results (they appear in list only)
        if (p.coordinateStatus === "unverified") return true;
        // Filter placed results by radius
        return p.distanceMiles !== undefined && p.distanceMiles <= radiusMiles;
      })
    : withDistance;

  const sorted = filtered.sort((a, b) => {
    // Placed results first, then unplaced
    const aPlaced = a.coordinateStatus !== "unverified" ? 0 : 1;
    const bPlaced = b.coordinateStatus !== "unverified" ? 0 : 1;
    if (aPlaced !== bPlaced) return aPlaced - bPlaced;
    if (b.score !== a.score) return b.score - a.score;
    return (a.distanceMiles || 999) - (b.distanceMiles || 999);
  });

  const finalMarkerCount = sorted.filter((p) => p.coordinateStatus !== "unverified").length;
  const durationMs = Math.round(performance.now() - startMs);

  return {
    params,
    results: sorted,
    sourceResults,
    audit: {
      serviceType,
      activeAdapters: adapters.map((a) => a.id),
      urlsRequested: [],
      rawResultCounts,
      normalizedCount,
      dedupedCount,
      geocodedCount,
      finalMarkerCount,
      errorsBySource,
      durationMs,
      configuredApiSources,
      missingApiSources,
      configuredButNotWired,
    },
  };
}
