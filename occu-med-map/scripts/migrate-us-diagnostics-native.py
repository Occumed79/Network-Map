from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
app = root / 'src/App.tsx'
text = app.read_text()

import_anchor = "} from './providerDatasetNativeMapRuntime';\n"
import_block = '''} from './providerDatasetNativeMapRuntime';
import {
  clearNativeDiagnosticChannel,
  flyNativeMap,
  openNativeMapPopup,
  renderSavedRadiusOverlays,
  setNativeAddressPin,
  setNativeDiagnosticCollection,
} from './usDiagnosticsNativeMapRuntime';
'''
if import_anchor not in text:
    raise SystemExit('U.S. diagnostics import anchor missing')
text = text.replace(import_anchor, import_block, 1)

for line in [
    '  const stateGeoRef = useRef<MapScene.GeoJSON|null>(null);\n',
    '  const cityLayerRef = useRef<MapScene.LayerGroup|null>(null);\n',
    '  const customPinRef = useRef<MapScene.Marker|null>(null);\n',
    '  const tzLayerRef = useRef<MapScene.LayerGroup|null>(null);\n',
    '  const popDensityLayerRef = useRef<MapScene.LayerGroup|null>(null);\n',
    '  const savedRadiusLayerRef = useRef<MapScene.LayerGroup|null>(null);\n',
    '  const labelLayerRef = useRef<MapScene.LayerGroup|null>(null);\n',
]:
    text = text.replace(line, '')

text = text.replace('''    // City layer
    const cityLayer = MapScene.layerGroup().addTo(map);
    cityLayerRef.current = cityLayer;

    // Load GeoJSON only if US Diagnostics is already enabled
    if (showUsDiagnostics) loadStateGeo(map);
''', '''    // Load U.S. diagnostic GeoJSON only if the diagnostics workspace is enabled.
    if (showUsDiagnostics) void loadStateGeo();
''', 1)

