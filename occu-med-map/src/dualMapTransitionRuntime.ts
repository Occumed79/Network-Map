import { TRANSITION_SOUND_DATA_URI } from "./transitionSoundData";
import type { BlackHoleTransition } from "./blackHoleWebGLRuntime";

type MapMode = "2d" | "3d";
type GlobeBridge = {
  getMode: () => MapMode;
  setMode: (mode: MapMode) => Promise<void>;
  sync: () => void;
};

type BlackHoleRendererModule = typeof import("./blackHoleWebGLRuntime");

declare global {
  interface Window {
    __NETWORK_MAP_GLOBE__?: GlobeBridge;
  }
}

let transitionRunning = false;
let transitionAudio: HTMLAudioElement | null = null;
let rendererModulePromise: Promise<BlackHoleRendererModule> | null = null;

function loadBlackHoleRenderer(): Promise<BlackHoleRendererModule> {
  rendererModulePromise ||= import("./blackHoleWebGLRuntime");
  return rendererModulePromise;
}

function installRendererPreload(): void {
  const preload = (event: PointerEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest(".map-dimension-toggle button[data-map-mode='3d']")) return;
    document.removeEventListener("pointerover", preload);
    void loadBlackHoleRenderer();
  };
  document.addEventListener("pointerover", preload, { passive: true });
}

function playTransitionSound(): void {
  // Keep playback directly on the media element. The old MediaElementSource /
  // AudioContext amplification path could leave Safari with a suspended graph
  // and no audible output even though audio.play() resolved.
  const audio = transitionAudio || new Audio();
  if (!transitionAudio) {
    audio.src = TRANSITION_SOUND_DATA_URI;
    audio.preload = "auto";
    audio.setAttribute("playsinline", "");
    transitionAudio = audio;
  }

  audio.pause();
  audio.currentTime = 0;
  audio.muted = false;
  audio.volume = 0.92;
  audio.playbackRate = 0.94;

  // This function is called synchronously from the user's map-mode click,
  // satisfying Chrome and Safari's user-activation requirement.
  void audio.play().catch((error) => {
    console.warn("Transition sound could not start", error);
  });
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
  overlay.innerHTML = [
    '<canvas class="dual-engine-vortex-canvas" aria-hidden="true"></canvas>',
    '<div class="dual-engine-vortex-copy" role="status" aria-live="polite">',
    "<strong>Entering the black hole</strong>",
    "<small>Falling toward the event horizon…</small>",
    "</div>",
  ].join("");
  document.body.appendChild(overlay);
  return overlay;
}

function beginBlackHole(targetMode: MapMode): {
  complete: () => Promise<void>;
  fail: (message: string) => Promise<void>;
  stop: () => void;
} {
  const overlay = ensureOverlay();
  const canvas = overlay.querySelector<HTMLCanvasElement>(".dual-engine-vortex-canvas");
  const title = overlay.querySelector<HTMLElement>(".dual-engine-vortex-copy strong");
  const detail = overlay.querySelector<HTMLElement>(".dual-engine-vortex-copy small");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const durationMs = reducedMotion ? 650 : 4100;

  if (title) title.textContent = targetMode === "3d"
    ? "Entering the black hole"
    : "Crossing the event horizon";
  if (detail) detail.textContent = targetMode === "3d"
    ? "Falling toward the Mapbox globe…"
    : "Falling through to the Mapbox 2D view…";

  overlay.className = `dual-engine-vortex active ${targetMode === "3d" ? "entering" : "exiting"}`;
  overlay.setAttribute("aria-hidden", "false");

  let stopped = false;
  let renderer: BlackHoleTransition | null = null;
  let fallbackTimer = 0;
  let finalFrameResolved = false;
  let resolveFinalFrame: () => void = () => undefined;
  const finalFrame = new Promise<void>((resolve) => {
    resolveFinalFrame = resolve;
  });

  const finishFrame = () => {
    if (finalFrameResolved) return;
    finalFrameResolved = true;
    window.clearTimeout(fallbackTimer);
    overlay.classList.add("black-hole-final");
    resolveFinalFrame();
  };

  fallbackTimer = window.setTimeout(finishFrame, durationMs + 1400);

  if (!canvas) {
    finishFrame();
  } else {
    void loadBlackHoleRenderer()
      .then(({ startBlackHoleTransition }) => {
        if (stopped) return;
        renderer = startBlackHoleTransition(canvas, { durationMs, reducedMotion });
        void renderer.finished.then(finishFrame);
      })
      .catch((error) => {
        console.error("GPU black-hole transition could not start", error);
        overlay.classList.add("renderer-failed");
        if (detail) detail.textContent = "Preparing the map engine…";
        window.setTimeout(finishFrame, reducedMotion ? 40 : 520);
      });
  }

  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.clearTimeout(fallbackTimer);
    renderer?.dispose();
    renderer = null;
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

  return { complete, fail, stop };
}

export async function switchMapModeWithTransition(
  targetMode: MapMode,
  control: HTMLElement,
): Promise<void> {
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

  // Both calls happen before the first await, while the click still carries
  // transient browser user activation.
  playTransitionSound();
  const blackHole = beginBlackHole(targetMode);
  setControlStatus(
    control,
    targetMode === "3d" ? "Opening Mapbox globe…" : "Returning to Mapbox 2D…",
    "loading",
  );

  try {
    await delay(260);
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

installRendererPreload();
