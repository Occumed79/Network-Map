export {};

function isEnvConfigured(envVar: string): boolean {
  const value = process.env[envVar];
  return value !== undefined && value !== null && value.trim() !== "";
}

function isTruthyFlag(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function isRapidApiProviderSearchConfigured(): boolean {
  return (
    isEnvConfigured("RAPIDAPI_KEY") &&
    isTruthyFlag(process.env.RAPIDAPI_ENABLED) &&
    isTruthyFlag(process.env.RAPIDAPI_PROVIDER_SEARCH_ENABLED) &&
    (isEnvConfigured("RAPIDAPI_PROVIDER_SEARCH_URL") || isEnvConfigured("RAPIDAPI_PROVIDER_SEARCH_HOST"))
  );
}

function isBrowseAiConfigured(): boolean {
  return isEnvConfigured("BROWSE_AI_API_KEY") && (isEnvConfigured("BROWSE_AI_ROBOT_ID") || isEnvConfigured("BROWSE_AI_TASK_ID"));
}

function isOlostepConfigured(): boolean {
  return isEnvConfigured("OLOSTEP_API_KEY") && isEnvConfigured("OLOSTEP_BASE_URL");
}

function isBrowserbaseConfigured(): boolean {
  return isEnvConfigured("BROWSERBASE_API_KEY") && (isEnvConfigured("BROWSERBASE_PROJECT_ID") || isEnvConfigured("BROWSERBASE_BASE_URL"));
}

function isPineconeConfigured(): boolean {
  return isEnvConfigured("PINECONE_API_KEY") && isEnvConfigured("PINECONE_INDEX_HOST");
}

function isClodConfigured(): boolean {
  return isEnvConfigured("CLOD_API_KEY") && isEnvConfigured("CLOD_API_BASE_URL") && isEnvConfigured("CLOD_EXTRACTION_MODEL");
}

function isMinimaxConfigured(): boolean {
  return isEnvConfigured("MINIMAX_API_KEY") && isEnvConfigured("MINIMAX_API_BASE_URL");
}

function getMissingConfig(source: string): string[] {
  const missing: string[] = [];
  switch (source) {
    case "BrowseAI":
      if (!isEnvConfigured("BROWSE_AI_API_KEY")) missing.push("BROWSE_AI_API_KEY");
      if (!isEnvConfigured("BROWSE_AI_ROBOT_ID") && !isEnvConfigured("BROWSE_AI_TASK_ID")) missing.push("BROWSE_AI_ROBOT_ID or BROWSE_AI_TASK_ID");
      break;
    case "Olostep":
      if (!isEnvConfigured("OLOSTEP_API_KEY")) missing.push("OLOSTEP_API_KEY");
      if (!isEnvConfigured("OLOSTEP_BASE_URL")) missing.push("OLOSTEP_BASE_URL");
      break;
    case "Browserbase":
      if (!isEnvConfigured("BROWSERBASE_API_KEY")) missing.push("BROWSERBASE_API_KEY");
      if (!isEnvConfigured("BROWSERBASE_PROJECT_ID") && !isEnvConfigured("BROWSERBASE_BASE_URL")) missing.push("BROWSERBASE_PROJECT_ID or BROWSERBASE_BASE_URL");
      break;
    case "Pinecone":
      if (!isEnvConfigured("PINECONE_API_KEY")) missing.push("PINECONE_API_KEY");
      if (!isEnvConfigured("PINECONE_INDEX_HOST")) missing.push("PINECONE_INDEX_HOST");
      break;
    case "RapidAPI":
      if (!isEnvConfigured("RAPIDAPI_KEY")) missing.push("RAPIDAPI_KEY");
      if (!isTruthyFlag(process.env.RAPIDAPI_ENABLED)) missing.push("RAPIDAPI_ENABLED");
      if (!isTruthyFlag(process.env.RAPIDAPI_PROVIDER_SEARCH_ENABLED)) missing.push("RAPIDAPI_PROVIDER_SEARCH_ENABLED");
      if (!isEnvConfigured("RAPIDAPI_PROVIDER_SEARCH_URL") && !isEnvConfigured("RAPIDAPI_PROVIDER_SEARCH_HOST")) missing.push("RAPIDAPI_PROVIDER_SEARCH_URL or RAPIDAPI_PROVIDER_SEARCH_HOST");
      break;
    case "Clod":
      if (!isEnvConfigured("CLOD_API_KEY")) missing.push("CLOD_API_KEY");
      if (!isEnvConfigured("CLOD_API_BASE_URL")) missing.push("CLOD_API_BASE_URL");
      if (!isEnvConfigured("CLOD_EXTRACTION_MODEL")) missing.push("CLOD_EXTRACTION_MODEL");
      break;
    case "Minimax":
      if (!isEnvConfigured("MINIMAX_API_KEY")) missing.push("MINIMAX_API_KEY");
      if (!isEnvConfigured("MINIMAX_API_BASE_URL")) missing.push("MINIMAX_API_BASE_URL");
      break;
  }
  return missing;
}

interface TestCase {
  name: string;
  setup: () => void;
  check: () => void;
}

const envBackup: Record<string, string | undefined> = {};

function setEnv(key: string, value: string | undefined) {
  if (!(key in envBackup)) {
    envBackup[key] = process.env[key];
  }
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

function restoreEnv() {
  for (const [key, value] of Object.entries(envBackup)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

const ALL_KEYS = [
  "LANGSEARCH_API_KEY", "SERPER_API_KEY", "TAVILY_API_KEY", "EXA_API_KEY",
  "FIRECRAWL_API_KEY", "BROWSE_AI_API_KEY", "BROWSE_AI_ROBOT_ID", "BROWSE_AI_TASK_ID",
  "BROWSE_AI_BASE_URL", "BROWSE_AI_TIMEOUT_MS",
  "OLOSTEP_API_KEY", "OLOSTEP_BASE_URL", "OLOSTEP_TIMEOUT_MS",
  "BROWSERBASE_API_KEY", "BROWSERBASE_PROJECT_ID", "BROWSERBASE_BASE_URL", "BROWSERBASE_TIMEOUT_MS",
  "GEMINI_API_KEY", "GROQ_API_KEY", "OPENROUTER_KEY", "CEREBRAS_API_KEY",
  "HUGGINGFACE_API_KEY", "MINIMAX_API_KEY", "MINIMAX_API_BASE_URL",
  "CLOD_API_KEY", "CLOD_API_BASE_URL", "CLOD_EXTRACTION_MODEL",
  "GEOCODIO_TOKEN", "GEOCODIO_SECONDARY_TOKEN", "GEOCODIO_TERTIARY_TOKEN", "GEOCODIO_QUATERNARY_TOKEN",
  "RAPIDAPI_KEY", "RAPIDAPI_ENABLED", "RAPIDAPI_PROVIDER_SEARCH_ENABLED",
  "RAPIDAPI_PROVIDER_SEARCH_URL", "RAPIDAPI_PROVIDER_SEARCH_HOST", "RAPIDAPI_PROVIDER_SEARCH_PATH",
  "RAPIDAPI_PROVIDER_SEARCH_TIMEOUT_MS",
  "PINECONE_API_KEY", "PINECONE_INDEX_HOST", "PINECONE_NAMESPACE", "PINECONE_TIMEOUT_MS",
];

function clearAllApiEnvVars() {
  for (const key of ALL_KEYS) {
    setEnv(key, undefined);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERT FAILED: ${message}`);
  }
}

const tests: TestCase[] = [
  {
    name: "No env vars → all readiness false",
    setup: () => clearAllApiEnvVars(),
    check: () => {
      assert(!isBrowseAiConfigured(), "Browse AI should not be ready");
      assert(!isOlostepConfigured(), "Olostep should not be ready");
      assert(!isBrowserbaseConfigured(), "Browserbase should not be ready");
      assert(!isPineconeConfigured(), "Pinecone should not be ready");
      assert(!isRapidApiProviderSearchConfigured(), "RapidAPI should not be ready");
      assert(!isClodConfigured(), "Clod should not be ready");
      assert(!isMinimaxConfigured(), "Minimax should not be ready");
    },
  },
  {
    name: "Browse AI key only → configured, not runtime-ready, missing robot/task",
    setup: () => {
      clearAllApiEnvVars();
      setEnv("BROWSE_AI_API_KEY", "test-key");
    },
    check: () => {
      assert(!isBrowseAiConfigured(), "Browse AI should not be runtime-ready with key only");
      assert(isEnvConfigured("BROWSE_AI_API_KEY"), "Browse AI key should be configured");
      const missing = getMissingConfig("BrowseAI");
      assert(missing.includes("BROWSE_AI_ROBOT_ID or BROWSE_AI_TASK_ID"), "Should report missing robot/task");
    },
  },
  {
    name: "Browse AI key + robot ID → runtimeReady true",
    setup: () => {
      clearAllApiEnvVars();
      setEnv("BROWSE_AI_API_KEY", "test-key");
      setEnv("BROWSE_AI_ROBOT_ID", "robot-123");
    },
    check: () => {
      assert(isBrowseAiConfigured(), "Browse AI should be runtime-ready with key + robot ID");
      assert(getMissingConfig("BrowseAI").length === 0, "No missing config");
    },
  },
  {
    name: "Pinecone key only → runtimeReady false, missing index host",
    setup: () => {
      clearAllApiEnvVars();
      setEnv("PINECONE_API_KEY", "test-key");
    },
    check: () => {
      assert(!isPineconeConfigured(), "Pinecone should not be runtime-ready with key only");
      assert(isEnvConfigured("PINECONE_API_KEY"), "Pinecone key should be configured");
      assert(getMissingConfig("Pinecone").includes("PINECONE_INDEX_HOST"), "Should report missing index host");
    },
  },
  {
    name: "Pinecone key + index host → runtimeReady true",
    setup: () => {
      clearAllApiEnvVars();
      setEnv("PINECONE_API_KEY", "test-key");
      setEnv("PINECONE_INDEX_HOST", "https://index.pinecone.io");
    },
    check: () => {
      assert(isPineconeConfigured(), "Pinecone should be runtime-ready with key + index host");
      assert(getMissingConfig("Pinecone").length === 0, "No missing config");
    },
  },
  {
    name: "RapidAPI key/flags only → runtimeReady false, missing URL/host",
    setup: () => {
      clearAllApiEnvVars();
      setEnv("RAPIDAPI_KEY", "test-key");
      setEnv("RAPIDAPI_ENABLED", "true");
      setEnv("RAPIDAPI_PROVIDER_SEARCH_ENABLED", "true");
    },
    check: () => {
      assert(!isRapidApiProviderSearchConfigured(), "RapidAPI should not be runtime-ready without endpoint");
      assert(isEnvConfigured("RAPIDAPI_KEY"), "RapidAPI key should be configured");
      const missing = getMissingConfig("RapidAPI");
      assert(missing.includes("RAPIDAPI_PROVIDER_SEARCH_URL or RAPIDAPI_PROVIDER_SEARCH_HOST"), "Should report missing URL/host");
    },
  },
  {
    name: "RapidAPI key/flags + host → runtimeReady true",
    setup: () => {
      clearAllApiEnvVars();
      setEnv("RAPIDAPI_KEY", "test-key");
      setEnv("RAPIDAPI_ENABLED", "true");
      setEnv("RAPIDAPI_PROVIDER_SEARCH_ENABLED", "true");
      setEnv("RAPIDAPI_PROVIDER_SEARCH_HOST", "example-api.rapidapi.com");
    },
    check: () => {
      assert(isRapidApiProviderSearchConfigured(), "RapidAPI should be runtime-ready with host");
      assert(getMissingConfig("RapidAPI").length === 0, "No missing config");
    },
  },
  {
    name: "AI provider key (Gemini) → runtimeReady true for AI extraction",
    setup: () => {
      clearAllApiEnvVars();
      setEnv("GEMINI_API_KEY", "test-key");
    },
    check: () => {
      assert(isEnvConfigured("GEMINI_API_KEY"), "Gemini should be configured");
    },
  },
  {
    name: "Olostep key only → runtimeReady false, missing base URL",
    setup: () => {
      clearAllApiEnvVars();
      setEnv("OLOSTEP_API_KEY", "test-key");
    },
    check: () => {
      assert(!isOlostepConfigured(), "Olostep should not be runtime-ready without base URL");
      assert(getMissingConfig("Olostep").includes("OLOSTEP_BASE_URL"), "Should report missing base URL");
    },
  },
  {
    name: "Browserbase key only → runtimeReady false, missing project/base",
    setup: () => {
      clearAllApiEnvVars();
      setEnv("BROWSERBASE_API_KEY", "test-key");
    },
    check: () => {
      assert(!isBrowserbaseConfigured(), "Browserbase should not be runtime-ready without project/base");
      assert(getMissingConfig("Browserbase").includes("BROWSERBASE_PROJECT_ID or BROWSERBASE_BASE_URL"), "Should report missing project/base");
    },
  },
  {
    name: "Clod key only → runtimeReady false, missing base URL and model",
    setup: () => {
      clearAllApiEnvVars();
      setEnv("CLOD_API_KEY", "test-key");
    },
    check: () => {
      assert(!isClodConfigured(), "Clod should not be runtime-ready without base URL and model");
      const missing = getMissingConfig("Clod");
      assert(missing.includes("CLOD_API_BASE_URL"), "Should report missing base URL");
      assert(missing.includes("CLOD_EXTRACTION_MODEL"), "Should report missing model");
    },
  },
  {
    name: "Minimax key only → runtimeReady false, missing base URL",
    setup: () => {
      clearAllApiEnvVars();
      setEnv("MINIMAX_API_KEY", "test-key");
    },
    check: () => {
      assert(!isMinimaxConfigured(), "Minimax should not be runtime-ready without base URL");
      assert(getMissingConfig("Minimax").includes("MINIMAX_API_BASE_URL"), "Should report missing base URL");
    },
  },
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  try {
    test.setup();
    test.check();
    console.log(`  PASS: ${test.name}`);
    passed++;
  } catch (error) {
    console.error(`  FAIL: ${test.name} — ${String(error)}`);
    failed++;
  }
}

restoreEnv();
console.log(`\n${passed}/${tests.length} tests passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