start = text.index('  // ── Load State GeoJSON')
end = text.index('  function estimateLocalPopulationDensity', start)
state_block = '''  // ── Load / render U.S. state diagnostics with native Mapbox sources ────────
  function featureCenter(feature:any): [number,number] {
    const coords:number[][]=[];
    const walk=(value:any)=>{
      if(!Array.isArray(value)) return;
      if(value.length>=2 && typeof value[0]==='number' && typeof value[1]==='number') {
        coords.push([Number(value[0]),Number(value[1])]);
        return;
      }
      value.forEach(walk);
    };
    walk(feature?.geometry?.coordinates);
    if(!coords.length) return [0,0];
    const lngs=coords.map(point=>point[0]);
    const lats=coords.map(point=>point[1]);
    return [(Math.min(...lats)+Math.max(...lats))/2,(Math.min(...lngs)+Math.max(...lngs))/2];
  }

  function sStyle(postal:string,m:string) {
    const d=SD[postal];
    if(!d) return{fillColor:'#0a1830',fillOpacity:0.38,weight:1,color:'rgba(99,179,237,0.15)',opacity:0.6};
    if(!showStateColorsRef.current) return {fillColor:'#11243f',fillOpacity:0.12,weight:1,color:'rgba(161,209,255,0.25)',opacity:0.8};
    const v=getVal(d,m);
    const col=DCOL[v]||'#3d5478';
    return{fillColor:col,fillOpacity:0.25,weight:1,color:col,opacity:0.45};
  }

  function renderStateDiagnostics() {
    const features=rawStateFeaturesRef.current;
    if(!features.length) {
      clearNativeDiagnosticChannel('states');
      return;
    }
    const rendered:any[]=[];
    features.forEach((feature:any)=>{
      const postal=feature.properties?.postal||'';
      const style=sStyle(postal,metricRef.current);
      const d=SD[postal];
      const value=d?getVal(d,metricRef.current):0;
      rendered.push({
        ...feature,
        properties:{
          ...feature.properties,
          fillColor:style.fillColor,
          fillOpacity:style.fillOpacity,
          lineColor:style.color,
          lineOpacity:style.opacity,
          lineWidth:style.weight,
          popupHtml:buildStatePopup(postal),
          tooltipHtml:d?`<div style="padding:5px 8px;font-family:'IBM Plex Mono',monospace"><span style="font-weight:700;font-size:11px;color:#eef4ff">${postal}</span>&nbsp;<span style="font-size:9px;color:${DCOL[value]};font-weight:700">${DLBL[value]}</span></div>`:postal,
        },
      });
      const fallback=featureCenter(feature);
      const [lat,lng]=STATE_CTR[postal]||fallback;
      if(postal) rendered.push({
        type:'Feature',
        geometry:{type:'Point',coordinates:[lng,lat]},
        properties:{kind:'label',label:postal,labelColor:'#8aa4c4',labelSize:9,hidden:!showLabelsRef.current},
      });
    });
    setNativeDiagnosticCollection('states',{type:'FeatureCollection',features:rendered} as any);
  }

  async function loadStateGeo() {
    const urls = [
      '/states-10m.json',
      'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json',
      'https://unpkg.com/us-atlas@3/states-10m.json',
    ];
    for(const url of urls) {
      try {
        const r=await fetch(url);
        if(!r.ok) continue;
        const topo=await r.json();
        const gj=topojson.feature(topo,topo.objects.states) as any;
        gj.features.forEach((f:any)=>{
          const id=String(f.properties.id||'').padStart(2,'0');
          f.properties.postal=FIPS2CODE[id]||NAME2CODE[(f.properties.name||'').toLowerCase()]||'';
        });
        rawStateFeaturesRef.current=gj.features;
        renderStateDiagnostics();
        setStateGeoRevision(value=>value+1);
        break;
      } catch(error) { console.warn('GeoJSON load error',error); }
    }
  }

  const metricRef=useRef(metric);
  useEffect(()=>{ metricRef.current=metric; renderStateDiagnostics(); },[metric]);
  useEffect(()=>{ showStateColorsRef.current=showStateColors; renderStateDiagnostics(); },[showStateColors]);

  useEffect(()=>{
    if(showUsDiagnostics && !rawStateFeaturesRef.current.length) {
      void loadStateGeo();
    } else if(!showUsDiagnostics) {
      rawStateFeaturesRef.current=[];
      clearNativeDiagnosticChannel('states');
      clearNativeDiagnosticChannel('population');
      clearNativeDiagnosticChannel('cities');
      clearNativeDiagnosticChannel('timezones');
      setShowLabels(false);
      setShowTZ(false);
      setShowPopDensity(false);
      setShowStateColors(false);
      setShowRadius(false);
      setShowCityDots(false);
      setFilterDiff(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[showUsDiagnostics]);

'''
text = text[:start] + state_block + text[end:]

# Remove the old label-builder function if still present elsewhere after the replacement.
text = re.sub(r'''\n  function buildStateLabels\(.*?\n  \}\n\n  // ── Population density overlay''', '\n\n  // ── Population density overlay', text, count=1, flags=re.S)

# Replace population density compatibility block.
pop_start = text.index('  // ── Population density overlay')
pop_end = text.index('  // ── Uploaded clinic pins:', pop_start)
pop_block = '''  // ── Population density overlay: native Mapbox polygons ────────────────────
  const showPopDensityRef=useRef(showPopDensity);
  useEffect(()=>{ showPopDensityRef.current=showPopDensity; },[showPopDensity]);
  useEffect(()=>{
    if(!showPopDensity) {
      clearNativeDiagnosticChannel('population');
      return;
    }
    const features=rawStateFeaturesRef.current;
    if(!features.length) return;
    const rendered=features.flatMap((feature:any)=>{
      const postal=feature.properties?.postal;
      const pop=STATE_POP[postal];
      if(!pop) return [];
      const color=densityColor(pop.density);
      return [{
        ...feature,
        properties:{
          ...feature.properties,
          fillColor:color,
          fillOpacity:0.55,
          lineColor:color,
          lineOpacity:0.6,
          lineWidth:1,
          tooltipHtml:`<div style="padding:5px 8px;font-family:'IBM Plex Mono',monospace;font-size:10px"><span style="font-weight:700;color:#eef4ff">${postal}</span><span style="color:${color};margin-left:6px;font-weight:700">${densityLabel(pop.density)}</span><br/><span style="color:#67e8f9">${Math.round(pop.density).toLocaleString()}/mi²</span><span style="color:#3d5478;margin-left:6px">${pop.pop.toLocaleString()}</span></div>`,
        },
      }];
    });
    setNativeDiagnosticCollection('population',{type:'FeatureCollection',features:rendered} as any);
  },[showPopDensity,stateGeoRevision]);

'''
text = text[:pop_start] + pop_block + text[pop_end:]

