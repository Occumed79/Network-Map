import { Router, type NextFunction, type Request, type Response } from "express";

const router = Router();

const DENTAL_TAXONOMIES = [
  "Dentist",
  "General Practice",
  "Dental Public Health",
  "Endodontics",
  "Oral and Maxillofacial Surgery",
  "Oral and Maxillofacial Radiology",
  "Orthodontics and Dentofacial Orthopedics",
  "Pediatric Dentistry",
  "Periodontics",
  "Prosthodontics",
];

const DENTAL_NETWORKS = [
  { name:'Affordable Care', desc:'Dental practice network with transparent fee schedule information where available.', url:'https://www.affordablecare.com/', tag:'FEE SCHEDULE' },
  { name:'1-800-Dentist', desc:'Find local dentists and compare options in the requested area.', url:'https://www.1800dentist.com/', tag:'COMPARE' },
  { name:'Open Care', desc:'Compares dental practices by location, insurance, reviews, and appointment availability.', url:'https://www.opencare.com/', tag:'COMPARE' },
  { name:'Dental Plans', desc:'Discount dental plans with listed savings for common dental services.', url:'https://www.dentalplans.com/', tag:'DISCOUNT' },
  { name:'CostHelper Health', desc:'User-reported dental cost ranges for common dental procedures.', url:'https://health.costhelper.com/dentist.html', tag:'COST GUIDE' },
];

const PRICING_RESOURCES = [
  { name:'FAIR Health Consumer', desc:'Estimate out-of-pocket dental costs by procedure and location.', url:'https://fairhealthconsumer.org/', tag:'ESTIMATOR' },
  { name:'ClearHealthCosts', desc:'Crowdsourced prices for healthcare and dental services.', url:'https://clearhealthcosts.com/', tag:'CROWDSOURCED' },
  { name:'CostHelper Health', desc:'Consumer-reported dental procedure price ranges.', url:'https://health.costhelper.com/dentist.html', tag:'COST GUIDE' },
];

type NpiAddress = Record<string, string | undefined>;
type NpiTaxonomy = { code?: string; desc?: string; primary?: boolean };
type NpiResult = {
  number?: number;
  enumeration_type?: string;
  basic?: Record<string, string | undefined>;
  addresses?: NpiAddress[];
  taxonomies?: NpiTaxonomy[];
};

type DentalProvider = {
  name: string;
  address: string;
  phone: string;
  taxonomy: string;
  isFqhc: boolean;
  npiUrl: string;
  searchUrl: string;
  npiType: string;
  source: string;
};

function isDentalRequest(req: Request): boolean {
  return String(req.query.serviceType || "").trim() === "dental";
}

function bestAddress(addresses: NpiAddress[] = []): NpiAddress | undefined {
  return addresses.find((addr) => addr.address_purpose === "LOCATION") || addresses[0];
}

function formatAddress(addr?: NpiAddress): string {
  if (!addr) return "";
  return [
    addr.address_1,
    addr.address_2,
    addr.city,
    addr.state,
    addr.postal_code?.slice(0, 5),
  ].filter(Boolean).join(", ");
}

function formatProvider(result: NpiResult): DentalProvider {
  const basic = result.basic || {};
  const addr = bestAddress(result.addresses || []);
  const taxonomy = result.taxonomies?.find((t) => t.primary)?.desc || result.taxonomies?.[0]?.desc || "Dental provider";
  const npi = result.number ? String(result.number) : "";
  const individualName = [basic.first_name, basic.middle_name, basic.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const credential = basic.credential ? `, ${basic.credential}` : "";
  const name = basic.organization_name || (individualName ? `${individualName}${credential}` : "Unknown Dental Provider");
  const address = formatAddress(addr);
  const city = addr?.city || "";
  const state = addr?.state || "";

  return {
    name,
    address,
    phone: addr?.telephone_number || "",
    taxonomy,
    isFqhc: taxonomy.toLowerCase().includes("federally qualified") || taxonomy.toLowerCase().includes("fqhc"),
    npiUrl: npi ? `https://npiregistry.cms.hhs.gov/provider-view/${npi}` : "https://npiregistry.cms.hhs.gov/",
    searchUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address || `${city} ${state}`}`.trim())}`,
    npiType: result.enumeration_type || "NPI",
    source: "NPPES NPI Registry",
  };
}

