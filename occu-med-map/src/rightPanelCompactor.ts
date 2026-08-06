import { registerRuntimeOwner, subscribeToSharedDomObserver } from "./runtimeControllerRegistry";

let installed = false;
let scanQueued = false;

type RankedProvider = {
  name: string;
  lat: number;
  lng: number;
  driveMiles: number;
  driveMinutes: number;
};

let latestRankings: RankedProvider[] = [];

function normalizeName(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/[^a-z0-9]+/gi, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function scheduleScan(): void {
  if (scanQueued) return;
  scanQueued = true;
  window.setTimeout(() => {
    scanQueued = false;
    scanPanels();
  }, 160);
}

function updateResultCards(root: Element): void {
  const inner = root.querySelector(".lp-inner");
  if (!inner) return;
  applyEtaToCards(inner);
}

function matchRanking(cardName: string): RankedProvider | null {
  const cardNorm = normalizeName(cardName);
  if (!cardNorm) return null;
  return latestRankings.find((row) => {
    const rowNorm = normalizeName(row.name);
    return rowNorm === cardNorm || rowNorm.includes(cardNorm) || cardNorm.includes(rowNorm);
  }) || null;
}

function applyEtaToCards(inner: Element): void {
  const cards = Array.from(inner.querySelectorAll(".lp-item"));
  cards.forEach((card) => {
    const name = card.querySelector(".lp-name")?.textContent || "";
    const ranking = matchRanking(name);
    const nextRank = ranking ? String(latestRankings.indexOf(ranking) + 1).padStart(3, "0") : "";
    const currentRank = card.getAttribute("data-eta-rank") || "";
    const existingBar = card.querySelector(".occumed-result-eta-bar");

    if (!ranking) {
      if (existingBar) existingBar.remove();
      if (currentRank) card.removeAttribute("data-eta-rank");
      return;
    }

    if (currentRank === nextRank && existingBar) return;

    existingBar?.remove();
    card.setAttribute("data-eta-rank", nextRank);

    const bar = document.createElement("div");
    bar.className = "occumed-result-eta-bar";
    const eta = document.createElement("span");
    eta.textContent = `${Math.round(ranking.driveMinutes)} min / ${ranking.driveMiles.toFixed(1)} mi`;
    const route = document.createElement("button");
    route.type = "button";
    route.textContent = "Route";
    route.addEventListener("click", (event) => {
      event.stopPropagation();
      window.dispatchEvent(new CustomEvent("occumed:route-to-point", { detail: { lat: ranking.lat, lng: ranking.lng, label: ranking.name } }));
    });
    bar.appendChild(eta);
    bar.appendChild(route);
    const acts = card.querySelector(".lp-acts");
    if (acts?.parentElement === card) card.insertBefore(bar, acts);
    else card.appendChild(bar);
  });
}

function scanPanels(): void {
  document.querySelectorAll(".live-panel.open").forEach(updateResultCards);
}

export function installRightPanelCompactor(): void {
  if (installed || import.meta.env.VITE_NATIVE_DRIVE_TIME === "true") return;
  if (!registerRuntimeOwner("right-panel-compactor", "Finder result-card ETA decoration")) return;
  installed = true;
  window.setTimeout(scanPanels, 250);
  subscribeToSharedDomObserver("right-panel-compactor", () => scheduleScan());
  window.addEventListener("occumed:provider-eta-rankings", ((event: Event) => {
    latestRankings = Array.isArray((event as CustomEvent<RankedProvider[]>).detail) ? (event as CustomEvent<RankedProvider[]>).detail : [];
    scheduleScan();
  }) as EventListener);
}

installRightPanelCompactor();
