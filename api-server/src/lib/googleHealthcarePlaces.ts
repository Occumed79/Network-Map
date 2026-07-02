import { logger } from "./logger";

export const GOOGLE_PLACES_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.primaryType",
  "places.types",
  "places.businessStatus",
].join(",");

export const ALLOWED_HEALTHCARE_PLACE_TYPES = [
  "medical_clinic",
  "medical_center",
  "doctor",
  "hospital",
  "general_hospital",
  "dental_clinic",
  "dentist",
  "medical_lab",
  "pharmacy",
  "drugstore",
  "physiotherapist",
  "chiropractor",
] as const;

export type GoogleHealthcarePlaceType = typeof ALLOWED_HEALTHCARE_PLACE_TYPES[number];
export type GooglePlacesTrigger = "address_search" | "live_finder_double_click" | "explicit_google";

const GENERAL_CLINICAL_TYPES: GoogleHealthcarePlaceType[] = [
  "medical_clinic", "medical_center", "doctor", "hospital", "general_hospital",
];

export const SERVICE_TYPE_TO_GOOGLE_INCLUDED_TYPES: Record<string, GoogleHealthcarePlaceType[]> = {
  all: [...GENERAL_CLINICAL_TYPES, "dental_clinic", "dentist", "medical_lab", "pharmacy", "drugstore"],
  clinical: GENERAL_CLINICAL_TYPES,
  physicalExam: ["medical_clinic", "medical_center", "doctor"],
  primaryCare: ["medical_clinic", "medical_center", "doctor"],
  clinic: ["medical_clinic", "medical_center", "doctor"],
  doctor: ["doctor", "medical_clinic", "medical_center"],
  specialists: ["doctor", "medical_center", "hospital", "general_hospital"],
  hospital: ["hospital", "general_hospital", "medical_center"],
  urgent: ["medical_clinic", "medical_center", "doctor", "hospital", "general_hospital"],
  urgentCare: ["medical_clinic", "medical_center", "doctor", "hospital", "general_hospital"],
  occMed: ["medical_clinic", "medical_center", "doctor"],
  occupational: ["medical_clinic", "medical_center", "doctor"],
  dotExam: ["medical_clinic", "medical_center", "doctor"],
  faaMedical: ["medical_clinic", "medical_center", "doctor"],
  drugTest: ["medical_lab", "medical_clinic", "medical_center"],
  drugscreen: ["medical_lab", "medical_clinic", "medical_center"],
  audiometry: ["medical_clinic", "medical_center", "doctor"],
  audiology: ["medical_clinic", "medical_center", "doctor"],
  vision: ["medical_clinic", "medical_center", "doctor"],
  eye: ["medical_clinic", "medical_center", "doctor"],
  dental: ["dental_clinic", "dentist"],
  dentist: ["dental_clinic", "dentist"],
  lab: ["medical_lab", "medical_center"],
  pharmacy: ["pharmacy", "drugstore"],
  vaccinations: ["pharmacy", "drugstore", "medical_clinic"],
  physio: ["physiotherapist", "medical_clinic"],
  chiropractic: ["chiropractor"],
  radiology: ["medical_center", "medical_clinic", "hospital"],
  pulmonary: ["doctor", "medical_center", "hospital"],
  behavioral: ["medical_clinic", "medical_center", "doctor"],
  mammogram: ["medical_center", "medical_clinic", "hospital"],
  stressTest: ["medical_center", "medical_clinic", "doctor", "hospital"],
};

export const SERVICE_TYPE_TO_GOOGLE_QUERY: Record<string, string> = {
  urgent: "urgent care",
  urgentCare: "urgent care",
  occMed: "occupational health",
  occupational: "occupational health",
  dotExam: "DOT medical exam",
  faaMedical: "FAA medical examiner",
  drugTest: "drug testing",
  drugscreen: "drug testing",
  audiometry: "audiology hearing test",
  audiology: "audiology hearing test",
  vision: "vision eye care",
  eye: "vision eye care",
  vaccinations: "vaccination",
  radiology: "medical imaging radiology",
  pulmonary: "pulmonary",
  behavioral: "mental health",
  mammogram: "mammography",
  stressTest: "cardiac stress test",
};

export type GoogleHealthcarePlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  primaryType?: string;
  types?: string[];
  businessStatus?: string;
};

export type GooglePlacesMetadata = {
  googlePlacesCache: "hit" | "miss" | "disabled";
  googlePlacesTypesUsed: string[];
  googlePlacesFieldMaskUsed: string;
};

