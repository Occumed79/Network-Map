import { LOCS } from './data';
import { STATE_POP } from './populationData';

export function estimateCityPopulationByTier(tier:number, state:string) {
  const baseByTier:Record<number, number> = {1:900000, 2:250000, 3:75000, 4:20000};
  const densityFactor = STATE_POP[state]?.density ? Math.max(0.65, Math.min(1.6, STATE_POP[state].density / 250)) : 1;
  return Math.round((baseByTier[tier] || 20000) * densityFactor);
}

function approxMiles(lat1:number,lng1:number,lat2:number,lng2:number):number {
  const dlat=lat2-lat1,dlng=lng2-lng1;
  return Math.round(Math.sqrt(dlat*dlat+dlng*dlng)*69);
}

function haversine(lat1:number,lng1:number,lat2:number,lng2:number):number {
  const R=6371000,dL=(lat2-lat1)*Math.PI/180,dN=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dN/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

export function buildCitiesInRadius(center:{lat:number;lng:number}, radiusMiles:number) {
  return LOCS
    .map((l:any)=>({
      city: l[0],
      state: l[1],
      distanceMiles: Number(approxMiles(center.lat, center.lng, l[2], l[3]).toFixed(2)),
      populationEstimate: estimateCityPopulationByTier(l[4], l[1]),
    }))
    .filter((c:any)=>c.distanceMiles <= radiusMiles)
    .sort((a:any,b:any)=>a.distanceMiles-b.distanceMiles);
}

export type FacilityResult = {
  id: number | string;
  lat: number;
  lng: number;
  name: string;
  cat: string;
  addr: string;
  phone: string;
  website: string;
};

export function buildFacilityRows(
  center:{lat:number;lng:number},
  facilitiesRaw:FacilityResult[],
  dropFacilityType:string,
  catLabels:Record<string, {lbl?:string}>
) {
  const filteredFacilities = facilitiesRaw
    .filter((r)=>dropFacilityType === 'all' ? true : r.cat === dropFacilityType);
  return filteredFacilities.map((r)=>({
    name: r.name,
    type: catLabels[r.cat]?.lbl || r.cat,
    distanceMiles: Number((haversine(center.lat, center.lng, r.lat, r.lng) / 1609.34).toFixed(2)),
    address: r.addr || '',
    phone: r.phone || '',
    website: r.website || '',
  })).sort((a,b)=>a.distanceMiles-b.distanceMiles);
}

export async function queryFacilitiesInRadius(params:{
  lat:number;
  lng:number;
  radiusMiles:number;
  endpoints:string[];
  classifyFacility:(tags:any)=>string;
  onStatus?:(msg:string)=>void;
}): Promise<FacilityResult[]> {
  const { lat, lng, radiusMiles, endpoints, classifyFacility, onStatus } = params;
  const r = Math.max(radiusMiles, 0.1) * 1609.34;
  const q=`[out:json][timeout:30];(
node["amenity"="hospital"](around:${r},${lat},${lng});
node["amenity"="clinic"](around:${r},${lat},${lng});
node["amenity"="doctors"](around:${r},${lat},${lng});
node["amenity"="pharmacy"](around:${r},${lat},${lng});
node["amenity"="dentist"](around:${r},${lat},${lng});
node["amenity"="urgent_care"](around:${r},${lat},${lng});
node["amenity"="nursing_home"](around:${r},${lat},${lng});
node["healthcare"](around:${r},${lat},${lng});
way["healthcare"](around:${r},${lat},${lng});
way["amenity"="hospital"](around:${r},${lat},${lng});
way["amenity"="clinic"](around:${r},${lat},${lng});
node["office"="physician"](around:${r},${lat},${lng});
node["office"="medical"](around:${r},${lat},${lng});
node["shop"="optician"](around:${r},${lat},${lng});
node["shop"="chemist"](around:${r},${lat},${lng});
);
out center tags;`;
  for(let i=0;i<endpoints.length;i++) {
    try {
      onStatus?.(`Searching facilities (mirror ${i+1}/${endpoints.length})…`);
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),14000);
      const res=await fetch(endpoints[i],{
        method:'POST',
        body:'data='+encodeURIComponent(q),
        signal:controller.signal,
        headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},
      });
      clearTimeout(timer);
      if(!res.ok) continue;
      const data=await res.json();
      if(!data||!Array.isArray(data.elements)) continue;
      const seen:Record<string,boolean>={};
      const rows: FacilityResult[] = data.elements.map((el:any)=>{
        const la=el.lat||(el.center&&el.center.lat);
        const lo=el.lon||(el.center&&el.center.lon);
        if(!la||!lo) return null;
        const t=el.tags||{};
        const nm=t.name||t['name:en']||t.operator||'Unnamed Facility';
        const key=nm.toLowerCase()+'|'+Math.round(la*500)+'|'+Math.round(lo*500);
        if(seen[key]) return null; seen[key]=true;
        const ad=[t['addr:housenumber'],t['addr:street'],t['addr:city']].filter(Boolean).join(' ');
        return{id:el.id,lat:la,lng:lo,name:nm,cat:classifyFacility(t),addr:ad,phone:t.phone||t['contact:phone']||'',website:t.website||t['contact:website']||''};
      }).filter((row: FacilityResult | null): row is FacilityResult => Boolean(row));
      if(rows.length>0) return rows;
    } catch {}
  }
  return [];
}
