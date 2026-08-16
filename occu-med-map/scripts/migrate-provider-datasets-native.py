from pathlib import Path

root = Path(__file__).resolve().parents[1]
app = root / "src/App.tsx"
text = app.read_text()

import_anchor = "} from './liveFinderNativeMapRuntime';\n"
import_block = '''} from './liveFinderNativeMapRuntime';
import {
  clearProviderDataset,
  renderProviderDataset,
} from './providerDatasetNativeMapRuntime';
'''
if import_anchor not in text:
    raise SystemExit('provider dataset import anchor missing')
text = text.replace(import_anchor, import_block, 1)

# Remove the old projected LayerGroup provider renderer completely.
start = text.index('interface ProviderFieldRendererOptions')
end = text.index('function classifyFacility', start)
text = text[:start] + text[end:]

for line in [
    "  const blueHiveLayerRef = useRef<ReturnType<typeof createProviderFieldLayer>|null>(null);\n",
    "  const indexedProviderLayerRef = useRef<ReturnType<typeof createProviderFieldLayer>|null>(null);\n",
    "  const myClinicsLayerRef = useRef<ReturnType<typeof createProviderFieldLayer>|null>(null);\n",
    "  const inventoryLayerRef = useRef<ReturnType<typeof createProviderFieldLayer>|null>(null);\n",
    "  const dentistLayerRef = useRef<ReturnType<typeof createProviderFieldLayer>|null>(null);\n",
    "  const nacchoLayerRef = useRef<ReturnType<typeof createProviderFieldLayer>|null>(null);\n",
]:
    text = text.replace(line, '')


def replace_section(start_marker: str, end_marker: str, replacement: str) -> None:
    global text
    start_index = text.index(start_marker)
    end_index = text.index(end_marker, start_index)
    text = text[:start_index] + replacement + text[end_index:]

replace_section(
    '  // ── BlueHive density field + provider points',
    '  // ── Dentist density field + provider points',
    '''  // ── BlueHive native heatmap + provider points ────────────────────────────
  useEffect(()=>{
    if(!showBlueHive || blueHiveData.length===0) {
      clearProviderDataset('bluehive');
      return;
    }
    renderProviderDataset('bluehive', blueHiveData, {
      baseColor:'#3b82f6',
      glow:showGlowPoints,
      getColor:(provider:any)=>providerCategoryStyle(provider).color,
      buildPopup:(p:any)=>`<div style="font-family:Inter,sans-serif;padding:10px 12px;min-width:200px;">
        <div style="font-size:12px;font-weight:700;color:#e2f0ff;margin-bottom:4px">${p.clinic_name||p.name||'Unnamed'}</div>
        ${p.address_1?`<div style="font-size:9.5px;color:#4a6888"> ${p.address_1}${p.city?', '+p.city:''}${p.state?' '+p.state:''}${p.zip?' '+p.zip:''}</div>`:''}
        ${p.phone?`<div style="font-size:9.5px;margin-top:2px">Phone: <a href="tel:${p.phone}">${p.phone}</a></div>`:''}
        ${p.website?`<div style="font-size:8.5px;color:#3d5478;margin-top:2px"><a href="${p.website}" target="_blank" rel="noreferrer" style="color:#93c5fd">${p.website}</a></div>`:''}
        ${p.services?`<div style="font-size:8px;color:#3d5478;margin-top:3px">${p.services}</div>`:''}
        <div style="margin-top:6px;font-size:8.5px;color:#3b82f6;font-family:'IBM Plex Mono',monospace">BLUEHIVE PROVIDER</div>
      </div>`,
    });
    return ()=>clearProviderDataset('bluehive');
  },[showBlueHive,blueHiveData,showGlowPoints]);

'''
)

replace_section(
    '  // ── Dentist density field + provider points',
    '  // ── Service Presence density field + provider points',
    '''  // ── Dentist native heatmap + provider points ─────────────────────────────
  useEffect(()=>{
    if(!showDentists || dentistData.length===0) {
      clearProviderDataset('dentists');
      return;
    }
    renderProviderDataset('dentists', dentistData, {
      baseColor:'#06b6d4',
      glow:showGlowPoints,
      getColor:(provider:any)=>providerCategoryStyle(provider).color,
      buildPopup:(p:any)=>`<div style="font-family:Inter,sans-serif;padding:10px 12px;min-width:200px;">
        <div style="font-size:12px;font-weight:700;color:#e2f0ff;margin-bottom:4px">${p.clinic_name||p.name||'Unnamed'}</div>
        ${p.address_1?`<div style="font-size:9.5px;color:#4a6888"> ${p.address_1}${p.city?', '+p.city:''}${p.state?' '+p.state:''}${p.zip?' '+p.zip:''}</div>`:''}
        ${p.phone?`<div style="font-size:9.5px;margin-top:2px">Phone: <a href="tel:${p.phone}">${p.phone}</a></div>`:''}
        ${p.npi?`<div style="font-size:8.5px;color:#3d5478;margin-top:2px">NPI: <a href="${p.source_url||'#'}" target="_blank" rel="noreferrer" style="color:#93c5fd">${p.npi}</a></div>`:''}
        ${p.taxonomy_description?`<div style="font-size:8px;color:#3d5478;margin-top:3px">${p.taxonomy_description}</div>`:''}
        <div style="margin-top:6px;font-size:8.5px;color:#06b6d4;font-family:'IBM Plex Mono',monospace">DENTIST</div>
      </div>`,
    });
    return ()=>clearProviderDataset('dentists');
  },[showDentists,dentistData,showGlowPoints]);

'''
)

