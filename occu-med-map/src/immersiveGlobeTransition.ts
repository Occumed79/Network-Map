type MapMode = "2d" | "3d";

type GlobeBridge = {
  getMode: () => MapMode;
  setMode: (mode: MapMode) => Promise<void>;
  sync: () => void;
};

type ArcgisImportApi = {
  import: (modules: string[]) => Promise<any[]>;
};

type VortexParticle = {
  angle: number;
  radius: number;
  speed: number;
  spin: number;
  trail: number;
  width: number;
  hue: number;
  alpha: number;
  phase: number;
};

type VortexController = {
  complete: () => Promise<void>;
  fail: () => Promise<void>;
  stop: () => void;
};

declare global {
  interface Window {
    __NETWORK_MAP_GLOBE__?: GlobeBridge;
    $arcgis?: ArcgisImportApi;
  }
}

const ARCGIS_VERSION = "5.1";
const ARCGIS_SCRIPT_ID = "network-map-arcgis-sdk";
const MODE_TIMEOUT_MS = 25_000;
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");

let loaderPromise: Promise<void> | null = null;
let transitionRunning = false;
let activeVortex: VortexController | null = null;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function ensureArcgisModuleLoader(): Promise<void> {
  if (window.$arcgis) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<void>((resolve, reject) => {
    let script = document.getElementById(ARCGIS_SCRIPT_ID) as HTMLScriptElement | null;

    if (script && script.type !== "module" && !window.$arcgis) {
      script.remove();
      script = null;
    }

    const finish = () => {
      if (window.$arcgis) resolve();
      else reject(new Error("ArcGIS module loader finished without exposing $arcgis"));
    };
    const fail = () => reject(new Error("ArcGIS module loader request failed"));

    if (!script) {
      script = document.createElement("script");
      script.id = ARCGIS_SCRIPT_ID;
      script.type = "module";
      script.src = `https://js.arcgis.com/${ARCGIS_VERSION}/`;
      script.crossOrigin = "anonymous";
      script.dataset.networkMapLoader = "module";
      script.addEventListener("load", finish, { once: true });
      script.addEventListener("error", fail, { once: true });
      document.head.appendChild(script);
      return;
    }

    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", fail, { once: true });
    window.setTimeout(() => {
      if (window.$arcgis) resolve();
    }, 0);
  }).catch((error) => {
    loaderPromise = null;
    if (!window.$arcgis) document.getElementById(ARCGIS_SCRIPT_ID)?.remove();
    throw error;
  });

  return loaderPromise;
}

function setControlStatus(
  control: HTMLElement,
  message: string,
  state: "normal" | "loading" | "error" = "normal",
): void {
  const status = control.querySelector<HTMLElement>(".map-dimension-status");
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
}

