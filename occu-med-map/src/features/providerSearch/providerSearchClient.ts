export type ProviderSource = 'NPI' | 'OpenStreetMap' | 'WebHint' | string;

export type ProviderCandidate = {
  name: string;
  address: string;
  phone: string;
  website: string;
  lat?: number;
  lng?: number;
  taxonomy?: string;
  source: ProviderSource;
  sourceDetail?: string;
  sourceUrl?: string;
  confidence: 'high' | 'medium' | 'low';
  score: number;
  badges: string[];
};

export type ProviderStatus = {
  source: string;
  count: number;
  ok: boolean;
  error?: string;
};

export type ProviderSearchResponse = {
  location: string;
  serviceType: string;
  radiusMiles: number;
  count: number;
  results: ProviderCandidate[];
  providers: ProviderStatus[];
  note?: string;
};

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    query.set(key, String(value));
  }
  return query.toString();
}

export async function searchProviders(params: {
  city: string;
  state: string;
  serviceType: string;
  radiusMiles?: number;
}): Promise<ProviderSearchResponse> {
  const query = buildQuery(params);
  const response = await fetch(`/api/providers/search?${query}`);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error' in data
      ? String((data as { error?: unknown }).error)
      : `Provider search failed with status ${response.status}`;
    throw new Error(message);
  }
  return data as ProviderSearchResponse;
}
