import type { CoordinateStatus, ProviderCandidate, TrustTier } from "../types";

const NPI_API_URL = "https://npiregistry.cms.hhs.gov/api/";
const DEFAULT_TIMEOUT_MS = 10_000;
const NPI_PAGE_SIZE = 200;
const MAX_TOTAL_RESULTS = 500;

export const NPI_TAXONOMY_MAP: Record<string, string[]> = {
  urgent: ["Clinic/Center, Urgent Care", "Urgent Care", "Urgent Care Medicine"],
  occupational: ["Occupational Medicine", "Preventive Medicine, Occupational Medicine"],
  primaryCare: ["Family Medicine", "General Practice", "Internal Medicine", "Pediatric Medicine"],
  dentist: ["Dentist", "Dentist General Practice", "Dental Public Health", "Pediatric Dentistry"],
  dental: ["Dentist", "Dentist General Practice", "Dental Public Health", "Endodontics", "Oral and Maxillofacial Surgery", "Orthodontics and Dentofacial Orthopedics", "Pediatric Dentistry", "Periodontics", "Prosthodontics"],
  radiology: ["Diagnostic Radiology", "Radiology"],
  pulmonary: ["Pulmonary Disease", "Internal Medicine", "Critical Care Medicine"],
  lab: ["Clinical Medical Laboratory", "Clinical Laboratory Technician", "Phlebotomy"],
  physio: ["Physical Therapist", "Physical Therapy"],
  chiropractic: ["Chiropractor", "Chiropractic"],
  audiology: ["Audiologist", "Audiologist-Hearing Aid Fitter", "Hearing Instrument Specialist"],
  behavioral: ["Clinical Psychologist", "Psychiatry", "Mental Health Counselor"],
  dotExam: ["Occupational Medicine", "Family Medicine", "Internal Medicine", "Chiropractor"],
  faamedical: ["Aerospace Medicine", "Occupational Medicine", "Family Medicine"],
  stressTest: ["Cardiovascular Disease", "Cardiology", "Internal Medicine"],
  mammogram: ["Diagnostic Radiology", "Radiology"],
  drugscreen: ["Clinical Medical Laboratory"],
  urgentCare: ["Clinic/Center, Urgent Care", "Urgent Care", "Urgent Care Medicine"],
  physicalExam: ["Occupational Medicine", "Preventive Medicine", "Family Medicine", "Internal Medicine"],
  pharmacy: ["Pharmacy", "Community/Retail Pharmacy"],
  vaccinations: ["Public Health & General Preventive Medicine", "Family Medicine", "Pharmacy"],
  fqhc: ["Federally Qualified Health Center"],
};

export interface NpiCustomSearchInput {
  city: string;
  state: string;
  limit?: number;
  organization_name?: string;
  first_name?: string;
  last_name?: string;
  taxonomy_description?: string;
  taxonomy_code?: string;
  enumeration_type?: string;
}

export interface NpiSearchAudit {
  queryCount: number;
  successfulQueries: number;
  rawCount: number;
  normalizedCount: number;
  errors: string[];
}

export interface NpiSearchOutput {
  candidates: ProviderCandidate[];
  audit: NpiSearchAudit;
}

export interface NpiAdapterOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

type NpiAddress = {
  address_purpose?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  telephone_number?: string;
  fax_number?: string;
};

type NpiTaxonomy = {
  code?: string;
  desc?: string;
  primary?: boolean;
};

type NpiRawResult = {
  number?: string | number;
  enumeration_type?: string;
  basic?: {
    organization_name?: string;
    organization_name_2?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    credential?: string;
  };
  addresses?: NpiAddress[];
  taxonomies?: NpiTaxonomy[];
};

