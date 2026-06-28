export type ApiSourceCategory = 
  | "web_search"
  | "web_extraction"
  | "ai_extraction"
  | "geocoding"
  | "vector_index";

export type AdapterStatus = "active" | "configured_not_wired" | "planned";

export type UsedBy = "provider_discovery" | "price_discovery" | "geocoding" | "enrichment" | "indexing";

export interface ApiSourceConfig {
  name: string;
  envVar: string;
  category: ApiSourceCategory;
  adapterStatus: AdapterStatus;
  usedBy: UsedBy[];
}

export interface SourceStatusReport {
  sourceName: string;
  envVar: string;
  configured: boolean;
  category: ApiSourceCategory;
  adapterStatus: AdapterStatus;
  usedBy: UsedBy[];
}

// Registry of all API sources with their categorization and wiring status
const API_SOURCE_REGISTRY: ApiSourceConfig[] = [
  // Web search / web evidence
  {
    name: "LangSearch",
    envVar: "LANGSEARCH_API_KEY",
    category: "web_search",
    adapterStatus: "active",
    usedBy: ["provider_discovery", "price_discovery"],
  },
  {
    name: "Serper",
    envVar: "SERPER_API_KEY",
    category: "web_search",
    adapterStatus: "active",
    usedBy: ["provider_discovery", "price_discovery"],
  },
  {
    name: "Tavily",
    envVar: "TAVILY_API_KEY",
    category: "web_search",
    adapterStatus: "active",
    usedBy: ["provider_discovery", "price_discovery"],
  },
  {
    name: "Exa",
    envVar: "EXA_API_KEY",
    category: "web_search",
    adapterStatus: "configured_not_wired",
    usedBy: ["provider_discovery", "price_discovery"],
  },

  // Web extraction / browser automation
  {
    name: "Firecrawl",
    envVar: "FIRECRAWL_API_KEY",
    category: "web_extraction",
    adapterStatus: "configured_not_wired",
    usedBy: ["price_discovery", "enrichment"],
  },
  {
    name: "Browse AI",
    envVar: "BROWSE_AI_API_KEY",
    category: "web_extraction",
    adapterStatus: "configured_not_wired",
    usedBy: ["price_discovery", "enrichment"],
  },
  {
    name: "Olostep",
    envVar: "OLOSTEP_API_KEY",
    category: "web_extraction",
    adapterStatus: "configured_not_wired",
    usedBy: ["price_discovery", "enrichment"],
  },
  {
    name: "Browserbase",
    envVar: "BROWSERBASE_API_KEY",
    category: "web_extraction",
    adapterStatus: "configured_not_wired",
    usedBy: ["price_discovery", "enrichment"],
  },

  // AI extraction / summarization / ranking
  {
    name: "Gemini",
    envVar: "GEMINI_API_KEY",
    category: "ai_extraction",
    adapterStatus: "configured_not_wired",
    usedBy: ["enrichment"],
  },
  {
    name: "Groq",
    envVar: "GROQ_API_KEY",
    category: "ai_extraction",
    adapterStatus: "configured_not_wired",
    usedBy: ["enrichment"],
  },
  {
    name: "OpenRouter",
    envVar: "OPENROUTER_KEY",
    category: "ai_extraction",
    adapterStatus: "configured_not_wired",
    usedBy: ["enrichment"],
  },
  {
    name: "Cerebras",
    envVar: "CEREBRAS_API_KEY",
    category: "ai_extraction",
    adapterStatus: "configured_not_wired",
    usedBy: ["enrichment"],
  },
  {
    name: "HuggingFace",
    envVar: "HUGGINGFACE_API_KEY",
    category: "ai_extraction",
    adapterStatus: "configured_not_wired",
    usedBy: ["enrichment"],
  },
  {
    name: "Minimax",
    envVar: "MINIMAX_API_KEY",
    category: "ai_extraction",
    adapterStatus: "configured_not_wired",
    usedBy: ["enrichment"],
  },
  {
    name: "Clod",
    envVar: "CLOD_API_KEY",
    category: "ai_extraction",
    adapterStatus: "configured_not_wired",
    usedBy: ["enrichment"],
  },

  // Geocoding / map / distance
  {
    name: "Geocodio Primary",
    envVar: "GEOCODIO_TOKEN",
    category: "geocoding",
    adapterStatus: "active",
    usedBy: ["geocoding"],
  },
  {
    name: "Geocodio Secondary",
    envVar: "GEOCODIO_SECONDARY_TOKEN",
    category: "geocoding",
    adapterStatus: "active",
    usedBy: ["geocoding"],
  },
  {
    name: "Geocodio Tertiary",
    envVar: "GEOCODIO_TERTIARY_TOKEN",
    category: "geocoding",
    adapterStatus: "active",
    usedBy: ["geocoding"],
  },
  {
    name: "Geocodio Quaternary",
    envVar: "GEOCODIO_QUATERNARY_TOKEN",
    category: "geocoding",
    adapterStatus: "active",
    usedBy: ["geocoding"],
  },
  {
    name: "RapidAPI Key",
    envVar: "RAPIDAPI_KEY",
    category: "geocoding",
    adapterStatus: "active",
    usedBy: ["geocoding", "provider_discovery"],
  },
  {
    name: "RapidAPI Enabled",
    envVar: "RAPIDAPI_ENABLED",
    category: "geocoding",
    adapterStatus: "active",
    usedBy: ["geocoding", "provider_discovery"],
  },
  {
    name: "RapidAPI Geocoding",
    envVar: "RAPIDAPI_GEOCODING_ENABLED",
    category: "geocoding",
    adapterStatus: "active",
    usedBy: ["geocoding"],
  },
  {
    name: "RapidAPI Location Lookup",
    envVar: "RAPIDAPI_LOCATION_LOOKUP_ENABLED",
    category: "geocoding",
    adapterStatus: "active",
    usedBy: ["geocoding"],
  },
  {
    name: "RapidAPI Map Display",
    envVar: "RAPIDAPI_MAP_DISPLAY_ENABLED",
    category: "geocoding",
    adapterStatus: "active",
    usedBy: ["geocoding"],
  },
  {
    name: "RapidAPI Provider Search",
    envVar: "RAPIDAPI_PROVIDER_SEARCH_ENABLED",
    category: "geocoding",
    adapterStatus: "active",
    usedBy: ["provider_discovery"],
  },
  {
    name: "RapidAPI Routing Distance",
    envVar: "RAPIDAPI_ROUTING_DISTANCE_ENABLED",
    category: "geocoding",
    adapterStatus: "active",
    usedBy: ["geocoding"],
  },

  // Vector / semantic index
  {
    name: "Pinecone",
    envVar: "PINECONE_API_KEY",
    category: "vector_index",
    adapterStatus: "configured_not_wired",
    usedBy: ["indexing"],
  },
];

