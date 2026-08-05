import mapboxgl from "mapbox-gl";
import { mapboxGeocode, type MapboxBounds, type MapboxPlace } from "./mapboxServices";

const SOURCE_ID = "provider-location-search-results";
const LAYER_ID = "provider-location-search-dots";
const PANEL_FLAG = "providerLocationFinderReady";
const PATCH_FLAG = "__occumedProviderLocationFinderPatched";
const FLATGEOBUF_URL = "/api/healthsites/flatgeobuf";
const FLATGEOBUF_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/flatgeobuf@4.4.0/dist/flatgeobuf-geojson.min.js";
const PAGE_SIZE = 5_000;
const MAX_RESULTS = 75_000;
const MAX_PAGES_PER_QUERY = 20;

const COUNTRIES = `Afghanistan|Albania|Algeria|Andorra|Angola|Antigua and Barbuda|Argentina|Armenia|Australia|Austria|Azerbaijan|Bahamas|Bahrain|Bangladesh|Barbados|Belarus|Belgium|Belize|Benin|Bhutan|Bolivia|Bosnia and Herzegovina|Botswana|Brazil|Brunei|Bulgaria|Burkina Faso|Burundi|Cabo Verde|Cambodia|Cameroon|Canada|Central African Republic|Chad|Chile|China|Colombia|Comoros|Costa Rica|Croatia|Cuba|Cyprus|Czechia|Democratic Republic of the Congo|Denmark|Djibouti|Dominica|Dominican Republic|Ecuador|Egypt|El Salvador|Equatorial Guinea|Eritrea|Estonia|Eswatini|Ethiopia|Fiji|Finland|France|Gabon|Gambia|Georgia|Germany|Ghana|Greece|Grenada|Guatemala|Guinea|Guinea-Bissau|Guyana|Haiti|Honduras|Hungary|Iceland|India|Indonesia|Iran|Iraq|Ireland|Israel|Italy|Ivory Coast|Jamaica|Japan|Jordan|Kazakhstan|Kenya|Kiribati|Kosovo|Kuwait|Kyrgyzstan|Laos|Latvia|Lebanon|Lesotho|Liberia|Libya|Liechtenstein|Lithuania|Luxembourg|Madagascar|Malawi|Malaysia|Maldives|Mali|Malta|Marshall Islands|Mauritania|Mauritius|Mexico|Micronesia|Moldova|Monaco|Mongolia|Montenegro|Morocco|Mozambique|Myanmar|Namibia|Nauru|Nepal|Netherlands|New Zealand|Nicaragua|Niger|Nigeria|North Korea|North Macedonia|Norway|Oman|Pakistan|Palau|Palestine|Panama|Papua New Guinea|Paraguay|Peru|Philippines|Poland|Portugal|Qatar|Republic of the Congo|Romania|Russia|Rwanda|Saint Kitts and Nevis|Saint Lucia|Saint Vincent and the Grenadines|Samoa|San Marino|Sao Tome and Principe|Saudi Arabia|Senegal|Serbia|Seychelles|Sierra Leone|Singapore|Slovakia|Slovenia|Solomon Islands|Somalia|South Africa|South Korea|South Sudan|Spain|Sri Lanka|Sudan|Suriname|Sweden|Switzerland|Syria|Taiwan|Tajikistan|Tanzania|Thailand|Timor-Leste|Togo|Tonga|Trinidad and Tobago|Tunisia|Turkey|Turkmenistan|Tuvalu|Uganda|Ukraine|United Arab Emirates|United Kingdom|United States|Uruguay|Uzbekistan|Vanuatu|Vatican City|Venezuela|Vietnam|Yemen|Zambia|Zimbabwe`.split("|");

