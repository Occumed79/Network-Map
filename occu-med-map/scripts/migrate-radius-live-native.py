from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
app = root / "src/App.tsx"
text = app.read_text()

import_anchor = "} from './providerExplorerNativeMapRuntime';\n"
import_block = '''} from './providerExplorerNativeMapRuntime';
import {
  clearLiveFinderSearchOverlay,
  flyToNativeLivePoint,
  renderNativeLivePoints,
  setLiveFinderSearchOverlay,
  setRadiusExtractorOverlay,
  setReferenceRadiusOverlay,
  type NativeLivePoint,
} from './liveFinderNativeMapRuntime';
'''
if import_anchor not in text:
    raise SystemExit('native overlay import anchor missing')
text = text.replace(import_anchor, import_block, 1)

for line in [
    "  const radiusCircleRef = useRef<any>(null);\n",
    "  const liveGrpRef = useRef<MapScene.LayerGroup|null>(null);\n",
    "  const liveCircleRef = useRef<MapScene.Circle|null>(null);\n",
    "  const livePinRef = useRef<MapScene.Marker|null>(null);\n",
    "  const dropCircleRef = useRef<MapScene.Circle|null>(null);\n",
    "  const dropPinRef = useRef<MapScene.Marker|null>(null);\n",
]:
    text = text.replace(line, '')

old_live_init = '''    // Live layer
    const liveGrp = MapScene.layerGroup().addTo(map);
    liveGrpRef.current = liveGrp;

'''
text = text.replace(old_live_init, '')

clear_drop_pattern = re.compile(r'''  function clearDropRadius\(\) \{.*?\n  \}\n\n  function drawDropRadius\(lat:number,lng:number,radiusMiles:number\) \{.*?\n  \}\n''', re.S)
clear_drop_replacement = '''  function clearDropRadius() {
    setRadiusExtractorOverlay(null, dropRadiusMilesRef.current);
  }

  function drawDropRadius(lat:number,lng:number,radiusMiles:number) {
    setRadiusExtractorOverlay({lat,lng}, radiusMiles);
  }
'''
text, count = clear_drop_pattern.subn(clear_drop_replacement, text, count=1)
if count != 1:
    raise SystemExit('drop radius functions did not match')

radius_pattern = re.compile(r'''  function drawRadiusCircle\(lat:number,lng:number\) \{.*?\n  \}\n  const showRadiusRef=useRef\(showRadius\);\n  useEffect\(\(\)=>\{.*?\n  \},\[showRadius,dropCenter\?\.lat,dropCenter\?\.lng\]\);''', re.S)
radius_replacement = '''  function drawRadiusCircle(lat:number,lng:number) {
    lastRadiusLatRef.current=lat;
    lastRadiusLngRef.current=lng;
    setReferenceRadiusOverlay({lat,lng}, showRadiusRef.current);
  }
  const showRadiusRef=useRef(showRadius);
  useEffect(()=>{
    showRadiusRef.current=showRadius;
    if(!showRadius) {
      setReferenceRadiusOverlay(null, false);
    } else if(dropCenter) {
      drawRadiusCircle(dropCenter.lat,dropCenter.lng);
    } else if(lastRadiusLatRef.current!==null&&lastRadiusLngRef.current!==null) {
      drawRadiusCircle(lastRadiusLatRef.current,lastRadiusLngRef.current);
    }
  },[showRadius,dropCenter?.lat,dropCenter?.lng]);'''
text, count = radius_pattern.subn(radius_replacement, text, count=1)
if count != 1:
    raise SystemExit('reference radius block did not match')

old_invalid = '''      setLiveHint('Choose a location on the map or search for a city to run Live Finder.');
      return;
'''
new_invalid = '''      setLiveHint('Choose a location on the map or search for a city to run Live Finder.');
      clearLiveFinderSearchOverlay();
      renderNativeLivePoints([]);
      return;
'''
if old_invalid not in text:
    raise SystemExit('invalid Live Finder coordinate block missing')
text = text.replace(old_invalid, new_invalid, 1)

