let observer: MutationObserver | null = null;
let queued = false;

function cleanControls(): void {
  const targetLabel = ["leadership", "export"].join(" ");
  document.querySelectorAll<HTMLButtonElement>(".live-panel button").forEach((button) => {
    const label = (button.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (label !== targetLabel) return;
    const wrapper = button.parentElement;
    button.remove();
    if (wrapper && wrapper.children.length === 0 && !wrapper.textContent?.trim()) wrapper.remove();
  });
}

function scheduleClean(): void {
  if (queued) return;
  queued = true;
  window.requestAnimationFrame(() => {
    queued = false;
    cleanControls();
  });
}

function install(): void {
  cleanControls();
  if (!document.body || observer) return;
  observer = new MutationObserver(scheduleClean);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("beforeunload", () => observer?.disconnect(), { once: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
else install();

export {};
