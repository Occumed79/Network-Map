import L from "leaflet";
import { collectVisibleLeafletProviderCandidates } from "./leafletProviderAdapter";
import { installLeafletEtaRouteLayer } from "./leafletEtaRouteLayer";
import { formatEtaRankingForClipboard, rankProvidersByEta } from "./providerEtaEngine";
import { setProviderEtaResult } from "./providerEtaStore";
import type { EtaOrigin, EtaRankingResult } from "./providerEtaTypes";

const originalMap = L.map.bind(L);
let installed = false;
let origin: EtaOrigin | null = null;
let latestResult: EtaRankingResult | null = null;
let statusNode: HTMLDivElement | null = null;
let resultsNode: HTMLDivElement | null = null;

function nativeDriveTimeEnabled(): boolean {
  return import.meta.env.VITE_NATIVE_DRIVE_TIME === "true";
}

function setStatus(text: string): void {
  if (statusNode) statusNode.textContent = text;
}

function setOriginFromMap(map: L.Map): EtaOrigin {
  const center = map.getCenter();
  origin = { lat: center.lat, lng: center.lng, label: "Current map center" };
  setStatus(`Origin: ${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`);
  return origin;
}

function renderResult(result: EtaRankingResult): void {
  if (!resultsNode) return;
  resultsNode.innerHTML = "";
  result.rankings.slice(0, 8).forEach((row) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "native-drive-time-row";
    button.textContent = `${row.rank}. ${row.name} — ${Math.round(row.driveMinutes)} min / ${row.driveMiles.toFixed(1)} mi`;
    button.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("occumed:native-eta-route", { detail: row }));
    });
    resultsNode?.appendChild(button);
  });
}

async function rankVisible(map: L.Map): Promise<void> {
  const currentOrigin = origin || setOriginFromMap(map);
  const candidates = collectVisibleLeafletProviderCandidates(map, currentOrigin);
  if (candidates.length === 0) {
    setStatus("No visible provider markers to rank.");
    return;
  }
  setStatus(`Ranking ${Math.min(candidates.length, 8)} visible providers...`);
  const result = await rankProvidersByEta(currentOrigin, candidates, {
    routeProfile: "driving-traffic",
    maxCandidates: 12,
    maxRouteCalls: 8,
  });
  latestResult = result;
  setProviderEtaResult(result);
  renderResult(result);
  setStatus(`Ranked ${result.rankings.length} providers. ${result.failed ? `${result.failed} failed.` : ""}`.trim());
}

async function copyLatest(): Promise<void> {
  if (!latestResult) {
    setStatus("No native ETA result to copy yet.");
    return;
  }
  await navigator.clipboard.writeText(formatEtaRankingForClipboard(latestResult));
  setStatus("Native ETA ranking copied.");
}

function addPanel(map: L.Map): void {
  const control = new L.Control({ position: "bottomright" });
  control.onAdd = () => {
    const box = L.DomUtil.create("div", "native-drive-time-panel");
    L.DomEvent.disableClickPropagation(box);
    L.DomEvent.disableScrollPropagation(box);

    const title = document.createElement("div");
    title.className = "native-drive-time-title";
    title.textContent = "Native Drive-Time";
    box.appendChild(title);

    const actions = document.createElement("div");
    actions.className = "native-drive-time-actions";
    const originButton = document.createElement("button");
    originButton.type = "button";
    originButton.textContent = "Set Origin";
    originButton.addEventListener("click", () => setOriginFromMap(map));
    const rankButton = document.createElement("button");
    rankButton.type = "button";
    rankButton.textContent = "Rank Visible";
    rankButton.addEventListener("click", () => rankVisible(map));
    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.textContent = "Copy";
    copyButton.addEventListener("click", () => copyLatest());
    actions.appendChild(originButton);
    actions.appendChild(rankButton);
    actions.appendChild(copyButton);
    box.appendChild(actions);

    statusNode = document.createElement("div");
    statusNode.className = "native-drive-time-status";
    statusNode.textContent = "Feature-flagged native ETA engine.";
    box.appendChild(statusNode);

    resultsNode = document.createElement("div");
    resultsNode.className = "native-drive-time-results";
    box.appendChild(resultsNode);
    return box;
  };
  control.addTo(map);
}

function installOnMap(map: L.Map): void {
  installLeafletEtaRouteLayer(map);
  addPanel(map);
  map.on("click", (event: L.LeafletMouseEvent) => {
    if (!event.originalEvent?.altKey) return;
    origin = { lat: event.latlng.lat, lng: event.latlng.lng, label: "Alt-click origin" };
    setStatus(`Origin: ${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`);
  });
}

export function installNativeDriveTimeRuntime(): void {
  if (installed || !nativeDriveTimeEnabled()) return;
  installed = true;
  (L as any).map = (...args: Parameters<typeof L.map>) => {
    const map = originalMap(...args);
    window.setTimeout(() => installOnMap(map), 0);
    return map;
  };
}

installNativeDriveTimeRuntime();
