function textOf(el: Element | null): string {
  return (el?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function isUsPoint(lat: number, lng: number): boolean {
  const continental = lat >= 24.3 && lat <= 49.6 && lng >= -125 && lng <= -66.7;
  const alaska = lat >= 51.2 && lat <= 71.6 && lng >= -170 && lng <= -129.5;
  const hawaii = lat >= 18.8 && lat <= 22.5 && lng >= -160.8 && lng <= -154.6;
  return continental || alaska || hawaii;
}

function parseLatLng(text: string): { lat: number; lng: number } | null {
  const matches = Array.from(text.matchAll(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g));
  const last = matches.at(-1);
  if (!last) return null;
  const lat = Number(last[1]);
  const lng = Number(last[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function parseDistanceMiles(text: string): number | null {
  const match = text.match(/Distance\s*([\d,]+(?:\.\d+)?)\s*mi/i);
  if (!match) return null;
  const miles = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(miles) ? miles : null;
}

function cleanUsOnlyArtifacts(): void {
  document.querySelectorAll('.rp-alert, [role="alert"]').forEach((node) => {
    const text = textOf(node);
    if (text.includes('could not determine city/state') || text.includes('try clicking near a city')) {
      node.remove();
    }
  });

  document.querySelectorAll('.local-pop-card').forEach((card) => {
    const text = textOf(card);
    if (!text.includes('local population estimate')) return;
    const coords = parseLatLng(card.textContent || '');
    const distanceMiles = parseDistanceMiles(card.textContent || '');
    if ((coords && !isUsPoint(coords.lat, coords.lng)) || (distanceMiles !== null && distanceMiles > 150)) {
      card.remove();
    }
  });
}

function installGlobalMapCleanup(): void {
  // Do not intercept map clicks. The global map and live finder need coordinates.
  // This file only removes legacy U.S.-only UI artifacts when they leak into
  // international map interactions.
  cleanUsOnlyArtifacts();
  new MutationObserver(cleanUsOnlyArtifacts)
    .observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installGlobalMapCleanup, { once: true });
} else {
  installGlobalMapCleanup();
}

export {};