type CacheEntry = { expiresAt: number; places: GoogleHealthcarePlace[] };
const placesCache = new Map<string, CacheEntry>();
const allowedTypes = new Set<string>(ALLOWED_HEALTHCARE_PLACE_TYPES);

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const GOOGLE_PLACES_HEALTHCARE_ONLY = process.env.GOOGLE_PLACES_HEALTHCARE_ONLY !== "false";
export const GOOGLE_PLACES_MAX_RESULTS = Math.min(20, Math.floor(positiveNumber(process.env.GOOGLE_PLACES_MAX_RESULTS, 20)));
export const GOOGLE_PLACES_MAX_RADIUS_METERS = Math.min(50000, positiveNumber(process.env.GOOGLE_PLACES_MAX_RADIUS_METERS, 50000));
export const GOOGLE_PLACES_CACHE_TTL_MS = positiveNumber(process.env.GOOGLE_PLACES_CACHE_TTL_HOURS, 24) * 60 * 60 * 1000;

export function isExplicitGooglePlacesTrigger(value: unknown): value is GooglePlacesTrigger {
  return value === "address_search" || value === "live_finder_double_click" || value === "explicit_google";
}

export function googleHealthcarePolicy(serviceType: string) {
  const includedTypes = SERVICE_TYPE_TO_GOOGLE_INCLUDED_TYPES[serviceType] || SERVICE_TYPE_TO_GOOGLE_INCLUDED_TYPES.all;
  const queryText = SERVICE_TYPE_TO_GOOGLE_QUERY[serviceType] || "";
  return { includedTypes, queryText };
}

function cacheKey(input: {
  lat: number; lng: number; radiusMeters: number; serviceType: string;
  includedTypes: string[]; queryText: string;
}) {
  return [
    input.lat.toFixed(3), input.lng.toFixed(3), Math.round(input.radiusMeters), input.serviceType,
    [...input.includedTypes].sort().join("|"), input.queryText.trim().toLowerCase(),
  ].join(":");
}

function matchesQuery(place: GoogleHealthcarePlace, queryText: string): boolean {
  if (!queryText) return true;
  const terms = queryText.toLowerCase().split(/\s+/).filter(term => term.length > 2);
  const searchable = [place.displayName?.text, place.primaryType, ...(place.types || [])].join(" ").toLowerCase();
  return terms.some(term => searchable.includes(term));
}

export async function searchGoogleHealthcarePlaces(input: {
  apiKey: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  serviceType: string;
  trigger?: unknown;
  queryText?: string;
}): Promise<{ places: GoogleHealthcarePlace[]; metadata: GooglePlacesMetadata }> {
  const policy = googleHealthcarePolicy(input.serviceType);
  const includedTypes = policy.includedTypes.filter(type => allowedTypes.has(type));
  const queryText = String(input.queryText || policy.queryText || "").trim();
  const metadataBase = {
    googlePlacesTypesUsed: includedTypes,
    googlePlacesFieldMaskUsed: GOOGLE_PLACES_FIELD_MASK,
  };

  if (!input.apiKey || !isExplicitGooglePlacesTrigger(input.trigger)) {
    return { places: [], metadata: { googlePlacesCache: "disabled", ...metadataBase } };
  }
  if (GOOGLE_PLACES_HEALTHCARE_ONLY && includedTypes.length === 0) {
    throw new Error("Google Places request blocked: healthcare type restriction required");
  }

  const radiusMeters = Math.min(Math.max(Math.round(input.radiusMeters), 100), GOOGLE_PLACES_MAX_RADIUS_METERS);
  const key = cacheKey({ ...input, radiusMeters, includedTypes, queryText });
  const cached = placesCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { places: cached.places, metadata: { googlePlacesCache: "hit", ...metadataBase } };
  }
  if (cached) placesCache.delete(key);

  const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": input.apiKey,
      "X-Goog-FieldMask": GOOGLE_PLACES_FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes,
      maxResultCount: GOOGLE_PLACES_MAX_RESULTS,
      locationRestriction: {
        circle: {
          center: { latitude: input.lat, longitude: input.lng },
          radius: radiusMeters,
        },
      },
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(`Google Places Nearby Search failed with status ${response.status}`);
  }

  const data = await response.json() as { places?: GoogleHealthcarePlace[] };
  const places = (data.places || [])
    .filter(place => place.businessStatus !== "CLOSED_PERMANENTLY")
    .filter(place => matchesQuery(place, queryText))
    .slice(0, GOOGLE_PLACES_MAX_RESULTS);
  placesCache.set(key, { places, expiresAt: Date.now() + GOOGLE_PLACES_CACHE_TTL_MS });
  logger.info({
    serviceType: input.serviceType,
    includedTypes,
    queryText: queryText || undefined,
    radiusMeters,
    maxResultCount: GOOGLE_PLACES_MAX_RESULTS,
    fieldMask: GOOGLE_PLACES_FIELD_MASK,
  }, "Google Places healthcare search completed");

  return { places, metadata: { googlePlacesCache: "miss", ...metadataBase } };
}

// Places Insights may be evaluated later for aggregate counts/place IDs after Google onboarding; it is intentionally not wired into production now.
