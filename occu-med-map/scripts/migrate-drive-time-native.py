from pathlib import Path

root = Path(__file__).resolve().parents[1]

adapter = root / "src/features/driveTime/mapSceneProviderAdapter.ts"
adapter.write_text('''import type { EtaProviderCandidate } from "./providerEtaTypes";

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
''')

route_layer = root / "src/features/driveTime/mapSceneEtaRouteLayer.ts"
route_layer.write_text('''import mapboxgl from "mapbox-gl";
import { listenForEtaRoute } from "./etaRouteEvents";
import type { EtaProviderRanking } from "./providerEtaTypes";

const SOURCE_ID = "drive-time-eta-route";
const LINE_LAYER_ID = "drive-time-eta-route-line";
const END_LAYER_ID = "drive-time-eta-route-end";

function emptyCollection(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

function routeCollection(row: EtaProviderRanking): GeoJSON.FeatureCollection {
  const coordinates = row.routeCoordinates
    .map(([lat, lng]) => [Number(lng), Number(lat)] as [number, number])
    .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
  if (coordinates.length < 2) return emptyCollection();
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "LineString", coordinates },
        properties: { role: "route" },
      },
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [row.lng, row.lat] },
        properties: { role: "destination" },
      },
    ],
  };
}

function ensureLayers(map: mapboxgl.Map, collection: GeoJSON.FeatureCollection): void {
  if (!map.getStyle()) return;
  const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
  if (source) source.setData(collection);
  else map.addSource(SOURCE_ID, { type: "geojson", data: collection });

  if (!map.getLayer(LINE_LAYER_ID)) {
    map.addLayer({
      id: LINE_LAYER_ID,
      type: "line",
      source: SOURCE_ID,
      filter: ["==", ["get", "role"], "route"],
      paint: {
        "line-color": "#7c3aed",
        "line-width": 5,
        "line-opacity": 0.88,
      },
    });
  }
  if (!map.getLayer(END_LAYER_ID)) {
    map.addLayer({
      id: END_LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      filter: ["==", ["get", "role"], "destination"],
      paint: {
        "circle-radius": 6,
        "circle-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#4c1d95",
      },
    });
  }
}

export function installNativeEtaRouteLayer(map: mapboxgl.Map): () => void {
  let latest = emptyCollection();

  const apply = () => ensureLayers(map, latest);
  const draw = (row: EtaProviderRanking): void => {
    latest = routeCollection(row);
    if (latest.features.length === 0) return;
    ensureLayers(map, latest);
    const line = latest.features.find((feature) => feature.geometry.type === "LineString");
    if (!line || line.geometry.type !== "LineString") return;
    const bounds = new mapboxgl.LngLatBounds();
    line.geometry.coordinates.forEach((coordinate) => bounds.extend(coordinate as [number, number]));
    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 38, duration: 700 });
  };

  map.on("style.load", apply);
  if (map.isStyleLoaded()) queueMicrotask(apply);
  const unsubscribe = listenForEtaRoute(draw);

  return () => {
    unsubscribe();
    map.off("style.load", apply);
  };
}
''')

runtime = root / "src/features/driveTime/nativeDriveTimeRuntime.ts"
runtime.write_text('''import { registerMapboxMapInitializer } from "../../mapboxMapLifecycleRuntime";
import { installNativeEtaRouteLayer } from "./mapSceneEtaRouteLayer";

let installed = false;

function nativeDriveTimeEnabled(): boolean {
  return import.meta.env.VITE_NATIVE_DRIVE_TIME === "true";
}

export function installNativeDriveTimeRuntime(): void {
  if (installed || !nativeDriveTimeEnabled()) return;
  installed = true;
  registerMapboxMapInitializer({
    id: "native-drive-time-route",
    priority: 18,
    initialize: (map) => installNativeEtaRouteLayer(map),
  });
}

installNativeDriveTimeRuntime();
''')

interaction_defaults = root / "src/mapSceneInteractionDefaults.ts"
if not interaction_defaults.exists():
    raise SystemExit("expected mapSceneInteractionDefaults.ts before drive-time migration")
interaction_defaults.unlink()

for relative in [
    "src/features/driveTime/mapSceneProviderAdapter.ts",
    "src/features/driveTime/mapSceneEtaRouteLayer.ts",
    "src/features/driveTime/nativeDriveTimeRuntime.ts",
]:
    text = (root / relative).read_text()
    if "mapSceneRuntime" in text or "MapScene" in text or "subscribeSceneRoots" in text:
        raise SystemExit(f"scene dependency remains in {relative}")

print("Migrated drive-time route and provider adapter to native Mapbox lifecycle.")