old_area = '''    if(liveCircleRef.current) { try{map.removeLayer(liveCircleRef.current);}catch(e){} }
    if(livePinRef.current) { try{map.removeLayer(livePinRef.current);}catch(e){} }
    liveCircleRef.current=MapScene.circle([lat,lng],{radius:liveRadius*1609.34,color:'#22d3ee',weight:1.5,opacity:0.45,dashArray:'7 5',fillColor:'#06b6d4',fillOpacity:0.03,interactive:false}).addTo(map);
    livePinRef.current=MapScene.marker([lat,lng],{icon:MapScene.divIcon({className:'',html:'<div style="width:14px;height:14px;border-radius:50%;background:#06b6d4;border:2.5px solid #fff;box-shadow:0 0 0 4px rgba(6,182,212,0.28),0 0 14px rgba(6,182,212,0.6);"></div>',iconSize:[14,14],iconAnchor:[7,7]}),zIndexOffset:3000,interactive:false}).addTo(map);
'''
new_area = '''    setLiveFinderSearchOverlay({lat,lng}, liveRadius);
'''
if old_area not in text:
    raise SystemExit('Live Finder search area block missing')
text = text.replace(old_area, new_area, 1)

npi_start = text.index('  function renderNpiMarkers(')
live_start = text.index('  function renderLiveMarkers(', npi_start)
npi_replacement = '''  function renderNpiMarkers(results:ProviderCandidate[],category:string){
    const config=NPI_CATEGORY_MAP[category];
    const color=config?.color||'#22d3ee';
    const label=config?.label||'Provider';
    const points:NativeLivePoint[]=[];
    results.forEach((p)=>{
      if(p.lat==null||p.lng==null) return;
      if((p as any).coordinateStatus==='unverified') return;
      const badgesHtml=(p.badges||[]).map((b)=>`<span style="display:inline-block;font-size:7.5px;padding:1px 5px;border-radius:3px;background:${color}22;border:1px solid ${color}44;color:${color};margin-right:3px;">${b}</span>`).join('');
      const evidenceHtml=p.evidence&&p.evidence.length>0
        ? `<div style="margin-top:5px;font-size:8px;color:#eab308;background:rgba(234,179,8,0.06);border:1px solid rgba(234,179,8,0.15);border-radius:3px;padding:4px 6px;"><strong>Evidence:</strong> ${p.evidence[0].serviceDetected}</div>`
        : '';
      const confidenceColor=p.confidence==='high'?'#34d399':p.confidence==='medium'?'#fbbf24':'#fca5a5';
      const popupHtml=`<div style="font-family:Inter,sans-serif;padding:10px 12px;min-width:210px;max-width:280px;">
        <div style="margin-bottom:6px;"><div style="font-size:12px;font-weight:700;color:#e2f0ff;line-height:1.3">${p.name}</div>
        <div style="font-size:8px;font-weight:700;font-family:'IBM Plex Mono',monospace;color:${color};letter-spacing:1px;text-transform:uppercase;margin-top:2px">${label}</div></div>
        <div style="font-size:8px;color:#667d8e;margin-bottom:5px;">NPI-listed provider presence. Verify clinic availability before outreach.</div>
        <div style="font-size:9px;color:#4a6888;margin-bottom:4px;">${p.address}</div>
        ${p.phone?`<div style="font-size:9px;margin-bottom:3px;">Phone: <a href="tel:${p.phone}">${p.phone}</a></div>`:''}
        ${p.website?`<div style="font-size:8.5px;color:#3d5478;margin-bottom:3px;"><a href="${p.website}" target="_blank" rel="noopener" style="color:#93c5fd">${p.website}</a></div>`:''}
        ${p.sourceUrl?`<div style="font-size:8px;color:#3d5478;margin-bottom:4px;"><a href="${p.sourceUrl}" target="_blank" rel="noopener">${p.source}</a></div>`:''}
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          <span style="font-size:8px;font-family:'IBM Plex Mono',monospace;color:${confidenceColor};font-weight:700;">${p.confidence?.toUpperCase()}</span>
          <span style="font-size:8px;font-family:'IBM Plex Mono',monospace;color:#89d4fe;">Score ${p.score}</span>
          ${p.distanceMiles!==undefined?`<span style="font-size:8px;color:#5d7a9e;">${p.distanceMiles.toFixed(1)} mi</span>`:''}
        </div>
        <div style="margin-bottom:4px;">${badgesHtml}</div>
        ${evidenceHtml}
      </div>`;
      points.push({id:String(p.id||`${p.lat},${p.lng}`),lat:p.lat,lng:p.lng,color,popupHtml});
    });
    renderNativeLivePoints(points,(id)=>setLiveHighlightId(id));
  }

'''
text = text[:npi_start] + npi_replacement + text[live_start:]

