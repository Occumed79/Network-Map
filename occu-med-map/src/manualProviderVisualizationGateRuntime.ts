type CachedPayload = {
  expiresAt: number;
  status: number;
  statusText: string;
  headers: Array<[string, string]>;
  body: string;
};

const VISUALIZATION_PATH = /^\/api\/provider-explorer\/(density|hex|map)$/;
const CACHE_TTL_MS = 12_000;
let explicitRequestBudget = 0;
let explicitRequestDeadline = 0;
const recentPayloads = new Map<string, CachedPayload>();

function buttonText(button: HTMLButtonElement): string {
  return (button.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function requestBudgetFor(button: HTMLButtonElement): number {
  const text = buttonText(button);
  if (text.includes("density + points")) return 4;
  if (text.includes("refresh map")) return 4;
  if (text.includes("density") || text.includes("hex") || text.includes("points")) return 2;
  return 0;
}

function isProviderVisualizationControl(button: HTMLButtonElement): boolean {
  if (button.closest(".provider-visualization-grid")) return true;
  if (button.closest(".provider-mode-switch")) return true;
  const text = buttonText(button);
  return text.includes("view all matching as density")
    || text.includes("refresh map")
    || text === "density"
    || text.includes("hex field")
    || text.includes("dot density")
    || text.includes("density + points")
    || text.includes("8px points");
}

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const button = target?.closest<HTMLButtonElement>("button");
  if (!button || !isProviderVisualizationControl(button)) return;

  explicitRequestBudget = Math.max(1, requestBudgetFor(button));
  explicitRequestDeadline = Date.now() + 15_000;
  document.body.dataset.providerDensityUserEnabled = "true";
}, true);

function responseFromCache(payload: CachedPayload): Response {
  return new Response(payload.body, {
    status: payload.status,
    statusText: payload.statusText,
    headers: payload.headers,
  });
}

function emptyVisualizationResponse(kind: string): Response {
  const payload = kind === "map"
    ? { providers: [], total: 0, count: 0, manualActivationRequired: true }
    : { cells: [], total: 0, count: 0, manualActivationRequired: true };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "X-Network-Map-Visualization": "manual-only",
    },
  });
}

const previousFetch = window.fetch.bind(window);
window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  let url: URL | null = null;
  try {
    const raw = input instanceof Request ? input.url : input.toString();
    url = new URL(raw, window.location.origin);
  } catch {
    url = null;
  }

  const match = url?.origin === window.location.origin ? url.pathname.match(VISUALIZATION_PATH) : null;
  if (!match || !url) return previousFetch(input, init);

  const cacheKey = `${url.pathname}?${url.searchParams.toString()}`;
  const cached = recentPayloads.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return responseFromCache(cached);
  if (cached) recentPayloads.delete(cacheKey);

  const explicitlyRequested = explicitRequestBudget > 0 && Date.now() <= explicitRequestDeadline;
  if (!explicitlyRequested) return emptyVisualizationResponse(match[1]);

  explicitRequestBudget -= 1;
  const response = await previousFetch(input, init);
  const clone = response.clone();
  void clone.text().then((body) => {
    recentPayloads.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      status: clone.status,
      statusText: clone.statusText,
      headers: Array.from(clone.headers.entries()),
      body,
    });
  }).catch(() => undefined);
  return response;
}) as typeof window.fetch;

export {};
