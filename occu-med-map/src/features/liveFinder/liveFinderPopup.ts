import { CATS } from '../networkMap/networkMapConstants';
import { fmtDist } from '../networkMap/networkMapUtils';
import { escapeHtml, htmlAttr, safeTel, safeUrl } from '../../lib/htmlSafety';
import type { LiveFinderResult } from './liveFinderSearch';

export function buildLiveFinderPopupHtml(result: LiveFinderResult, showGoogleMaps = true): string {
  const category = CATS[result.cat] || CATS.clinic;
  const googleMapsUrl = safeUrl(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${result.name || ''} ${result.addr || ''}`.trim())}`,
  );
  const websiteUrl = safeUrl(result.website);
  const telUrl = safeTel(result.phone);

  return `<div style="font-family:Inter,sans-serif;padding:10px 12px;min-width:190px;">
    <div style="display:flex;gap:7px;align-items:flex-start;margin-bottom:6px;">
      <span style="font-size:16px">${escapeHtml(category.ico)}</span>
      <div>
        <div style="font-size:12.5px;font-weight:700;color:#e2f0ff;line-height:1.3">${escapeHtml(result.name)}</div>
        <div style="font-size:8.5px;font-weight:700;font-family:'IBM Plex Mono',monospace;color:${htmlAttr(category.col)};letter-spacing:1px;text-transform:uppercase;margin-top:2px">${escapeHtml(category.lbl)}</div>
      </div>
    </div>
    ${result.addr ? `<div style="font-size:9.5px;color:#4a6888;margin-bottom:3px;">📍 ${escapeHtml(result.addr)}</div>` : ''}
    ${result.phone ? `<div style="font-size:9.5px;color:#4a6888;margin-bottom:3px;">📞 ${telUrl ? `<a href="${htmlAttr(telUrl)}" style="color:#67e8f9;text-decoration:none">${escapeHtml(result.phone)}</a>` : escapeHtml(result.phone)}</div>` : ''}
    ${result.hours ? `<div style="font-size:9px;color:#3d5478;margin-bottom:5px;">🕐 ${escapeHtml(result.hours)}</div>` : ''}
    <div style="font-size:8.5px;color:#2d3f55;margin-bottom:7px;">~${escapeHtml(fmtDist(result.dist))} away · ${escapeHtml(result.source || 'Source unknown')}</div>
    <div style="display:flex;gap:4px;">
      ${showGoogleMaps && googleMapsUrl ? `<a href="${htmlAttr(googleMapsUrl)}" target="_blank" rel="noopener" style="flex:1;text-align:center;padding:5px;border-radius:3px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.25);color:#93c5fd;font-size:8.5px;font-family:'IBM Plex Mono',monospace;font-weight:700;text-decoration:none;">GOOGLE MAPS</a>` : ''}
      ${websiteUrl ? `<a href="${htmlAttr(websiteUrl)}" target="_blank" rel="noopener" style="flex:1;text-align:center;padding:5px;border-radius:3px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);color:#34d399;font-size:8.5px;font-family:'IBM Plex Mono',monospace;font-weight:700;text-decoration:none;">WEBSITE</a>` : ''}
    </div>
  </div>`;
}
