import type { ProviderCandidate, SearchParams, CoordinateStatus, TrustTier } from "../types";
import { searchLangSearchWeb } from "../../lib/langSearchClient";
import { extractEvidenceWithAi, hasConfiguredAiExtractionSource } from "../../lib/aiExtractionClient";

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface WebSearchResponse {
  results?: WebSearchResult[];
  error?: string;
}

type WebEvidenceSource = {
  name: string;
  envVar: string;
  search: (query: string) => Promise<WebSearchResponse>;
};

function isConfigured(envVar: string): boolean {
  return Boolean(process.env[envVar]?.trim());
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeResults(results: unknown, mapper: (item: any) => WebSearchResult): WebSearchResult[] {
  if (!Array.isArray(results)) return [];
  return results
    .map(mapper)
    .filter((result) => result.url && (result.title || result.snippet));
}

/**
 * Search using the shared LangSearch client.
 * Important: do not duplicate LangSearch endpoint logic here. The shared client
 * owns the documented /v1/web-search contract and response normalization.
 */
async function searchLangSearch(query: string): Promise<WebSearchResponse> {
  if (!isConfigured("LANGSEARCH_API_KEY")) {
    return { error: "LANGSEARCH_API_KEY not configured" };
  }

  try {
    const response = await searchLangSearchWeb({
      query,
      freshness: "noLimit",
      summary: true,
      count: Number(process.env.LANGSEARCH_WEB_EVIDENCE_COUNT || 10),
      timeoutMs: Number(process.env.WEB_EVIDENCE_TIMEOUT_MS || 5000),
    });

    return {
      results: response.results.map((r) => ({
        title: normalizeString(r.name || r.displayUrl || r.url),
        url: normalizeString(r.url),
        snippet: normalizeString(r.summary || r.snippet || r.displayUrl || r.url),
      })).filter((result) => result.url),
    };
  } catch (error) {
    return { error: `LangSearch fetch error: ${error}` };
  }
}

/**
 * Search using Serper's Google Search API.
 */
async function searchSerper(query: string): Promise<WebSearchResponse> {
  const apiKey = process.env.SERPER_API_KEY?.trim();
  if (!apiKey) {
    return { error: "SERPER_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({ q: query, num: Number(process.env.SERPER_WEB_EVIDENCE_COUNT || 10) }),
      signal: AbortSignal.timeout(Number(process.env.WEB_EVIDENCE_TIMEOUT_MS || 5000)),
    });

    if (!response.ok) {
      return { error: `Serper API error: ${response.status}` };
    }

    const data = await response.json() as any;
    return {
      results: normalizeResults(data.organic, (r) => ({
        title: normalizeString(r.title),
        url: normalizeString(r.link),
        snippet: normalizeString(r.snippet),
      })),
    };
  } catch (error) {
    return { error: `Serper fetch error: ${error}` };
  }
}

/**
 * Search using Tavily.
 */
async function searchTavily(query: string): Promise<WebSearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    return { error: "TAVILY_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: Number(process.env.TAVILY_WEB_EVIDENCE_COUNT || 10),
        search_depth: "basic",
      }),
      signal: AbortSignal.timeout(Number(process.env.WEB_EVIDENCE_TIMEOUT_MS || 5000)),
    });

    if (!response.ok) {
      return { error: `Tavily API error: ${response.status}` };
    }

    const data = await response.json() as any;
    return {
      results: normalizeResults(data.results, (r) => ({
        title: normalizeString(r.title),
        url: normalizeString(r.url),
        snippet: normalizeString(r.content || r.snippet),
      })),
    };
  } catch (error) {
    return { error: `Tavily fetch error: ${error}` };
  }
}

/**
 * Search using Exa. Exa is a web-search source, so it belongs in web evidence.
 */
async function searchExa(query: string): Promise<WebSearchResponse> {
  const apiKey = process.env.EXA_API_KEY?.trim();
  if (!apiKey) {
    return { error: "EXA_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        query,
        numResults: Number(process.env.EXA_WEB_EVIDENCE_COUNT || 10),
        type: "auto",
      }),
      signal: AbortSignal.timeout(Number(process.env.WEB_EVIDENCE_TIMEOUT_MS || 5000)),
    });

    if (!response.ok) {
      return { error: `Exa API error: ${response.status}` };
    }

    const data = await response.json() as any;
    return {
      results: normalizeResults(data.results, (r) => ({
        title: normalizeString(r.title || r.url),
        url: normalizeString(r.url),
        snippet: normalizeString(r.text || r.summary || r.highlight),
      })),
    };
  } catch (error) {
    return { error: `Exa fetch error: ${error}` };
  }
}

