import "./usDiagnosticsGate";
import "./modalLabelScrubber";
import "./modal-command-polish.css";
import L from "leaflet";

type ContinentView = {
  key: string;
  label: string;
  center: [number, number];
  zoom: number;
};

const originalMap = L.map.bind(L);
let installed = false;
let domInstalled = false;
let radiusPrimed = false;

const continentViews: ContinentView[] = [
  { key: "world", label: "World", center: [20, 0], zoom: 2 },
  { key: "north-america", label: "North America", center: [46, -101], zoom: 3 },
  { key: "south-america", label: "South America", center: [-19, -60], zoom: 3 },
  { key: "europe", label: "Europe", center: [51, 12], zoom: 4 },
  { key: "africa", label: "Africa", center: [2, 20], zoom: 3 },
  { key: "asia", label: "Asia", center: [35, 88], zoom: 3 },
  { key: "oceania", label: "Oceania", center: [-25, 135], zoom: 4 },
];

function findSectionByLabel(label: string): Element | null {
  const labels = Array.from(document.querySelectorAll(".sb-lbl"));
  const match = labels.find((node) => (node.textContent || "").trim().toLowerCase() === label.toLowerCase());
  return match?.parentElement || null;
}

function isRadiusToolActive(): boolean {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>("button"));
  return buttons.some((button) => (button.textContent || "").trim().toLowerCase() === "radius tool" && button.classList.contains("active"));
}

function primeRadiusCenter(map: L.Map): void {
  if (!isRadiusToolActive()) {
    radiusPrimed = false;
    return;
  }
  if (radiusPrimed) return;
  radiusPrimed = true;
  window.setTimeout(() => {
    if (!isRadiusToolActive()) return;
    const center = map.getCenter();
    map.fire("click", {
      latlng: center,
      layerPoint: map.latLngToLayerPoint(center),
      containerPoint: map.latLngToContainerPoint(center),
      originalEvent: new MouseEvent("click", { bubbles: true }),
    } as L.LeafletMouseEvent);
  }, 180);
}

function installContinentPresetButtons(): void {
  const section = findSectionByLabel("VIEW PRESETS");
  if (!section || section.getAttribute("data-continent-presets") === "true") return;
  section.setAttribute("data-continent-presets", "true");
  const label = section.querySelector(".sb-lbl");
  Array.from(section.children).forEach((child) => {
    if (child !== label) child.remove();
  });
  const grid = document.createElement("div");
  grid.className = "occumed-continent-grid";
  continentViews.forEach((view) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "vbtn occumed-continent-btn";
    button.textContent = view.label;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      grid.querySelectorAll("button").forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      window.dispatchEvent(new CustomEvent("occumed:fly-continent", { detail: view }));
    });
    grid.appendChild(button);
  });
  section.appendChild(grid);
}

function makeLayerRowsClickable(): void {
  document.querySelectorAll<HTMLElement>(".tog-row").forEach((row) => {
    if (row.getAttribute("data-row-clickable") === "true") return;
    row.setAttribute("data-row-clickable", "true");
    row.setAttribute("role", "button");
    row.setAttribute("tabindex", "0");
    const clickInput = () => {
      const input = row.querySelector<HTMLInputElement>('input[type="checkbox"]');
      input?.click();
    };
    row.addEventListener("click", (event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, label, button, a")) return;
      clickInput();
    });
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      clickInput();
    });
  });
}

function scanSidebar(): void {
  installContinentPresetButtons();
  makeLayerRowsClickable();
}

function installSidebarDomFixes(): void {
  if (domInstalled) return;
  domInstalled = true;
  window.setTimeout(scanSidebar, 250);
  const observer = new MutationObserver(() => scanSidebar());
  observer.observe(document.body, { childList: true, subtree: true });
}

function installMapCommands(map: L.Map): void {
  window.addEventListener("occumed:fly-continent", ((event: Event) => {
    const detail = (event as CustomEvent<ContinentView>).detail;
    if (!detail?.center) return;
    map.flyTo(detail.center, detail.zoom, { duration: 1.15 });
  }) as EventListener);
  document.addEventListener("click", () => window.setTimeout(() => primeRadiusCenter(map), 40), true);
  window.setTimeout(() => primeRadiusCenter(map), 400);
}

export function installSidebarCommandFixes(): void {
  installSidebarDomFixes();
  if (installed) return;
  installed = true;
  (L as any).map = (...args: Parameters<typeof L.map>) => {
    const map = originalMap(...args);
    window.setTimeout(() => installMapCommands(map), 0);
    return map;
  };
}

installSidebarCommandFixes();