replace_section(
    '  // ── Service Presence density field + provider points',
    '  // ── Full indexed provider density field + points',
    '''  // ── Service Presence native heatmap + provider points ────────────────────
  useEffect(()=>{
    if(inventoryData.length===0) {
      clearProviderDataset('inventory');
      return;
    }
    const trustColor=(tier:string)=>tier==='verified'?'#34d399':tier==='registry'?'#60a5fa':tier==='directory'?'#a78bfa':'#94a3b8';
    renderProviderDataset('inventory', inventoryData, {
      baseColor:'#10b981',
      glow:showGlowPoints,
      getColor:(provider:MapInventoryProvider)=>providerCategoryStyle(provider).color,
      buildPopup:(p:MapInventoryProvider)=>{
        const tc=trustColor(p.trustTier);
        return `<div style="font-family:Inter,sans-serif;padding:10px 12px;min-width:210px;max-width:280px;">
          <div style="font-size:12px;font-weight:700;color:#e2f0ff;margin-bottom:4px">${p.name||'Unnamed'}</div>
          ${p.address?`<div style="font-size:9.5px;color:#4a6888"> ${p.address}${p.city?', '+p.city:''}${p.state?' '+p.state:''}</div>`:''}
          ${p.phone?`<div style="font-size:9.5px;margin-top:2px">Phone: <a href="tel:${p.phone}">${p.phone}</a></div>`:''}
          ${p.website?`<div style="font-size:8.5px;color:#3d5478;margin-top:2px"><a href="${p.website}" target="_blank" rel="noreferrer" style="color:#93c5fd">${p.website}</a></div>`:''}
          ${p.npi?`<div style="font-size:8.5px;color:#3d5478;margin-top:2px">NPI: <a href="https://npiregistry.cms.hhs.gov/provider-view/${p.npi}" target="_blank" rel="noreferrer" style="color:#93c5fd">${p.npi}</a></div>`:''}
          ${p.services.length>0?`<div style="font-size:8px;color:#3d5478;margin-top:3px">${p.services.join(', ')}</div>`:''}
          <div style="margin-top:6px;display:flex;gap:5px;align-items:center"><span style="font-size:8.5px;color:${tc};font-family:'IBM Plex Mono',monospace;text-transform:uppercase">${p.trustTier}</span>${p.coordinateStatus?`<span style="font-size:7.5px;color:#5d7a9e;margin-left:4px">${p.coordinateStatus}</span>`:''}</div>
        </div>`;
      },
    });
    return ()=>clearProviderDataset('inventory');
  },[inventoryData,showGlowPoints]);

'''
)

replace_section(
    '  // ── Full indexed provider density field + points',
    '  // ── Persisted My Clinics density field + points',
    '''  // ── Full indexed providers: native heatmap + points ──────────────────────
  useEffect(()=>{
    if(!showIndexedProviders || indexedLayerData.length===0) {
      clearProviderDataset('indexed');
      return;
    }
    renderProviderDataset('indexed', indexedLayerData, {
      baseColor:'#10b981',
      glow:showGlowPoints,
      getColor:(provider:any)=>providerCategoryStyle(provider).color,
      buildPopup:(p:any)=>`<div style="font-family:Inter,sans-serif;padding:10px 12px;min-width:200px;">
        <div style="font-size:12px;font-weight:700;color:#e2f0ff;margin-bottom:4px">${p.clinic_name||p.name||'Unnamed'}</div>
        ${(p.address_1||p.address)?`<div style="font-size:9.5px;color:#4a6888">${p.address_1||p.address}${p.city?', '+p.city:''}${(p.state||p.admin_area)?' '+(p.state||p.admin_area):''}</div>`:''}
        ${p.phone?`<div style="font-size:9.5px;color:#67e8f9;margin-top:2px">${p.phone}</div>`:''}
        <div style="margin-top:6px;font-size:8.5px;color:#10b981;font-family:'IBM Plex Mono',monospace">INDEXED PROVIDER</div>
      </div>`,
    });
    return ()=>clearProviderDataset('indexed');
  },[showIndexedProviders,indexedLayerData,showGlowPoints]);

'''
)

