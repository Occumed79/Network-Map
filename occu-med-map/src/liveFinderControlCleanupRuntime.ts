const CLEANUP_DELAYS_MS = [0, 80, 220, 500, 1000];
let cleanupGeneration = 0;
let cleanupTimers: number[] = [];

function normalizedLabel(button: HTMLButtonElement): string {
  return (button.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function cleanControls(): void {
  const targetLabel = ["leadership", "export"].join(" ");
  document.querySelectorAll<HTMLButtonElement>(".live-panel button").forEach((button) => {
    if (normalizedLabel(button) !== targetLabel) return;
    const wrapper = button.parentElement;
    button.remove();
    if (wrapper && wrapper.children.length === 0 && !wrapper.textContent?.trim()) wrapper.remove();
  });
}

function clearCleanupTimers(): void {
  cleanupTimers.forEach((timer) => window.clearTimeout(timer));
  cleanupTimers = [];
}

function scheduleCleanup(): void {
  cleanupGeneration += 1;
  const generation = cleanupGeneration;
  clearCleanupTimers();
  CLEANUP_DELAYS_MS.forEach((delay) => {
    cleanupTimers.push(window.setTimeout(() => {
      if (generation !== cleanupGeneration) return;
      cleanControls();
    }, delay));
  });
}

function handleWorkspace(event: Event): void {
  const tab = (event as CustomEvent<{ tab?: string }>).detail?.tab;
  if (tab === "liveFinder") scheduleCleanup();
}

function handleClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const finderTab = target.closest<HTMLButtonElement>(".occumed-sidebar-workspace-tab[data-workspace-tab='liveFinder']");
  if (finderTab) scheduleCleanup();
}

function cleanup(): void {
  cleanupGeneration += 1;
  clearCleanupTimers();
  window.removeEventListener("network-map:sidebar-workspace", handleWorkspace);
  document.removeEventListener("click", handleClick, true);
}

function install(): void {
  window.addEventListener("network-map:sidebar-workspace", handleWorkspace);
  document.addEventListener("click", handleClick, true);
  window.addEventListener("beforeunload", cleanup, { once: true });
  scheduleCleanup();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
else install();

export {};
