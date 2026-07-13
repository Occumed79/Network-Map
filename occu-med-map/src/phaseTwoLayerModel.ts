export type PhaseTwoVisualization = 'density' | 'grid' | 'pins';
export type PhaseTwoSourceKind = 'stored' | 'saved' | 'candidate' | 'live';

export type ViewportBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type PhaseTwoLayerFilters = {
  source: string;
  query: string;
  country: string;
  adminArea: string;
  city: string;
  service: string;
  trustTier: string;
  includeStored: boolean;
  includeSaved: boolean;
  includeCandidates: boolean;
  includeLive: boolean;
};

export type MinimalProvider = {
  id: string;
  source?: string | null;
  source_kind?: string | null;
  trust_tier?: string | null;
};

export function autoVisualizationForZoom(zoom: number): PhaseTwoVisualization {
  if (zoom <= 6) return 'density';
  if (zoom <= 10) return 'grid';
  return 'pins';
}

export function selectedSourceKinds(filters: PhaseTwoLayerFilters): PhaseTwoSourceKind[] {
  if (filters.source === 'live') return ['live'];
  if (filters.source === 'saved' || filters.source === 'my-clinics') return ['saved'];
  if (filters.source === 'candidates') return ['candidate'];
  if (filters.source !== 'all') return ['stored'];

  const kinds: PhaseTwoSourceKind[] = [];
  if (filters.includeStored) kinds.push('stored');
  if (filters.includeSaved) kinds.push('saved');
  if (filters.includeCandidates) kinds.push('candidate');
  if (filters.includeLive) kinds.push('live');
  return kinds;
}

export function effectiveVisualization(
  requested: 'auto' | PhaseTwoVisualization,
  zoom: number,
  trustTier: string,
  sourceKinds: PhaseTwoSourceKind[] = [],
): PhaseTwoVisualization {
  if (trustTier && trustTier !== 'all') return 'pins';
  if (sourceKinds.includes('candidate') || sourceKinds.includes('live')) return 'pins';
  return requested === 'auto' ? autoVisualizationForZoom(zoom) : requested;
}

export function buildViewportParams(
  bounds: ViewportBounds,
  filters: PhaseTwoLayerFilters,
  mode: string,
  page = 1,
  limit = 100,
): URLSearchParams {
  const params = new URLSearchParams({
    p2: '1',
    mode,
    page: String(Math.max(1, page)),
    limit: String(Math.max(1, limit)),
    north: String(bounds.north),
    south: String(bounds.south),
    east: String(bounds.east),
    west: String(bounds.west),
    useBounds: 'true',
    includeStored: String(filters.includeStored),
    includeSaved: String(filters.includeSaved),
    includeCandidates: String(filters.includeCandidates),
    includeLive: String(filters.includeLive),
  });

  const kinds = selectedSourceKinds(filters);
  if (kinds.length === 1) params.set('source_kind', kinds[0]);
  if (filters.source && filters.source !== 'all') params.set('source', filters.source);
  if (filters.query.trim()) params.set('q', filters.query.trim());
  if (filters.country.trim()) params.set('country', filters.country.trim());
  if (filters.adminArea.trim()) params.set('admin_area', filters.adminArea.trim());
  if (filters.city.trim()) params.set('city', filters.city.trim());
  if (filters.service.trim()) params.set('service', filters.service.trim());
  return params;
}

export function providerMatchesTrustTier(provider: MinimalProvider, trustTier: string): boolean {
  if (!trustTier || trustTier === 'all') return true;
  return String(provider.trust_tier || '').toLowerCase() === trustTier.toLowerCase();
}

export function providerMatchesSourceKind(provider: MinimalProvider, kind: PhaseTwoSourceKind): boolean {
  const sourceKind = String(provider.source_kind || '').toLowerCase();
  const source = String(provider.source || '').toLowerCase();
  if (kind === 'saved') return sourceKind === 'saved' || source.includes('my clinics');
  if (kind === 'candidate') return sourceKind === 'candidate';
  if (kind === 'live') return sourceKind === 'live' || source.includes('openstreetmap') || source.includes('overpass');
  return sourceKind === 'stored' && !source.includes('my clinics');
}

export function uniqueProviders<T extends MinimalProvider>(providers: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const provider of providers) {
    const key = String(provider.id || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(provider);
  }
  return result;
}

export function sourceColor(source: string | null | undefined, sourceKind?: string | null): string {
  const value = `${source || ''} ${sourceKind || ''}`.toLowerCase();
  if (value.includes('bluehive')) return '#22d3ee';
  if (value.includes('dentist')) return '#f472b6';
  if (value.includes('my clinics') || value.includes('saved')) return '#34d399';
  if (value.includes('live') || value.includes('openstreetmap') || value.includes('overpass')) return '#fb923c';
  if (value.includes('candidate')) return '#facc15';
  return '#a78bfa';
}

export function gridCellBounds(
  lat: number,
  lng: number,
  precision: number,
): [[number, number], [number, number]] {
  const safePrecision = Math.max(1, Math.min(10, Math.trunc(precision || 1)));
  const step = 10 ** -safePrecision;
  const half = step / 2;
  return [
    [lat - half, lng - half],
    [lat + half, lng + half],
  ];
}
