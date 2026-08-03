type ProviderSourceKey = "indexed" | "bluehive" | "dentists" | "my-clinics";

const SOURCE_PATH = /^\/api\/provider-layers\/(indexed|bluehive|dentists|my-clinics)$/;
const explicitlyEnabled = new Set<ProviderSourceKey>();

function normalizeSource(value: string): ProviderSourceKey | null {
  const normalized = value.trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (normalized.includes("bluehive")) return "bluehive";
  if (normalized.includes("dentist")) return "dentists";
  if (normalized.includes("indexed")) return "indexed";
  if (normalized.includes("my-clinics") || normalized.includes("my-clinic")) return "my-clinics";
  return null;
}

function checkboxSource(input: HTMLInputElement): ProviderSourceKey | null {
  return normalizeSource(input.getAttribute("aria-label") || input.name || input.id || "");
}

// Only a real user change is allowed to open a provider-layer request. React's
// historical true defaults no longer count as permission to load thousands of
// records during startup.
document.addEventListener("change", event => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.type !== "checkbox" || !event.isTrusted) return;
  const source = checkboxSource(input);
  if (!source) return;
  if (input.checked) explicitlyEnabled.add(source);
  else explicitlyEnabled.delete(source);
}, true);

document.addEventListener("click", event => {
  if (!event.isTrusted) return;
  const target = event.target instanceof Element ? event.target : null;
  const button = target?.closest<HTMLButtonElement>(".unified-source-tool[data-source-key]");
  if (!button) return;
  const source = normalizeSource(button.dataset.sourceKey || "");
  if (!source) return;
  const active = button.getAttribute("aria-pressed") === "true" || button.classList.contains("active");
  if (active) explicitlyEnabled.delete(source);
  else explicitlyEnabled.add(source);
}, true);

const previousFetch = window.fetch.bind(window);
window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  let url: URL | null = null;
  try {
    const raw = input instanceof Request ? input.url : input.toString();
    url = new URL(raw, window.location.origin);
  } catch {
    url = null;
  }

  const match = url?.origin === window.location.origin ? url.pathname.match(SOURCE_PATH) : null;
  const source = match?.[1] as ProviderSourceKey | undefined;

  if (source && !explicitlyEnabled.has(source)) {
    return Promise.resolve(new Response(JSON.stringify({
      providers: [], count: 0, loaded: 0, total: 0, source,
      all: false, hasMore: false, visibleCapped: false,
      manualActivationRequired: true,
    }), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "X-Network-Map-Provider-Layer": "manual-only",
      },
    }));
  }

  return previousFetch(input, init);
}) as typeof window.fetch;

export {};
