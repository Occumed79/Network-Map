let installed = false;

function normalizedText(el: Element): string {
  return (el.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function tagSecondaryControls(root: Element): void {
  const inner = root.querySelector(".lp-inner");
  if (!inner || inner.getAttribute("data-compact-tagged") === "true") return;
  inner.setAttribute("data-compact-tagged", "true");
  inner.classList.add("occumed-live-panel-compact");

  Array.from(inner.children).forEach((child) => {
    const text = normalizedText(child);
    const hasResultMarkup = Boolean(child.querySelector(".lp-name, .lp-addr, .lp-row1, .lp-acts"));
    if (hasResultMarkup) {
      child.classList.add("occumed-primary-result-block");
      return;
    }
    if (text.includes("npi") || text.includes("taxonomy") || text.includes("specialization") || text.includes("source") || text.includes("filter")) {
      child.classList.add("occumed-secondary-control-block");
    }
  });
}

function scanPanels(): void {
  document.querySelectorAll(".live-panel.open").forEach(tagSecondaryControls);
}

export function installRightPanelCompactor(): void {
  if (installed) return;
  installed = true;
  window.setTimeout(scanPanels, 250);
  const observer = new MutationObserver(() => scanPanels());
  observer.observe(document.body, { childList: true, subtree: true });
}

installRightPanelCompactor();
