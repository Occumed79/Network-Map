import type { ProviderCandidate, SearchParams, CoordinateStatus, TrustTier } from "../types";

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface WebSearchResponse {
  results?: WebSearchResult[];
  error?: string;
}

/**
 * Search using LangSearch API
 */
async function searchLangSearch(query: string): Promise<WebSearchResponse> {
  const apiKey = process.env.LANGSEARCH_API_KEY;
  if (!apiKey) {
    return { error: "LANGSEARCH_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.langsearch.com/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query, limit: 10 }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { error: `LangSearch API error: ${response.status}` };
    }

    const data = await response.json() as any;
    return {
      results: data.results?.map((r: any) => ({
        title: r.title || "",
        url: r.url || "",
        snippet: r.snippet || r.content || "",
      })) || [],
    };
  } catch (error) {
    return { error: `LangSearch fetch error: ${error}` };
  }
}

/**
 * Search using Serper API
 */
async function searchSerper(query: string): Promise<WebSearchResponse> {
  const apiKey = process.env.SERPER_API_KEY;
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
      body: JSON.stringify({ q: query, num: 10 }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { error: `Serper API error: ${response.status}` };
    }

    const data = await response.json() as any;
    return {
      results: data.organic?.map((r: any) => ({
        title: r.title || "",
        url: r.link || "",
        snippet: r.snippet || "",
      })) || [],
    };
  } catch (error) {
    return { error: `Serper fetch error: ${error}` };
  }
}

/**
 * Search using Tavily API
 */
async function searchTavily(query: string): Promise<WebSearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
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
        max_results: 10,
        search_depth: "basic",
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { error: `Tavily API error: ${response.status}` };
    }

    const data = await response.json() as any;
    return {
      results: data.results?.map((r: any) => ({
        title: r.title || "",
        url: r.url || "",
        snippet: r.content || "",
      })) || [],
    };
  } catch (error) {
    return { error: `Tavily fetch error: ${error}` };
  }
}

/**
 * Unified web evidence adapter that tries multiple search APIs
 * Returns provider candidates extracted from web search results
 */
export async function searchWebEvidence(city: string, state: string, serviceType: string, params: SearchParams): Promise<ProviderCandidate[]> {
  const query = `${serviceType} providers in ${city}, ${state}`;
  const allCandidates: ProviderCandidate[] = [];

  // Try each configured search API in order
  const searchFunctions = [
    { name: "LangSearch", fn: searchLangSearch, envVar: "LANGSEARCH_API_KEY" },
    { name: "Serper", fn: searchSerper, envVar: "SERPER_API_KEY" },
    { name: "Tavily", fn: searchTavily, envVar: "TAVILY_API_KEY" },
  ];

  for (const { name, fn, envVar } of searchFunctions) {
    if (!process.env[envVar]) {
      continue; // Skip if not configured
    }

    const result = await fn(query);
    
    if (result.error) {
      console.error(`[WebEvidence ${name}] Error:`, result.error);
      continue;
    }

    if (result.results && result.results.length > 0) {
      // Convert web search results to provider candidates
      const candidates = result.results.map((r, idx) => ({
        id: `webevidence-${name.toLowerCase()}-${Date.now()}-${idx}`,
        name: extractProviderName(r.title, r.snippet),
        address: "",
        city: city,
        state: state,
        postalCode: "",
        phone: "",
        website: r.url,
        coordinateStatus: "unverified" as CoordinateStatus,
        source: name,
        sourceDetail: `Web Evidence (${name})`,
        sourceUrl: r.url,
        confidence: "low" as const,
        trustTier: "lead" as TrustTier,
        score: 20,
        badges: ["Web Evidence"],
        evidence: [{
          serviceDetected: serviceType,
          evidenceUrl: r.url,
          evidenceTextSnippet: r.snippet,
          confidence: 50,
          source: name,
        }],
        _rawSources: [name.toLowerCase()],
      }));

      allCandidates.push(...candidates);
      console.log(`[WebEvidence ${name}] Found ${candidates.length} candidates`);
      break; // Use first successful source
    }
  }

  return allCandidates;
}

/**
 * Extract provider name from web search title/snippet
 * This is a simple heuristic - in production, you'd use more sophisticated NLP
 */
function extractProviderName(title: string, snippet: string): string {
  // Try to extract from title first
  const titleMatch = title.match(/^([A-Z][^,-]+)/);
  if (titleMatch && titleMatch[1].length > 3) {
    return titleMatch[1].trim();
  }

  // Fallback to first few words of title
  const words = title.split(/\s+/).slice(0, 3).join(" ");
  if (words.length > 3) {
    return words;
  }

  return title || "Unknown Provider";
}
