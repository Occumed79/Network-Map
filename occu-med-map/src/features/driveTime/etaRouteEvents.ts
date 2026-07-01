import type { EtaProviderRanking } from "./providerEtaTypes";

export const ETA_ROUTE_EVENT = "occumed:native-eta-route";

export function requestEtaRoute(row: EtaProviderRanking): void {
  window.dispatchEvent(new CustomEvent(ETA_ROUTE_EVENT, { detail: row }));
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