/**
 * Check if an environment variable is configured (non-empty)
 */
function isEnvConfigured(envVar: string): boolean {
  const value = process.env[envVar];
  return value !== undefined && value !== null && value.trim() !== "";
}

/**
 * Get the full source status report
 * Returns safe diagnostic information without exposing secret values
 */
export function getSourceStatusReport(): SourceStatusReport[] {
  return API_SOURCE_REGISTRY.map((config) => ({
    sourceName: config.name,
    envVar: config.envVar,
    configured: isEnvConfigured(config.envVar),
    category: config.category,
    adapterStatus: config.adapterStatus,
    usedBy: config.usedBy,
  }));
}

/**
 * Get sources by category
 */
export function getSourcesByCategory(category: ApiSourceCategory): SourceStatusReport[] {
  return getSourceStatusReport().filter((s) => s.category === category);
}

/**
 * Get configured sources by category
 */
export function getConfiguredSourcesByCategory(category: ApiSourceCategory): SourceStatusReport[] {
  return getSourcesByCategory(category).filter((s) => s.configured);
}

/**
 * Get sources by usage context
 */
export function getSourcesByUsage(usage: UsedBy): SourceStatusReport[] {
  return getSourceStatusReport().filter((s) => s.usedBy.includes(usage));
}

/**
 * Get configured sources by usage context
 */
export function getConfiguredSourcesByUsage(usage: UsedBy): SourceStatusReport[] {
  return getSourcesByUsage(usage).filter((s) => s.configured);
}

/**
 * Get summary statistics
 */
export function getSourceSummary() {
  const report = getSourceStatusReport();
  const total = report.length;
  const configured = report.filter((s) => s.configured).length;
  const active = report.filter((s) => s.adapterStatus === "active").length;
  const configuredNotWired = report.filter((s) => s.configured && s.adapterStatus === "configured_not_wired").length;
  const planned = report.filter((s) => s.adapterStatus === "planned").length;

  return {
    total,
    configured,
    notConfigured: total - configured,
    active,
    configuredNotWired,
    planned,
    byCategory: {
      web_search: {
        total: report.filter((s) => s.category === "web_search").length,
        configured: report.filter((s) => s.category === "web_search" && s.configured).length,
      },
      web_extraction: {
        total: report.filter((s) => s.category === "web_extraction").length,
        configured: report.filter((s) => s.category === "web_extraction" && s.configured).length,
      },
      ai_extraction: {
        total: report.filter((s) => s.category === "ai_extraction").length,
        configured: report.filter((s) => s.category === "ai_extraction" && s.configured).length,
      },
      geocoding: {
        total: report.filter((s) => s.category === "geocoding").length,
        configured: report.filter((s) => s.category === "geocoding" && s.configured).length,
      },
      vector_index: {
        total: report.filter((s) => s.category === "vector_index").length,
        configured: report.filter((s) => s.category === "vector_index" && s.configured).length,
      },
    },
  };
}