live_start = text.index('  function renderLiveMarkers(')
filter_start = text.index('  function filterAndSortLiveResults(', live_start)
live_replacement = '''  function renderLiveMarkers(results:any[]) {
    const filtered=liveFilter==='all'?results:results.filter(r=>r.cat===liveFilter);
    const points:NativeLivePoint[]=filtered.slice(0,750).map((r:any)=>{
      const c=CATS[r.cat]||CATS.clinic;
      const gmUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name+(r.addr?' '+r.addr:''))}`;
      const popupHtml=`<div style="font-family:Inter,sans-serif;padding:10px 12px;min-width:190px;">
        <div style="margin-bottom:6px;"><div style="font-size:12.5px;font-weight:700;color:#e2f0ff;line-height:1.3">${r.name}</div>
        <div style="font-size:8.5px;font-weight:700;font-family:'IBM Plex Mono',monospace;color:${c.col};letter-spacing:1px;text-transform:uppercase;margin-top:2px">${c.lbl}</div></div>
        ${r.addr?`<div style="font-size:9.5px;color:#4a6888;margin-bottom:3px;"> ${r.addr}</div>`:''}
        ${r.phone?`<div style="font-size:9.5px;margin-bottom:3px;">Phone: <a href="tel:${r.phone}">${r.phone}</a></div>`:''}
        ${r.hours?`<div style="font-size:9px;margin-bottom:5px;">Hours: ${r.hours}</div>`:''}
        <div style="font-size:8.5px;color:#2d3f55;margin-bottom:7px;">~${fmtDist(r.dist)} away</div>
        <div style="display:flex;gap:4px;">
          <a href="${gmUrl}" target="_blank" rel="noopener" style="flex:1;text-align:center;padding:5px;border-radius:3px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.25);color:#93c5fd;font-size:8.5px;font-family:'IBM Plex Mono',monospace;font-weight:700;text-decoration:none;">GOOGLE MAPS</a>
          ${r.website?`<a href="${r.website}" target="_blank" rel="noopener" style="flex:1;text-align:center;padding:5px;border-radius:3px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);color:#34d399;font-size:8.5px;font-family:'IBM Plex Mono',monospace;font-weight:700;text-decoration:none;">WEBSITE</a>`:''}
        </div></div>`;
      return {id:String(r.id),lat:Number(r.lat),lng:Number(r.lng),color:c.col,popupHtml};
    });
    renderNativeLivePoints(points,(id)=>setLiveHighlightId(id));
  }

'''
text = text[:live_start] + live_replacement + text[filter_start:]

old_lpfly = '''  function lpFly(lat:number,lng:number,id:any) {
    const map=mapRef.current;
    if(!map) return;
    map.flyTo([lat,lng],17,{duration:0.8});
    const r=liveResults.find(x=>x.id==id);
    if(r&&r._mk) setTimeout(()=>r._mk.openPopup(),900);
    setLiveHighlightId(id);
  }
'''
new_lpfly = '''  function lpFly(lat:number,lng:number,id:any) {
    flyToNativeLivePoint(String(id),lat,lng);
    setLiveHighlightId(id);
  }
'''
if old_lpfly not in text:
    raise SystemExit('lpFly block missing')
text = text.replace(old_lpfly, new_lpfly, 1)

app.write_text(text)
print('Migrated Radius and Live Finder overlays/results to native Mapbox sources.')
