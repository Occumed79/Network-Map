import type { ProviderCandidate, SearchParams, SourceResult, SearchAudit, UnifiedSearchResponse } from "./types";
import { searchNpi } from "./adapters/npi";
import { searchFmcsa } from "./adapters/fmcsa";
import { searchClinicImports } from "./adapters/clinicImportsDb";
import { searchWebEvidence } from "./adapters/webEvidence";
import { dedupeCandidates } from "./dedupe";
import { geocodeProviders } from "./geocode";
import { scoreProvider } from "./scoring";
import { searchProviders as searchRapidApiProviders } from "../services/rapidApi/adapters/providerSearchAdapter.js";
import { getSourceStatusReport } from "../lib/apiSourceRegistry";

const SERVICE_ROUTING: Record<string, string[]> = {
  dotExam: ["npi", "fmcsa", "clinicimports", "rapidapi", "webevidence"],
  faamedical: ["npi", "clinicimports", "rapidapi", "webevidence"],
  physicalExam: ["npi", "clinicimports", "rapidapi", "webevidence"],
  urgentCare: ["npi", "clinicimports", "rapidapi", "webevidence"],
  mammogram: ["npi", "clinicimports", "rapidapi", "webevidence"],
  radiology: ["npi", "clinicimports", "rapidapi", "webevidence"],
  stressTest: ["npi", "clinicimports", "rapidapi", "webevidence"],
  drugscreen: ["npi", "clinicimports", "rapidapi", "webevidence"],
  lab: ["npi", "clinicimports", "rapidapi", "webevidence"],
  audiology: ["npi", "clinicimports", "rapidapi", "webevidence"],
  dental: ["npi", "clinicimports", "rapidapi", "webevidence"],
  physio: ["npi", "clinicimports", "rapidapi", "webevidence"],
  chiropractic: ["npi", "clinicimports", "rapidapi", "webevidence"],
  behavioral: ["npi", "clinicimports", "rapidapi", "webevidence"],
  pulmonary: ["npi", "clinicimports", "rapidapi", "webevidence"],
  occupational: ["npi", "clinicimports", "rapidapi", "webevidence"],
  primaryCare: ["npi", "clinicimports", "rapidapi", "webevidence"],
};

const ADAPTER_REGISTRY: Record<string, (city: string, state: string, serviceType: string, params: SearchParams) => Promise<ProviderCandidate[]>> = {
  npi: (c, s, _st, _p) => searchNpi(c, s, _st),
  fmcsa: (c, _s, _st, _p) => searchFmcsa(c, _s),
  clinicimports: (c, s, _st, _p) => searchClinicImports(c, s),
  rapidapi: (_c, _s, _st, p) => searchRapidApiFromOrchestrator(p),
  webevidence: (c, s, st, p) => searchWebEvidence(c, s, st, p),
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
    source: 'rapidapi',
    sourceDetail: result.debug.succeeded || 'rapidapi',
    sourceUrl: p.sourceUrl,
    confidence: p.confidence >= 75 ? 'high' : p.confidence >= 50 ? 'medium' : 'low',
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

export async function runUnifiedSearch(params: SearchParams): Promise<UnifiedSearchResponse> {
  const startMs = performance.now();
  const { city, state, radiusMiles, serviceType, centerLat, centerLng } = params;
  const adapterIds = SERVICE_ROUTING[serviceType] || ["npi"];
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
    const labelMap: Record<string, string> = { npi: "NPI Registry", fmcsa: "FMCSA National Registry", clinicimports: "Imported Clinics (DB)", rapidapi: "RapidAPI", webevidence: "Web Evidence" };
    if (outcome.status === "fulfilled") {
      rawResultCounts[id] = outcome.value.results.length;
      allCandidates.push(...outcome.value.results);
      sourceResults.push({ sourceId: id, sourceLabel: labelMap[id] || id, ok: true, count: outcome.value.results.length });
    } else {
      const err = String(outcome.reason?.message || outcome.reason || "failed");
      errorsBySource[id] = err;
      sourceResults.push({ sourceId: id, sourceLabel: labelMap[id] || id, ok: false, count: 0, error: err });
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
    return { ...c, score, confidence };
  });

  const geocoded = await geocodeProviders(scored, centerLat, centerLng);
  const geocodedCount = geocoded.filter((p) => p.lat !== undefined && p.lng !== undefined).length;

  const withDistance = geocoded.map((p) => {
    if (p.lat === undefined || p.lng === undefined) return p;
    return { ...p, distanceMiles: haversineMiles(centerLat, centerLng, p.lat, p.lng) };
  });

  const sorted = withDistance.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.distanceMiles || 999) - (b.distanceMiles || 999);
  });

  const finalMarkerCount = sorted.filter((p) => p.lat !== undefined && p.lng !== undefined).length;
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

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
