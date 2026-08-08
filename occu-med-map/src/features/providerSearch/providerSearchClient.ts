export type ProviderSource = 'NPI' | 'OpenStreetMap' | 'WebHint' | 'FMCSA' | 'Manual Import' | string;
export type CoordinateStatus = 'verified_exact' | 'verified_address' | 'city_centroid' | 'unverified' | 'invalid';
export type TrustTier = 'verified' | 'registry' | 'directory' | 'lead';

export type ProviderProvenance = { source: string; sourceRecordId?: string; sourceUrl?: string; observedAt?: string; coordinateSource?: string };
export type ProviderCandidate = {
  id: string; name: string; address: string; city: string; state: string; postalCode: string; country?: string;
  phone: string; fax?: string; website: string; lat?: number; lng?: number; coordinateStatus: CoordinateStatus; coordinateSource?: string;
  providerCategory?: string; services?: string[]; taxonomy?: string; taxonomyCode?: string; npi?: string; source: ProviderSource;
  sourceDetail?: string; sourceUrl?: string; confidence: 'high' | 'medium' | 'low'; trustTier: TrustTier; score: number;
  badges: string[]; evidence: Array<{ serviceDetected: string; evidenceUrl: string; evidenceTextSnippet: string; confidence: number; source: string }>;
  provenance?: ProviderProvenance[]; lastSeenAt?: string; matchReason?: string; distanceMiles?: number;
  integrityFindings?: Array<{ code: string; severity: string; message: string }>;
  quarantineStatus?: 'accepted' | 'quarantined';
};
export type ProviderStatus = { sourceId: string; sourceLabel: string; ok: boolean; count: number; error?: string; durationMs?: number; timedOut?: boolean };
export type SearchAudit = { serviceType: string; activeAdapters: string[]; rawResultCounts: Record<string, number>; normalizedCount: number; dedupedCount: number; geocodedCount: number; finalMarkerCount: number; quarantinedCount?: number; invalidCoordinateCount?: number; errorsBySource: Record<string, string>; durationMs: number };
export type UnifiedSearchResponse = {
  params: { city: string; state: string; serviceType: string; radiusMiles: number; centerLat: number; centerLng: number; sourceIds?: string[]; coordinatePolicy?: string };
  results: ProviderCandidate[];
  quarantinedResults?: ProviderCandidate[];
  sourceResults: ProviderStatus[];
  audit: SearchAudit;
  incomplete?: boolean;
  degradedSources?: string[];
  persistence?: { searchRunId: number | null; resultsInserted: number; resultsUpdated: number; persisted: boolean };
};

export async function discoverProviders(params: { city: string; state: string; serviceType: string; radiusMiles?: number; centerLat: number; centerLng: number; signal?: AbortSignal }): Promise<UnifiedSearchResponse> {
  const response = await fetch('/api/provider-sources/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: params.signal,
    body: JSON.stringify({ city: params.city, state: params.state, serviceType: params.serviceType, radiusMiles: params.radiusMiles || 25, centerLat: params.centerLat, centerLng: params.centerLng }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error' in data ? String((data as { error?: unknown }).error) : `Provider discovery failed with status ${response.status}`;
    throw new Error(message);
  }
  return data as UnifiedSearchResponse;
}

let activeMapInventoryController: AbortController | null = null;
let mapInventoryGeneration = 0;
let cancelledViewportRequests = 0;
let lastMapInventoryDurationMs = 0;

function linkAbort(external: AbortSignal | undefined, internal: AbortController): () => void {
  if (!external) return () => undefined;
  const abort = () => internal.abort(external.reason);
  if (external.aborted) abort(); else external.addEventListener('abort', abort, { once: true });
  return () => external.removeEventListener('abort', abort);
}

export type MapInventoryProvider = {
  id: number;
  featureId?: string;
  npi: string | null;
  name: string;
  providerType: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
  coordinateStatus: CoordinateStatus;
  coordinateSource?: string | null;
  phone: string | null;
  fax: string | null;
  website: string | null;
  services: string[];
  trustTier: string;
  sources: Array<{ sourceId: string; sourceLabel: string; trustTier: string }>;
};

export type MapInventoryResponse = {
  providers: MapInventoryProvider[];
  total: number;
  count?: number;
  generation: string;
  durationMs?: number;
  budget?: { zoomBand: string; maxFeatures: number; detail: string; limit: number };
};

/**
 * Viewport provider loading is latest-generation-wins. Starting a new viewport
 * request immediately aborts the previous one, so stale pan/zoom responses can
 * never replace newer map data.
 */
export async function fetchMapInventory(bounds: {
  north: number; south: number; east: number; west: number;
  serviceType?: string; trustTier?: string; limit?: number; zoom?: number; signal?: AbortSignal;
}): Promise<MapInventoryResponse> {
  if (activeMapInventoryController) {
    activeMapInventoryController.abort(new DOMException('Superseded viewport request', 'AbortError'));
    cancelledViewportRequests += 1;
  }
  const controller = new AbortController();
  activeMapInventoryController = controller;
  const cleanupExternalAbort = linkAbort(bounds.signal, controller);
  const generationNumber = ++mapInventoryGeneration;
  const generation = `viewport-${generationNumber}`;
  const startedAt = performance.now();
  const params = new URLSearchParams({
    north: String(bounds.north), south: String(bounds.south), east: String(bounds.east), west: String(bounds.west),
    generation, zoom: String(Number.isFinite(bounds.zoom) ? bounds.zoom : 10),
  });
  if (bounds.serviceType) params.set('serviceType', bounds.serviceType);
  if (bounds.trustTier) params.set('trustTier', bounds.trustTier);
  if (bounds.limit) params.set('limit', String(bounds.limit));

  try {
    const response = await fetch(`/api/map-inventory?${params.toString()}`, { signal: controller.signal, headers: { 'X-Map-Generation': generation } });
    const data = await response.json().catch(() => null) as MapInventoryResponse | { error?: unknown } | null;
    if (!response.ok || (data && 'error' in data && data.error)) {
      const message = data && 'error' in data ? String(data.error) : `Map inventory fetch failed with status ${response.status}`;
      throw new Error(message);
    }
    const result = data as MapInventoryResponse;
    if (generationNumber !== mapInventoryGeneration || result.generation !== generation) throw new DOMException('Stale viewport response discarded', 'AbortError');
    lastMapInventoryDurationMs = performance.now() - startedAt;
    return result;
  } finally {
    cleanupExternalAbort();
    if (activeMapInventoryController === controller) activeMapInventoryController = null;
  }
}

export function mapInventoryRequestDiagnostics() {
  return {
    generation: mapInventoryGeneration,
    active: Boolean(activeMapInventoryController),
    cancelledViewportRequests,
    lastDurationMs: Math.round(lastMapInventoryDurationMs),
  };
}
