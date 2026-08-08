import type { CoordinateStatus, ProviderCandidate, TrustTier } from "../types";
import { dedupeCandidates } from "../dedupe";
import { getNpiTaxonomies } from "../serviceRouting";
import { fetchExternalJson } from "../externalSourceRuntime";

const NPI_API_URL = "https://npiregistry.cms.hhs.gov/api/";
const NPI_PAGE_SIZE = 200;
const MAX_TOTAL_RESULTS = 500;

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

export interface NpiSearchOutput { candidates: ProviderCandidate[]; audit: NpiSearchAudit; }
export interface NpiAdapterOptions { fetchImpl?: typeof fetch; timeoutMs?: number; signal?: AbortSignal; }

type NpiAddress = { address_purpose?: string; address_1?: string; address_2?: string; city?: string; state?: string; postal_code?: string; telephone_number?: string; fax_number?: string; };
type NpiTaxonomy = { code?: string; desc?: string; primary?: boolean };
type NpiRawResult = {
  number?: string | number;
  enumeration_type?: string;
  basic?: { organization_name?: string; organization_name_2?: string; first_name?: string; middle_name?: string; last_name?: string; credential?: string };
  addresses?: NpiAddress[];
  taxonomies?: NpiTaxonomy[];
};
type NpiApiPayload = { result_count?: number; results?: NpiRawResult[]; Errors?: Array<{ description?: string; field?: string }> };

function clean(value: unknown): string { return String(value ?? "").trim(); }
function clampLimit(value: unknown): number { const parsed = Number(value); if (!Number.isFinite(parsed)) return NPI_PAGE_SIZE; return Math.min(Math.max(Math.trunc(parsed), 1), MAX_TOTAL_RESULTS); }
function bestAddress(addresses: NpiAddress[] = []): NpiAddress { return addresses.find((address) => address.address_purpose === "LOCATION") || addresses[0] || {}; }
function bestTaxonomy(taxonomies: NpiTaxonomy[] = [], fallbackTaxonomy = ""): NpiTaxonomy { return taxonomies.find((taxonomy) => taxonomy.primary) || taxonomies[0] || { desc: fallbackTaxonomy }; }
function formatAddress(address: NpiAddress): string { return [address.address_1, address.address_2, address.city, address.state, clean(address.postal_code).slice(0, 5)].filter(Boolean).join(", "); }

export function normalizeNpiResult(raw: NpiRawResult, fallbackTaxonomy = ""): ProviderCandidate | null {
  const basic = raw.basic || {};
  const address = bestAddress(raw.addresses);
  const taxonomy = bestTaxonomy(raw.taxonomies, fallbackTaxonomy);
  const enumerationType = clean(raw.enumeration_type);
  const isOrganization = enumerationType === "NPI-2";
  const individualName = [basic.first_name, basic.middle_name, basic.last_name].map(clean).filter(Boolean).join(" ");
  const credential = clean(basic.credential);
  const name = isOrganization ? clean(basic.organization_name || basic.organization_name_2) : [individualName, credential].filter(Boolean).join(", ");
  const npi = clean(raw.number);
  const fullAddress = formatAddress(address);
  const city = clean(address.city);
  const state = clean(address.state).toUpperCase();
  const taxonomyDescription = clean(taxonomy.desc) || fallbackTaxonomy;
  if (!name || !fullAddress || !city || !state) return null;

  const sourceUrl = npi ? `https://npiregistry.cms.hhs.gov/provider-view/${encodeURIComponent(npi)}` : "https://npiregistry.cms.hhs.gov/";
  const observedAt = new Date().toISOString();
  return {
    id: npi ? `npi-${npi}` : `npi-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${city.toLowerCase()}`,
    name,
    address: fullAddress,
    city,
    state,
    postalCode: clean(address.postal_code),
    country: "US",
    phone: clean(address.telephone_number),
    fax: clean(address.fax_number) || undefined,
    website: "",
    npi,
    providerCategory: taxonomyDescription,
    services: taxonomyDescription ? [taxonomyDescription] : [],
    taxonomy: taxonomyDescription,
    taxonomyCode: clean(taxonomy.code),
    source: "NPI",
    sourceDetail: `NPI ${enumerationType}`.trim(),
    sourceUrl,
    coordinateStatus: "unverified" as CoordinateStatus,
    confidence: "medium",
    trustTier: "registry" as TrustTier,
    score: isOrganization ? 35 : 30,
    badges: ["NPI Registry"],
    evidence: [{ serviceDetected: taxonomyDescription || "NPI registration", evidenceUrl: sourceUrl, evidenceTextSnippet: `${enumerationType || "NPI"} record${taxonomyDescription ? ` · ${taxonomyDescription}` : ""}`, confidence: 75, source: "NPI Registry" }],
    provenance: [{ source: "NPI Registry", sourceRecordId: npi || undefined, sourceUrl, observedAt }],
    lastSeenAt: observedAt,
    matchReason: taxonomyDescription ? `NPI taxonomy: ${taxonomyDescription}` : "NPI registry match",
    _rawSources: ["NPI"],
  };
}