function syncControl(control: HTMLElement): void {
  const mode = window.__NETWORK_MAP_GLOBE__?.getMode() || "2d";
  control.dataset.currentMode = mode;
  control.querySelectorAll<HTMLButtonElement>("button[data-map-mode]").forEach((button) => {
    const active = button.dataset.mapMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  control.setAttribute("aria-label", mode === "3d" ? "3D globe active" : "2D map active");
}

function actualModeReady(targetMode: MapMode, control: HTMLElement): boolean {
  const api = window.__NETWORK_MAP_GLOBE__;
  const mapWrap = control.closest<HTMLElement>(".map-wrap");
  if (!api || !mapWrap) return false;

  if (targetMode === "2d") {
    return api.getMode() === "2d" && !mapWrap.classList.contains("arcgis-globe-active");
  }

  const host = mapWrap.querySelector<HTMLElement>(".arcgis-globe-host");
  return api.getMode() === "3d"
    && mapWrap.classList.contains("arcgis-globe-active")
    && Boolean(host?.classList.contains("ready"));
}

function ensureVortexOverlay(): HTMLElement {
  const existing = document.querySelector<HTMLElement>(".luminous-vortex-overlay");
  if (existing) return existing;

  const overlay = document.createElement("div");
  overlay.className = "luminous-vortex-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <canvas class="luminous-vortex-canvas" aria-hidden="true"></canvas>
    <div class="luminous-vortex-radiation" aria-hidden="true">
      <i></i><i></i><i></i><i></i><i></i><i></i>
    </div>
    <div class="luminous-vortex-lens" aria-hidden="true"></div>
    <div class="luminous-vortex-core" aria-hidden="true">
      <span class="luminous-vortex-core-halo"></span>
      <span class="luminous-vortex-core-star"></span>
    </div>
    <div class="luminous-vortex-bloom" aria-hidden="true"></div>
    <div class="luminous-vortex-status" role="status" aria-live="polite">
      <strong>Opening immersive globe</strong>
      <small>Light and map layers are converging</small>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function makeParticle(direction: "in" | "out", index: number): VortexParticle {
  const colorCycle = [188, 197, 211, 224, 266];
  return {
    angle: Math.random() * Math.PI * 2,
    radius: direction === "in" ? 0.22 + Math.random() * 0.92 : 0.012 + Math.random() * 0.07,
    speed: 0.000065 + Math.random() * 0.000105,
    spin: (index % 2 === 0 ? 1 : -1) * (0.00016 + Math.random() * 0.00038),
    trail: 0.025 + Math.random() * 0.095,
    width: 0.55 + Math.random() * 1.7,
    hue: colorCycle[index % colorCycle.length] + Math.random() * 8,
    alpha: 0.32 + Math.random() * 0.68,
    phase: Math.random() * Math.PI * 2,
  };
}

function beginVortex(targetMode: MapMode): VortexController {
  activeVortex?.stop();
  const overlay = ensureVortexOverlay();
  const canvas = overlay.querySelector<HTMLCanvasElement>(".luminous-vortex-canvas");
  const context = canvas?.getContext("2d", { alpha: true });
  const direction: "in" | "out" = targetMode === "3d" ? "in" : "out";
  const particleCount = REDUCED_MOTION.matches ? 0 : Math.min(190, Math.max(105, Math.round(window.innerWidth / 7.5)));
  const particles = Array.from({ length: particleCount }, (_, index) => makeParticle(direction, index));

  let stopped = false;
  let collapsing = false;
  let animationFrame = 0;
  let previousTime = performance.now();
  let width = window.innerWidth;
  let height = window.innerHeight;
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  let centerX = width / 2;
  let centerY = height / 2;
  let maxRadius = Math.hypot(width, height) * 0.61;
  const startedAt = performance.now();

  overlay.className = `luminous-vortex-overlay active ${targetMode === "3d" ? "entering" : "exiting"}`;
  overlay.setAttribute("aria-hidden", "false");
  const title = overlay.querySelector<HTMLElement>(".luminous-vortex-status strong");
  const detail = overlay.querySelector<HTMLElement>(".luminous-vortex-status small");
  if (title) title.textContent = targetMode === "3d" ? "Opening immersive globe" : "Returning to 2D map";
  if (detail) detail.textContent = targetMode === "3d"
    ? "Light and map layers are converging"
    : "Releasing the map from the singularity";

  const resize = () => {
    if (!canvas || !context) return;
    width = window.innerWidth;
    height = window.innerHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    centerX = width / 2;
    centerY = height / 2;
    maxRadius = Math.hypot(width, height) * 0.61;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  };

  const resetParticle = (particle: VortexParticle, index: number) => {
    const fresh = makeParticle(direction, index);
    Object.assign(particle, fresh);
  };

  const drawCore = (elapsed: number) => {
    if (!context) return;
    const pulse = 0.5 + Math.sin(elapsed * 0.0045) * 0.5;
    const collapseBoost = collapsing ? Math.min(1, (elapsed - 300) / 900) : 0;
    const coreRadius = 18 + pulse * 7 + collapseBoost * 22;
    const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius * 5.8);
    gradient.addColorStop(0, `rgba(255,255,255,${0.96})`);
    gradient.addColorStop(0.08, `rgba(207,248,255,${0.92})`);
    gradient.addColorStop(0.22, `rgba(80,218,255,${0.46 + pulse * 0.18})`);
    gradient.addColorStop(0.5, `rgba(103,91,255,${0.18 + collapseBoost * 0.16})`);
    gradient.addColorStop(1, "rgba(3,8,24,0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(centerX, centerY, coreRadius * 5.8, 0, Math.PI * 2);
    context.fill();
  };

  const render = (now: number) => {
    if (stopped || !canvas || !context) return;
    const delta = Math.min(34, Math.max(8, now - previousTime));
    previousTime = now;
    const elapsed = now - startedAt;

    context.clearRect(0, 0, width, height);
    context.save();
    context.globalCompositeOperation = "lighter";

    particles.forEach((particle, index) => {
      const previousRadius = particle.radius;
      const closeness = Math.max(0, 1 - Math.min(1, particle.radius));
      const acceleration = 1 + closeness * closeness * 9 + (collapsing ? 7 : 0);
      const angularAcceleration = 1 + closeness * 5.5;

      if (direction === "in") {
        particle.radius -= particle.speed * delta * acceleration;
        particle.angle += particle.spin * delta * angularAcceleration;
      } else {
        particle.radius += particle.speed * delta * (2.5 + particle.radius * 5);
        particle.angle += particle.spin * delta * (1.5 + particle.radius * 2);
      }

      const currentRadius = particle.radius * maxRadius;
      const previousRadiusPx = previousRadius * maxRadius;
      const wobble = Math.sin(elapsed * 0.0018 + particle.phase) * (5 + closeness * 12);
      const currentAngle = particle.angle + wobble / Math.max(80, currentRadius);
      const previousAngle = particle.angle - particle.spin * delta * (8 + closeness * 28);

      const x = centerX + Math.cos(currentAngle) * currentRadius;
      const y = centerY + Math.sin(currentAngle) * currentRadius;
      const trailRadius = previousRadiusPx + particle.trail * maxRadius * (0.35 + closeness * 1.5);
      const trailX = centerX + Math.cos(previousAngle) * trailRadius;
      const trailY = centerY + Math.sin(previousAngle) * trailRadius;
      const controlAngle = (currentAngle + previousAngle) / 2 + (particle.spin > 0 ? 0.18 : -0.18);
      const controlRadius = (currentRadius + trailRadius) / 2;
      const controlX = centerX + Math.cos(controlAngle) * controlRadius;
      const controlY = centerY + Math.sin(controlAngle) * controlRadius;

      const brightness = Math.min(1, 0.25 + closeness * 1.25);
      context.strokeStyle = `hsla(${particle.hue}, 100%, ${72 + closeness * 22}%, ${particle.alpha * brightness})`;
      context.lineWidth = particle.width * (0.7 + closeness * 1.8);
      context.shadowBlur = 8 + closeness * 22;
      context.shadowColor = `hsla(${particle.hue}, 100%, 70%, ${0.55 * brightness})`;
      context.beginPath();
      context.moveTo(trailX, trailY);
      context.quadraticCurveTo(controlX, controlY, x, y);
      context.stroke();

      if (direction === "in" && particle.radius <= 0.008) {
        if (collapsing) particle.alpha = 0;
        else resetParticle(particle, index);
      }
      if (direction === "out" && particle.radius >= 1.15) {
        if (collapsing) particle.alpha = 0;
        else resetParticle(particle, index);
      }
    });

    drawCore(elapsed);
    context.restore();
    animationFrame = window.requestAnimationFrame(render);
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.cancelAnimationFrame(animationFrame);
    window.removeEventListener("resize", resize);
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    overlay.className = "luminous-vortex-overlay";
    overlay.setAttribute("aria-hidden", "true");
    if (activeVortex?.stop === stop) activeVortex = null;
  };

  const complete = async () => {
    if (stopped) return;
    collapsing = true;
    overlay.classList.add("collapsing");
    await delay(REDUCED_MOTION.matches ? 90 : targetMode === "3d" ? 520 : 280);
    overlay.classList.add("bursting");
    await delay(REDUCED_MOTION.matches ? 120 : 520);
    overlay.classList.add("revealing");
    await delay(REDUCED_MOTION.matches ? 80 : 260);
    stop();
  };

  const fail = async () => {
    if (stopped) return;
    overlay.classList.add("failed");
    if (title) title.textContent = targetMode === "3d" ? "The 3D globe could not open" : "The 2D map could not return";
    if (detail) detail.textContent = "The luminous transition has been cancelled";
    await delay(REDUCED_MOTION.matches ? 100 : 420);
    overlay.classList.add("revealing");
    await delay(180);
    stop();
  };

  resize();
  window.addEventListener("resize", resize);
  if (context && particleCount > 0) animationFrame = window.requestAnimationFrame(render);
  activeVortex = { complete, fail, stop };
  return activeVortex;
}

async function monitorModeChange(targetMode: MapMode, control: HTMLElement): Promise<void> {
  if (transitionRunning) return;
  const api = window.__NETWORK_MAP_GLOBE__;
  if (!api) {
    setControlStatus(control, "3D globe bridge unavailable", "error");
    return;
  }

  if (actualModeReady(targetMode, control)) {
    syncControl(control);
    return;
  }

  transitionRunning = true;
  control.dataset.transitioning = "true";
  control.querySelectorAll<HTMLButtonElement>("button[data-map-mode]").forEach((button) => {
    button.disabled = true;
  });

  const startedAt = performance.now();
  const vortex = beginVortex(targetMode);
  setControlStatus(
    control,
    targetMode === "3d" ? "Opening 3D globe…" : "Returning to 2D map…",
    "loading",
  );

  try {
    if (targetMode === "3d") await ensureArcgisModuleLoader();

    const deadline = Date.now() + MODE_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (actualModeReady(targetMode, control)) {
        const minimumVisible = targetMode === "3d" ? 760 : 360;
        const remaining = minimumVisible - (performance.now() - startedAt);
        if (remaining > 0) await delay(remaining);
        await vortex.complete();
        setControlStatus(control, targetMode === "3d" ? "3D globe active" : "2D map active");
        syncControl(control);
        return;
      }
      await delay(100);
    }

    throw new Error(targetMode === "3d" ? "ArcGIS scene did not become ready" : "2D map did not restore");
  } catch (error) {
    console.error("Map dimension switch failed", error);
    await vortex.fail();
    setControlStatus(
      control,
      targetMode === "3d" ? "3D globe failed to load" : "2D map failed to restore",
      "error",
    );
    syncControl(control);
  } finally {
    control.querySelectorAll<HTMLButtonElement>("button[data-map-mode]").forEach((button) => {
      button.disabled = false;
    });
    control.dataset.transitioning = "false";
    transitionRunning = false;
  }
}

function enhanceToggle(control: HTMLElement): void {
  if (control.dataset.directGlobeSwitch === "true") return;

  const mapButton = control.querySelector<HTMLButtonElement>('button[data-map-mode="2d"]');
  const globeButton = control.querySelector<HTMLButtonElement>('button[data-map-mode="3d"]');
  if (!mapButton || !globeButton) return;

  control.dataset.directGlobeSwitch = "true";
  control.classList.add("immersive-portal-toggle", "direct-globe-toggle");

  mapButton.title = "Use the flat 2D map";
  mapButton.setAttribute("aria-label", "Use the flat 2D map");
  mapButton.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"></path>
    </svg>
    <span><strong>2D Map</strong></span>
  `;

  globeButton.title = "Open the interactive 3D globe";
  globeButton.setAttribute("aria-label", "Open the interactive 3D globe");
  globeButton.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9"></circle>
      <path d="M3 12h18M12 3c3 3 4.5 6 4.5 9S15 18 12 21c-3-3-4.5-6-4.5-9S9 6 12 3Z"></path>
    </svg>
    <span><strong>3D Globe</strong></span>
  `;

  mapButton.addEventListener("click", () => {
    void monitorModeChange("2d", control);
  });
  globeButton.addEventListener("click", () => {
    void monitorModeChange("3d", control);
  });

  syncControl(control);
}

function scanForToggle(): void {
  document.querySelectorAll<HTMLElement>(".map-dimension-toggle").forEach(enhanceToggle);
  document.querySelectorAll<HTMLElement>(".globe-portal-transition").forEach((overlay) => overlay.remove());
}

function initialize(): void {
  void ensureArcgisModuleLoader().catch((error) => {
    console.warn("ArcGIS module preloading failed", error);
  });

  scanForToggle();
  const observer = new MutationObserver(scanForToggle);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize, { once: true });
} else {
  initialize();
}

export {};