function dedupeProviders(providers: DentalProvider[]): DentalProvider[] {
  const seen = new Set<string>();
  return providers.filter((provider) => {
    const key = [provider.name, provider.address || provider.phone].join("|").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchNpiDental(city: string, state: string, taxonomy: string, limit = 50): Promise<NpiResult[]> {
  const params = new URLSearchParams({
    version: "2.1",
    city: city.trim(),
    state: state.trim().toUpperCase(),
    taxonomy_description: taxonomy,
    limit: String(limit),
  });

  const resp = await fetch(`https://npiregistry.cms.hhs.gov/api/?${params}`, {
    signal: AbortSignal.timeout(9000),
  });
  if (!resp.ok) return [];
  const data = await resp.json() as { results?: NpiResult[] };
  return data.results || [];
}

async function discoverDentalProviders(city: string, state: string): Promise<DentalProvider[]> {
  const batches = await Promise.all(
    DENTAL_TAXONOMIES.map((taxonomy) => searchNpiDental(city, state, taxonomy).catch(() => [])),
  );

  return dedupeProviders(batches.flat().map(formatProvider))
    .sort((a, b) => {
      const aOrg = a.npiType === "NPI-2" ? 0 : 1;
      const bOrg = b.npiType === "NPI-2" ? 0 : 1;
      if (aOrg !== bOrg) return aOrg - bOrg;
      return a.name.localeCompare(b.name);
    });
}

function buildDentalPriceQueries(provider: DentalProvider, city: string, state: string): string[] {
  const base = `${provider.name} ${city} ${state}`.trim();
  return [
    `${base} dental exam cash price`,
    `${base} self pay dental fee schedule`,
    `${base} dental cleaning price`,
    `${base} uninsured dental cost`,
    `${base} new patient dental exam price`,
  ];
}

router.get("/price-finder", async (req: Request, res: Response, next: NextFunction) => {
  if (!isDentalRequest(req)) {
    next();
    return;
  }

  const city = String(req.query.city || "").trim();
  const state = String(req.query.state || "").trim().toUpperCase();
  if (!city) {
    res.status(400).json({ error: "city is required" });
    return;
  }

  try {
    const clinics = await discoverDentalProviders(city, state);
    res.json({
      location: `${city}${state ? ", " + state : ""}`,
      serviceType: "dental",
      clinicCount: clinics.length,
      clinics: clinics.slice(0, 50),
      networks: DENTAL_NETWORKS,
      pricingResources: PRICING_RESOURCES,
      discoveryNote: "Dental provider discovery includes both individual dentist NPIs and organization NPIs. This reduces undercounting in smaller markets.",
    });
  } catch (err) {
    console.error("dental price-finder error", err);
    res.status(500).json({ error: "Dental provider search failed. Please try again." });
  }
});

router.get("/price-hunt", async (req: Request, res: Response, next: NextFunction) => {
  if (!isDentalRequest(req)) {
    next();
    return;
  }

  const city = String(req.query.city || "").trim();
  const state = String(req.query.state || "").trim().toUpperCase();
  if (!city) {
    res.status(400).json({ error: "city is required" });
    return;
  }

  try {
    const clinics = (await discoverDentalProviders(city, state)).slice(0, 15);
    const results = clinics.map((clinic) => ({
      ...clinic,
      queries: buildDentalPriceQueries(clinic, city, state),
      matches: [],
      hitCount: 0,
      discoveryNote: "Provider found through broad NPI dental discovery. Use the Google Maps link for manual verification when no posted price page is found.",
    }));

    res.json({
      location: `${city}${state ? ", " + state : ""}`,
      serviceType: "dental",
      clinicCount: results.length,
      results,
      extracted: 0,
      pricingResources: PRICING_RESOURCES,
      discoveryNote: "Dental price hunt now starts from a broader provider list instead of organization-only NPI records.",
    });
  } catch (err) {
    console.error("dental price-hunt error", err);
    res.status(500).json({ error: "Dental price hunt failed. Please try again." });
  }
});

export default router;
