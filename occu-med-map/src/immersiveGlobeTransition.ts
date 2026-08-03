type MapMode = "2d" | "3d";

type GlobeBridge = {
  getMode: () => MapMode;
  setMode: (mode: MapMode) => Promise<void>;
  sync: () => void;
};

declare global {
  interface Window {
    __NETWORK_MAP_GLOBE__?: GlobeBridge;
  }
}

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");
let transitionRunning = false;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function buildStarField(): string {
  return Array.from({ length: 46 }, (_, index) => {
    const angle = (index * 137.508) % 360;
    const radius = 18 + ((index * 29) % 48);
    const size = 1 + (index % 3);
    const delayValue = -((index % 11) * 0.13);
    return `<i style="--portal-angle:${angle}deg;--portal-radius:${radius}vmax;--portal-size:${size}px;--portal-delay:${delayValue}s"></i>`;
  }).join("");
}

function createPortalOverlay(mapWrap: HTMLElement): HTMLElement {
  const existing = mapWrap.querySelector<HTMLElement>(".globe-portal-transition");
  if (existing) return existing;

  const overlay = document.createElement("div");
  overlay.className = "globe-portal-transition";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <div class="globe-portal-space" aria-hidden="true">
      <div class="globe-portal-stars">${buildStarField()}</div>
      <div class="globe-portal-vortex"></div>
      <div class="globe-portal-rings">
        <i></i><i></i><i></i><i></i><i></i>
      </div>
      <div class="globe-portal-core">
        <span class="globe-portal-orbit"></span>
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="23"></circle>
          <path d="M9 32h46M32 9c8 7 12 15 12 23S40 48 32 55C24 48 20 40 20 32S24 16 32 9Z"></path>
          <path d="M13 21c6 3 12 4 19 4s14-1 19-4M13 43c6-3 12-4 19-4s14 1 19 4"></path>
        </svg>
      </div>
      <div class="globe-portal-copy" role="status" aria-live="polite">
        <strong>Entering immersive globe</strong>
        <small>Synchronizing the live network map</small>
      </div>
      <div class="globe-portal-flash"></div>
    </div>
  `;
  mapWrap.appendChild(overlay);
  return overlay;
}

function setPortalCopy(overlay: HTMLElement, mode: MapMode, waiting = false): void {
  const title = overlay.querySelector<HTMLElement>(".globe-portal-copy strong");
  const detail = overlay.querySelector<HTMLElement>(".globe-portal-copy small");
  if (!title || !detail) return;

  if (mode === "3d") {
    title.textContent = waiting ? "Opening immersive globe" : "Entering immersive globe";
    detail.textContent = waiting ? "ArcGIS is preparing the synchronized 3D scene" : "Folding the flat map into three dimensions";
    return;
  }

  title.textContent = "Returning to flat map";
  detail.textContent = "Restoring the Mapbox navigation view";
}

function setControlStatus(control: HTMLElement, message: string, state: "normal" | "loading" | "error" = "normal"): void {
  const status = control.querySelector<HTMLElement>(".map-dimension-status");
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
}

function syncControl(control: HTMLElement): void {
  const mode = window.__NETWORK_MAP_GLOBE__?.getMode() || "2d";
  const enteringButton = control.querySelector<HTMLButtonElement>('button[data-map-mode="3d"]');
  const returnButton = control.querySelector<HTMLButtonElement>('button[data-map-mode="2d"]');

  enteringButton?.setAttribute("aria-pressed", mode === "3d" ? "true" : "false");
  returnButton?.setAttribute("aria-pressed", mode === "2d" ? "true" : "false");
  enteringButton?.classList.toggle("active", mode === "3d");
  returnButton?.classList.toggle("active", mode === "2d");

  control.dataset.currentMode = mode;
  control.setAttribute("aria-label", mode === "3d" ? "Return to the flat map" : "Enter the immersive 3D globe");
}

function enhanceToggle(control: HTMLElement): void {
  if (control.dataset.portalEnhanced === "true") return;

  const enteringButton = control.querySelector<HTMLButtonElement>('button[data-map-mode="3d"]');
  const returnButton = control.querySelector<HTMLButtonElement>('button[data-map-mode="2d"]');
  const mapWrap = control.closest<HTMLElement>(".map-wrap");
  if (!enteringButton || !returnButton || !mapWrap) return;

  control.dataset.portalEnhanced = "true";
  control.classList.add("immersive-portal-toggle");

  enteringButton.classList.add("planet-portal-button");
  enteringButton.title = "Enter immersive 3D globe";
  enteringButton.setAttribute("aria-label", "Enter immersive 3D globe");
  enteringButton.innerHTML = `
    <span class="planet-portal-icon" aria-hidden="true">
      <svg viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="18"></circle>
        <path d="M14 32h36M32 14c6 6 9 12 9 18s-3 12-9 18c-6-6-9-12-9-18s3-12 9-18Z"></path>
        <path class="planet-ring" d="M7 40c7 6 25 5 39-3S61 19 54 16"></path>
      </svg>
    </span>
    <span class="portal-button-label">Enter 3D</span>
  `;

  returnButton.classList.add("planet-return-button");
  returnButton.title = "Return to the flat Mapbox map";
  returnButton.setAttribute("aria-label", "Return to the flat Mapbox map");
  returnButton.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"></path></svg>
    <span>Exit 3D</span>
  `;

  createPortalOverlay(mapWrap);
  syncControl(control);
}

