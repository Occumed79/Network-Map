import type { SearchMode, SearchCoordinatorAudit } from "./searchCoordinator";

export type CoordinateStatus = "imported" | "geocoded" | "unverified";
export type TrustTier = "verified" | "registry" | "directory" | "lead";

export interface ProviderProvenance {
  source: string;
  sourceRecordId?: string;
  sourceUrl?: string;
  observedAt?: string;
}

export interface ProviderCandidate {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  phone: string;
  fax?: string;
  website: string;
  lat?: number;
  lng?: number;
  coordinateStatus: CoordinateStatus;
  providerCategory?: string;
  services?: string[];
  taxonomy?: string;
  taxonomyCode?: string;
  npi?: string;
  source: string;
  sourceDetail?: string;
  sourceUrl?: string;
  confidence: "high" | "medium" | "low";
  trustTier: TrustTier;
  score: number;
  badges: string[];
  evidence: ProviderEvidence[];
  provenance?: ProviderProvenance[];
  lastSeenAt?: string;
  matchReason?: string;
  internalStatus?: string;
  distanceMiles?: number;
  _rawSources?: string[];
}

export interface ProviderEvidence {
  serviceDetected: string;
  evidenceUrl: string;
  evidenceTextSnippet: string;
  confidence: number;
  source: string;
}

export interface SearchParams {
  city: string;
  state: string;
  zip?: string;
  radiusMiles: number;
  serviceType: string;
  centerLat: number;
  centerLng: number;
  mode?: SearchMode;
  sourceIds?: string[];
}

export interface SourceResult {
  sourceId: string;
  sourceLabel: string;
  ok: boolean;
  count: number;
  error?: string;
  durationMs?: number;
  timedOut?: boolean;
}

export interface SearchAudit {
  serviceType: string;
  activeAdapters: string[];
  urlsRequested: string[];
  rawResultCounts: Record<string, number>;
  normalizedCount: number;
  dedupedCount: number;
  geocodedCount: number;
  finalMarkerCount: number;
  errorsBySource: Record<string, string>;
  durationMs: number;
  configuredApiSources: string[];
  missingApiSources: string[];
  configuredButNotWired: string[];
  searchCoordinator?: SearchCoordinatorAudit;
}

export interface UnifiedSearchResponse {
  params: SearchParams;
  results: ProviderCandidate[];
  sourceResults: SourceResult[];
  audit: SearchAudit;
  incomplete?: boolean;
  degradedSources?: string[];
}
