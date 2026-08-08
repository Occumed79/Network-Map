import "./live-finder-drive-tools.css";
import { registerRuntimeOwner, subscribeToSharedDomObserver } from "./runtimeControllerRegistry";

let installed = false;
let latestCount = 0;
let scanQueued = false;

function clickMapTool(labelIncludes: string): void {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".occumed-map-tools-panel button"));
  const target = buttons.find((button) => (button.textContent || "").toLowerCase().includes(labelIncludes.toLowerCase()));
  target?.click();
}

function button(label: string, action: () => void): HTMLButtonElement {
  const node = document.createElement("button");
  node.type = "button";
  node.textContent = label;
  node.addEventListener("click", (event) => {
    event.stopPropagation();
    action();
  });
  return node;
}

function scheduleScan(): void {
  if (scanQueued) return;
  scanQueued = true;
  window.setTimeout(() => {
    scanQueued = false;
    scanPanels();
  }, 180);
}

function ensureDriveTools(inner: Element): void {
  if (inner.querySelector(".occumed-live-drive-tools")) return;

  const strip = document.createElement("div");
  strip.className = "occumed-live-drive-tools";

  const copy = document.createElement("div");
  copy.className = "occumed-live-drive-copy";
  const title = document.createElement("strong");
  title.textContent = "Drive-time tools";
  const subtitle = document.createElement("span");
  subtitle.textContent = "Set origin on map, rank visible pins, then route from result cards.";
  copy.appendChild(title);
  copy.appendChild(subtitle);

  const actions = document.createElement("div");
  actions.className = "occumed-live-drive-actions";
  actions.appendChild(button("Rank by Drive Time", () => clickMapTool("Rank Visible")));
  actions.appendChild(button("Apply ETA", () => clickMapTool("Apply to Results")));
  actions.appendChild(button("Copy ETA", () => clickMapTool("Copy ETA")));
  actions.appendChild(button("Clear", () => clickMapTool("Clear")));

  const status = document.createElement("div");
  status.className = "occumed-live-drive-status";
  status.textContent = latestCount > 0 ? `${latestCount} provider ETA rows ready.` : "No ETA ranking applied yet.";

  strip.appendChild(copy);
  strip.appendChild(actions);
  strip.appendChild(status);

  const titleRow = inner.firstElementChild;
  if (titleRow?.nextSibling) inner.insertBefore(strip, titleRow.nextSibling);
  else inner.insertBefore(strip, inner.firstChild);
}

function updateDriveToolsStatus(): void {
  const next = latestCount > 0 ? `${latestCount} provider ETA rows ready. Route buttons are applied to matched cards.` : "No ETA ranking applied yet.";
  document.querySelectorAll<HTMLElement>(".occumed-live-drive-status").forEach((node) => {
    if (node.textContent !== next) node.textContent = next;
  });
}

function scanPanels(): void {
  document.querySelectorAll(".live-panel.open .lp-inner").forEach(ensureDriveTools);
  updateDriveToolsStatus();
}

export function installLiveFinderDriveTools(): void {
  if (installed || import.meta.env.VITE_NATIVE_DRIVE_TIME === "true") return;
  if (!registerRuntimeOwner("live-finder-drive-tools", "Finder drive-time action strip")) return;
  installed = true;
  window.setTimeout(scanPanels, 250);
  subscribeToSharedDomObserver("live-finder-drive-tools", () => scheduleScan());
  window.addEventListener("occumed:provider-eta-rankings", ((event: Event) => {
    const rows = (event as CustomEvent<unknown[]>).detail;
    latestCount = Array.isArray(rows) ? rows.length : 0;
    scheduleScan();
  }) as EventListener);
}

installLiveFinderDriveTools();
