export type PhaseTwoVisualization = 'density' | 'grid' | 'pins';

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

export function effectiveVisualization(
  requested: 'auto' | PhaseTwoVisualization,
  zoom: number,
  trustTier: string,
): PhaseTwoVisualization {
  if (trustTier && trustTier !== 'all') return 'pins';
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