# Replace label visibility + saved radii + metric re-style + city + timezone block.
labels_start = text.index('  const showLabelsRef = useRef(showLabels);')
view_start = text.index('  // ── View presets', labels_start)
visual_block = '''  const showLabelsRef=useRef(showLabels);
  useEffect(()=>{
    showLabelsRef.current=showLabels;
    renderStateDiagnostics();
  },[showLabels,stateGeoRevision]);

  useEffect(()=>{
    renderSavedRadiusOverlays(savedRadii,showGlowPoints);
    return ()=>renderSavedRadiusOverlays([],showGlowPoints);
  },[savedRadii,showGlowPoints]);

  // ── City markers: native Mapbox points ───────────────────────────────────
  useEffect(()=>{
    if(!showCityDots) {
      clearNativeDiagnosticChannel('cities');
      return;
    }
    const visibleLocs=LOCS.filter(loc=>filterDiff===null || getVal(loc,metric)===filterDiff);
    const features=visibleLocs.map((loc:any)=>{
      const [name,state,lat,lng,tier]=loc;
      const value=getVal(loc,metric);
      const color=DCOL[value];
      const radius=tier===1?9:tier===2?6:tier===3?4:3;
      return {
        type:'Feature',
        geometry:{type:'Point',coordinates:[lng,lat]},
        properties:{
          color,
          radius,
          strokeWidth:tier<=2?2:1.5,
          strokeColor:tier===1?'rgba(255,255,255,0.8)':'rgba(255,255,255,0.55)',
          blur:showGlowPoints?0.12:0,
          popupHtml:buildCityPopup(loc,metricRef.current),
          tooltipHtml:`<div style="padding:5px 8px;font-family:'IBM Plex Mono',monospace"><span style="font-weight:700;color:#eef4ff">${name}, ${state}</span><br/><span style="font-size:9px;color:${DCOL[getVal(loc,metricRef.current)]}">${DLBL[getVal(loc,metricRef.current)]}</span></div>`,
        },
      };
    });
    setNativeDiagnosticCollection('cities',{type:'FeatureCollection',features} as any);
  },[metric,filterDiff,mapReady,showGlowPoints,showCityDots]);

  // ── Time-zone overlay: native Mapbox polygons + labels ───────────────────
  useEffect(()=>{
    if(!showTZ) {
      clearNativeDiagnosticChannel('timezones');
      return;
    }
    const features=rawStateFeaturesRef.current;
    if(!features.length) return;
    const rendered:any[]=[];
    const labelDone:Record<string,boolean>={};
    features.forEach((feature:any)=>{
      const postal=feature.properties?.postal||'';
      const tzIdx=(STATE_TZ as any)[postal];
      if(tzIdx===undefined) return;
      const info=TZ_INFO[tzIdx];
      rendered.push({
        ...feature,
        properties:{
          ...feature.properties,
          fillColor:info.color,
          fillOpacity:0.16,
          lineColor:info.color,
          lineOpacity:0.7,
          lineWidth:1.2,
          tooltipHtml:`<div style="padding:5px 8px;font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:700;color:${info.color}">${info.name} Time<br/><span style="font-size:10px;color:#aac">${info.abbr} · ${info.utc}</span></div>`,
        },
      });
      const fallback=featureCenter(feature);
      const [lat,lng]=STATE_CTR[postal]||fallback;
      rendered.push({type:'Feature',geometry:{type:'Point',coordinates:[lng,lat]},properties:{kind:'label',label:postal,labelColor:info.color,labelSize:10}});
      if(!labelDone[info.abbr]&&info.abbr!=='AK'&&info.abbr!=='HI') {
        labelDone[info.abbr]=true;
        rendered.push({type:'Feature',geometry:{type:'Point',coordinates:[info.labelLng,info.labelLat]},properties:{kind:'label',label:info.abbr,labelColor:info.color,labelSize:13}});
      }
    });
    setNativeDiagnosticCollection('timezones',{type:'FeatureCollection',features:rendered} as any);
  },[showTZ,stateGeoRevision]);

'''
text = text[:labels_start] + visual_block + text[view_start:]

