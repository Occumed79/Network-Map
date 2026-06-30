let installed = false;

type RankedProvider = {
  name: string;
  lat: number;
  lng: number;
  driveMiles: number;
  driveMinutes: number;
};

let latestRankings: RankedProvider[] = [];

function normalizedText(el: Element): string {
  return (el.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeName(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/[^a-z0-9]+/gi, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function tagSecondaryControls(root: Element): void {
  const inner = root.querySelector(".lp-inner");
  if (!inner) return;
  if (inner.getAttribute("data-compact-tagged") !== "true") {
    inner.setAttribute("data-compact-tagged", "true");
    inner.classList.add("occumed-live-panel-compact");
    Array.from(inner.children).forEach((child) => {
      const text = normalizedText(child);
      const hasResultMarkup = Boolean(child.querySelector(".lp-name, .lp-addr, .lp-row1, .lp-acts"));
      if (hasResultMarkup) {
        child.classList.add("occumed-primary-result-block");
        return;
      }
      if (text.includes("npi") || text.includes("taxonomy") || text.includes("specialization") || text.includes("source") || text.includes("filter")) {
        child.classList.add("occumed-secondary-control-block");
      }
    });
  }
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
    card.querySelector(".occumed-result-eta-bar")?.remove();
    card.removeAttribute("data-eta-rank");
    if (!ranking) return;
    card.setAttribute("data-eta-rank", String(latestRankings.indexOf(ranking) + 1).padStart(3, "0"));

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

  const rankedCards = cards
    .filter((card) => card.getAttribute("data-eta-rank"))
    .sort((a, b) => String(a.getAttribute("data-eta-rank")).localeCompare(String(b.getAttribute("data-eta-rank"))));
  rankedCards.forEach((card) => inner.appendChild(card));
}

function scanPanels(): void {
  document.querySelectorAll(".live-panel.open").forEach(tagSecondaryControls);
}

export function installRightPanelCompactor(): void {
  if (installed) return;
  installed = true;
  window.setTimeout(scanPanels, 250);
  const observer = new MutationObserver(() => scanPanels());
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("occumed:provider-eta-rankings", ((event: Event) => {
    latestRankings = Array.isArray((event as CustomEvent<RankedProvider[]>).detail) ? (event as CustomEvent<RankedProvider[]>).detail : [];
    scanPanels();
  }) as EventListener);
}

installRightPanelCompactor();
