function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char] || char));
}

function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch { return null; }
}

export function buildProviderRegistryPopup(provider: any, layer: { label: string }): string {
  const name = escapeHtml(provider?.name || provider?.clinic_name || layer.label);
  const address = escapeHtml([
    provider?.address || provider?.address_1, provider?.city,
    provider?.admin_area || provider?.state, provider?.postal_code || provider?.zip,
  ].filter(Boolean).join(', ') || 'Address unavailable');
  const phone = typeof provider?.phone === 'string' ? provider.phone.trim() : '';
  const website = safeHttpUrl(provider?.website);
  const sourceUrl = safeHttpUrl(provider?.source_url || provider?.sourceUrl);
  const type = escapeHtml(provider?.clinic_type || provider?.providerType || provider?.category || '');
  return `<div class="provider-registry-popup">
    <div class="provider-registry-popup-name">${name}</div>
    <div class="provider-registry-popup-source">${escapeHtml(layer.label)}</div>
    <div class="provider-registry-popup-row">${address}</div>
    ${type ? `<div class="provider-registry-popup-row">${type}</div>` : ''}
    ${phone ? `<div class="provider-registry-popup-row"><a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a></div>` : ''}
    ${website ? `<div class="provider-registry-popup-row"><a href="${escapeHtml(website)}" target="_blank" rel="noreferrer">Website</a></div>` : ''}
    ${sourceUrl ? `<div class="provider-registry-popup-row"><a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">Registry source</a></div>` : ''}
  </div>`;
}
