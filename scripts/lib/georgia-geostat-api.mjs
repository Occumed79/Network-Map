const API_BASE = "https://br-api.geostat.ge/api";
const PUBLIC_REGISTRY = "https://br.geostat.ge/register_geo/";

export function documentSearchUrl({ activityCode, page = 1, limit = 500 }) {
  const url = new URL(`${API_BASE}/documents`);
  url.searchParams.set("lang", "en");
  url.searchParams.set("activityCode", activityCode);
  url.searchParams.set("isActive", "true");
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));
  return url.toString();
}

export function documentCoordinates(document) {
  const lat = Number(document?.X);
  const lng = Number(document?.Y);
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= 40.8 && lat <= 43.7 && lng >= 40.0 && lng <= 47.8
    ? { lat, lng }
    : null;
}

export function publicRegistryUrl(document) {
  const taxId = String(document?.Legal_Code || "").trim();
  if (!taxId) return PUBLIC_REGISTRY;
  const url = new URL(PUBLIC_REGISTRY);
  url.searchParams.set("identificationNumber", taxId);
  return url.toString();
}
