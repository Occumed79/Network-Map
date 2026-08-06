import {
  registerNetworkRequestMiddleware,
  type NetworkRequestContext,
  type NetworkRequestNext,
} from "./networkRequestPipelineRuntime";

type UploadedProvider = Record<string, unknown> & {
  name?: unknown;
  clinic_name?: unknown;
  address?: unknown;
  address_1?: unknown;
  city?: unknown;
  state?: unknown;
  data_source?: unknown;
  source?: unknown;
};

type ProviderLayerResponse = {
  providers?: UploadedProvider[];
};

const labelsByName = new Map<string, Set<string>>();
const labelsByNameAndAddress = new Map<string, Set<string>>();

function normalized(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function providerName(provider: UploadedProvider): string {
  return normalized(provider.name ?? provider.clinic_name);
}

function providerAddress(provider: UploadedProvider): string {
  const address = String(provider.address_1 ?? provider.address ?? "").trim();
  const city = String(provider.city ?? "").trim();
  const state = String(provider.state ?? "").trim();
  return normalized([address, city, state].filter(Boolean).join(", "));
}

function providerLabel(provider: UploadedProvider): string {
  return String(provider.data_source ?? provider.source ?? "").trim();
}

function addLabel(map: Map<string, Set<string>>, key: string, label: string): void {
  if (!key || !label) return;
  const labels = map.get(key) ?? new Set<string>();
  labels.add(label);
  map.set(key, labels);
}

function rememberProviders(providers: UploadedProvider[]): void {
  for (const provider of providers) {
    const name = providerName(provider);
    const address = providerAddress(provider);
    const label = providerLabel(provider);
    if (!name || !label) continue;
    addLabel(labelsByName, name, label);
    if (address) addLabel(labelsByNameAndAddress, `${name}|${address}`, label);
  }
  relabelVisiblePopups();
}

function singleLabel(labels: Set<string> | undefined): string | null {
  if (!labels || labels.size !== 1) return null;
  return labels.values().next().value ?? null;
}

function popupName(card: Element): string {
  return normalized(card.firstElementChild?.textContent);
}

function popupAddress(card: Element): string {
  const children = Array.from(card.children);
  const addressNode = children.find((child, index) => {
    if (index === 0) return false;
    const text = normalized(child.textContent);
    return Boolean(text) && text !== "my clinic" && !/^\+?[\d\s().-]+$/.test(text);
  });
  return normalized(addressNode?.textContent);
}

function replacementFor(card: Element): string | null {
  const name = popupName(card);
  if (!name) return null;
  const address = popupAddress(card);
  if (address) {
    const exact = singleLabel(labelsByNameAndAddress.get(`${name}|${address}`));
    if (exact) return exact;
  }
  return singleLabel(labelsByName.get(name));
}

function relabelFooter(node: Element): void {
  if (normalized(node.textContent) !== "my clinic") return;
  const card = node.parentElement;
  if (!card) return;
  const replacement = replacementFor(card);
  if (!replacement || normalized(replacement) === "my clinics") return;
  node.textContent = replacement;
  node.setAttribute("data-provider-dataset-label", replacement);
}

function relabelVisiblePopups(root: ParentNode = document): void {
  const candidates = root.querySelectorAll(".leaflet-popup-content div");
  for (const candidate of candidates) relabelFooter(candidate);
}

async function captureUploadedDatasetLabels(
  context: NetworkRequestContext,
  next: NetworkRequestNext,
): Promise<Response> {
  const response = await next();
  if (
    context.method !== "GET"
    || !context.url
    || !context.url.pathname.endsWith("/api/provider-layers/my-clinics")
    || !response.ok
  ) {
    return response;
  }

  try {
    const payload = await response.clone().json() as ProviderLayerResponse;
    if (Array.isArray(payload.providers)) rememberProviders(payload.providers);
  } catch {
    // Keep the original response untouched if diagnostics parsing fails.
  }
  return response;
}

registerNetworkRequestMiddleware(
  "uploaded-dataset-popup-labels",
  captureUploadedDatasetLabels,
  -50,
);

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof Element)) continue;
      relabelFooter(node);
      relabelVisiblePopups(node);
    }
  }
});

function installPopupObserver(): void {
  if (!document.body) {
    window.addEventListener("DOMContentLoaded", installPopupObserver, { once: true });
    return;
  }
  observer.observe(document.body, { childList: true, subtree: true });
  relabelVisiblePopups();
}

installPopupObserver();
