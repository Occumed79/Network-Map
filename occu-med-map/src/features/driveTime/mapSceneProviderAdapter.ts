import type { EtaProviderCandidate } from "./providerEtaTypes";

export function liveResultToEtaCandidate(result: any, index: number): EtaProviderCandidate | null {
  const lat = Number(result?.lat ?? result?.latitude);
  const lng = Number(result?.lng ?? result?.lon ?? result?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id: String(result?.id ?? result?.osmId ?? result?.npi ?? `live:${index}`),
    name: String(result?.name || result?.organizationName || `Provider ${index + 1}`),
    lat,
    lng,
    address: result?.address ?? result?.addr,
    phone: result?.phone,
    website: result?.website,
    source: result?.source,
    sourceUrl: result?.sourceUrl,
    category: result?.category ?? result?.cat,
    straightMiles: typeof result?.dist === "number" ? result.dist : undefined,
  };
}

export function liveResultsToEtaCandidates(results: any[]): EtaProviderCandidate[] {
  return results.map(liveResultToEtaCandidate).filter(Boolean) as EtaProviderCandidate[];
}
