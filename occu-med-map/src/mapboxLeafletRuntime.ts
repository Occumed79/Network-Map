import L from "leaflet";

const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || "";
const originalTileLayer = L.tileLayer.bind(L);
const originalMap = L.map.bind(L);
let installed = false;

const basemaps = [
  { id: "streets", label: "Streets", style: "streets-v12" },
  { id: "light", label: "Light", style: "light-v11" },
  { id: "terrain", label: "Terrain", style: "outdoors-v12" },
  { id: "satellite", label: "Satellite", style: "satellite-streets-v12" },
] as const;

function mapboxStyleTileUrl(style: string): string {
  const url = new URL(`https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/256/{z}/{x}/{y}@2x`);
  url.searchParams.set(["access", "token"].join("_"), mapboxToken);
  return url.toString().replaceAll("%7B", "{").replaceAll("%7D", "}");
}

function updateMapTiles(map: L.Map, style: string): void {
  map.eachLayer((layer) => {
    const tileLayer = layer as L.TileLayer & { setUrl?: (url: string) => void };
    if (typeof tileLayer.setUrl === "function") tileLayer.setUrl(mapboxStyleTileUrl(style));
  });
}

function addBasemapControl(map: L.Map): void {
  const control = new L.Control({ position: "bottomleft" });
  control.onAdd = () => {
    const container = L.DomUtil.create("div", "occumed-basemap-control");
    L.DomEvent.disableClickPropagation(container);
    const title = document.createElement("div");
    title.className = "occumed-basemap-title";
    title.textContent = "Mapbox Basemaps";
    container.appendChild(title);
    basemaps.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.label;
      button.addEventListener("click", () => updateMapTiles(map, item.style));
      container.appendChild(button);
    });
    return container;
  };
  control.addTo(map);
}

export function installMapboxLeafletRuntime(): void {
  if (installed) return;
  installed = true;
  if (!mapboxToken) return;

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

  (L as any).map = (...args: Parameters<typeof L.map>) => {
    const map = originalMap(...args);
    window.setTimeout(() => addBasemapControl(map), 0);
    return map;
  };
}

installMapboxLeafletRuntime();
