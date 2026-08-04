import { TRANSITION_SOUND_DATA_URI } from "./transitionSoundData";
import "./black-hole-transition.css";

type MapMode = "2d" | "3d";
type GlobeBridge = {
  getMode: () => MapMode;
  setMode: (mode: MapMode) => Promise<void>;
  sync: () => void;
};

type Star = {
  x: number;
  y: number;
  size: number;
  alpha: number;
  phase: number;
  depth: number;
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

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function smoothstep(value: number): number {
  const amount = clamp(value);
  return amount * amount * (3 - 2 * amount);
}

function easeInCubic(value: number): number {
  return value * value * value;
}

function easeInOutCubic(value: number): number {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
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

function createStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: 0.35 + Math.random() * 1.4,
    alpha: 0.18 + Math.random() * 0.65,
    phase: Math.random() * Math.PI * 2,
    depth: 0.35 + Math.random() * 1.35,
  }));
}

function drawSpace(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  stars: Star[],
  progress: number,
  elapsedSeconds: number,
): void {
  const background = context.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    Math.max(width, height) * 0.82,
  );
  background.addColorStop(0, "#250044");
  background.addColorStop(0.34, "#120022");
  background.addColorStop(0.72, "#05000d");
  background.addColorStop(1, "#010005");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalCompositeOperation = "screen";

  for (const star of stars) {
    const sourceX = star.x * width;
    const sourceY = star.y * height;
    const deltaX = sourceX - centerX;
    const deltaY = sourceY - centerY;
    const pull = 1 + easeInCubic(progress) * star.depth * 0.88;
    const x = centerX + deltaX * pull;
    const y = centerY + deltaY * pull;
    const trail = progress * progress * star.depth * 16;
    const distance = Math.max(1, Math.hypot(deltaX, deltaY));
    const unitX = deltaX / distance;
    const unitY = deltaY / distance;
    const twinkle = 0.72 + Math.sin(elapsedSeconds * 3.2 + star.phase) * 0.28;
    const alpha = star.alpha * twinkle * (1 - progress * 0.62);

    context.strokeStyle = `rgba(255,225,255,${alpha})`;
    context.lineWidth = star.size;
    context.beginPath();
    context.moveTo(x - unitX * trail, y - unitY * trail);
    context.lineTo(x, y);
    context.stroke();
  }

  context.restore();
}

function ringColor(position: number, alpha: number): string {
  if (position < 0.18) return `rgba(176,42,255,${alpha})`;
  if (position < 0.36) return `rgba(247,54,178,${alpha})`;
  if (position < 0.58) return `rgba(255,91,41,${alpha})`;
  if (position < 0.78) return `rgba(255,171,30,${alpha})`;
  if (position < 0.92) return `rgba(255,232,82,${alpha})`;
  return `rgba(255,255,232,${alpha})`;
}

