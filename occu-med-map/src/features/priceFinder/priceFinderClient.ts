export type PriceFinderClinic = {
  name?: string;
  address?: string;
  phone?: string;
  taxonomy?: string;
  isFqhc?: boolean;
  npiUrl?: string;
  searchUrl?: string;
  npiType?: string;
  source?: string;
  [key: string]: unknown;
};

export type PriceFinderResource = {
  name: string;
  desc?: string;
  url: string;
  tag?: string;
};

export type PriceFinderResponse = {
  location?: string;
  serviceType?: string;
  clinicCount?: number;
  clinics?: PriceFinderClinic[];
  networks?: PriceFinderResource[];
  pricingResources?: PriceFinderResource[];
  resources?: PriceFinderResource[];
  discoveryNote?: string;
  [key: string]: unknown;
};

export type PriceHuntResult = PriceFinderClinic & {
  queries?: string[];
  matches?: unknown[];
  hitCount?: number;
  discoveryNote?: string;
};

export type PriceHuntResponse = {
  location?: string;
  serviceType?: string;
  clinicCount?: number;
  results?: PriceHuntResult[];
  extracted?: number;
  pricingResources?: PriceFinderResource[];
  discoveryNote?: string;
  [key: string]: unknown;
};

export type OccHuntResponse = {
  location?: string;
  partners?: PriceFinderClinic[];
  results?: PriceFinderClinic[];
  count?: number;
  [key: string]: unknown;
};

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    query.set(key, String(value));
  }
  return query.toString();
}

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error' in data
      ? String((data as { error?: unknown }).error)
      : `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

export async function fetchPriceFinder(params: {
  city: string;
  state?: string;
  serviceType: string;
}): Promise<PriceFinderResponse> {
  const query = buildQuery(params);
  const response = await fetch(`/api/price-finder?${query}`);
  return readJson<PriceFinderResponse>(response);
}

export async function fetchPriceHunt(params: {
  city: string;
  state?: string;
  serviceType: string;
}): Promise<PriceHuntResponse> {
  const query = buildQuery(params);
  const response = await fetch(`/api/price-hunt?${query}`);
  return readJson<PriceHuntResponse>(response);
}

export async function fetchOccHunt(params: {
  city: string;
  state?: string;
  serviceType?: string;
}): Promise<OccHuntResponse> {
  const query = buildQuery(params);
  const response = await fetch(`/api/occ-hunt?${query}`);
  return readJson<OccHuntResponse>(response);
}
