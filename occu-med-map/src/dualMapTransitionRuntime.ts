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
    webkitAudioContext?: typeof AudioContext;
  }
}

let transitionRunning = false;
const transitionAudio = new Audio(TRANSITION_SOUND_DATA_URI);
transitionAudio.preload = "auto";
transitionAudio.volume = 1;
transitionAudio.load();

let audioContext: AudioContext | null = null;
let audioGain: GainNode | null = null;
let audioGraphConnected = false;

function ensureAudioGraph(): void {
  if (audioGraphConnected) return;
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) return;

  try {
    audioContext = audioContext || new AudioContextConstructor();
    const source = audioContext.createMediaElementSource(transitionAudio);
    audioGain = audioContext.createGain();
    audioGain.gain.value = 1.35;
    source.connect(audioGain);
    audioGain.connect(audioContext.destination);
    audioGraphConnected = true;
  } catch (error) {
    console.warn("Transition audio amplification was unavailable", error);
    audioContext = null;
    audioGain = null;
  }
}

function playTransitionSound(): void {
  transitionAudio.pause();
  transitionAudio.currentTime = 0;
  transitionAudio.muted = false;
  transitionAudio.volume = 1;
  ensureAudioGraph();

  const startPlayback = () => {
    void transitionAudio.play().catch((error) => {
      console.warn("Transition sound could not start", error);
    });
  };

  if (audioContext?.state === "suspended") {
    void audioContext.resume().then(startPlayback, startPlayback);
  } else {
    startPlayback();
  }
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
    size: 0.35 + Math.random() * 1.25,
    alpha: 0.2 + Math.random() * 0.55,
    phase: Math.random() * Math.PI * 2,
    depth: 0.35 + Math.random() * 1.3,
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
    Math.max(width, height) * 0.86,
  );
  background.addColorStop(0, "#1f0739");
  background.addColorStop(0.42, "#10031f");
  background.addColorStop(0.78, "#05000d");
  background.addColorStop(1, "#010004");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.save();
  for (const star of stars) {
    const sourceX = star.x * width;
    const sourceY = star.y * height;
    const deltaX = sourceX - centerX;
    const deltaY = sourceY - centerY;
    const distance = Math.max(1, Math.hypot(deltaX, deltaY));
    const unitX = deltaX / distance;
    const unitY = deltaY / distance;
    const pull = 1 + easeInCubic(progress) * star.depth * 0.72;
    const x = centerX + deltaX * pull;
    const y = centerY + deltaY * pull;
    const trail = progress * progress * star.depth * 13;
    const twinkle = 0.72 + Math.sin(elapsedSeconds * 2.9 + star.phase) * 0.28;
    const alpha = star.alpha * twinkle * (1 - progress * 0.58);

    context.strokeStyle = `rgba(255,232,255,${alpha})`;
    context.lineWidth = star.size;
    context.beginPath();
    context.moveTo(x - unitX * trail, y - unitY * trail);
    context.lineTo(x, y);
    context.stroke();
  }
  context.restore();
}

function diskColor(position: number, alpha: number): string {
  if (position < 0.2) return `rgba(100,35,190,${alpha})`;
  if (position < 0.38) return `rgba(206,39,196,${alpha})`;
  if (position < 0.58) return `rgba(255,74,122,${alpha})`;
  if (position < 0.77) return `rgba(255,132,48,${alpha})`;
  if (position < 0.92) return `rgba(255,202,66,${alpha})`;
  return `rgba(255,244,188,${alpha})`;
}

function drawDiskBand(
  context: CanvasRenderingContext2D,
  radius: number,
  position: number,
  opacity: number,
): void {
  const scale = lerp(1.22, 0.43, position);
  const heat = Math.pow(position, 0.82);
  const lineWidth = radius * lerp(0.018, 0.034, heat);
  const color = diskColor(position, opacity * lerp(0.48, 0.88, heat));

  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.shadowBlur = radius * lerp(0.01, 0.027, heat);
  context.shadowColor = diskColor(position, opacity * 0.62);
  context.setLineDash([]);
  context.beginPath();
  context.arc(0, 0, radius * scale, 0, Math.PI * 2);
  context.stroke();
}

