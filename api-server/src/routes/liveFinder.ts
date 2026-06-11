import { Router, type Request, type Response } from "express";

const router = Router();

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

type LiveFinderResult = {
  id: number | string;
  lat: number;
  lng: number;
  name: string;
  cat: string;
  dist: number;
  addr: string;
  phone: string;
  website: string;
  hours: string;
  op: string;
  source: string;
  sourceDetail: string;
};

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function classifyFacility(tags: any): string {
  const a = String(tags.amenity || "").toLowerCase();
  const h = String(tags.healthcare || "").toLowerCase();
  const n = String(tags.name || "").toLowerCase();
  const o = String(tags.office || "").toLowerCase();
  const b = String(tags.building || "").toLowerCase();
  const s = String(tags.shop || "").toLowerCase();

  if (n.includes("faa")) return "faa";
  if (n.includes("dot") && n.includes("chiro")) return "dotchiro";
  if (n.includes("dot") && (n.includes("md") || n.includes("np") || n.includes("do") || n.includes("pa") || n.includes("medical"))) return "dotmd";
  if (n.includes("mammogram") || n.includes("breast imaging")) return "mammogram";
  if (n.includes("audiology") || n.includes("audiogram") || n.includes("hearing")) return "audiology";
  if (n.includes("drug screen") || n.includes("toxicology") || n.includes("urine test")) return "drugscreen";
  if (n.includes("stress test") || n.includes("cardiology")) return "stress";
  if (n.includes("physical exam") || n.includes("occupational health")) return "physical";
  if (n.includes("urgent care") || a === "urgent_care" || h === "urgent_care") return "urgent";
  if (a === "hospital" || h === "hospital" || b === "hospital" || n.includes("hospital")) return "hospital";
  if (a === "clinic" || h === "clinic" || n.includes("clinic")) return "clinic";
  if (a === "doctors" || h === "doctor" || o === "physician" || o === "medical") return "doctor";
  if (a === "pharmacy" || h === "pharmacy" || s === "chemist" || n.includes("pharmacy")) return "pharmacy";
  if (a === "dentist" || h === "dentist" || n.includes("dental")) return "dentist";
  if (a === "optometrist" || h === "optometrist" || s === "optician") return "eye";
  if (h === "physiotherapist") return "physio";
  if (a === "laboratory" || h === "laboratory" || h === "sample_collection") return "lab";
  if (a === "blood_bank" || h === "blood_bank") return "blood";
  if (a === "nursing_home" || h === "nursing_home") return "nursing";
  if (h) return "clinic";
  return "clinic";
}

function buildOverpassQuery(lat: number, lng: number, radiusMiles: number): string {
  const r = Math.max(radiusMiles, 0.1) * 1609.34;
  return `[out:json][timeout:30];(
node["amenity"="hospital"](around:${r},${lat},${lng});
node["amenity"="clinic"](around:${r},${lat},${lng});
node["amenity"="doctors"](around:${r},${lat},${lng});
node["amenity"="pharmacy"](around:${r},${lat},${lng});
node["amenity"="dentist"](around:${r},${lat},${lng});
node["amenity"="urgent_care"](around:${r},${lat},${lng});
node["amenity"="nursing_home"](around:${r},${lat},${lng});
node["healthcare"](around:${r},${lat},${lng});
way["healthcare"](around:${r},${lat},${lng});
way["amenity"="hospital"](around:${r},${lat},${lng});
way["amenity"="clinic"](around:${r},${lat},${lng});
node["office"="physician"](around:${r},${lat},${lng});
node["office"="medical"](around:${r},${lat},${lng});
node["shop"="optician"](around:${r},${lat},${lng});
node["shop"="chemist"](around:${r},${lat},${lng});
);
out center tags;`;
}

function normalizeElement(el: any, centerLat: number, centerLng: number, endpoint: string): LiveFinderResult | null {
  const la = Number(el.lat || el.center?.lat);
  const lo = Number(el.lon || el.center?.lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;

  const t = el.tags || {};
  const name = t.name || t["name:en"] || t.operator || "Unnamed Facility";
  const addr = [t["addr:housenumber"], t["addr:street"], t["addr:city"]].filter(Boolean).join(" ");

  return {
    id: el.id,
    lat: la,
    lng: lo,
    name,
    cat: classifyFacility(t),
    dist: haversine(centerLat, centerLng, la, lo),
    addr,
    phone: t.phone || t["contact:phone"] || "",
    website: t.website || t["contact:website"] || "",
    hours: t.opening_hours || "",
    op: t.operator || "",
    source: "OpenStreetMap",
    sourceDetail: endpoint,
  };
}

function dedupe(results: LiveFinderResult[]): LiveFinderResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = `${result.name.toLowerCase()}|${Math.round(result.lat * 500)}|${Math.round(result.lng * 500)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function queryMirror(endpoint: string, query: string, lat: number, lng: number): Promise<LiveFinderResult[]> {
  const response = await fetch(endpoint, {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json() as { elements?: any[] };
  if (!Array.isArray(data.elements)) throw new Error("Bad response");
  return data.elements
    .map((el) => normalizeElement(el, lat, lng, endpoint))
    .filter((row): row is LiveFinderResult => Boolean(row));
}

router.get("/live-finder/search", async (req: Request, res: Response) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusMiles = Number(req.query.radiusMiles || 10);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: "lat and lng are required" });
    return;
  }

  const query = buildOverpassQuery(lat, lng, Number.isFinite(radiusMiles) ? radiusMiles : 10);
  const settled = await Promise.allSettled(OVERPASS_ENDPOINTS.map((endpoint) => queryMirror(endpoint, query, lat, lng)));
  const providerStatus = settled.map((result, index) => ({
    source: `OpenStreetMap mirror ${index + 1}`,
    endpoint: OVERPASS_ENDPOINTS[index],
    ok: result.status === "fulfilled",
    count: result.status === "fulfilled" ? result.value.length : 0,
    error: result.status === "rejected" ? String(result.reason?.message || result.reason || "failed") : undefined,
  }));

  const results = dedupe(settled.flatMap((result) => result.status === "fulfilled" ? result.value : [])).sort((a, b) => a.dist - b.dist);
  res.json({
    location: { lat, lng },
    radiusMiles: Number.isFinite(radiusMiles) ? radiusMiles : 10,
    count: results.length,
    results,
    providers: providerStatus,
    note: "Live Finder now queries all configured Overpass mirrors in parallel and merges/deduplicates results instead of stopping after the first successful mirror.",
  });
});

export default router;
