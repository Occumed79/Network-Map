import mapboxgl from "mapbox-gl";
import { registerMapboxMapInitializer } from "./mapboxMapLifecycleRuntime";

const COMPAT_PREFIX = "leaflet-compat-";
const HIT_RADIUS_PX = 10;

type ScreenPoint = { x: number; y: number };

export type CompatPopupHit = {
  popupHtml: string;
  lngLat: mapboxgl.LngLatLike;
  feature: mapboxgl.MapboxGeoJSONFeature;
  exactRenderedHit: boolean;
};

function isInteractive(properties: Record<string, unknown> | null | undefined): boolean {
  const value = properties?.__interactive;
  return value !== false && value !== "false" && value !== 0 && value !== "0";
}

function popupHtml(properties: Record<string, unknown> | null | undefined): string {
  return String(properties?.__popupHtml || "").trim();
}

function compatLayerIds(map: mapboxgl.Map): string[] {
  return (map.getStyle()?.layers || [])
    .map((layer) => layer.id)
    .filter((id) => id.startsWith(COMPAT_PREFIX));
}

function compatSourceIds(map: mapboxgl.Map): string[] {
  return Object.keys(map.getStyle()?.sources || {})
    .filter((id) => id.startsWith(COMPAT_PREFIX) && id.endsWith("-source"));
}

function pointLngLat(feature: mapboxgl.MapboxGeoJSONFeature): mapboxgl.LngLatLike | null {
  if (feature.geometry?.type !== "Point") return null;
  const coordinates = feature.geometry.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const lng = Number(coordinates[0]);
  const lat = Number(coordinates[1]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lng, lat] : null;
}

function featureHit(feature: mapboxgl.MapboxGeoJSONFeature, fallback: mapboxgl.LngLatLike, exactRenderedHit: boolean): CompatPopupHit | null {
  const properties = feature.properties as Record<string, unknown> | null | undefined;
  const html = popupHtml(properties);
  if (!html || !isInteractive(properties)) return null;
  return {
    popupHtml: html,
    lngLat: pointLngLat(feature) || fallback,
    feature,
    exactRenderedHit,
  };
}

function renderedHits(map: mapboxgl.Map, point: ScreenPoint, layerIds: string[]): mapboxgl.MapboxGeoJSONFeature[] {
  if (!layerIds.length) return [];
  try {
    return map.queryRenderedFeatures(point, { layers: layerIds });
  } catch {
    return [];
  }
}

function renderedHitsAround(map: mapboxgl.Map, point: ScreenPoint, layerIds: string[]): mapboxgl.MapboxGeoJSONFeature[] {
  if (!layerIds.length) return [];
  try {
    return map.queryRenderedFeatures(
      [
        [point.x - HIT_RADIUS_PX, point.y - HIT_RADIUS_PX],
        [point.x + HIT_RADIUS_PX, point.y + HIT_RADIUS_PX],
      ],
      { layers: layerIds },
    );
  } catch {
    return [];
  }
}

function distanceSquared(map: mapboxgl.Map, feature: mapboxgl.MapboxGeoJSONFeature, point: ScreenPoint): number {
  const lngLat = pointLngLat(feature);
  if (!lngLat) return Number.POSITIVE_INFINITY;
  const projected = map.project(lngLat);
  const dx = projected.x - point.x;
  const dy = projected.y - point.y;
  return dx * dx + dy * dy;
}

function nearestPopupFeature(map: mapboxgl.Map, features: mapboxgl.MapboxGeoJSONFeature[], point: ScreenPoint): mapboxgl.MapboxGeoJSONFeature | null {
  return features
    .filter((feature) => popupHtml(feature.properties as Record<string, unknown> | null | undefined))
    .filter((feature) => isInteractive(feature.properties as Record<string, unknown> | null | undefined))
    .sort((left, right) => distanceSquared(map, left, point) - distanceSquared(map, right, point))[0] || null;
}

/**
 * Finds a clickable compatibility-provider feature even when a tiny circle misses
 * Mapbox's exact rendered-feature hit test. The final source-data fallback is
 * deterministic for GeoJSON points and makes 4–8 px provider dots usable in both
 * Chrome and Safari without visually inflating them.
 */
export function findCompatPopupHit(
  map: mapboxgl.Map,
  point: ScreenPoint,
  fallbackLngLat: mapboxgl.LngLatLike,
): CompatPopupHit | null {
  const layerIds = compatLayerIds(map);

  const exactFeature = nearestPopupFeature(map, renderedHits(map, point, layerIds), point);
  if (exactFeature) return featureHit(exactFeature, fallbackLngLat, true);

  const nearbyFeature = nearestPopupFeature(map, renderedHitsAround(map, point, layerIds), point);
  if (nearbyFeature) return featureHit(nearbyFeature, fallbackLngLat, false);

  const radiusSquared = HIT_RADIUS_PX * HIT_RADIUS_PX;
  let nearestSourceFeature: mapboxgl.MapboxGeoJSONFeature | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const sourceId of compatSourceIds(map)) {
    let features: mapboxgl.MapboxGeoJSONFeature[] = [];
    try {
      features = map.querySourceFeatures(sourceId);
    } catch {
      continue;
    }
    for (const feature of features) {
      const properties = feature.properties as Record<string, unknown> | null | undefined;
      if (!popupHtml(properties) || !isInteractive(properties) || feature.geometry?.type !== "Point") continue;
      const distance = distanceSquared(map, feature, point);
      if (distance <= radiusSquared && distance < nearestDistance) {
        nearestDistance = distance;
        nearestSourceFeature = feature;
      }
    }
  }

  return nearestSourceFeature ? featureHit(nearestSourceFeature, fallbackLngLat, false) : null;
}

function markCompatibilityClickHandled(originalEvent: unknown): void {
  if (!originalEvent || typeof originalEvent !== "object") return;
  (originalEvent as Record<string, unknown>).__networkMapCompatHandled = true;
}

export function wasCompatibilityClickHandled(originalEvent: unknown): boolean {
  return Boolean(
    originalEvent
    && typeof originalEvent === "object"
    && (originalEvent as Record<string, unknown>).__networkMapCompatHandled,
  );
}

registerMapboxMapInitializer({
  id: "mapbox-compat-interaction-owner",
  priority: 6,
  initialize: (map) => {
    const onClick = (event: mapboxgl.MapMouseEvent & mapboxgl.EventData) => {
      const hit = findCompatPopupHit(map, event.point, event.lngLat);
      if (!hit || hit.exactRenderedHit) return;

      markCompatibilityClickHandled(event.originalEvent);
      new mapboxgl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "380px" })
        .setLngLat(hit.lngLat)
        .setHTML(hit.popupHtml)
        .addTo(map);
    };

    map.on("click", onClick);
    return () => map.off("click", onClick);
  },
});