function drawMovingHighlights(
  context: CanvasRenderingContext2D,
  radius: number,
  elapsedSeconds: number,
  opacity: number,
): void {
  const highlightRadii = [1.12, 0.98, 0.83, 0.68, 0.56, 0.48];

  highlightRadii.forEach((scale, index) => {
    const warm = index < 3;
    context.strokeStyle = warm
      ? `rgba(255,195,78,${opacity * 0.82})`
      : `rgba(255,250,218,${opacity * 0.9})`;
    context.lineWidth = radius * (warm ? 0.012 : 0.009);
    context.shadowBlur = radius * 0.018;
    context.shadowColor = warm
      ? "rgba(255,112,38,0.72)"
      : "rgba(255,247,196,0.78)";
    context.setLineDash([
      radius * lerp(0.24, 0.12, index / 5),
      radius * lerp(0.11, 0.055, index / 5),
    ]);
    context.lineDashOffset = -elapsedSeconds * radius * (0.18 + index * 0.025);
    context.beginPath();
    context.arc(0, 0, radius * scale, 0, Math.PI * 2);
    context.stroke();
  });

  context.setLineDash([]);
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
  const finalMorph = smoothstep((progress - 0.62) / 0.38);
  const approach = easeInCubic(progress);
  const baseRadius = Math.min(width * 0.39, height * 0.56);
  const radius = baseRadius * lerp(0.96, 2.05, approach);
  const tilt = lerp(0.39, 0.98, finalMorph);
  const diskOpacity = lerp(1, 0.82, finalMorph);
  const diskCenterY = lerp(centerY + height * 0.035, centerY, finalMorph);
  const diskRotation = lerp(-0.14, -0.02, finalMorph);

  context.save();
  context.translate(centerX, diskCenterY);
  context.rotate(diskRotation);
  context.scale(1, tilt);

  const aura = context.createRadialGradient(0, 0, radius * 0.12, 0, 0, radius * 1.5);
  aura.addColorStop(0, "rgba(255,236,153,0.14)");
  aura.addColorStop(0.34, "rgba(255,119,38,0.12)");
  aura.addColorStop(0.58, "rgba(232,37,173,0.09)");
  aura.addColorStop(0.82, "rgba(92,32,172,0.07)");
  aura.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = aura;
  context.beginPath();
  context.arc(0, 0, radius * 1.48, 0, Math.PI * 2);
  context.fill();

  const bandCount = 28;
  for (let index = 0; index < bandCount; index += 1) {
    drawDiskBand(context, radius, index / (bandCount - 1), diskOpacity);
  }

  drawMovingHighlights(context, radius, elapsedSeconds, diskOpacity);

  context.strokeStyle = `rgba(255,252,225,${lerp(0.66, 0.86, travel)})`;
  context.lineWidth = radius * 0.022;
  context.shadowBlur = radius * 0.03;
  context.shadowColor = "rgba(255,212,98,0.72)";
  context.beginPath();
  context.arc(0, 0, radius * 0.51, Math.PI * 1.08, Math.PI * 1.92);
  context.stroke();

  context.restore();

  const horizonRadius = radius * lerp(0.105, 0.36, smoothstep((progress - 0.08) / 0.92));
  const horizonAspect = lerp(tilt, 1, finalMorph);

  context.save();
  context.translate(centerX, diskCenterY);
  context.rotate(diskRotation);
  context.scale(1, horizonAspect);

  const halo = context.createRadialGradient(
    0,
    0,
    horizonRadius * 0.86,
    0,
    0,
    horizonRadius * 1.62,
  );
  halo.addColorStop(0, "rgba(0,0,0,0)");
  halo.addColorStop(0.54, "rgba(0,0,0,0)");
  halo.addColorStop(0.68, `rgba(255,246,198,${0.52 + finalMorph * 0.22})`);
  halo.addColorStop(0.78, `rgba(255,190,67,${0.42 + finalMorph * 0.2})`);
  halo.addColorStop(0.9, `rgba(237,52,174,${0.18 + finalMorph * 0.18})`);
  halo.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = halo;
  context.beginPath();
  context.arc(0, 0, horizonRadius * 1.65, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = `rgba(255,232,121,${0.62 + finalMorph * 0.3})`;
  context.lineWidth = horizonRadius * lerp(0.1, 0.14, finalMorph);
  context.shadowBlur = horizonRadius * 0.18;
  context.shadowColor = "rgba(255,154,48,0.66)";
  context.beginPath();
  context.arc(0, 0, horizonRadius * 1.18, 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = "#000000";
  context.shadowBlur = horizonRadius * 0.08;
  context.shadowColor = "rgba(0,0,0,1)";
  context.beginPath();
  context.arc(0, 0, horizonRadius, 0, Math.PI * 2);
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
  const duration = reducedMotion ? 520 : 2380;
  const stars = createStars(reducedMotion ? 24 : 105);

  if (title) title.textContent = targetMode === "3d" ? "Entering the black hole" : "Crossing through the black hole";
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
    await delay(reducedMotion ? 40 : 130);
    overlay.classList.add("revealing");
    await delay(reducedMotion ? 80 : 320);
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

  playTransitionSound();
  const blackHole = beginBlackHole(targetMode);
  setControlStatus(
    control,
    targetMode === "3d" ? "Opening Mapbox globe…" : "Returning to Mapbox 2D…",
    "loading",
  );

  try {
    await delay(320);
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