type Bounds = { west: number; south: number; east: number; north: number };
type Rect = { minX: number; minY: number; maxX: number; maxY: number };
type ResultProperties = {
  name: string;
  address: string;
  city: string;
  adminArea: string;
  country: string;
  phone: string;
  website: string;
  services: string;
  source: string;
  sourceGroup: "network" | "saved" | "healthsites";
};
type ResultFeature = GeoJSON.Feature<GeoJSON.Point, ResultProperties>;
type ResultCollection = GeoJSON.FeatureCollection<GeoJSON.Point, ResultProperties>;
type ExplorerProvider = Record<string, unknown> & {
  name?: string;
  address?: string | null;
  city?: string | null;
  admin_area?: string | null;
  country?: string | null;
  phone?: string | null;
  website?: string | null;
  services?: unknown;
  categories?: unknown;
  source?: string | null;
  source_kind?: string | null;
  status?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
};
type FlatGeobufApi = {
  deserialize: (
    input: string,
    rect?: Rect,
    headerMetaFn?: ((metadata: unknown) => void) | undefined,
    nocache?: boolean,
    headers?: HeadersInit,
  ) => AsyncIterable<GeoJSON.Feature>;
};

declare global {
  interface Window {
    flatgeobuf?: FlatGeobufApi;
  }
}

const trackedMaps = new Set<mapboxgl.Map>();
const clickBoundMaps = new WeakSet<mapboxgl.Map>();
let latestCollection: ResultCollection = emptyCollection();
let flatGeobufPromise: Promise<FlatGeobufApi> | null = null;
let scanTimer: number | null = null;
let observer: MutationObserver | null = null;
let searchGeneration = 0;
let activeController: AbortController | null = null;
let currentCountry = "";
let currentCity = "";
let loading = false;

function emptyCollection(): ResultCollection {
  return { type: "FeatureCollection", features: [] };
}

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function finiteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function firstText(source: Record<string, unknown> | null | undefined, keys: string[]): string {
  if (!source) return "";
  for (const key of keys) {
    const value = source[key];
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
  }
  return "";
}

function textList(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).join(", ");
  return value == null ? "" : String(value);
}

function setStatus(message: string, kind: "neutral" | "loading" | "success" | "warning" | "error" = "neutral"): void {
  document.querySelectorAll<HTMLElement>(".occumed-provider-location-status").forEach((node) => {
    node.textContent = message;
    node.dataset.kind = kind;
  });
}

function syncForms(): void {
  document.querySelectorAll<HTMLInputElement>(".occumed-provider-location-country").forEach((input) => {
    if (input !== document.activeElement) input.value = currentCountry;
  });
  document.querySelectorAll<HTMLInputElement>(".occumed-provider-location-city").forEach((input) => {
    if (input !== document.activeElement) input.value = currentCity;
  });
  document.querySelectorAll<HTMLButtonElement>(".occumed-provider-location-submit").forEach((button) => {
    button.disabled = loading;
    button.textContent = loading ? "Finding providers…" : "Show Providers";
  });
  document.querySelectorAll<HTMLButtonElement>(".occumed-provider-location-clear").forEach((button) => {
    button.disabled = loading && latestCollection.features.length === 0;
  });
}

function visibleMap(): mapboxgl.Map | null {
  const mode = (window as any).__NETWORK_MAP_GLOBE__?.getMode?.();
  const maps = Array.from(trackedMaps);
  const preferred = maps.find((map) => {
    const container = map.getContainer();
    const isGlobe = Boolean(container.closest(".mapbox-globe-host"));
    const modeMatches = mode === "3d" ? isGlobe : mode === "2d" ? !isGlobe : true;
    const rect = container.getBoundingClientRect();
    const style = window.getComputedStyle(container);
    return modeMatches && rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  });
  return preferred || maps.find((map) => map.loaded()) || maps[0] || null;
}

