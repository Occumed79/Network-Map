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
  installed = true;
  schedule();
  document.addEventListener("click", schedule, true);
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
}

installModalLabelScrubber();
