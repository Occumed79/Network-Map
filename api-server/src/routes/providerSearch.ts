import { Router, type Request, type Response } from "express";

const router = Router();

type ProviderSource = "NPI" | "OpenStreetMap" | "WebHint";

type ProviderCandidate = {
  name: string;
  address: string;
  phone: string;
  website: string;
  lat?: number;
  lng?: number;
  taxonomy?: string;
  source: ProviderSource;
  sourceDetail?: string;
  sourceUrl?: string;
  confidence: "high" | "medium" | "low";
  score: number;
  badges: string[];
};

const SERVICE_TAXONOMIES: Record<string, string[]> = {
  dental: ["Dentist", "General Practice", "Dental Public Health", "Endodontics", "Oral and Maxillofacial Surgery", "Orthodontics and Dentofacial Orthopedics", "Pediatric Dentistry", "Periodontics", "Prosthodontics"],
  urgentCare: ["Clinic/Center, Urgent Care", "Urgent Care", "Clinic/Center"],
  physicalExam: ["Occupational Medicine", "Preventive Medicine", "Family Medicine", "Internal Medicine", "Clinic/Center"],
  dotExam: ["Occupational Medicine", "Family Medicine", "Internal Medicine", "Chiropractor"],
  faamedical: ["Aerospace Medicine", "Occupational Medicine", "Family Medicine"],
  pharmacy: ["Pharmacy", "Community/Retail Pharmacy"],
  stressTest: ["Cardiovascular Disease", "Cardiology", "Internal Medicine"],
  mammogram: ["Diagnostic Radiology", "Radiology", "Clinic/Center, Radiology"],
  vaccinations: ["Public Health & General Preventive Medicine", "Family Medicine", "Pharmacy", "Clinic/Center"],
  audiology: ["Audiologist", "Audiologist-Hearing Aid Fitter", "Hearing Instrument Specialist"],
  drugscreen: ["Clinical Medical Laboratory", "Clinic/Center", "Occupational Medicine"],
  lab: ["Clinical Medical Laboratory", "Pathology"],
};

const OSM_TERMS: Record<string, string[]> = {
  dental: ["dentist", "dental"],
  urgentCare: ["urgent care", "clinic"],
  physicalExam: ["occupational health", "clinic", "doctor"],
  dotExam: ["dot physical", "occupational health"],
  faamedical: ["faa medical examiner", "aerospace medicine"],
  pharmacy: ["pharmacy"],
  stressTest: ["cardiology", "stress test"],
  mammogram: ["mammogram", "breast imaging", "radiology"],
  vaccinations: ["vaccine", "pharmacy", "clinic"],
  audiology: ["audiology", "hearing"],
  drugscreen: ["drug testing", "toxicology", "laboratory"],
  lab: ["laboratory", "labcorp", "quest"],
};

function normalizeKey(candidate: ProviderCandidate): string {
  return [candidate.name, candidate.address || candidate.phone]
    .join("|")
    .toLowerCase()
    .replace(/[^a-z0-9|]+/g, " ")
    .trim();
}

function mergeCandidates(candidates: ProviderCandidate[]): ProviderCandidate[] {
  const byKey = new Map<string, ProviderCandidate>();
  for (const candidate of candidates) {
    const key = normalizeKey(candidate);
    if (!key) continue;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, candidate);
      continue;
    }
    const badges = Array.from(new Set([...existing.badges, ...candidate.badges]));
    const score = existing.score + candidate.score + 10;
    byKey.set(key, {
      ...existing,
      phone: existing.phone || candidate.phone,
      website: existing.website || candidate.website,
      lat: existing.lat ?? candidate.lat,
      lng: existing.lng ?? candidate.lng,
      sourceDetail: [existing.sourceDetail, candidate.sourceDetail].filter(Boolean).join(" + "),
      score,
      badges,
      confidence: score >= 70 ? "high" : score >= 40 ? "medium" : "low",
    });
  }
  return Array.from(byKey.values()).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function bestAddress(addresses: any[] = []): any {
  return addresses.find((addr) => addr.address_purpose === "LOCATION") || addresses[0] || {};
}

function formatNpiAddress(addr: any): string {
  return [addr.address_1, addr.address_2, addr.city, addr.state, addr.postal_code?.slice?.(0, 5)].filter(Boolean).join(", ");
}

async function searchNpi(city: string, state: string, serviceType: string): Promise<ProviderCandidate[]> {
  const taxonomies = SERVICE_TAXONOMIES[serviceType] || [serviceType];
  const batches = await Promise.allSettled(
    taxonomies.map(async (taxonomy) => {
      const params = new URLSearchParams({ version: "2.1", city, state, taxonomy_description: taxonomy, limit: "50" });
      const resp = await fetch(`https://npiregistry.cms.hhs.gov/api/?${params}`, { signal: AbortSignal.timeout(9000) });
      if (!resp.ok) throw new Error(`NPI ${resp.status}`);
      const data = await resp.json() as { results?: any[] };
      return (data.results || []).map((result): ProviderCandidate => {
        const basic = result.basic || {};
        const addr = bestAddress(result.addresses || []);
        const taxonomyRow = result.taxonomies?.find((t: any) => t.primary) || result.taxonomies?.[0] || {};
        const individual = [basic.first_name, basic.middle_name, basic.last_name].filter(Boolean).join(" ").trim();
        const credential = basic.credential ? `, ${basic.credential}` : "";
        const name = basic.organization_name || (individual ? `${individual}${credential}` : "Unknown Provider");
        const npi = result.number ? String(result.number) : "";
        return {
          name,
          address: formatNpiAddress(addr),
          phone: addr.telephone_number || "",
          website: "",
          taxonomy: taxonomyRow.desc || taxonomy,
          source: "NPI",
          sourceDetail: `NPI ${result.enumeration_type || ""}`.trim(),
          sourceUrl: npi ? `https://npiregistry.cms.hhs.gov/provider-view/${npi}` : "https://npiregistry.cms.hhs.gov/",
          confidence: "medium",
          score: result.enumeration_type === "NPI-2" ? 35 : 30,
          badges: ["NPI Verified"],
        };
      });
    }),
  );
  return batches.flatMap((batch) => batch.status === "fulfilled" ? batch.value : []);
}