replace_section(
    '  // ── Persisted My Clinics density field + points',
    '  async function uploadClinicChunk',
    '''  // ── Persisted My Clinics: native heatmap + points ────────────────────────
  useEffect(()=>{
    if(!showMyClinicsLayer || myClinicsData.length===0) {
      clearProviderDataset('my-clinics');
      return;
    }
    renderProviderDataset('my-clinics', myClinicsData, {
      baseColor:'#8b5cf6',
      glow:showGlowPoints,
      getColor:(provider:any)=>providerCategoryStyle(provider).color,
      buildPopup:(p:any)=>`<div style="font-family:Inter,sans-serif;padding:10px 12px;min-width:200px;">
        <div style="font-size:12px;font-weight:700;color:#e2f0ff;margin-bottom:4px">${p.clinic_name||p.name||'Unnamed'}</div>
        ${(p.address_1||p.address)?`<div style="font-size:9.5px;color:#4a6888">${p.address_1||p.address}${p.city?', '+p.city:''}${(p.state||p.admin_area)?' '+(p.state||p.admin_area):''}</div>`:''}
        ${p.phone?`<div style="font-size:9.5px;color:#67e8f9;margin-top:2px">${p.phone}</div>`:''}
        <div style="margin-top:6px;font-size:8.5px;color:#8b5cf6;font-family:'IBM Plex Mono',monospace">MY CLINIC</div>
      </div>`,
    });
    return ()=>clearProviderDataset('my-clinics');
  },[showMyClinicsLayer,myClinicsData,showGlowPoints]);

  async function uploadClinicChunk'''
)

# NACCHO keeps the same viewport fetch behavior but writes directly to a stable Mapbox source.
naccho_start = text.index('  // ── NACCHO LHD layer:')
naccho_end = text.index('  const activeToolRef = React.useRef(activeTool);', naccho_start)
naccho_replacement = '''  // ── NACCHO LHD layer: native Mapbox source + heatmap ───────────────────────
  useEffect(()=>{
    const map=mapRef.current;
    if(!map||!mapReady) return;
    if(!showNacchoLayer) {
      clearProviderDataset('naccho');
      nacchoFetchRef.current?.abort();
      nacchoFetchRef.current=null;
      return;
    }
    let timer:ReturnType<typeof setTimeout>|null=null;
    const reload=()=>{
      if(timer) clearTimeout(timer);
      timer=setTimeout(async()=>{
        nacchoFetchRef.current?.abort();
        const ac=new AbortController();
        nacchoFetchRef.current=ac;
        setNacchoLoading(true);
        setNacchoError('');
        try {
          const bounds=map.getBounds();
          const params=new URLSearchParams({
            useBounds:'true',
            north:String(bounds.getNorth()),south:String(bounds.getSouth()),
            east:String(bounds.getEast()),west:String(bounds.getWest()),limit:'1000',
          });
          const resp=await fetch(`/api/naccho-lhd?${params}`,{signal:ac.signal});
          if(ac.signal.aborted) return;
          const data=await resp.json().catch(()=>({providers:[]}));
          if(ac.signal.aborted) return;
          const providers=Array.isArray(data.providers)?data.providers:[];
          setNacchoData(providers);
          renderProviderDataset('naccho',providers,{
            baseColor:'#34d399',
            glow:false,
            buildPopup:(p:any)=>{
              const services=Array.isArray(p.public_health_services)?p.public_health_services:(p.services||[]);
              const svcHtml=services.length?`<div style="font-size:9px;color:#6ee7b7;margin-top:4px;">${services.slice(0,5).join(', ')}</div>`:'';
              return `<div style="font-family:Inter,sans-serif;padding:10px 12px;max-width:270px;">
                <div style="font-size:12px;font-weight:700;color:#e2f0ff;">${p.name||'Local Health Department'}</div>
                <div style="font-size:9px;font-family:'IBM Plex Mono',monospace;color:#34d399;letter-spacing:1px;text-transform:uppercase;margin:2px 0 4px;">NACCHO LHD Directory</div>
                <div style="font-size:9px;color:#4a6888;margin-bottom:4px;">${[p.address,p.city,p.admin_area,p.country].filter(Boolean).join(', ')||'Address unavailable'}</div>
                ${p.phone?`<div style="font-size:9px;margin-bottom:3px;"><a href="tel:${p.phone}">${p.phone}</a></div>`:''}
                ${p.website?`<div style="font-size:8.5px;margin-bottom:3px;"><a href="${p.website}" target="_blank" rel="noreferrer">${p.website}</a></div>`:''}
                ${svcHtml}
                <div style="font-size:8px;color:#94a3b8;margin-top:5px;border-top:1px solid rgba(255,255,255,0.08);padding-top:4px;">External directory record · not a confirmed service provider</div>
              </div>`;
            },
          });
        } catch(error:any) {
          if(!ac.signal.aborted) setNacchoError(error?.message||'NACCHO layer failed');
        } finally {
          if(!ac.signal.aborted) setNacchoLoading(false);
        }
      },400);
    };
    reload();
    map.on('moveend',reload);
    return()=>{
      if(timer) clearTimeout(timer);
      map.off('moveend',reload);
      nacchoFetchRef.current?.abort();
      nacchoFetchRef.current=null;
      clearProviderDataset('naccho');
    };
  },[mapReady,showNacchoLayer]);

'''
text = text[:naccho_start] + naccho_replacement + text[naccho_end:]

if 'createProviderFieldLayer' in text:
    raise SystemExit('createProviderFieldLayer remains after migration')

app.write_text(text)
print('Migrated persistent provider datasets and NACCHO to native Mapbox heatmap/point sources.')