/**
 * Search using Firecrawl. Firecrawl can also be used later for page extraction,
 * but this adapter uses its search surface as a provider-evidence source.
 */
async function searchFirecrawl(query: string): Promise<WebSearchResponse> {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) {
    return { error: "FIRECRAWL_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        limit: Number(process.env.FIRECRAWL_WEB_EVIDENCE_COUNT || 10),
      }),
      signal: AbortSignal.timeout(Number(process.env.WEB_EVIDENCE_TIMEOUT_MS || 5000)),
    });

    if (!response.ok) {
      return { error: `Firecrawl API error: ${response.status}` };
    }

    const data = await response.json() as any;
    const resultArray = Array.isArray(data.data) ? data.data : data.results;
    return {
      results: normalizeResults(resultArray, (r) => ({
        title: normalizeString(r.title || r.metadata?.title || r.url),
        url: normalizeString(r.url || r.link),
        snippet: normalizeString(r.description || r.snippet || r.markdown || r.content),
      })),
    };
  } catch (error) {
    return { error: `Firecrawl fetch error: ${error}` };
  }
}

const WEB_EVIDENCE_SOURCES: WebEvidenceSource[] = [
  { name: "LangSearch", envVar: "LANGSEARCH_API_KEY", search: searchLangSearch },
  { name: "Serper", envVar: "SERPER_API_KEY", search: searchSerper },
  { name: "Tavily", envVar: "TAVILY_API_KEY", search: searchTavily },
  { name: "Exa", envVar: "EXA_API_KEY", search: searchExa },
  { name: "Firecrawl", envVar: "FIRECRAWL_API_KEY", search: searchFirecrawl },
];

export interface WebEvidenceOptions {
  maxSources?: number;
  maxAiEnrichments?: number;
  allowAiEnrichment?: boolean;
}

export function hasConfiguredWebEvidenceSource(): boolean {
  return WEB_EVIDENCE_SOURCES.some((source) => isConfigured(source.envVar));
}

function buildEvidenceQuery(city: string, state: string, serviceType: string): string {
  return [
    serviceType,
    "provider clinic",
    city,
    state,
    "occupational health urgent care medical services",
  ].filter(Boolean).join(" ");
}

function makeCandidate(sourceName: string, result: WebSearchResult, city: string, state: string, serviceType: string, idx: number): ProviderCandidate {
  return {
    id: `webevidence-${sourceName.toLowerCase()}-${stableId(result.url || `${serviceType}-${idx}`)}`,
    name: extractProviderName(result.title, result.snippet),
    address: "",
    city,
    state,
    postalCode: "",
    phone: "",
    website: result.url,
    coordinateStatus: "unverified" as CoordinateStatus,
    source: sourceName,
    sourceDetail: `Web Evidence (${sourceName})`,
    sourceUrl: result.url,
    confidence: "low" as const,
    trustTier: "lead" as TrustTier,
    score: 20,
    badges: ["Web Evidence"],
    evidence: [{
      serviceDetected: serviceType,
      evidenceUrl: result.url,
      evidenceTextSnippet: result.snippet.slice(0, 1200),
      confidence: 50,
      source: sourceName,
    }],
    _rawSources: [sourceName.toLowerCase()],
  };
}