async function geocodeCity(city: string, state: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(`${city}, ${state}`)}`, {
      headers: { "Accept-Language": "en" },
      signal: AbortSignal.timeout(7000),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
  } catch {
    return null;
  }
}

async function searchOsm(city: string, state: string, serviceType: string, radiusMiles: number): Promise<ProviderCandidate[]> {
  const center = await geocodeCity(city, state);
  if (!center) return [];
  const terms = OSM_TERMS[serviceType] || [serviceType];
  const radiusMeters = Math.max(radiusMiles, 1) * 1609.34;
  const termRegex = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const q = `[out:json][timeout:25];(
node["name"~"${termRegex}",i](around:${radiusMeters},${center.lat},${center.lng});
node["amenity"~"clinic|doctors|dentist|pharmacy|hospital|urgent_care",i](around:${radiusMeters},${center.lat},${center.lng});
node["healthcare"](around:${radiusMeters},${center.lat},${center.lng});
way["healthcare"](around:${radiusMeters},${center.lat},${center.lng});
);
out center tags;`;
  const endpoints = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
  const batches = await Promise.allSettled(endpoints.map(async (endpoint) => {
    const resp = await fetch(endpoint, {
      method: "POST",
      body: `data=${encodeURIComponent(q)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
      signal: AbortSignal.timeout(9000),
    });
    if (!resp.ok) throw new Error(`OSM ${resp.status}`);
    const data = await resp.json() as { elements?: any[] };
    return (data.elements || []).map((el): ProviderCandidate | null => {
      const lat = el.lat || el.center?.lat;
      const lng = el.lon || el.center?.lon;
      const tags = el.tags || {};
      const name = tags.name || tags.operator || "Unnamed Facility";
      if (!name || name === "Unnamed Facility") return null;
      const address = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"], tags["addr:state"]].filter(Boolean).join(", ");
      return {
        name,
        address,
        phone: tags.phone || tags["contact:phone"] || "",
        website: tags.website || tags["contact:website"] || "",
        lat: Number(lat),
        lng: Number(lng),
        taxonomy: tags.healthcare || tags.amenity || "map place",
        source: "OpenStreetMap",
        sourceDetail: endpoint,
        sourceUrl: "https://www.openstreetmap.org/",
        confidence: "low",
        score: 18 + (tags.phone ? 4 : 0) + (tags.website ? 4 : 0),
        badges: ["Map Candidate"],
      };
    }).filter((row): row is ProviderCandidate => Boolean(row));
  }));
  return batches.flatMap((batch) => batch.status === "fulfilled" ? batch.value : []);
}

function webHints(city: string, state: string, serviceType: string): ProviderCandidate[] {
  const terms = OSM_TERMS[serviceType] || [serviceType];
  return terms.slice(0, 4).map((term) => ({
    name: `${term} near ${city}, ${state}`,
    address: `${city}, ${state}`,
    phone: "",
    website: `https://duckduckgo.com/?q=${encodeURIComponent(`${term} near ${city} ${state}`)}`,
    taxonomy: term,
    source: "WebHint" as const,
    sourceDetail: "Search link, not verified provider",
    sourceUrl: `https://duckduckgo.com/?q=${encodeURIComponent(`${term} near ${city} ${state}`)}`,
    confidence: "low" as const,
    score: 5,
    badges: ["Web Search"],
  }));
}

router.get("/providers/search", async (req: Request, res: Response) => {
  const city = String(req.query.city || "").trim();
  const state = String(req.query.state || "").trim().toUpperCase();
  const serviceType = String(req.query.serviceType || "").trim() || "physicalExam";
  const radiusMiles = Number(req.query.radiusMiles || 35);

  if (!city || !state) {
    res.status(400).json({ error: "city and state are required" });
    return;
  }

  const [npi, osm] = await Promise.all([
    searchNpi(city, state, serviceType).catch(() => []),
    searchOsm(city, state, serviceType, Number.isFinite(radiusMiles) ? radiusMiles : 35).catch(() => []),
  ]);
  const web = webHints(city, state, serviceType);
  const results = mergeCandidates([...npi, ...osm, ...web]);

  res.json({
    location: `${city}, ${state}`,
    serviceType,
    radiusMiles: Number.isFinite(radiusMiles) ? radiusMiles : 35,
    count: results.length,
    results,
    providers: [
      { source: "NPI", count: npi.length, ok: true },
      { source: "OpenStreetMap", count: osm.length, ok: true },
      { source: "WebHint", count: web.length, ok: true },
    ],
    note: "Unified provider search aggregates active free sources in parallel, merges duplicates, and labels confidence. WebHint rows are search leads, not verified providers.",
  });
});

export default router;
