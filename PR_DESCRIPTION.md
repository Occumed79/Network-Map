# PR Description: API Source Registry and Unified Web Evidence Adapter

## Overview
This PR implements an env-driven API source registry for the unified search engine, enabling the backend to track, categorize, and report on all configured API keys. It also updates the web evidence adapter to support multiple search APIs (LangSearch, Serper, Tavily) instead of being LangSearch-only.

## Environment Variables Added
Added the following environment variables to `render.yaml` as backend env vars with `sync: false` for secrets:

### Web Search / Web Evidence
- `LANGSEARCH_API_KEY`
- `SERPER_API_KEY`
- `TAVILY_API_KEY`
- `EXA_API_KEY`

### Web Extraction / Browser Automation
- `FIRECRAWL_API_KEY`
- `BROWSE_AI_API_KEY`
- `OLOSTEP_API_KEY`
- `BROWSERBASE_API_KEY`

### AI Extraction / Summarization / Ranking
- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `OPENROUTER_KEY`
- `CEREBRAS_API_KEY`
- `HUGGINGFACE_API_KEY`
- `MINIMAX_API_KEY`
- `CLOD_API_KEY`

### Geocoding / Map / Distance
- `GEOCODIO_TOKEN`
- `GEOCODIO_SECONDARY_TOKEN`
- `GEOCODIO_TERTIARY_TOKEN`
- `GEOCODIO_QUATERNARY_TOKEN`
- `RAPIDAPI_KEY`
- `RAPIDAPI_ENABLED`
- `RAPIDAPI_GEOCODING_ENABLED`
- `RAPIDAPI_LOCATION_LOOKUP_ENABLED`
- `RAPIDAPI_MAP_DISPLAY_ENABLED`
- `RAPIDAPI_PROVIDER_SEARCH_ENABLED`
- `RAPIDAPI_ROUTING_DISTANCE_ENABLED`

### Vector / Semantic Index
- `PINECONE_API_KEY`

## Implementation Details

### 1. API Source Registry (`api-server/src/lib/apiSourceRegistry.ts`)
Created a comprehensive registry that:
- Categorizes each API source into 5 categories: web_search, web_extraction, ai_extraction, geocoding, vector_index
- Tracks adapter status: active, configured_not_wired, planned
- Defines usage contexts: provider_discovery, price_discovery, geocoding, enrichment, indexing
- Provides safe diagnostic functions that only expose configured/not-configured booleans (never secret values)

### 2. Source Status Endpoint (`GET /api/source-status`)
New diagnostic endpoint that returns:
- **summary**: Overall statistics (total, configured, active, configured_not_wired, planned)
- **sources**: Detailed array with:
  - sourceName: Human-readable name
  - envVar: Environment variable name
  - configured: boolean (true if env var is set and non-empty)
  - category: API category
  - adapterStatus: Current wiring status
  - usedBy: Array of usage contexts

### 3. Updated Unified Search Audit Response
The `/api/provider-sources/search` endpoint now includes in its audit:
- **activeAdapters**: Which adapters ran for this search
- **configuredApiSources**: All API sources with configured keys
- **missingApiSources**: All API sources without configured keys
- **configuredButNotWired**: Sources with keys but not yet wired into adapters

This allows immediate visibility into whether the backend sees environment variables and whether each source is actually wired into the unified search engine.

### 4. Web Evidence Adapter (`api-server/src/providerSources/adapters/webEvidence.ts`)
Created a unified web evidence adapter that:
- Supports multiple search APIs: LangSearch, Serper, Tavily
- Automatically uses the first available configured API
- Tries APIs in order: LangSearch → Serper → Tavily
- Skips APIs that are not configured
- Converts web search results to ProviderCandidate format
- Includes evidence snippets and URLs for each result

The adapter is now integrated into the orchestrator and added to all service routing configurations for provider discovery.

## API Wiring Status