function popupHtml(properties: ResultProperties): string {
  const rows = [
    properties.address && ["Address", properties.address],
    properties.city && ["City", properties.city],
    properties.adminArea && ["Region", properties.adminArea],
    properties.country && ["Country", properties.country],
    properties.phone && ["Phone", properties.phone],
    properties.services && ["Services", properties.services],
    ["Source", properties.source],
  ].filter(Boolean) as string[][];
  const website = properties.website
    ? `<div class="provider-location-popup-row"><span>Website</span><a href="${escapeHtml(properties.website)}" target="_blank" rel="noreferrer">Open site</a></div>`
    : "";
  return `<div class="provider-location-popup">
    <div class="provider-location-popup-title">${escapeHtml(properties.name)}</div>
    ${rows.map(([label, value]) => `<div class="provider-location-popup-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
    ${website}
  </div>`;
}

function bindInteractions(map: mapboxgl.Map): void {
  if (clickBoundMaps.has(map)) return;
  clickBoundMaps.add(map);
  map.on("mouseenter", LAYER_ID, () => { map.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave", LAYER_ID, () => { map.getCanvas().style.cursor = ""; });
  map.on("click", LAYER_ID, (event) => {
    const raw = event.features?.[0];
    if (!raw || raw.geometry.type !== "Point") return;
    const coordinates = raw.geometry.coordinates.slice() as [number, number];
    while (Math.abs(event.lngLat.lng - coordinates[0]) > 180) {
      coordinates[0] += event.lngLat.lng > coordinates[0] ? 360 : -360;
    }
    new mapboxgl.Popup({ closeButton: true, maxWidth: "360px" })
      .setLngLat(coordinates)
      .setHTML(popupHtml(raw.properties as unknown as ResultProperties))
      .addTo(map);
  });
}

function ensureLayer(map: mapboxgl.Map): void {
  if (!map.isStyleLoaded()) return;
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: latestCollection,
      cluster: false,
      generateId: true,
    });
  }
  if (!map.getLayer(LAYER_ID)) {
    map.addLayer({
      id: LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 2.2, 7, 3.8, 13, 5.8],
        "circle-color": [
          "match",
          ["get", "sourceGroup"],
          "saved", "#f7d980",
          "healthsites", "#91e2ef",
          "#ffffff",
        ],
        "circle-opacity": 0.94,
        "circle-stroke-color": "#07111f",
        "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 2, 0.35, 10, 1.2],
        "circle-stroke-opacity": 0.9,
      },
    });
  }
  bindInteractions(map);
}

function pushCollection(collection: ResultCollection): void {
  latestCollection = collection;
  for (const map of trackedMaps) {
    ensureLayer(map);
    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    source?.setData(collection);
  }
}

function registerMap(map: mapboxgl.Map, originalOn: (...args: any[]) => mapboxgl.Map): void {
  if (trackedMaps.has(map)) return;
  trackedMaps.add(map);
  originalOn.call(map, "load", () => {
    ensureLayer(map);
    pushCollection(latestCollection);
  });
  originalOn.call(map, "style.load", () => {
    ensureLayer(map);
    pushCollection(latestCollection);
  });
  if (map.loaded()) {
    ensureLayer(map);
    pushCollection(latestCollection);
  }
}

function patchMapboxRegistration(): void {
  const prototype = mapboxgl.Map.prototype as any;
  if (prototype[PATCH_FLAG]) return;
  const originalOn = prototype.on;
  prototype.on = function patchedOn(this: mapboxgl.Map, ...args: any[]): mapboxgl.Map {
    registerMap(this, originalOn);
    return originalOn.apply(this, args);
  };
  const originalRemove = prototype.remove;
  prototype.remove = function patchedRemove(this: mapboxgl.Map, ...args: any[]): unknown {
    trackedMaps.delete(this);
    return originalRemove.apply(this, args);
  };
  prototype[PATCH_FLAG] = true;
}

function loadFlatGeobuf(): Promise<FlatGeobufApi> {
  if (window.flatgeobuf?.deserialize) return Promise.resolve(window.flatgeobuf);
  if (flatGeobufPromise) return flatGeobufPromise;
  flatGeobufPromise = new Promise<FlatGeobufApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${FLATGEOBUF_SCRIPT_URL}"]`);
    const script = existing || document.createElement("script");
    const finish = () => {
      if (window.flatgeobuf?.deserialize) resolve(window.flatgeobuf);
      else reject(new Error("FlatGeobuf browser library did not initialize."));
    };
    if (existing) {
      if (window.flatgeobuf?.deserialize) finish();
      else {
        existing.addEventListener("load", finish, { once: true });
        existing.addEventListener("error", () => reject(new Error("FlatGeobuf browser library failed to load.")), { once: true });
      }
      return;
    }
    script.src = FLATGEOBUF_SCRIPT_URL;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", () => reject(new Error("FlatGeobuf browser library failed to load.")), { once: true });
    document.head.appendChild(script);
  });
  return flatGeobufPromise;
}

