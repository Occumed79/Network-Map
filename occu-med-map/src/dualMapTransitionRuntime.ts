import { TRANSITION_SOUND_DATA_URI } from "./transitionSoundData";
import "./black-hole-transition.css";

type MapMode = "2d" | "3d";
type GlobeBridge = { getMode: () => MapMode; setMode: (mode: MapMode) => Promise<void>; sync: () => void };
type Star = { angle: number; radius: number; speed: number; size: number; alpha: number };

declare global { interface Window { __NETWORK_MAP_GLOBE__?: GlobeBridge } }

let transitionRunning = false;
const transitionAudio = new Audio(TRANSITION_SOUND_DATA_URI);
transitionAudio.preload = "auto";
transitionAudio.volume = 0.72;

function playTransitionSound(): void {
  transitionAudio.pause();
  transitionAudio.currentTime = 0;
  void transitionAudio.play().catch(() => undefined);
}

function delay(ms: number): Promise<void> { return new Promise((resolve) => window.setTimeout(resolve, ms)); }

function engineReady(mode: MapMode, control: HTMLElement): boolean {
  const api = window.__NETWORK_MAP_GLOBE__;
  const wrap = control.closest<HTMLElement>(".dual-engine-map-shell");
  if (!api || !wrap || api.getMode() !== mode) return false;
  const selector = mode === "3d" ? ".mapbox-globe-host" : ".mapbox-2d-host";
  const host = wrap.querySelector<HTMLElement>(selector);
  return Boolean(host?.classList.contains("ready")) && (mode === "3d" ? wrap.classList.contains("mapbox-globe-active") : !wrap.classList.contains("mapbox-globe-active"));
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
    <div class="dual-engine-vortex-copy" role="status" aria-live="polite">
      <strong>Entering the black hole</strong>
      <small>Falling through the luminous accretion disk…</small>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function beginBlackHole(targetMode: MapMode): { complete: () => Promise<void>; fail: (message: string) => Promise<void>; stop: () => void } {
  const overlay = ensureOverlay();
  const canvas = overlay.querySelector<HTMLCanvasElement>("canvas");
  const ctx = canvas?.getContext("2d", { alpha: false });
  const title = overlay.querySelector<HTMLElement>("strong");
  const detail = overlay.querySelector<HTMLElement>("small");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (title) title.textContent = targetMode === "3d" ? "Entering the black hole" : "Escaping the black hole";
  if (detail) detail.textContent = targetMode === "3d" ? "Falling through the luminous accretion disk…" : "Rising back into the flat map…";

  overlay.className = `dual-engine-vortex active black-hole-${targetMode === "3d" ? "in" : "out"}`;
  overlay.setAttribute("aria-hidden", "false");

  let width = innerWidth;
  let height = innerHeight;
  let ratio = Math.min(devicePixelRatio || 1, 2);
  let frame = 0;
  let stopped = false;
  const started = performance.now();
  const duration = reducedMotion ? 650 : 2200;
  const stars: Star[] = Array.from({ length: reducedMotion ? 20 : 120 }, (_, i) => ({
    angle: i * 2.39996,
    radius: 0.28 + (i % 37) / 32,
    speed: 0.00007 + (i % 9) * 0.000011,
    size: 0.7 + (i % 4) * 0.45,
    alpha: 0.28 + (i % 5) * 0.13,
  }));

  const resize = () => {
    if (!canvas || !ctx) return;
    width = innerWidth;
    height = innerHeight;
    ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const ring = (cx: number, cy: number, rx: number, ry: number, lineWidth: number, color: string, rotation: number, start = 0, end = Math.PI * 2) => {
    if (!ctx) return;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, start, end);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
  };

  const render = (now: number) => {
    if (stopped || !ctx) return;
    const raw = Math.min(1, (now - started) / duration);
    const p = targetMode === "3d" ? raw : 1 - raw;
    const eased = 1 - Math.pow(1 - p, 3);
    const cx = width / 2;
    const cy = height / 2;
    const base = Math.min(width, height);
    const zoom = 0.72 + eased * 3.8;
    const tilt = 0.48 + eased * 0.46;
    const outer = base * 0.42 * zoom;
    const hole = Math.max(18, base * (0.055 + eased * 0.42));
    const spin = now * 0.00055;

    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.8);
    bg.addColorStop(0, "#2b0758");
    bg.addColorStop(0.42, "#120329");
    bg.addColorStop(1, "#000000");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const star of stars) {
      star.angle += star.speed * 16 * (1 + eased * 8);
      const r = star.radius * outer;
      const x = cx + Math.cos(star.angle + spin) * r;
      const y = cy + Math.sin(star.angle + spin) * r * tilt;
      ctx.fillStyle = `rgba(190,135,255,${star.alpha * (1 - eased * 0.45)})`;
      ctx.beginPath();
      ctx.arc(x, y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    const glow = ctx.createRadialGradient(cx, cy, hole * 0.65, cx, cy, outer * 0.72);
    glow.addColorStop(0, "rgba(255,255,255,.98)");
    glow.addColorStop(0.08, "rgba(255,246,160,.96)");
    glow.addColorStop(0.18, "rgba(255,186,20,.88)");
    glow.addColorStop(0.38, "rgba(255,73,12,.44)");
    glow.addColorStop(0.62, "rgba(170,0,255,.18)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(cx, cy, outer * 0.92, outer * tilt * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 18; i += 1) {
      const t = i / 18;
      const radius = hole * 1.15 + (outer - hole) * Math.pow(t, 1.18);
      const ry = radius * tilt;
      const alpha = (1 - t) * 0.98 + 0.08;
      const hue = 36 - t * 20;
      ring(cx, cy, radius, ry, Math.max(2, base * 0.008 * (1 - t * 0.55)), `hsla(${hue},100%,${62 + (1 - t) * 28}%,${alpha})`, spin * (i % 2 ? 1 : -0.7), spin + i * 0.22, spin + Math.PI * (1.2 + (i % 5) * 0.11));
    }

    ctx.shadowColor = "rgba(255,110,0,.95)";
    ctx.shadowBlur = Math.max(22, hole * 0.34);
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(cx, cy, hole, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    const rim = ctx.createRadialGradient(cx - hole * 0.22, cy - hole * 0.22, hole * 0.2, cx, cy, hole * 1.22);
    rim.addColorStop(0, "rgba(0,0,0,0)");
    rim.addColorStop(0.67, "rgba(0,0,0,0)");
    rim.addColorStop(0.82, "rgba(255,242,170,.98)");
    rim.addColorStop(0.94, "rgba(255,95,0,.8)");
    rim.addColorStop(1, "rgba(122,0,255,0)");
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(cx, cy, hole * 1.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (raw > 0.78) overlay.classList.add("black-hole-final");
    frame = requestAnimationFrame(render);
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    removeEventListener("resize", resize);
    overlay.className = "dual-engine-vortex";
    overlay.setAttribute("aria-hidden", "true");
  };

  const complete = async () => {
    await delay(reducedMotion ? 300 : 1750);
    overlay.classList.add("black-hole-final");
    await delay(reducedMotion ? 180 : 520);
    overlay.classList.add("revealing");
    await delay(240);
    stop();
  };

  const fail = async (message: string) => {
    if (title) title.textContent = "Map transition failed";
    if (detail) detail.textContent = message;
    await delay(700);
    overlay.classList.add("revealing");
    await delay(240);
    stop();
  };

  resize();
  addEventListener("resize", resize);
  frame = requestAnimationFrame(render);
  return { complete, fail, stop };
}

async function switchMode(targetMode: MapMode, control: HTMLElement): Promise<void> {
  const api = window.__NETWORK_MAP_GLOBE__;
  if (!api || transitionRunning) return;
  if (engineReady(targetMode, control)) { updateControl(control); return; }

  transitionRunning = true;
  control.dataset.transitioning = "true";
  control.querySelectorAll<HTMLButtonElement>("button[data-map-mode]").forEach((button) => { button.disabled = true; });
  const blackHole = beginBlackHole(targetMode);
  playTransitionSound();
  setControlStatus(control, targetMode === "3d" ? "Entering black hole…" : "Escaping black hole…", "loading");

  try {
    await delay(420);
    await api.setMode(targetMode);
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline && !engineReady(targetMode, control)) await delay(80);
    if (!engineReady(targetMode, control)) throw new Error(`${targetMode === "3d" ? "Mapbox globe" : "Mapbox 2D map"} did not become ready`);
    await blackHole.complete();
    setControlStatus(control, targetMode === "3d" ? "Mapbox 3D globe active" : "Mapbox 2D active");
    updateControl(control);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown map engine error";
    console.error("Map engine transition failed", error);
    await blackHole.fail(message);
    setControlStatus(control, message, "error");
    updateControl(control);
  } finally {
    control.querySelectorAll<HTMLButtonElement>("button[data-map-mode]").forEach((button) => { button.disabled = false; });
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
  void switchMode(button.dataset.mapMode === "3d" ? "3d" : "2d", control);
}, true);

export {};
