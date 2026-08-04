import { TRANSITION_SOUND_DATA_URI } from "./transitionSoundData";

type MapMode = "2d" | "3d";

type GlobeBridge = {
  getMode: () => MapMode;
  setMode: (mode: MapMode) => Promise<void>;
  sync: () => void;
};

type Particle = {
  angle: number;
  radius: number;
  speed: number;
  spin: number;
  width: number;
  hue: number;
  alpha: number;
  trail: number;
};

declare global {
  interface Window {
    __NETWORK_MAP_GLOBE__?: GlobeBridge;
  }
}

let transitionRunning = false;
const transitionAudio = new Audio(TRANSITION_SOUND_DATA_URI);
transitionAudio.preload = "auto";
transitionAudio.volume = 0.72;

function playTransitionSound(): void {
  transitionAudio.pause();
  transitionAudio.currentTime = 0;
  void transitionAudio.play().catch(() => undefined);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function engineReady(mode: MapMode, control: HTMLElement): boolean {
  const api = window.__NETWORK_MAP_GLOBE__;
  const wrap = control.closest<HTMLElement>(".dual-engine-map-shell");
  if (!api || !wrap || api.getMode() !== mode) return false;
  if (mode === "3d") {
    const host = wrap.querySelector<HTMLElement>(".mapbox-globe-host");
    return wrap.classList.contains("mapbox-globe-active") && Boolean(host?.classList.contains("ready"));
  }
  const host = wrap.querySelector<HTMLElement>(".mapbox-2d-host");
  return !wrap.classList.contains("mapbox-globe-active") && Boolean(host?.classList.contains("ready"));
}

function updateControl(control: HTMLElement): void {
  const mode = window.__NETWORK_MAP_GLOBE__?.getMode() || "2d";
  control.querySelectorAll<HTMLButtonElement>("button[data-map-mode]").forEach((button) => {
    const active = button.dataset.mapMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function setControlStatus(control: HTMLElement, message: string, state: "normal" | "loading" | "error" = "normal"): void {
  const status = control.querySelector<HTMLElement>(".map-dimension-status");
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
}

function ensureOverlay(): HTMLElement {
  const existing = document.querySelector<HTMLElement>(".dual-engine-vortex");
  if (existing) return existing;
  const overlay = document.createElement("div");
  overlay.className = "dual-engine-vortex";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <canvas class="dual-engine-vortex-canvas" aria-hidden="true"></canvas>
    <div class="dual-engine-vortex-rings" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="dual-engine-vortex-core" aria-hidden="true"><span></span></div>
    <div class="dual-engine-vortex-bloom" aria-hidden="true"></div>
    <div class="dual-engine-vortex-copy" role="status" aria-live="polite">
      <strong>Opening Mapbox globe</strong>
      <small>Folding the map into three dimensions…</small>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function createParticle(direction: "in" | "out", index: number): Particle {
  const hues = [184, 192, 205, 222, 252, 278];
  const lane = index % 6;
  return {
    angle: index * 2.39996 + lane * 0.12,
    radius: direction === "in" ? 0.18 + (index % 29) / 24 : 0.012 + (index % 7) * 0.006,
    speed: 0.00009 + lane * 0.000012,
    spin: 0.00042 + lane * 0.000045,
    width: 0.7 + lane * 0.17,
    hue: hues[lane],
    alpha: 0.48 + (index % 5) * 0.09,
    trail: 0.09 + lane * 0.014,
  };
}

function beginVortex(targetMode: MapMode): { complete: () => Promise<void>; fail: (message: string) => Promise<void>; stop: () => void } {
  const overlay = ensureOverlay();
  const canvas = overlay.querySelector<HTMLCanvasElement>(".dual-engine-vortex-canvas");
  const context = canvas?.getContext("2d", { alpha: true });
  const direction: "in" | "out" = targetMode === "3d" ? "in" : "out";
  const title = overlay.querySelector<HTMLElement>(".dual-engine-vortex-copy strong");
  const detail = overlay.querySelector<HTMLElement>(".dual-engine-vortex-copy small");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const particles = Array.from({ length: reducedMotion ? 0 : 92 }, (_, index) => createParticle(direction, index));

  if (title) title.textContent = targetMode === "3d" ? "Opening Mapbox globe" : "Returning to Mapbox 2D";
  if (detail) detail.textContent = targetMode === "3d"
    ? "Folding the map into three dimensions…"
    : "Flattening the globe into the street map…";

  overlay.className = `dual-engine-vortex active ${targetMode === "3d" ? "entering" : "exiting"}`;
  overlay.setAttribute("aria-hidden", "false");

  let stopped = false;
  let frame = 0;
  let previous = performance.now();
  let width = window.innerWidth;
  let height = window.innerHeight;
  let ratio = Math.min(window.devicePixelRatio || 1, 2);
  let centerX = width / 2;
  let centerY = height / 2;
  let maxRadius = Math.hypot(width, height) * 0.62;

  const resize = () => {
    if (!canvas || !context) return;
    width = window.innerWidth;
    height = window.innerHeight;
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    centerX = width / 2;
    centerY = height / 2;
    maxRadius = Math.hypot(width, height) * 0.62;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const render = (now: number) => {
    if (stopped || !canvas || !context) return;
    const delta = Math.min(34, Math.max(8, now - previous));
    previous = now;
    context.clearRect(0, 0, width, height);
    context.save();
    context.globalCompositeOperation = "lighter";

    particles.forEach((particle, index) => {
      const priorRadius = particle.radius;
      const closeness = Math.max(0, 1 - Math.min(1, particle.radius));
      if (direction === "in") {
        particle.radius -= particle.speed * delta * (1 + closeness * closeness * 10);
        particle.angle += particle.spin * delta * (1 + closeness * 7);
      } else {
        particle.radius += particle.speed * delta * (3 + particle.radius * 5);
        particle.angle += particle.spin * delta * (2 + particle.radius * 3);
      }

      const radius = particle.radius * maxRadius;
      const prior = priorRadius * maxRadius + particle.trail * maxRadius;
      const x = centerX + Math.cos(particle.angle) * radius;
      const y = centerY + Math.sin(particle.angle) * radius;
      const tailAngle = particle.angle - particle.spin * delta * (12 + closeness * 24);
      const tailX = centerX + Math.cos(tailAngle) * prior;
      const tailY = centerY + Math.sin(tailAngle) * prior;

      context.strokeStyle = `hsla(${particle.hue},100%,${74 + closeness * 22}%,${particle.alpha * (0.35 + closeness)})`;
      context.lineWidth = particle.width * (0.65 + closeness * 1.45);
      context.shadowBlur = 14 + closeness * 30;
      context.shadowColor = `hsla(${particle.hue},100%,72%,0.75)`;
      context.beginPath();
      context.moveTo(tailX, tailY);
      context.quadraticCurveTo(
        centerX + Math.cos((particle.angle + tailAngle) / 2 + 0.18) * ((radius + prior) / 2),
        centerY + Math.sin((particle.angle + tailAngle) / 2 + 0.18) * ((radius + prior) / 2),
        x,
        y,
      );
      context.stroke();

      if ((direction === "in" && particle.radius < 0.005) || (direction === "out" && particle.radius > 1.2)) {
        Object.assign(particle, createParticle(direction, index));
      }
    });

    const core = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, 160);
    core.addColorStop(0, "rgba(255,255,255,1)");
    core.addColorStop(0.08, "rgba(205,248,255,.94)");
    core.addColorStop(0.28, "rgba(70,210,255,.46)");
    core.addColorStop(0.62, "rgba(89,70,255,.2)");
    core.addColorStop(1, "rgba(2,8,24,0)");
    context.fillStyle = core;
    context.beginPath();
    context.arc(centerX, centerY, 160, 0, Math.PI * 2);
    context.fill();
    context.restore();
    frame = window.requestAnimationFrame(render);
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    overlay.className = "dual-engine-vortex";
    overlay.setAttribute("aria-hidden", "true");
  };

  const complete = async () => {
    overlay.classList.add("collapsing");
    await delay(reducedMotion ? 100 : 420);
    overlay.classList.add("bursting");
    await delay(reducedMotion ? 120 : 500);
    overlay.classList.add("revealing");
    await delay(reducedMotion ? 80 : 300);
    stop();
  };

  const fail = async (message: string) => {
    overlay.classList.add("failed");
    if (title) title.textContent = "Map transition failed";
    if (detail) detail.textContent = message;
    await delay(650);
    overlay.classList.add("revealing");
    await delay(240);
    stop();
  };

  resize();
  window.addEventListener("resize", resize);
  if (context && particles.length) frame = window.requestAnimationFrame(render);
  return { complete, fail, stop };
}

async function switchMode(targetMode: MapMode, control: HTMLElement): Promise<void> {
  const api = window.__NETWORK_MAP_GLOBE__;
  if (!api || transitionRunning) return;
  if (engineReady(targetMode, control)) {
    updateControl(control);
    return;
  }

  transitionRunning = true;
  control.dataset.transitioning = "true";
  control.querySelectorAll<HTMLButtonElement>("button[data-map-mode]").forEach((button) => {
    button.disabled = true;
  });
  const vortex = beginVortex(targetMode);
  playTransitionSound();
  setControlStatus(control, targetMode === "3d" ? "Opening Mapbox globe…" : "Returning to Mapbox 2D…", "loading");

  try {
    await delay(320);
    await api.setMode(targetMode);
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline && !engineReady(targetMode, control)) await delay(80);
    if (!engineReady(targetMode, control)) throw new Error(`${targetMode === "3d" ? "Mapbox globe" : "Mapbox 2D map"} did not become ready`);
    await vortex.complete();
    setControlStatus(control, targetMode === "3d" ? "Mapbox 3D globe active" : "Mapbox 2D active");
    updateControl(control);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown map engine error";
    console.error("Map engine transition failed", error);
    await vortex.fail(message);
    setControlStatus(control, message, "error");
    updateControl(control);
  } finally {
    control.querySelectorAll<HTMLButtonElement>("button[data-map-mode]").forEach((button) => {
      button.disabled = false;
    });
    control.dataset.transitioning = "false";
    transitionRunning = false;
  }
}

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const button = target?.closest<HTMLButtonElement>(".map-dimension-toggle button[data-map-mode]");
  if (!button) return;
  const control = button.closest<HTMLElement>(".map-dimension-toggle");
  if (!control) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const mode: MapMode = button.dataset.mapMode === "3d" ? "3d" : "2d";
  void switchMode(mode, control);
}, true);

export {};
