import L from "leaflet";
import { milesBetween } from "./providerEtaEngine";
import type { EtaOrigin, EtaProviderCandidate } from "./providerEtaTypes";

export function markerLabel(layer: L.Layer, fallback: string): string {
  const marker = layer as L.Marker;
  const tooltip = marker.getTooltip?.();
  const popup = marker.getPopup?.();
  const tooltipContent = tooltip?.getContent?.();
  const popupContent = popup?.getContent?.();
  const raw = typeof tooltipContent === "string" ? tooltipContent : typeof popupContent === "string" ? popupContent : fallback;
  return raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 90) || fallback;
}

export function collectVisibleLeafletProviderCandidates(map: L.Map, origin: EtaOrigin): EtaProviderCandidate[] {
  const bounds = map.getBounds().pad(0.1);
  const rows: EtaProviderCandidate[] = [];

  map.eachLayer((layer: L.Layer) => {
    const marker = layer as L.Marker & { getLatLng?: () => L.LatLng };
    if (typeof marker.getLatLng !== "function") return;
    const latLng = marker.getLatLng();
    if (!bounds.contains(latLng)) return;
    const id = `leaflet:${latLng.lat.toFixed(6)}:${latLng.lng.toFixed(6)}:${rows.length}`;
    const candidate = {
      id,
      name: markerLabel(layer, `Provider ${rows.length + 1}`),
      lat: latLng.lat,
      lng: latLng.lng,
    };
    rows.push({
      ...candidate,
      straightMiles: milesBetween(origin, candidate),
    });
  });

  return rows;
}

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
