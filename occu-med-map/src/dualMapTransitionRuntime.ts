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
      <small>Falling toward the event horizon…</small>
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
    Math.max(width, height) * 0.9,
  );
  background.addColorStop(0, "#21083d");
  background.addColorStop(0.4, "#10031f");
  background.addColorStop(0.76, "#05000d");
  background.addColorStop(1, "#010004");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const plunge = easeInCubic(progress);
  context.save();
  context.globalCompositeOperation = "screen";
  for (const star of stars) {
    const sourceX = star.x * width;
    const sourceY = star.y * height;
    const deltaX = sourceX - centerX;
    const deltaY = sourceY - centerY;
    const distance = Math.max(1, Math.hypot(deltaX, deltaY));
    const unitX = deltaX / distance;
    const unitY = deltaY / distance;
    const expansion = 1 + plunge * star.depth * 1.8;
    const x = centerX + deltaX * expansion;
    const y = centerY + deltaY * expansion;
    const trail = plunge * plunge * star.depth * Math.max(width, height) * 0.075;
    const twinkle = 0.7 + Math.sin(elapsedSeconds * 3.2 + star.phase) * 0.3;
    const alpha = star.alpha * twinkle * (1 - progress * 0.72);

    context.strokeStyle = `rgba(255,231,255,${alpha})`;
    context.lineWidth = star.size * lerp(1, 1.8, plunge);
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

function drawFlowingBand(
  context: CanvasRenderingContext2D,
  radius: number,
  phase: number,
  opacity: number,
): void {
  const depth = Math.pow(phase, 1.72);
  const scale = lerp(0.14, 3.15, depth);
  const fade = Math.pow(Math.sin(Math.PI * phase), 0.58);
  const heat = 1 - phase;
  const alpha = opacity * fade * lerp(0.54, 1, heat);

  context.strokeStyle = diskColor(heat, alpha);
  context.lineWidth = radius * lerp(0.009, 0.036, depth);
  context.shadowBlur = radius * lerp(0.018, 0.055, heat);
  context.shadowColor = diskColor(heat, alpha * 0.92);
  context.setLineDash([]);
  context.beginPath();
  context.arc(0, 0, radius * scale, 0, Math.PI * 2);
  context.stroke();
}

function drawFlowingHighlights(
  context: CanvasRenderingContext2D,
  radius: number,
  progress: number,
  elapsedSeconds: number,
  opacity: number,
): void {
  for (let index = 0; index < 9; index += 1) {
    const phase = (index / 9 + progress * 1.9) % 1;
    const depth = Math.pow(phase, 1.65);
    const scale = lerp(0.18, 3.05, depth);
    const fade = Math.pow(Math.sin(Math.PI * phase), 0.8);
    const warm = index % 3 !== 2;

    context.strokeStyle = warm
      ? `rgba(255,210,92,${opacity * fade * 0.95})`
      : `rgba(255,254,232,${opacity * fade})`;
    context.lineWidth = radius * lerp(0.01, 0.025, depth);
    context.shadowBlur = radius * 0.038;
    context.shadowColor = warm
      ? "rgba(255,118,34,0.92)"
      : "rgba(255,248,210,0.98)";
    context.setLineDash([
      radius * lerp(0.1, 0.42, depth),
      radius * lerp(0.055, 0.16, depth),
    ]);
    context.lineDashOffset = -elapsedSeconds * radius * (0.22 + index * 0.018);
    context.beginPath();
    context.arc(0, 0, radius * scale, 0, Math.PI * 2);
    context.stroke();
  }
  context.setLineDash([]);
}

function drawNearLightStreaks(
  context: CanvasRenderingContext2D,
  radius: number,
  horizonRadius: number,
  progress: number,
  elapsedSeconds: number,
): void {
  const intensity = smoothstep((progress - 0.38) / 0.62);
  if (intensity <= 0) return;

  context.save();
  context.globalCompositeOperation = "screen";
  for (let index = 0; index < 18; index += 1) {
    const angle = index * 2.3999632297 + elapsedSeconds * (0.12 + (index % 4) * 0.014);
    const start = horizonRadius * lerp(1.35, 1.05, intensity);
    const length = radius * lerp(0.18, 1.15, intensity) * (0.65 + (index % 5) * 0.08);
    const x1 = Math.cos(angle) * start;
    const y1 = Math.sin(angle) * start;
    const x2 = Math.cos(angle) * (start + length);
    const y2 = Math.sin(angle) * (start + length);
    const gradient = context.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, `rgba(255,250,224,${0.86 * intensity})`);
    gradient.addColorStop(0.35, `rgba(255,164,68,${0.62 * intensity})`);
    gradient.addColorStop(0.72, `rgba(255,82,214,${0.26 * intensity})`);
    gradient.addColorStop(1, "rgba(220,46,208,0)");
    context.strokeStyle = gradient;
    context.lineWidth = radius * (0.0055 + (index % 3) * 0.002);
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  }
  context.restore();
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
  const plunge = easeInCubic(progress);
  const baseRadius = Math.min(width * 0.42, height * 0.58);
  const radius = baseRadius * lerp(0.98, 1.08, smoothstep(progress));

  // Keep the same angled camera perspective throughout the entire plunge.
  // Forward motion comes from the rings and stars streaming past the viewer,
  // never from rotating or flattening the black hole toward the screen.
  const tilt = 0.38;
  const diskRotation = -0.12;
  const driftX = Math.sin(progress * Math.PI * 2.2) * width * 0.004;
  const driftY = lerp(height * 0.05, height * 0.015, smoothstep(progress));
  const diskCenterX = centerX + driftX;
  const diskCenterY = centerY + driftY;
  const diskOpacity = lerp(1, 0.92, smoothstep(progress));

  context.save();
  context.translate(diskCenterX, diskCenterY);
  context.rotate(diskRotation);
  context.scale(1, tilt);

  const aura = context.createRadialGradient(0, 0, radius * 0.06, 0, 0, radius * 1.75);
  aura.addColorStop(0, "rgba(255,239,163,0.18)");
  aura.addColorStop(0.28, "rgba(255,121,40,0.17)");
  aura.addColorStop(0.56, "rgba(229,39,181,0.14)");
  aura.addColorStop(0.82, "rgba(87,31,170,0.11)");
  aura.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = aura;
  context.beginPath();
  context.arc(0, 0, radius * 1.72, 0, Math.PI * 2);
  context.fill();

  const bandCount = 36;
  for (let index = 0; index < bandCount; index += 1) {
    const phase = (index / bandCount + plunge * 1.52) % 1;
    drawFlowingBand(context, radius, phase, diskOpacity);
  }

  drawFlowingHighlights(context, radius, progress, elapsedSeconds, diskOpacity);

  context.restore();

  const horizonProgress = easeInOutCubic(progress);
  const horizonRadius = Math.min(width, height) * lerp(0.07, 0.36, horizonProgress);
  const horizonAspect = tilt;

  context.save();
  context.translate(diskCenterX, diskCenterY);
  context.rotate(diskRotation);
  context.scale(1, horizonAspect);

  const halo = context.createRadialGradient(
    0,
    0,
    horizonRadius * 0.84,
    0,
    0,
    horizonRadius * 1.74,
  );
  halo.addColorStop(0, "rgba(0,0,0,0)");
  halo.addColorStop(0.5, "rgba(0,0,0,0)");
  halo.addColorStop(0.63, `rgba(255,250,224,${0.56 + progress * 0.22})`);
  halo.addColorStop(0.73, `rgba(255,192,72,${0.5 + progress * 0.2})`);
  halo.addColorStop(0.88, `rgba(236,56,190,${0.27 + progress * 0.14})`);
  halo.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = halo;
  context.beginPath();
  context.arc(0, 0, horizonRadius * 1.76, 0, Math.PI * 2);
  context.fill();

  drawNearLightStreaks(context, radius, horizonRadius, progress, elapsedSeconds);

  context.strokeStyle = `rgba(255,240,152,${0.74 + progress * 0.24})`;
  context.lineWidth = horizonRadius * lerp(0.082, 0.118, progress);
  context.shadowBlur = horizonRadius * 0.22;
  context.shadowColor = "rgba(255,150,48,0.84)";
  context.beginPath();
  context.arc(0, 0, horizonRadius * 1.15, 0, Math.PI * 2);
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
  const duration = reducedMotion ? 650 : 3200;
  const stars = createStars(reducedMotion ? 24 : 115);

  if (title) title.textContent = "Entering the black hole";
  if (detail) detail.textContent = targetMode === "3d"
    ? "Falling toward the Mapbox globe…"
    : "Falling through to the Mapbox 2D view…";

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
    await delay(reducedMotion ? 40 : 110);
    overlay.classList.add("revealing");
    await delay(reducedMotion ? 80 : 280);
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
