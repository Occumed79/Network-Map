import L from "leaflet";
import { hasMapboxToken } from "./mapboxServices";

const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || "";
const originalTileLayer = L.tileLayer.bind(L);
let installed = false;

function mapboxStyleTileUrl(style: string): string {
  const url = new URL(`https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/256/{z}/{x}/{y}@2x`);
  url.searchParams.set(["access", "token"].join("_"), mapboxToken);
  return url.toString().replaceAll("%7B", "{").replaceAll("%7D", "}");
}

export function installMapboxLeafletRuntime(): void {
  if (installed) return;
  installed = true;
  if (!mapboxToken || !hasMapboxToken()) return;

  (L as any).tileLayer = (template: string, options: L.TileLayerOptions = {}) => {
    const isDefaultOpenStreetMap = typeof template === "string" && template.includes("tile.openstreetmap.org");
    if (!isDefaultOpenStreetMap) return originalTileLayer(template, options);
    return originalTileLayer(mapboxStyleTileUrl("streets-v12"), {
      ...options,
      className: "mapbox-streets-tiles",
      maxZoom: 20,
      attribution: "© Mapbox © OpenStreetMap",
    });
  };
}

installMapboxLeafletRuntime();
