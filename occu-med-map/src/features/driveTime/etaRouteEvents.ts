import { mapboxDirections } from "../../mapboxServices";
import { getProviderEtaResult } from "./providerEtaStore";
import type { EtaOrigin, EtaProviderRanking } from "./providerEtaTypes";

export const ETA_ROUTE_EVENT = "occumed:native-eta-route";

function dispatchEtaRoute(row: EtaProviderRanking): void {
  window.dispatchEvent(new CustomEvent(ETA_ROUTE_EVENT, { detail: row }));
}

// Matrix-ranked rows carry drive times only; the route line is fetched from
// the Directions API the first time a row's route is requested, then cached
// on the row.
export function requestEtaRoute(row: EtaProviderRanking, origin: EtaOrigin | null = getProviderEtaResult()?.origin || null): void {
  if (row.routeCoordinates.length >= 2 || !origin) {
    dispatchEtaRoute(row);
    return;
  }
  void mapboxDirections(origin, row, row.routeProfile)
    .then((route) => {
      row.routeCoordinates = route.coordinates;
      dispatchEtaRoute(row);
    })
    .catch((error) => console.warn(`Route to ${row.name} failed`, error));
}

export function listenForEtaRoute(handler: (row: EtaProviderRanking) => void): () => void {
  const listener = ((event: Event) => {
    const row = (event as CustomEvent<EtaProviderRanking>).detail;
    if (!row || !Array.isArray(row.routeCoordinates)) return;
    handler(row);
  }) as EventListener;
  window.addEventListener(ETA_ROUTE_EVENT, listener);
  return () => window.removeEventListener(ETA_ROUTE_EVENT, listener);
}
