export type ProviderSource = 'NPI' | 'OpenStreetMap' | 'WebHint' | 'FMCSA' | 'Manual Import' | string;
export type CoordinateStatus = 'imported' | 'geocoded' | 'unverified';
export type TrustTier = 'verified' | 'registry' | 'directory' | 'lead';

export type ProviderProvenance = {
  source: string;
  sourceRecordId?: string;
  sourceUrl?: string;
  observedAt?: string;
};

export type ProviderCandidate = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  phone: string;
  fax?: string;
  website: string;
  lat?: number;
  lng?: number;
  coordinateStatus: CoordinateStatus;
  providerCategory?: string;
  services?: string[];
  taxonomy?: string;
  taxonomyCode?: string;
  npi?: string;
  source: ProviderSource;
  sourceDetail?: string;
  sourceUrl?: string;
  confidence: 'high' | 'medium' | 'low';
  trustTier: TrustTier;
  score: number;
  badges: string[];
  evidence: Array<{
    serviceDetected: string;
    evidenceUrl: string;
    evidenceTextSnippet: string;
    confidence: number;
    source: string;
  }>;
  provenance?: ProviderProvenance[];
  lastSeenAt?: string;
  matchReason?: string;
  distanceMiles?: number;
};

export type ProviderStatus = {
  sourceId: string;
  sourceLabel: string;
  ok: boolean;
  count: number;
  error?: string;
  durationMs?: number;
  timedOut?: boolean;
};

export type SearchAudit = {
  serviceType: string;
  activeAdapters: string[];
  rawResultCounts: Record<string, number>;
  normalizedCount: number;
  dedupedCount: number;
  geocodedCount: number;
  finalMarkerCount: number;
  errorsBySource: Record<string, string>;
  durationMs: number;
};

export type UnifiedSearchResponse = {
  params: {
    city: string;
    state: string;
    serviceType: string;
    radiusMiles: number;
    centerLat: number;
    centerLng: number;
    sourceIds?: string[];
  };
  results: ProviderCandidate[];
  sourceResults: ProviderStatus[];
  audit: SearchAudit;
  incomplete?: boolean;
  degradedSources?: string[];
  persistence?: {
    searchRunId: number | null;
    resultsInserted: number;
    resultsUpdated: number;
    persisted: boolean;
  };
};

/** Universal provider discovery. All provider search consumers should use this backend contract. */
export async function discoverProviders(params: {
  city: string;
  state: string;
  serviceType: string;
  radiusMiles?: number;
  centerLat: number;
  centerLng: number;
}): Promise<UnifiedSearchResponse> {
  const response = await fetch('/api/provider-sources/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      city: params.city,
      state: params.state,
      serviceType: params.serviceType,
      radiusMiles: params.radiusMiles || 25,
      centerLat: params.centerLat,
      centerLng: params.centerLng,
    }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error' in data
      ? String((data as { error?: unknown }).error)
      : `Provider discovery failed with status ${response.status}`;
    throw new Error(message);
  }
  return data as UnifiedSearchResponse;
}

/** Map inventory — viewport-bounded stored-provider loading. */
export async function fetchMapInventory(bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
  serviceType?: string;
  trustTier?: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<{ providers: MapInventoryProvider[]; total: number }> {
  const params = new URLSearchParams();
  params.set('north', String(bounds.north));
  params.set('south', String(bounds.south));
  params.set('east', String(bounds.east));
  params.set('west', String(bounds.west));
  if (bounds.serviceType) params.set('serviceType', bounds.serviceType);
  if (bounds.trustTier) params.set('trustTier', bounds.trustTier);
  if (bounds.limit) params.set('limit', String(bounds.limit));

  const response = await fetch(`/api/map-inventory?${params.toString()}`, { signal: bounds.signal });
  const data = await response.json().catch(() => null);
  if (data && typeof data === 'object' && 'error' in data && (data as { error?: unknown }).error) {
    throw new Error(String((data as { error: unknown }).error));
  }
  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error' in data
      ? String((data as { error?: unknown }).error)
      : `Map inventory fetch failed with status ${response.status}`;
    throw new Error(message);
  }
  return data as { providers: MapInventoryProvider[]; total: number };
}

export type MapInventoryProvider = {
  id: number;
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
  phone: string | null;
  fax: string | null;
  website: string | null;
  services: string[];
  trustTier: string;
  sources: Array<{ sourceId: string; sourceLabel: string; trustTier: string }>;
};