export function buildNpiQuery(input: NpiCustomSearchInput, options: { taxonomy?: string; skip?: number; pageLimit?: number } = {}): URLSearchParams {
  const params = new URLSearchParams({ version: "2.1", city: clean(input.city), state: clean(input.state).toUpperCase(), limit: String(Math.min(Math.max(options.pageLimit || NPI_PAGE_SIZE, 1), NPI_PAGE_SIZE)) });
  const optionalFields: Array<keyof Omit<NpiCustomSearchInput, "city" | "state" | "limit">> = ["organization_name", "first_name", "last_name", "taxonomy_description", "taxonomy_code", "enumeration_type"];
  for (const field of optionalFields) { const value = clean(input[field]); if (value) params.set(field, value); }
  if (options.taxonomy) params.set("taxonomy_description", options.taxonomy);
  if (options.skip && options.skip > 0) params.set("skip", String(options.skip));
  return params;
}

function isNpiPayload(value: unknown): value is NpiApiPayload {
  return Boolean(value && typeof value === "object" && (!(value as NpiApiPayload).results || Array.isArray((value as NpiApiPayload).results)));
}

async function requestNpiPage(input: NpiCustomSearchInput, options: NpiAdapterOptions & { taxonomy?: string; skip?: number; pageLimit?: number } = {}): Promise<{ rows: NpiRawResult[]; error?: string }> {
  const query = buildNpiQuery(input, options);
  const url = `${NPI_API_URL}?${query.toString()}`;
  try {
    let payload: NpiApiPayload;
    if (options.fetchImpl) {
      const response = await options.fetchImpl(url, { signal: AbortSignal.timeout(options.timeoutMs || 10_000), headers: { Accept: "application/json" } });
      if (!response.ok) return { rows: [], error: `NPI Registry HTTP ${response.status}` };
      payload = await response.json() as NpiApiPayload;
    } else {
      payload = await fetchExternalJson<NpiApiPayload>("npi", url, { headers: { Accept: "application/json" } }, { signal: options.signal, cache: true, validate: isNpiPayload });
    }
    if (payload.Errors?.length) {
      const message = payload.Errors.map((error) => clean(error.description || error.field)).filter(Boolean).join("; ");
      return { rows: [], error: message || "NPI Registry rejected the request" };
    }
    return { rows: payload.results || [] };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : String(error) };
  }
}

export function dedupeNpiCandidates(candidates: ProviderCandidate[]): ProviderCandidate[] { return dedupeCandidates(candidates); }

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
    if (page.error) { errors.push(page.error); break; }
    successfulQueries += 1;
    rawCount += page.rows.length;
    candidates.push(...page.rows.map((row) => normalizeNpiResult(row, clean(input.taxonomy_description))).filter((candidate): candidate is ProviderCandidate => Boolean(candidate)));
    if (page.rows.length < pageLimit) break;
  }
  const deduped = dedupeCandidates(candidates).slice(0, limit);
  return { candidates: deduped, audit: { queryCount, successfulQueries, rawCount, normalizedCount: deduped.length, errors: Array.from(new Set(errors)) } };
}

export async function searchNpiDetailed(city: string, state: string, serviceType: string, options: NpiAdapterOptions = {}): Promise<NpiSearchOutput> {
  const taxonomies = getNpiTaxonomies(serviceType);
  const settled = await Promise.all(taxonomies.map(async (taxonomy) => ({ taxonomy, ...(await requestNpiPage({ city, state, taxonomy_description: taxonomy, limit: NPI_PAGE_SIZE }, { ...options, taxonomy, pageLimit: NPI_PAGE_SIZE })) })));
  const errors: string[] = [];
  const candidates: ProviderCandidate[] = [];
  let rawCount = 0;
  let successfulQueries = 0;
  for (const result of settled) {
    if (result.error) { errors.push(`${result.taxonomy}: ${result.error}`); continue; }
    successfulQueries += 1;
    rawCount += result.rows.length;
    candidates.push(...result.rows.map((row) => normalizeNpiResult(row, result.taxonomy)).filter((candidate): candidate is ProviderCandidate => Boolean(candidate)));
  }
  const deduped = dedupeCandidates(candidates);
  return { candidates: deduped, audit: { queryCount: taxonomies.length, successfulQueries, rawCount, normalizedCount: deduped.length, errors: Array.from(new Set(errors)) } };
}

export async function searchNpi(city: string, state: string, serviceType: string, options: NpiAdapterOptions = {}): Promise<ProviderCandidate[]> {
  return (await searchNpiDetailed(city, state, serviceType, options)).candidates;
}