async function enrichCandidatesWithAi(candidates: ProviderCandidate[], serviceType: string, overrideLimit?: number): Promise<ProviderCandidate[]> {
  if (process.env.WEB_EVIDENCE_AI_EXTRACTION === "false" || !hasConfiguredAiExtractionSource()) return candidates;

  const limit = overrideLimit !== undefined
    ? Math.min(Math.max(overrideLimit, 0), 10)
    : Math.min(Math.max(Number(process.env.WEB_EVIDENCE_AI_EXTRACTION_LIMIT || 3), 0), 10);
  if (limit === 0) return candidates;

  const enriched: ProviderCandidate[] = [];
  for (const [index, candidate] of candidates.entries()) {
    if (index >= limit) {
      enriched.push(candidate);
      continue;
    }

    const text = [candidate.name, candidate.sourceUrl, candidate.evidence?.[0]?.evidenceTextSnippet]
      .filter(Boolean)
      .join("\n");

    try {
      const extraction = await extractEvidenceWithAi({
        task: "provider_evidence",
        title: candidate.name,
        url: candidate.sourceUrl,
        text,
        serviceType,
      });

      if (!extraction) {
        enriched.push(candidate);
        continue;
      }

      const evidenceSnippet = [
        candidate.evidence?.[0]?.evidenceTextSnippet,
        extraction.summary ? `AI summary: ${extraction.summary}` : "",
        extraction.services?.length ? `AI services: ${extraction.services.join(", ")}` : "",
      ].filter(Boolean).join("\n").slice(0, 1800);

      enriched.push({
        ...candidate,
        name: extraction.providerName || candidate.name,
        address: extraction.address || candidate.address,
        phone: extraction.phone || candidate.phone,
        website: extraction.website || candidate.website,
        score: Math.max(candidate.score || 0, extraction.confidence ? Math.round(extraction.confidence / 2) : candidate.score || 20),
        badges: [...new Set([...(candidate.badges || []), `AI:${extraction.source}`])],
        evidence: [{
          serviceDetected: serviceType,
          evidenceUrl: candidate.sourceUrl || "",
          evidenceTextSnippet: evidenceSnippet,
          confidence: Math.max(candidate.evidence?.[0]?.confidence || 50, extraction.confidence || 50),
          source: `${candidate.source}+${extraction.source}`,
        }],
        _rawSources: [...new Set([...(candidate._rawSources || []), extraction.source.toLowerCase()])],
      });
    } catch (error) {
      console.warn(`[WebEvidence AI] ${String(error)}`);
      enriched.push(candidate);
    }
  }

  return enriched;
}

/**
 * Unified web evidence adapter that tries multiple configured search APIs.
 * Returns low-trust provider candidates extracted from web search results.
 */
export async function searchWebEvidence(
  city: string,
  state: string,
  serviceType: string,
  _params: SearchParams,
  options?: WebEvidenceOptions,
): Promise<ProviderCandidate[]> {
  const query = buildEvidenceQuery(city, state, serviceType);
  const allCandidates: ProviderCandidate[] = [];
  const configuredSources = WEB_EVIDENCE_SOURCES.filter((source) => isConfigured(source.envVar));

  const maxSources = options?.maxSources ?? configuredSources.length;
  const sourcesToRun = configuredSources.slice(0, maxSources);

  for (const source of sourcesToRun) {
    const result = await source.search(query);

    if (result.error) {
      console.warn(`[WebEvidence ${source.name}] ${result.error}`);
      continue;
    }

    const candidates = (result.results || []).map((r, idx) => makeCandidate(source.name, r, city, state, serviceType, idx));

    allCandidates.push(...candidates);
  }

  const deduped = dedupeWebCandidates(allCandidates);

  const allowAi = options?.allowAiEnrichment !== false;
  if (!allowAi) return deduped;

  const aiLimit = options?.maxAiEnrichments;
  if (aiLimit !== undefined) {
    return enrichCandidatesWithAi(deduped, serviceType, aiLimit);
  }

  return enrichCandidatesWithAi(deduped, serviceType);
}

function stableId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return String(Math.abs(hash));
}

function dedupeWebCandidates(candidates: ProviderCandidate[]): ProviderCandidate[] {
  const seen = new Set<string>();
  const deduped: ProviderCandidate[] = [];
  for (const candidate of candidates) {
    const key = `${candidate.website || candidate.sourceUrl || candidate.name}`.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(candidate);
  }
  return deduped;
}

/**
 * Extract provider name from web search title/snippet.
 * This intentionally remains conservative because web evidence is low-trust.
 */
function extractProviderName(title: string, snippet: string): string {
  const cleanTitle = normalizeString(title)
    .replace(/\s*[|\-–—:]\s*(pricing|prices|cost|fee schedule|self pay|urgent care|occupational medicine|services).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleanTitle.length > 3) return cleanTitle.slice(0, 160);

  const words = normalizeString(snippet).split(/\s+/).slice(0, 6).join(" ");
  if (words.length > 3) return words.slice(0, 160);

  return "Unknown web evidence lead";
}
