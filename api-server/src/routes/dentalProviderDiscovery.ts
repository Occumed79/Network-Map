import { Router, type NextFunction, type Request, type Response } from "express";
import { searchNpi } from "../providerSources/adapters/npi";
import type { ProviderCandidate } from "../providerSources/types";
import { upsertProvider } from "../providerSources/persistence";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";

const router = Router();

const DENTAL_NETWORKS = [
  { name: "Affordable Care", desc: "Dental practice network with transparent fee schedule information where available.", url: "https://www.affordablecare.com/", tag: "FEE SCHEDULE" },
  { name: "1-800-Dentist", desc: "Find local dentists and compare options in the requested area.", url: "https://www.1800dentist.com/", tag: "COMPARE" },
  { name: "Open Care", desc: "Compares dental practices by location, insurance, reviews, and appointment availability.", url: "https://www.opencare.com/", tag: "COMPARE" },
  { name: "Dental Plans", desc: "Discount dental plans with listed savings for common dental services.", url: "https://www.dentalplans.com/", tag: "DISCOUNT" },
  { name: "CostHelper Health", desc: "User-reported dental cost ranges for common dental procedures.", url: "https://health.costhelper.com/dentist.html", tag: "COST GUIDE" },
];

const PRICING_RESOURCES = [
  { name: "FAIR Health Consumer", desc: "Estimate out-of-pocket dental costs by procedure and location.", url: "https://fairhealthconsumer.org/", tag: "ESTIMATOR" },
  { name: "ClearHealthCosts", desc: "Crowdsourced prices for healthcare and dental services.", url: "https://clearhealthcosts.com/", tag: "CROWDSOURCED" },
  { name: "CostHelper Health", desc: "Consumer-reported dental procedure price ranges.", url: "https://health.costhelper.com/dentist.html", tag: "COST GUIDE" },
];

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
  trustTier: ProviderCandidate["trustTier"];
  coordinateStatus: ProviderCandidate["coordinateStatus"];
};

function isDentalRequest(req: Request): boolean {
  return String(req.query.serviceType || "").trim() === "dental";
}

function candidateToDentalProvider(candidate: ProviderCandidate): DentalProvider {
  const taxonomy = candidate.taxonomy || "Dental provider";
  const searchQuery = [candidate.name, candidate.address].filter(Boolean).join(" ");
  return {
    name: candidate.name,
    address: candidate.address,
    phone: candidate.phone,
    taxonomy,
    isFqhc: /federally qualified|fqhc/i.test(taxonomy),
    npiUrl: candidate.sourceUrl || "https://npiregistry.cms.hhs.gov/",
    searchUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`,
    npiType: candidate.sourceDetail || "NPI",
    source: "NPPES NPI Registry",
    trustTier: candidate.trustTier,
    coordinateStatus: candidate.coordinateStatus,
  };
}

async function discoverDentalProviders(city: string, state: string): Promise<DentalProvider[]> {
  const candidates = await searchNpi(city, state, "dental");

  if (isPersistenceConfigured()) {
    await Promise.allSettled(
      candidates.map((candidate) => upsertProvider(candidate, "dental")),
    );
  }

  return candidates
    .map(candidateToDentalProvider)
    .sort((a, b) => {
      const aOrganization = a.npiType.includes("NPI-2") ? 0 : 1;
      const bOrganization = b.npiType.includes("NPI-2") ? 0 : 1;
      return aOrganization - bOrganization || a.name.localeCompare(b.name);
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
    res.setHeader("X-Network-Map-NPI-Pipeline", "central-adapter");
    res.json({
      location: `${city}${state ? `, ${state}` : ""}`,
      serviceType: "dental",
      clinicCount: clinics.length,
      clinics: clinics.slice(0, 50),
      networks: DENTAL_NETWORKS,
      pricingResources: PRICING_RESOURCES,
      discoveryNote: "Dental discovery uses the central backend NPI adapter and includes organization and individual registrations.",
    });
  } catch (error) {
    console.error("dental price-finder error", error);
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
      discoveryNote: "Provider discovered through the central NPI adapter. Use the map link for manual verification when no posted price page is found.",
    }));

    res.setHeader("X-Network-Map-NPI-Pipeline", "central-adapter");
    res.json({
      location: `${city}${state ? `, ${state}` : ""}`,
      serviceType: "dental",
      clinicCount: results.length,
      results,
      extracted: 0,
      pricingResources: PRICING_RESOURCES,
      discoveryNote: "Dental price hunt starts from the same central NPI adapter used by the rest of Network Map.",
    });
  } catch (error) {
    console.error("dental price-hunt error", error);
    res.status(500).json({ error: "Dental price hunt failed. Please try again." });
  }
});

export default router;
