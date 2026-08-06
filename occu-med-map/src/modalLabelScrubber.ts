import { registerRuntimeOwner, subscribeToSharedDomObserver } from "./runtimeControllerRegistry";

let installed = false;
let queued = false;

const SYMBOLS = /[📋💰🎯🩺⭐✓⏳▶▸↓●◈○◉🚗📞↗]/g;

function cleanText(node: HTMLElement): void {
  const current = node.textContent || "";
  const next = current.replace(SYMBOLS, "").replace(/\s+/g, " ").trim();
  if (next && next !== current.trim()) node.textContent = next;
}

function scrubModalLabels(): void {
  document.querySelectorAll<HTMLElement>(".modal-box button, .modal-box a, .modal-box .dir-app-name, .modal-box .dir-app-tag").forEach(cleanText);
}

function schedule(): void {
  if (queued) return;
  queued = true;
  window.setTimeout(() => {
    queued = false;
    scrubModalLabels();
  }, 120);
}

export function installModalLabelScrubber(): void {
  if (installed) return;
  if (!registerRuntimeOwner("modal-label-scrubber", "Legacy modal label cleanup")) return;
  installed = true;
  schedule();
  document.addEventListener("click", schedule, true);
  subscribeToSharedDomObserver("modal-label-scrubber", (mutations) => {
    if (!mutations.some((mutation) => {
      const target = mutation.target instanceof Element ? mutation.target : null;
      return Boolean(target?.closest(".modal-box") || Array.from(mutation.addedNodes).some((node) => node instanceof Element && Boolean(node.matches(".modal-box, .modal-box *") || node.querySelector(".modal-box"))));
    })) return;
    schedule();
  });
}

installModalLabelScrubber();
