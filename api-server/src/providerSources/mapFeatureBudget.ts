export type ZoomFeatureBudget = {
  zoomBand: "world" | "region" | "metro" | "local" | "street";
  maxFeatures: number;
  detail: "minimal" | "compact" | "full";
};

export function featureBudgetForZoom(zoom: number): ZoomFeatureBudget {
  if (!Number.isFinite(zoom) || zoom < 5) return { zoomBand: "world", maxFeatures: 350, detail: "minimal" };
  if (zoom < 8) return { zoomBand: "region", maxFeatures: 750, detail: "minimal" };
  if (zoom < 11) return { zoomBand: "metro", maxFeatures: 1500, detail: "compact" };
  if (zoom < 14) return { zoomBand: "local", maxFeatures: 3000, detail: "compact" };
  return { zoomBand: "street", maxFeatures: 5000, detail: "full" };
}

export function clampFeatureLimit(requested: number | undefined, zoom: number): ZoomFeatureBudget & { limit: number } {
  const budget = featureBudgetForZoom(zoom);
  const requestedLimit = Number.isFinite(requested) ? Math.max(1, Math.trunc(requested as number)) : budget.maxFeatures;
  return { ...budget, limit: Math.min(requestedLimit, budget.maxFeatures) };
}