# Native camera for presets.
text = re.sub(r'''  function flyToView\(v:'world'\|'us'\|'east'\|'central'\|'west'\) \{.*?\n  \}\n''', '''  function flyToView(v:'world'|'us'|'east'|'central'|'west') {
    setView(v);
    if(v==='world') flyNativeMap(20,0,2,1000);
    else if(v==='us') flyNativeMap(38.5,-96,4,1000);
    else if(v==='east') flyNativeMap(38,-79,5.5,1000);
    else if(v==='central') flyNativeMap(38.5,-96,5,1000);
    else if(v==='west') flyNativeMap(40,-118,5.5,1000);
  }
''', text, count=1, flags=re.S)

# Replace custom pin and nearby popup helpers.
text = re.sub(r'''  function placeCustomPin\(lat:number,lng:number,label:string,color:string\) \{.*?\n  \}\n\n  function flyToNearer\(lat:number,lng:number,name:string,state:string,score:number,examKey:string\) \{.*?\n  \}\n''', '''  function placeCustomPin(lat:number,lng:number,label:string,color:string) {
    setNativeAddressPin({
      lat,lng,color,
      tooltipHtml:`<div style="padding:5px 8px;font-size:11px;font-weight:600;color:#eef4ff">${escapeHtml(label)}</div>`,
      popupHtml:`<div class="pi"><div class="pt">${escapeHtml(label)}</div></div>`,
    });
  }

  function flyToNearer(lat:number,lng:number,name:string,state:string,score:number,examKey:string) {
    flyNativeMap(lat,lng,9,1200);
    drawRadiusCircle(lat,lng);
    openNativeMapPopup(lat,lng,`<div style="font-family:'Inter',sans-serif;padding:4px 2px"><div style="font-size:13px;font-weight:700;color:#cdd9f0">${escapeHtml(name)}, ${escapeHtml(state)}</div><div style="font-size:10px;color:#3d5478;margin-top:2px">${escapeHtml(MLBL[examKey])}: <span style="color:${DCOL[score]};font-weight:600">${DLBL[score]}</span></div></div>`,'240px');
  }
''', text, count=1, flags=re.S)

# Address jump uses the same native point owner.
old_jump = '''    map.flyTo([lLat, lLng], 13, { duration: 1.2 });
    setAddrSearch(name.split(',').slice(0,2).join(','));
    setAddrSuggestions([]);
    // Drop a temporary "you are here" pin
    if (customPinRef.current) { try { map.removeLayer(customPinRef.current); } catch {} }
    customPinRef.current = MapScene.marker([lLat, lLng], {
      icon: MapScene.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#7bd7ff;border:2.5px solid #fff;box-shadow:0 0 0 4px rgba(123,215,255,0.30),0 0 18px rgba(123,215,255,0.8);"></div>`,
        iconSize:[16,16], iconAnchor:[8,8]
      }),
      zIndexOffset: 5000,
    }).addTo(map);
    customPinRef.current.bindPopup(`<div class="pi"><div class="pt">${name.split(',')[0]}</div><div class="ps">Address Search Result</div></div>`,{maxWidth:260}).openPopup();
'''
new_jump = '''    flyNativeMap(lLat,lLng,13,1200);
    setAddrSearch(name.split(',').slice(0,2).join(','));
    setAddrSuggestions([]);
    const popupHtml=`<div class="pi"><div class="pt">${escapeHtml(name.split(',')[0])}</div><div class="ps">Address Search Result</div></div>`;
    setNativeAddressPin({lat:lLat,lng:lLng,color:'#7bd7ff',popupHtml});
    openNativeMapPopup(lLat,lLng,popupHtml,'260px');
'''
if old_jump not in text:
    raise SystemExit('Address jump compatibility pin block did not match')
text = text.replace(old_jump,new_jump,1)

# No migrated refs/symbols should survive this slice.
for forbidden in ['stateGeoRef','cityLayerRef','customPinRef','tzLayerRef','popDensityLayerRef','savedRadiusLayerRef','labelLayerRef','buildStateLabels(']:
    if forbidden in text:
        raise SystemExit(f'Remaining migrated U.S. diagnostics symbol: {forbidden}')

app.write_text(text)
print('Migrated U.S. diagnostics, saved radius overlays, and address pins to native Mapbox.')
