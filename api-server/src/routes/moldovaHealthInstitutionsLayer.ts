import { createHash } from "node:crypto";
import { Router, type Request, type Response } from "express";

const router = Router();
const MAX_PAGE_SIZE = 5000;
const SOURCE_PAGE = "https://ms.gov.md/contacte-2/harta-institutiilor-medicale/";
const MY_MAPS_MID = "1kDYisrnz9cAVoGh2DoIIBksgVQY";
const KML_URL = `https://www.google.com/maps/d/kml?mid=${encodeURIComponent(MY_MAPS_MID)}&forcekml=1`;
const CACHE_TTL_MS = 6 * 60 * 60_000;

type Bounds = { north: number; south: number; east: number; west: number };
type CacheEntry = { expiresAt: number; providers: Record<string, unknown>[] };

let cache: CacheEntry | null = null;

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function numberValue(value: unknown): number | null {
  const parsed = Number(text(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBounds(req: Request): Bounds | null {
  const useBounds = req.query.useBounds === "true" || req.query.bounds === "true";
  if (!useBounds) return null;
  const north = numberValue(req.query.north);
  const south = numberValue(req.query.south);
  const east = numberValue(req.query.east);
  const west = numberValue(req.query.west);
  if (north === null || south === null || east === null || west === null) return null;
  return {
    north: Math.min(90, Math.max(-90, north)),
    south: Math.min(90, Math.max(-90, south)),
    east: Math.min(180, Math.max(-180, east)),
    west: Math.min(180, Math.max(-180, west)),
  };
}

function inBounds(lat: number, lng: number, bounds: Bounds | null): boolean {
  if (!bounds) return true;
  if (lat < bounds.south || lat > bounds.north) return false;
  return bounds.west <= bounds.east
    ? lng >= bounds.west && lng <= bounds.east
    : lng >= bounds.west || lng <= bounds.east;
}

function xmlDecode(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gu, "$1")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, '"')
    .replace(/&#39;|&apos;/gu, "'")
    .replace(/&amp;/gu, "&")
    .trim();
}

function plainText(value: string): string {
  return xmlDecode(value)
    .replace(/<br\s*\/?\s*>/giu, " | ")
    .replace(/<\/p\s*>/giu, " | ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s*\|\s*/gu, " | ")
    .replace(/\s+/gu, " ")
    .trim();
}

function firstTag(block: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "iu"));
  return match ? xmlDecode(match[1]) : "";
}

function extendedData(block: string): Record<string, string> {
  const result: Record<string, string> = {};
  const dataPattern = /<Data\s+name=["']([^"']+)["'][^>]*>[\s\S]*?<value>([\s\S]*?)<\/value>[\s\S]*?<\/Data>/giu;
  for (const match of block.matchAll(dataPattern)) result[plainText(match[1])] = plainText(match[2]);
  const simplePattern = /<SimpleData\s+name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/SimpleData>/giu;
  for (const match of block.matchAll(simplePattern)) result[plainText(match[1])] = plainText(match[2]);
  return result;
}

function stableId(name: string, lat: number, lng: number): string {
  return `md-health:${createHash("sha1").update(`${name}|${lat.toFixed(6)}|${lng.toFixed(6)}`).digest("hex").slice(0, 20)}`;
}

function classify(name: string, description: string): string {
  const haystack = `${name} ${description}`.toLowerCase();
  if (/(spital|hospital|institut.*medicin|institutul.*mamei|oncologic|cardiolog|neurolog|pneumolog|boli infect)/u.test(haystack)) return "hospital";
  if (/(laborator|analiz|diagnostic)/u.test(haystack)) return "lab";
  if (/(stomat|dentar)/u.test(haystack)) return "dental";
  if (/(radiolog|imagistic|tomograf|rezonan)/u.test(haystack)) return "imaging";
  if (/(farmac|pharmacy)/u.test(haystack)) return "pharmacy_vaccination";
  if (/(centru de sanatate|centrul de sanatate|asociatia medicala teritoriala|medic de familie|asistenta medicala primara|policlinic)/u.test(haystack.normalize("NFKD").replace(/[\u0300-\u036f]/gu, ""))) return "general_practitioner";
  return "healthcare_facility";
}

function contact(description: string, fields: Record<string, string>) {
  const combined = `${description} ${Object.values(fields).join(" ")}`;
  const phone = Object.entries(fields).find(([key]) => /(telefon|phone|tel)/iu.test(key))?.[1]
    || combined.match(/(?:\+?373\s*)?(?:\(?0?\d{2,3}\)?[\s.-]*)?\d{2,3}[\s.-]\d{2,3}[\s.-]\d{2,3}/u)?.[0]
    || "";
  const email = Object.entries(fields).find(([key]) => /(email|e-mail)/iu.test(key))?.[1]
    || combined.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu)?.[0]
    || "";
  const website = Object.entries(fields).find(([key]) => /(site|web|url)/iu.test(key))?.[1]
    || combined.match(/https?:\/\/[^\s|<>"]+/iu)?.[0]
    || "";
  return { phone: text(phone), email: text(email), website: text(website) };
}

function parseKml(kml: string): Record<string, unknown>[] {
  const providers: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const match of kml.matchAll(/<Placemark(?:\s[^>]*)?>([\s\S]*?)<\/Placemark>/giu)) {
    const block = match[1];
    const name = plainText(firstTag(block, "name"));
    const coordinatesRaw = firstTag(block, "coordinates");
    const pair = coordinatesRaw.split(/\s+/u)[0]?.split(",") || [];
    const lng = numberValue(pair[0]);
    const lat = numberValue(pair[1]);
    if (!name || lat === null || lng === null || lat < 45 || lat > 49.5 || lng < 26 || lng > 31) continue;

    const fields = extendedData(block);
    const description = plainText(firstTag(block, "description"));
    const fieldValue = (patterns: RegExp[]) => Object.entries(fields).find(([key]) => patterns.some((pattern) => pattern.test(key)))?.[1] || "";
    const address = fieldValue([/adres/iu, /strad/iu, /street/iu]) || "";
    const city = fieldValue([/localit/iu, /oras/iu, /oraș/iu, /municip/iu, /raion/iu, /city/iu]) || "";
    const typeLabel = fieldValue([/tip/iu, /categorie/iu, /type/iu]) || "medical institution";
    const providerType = classify(name, `${description} ${typeLabel}`);
    const id = stableId(name, lat, lng);
    if (seen.has(id)) continue;
    seen.add(id);
    const contacts = contact(description, fields);

    providers.push({
      id,
      source_id: id,
      name,
      address: address || null,
      address_1: address || null,
      city: city || null,
      admin_area: null,
      state: null,
      postal_code: null,
      zip: null,
      country: "Moldova",
      country_code: "MD",
      lat,
      lng,
      phone: contacts.phone || null,
      email: contacts.email || null,
      website: contacts.website || null,
      clinic_type: providerType,
      providerType,
      category: typeLabel,
      services: [typeLabel],
      categories: [typeLabel],
      types: [providerType],
      description: description || null,
      source: "md_ministry_health_map",
      data_source: "md_ministry_health_map",
      source_kind: "official_ministry_map",
      source_authority: "Ministry of Health of the Republic of Moldova",
      source_url: SOURCE_PAGE,
      trust_tier: "registry",
      confidence_score: 0.98,
      provider_layer_category: "moldova-health-institutions",
    });
  }
  providers.sort((a, b) => text(a.name).localeCompare(text(b.name)));
  return providers;
}

async function loadProviders(): Promise<Record<string, unknown>[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.providers;
  const response = await fetch(KML_URL, {
    headers: { accept: "application/vnd.google-earth.kml+xml, application/xml, text/xml, */*", "user-agent": "Occu-Med-Network-Map/1.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Moldova Ministry health map KML failed: HTTP ${response.status}`);
  const providers = parseKml(await response.text());
  if (providers.length < 20) throw new Error(`Moldova Ministry health map produced only ${providers.length} mapped institutions`);
  cache = { expiresAt: Date.now() + CACHE_TTL_MS, providers };
  return providers;
}

router.get("/international-registry-layers/moldova-health-institutions", async (req: Request, res: Response) => {
  const bounds = parseBounds(req);
  const limit = Math.min(Math.max(Number(req.query.limit) || 1000, 1), MAX_PAGE_SIZE);
  const page = Math.max(Number(req.query.page) || 1, 1);
  try {
    const all = await loadProviders();
    const matching = all.filter((provider) => inBounds(Number(provider.lat), Number(provider.lng), bounds));
    const offset = (page - 1) * limit;
    const providers = matching.slice(offset, offset + limit);
    const total = matching.length;
    res.setHeader("Cache-Control", "public, max-age=900, stale-while-revalidate=21600");
    res.json({
      providers,
      count: providers.length,
      loaded: providers.length,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      source: "moldova-health-institutions",
      officialRegistry: true,
      live: true,
      visibleCapped: false,
      sourceAuthority: "Ministry of Health of the Republic of Moldova",
    });
  } catch (error) {
    const warning = error instanceof Error ? error.message : "Moldova Ministry health institutions request failed";
    console.error("[MoldovaHealthInstitutions] failed:", error);
    res.status(503).json({
      providers: [], count: 0, loaded: 0, total: 0, page, limit, hasMore: false,
      source: "moldova-health-institutions", officialRegistry: true, live: true,
      warning, transientFailure: true, visibleCapped: false,
    });
  }
});

export default router;