function fallbackBounds(place: MapboxPlace, city: string): Bounds {
  const latDelta = city ? 0.45 : 5;
  const longitudeScale = Math.max(Math.cos(place.lat * Math.PI / 180), 0.25);
  const lngDelta = Math.min(city ? 0.65 / longitudeScale : 8 / longitudeScale, 30);
  return {
    west: Math.max(-180, place.lng - lngDelta),
    south: Math.max(-85, place.lat - latDelta),
    east: Math.min(180, place.lng + lngDelta),
    north: Math.min(85, place.lat + latDelta),
  };
}

function placeBounds(place: MapboxPlace, city: string): Bounds {
  const bbox = place.bbox as MapboxBounds | undefined;
  if (bbox) return { west: bbox[0], south: bbox[1], east: bbox[2], north: bbox[3] };
  return fallbackBounds(place, city);
}

function rectangles(bounds: Bounds): Rect[] {
  if (bounds.west <= bounds.east) {
    return [{ minX: bounds.west, minY: bounds.south, maxX: bounds.east, maxY: bounds.north }];
  }
  return [
    { minX: bounds.west, minY: bounds.south, maxX: 180, maxY: bounds.north },
    { minX: -180, minY: bounds.south, maxX: bounds.east, maxY: bounds.north },
  ];
}

function withinBounds(lng: number, lat: number, bounds: Bounds): boolean {
  if (lat < bounds.south || lat > bounds.north) return false;
  return bounds.west <= bounds.east
    ? lng >= bounds.west && lng <= bounds.east
    : lng >= bounds.west || lng <= bounds.east;
}

function fitSearchArea(bounds: Bounds, city: string): void {
  const map = visibleMap();
  if (!map) return;
  const east = bounds.east < bounds.west ? bounds.east + 360 : bounds.east;
  map.fitBounds([[bounds.west, bounds.south], [east, bounds.north]], {
    padding: { top: 72, right: 72, bottom: 72, left: 390 },
    duration: 1_000,
    maxZoom: city ? 12 : 6,
  });
}

function selectPlace(places: MapboxPlace[], country: string, city: string): MapboxPlace | null {
  const countryKey = normalize(country);
  const cityKey = normalize(city);
  return places.find((place) => {
    const countryMatch = !countryKey || [place.countryName, place.countryCode, place.placeName]
      .some((value) => normalize(value).includes(countryKey) || countryKey.includes(normalize(value)));
    const cityMatch = !cityKey || [place.label, place.placeName]
      .some((value) => normalize(value).includes(cityKey));
    return countryMatch && cityMatch;
  }) || places[0] || null;
}

function countryVariants(country: string, place: MapboxPlace): string[] {
  return [...new Set([country, place.countryName, place.countryCode]
    .map((value) => String(value || "").trim())
    .filter(Boolean))];
}

