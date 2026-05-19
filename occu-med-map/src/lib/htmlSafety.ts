export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function safeUrl(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

export function safeTel(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const cleaned = raw.replace(/[^+\d().\-\s]/g, '').trim();
  return cleaned ? `tel:${cleaned}` : '';
}

export function htmlAttr(value: unknown): string {
  return escapeHtml(value).replaceAll('`', '&#096;');
}