function scanForToggle(): void {
  document.querySelectorAll<HTMLElement>(".map-dimension-toggle").forEach(enhanceToggle);
}

function cleanupTransition(overlay: HTMLElement, control: HTMLElement): void {
  overlay.classList.remove(
    "active",
    "entering",
    "exiting",
    "switching",
    "waiting",
    "revealing",
    "failed",
  );
  overlay.setAttribute("aria-hidden", "true");
  control.dataset.transitioning = "false";
  document.body.classList.remove(
    "globe-portal-transitioning",
    "globe-portal-entering",
    "globe-portal-exiting",
  );
  transitionRunning = false;
  syncControl(control);
}

async function runPortalTransition(targetMode: MapMode, control: HTMLElement): Promise<void> {
  const api = window.__NETWORK_MAP_GLOBE__;
  const mapWrap = control.closest<HTMLElement>(".map-wrap");
  if (!api || !mapWrap || transitionRunning || api.getMode() === targetMode) return;

  transitionRunning = true;
  control.dataset.transitioning = "true";
  const overlay = createPortalOverlay(mapWrap);
  const reducedMotion = REDUCED_MOTION.matches;

  overlay.classList.remove("entering", "exiting", "switching", "waiting", "revealing", "failed");
  overlay.classList.add("active", targetMode === "3d" ? "entering" : "exiting");
  overlay.setAttribute("aria-hidden", "false");
  setPortalCopy(overlay, targetMode);

  document.body.classList.add(
    "globe-portal-transitioning",
    targetMode === "3d" ? "globe-portal-entering" : "globe-portal-exiting",
  );
  setControlStatus(control, targetMode === "3d" ? "Opening immersive globe…" : "Returning to Mapbox…", "loading");

  try {
    await delay(reducedMotion ? 30 : targetMode === "3d" ? 620 : 320);
    overlay.classList.add("switching");

    const modePromise = api.setMode(targetMode);
    if (!reducedMotion && targetMode === "3d") {
      await delay(360);
      overlay.classList.add("waiting");
      setPortalCopy(overlay, targetMode, true);
    }

    await modePromise;

    if (api.getMode() !== targetMode) {
      overlay.classList.add("failed");
      setControlStatus(control, "3D globe unavailable", "error");
      await delay(reducedMotion ? 80 : 650);
      return;
    }

    overlay.classList.add("revealing");
    setControlStatus(
      control,
      targetMode === "3d" ? "Immersive ArcGIS globe active" : "Mapbox 2D active",
    );
    await delay(reducedMotion ? 80 : targetMode === "3d" ? 560 : 420);
  } catch (error) {
    console.error("Immersive globe transition failed", error);
    overlay.classList.add("failed");
    setControlStatus(control, "Map transition unavailable", "error");
    await delay(reducedMotion ? 80 : 650);
  } finally {
    cleanupTransition(overlay, control);
    const mode = api.getMode();
    const focusTarget = control.querySelector<HTMLButtonElement>(
      mode === "3d" ? 'button[data-map-mode="2d"]' : 'button[data-map-mode="3d"]',
    );
    focusTarget?.focus({ preventScroll: true });
  }
}

function interceptModeClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const button = target.closest<HTMLButtonElement>(".immersive-portal-toggle button[data-map-mode]");
  if (!button) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const control = button.closest<HTMLElement>(".immersive-portal-toggle");
  if (!control) return;
  const targetMode: MapMode = button.dataset.mapMode === "3d" ? "3d" : "2d";
  void runPortalTransition(targetMode, control);
}

function initialize(): void {
  scanForToggle();
  const observer = new MutationObserver(scanForToggle);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("click", interceptModeClick, true);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize, { once: true });
} else {
  initialize();
}

export {};