function drawAccretionDisk(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  progress: number,
  elapsedSeconds: number,
): void {
  const travel = easeInOutCubic(progress);
  const finalMorph = smoothstep((progress - 0.66) / 0.34);
  const baseRadius = Math.min(width * 0.42, height * 0.58);
  const zoom = lerp(0.98, 1.74, easeInCubic(progress));
  const radius = baseRadius * zoom;
  const tilt = lerp(0.34, 0.97, travel);
  const diskCenterY = lerp(centerY + height * 0.035, centerY, finalMorph);
  const rotation = elapsedSeconds * 0.24;

  context.save();
  context.translate(centerX, diskCenterY);
  context.rotate(-0.12 + rotation * 0.08);
  context.globalCompositeOperation = "lighter";

  const aura = context.createRadialGradient(0, 0, radius * 0.18, 0, 0, radius * 1.46);
  aura.addColorStop(0, "rgba(255,246,182,0.18)");
  aura.addColorStop(0.3, "rgba(255,128,26,0.13)");
  aura.addColorStop(0.55, "rgba(237,41,154,0.11)");
  aura.addColorStop(0.76, "rgba(114,30,213,0.09)");
  aura.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = aura;
  context.beginPath();
  context.ellipse(0, 0, radius * 1.42, radius * tilt * 1.42, 0, 0, Math.PI * 2);
  context.fill();

  const bandCount = 26;
  for (let index = 0; index < bandCount; index += 1) {
    const normalized = index / (bandCount - 1);
    const scale = lerp(1.22, 0.39, normalized);
    const heat = Math.pow(normalized, 0.78);
    const alpha = lerp(0.38, 0.94, heat) * lerp(0.92, 0.74, finalMorph);
    const lineWidth = radius * lerp(0.018, 0.036, heat);
    const localRotation = rotation * (0.34 + normalized * 1.35) + index * 0.035;

    context.save();
    context.rotate(localRotation);
    context.strokeStyle = ringColor(normalized, alpha);
    context.lineWidth = lineWidth;
    context.shadowBlur = radius * lerp(0.018, 0.045, heat);
    context.shadowColor = ringColor(normalized, 0.88);
    context.beginPath();
    context.ellipse(0, 0, radius * scale, radius * scale * tilt, 0, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  const highlightScales = [1.1, 0.93, 0.76, 0.59, 0.48];
  highlightScales.forEach((scale, index) => {
    context.save();
    context.rotate(-rotation * (0.7 + index * 0.18) - index * 0.44);
    context.strokeStyle = index < 2
      ? "rgba(255,194,61,0.88)"
      : "rgba(255,255,238,0.94)";
    context.lineWidth = radius * (index < 2 ? 0.014 : 0.011);
    context.shadowBlur = radius * 0.035;
    context.shadowColor = index < 2
      ? "rgba(255,107,29,0.95)"
      : "rgba(255,249,191,0.95)";
    context.setLineDash([
      radius * lerp(0.34, 0.16, index / 4),
      radius * lerp(0.11, 0.055, index / 4),
    ]);
    context.lineDashOffset = -elapsedSeconds * radius * (0.13 + index * 0.035);
    context.beginPath();
    context.ellipse(0, 0, radius * scale, radius * scale * tilt, 0, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  });

  context.restore();

  const horizonRadius = radius * lerp(0.095, 0.38, smoothstep((progress - 0.12) / 0.88));
  const horizonYRadius = horizonRadius * lerp(tilt, 1, finalMorph);

  context.save();
  context.translate(centerX, diskCenterY);

  const lensGlow = context.createRadialGradient(
    0,
    0,
    horizonRadius * 0.72,
    0,
    0,
    horizonRadius * 1.75,
  );
  lensGlow.addColorStop(0, "rgba(0,0,0,0)");
  lensGlow.addColorStop(0.46, "rgba(0,0,0,0)");
  lensGlow.addColorStop(0.62, `rgba(255,255,225,${0.5 + finalMorph * 0.4})`);
  lensGlow.addColorStop(0.72, `rgba(255,218,58,${0.46 + finalMorph * 0.34})`);
  lensGlow.addColorStop(0.84, `rgba(255,91,34,${0.25 + finalMorph * 0.35})`);
  lensGlow.addColorStop(0.94, `rgba(223,35,180,${0.12 + finalMorph * 0.26})`);
  lensGlow.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = lensGlow;
  context.beginPath();
  context.ellipse(0, 0, horizonRadius * 1.86, horizonYRadius * 1.86, 0, 0, Math.PI * 2);
  context.fill();

  const finalRingAlpha = lerp(0.24, 1, finalMorph);
  const finalRingWidths = [0.19, 0.125, 0.065];
  const finalRingColors = [
    `rgba(228,34,186,${0.34 * finalRingAlpha})`,
    `rgba(255,112,24,${0.68 * finalRingAlpha})`,
    `rgba(255,246,184,${0.96 * finalRingAlpha})`,
  ];

  finalRingWidths.forEach((widthFactor, index) => {
    context.strokeStyle = finalRingColors[index];
    context.lineWidth = horizonRadius * widthFactor;
    context.shadowBlur = horizonRadius * (0.18 - index * 0.035);
    context.shadowColor = finalRingColors[index];
    context.beginPath();
    context.ellipse(
      0,
      0,
      horizonRadius * (1.22 + index * 0.045),
      horizonYRadius * (1.22 + index * 0.045),
      0,
      0,
      Math.PI * 2,
    );
    context.stroke();
  });

  context.globalCompositeOperation = "source-over";
  context.fillStyle = "#000000";
  context.shadowBlur = horizonRadius * 0.1;
  context.shadowColor = "rgba(0,0,0,1)";
  context.beginPath();
  context.ellipse(0, 0, horizonRadius, horizonYRadius, 0, 0, Math.PI * 2);
  context.fill();

  context.restore();
}

function beginBlackHole(targetMode: MapMode): {
  complete: () => Promise<void>;
  fail: (message: string) => Promise<void>;
  stop: () => void;
} {
  const overlay = ensureOverlay();
  const canvas = overlay.querySelector<HTMLCanvasElement>(".dual-engine-vortex-canvas");
  const context = canvas?.getContext("2d", { alpha: false });
  const title = overlay.querySelector<HTMLElement>(".dual-engine-vortex-copy strong");
  const detail = overlay.querySelector<HTMLElement>(".dual-engine-vortex-copy small");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const duration = reducedMotion ? 480 : 2200;
  const stars = createStars(reducedMotion ? 24 : 118);

  if (title) title.textContent = targetMode === "3d" ? "Entering the black hole" : "Crossing back through the black hole";
  if (detail) detail.textContent = targetMode === "3d"
    ? "Falling through the luminous accretion disk…"
    : "Falling through to the flat Mapbox view…";

  overlay.className = `dual-engine-vortex active ${targetMode === "3d" ? "entering" : "exiting"}`;
  overlay.setAttribute("aria-hidden", "false");

  let stopped = false;
  let frame = 0;
  let width = window.innerWidth;
  let height = window.innerHeight;
  let ratio = Math.min(window.devicePixelRatio || 1, 2);
  let centerX = width / 2;
  let centerY = height / 2;
  const startedAt = performance.now();
  let finalFrameResolved = false;
  let resolveFinalFrame: () => void = () => undefined;
  const finalFrame = new Promise<void>((resolve) => {
    resolveFinalFrame = resolve;
  });

  const resize = () => {
    if (!canvas || !context) return;
    width = window.innerWidth;
    height = window.innerHeight;
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    centerX = width / 2;
    centerY = height / 2;
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const render = (now: number) => {
    if (stopped || !canvas || !context) return;

    const elapsed = now - startedAt;
    const progress = clamp(elapsed / duration);
    context.clearRect(0, 0, width, height);
    drawSpace(context, width, height, centerX, centerY, stars, progress, elapsed / 1000);
    drawAccretionDisk(context, width, height, centerX, centerY, progress, elapsed / 1000);

    if (progress >= 1 && !finalFrameResolved) {
      finalFrameResolved = true;
      resolveFinalFrame();
      overlay.classList.add("black-hole-final");
    }

    frame = window.requestAnimationFrame(render);
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    if (!finalFrameResolved) {
      finalFrameResolved = true;
      resolveFinalFrame();
    }
    overlay.className = "dual-engine-vortex";
    overlay.setAttribute("aria-hidden", "true");
  };

  const complete = async () => {
    await finalFrame;
    await delay(reducedMotion ? 40 : 150);
    overlay.classList.add("revealing");
    await delay(reducedMotion ? 80 : 340);
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
  if (context) {
    frame = window.requestAnimationFrame(render);
  } else {
    finalFrameResolved = true;
    resolveFinalFrame();
  }

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

  const blackHole = beginBlackHole(targetMode);
  playTransitionSound();
  setControlStatus(
    control,
    targetMode === "3d" ? "Opening Mapbox globe…" : "Returning to Mapbox 2D…",
    "loading",
  );

  try {
    await delay(360);
    await api.setMode(targetMode);
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline && !engineReady(targetMode, control)) await delay(80);
    if (!engineReady(targetMode, control)) {
      throw new Error(`${targetMode === "3d" ? "Mapbox globe" : "Mapbox 2D map"} did not become ready`);
    }

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