async function fetchExplorerAll(
  params: URLSearchParams,
  savedOnly: boolean,
  remaining: number,
  signal: AbortSignal,
): Promise<{ providers: ExplorerProvider[]; capped: boolean }> {
  const providers: ExplorerProvider[] = [];
  let page = 1;
  let capped = false;
  while (page <= MAX_PAGES_PER_QUERY && providers.length < remaining) {
    const url = new URL("/api/provider-explorer", window.location.origin);
    const query = new URLSearchParams(params);
    query.set("mode", "pins");
    query.set("page", String(page));
    query.set("limit", String(Math.min(PAGE_SIZE, remaining - providers.length)));
    query.set("includeLive", "false");
    query.set("includeStored", savedOnly ? "false" : "true");
    query.set("includeSaved", savedOnly ? "true" : "false");
    query.set("includeCandidates", "false");
    url.search = query.toString();
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Provider Explorer HTTP ${response.status}`);
    const payload = await response.json() as { providers?: ExplorerProvider[]; hasMore?: boolean; total?: number };
    const rows = Array.isArray(payload.providers) ? payload.providers : [];
    const accepted = savedOnly
      ? rows.filter((provider) => provider.status === "saved" || provider.source_kind === "saved")
      : rows;
    providers.push(...accepted);
    const total = Number(payload.total || providers.length);
    if (!payload.hasMore || rows.length === 0 || providers.length >= total) break;
    page += 1;
  }
  if (page > MAX_PAGES_PER_QUERY || providers.length >= remaining) capped = true;
  return { providers: providers.slice(0, remaining), capped };
}

async function fetchNetworkProviders(
  country: string,
  city: string,
  place: MapboxPlace,
  bounds: Bounds,
  generation: number,
  signal: AbortSignal,
): Promise<{ providers: ExplorerProvider[]; capped: boolean; usedBoundsFallback: boolean }> {
  const combined: ExplorerProvider[] = [];
  let capped = false;
  for (const variant of countryVariants(country, place)) {
    for (const savedOnly of [false, true]) {
      if (generation !== searchGeneration || combined.length >= MAX_RESULTS) break;
      const params = new URLSearchParams({ country: variant });
      if (city) params.set("city", city);
      const result = await fetchExplorerAll(params, savedOnly, MAX_RESULTS - combined.length, signal);
      combined.push(...result.providers);
      capped ||= result.capped;
    }
  }

  if (combined.length > 0 || generation !== searchGeneration) {
    return { providers: combined, capped, usedBoundsFallback: false };
  }

  const boundsParams = new URLSearchParams({
    north: String(bounds.north),
    south: String(bounds.south),
    east: String(bounds.east),
    west: String(bounds.west),
  });
  for (const savedOnly of [false, true]) {
    const result = await fetchExplorerAll(boundsParams, savedOnly, MAX_RESULTS - combined.length, signal);
    combined.push(...result.providers);
    capped ||= result.capped;
  }
  return { providers: combined, capped, usedBoundsFallback: true };
}

function networkFeature(provider: ExplorerProvider, bounds: Bounds): ResultFeature | null {
  const lat = finiteNumber(provider.lat);
  const lng = finiteNumber(provider.lng);
  if (lat === null || lng === null || !withinBounds(lng, lat, bounds)) return null;
  const saved = provider.source_kind === "saved" || provider.status === "saved" || normalize(provider.source).includes("my clinics");
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: {
      name: String(provider.name || "Unnamed provider"),
      address: String(provider.address || ""),
      city: String(provider.city || ""),
      adminArea: String(provider.admin_area || ""),
      country: String(provider.country || ""),
      phone: String(provider.phone || ""),
      website: String(provider.website || ""),
      services: textList(provider.services || provider.categories),
      source: String(provider.source || (saved ? "My Clinics" : "Provider network")),
      sourceGroup: saved ? "saved" : "network",
    },
  };
}

function matchesLocation(properties: Record<string, unknown>, countryKeys: string[], city: string): boolean {
  const countryValue = firstText(properties, ["country", "country_name", "iso2", "iso3", "addr_country", "addr:country"]);
  if (countryValue && countryKeys.length) {
    const normalizedCountry = normalize(countryValue);
    if (!countryKeys.some((key) => normalizedCountry === key || normalizedCountry.includes(key) || key.includes(normalizedCountry))) return false;
  }
  const cityValue = firstText(properties, ["city", "addr_city", "addr:city", "town", "village", "locality"]);
  if (city && cityValue) {
    const requested = normalize(city);
    const actual = normalize(cityValue);
    if (actual !== requested && !actual.includes(requested) && !requested.includes(actual)) return false;
  }
  return true;
}

async function fetchHealthsites(
  country: string,
  city: string,
  place: MapboxPlace,
  bounds: Bounds,
  generation: number,
  remaining: number,
): Promise<{ features: ResultFeature[]; capped: boolean }> {
  if (remaining <= 0) return { features: [], capped: true };
  const api = await loadFlatGeobuf();
  const features: ResultFeature[] = [];
  const countryKeys = countryVariants(country, place).map(normalize);
  let capped = false;
  for (const rect of rectangles(bounds)) {
    const iterator = api.deserialize(FLATGEOBUF_URL, rect, undefined, false, { Accept: "application/octet-stream" });
    for await (const raw of iterator) {
      if (generation !== searchGeneration) return { features: [], capped: false };
      if (raw.geometry?.type !== "Point") continue;
      const coordinates = raw.geometry.coordinates as number[];
      const lng = Number(coordinates[0]);
      const lat = Number(coordinates[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !withinBounds(lng, lat, bounds)) continue;
      const properties = (raw.properties || {}) as Record<string, unknown>;
      if (!matchesLocation(properties, countryKeys, city)) continue;
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: {
          name: firstText(properties, ["name", "facility_name", "name_en", "operator", "uuid"]) || "Healthsite facility",
          address: firstText(properties, ["addr_full", "address", "addr_street", "addr:street"]),
          city: firstText(properties, ["city", "addr_city", "addr:city", "town", "village"]),
          adminArea: firstText(properties, ["state", "province", "admin_area", "addr_state", "addr:state"]),
          country: firstText(properties, ["country", "country_name", "iso3", "iso2", "addr_country", "addr:country"]),
          phone: firstText(properties, ["phone", "contact_number", "contact:phone"]),
          website: firstText(properties, ["website", "url", "contact:website"]),
          services: firstText(properties, ["healthcare", "amenity", "facility_type", "type"]),
          source: "Healthsites.io",
          sourceGroup: "healthsites",
        },
      });
      if (features.length >= remaining) {
        capped = true;
        break;
      }
    }
    if (capped) break;
  }
  return { features, capped };
}

function dedupeFeatures(features: ResultFeature[]): ResultFeature[] {
  const output: ResultFeature[] = [];
  const sameName = new Map<string, ResultFeature[]>();
  const coordinateKeys = new Set<string>();
  for (const feature of features) {
    const [lng, lat] = feature.geometry.coordinates;
    const name = normalize(feature.properties.name);
    const coordinateKey = `${lng.toFixed(5)}:${lat.toFixed(5)}:${name}`;
    if (coordinateKeys.has(coordinateKey)) continue;
    const named = name && !name.includes("unnamed") && name !== "healthsite facility";
    if (named) {
      const matches = sameName.get(name) || [];
      if (matches.some((existing) => {
        const [existingLng, existingLat] = existing.geometry.coordinates;
        return Math.abs(existingLng - lng) <= 0.0025 && Math.abs(existingLat - lat) <= 0.0025;
      })) continue;
      matches.push(feature);
      sameName.set(name, matches);
    }
    coordinateKeys.add(coordinateKey);
    output.push(feature);
    if (output.length >= MAX_RESULTS) break;
  }
  return output;
}

function sourceSummary(features: ResultFeature[]): string {
  const network = features.filter((feature) => feature.properties.sourceGroup === "network").length;
  const saved = features.filter((feature) => feature.properties.sourceGroup === "saved").length;
  const healthsites = features.filter((feature) => feature.properties.sourceGroup === "healthsites").length;
  const parts = [
    network ? `${network.toLocaleString()} network` : "",
    saved ? `${saved.toLocaleString()} saved` : "",
    healthsites ? `${healthsites.toLocaleString()} Healthsites` : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

async function runSearch(country: string, city: string): Promise<void> {
  const trimmedCountry = country.trim();
  const trimmedCity = city.trim();
  if (!trimmedCountry) {
    setStatus("Choose or enter a country first.", "warning");
    return;
  }

  currentCountry = trimmedCountry;
  currentCity = trimmedCity;
  loading = true;
  syncForms();
  activeController?.abort();
  activeController = new AbortController();
  const generation = ++searchGeneration;

  try {
    setStatus(`Locating ${trimmedCity ? `${trimmedCity}, ` : ""}${trimmedCountry}…`, "loading");
    const query = trimmedCity ? `${trimmedCity}, ${trimmedCountry}` : trimmedCountry;
    const places = await mapboxGeocode(query, undefined, {
      types: trimmedCity ? "place,locality" : "country",
      limit: 8,
    });
    if (generation !== searchGeneration) return;
    const place = selectPlace(places, trimmedCountry, trimmedCity);
    if (!place) throw new Error("The selected country or city could not be located.");
    const bounds = placeBounds(place, trimmedCity);
    fitSearchArea(bounds, trimmedCity);

    setStatus("Loading stored and saved provider dots…", "loading");
    const network = await fetchNetworkProviders(
      trimmedCountry,
      trimmedCity,
      place,
      bounds,
      generation,
      activeController.signal,
    );
    if (generation !== searchGeneration) return;
    const networkFeatures = network.providers
      .map((provider) => networkFeature(provider, bounds))
      .filter((feature): feature is ResultFeature => Boolean(feature));

    setStatus(`${networkFeatures.length.toLocaleString()} network dots found. Adding Healthsites…`, "loading");
    let healthsites: { features: ResultFeature[]; capped: boolean } = { features: [], capped: false };
    let healthsitesWarning = "";
    try {
      healthsites = await fetchHealthsites(
        trimmedCountry,
        trimmedCity,
        place,
        bounds,
        generation,
        Math.max(0, MAX_RESULTS - networkFeatures.length),
      );
    } catch (error) {
      healthsitesWarning = error instanceof Error ? error.message : "Healthsites could not be loaded";
      console.error("Provider Location Finder Healthsites load failed", error);
    }
    if (generation !== searchGeneration) return;

    const features = dedupeFeatures([...networkFeatures, ...healthsites.features]);
    pushCollection({ type: "FeatureCollection", features });
    const location = trimmedCity ? `${trimmedCity}, ${trimmedCountry}` : trimmedCountry;
    const capped = network.capped || healthsites.capped || features.length >= MAX_RESULTS;
    const fallback = network.usedBoundsFallback ? " Location fields were incomplete, so stored records were matched by the mapped boundary." : "";
    const partial = healthsitesWarning ? " Healthsites was unavailable, so stored and saved providers are shown." : "";
    if (features.length === 0) {
      setStatus(`No provider dots were found for ${location}.${partial}`, healthsitesWarning ? "warning" : "neutral");
    } else if (capped) {
      setStatus(`${features.length.toLocaleString()} individual dots shown in ${location}. Refine by city to reveal additional providers. ${sourceSummary(features)}.${partial}${fallback}`, "warning");
    } else {
      setStatus(`${features.length.toLocaleString()} individual providers shown in ${location}. ${sourceSummary(features)}.${partial}${fallback}`, healthsitesWarning ? "warning" : "success");
    }
  } catch (error) {
    if (generation !== searchGeneration || (error instanceof DOMException && error.name === "AbortError")) return;
    console.error("Provider Location Finder search failed", error);
    pushCollection(emptyCollection());
    setStatus(error instanceof Error ? error.message : "Provider location search failed.", "error");
  } finally {
    if (generation === searchGeneration) {
      loading = false;
      syncForms();
    }
  }
}

function clearSearch(): void {
  activeController?.abort();
  activeController = null;
  searchGeneration += 1;
  currentCountry = "";
  currentCity = "";
  loading = false;
  pushCollection(emptyCollection());
  syncForms();
  setStatus("Choose a country. Add a city to narrow the individual provider dots.");
}

function ensureCountryList(): void {
  if (document.getElementById("occumed-provider-country-list")) return;
  const list = document.createElement("datalist");
  list.id = "occumed-provider-country-list";
  for (const country of COUNTRIES) {
    const option = document.createElement("option");
    option.value = country;
    list.appendChild(option);
  }
  document.body.appendChild(list);
}

function installPanel(panel: HTMLElement): void {
  if (panel.dataset[PANEL_FLAG] === "true") return;
  ensureCountryList();

  const section = document.createElement("section");
  section.className = "occumed-map-tools-section occumed-provider-location-finder";

  const title = document.createElement("div");
  title.className = "occumed-map-tools-section-title";
  title.textContent = "Provider Location Finder";

  const description = document.createElement("div");
  description.className = "occumed-provider-location-description";
  description.textContent = "Show providers in one country or city without enabling every international clinic.";

  const form = document.createElement("form");
  form.className = "occumed-provider-location-form";

  const countryLabel = document.createElement("label");
  countryLabel.textContent = "Country";
  const countryInput = document.createElement("input");
  countryInput.type = "text";
  countryInput.required = true;
  countryInput.autocomplete = "country-name";
  countryInput.placeholder = "Poland";
  countryInput.setAttribute("list", "occumed-provider-country-list");
  countryInput.className = "occumed-provider-location-country";
  countryLabel.appendChild(countryInput);

  const cityLabel = document.createElement("label");
  cityLabel.textContent = "City (optional)";
  const cityInput = document.createElement("input");
  cityInput.type = "text";
  cityInput.autocomplete = "address-level2";
  cityInput.placeholder = "Słupsk";
  cityInput.className = "occumed-provider-location-city";
  cityLabel.appendChild(cityInput);

  const actions = document.createElement("div");
  actions.className = "occumed-provider-location-actions";
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "occumed-provider-location-submit";
  submit.textContent = "Show Providers";
  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "occumed-provider-location-clear";
  clear.textContent = "Clear";
  clear.addEventListener("click", clearSearch);
  actions.append(submit, clear);

  const status = document.createElement("div");
  status.className = "occumed-provider-location-status";
  status.textContent = "Choose a country. Add a city to narrow the individual provider dots.";

  const legend = document.createElement("div");
  legend.className = "occumed-provider-location-legend";
  legend.innerHTML = '<span><i data-source="network"></i>Network</span><span><i data-source="saved"></i>Saved</span><span><i data-source="healthsites"></i>Healthsites</span>';

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void runSearch(countryInput.value, cityInput.value);
  });
  countryInput.addEventListener("input", () => { currentCountry = countryInput.value; });
  cityInput.addEventListener("input", () => { currentCity = cityInput.value; });

  form.append(countryLabel, cityLabel, actions);
  section.append(title, description, form, status, legend);
  panel.appendChild(section);
  panel.dataset[PANEL_FLAG] = "true";
  syncForms();
}

function scanForPanels(): void {
  document.querySelectorAll<HTMLElement>(".occumed-map-tools-panel").forEach(installPanel);
}

function scheduleScan(delay = 0): void {
  if (scanTimer !== null) window.clearTimeout(scanTimer);
  scanTimer = window.setTimeout(() => {
    scanTimer = null;
    scanForPanels();
  }, delay);
}

function startObserver(): void {
  if (observer || !document.body) return;
  observer = new MutationObserver(() => scheduleScan(40));
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleScan(0);
  window.setTimeout(() => scheduleScan(0), 500);
}

patchMapboxRegistration();
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startObserver, { once: true });
else startObserver();

export {};
