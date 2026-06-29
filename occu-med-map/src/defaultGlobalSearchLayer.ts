import L from 'leaflet';

const NETWORK_TOOL_LABELS = new Set([
  'coverage',
  'live finder',
  'radius tool',
  'directories',
  'price finder',
  'my clinics',
  'compare',
]);

type LiveRow = {
  id?: string | number;
  name?: string;
  lat?: number | string;
  lng?: number | string;
  lon?: number | string;
  cat?: string;
  type?: string;
  addr?: string;
  address?: string;
  phone?: string;
  website?: string;
};

function buttonText(button: Element): string {
  return (button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function activeNetworkTool(): string | null {
  for (const button of Array.from(document.querySelectorAll('button.active'))) {
    const text = buttonText(button);
    if (NETWORK_TOOL_LABELS.has(text)) return text;
  }
  return null;
}

function asNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function providerPopup(row: LiveRow): string {
  const name = escapeHtml(row.name || 'Live provider');
  const type = escapeHtml(row.cat || row.type || 'Facility');
  const address = escapeHtml(row.addr || row.address || '');
  const phone = escapeHtml(row.phone || '');
  const website = escapeHtml(row.website || '');
  return `<div class="pi"><div class="pt">${name}</div><div class="ps">${type}</div>${address ? `<div class="ps">${address}</div>` : ''}${phone ? `<div class="ps">${phone}</div>` : ''}${website ? `<div class="ps">${website}</div>` : ''}</div>`;
}

function installDefaultGlobalSearchLayer(): void {
  L.Map.addInitHook(function defaultGlobalSearchInit(this: L.Map) {
    const map = this;
    const layer = L.layerGroup().addTo(map);
    let requestId = 0;

    map.on('click', async (event: L.LeafletMouseEvent) => {
      if (activeNetworkTool()) return;

      const currentRequest = ++requestId;
      const { lat, lng } = event.latlng;
      const popup = L.popup({ closeButton: true, maxWidth: 300 })
        .setLatLng([lat, lng])
        .setContent('<div class="pi"><div class="pt">Searching live providers</div><div class="ps">Coordinate-first global search is running.</div></div>')
        .openOn(map);

      try {
        const params = new URLSearchParams({
          lat: String(lat),
          lng: String(lng),
          radiusMiles: '25',
        });
        const response = await fetch(`/api/live-finder/search?${params.toString()}`, {
          signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (currentRequest !== requestId) return;

        const rows: LiveRow[] = Array.isArray(data?.results) ? data.results : [];
        const usable = rows
          .map((row) => {
            const rowLat = asNumber(row.lat);
            const rowLng = asNumber(row.lng ?? row.lon);
            return rowLat == null || rowLng == null ? null : { ...row, lat: rowLat, lng: rowLng };
          })
          .filter(Boolean) as Array<LiveRow & { lat: number; lng: number }>;

        layer.clearLayers();

        if (!usable.length) {
          popup.setContent('<div class="pi"><div class="pt">No live facilities found</div><div class="ps">No live facilities were returned within 25 miles. Try a nearby city or use a larger-radius tool search.</div></div>');
          return;
        }

        usable.slice(0, 80).forEach((row, index) => {
          const marker = L.marker([row.lat, row.lng], {
            zIndexOffset: 1800 + index,
            icon: L.divIcon({
              className: '',
              html: '<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:2px solid #fff;box-shadow:0 2px 8px rgba(15,23,42,.25);"></div>',
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            }),
          });
          marker.bindPopup(providerPopup(row), { maxWidth: 300 });
          marker.addTo(layer);
        });

        popup.setContent(`<div class="pi"><div class="pt">${usable.length} live facilities found</div><div class="ps">Showing coordinate-first live results within 25 miles.</div></div>`);
      } catch (error) {
        if (currentRequest !== requestId) return;
        popup.setContent('<div class="pi"><div class="pt">Live search failed</div><div class="ps">The live provider source did not respond. Try again or use a larger-radius search.</div></div>');
      }
    });
  });
}

installDefaultGlobalSearchLayer();

export {};