type NpiApiPayload = {
  result_count?: number;
  results?: NpiRawResult[];
  Errors?: Array<{ description?: string; field?: string }>;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function clampLimit(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return NPI_PAGE_SIZE;
  return Math.min(Math.max(Math.trunc(parsed), 1), MAX_TOTAL_RESULTS);
}

function bestAddress(addresses: NpiAddress[] = []): NpiAddress {
  return addresses.find((address) => address.address_purpose === "LOCATION") || addresses[0] || {};
}

function bestTaxonomy(taxonomies: NpiTaxonomy[] = [], fallbackTaxonomy = ""): NpiTaxonomy {
  return taxonomies.find((taxonomy) => taxonomy.primary) || taxonomies[0] || { desc: fallbackTaxonomy };
}

function formatAddress(address: NpiAddress): string {
  return [
    address.address_1,
    address.address_2,
    address.city,
    address.state,
    clean(address.postal_code).slice(0, 5),
  ].filter(Boolean).join(", ");
}

export function normalizeNpiResult(raw: NpiRawResult, fallbackTaxonomy = ""): ProviderCandidate | null {
  const basic = raw.basic || {};
  const address = bestAddress(raw.addresses);
  const taxonomy = bestTaxonomy(raw.taxonomies, fallbackTaxonomy);
  const enumerationType = clean(raw.enumeration_type);
  const isOrganization = enumerationType === "NPI-2";
  const individualName = [basic.first_name, basic.middle_name, basic.last_name]
    .map(clean)
    .filter(Boolean)
    .join(" ");
  const credential = clean(basic.credential);
  const name = isOrganization
    ? clean(basic.organization_name || basic.organization_name_2)
    : [individualName, credential].filter(Boolean).join(", ");
  const npi = clean(raw.number);
  const fullAddress = formatAddress(address);
  const city = clean(address.city);
  const state = clean(address.state).toUpperCase();

  if (!name || !fullAddress || !city || !state) return null;

  return {
    id: npi ? `npi-${npi}` : `npi-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${city.toLowerCase()}`,
    name,
    address: fullAddress,
    city,
    state,
    postalCode: clean(address.postal_code),
    phone: clean(address.telephone_number),
    fax: clean(address.fax_number) || undefined,
    website: "",
    npi,
    taxonomy: clean(taxonomy.desc) || fallbackTaxonomy,
    taxonomyCode: clean(taxonomy.code),
    source: "NPI",
    sourceDetail: `NPI ${enumerationType}`.trim(),
    sourceUrl: npi ? `https://npiregistry.cms.hhs.gov/provider-view/${encodeURIComponent(npi)}` : "https://npiregistry.cms.hhs.gov/",
    coordinateStatus: "unverified" as CoordinateStatus,
    confidence: "medium",
    trustTier: "registry" as TrustTier,
    score: isOrganization ? 35 : 30,
    badges: ["NPI Registry"],
    evidence: [{
      serviceDetected: clean(taxonomy.desc) || fallbackTaxonomy || "NPI registration",
      evidenceUrl: npi ? `https://npiregistry.cms.hhs.gov/provider-view/${encodeURIComponent(npi)}` : "https://npiregistry.cms.hhs.gov/",
      evidenceTextSnippet: `${enumerationType || "NPI"} record${taxonomy.desc ? ` · ${taxonomy.desc}` : ""}`,
      confidence: 75,
      source: "NPI Registry",
    }],
    _rawSources: ["NPI"],
  };
}

export function buildNpiQuery(input: NpiCustomSearchInput, options: { taxonomy?: string; skip?: number; pageLimit?: number } = {}): URLSearchParams {
  const params = new URLSearchParams({
    version: "2.1",
    city: clean(input.city),
    state: clean(input.state).toUpperCase(),
    limit: String(Math.min(Math.max(options.pageLimit || NPI_PAGE_SIZE, 1), NPI_PAGE_SIZE)),
  });

  const optionalFields: Array<keyof Omit<NpiCustomSearchInput, "city" | "state" | "limit">> = [
    "organization_name",
    "first_name",
    "last_name",
    "taxonomy_description",
    "taxonomy_code",
    "enumeration_type",
  ];
  for (const field of optionalFields) {
    const value = clean(input[field]);
    if (value) params.set(field, value);
  }
  if (options.taxonomy) params.set("taxonomy_description", options.taxonomy);
  if (options.skip && options.skip > 0) params.set("skip", String(options.skip));
  return params;
}

async function requestNpiPage(
  input: NpiCustomSearchInput,
  options: NpiAdapterOptions & { taxonomy?: string; skip?: number; pageLimit?: number } = {},
): Promise<{ rows: NpiRawResult[]; error?: string }> {
  const fetchImpl = options.fetchImpl || fetch;
  const query = buildNpiQuery(input, options);
  try {
    const response = await fetchImpl(`${NPI_API_URL}?${query.toString()}`, {
      signal: AbortSignal.timeout(options.timeoutMs || DEFAULT_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return { rows: [], error: `NPI Registry HTTP ${response.status}` };
    const payload = await response.json() as NpiApiPayload;
    if (payload.Errors?.length) {
      const message = payload.Errors
        .map((error) => clean(error.description || error.field))
        .filter(Boolean)
        .join("; ");
      return { rows: [], error: message || "NPI Registry rejected the request" };
    }
    return { rows: payload.results || [] };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : String(error) };
  }
}

export function dedupeNpiCandidates(candidates: ProviderCandidate[]): ProviderCandidate[] {
  const byKey = new Map<string, ProviderCandidate>();
  for (const candidate of candidates) {
    const key = candidate.npi
      ? `npi:${candidate.npi}`
      : `${candidate.name}|${candidate.address}`.toLowerCase().replace(/[^a-z0-9|]+/g, " ").trim();
    if (!key) continue;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, candidate);
      continue;
    }
    byKey.set(key, {
      ...existing,
      phone: existing.phone || candidate.phone,
      fax: existing.fax || candidate.fax,
      taxonomy: existing.taxonomy || candidate.taxonomy,
      taxonomyCode: existing.taxonomyCode || candidate.taxonomyCode,
      evidence: [...existing.evidence, ...candidate.evidence].filter((evidence, index, all) =>
        all.findIndex((item) => `${item.source}|${item.serviceDetected}|${item.evidenceUrl}` === `${evidence.source}|${evidence.serviceDetected}|${evidence.evidenceUrl}`) === index,
      ),
      badges: Array.from(new Set([...existing.badges, ...candidate.badges])),
    });
  }
  return Array.from(byKey.values());
}

export async function searchNpiCustom(input: NpiCustomSearchInput, options: NpiAdapterOptions = {}): Promise<NpiSearchOutput> {
  const limit = clampLimit(input.limit);
  const candidates: ProviderCandidate[] = [];
  const errors: string[] = [];
  let rawCount = 0;
  let successfulQueries = 0;
  let queryCount = 0;

  for (let skip = 0; skip < limit; skip += NPI_PAGE_SIZE) {
    const pageLimit = Math.min(NPI_PAGE_SIZE, limit - skip);
    queryCount += 1;
    const page = await requestNpiPage({ ...input, limit }, { ...options, skip, pageLimit });
    if (page.error) {
      errors.push(page.error);
      break;
    }
    successfulQueries += 1;
    rawCount += page.rows.length;
    candidates.push(...page.rows
      .map((row) => normalizeNpiResult(row, clean(input.taxonomy_description)))
      .filter((candidate): candidate is ProviderCandidate => Boolean(candidate)));
    if (page.rows.length < pageLimit) break;
  }

  const deduped = dedupeNpiCandidates(candidates).slice(0, limit);
  return {
    candidates: deduped,
    audit: {
      queryCount,
      successfulQueries,
      rawCount,
      normalizedCount: deduped.length,
      errors: Array.from(new Set(errors)),
    },
  };
}

export async function searchNpiDetailed(
  city: string,
  state: string,
  serviceType: string,
  options: NpiAdapterOptions = {},
): Promise<NpiSearchOutput> {
  const taxonomies = NPI_TAXONOMY_MAP[serviceType] || [serviceType];
  const settled = await Promise.all(taxonomies.map(async (taxonomy) => {
    const page = await requestNpiPage(
      { city, state, taxonomy_description: taxonomy, limit: NPI_PAGE_SIZE },
      { ...options, taxonomy, pageLimit: NPI_PAGE_SIZE },
    );
    return { taxonomy, ...page };
  }));

  const errors: string[] = [];
  const candidates: ProviderCandidate[] = [];
  let rawCount = 0;
  let successfulQueries = 0;
  for (const result of settled) {
    if (result.error) {
      errors.push(`${result.taxonomy}: ${result.error}`);
      continue;
    }
    successfulQueries += 1;
    rawCount += result.rows.length;
    candidates.push(...result.rows
      .map((row) => normalizeNpiResult(row, result.taxonomy))
      .filter((candidate): candidate is ProviderCandidate => Boolean(candidate)));
  }

  const deduped = dedupeNpiCandidates(candidates);
  return {
    candidates: deduped,
    audit: {
      queryCount: taxonomies.length,
      successfulQueries,
      rawCount,
      normalizedCount: deduped.length,
      errors: Array.from(new Set(errors)),
    },
  };
}

export async function searchNpi(city: string, state: string, serviceType: string): Promise<ProviderCandidate[]> {
  return (await searchNpiDetailed(city, state, serviceType)).candidates;
}
