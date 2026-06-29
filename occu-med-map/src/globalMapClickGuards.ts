type MaybeElement = EventTarget | null;

function textOf(el: Element | null): string {
  return (el?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function isMapBackgroundClick(target: MaybeElement): boolean {
  if (!(target instanceof Element)) return false;
  const map = target.closest('.leaflet-container, #map');
  if (!map) return false;
  if (target.closest('button, input, select, textarea, a')) return false;
  if (target.closest('.leaflet-control, .leaflet-popup, .leaflet-tooltip, .leaflet-marker-icon')) return false;
  return true;
}

function blockDefaultMapClick(event: Event): void {
  if (!isMapBackgroundClick(event.target)) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
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

function cleanGlobalMapArtifacts(): void {
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

function installGlobalMapClickGuards(): void {
  ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick'].forEach((eventName) => {
    document.addEventListener(eventName, blockDefaultMapClick, true);
  });

  cleanGlobalMapArtifacts();
  new MutationObserver(cleanGlobalMapArtifacts)
    .observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installGlobalMapClickGuards, { once: true });
} else {
  installGlobalMapClickGuards();
}

export {};