### Actively Wired (in this PR)
- **Web Evidence**: LangSearch, Serper, Tavily (via unified web evidence adapter)
- **Geocoding**: Geocodio (primary, secondary, tertiary, quaternary), RapidAPI (all flags)
- **Existing**: NPI, FMCSA, ClinicImports, RapidAPI provider search

### Registered But Not Yet Wired (follow-up work needed)
- **Web Search**: Exa
- **Web Extraction**: Firecrawl, Browse AI, Olostep, Browserbase
- **AI Extraction**: Gemini, Groq, OpenRouter, Cerebras, HuggingFace, Minimax, Clod
- **Vector Index**: Pinecone

These sources are registered in the API source registry and will be reported in `/api/source-status`, but do not have adapter implementations yet.

## Usage Categories
The system uses categories to determine which APIs to call for different operations:

- **Provider Discovery**: Can use web evidence sources (LangSearch, Serper, Tavily)
- **Price Discovery**: Can use web search + extraction sources (when implemented)
- **Geocoding**: Uses Geocodio/RapidAPI geocoding APIs
- **AI Keys**: Used only for extraction/summarization/ranking (when implemented)
- **Pinecone**: For vector indexing/search, not normal map display

## How to Check `/api/source-status`

### Example Request
```bash
curl https://your-app.onrender.com/api/source-status
```

### Example Response
```json
{
  "summary": {
    "total": 27,
    "configured": 5,
    "notConfigured": 22,
    "active": 13,
    "configuredNotWired": 4,
    "planned": 0,
    "byCategory": {
      "web_search": { "total": 4, "configured": 2 },
      "web_extraction": { "total": 4, "configured": 0 },
      "ai_extraction": { "total": 7, "configured": 0 },
      "geocoding": { "total": 11, "configured": 3 },
      "vector_index": { "total": 1, "configured": 0 }
    }
  },
  "sources": [
    {
      "sourceName": "LangSearch",
      "envVar": "LANGSEARCH_API_KEY",
      "configured": true,
      "category": "web_search",
      "adapterStatus": "active",
      "usedBy": ["provider_discovery", "price_discovery"]
    },
    {
      "sourceName": "Serper",
      "envVar": "SERPER_API_KEY",
      "configured": true,
      "category": "web_search",
      "adapterStatus": "active",
      "usedBy": ["provider_discovery", "price_discovery"]
    },
    {
      "sourceName": "Tavily",
      "envVar": "TAVILY_API_KEY",
      "configured": false,
      "category": "web_search",
      "adapterStatus": "active",
      "usedBy": ["provider_discovery", "price_discovery"]
    },
    {
      "sourceName": "Firecrawl",
      "envVar": "FIRECRAWL_API_KEY",
      "configured": false,
      "category": "web_extraction",
      "adapterStatus": "configured_not_wired",
      "usedBy": ["price_discovery", "enrichment"]
    }
    // ... remaining sources
  ]
}
```

## Follow-up Adapters Still Needed

### High Priority
1. **Web Extraction Adapters** (for price discovery):
   - Firecrawl adapter
   - Browse AI adapter
   - Olostep adapter
   - Browserbase adapter

2. **AI Extraction/Summarization Adapters** (for enrichment):
   - Gemini adapter
   - Groq adapter
   - OpenRouter adapter
   - Cerebras adapter
   - HuggingFace adapter
   - Minimax adapter
   - Clod adapter

### Medium Priority
3. **Exa Web Search Adapter** (alternative web search source)

4. **Pinecone Vector Index Adapter** (for semantic search)

## Security Notes
- All environment variables are marked with `sync: false` in render.yaml to prevent secret synchronization
- The `/api/source-status` endpoint only exposes configured/not-configured booleans
- No secret values are ever exposed in API responses or logs
- API keys are only checked for presence (non-empty), never logged or returned

## Testing
To test the implementation:
1. Set one or more of the web search API keys in your environment
2. Call `GET /api/source-status` to verify the keys are detected
3. Call `POST /api/provider-sources/search` to see the audit include API source status
4. Verify the web evidence adapter uses the first available configured API
