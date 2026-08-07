type ProviderRow = {
  id: number;
  featureId?: string;
  name: string;
  providerType: string | null;
  lat: number | null;
  lng: number | null;
  trustTier: string;
  coordinateStatus: string;
};

type WorkerRequest = { requestId: string; providers: ProviderRow[]; detail: "minimal" | "compact" | "full" };

type Feature = {
  type: "Feature";
  id: string;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: Record<string, string | number | boolean | null>;
};

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const startedAt = performance.now();
  const { requestId, providers, detail } = event.data;
  const features: Feature[] = [];
  for (const provider of providers) {
    if (!Number.isFinite(provider.lat) || !Number.isFinite(provider.lng)) continue;
    const properties: Record<string, string | number | boolean | null> = {
      providerId: provider.id,
      name: provider.name,
      providerType: provider.providerType,
      trustTier: provider.trustTier,
      coordinateStatus: provider.coordinateStatus,
    };
    if (detail === "minimal") delete properties.providerType;
    features.push({
      type: "Feature",
      id: provider.featureId || `provider:${provider.id}`,
      geometry: { type: "Point", coordinates: [Number(provider.lng), Number(provider.lat)] },
      properties,
    });
  }
  self.postMessage({ requestId, collection: { type: "FeatureCollection", features }, durationMs: Math.round(performance.now() - startedAt) });
};

export {};
