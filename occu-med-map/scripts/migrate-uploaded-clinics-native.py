from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]

provider_runtime = root / 'src/providerDatasetNativeMapRuntime.ts'
text = provider_runtime.read_text()
text = text.replace(
    'export type ProviderDatasetChannel = "bluehive" | "dentists" | "inventory" | "indexed" | "my-clinics" | "naccho";',
    'export type ProviderDatasetChannel = "bluehive" | "dentists" | "inventory" | "indexed" | "my-clinics" | "naccho" | "uploaded";',
)
text = text.replace(
    'const CHANNELS: ProviderDatasetChannel[] = ["bluehive", "dentists", "inventory", "indexed", "my-clinics", "naccho"];',
    'const CHANNELS: ProviderDatasetChannel[] = ["bluehive", "dentists", "inventory", "indexed", "my-clinics", "naccho", "uploaded"];',
)
provider_runtime.write_text(text)

app = root / 'src/App.tsx'
text = app.read_text()
text = text.replace('  const clinicLayerRef = useRef<MapScene.LayerGroup|null>(null);\n', '')

pattern = re.compile(r'''  // ── Uploaded clinic pins ─+\n  useEffect\(\(\)=>\{.*?\n  \},\[uploadedClinics, showUploadedClinics, showGlowPoints\]\);\n''', re.S)
replacement = '''  // ── Uploaded clinic pins: native Mapbox source ─────────────────────────────
  useEffect(()=>{
    if(!showUploadedClinics || uploadedClinics.length===0) {
      clearProviderDataset('uploaded');
      return;
    }
    renderProviderDataset('uploaded', uploadedClinics, {
      baseColor:'#f472b6',
      glow:showGlowPoints,
      getColor:(clinic)=>clinic.color || '#f472b6',
      buildPopup:(c)=>{
        const col=c.color||'#f472b6';
        return `<div style="font-family:Inter,sans-serif;padding:10px 12px;min-width:170px;">
          <div style="font-size:12px;font-weight:700;color:#e2f0ff;margin-bottom:4px">${escapeHtml(c.name)}</div>
          ${c.address?`<div style="font-size:9.5px;color:#4a6888">${escapeHtml(c.address)}${c.city?', '+escapeHtml(c.city):''}${c.state?' '+escapeHtml(c.state):''}${c.zip?' '+escapeHtml(c.zip):''}</div>`:''}
          ${c.phone?`<div style="font-size:9.5px;margin-top:2px">Phone: <a href="tel:${escapeHtml(c.phone)}">${escapeHtml(c.phone)}</a></div>`:''}
          ${c.notes?`<div style="font-size:9px;color:#3d5478;margin-top:3px">${escapeHtml(c.notes)}</div>`:''}
          <div style="margin-top:6px;display:flex;gap:5px"><div style="width:8px;height:8px;border-radius:50%;background:${col};box-shadow:0 0 6px ${col};flex-shrink:0;margin-top:2px"></div><span style="font-size:8.5px;color:#3d5478;font-family:'IBM Plex Mono',monospace">UPLOADED CLINIC</span></div>
        </div>`;
      },
    });
    return ()=>clearProviderDataset('uploaded');
  },[uploadedClinics, showUploadedClinics, showGlowPoints]);
'''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit('Uploaded clinic compatibility block did not match')
app.write_text(text)

print('Migrated uploaded clinics to native provider dataset source.')
