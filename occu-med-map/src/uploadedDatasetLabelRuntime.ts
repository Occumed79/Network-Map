import {
  registerNetworkRequestMiddleware,
  type NetworkRequestContext,
  type NetworkRequestNext,
} from "./networkRequestPipelineRuntime";
import { registerRuntimeOwner, subscribeToSharedDomObserver } from "./runtimeControllerRegistry";

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

type UploadPayload = Record<string, unknown> & {
  rows?: Array<Record<string, unknown>>;
  clinics?: Array<Record<string, unknown>>;
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
    const value = normalized(child.textContent);
    return Boolean(value) && value !== "my clinic" && !/^\+?[\d\s().-]+$/.test(value);
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
  const candidates = root.querySelectorAll(".mapboxgl-popup-content div");
  for (const candidate of Array.from(candidates)) relabelFooter(candidate);
}

function compactKey(value: string): string {
  return value.toLowerCase().replace(/[\s_-]+/g, "");
}

function rowLookup(row: Record<string, unknown>): Map<string, unknown> {
  const lookup = new Map<string, unknown>();
  for (const [key, value] of Object.entries(row)) lookup.set(compactKey(key), value);
  return lookup;
}

function firstUploadValue(lookup: Map<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = lookup.get(compactKey(key));
    if (value !== undefined && value !== null && String(value).trim()) return value;
  }
  return undefined;
}

function hasUploadValue(lookup: Map<string, unknown>, ...keys: string[]): boolean {
  return firstUploadValue(lookup, ...keys) !== undefined;
}

function normalizeUploadedRow(row: Record<string, unknown>): Record<string, unknown> {
  const lookup = rowLookup(row);
  const next = { ...row };

  if (!hasUploadValue(lookup, "lat", "latitude")) {
    const latitude = firstUploadValue(lookup, "final latitude", "geocoded latitude", "matched latitude");
    if (latitude !== undefined) next.lat = latitude;
  }
  if (!hasUploadValue(lookup, "lng", "lon", "long", "longitude")) {
    const longitude = firstUploadValue(lookup, "final longitude", "geocoded longitude", "matched longitude");
    if (longitude !== undefined) next.lng = longitude;
  }
  if (!hasUploadValue(lookup, "address", "formatted address", "street address", "address 1")) {
    const address = firstUploadValue(
      lookup,
      "final matched address",
      "matched address",
      "submitted address",
      "original cdc address",
      "original address",
    );
    if (address !== undefined) next.address = address;
  }
  if (!hasUploadValue(lookup, "source record id", "source id", "id")) {
    const sourceRecordId = firstUploadValue(lookup, "unique id", "record id", "registry id");
    if (sourceRecordId !== undefined) next.source_record_id = sourceRecordId;
  }

  const location = firstUploadValue(lookup, "cdc city", "city state", "city/state");
  if (location !== undefined) {
    const match = String(location).trim().match(/^(.+?),\s*([A-Za-z]{2})$/);
    if (match) {
      if (!hasUploadValue(lookup, "city")) next.city = match[1].trim();
      if (!hasUploadValue(lookup, "state", "st", "admin area")) next.state = match[2].toUpperCase();
    } else if (!hasUploadValue(lookup, "city")) {
      next.city = String(location).trim();
    }
  }

  return next;
}

function requestBodyText(context: NetworkRequestContext): string | null {
  if (typeof context.init?.body === "string") return context.init.body;
  return null;
}

async function normalizeUploadedDatasetRequest(
  context: NetworkRequestContext,
  next: NetworkRequestNext,
): Promise<Response> {
  if (
    context.method !== "POST"
    || !context.url
    || !context.url.pathname.endsWith("/api/my-clinics/upload")
  ) {
    return next();
  }

  const bodyText = requestBodyText(context);
  if (!bodyText) return next();

  try {
    const payload = JSON.parse(bodyText) as UploadPayload;
    const rows = Array.isArray(payload.rows) ? payload.rows : Array.isArray(payload.clinics) ? payload.clinics : null;
    if (!rows) return next();
    const normalizedRows = rows.map((row) => normalizeUploadedRow(row || {}));
    const key = Array.isArray(payload.rows) ? "rows" : "clinics";
    const response = await next({
      init: {
        ...context.init,
        body: JSON.stringify({ ...payload, [key]: normalizedRows }),
      },
    });
    if (response.ok) window.dispatchEvent(new Event("network-map:provider-dataset-uploaded"));
    return response;
  } catch {
    return next();
  }
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

function installUploadedDatasetLabelRuntime(): void {
  if (!registerRuntimeOwner("uploaded-dataset-labels", "Uploaded dataset labels in provider map popups")) return;

  registerNetworkRequestMiddleware(
    "uploaded-dataset-column-normalization",
    normalizeUploadedDatasetRequest,
    60,
  );

  registerNetworkRequestMiddleware(
    "uploaded-dataset-popup-labels",
    captureUploadedDatasetLabels,
    -50,
  );

  subscribeToSharedDomObserver("uploaded-dataset-labels", (mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (!(node instanceof Element)) continue;
        relabelFooter(node);
        relabelVisiblePopups(node);
      }
    }
  });

  relabelVisiblePopups();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", installUploadedDatasetLabelRuntime, { once: true });
} else {
  installUploadedDatasetLabelRuntime();
}
