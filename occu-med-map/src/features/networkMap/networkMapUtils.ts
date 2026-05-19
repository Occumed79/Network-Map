import { LOCS, EXTRA_COORDS } from '../../lib/data';
import { STATE_POP } from '../../lib/populationData';
import { NAME2CODE, CATS, MLBL, DCOL, DLBL } from './networkMapConstants';
import { getVal } from '../../lib/data';

export function haversine(lat1:number,lng1:number,lat2:number,lng2:number):number {
  const R=6371000,dL=(lat2-lat1)*Math.PI/180,dN=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dN/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

export function fmtDist(m:number):string { return m<1000?Math.round(m)+'m':((m/1609.34).toFixed(1)+' mi'); }

export function estimateCityPopulationByTier(tier:number, state:string) {
  const baseByTier:Record<number, number> = {1:900000, 2:250000, 3:75000, 4:20000};
  const densityFactor = STATE_POP[state]?.density ? Math.max(0.65, Math.min(1.6, STATE_POP[state].density / 250)) : 1;
  return Math.round((baseByTier[tier] || 20000) * densityFactor);
}

export function calcDrive(lat1:number,lng1:number,lat2:number,lng2:number) {
  const R=3958.8,dL=(lat2-lat1)*Math.PI/180,dN=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dN/2)**2;
  const dist=R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  const hrs=(dist/55)*1.15;
  const h=Math.floor(hrs),m=Math.round((hrs-h)*60);
  return {miles:Math.round(dist),timeStr:h>0?`${h}h ${m}m`:`${m}m`,hours:hrs};
}

export function approxMiles(lat1:number,lng1:number,lat2:number,lng2:number):number {
  const dlat=lat2-lat1,dlng=lng2-lng1;
  return Math.round(Math.sqrt(dlat*dlat+dlng*dlng)*69);
}

export function isLikelyUsCoord(lat:number,lng:number):boolean {
  const inLower48 = lat>=24.3 && lat<=49.6 && lng>=-125.0 && lng<=-66.7;
  const inAlaska = lat>=51.2 && lat<=71.6 && lng>=-170.0 && lng<=-129.5;
  const inHawaii = lat>=18.8 && lat<=22.5 && lng>=-160.8 && lng<=-154.6;
  return inLower48 || inAlaska || inHawaii;
}

export function localSearch(q:string,limit=8):typeof LOCS {
  const ql=q.toLowerCase().replace(/,/g,' ').replace(/\s+/g,' ').trim();
  const results:typeof LOCS=[];
  for(const l of LOCS) {
    const name=l[0].toLowerCase(),state=l[1].toLowerCase();
    if(name===ql||`${name} ${state}`===ql||name.startsWith(ql)||`${name} ${state}`.includes(ql)) {
      results.push(l);
      if(results.length>=limit) break;
    }
  }
  if(results.length<limit) {
    for(const l of LOCS) {
      if(results.includes(l)) continue;
      if(l[0].toLowerCase().includes(ql)||l[1].toLowerCase()===ql) {
        results.push(l);
        if(results.length>=limit) break;
      }
    }
  }
  return results;
}

export function estimateDifficultyFromNeighbors(lat:number,lng:number,examKey:string):number {
  const candidates=LOCS.map(l=>({ l, dist: approxMiles(l[2],l[3],lat,lng) }))
    .sort((a,b)=>a.dist-b.dist)
    .slice(0,5);
  if(!candidates.length) return 3;
  let totalW=0,weightedV=0;
  for(const {l,dist} of candidates) {
    const w=1/(dist+1);
    weightedV+=getVal(l,examKey)*w;
    totalW+=w;
  }
  return Math.round(weightedV/totalW);
}

export function findNearby(lat:number,lng:number,excludeLoc:any,examKey:string) {
  return LOCS.filter(l=>l!==excludeLoc&&l[4]<=3)
    .map(l=>({ name:l[0], state:l[1], dist:approxMiles(l[2],l[3],lat,lng), v:getVal(l,examKey), tier:l[4] }))
    .filter(l=>l.dist>2&&l.dist<300)
    .sort((a,b)=>a.dist-b.dist).slice(0,4);
}

export function findNearestEasier(lat:number,lng:number,currentScore:number,examKey:string,excludeName:string) {
  return LOCS.filter(l=>l[0]!==excludeName)
    .map(l=>({ name:l[0], state:l[1], lat:l[2], lng:l[3], tier:l[4], dist:approxMiles(l[2],l[3],lat,lng), v:getVal(l,examKey) }))
    .filter(r=>r.dist>5&&r.dist<500&&r.v<currentScore)
    .sort((a,b)=>a.dist-b.dist).slice(0,5);
}

export function countProvidersInRadius(lat:number,lng:number,examKey:string) {
  const POP_BY_TIER:{[k:number]:number}={1:800000,2:180000,3:55000,4:18000};
  const nearby=LOCS.filter(l=>approxMiles(l[2],l[3],lat,lng)<=70);
  let estProviders=0;
  for(const l of nearby) {
    const tier=l[4];
    const provPer100k=l[16]||100;
    const pop=POP_BY_TIER[tier]||20000;
    const score=getVal(l,examKey);
    const scale=[1,0.85,0.65,0.4,0.18][score-1]||0.5;
    estProviders+=Math.round((provPer100k/100000)*pop*scale);
  }
  const avgDiff=nearby.length?(nearby.reduce((s,l)=>s+getVal(l,examKey),0)/nearby.length).toFixed(1):'—';
  return{citiesInRadius:nearby.length,estProviders:Math.max(1,estProviders),avgDifficulty:avgDiff};
}

export function classifyFacility(tags:any):string {
  const a=(tags.amenity||'').toLowerCase(),h=(tags.healthcare||'').toLowerCase(),
    n=(tags.name||'').toLowerCase(),o=(tags.office||'').toLowerCase(),
    b=(tags.building||'').toLowerCase(),s=(tags.shop||'').toLowerCase();
  if(n.includes('faa')) return 'faa';
  if(n.includes('dot')&&n.includes('chiro')) return 'dotchiro';
  if(n.includes('dot')&&(n.includes('md')||n.includes('np')||n.includes('do')||n.includes('pa')||n.includes('medical'))) return 'dotmd';
  if(n.includes('mammogram')||n.includes('breast imaging')) return 'mammogram';
  if(n.includes('audiology')||n.includes('audiogram')||n.includes('hearing')) return 'audiology';
  if(n.includes('drug screen')||n.includes('toxicology')||n.includes('urine test')) return 'drugscreen';
  if(n.includes('stress test')||n.includes('cardiology')) return 'stress';
  if(n.includes('physical exam')||n.includes('occupational health')) return 'physical';
  if(n.includes('urgent care')||a==='urgent_care'||h==='urgent_care') return 'urgent';
  if(a==='hospital'||h==='hospital'||b==='hospital'||n.includes('hospital')) return 'hospital';
  if(a==='clinic'||h==='clinic'||n.includes('clinic')) return 'clinic';
  if(a==='doctors'||h==='doctor'||o==='physician'||o==='medical') return 'doctor';
  if(a==='pharmacy'||h==='pharmacy'||s==='chemist'||n.includes('pharmacy')) return 'pharmacy';
  if(a==='dentist'||h==='dentist'||n.includes('dental')) return 'dentist';
  if(a==='optometrist'||h==='optometrist'||s==='optician') return 'eye';
  if(h==='physiotherapist') return 'physio';
  if(a==='laboratory'||h==='laboratory'||h==='sample_collection') return 'lab';
  if(a==='blood_bank'||h==='blood_bank') return 'blood';
  if(a==='nursing_home'||h==='nursing_home') return 'nursing';
  if(h) return 'clinic';
  return 'clinic';
}

export function normalizeLookupQuery(q:string):{normalized:string;stateCode:string|null} {
  const cleaned=q.replace(/,/g,' ').replace(/\s+/g,' ').trim();
  const tokens=cleaned.split(' ');
  if(!tokens.length) return {normalized:cleaned,stateCode:null};
  const last=tokens[tokens.length-1].toLowerCase();
  const stateCode=last.length===2?last.toUpperCase():(NAME2CODE[last]||null);
  if(stateCode) {
    tokens[tokens.length-1]=stateCode;
    return {normalized:tokens.join(' '),stateCode};
  }
  return {normalized:cleaned,stateCode:null};
}

export async function geocodeQuery(q:string):Promise<{lat:number;lng:number;display:string;city:string;state:string;zip:string}|null> {
  const {normalized:qNorm,stateCode}=normalizeLookupQuery(q);
  const results=localSearch(qNorm,8);
  if(results.length) {
    const best=stateCode ? (results.find(l=>l[1]===stateCode) || results[0]) : results[0];
    return{lat:best[2],lng:best[3],display:`${best[0]}, ${best[1]}`,city:best[0],state:best[1],zip:''};
  }
  const ql=qNorm.toLowerCase();
  if(EXTRA_COORDS[ql]) {
    const [lat,lng]=EXTRA_COORDS[ql];
    const parts=ql.split(' ');
    const city=parts.join(' ').replace(/ [a-z]{2}$/,'').replace(/^./,s=>s.toUpperCase());
    return{lat,lng,display:city,city,state:stateCode||'',zip:''};
  }
  try {
    const resp=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=us&limit=1&q=${encodeURIComponent(qNorm)}`);
    if(!resp.ok) return null;
    const data=await resp.json() as Array<{lat:string;lon:string;display_name?:string;address?:{city?:string;town?:string;village?:string;municipality?:string;state?:string;postcode?:string;}}>;
    if(!data?.length) return null;
    const hit=data[0];
    const addr=hit.address||{};
    const city=addr.city||addr.town||addr.village||addr.municipality||qNorm.replace(/ [A-Z]{2}$/,'');
    const state=addr.state? (NAME2CODE[addr.state.toLowerCase()]||stateCode||'') : (stateCode||'');
    return{ lat:Number(hit.lat), lng:Number(hit.lon), display:hit.display_name||`${city}${state?`, ${state}`:''}`, city, state, zip:addr.postcode||'' };
  } catch {
    return null;
  }
}

export function buildRecText(v:number):string {
  return {
    1:'Easy fill. Standard outreach should yield results within 24–48 hrs.',
    2:'Moderate effort. 2–5 day turnaround expected. Check contracted providers first.',
    3:'Plan ahead. Allow 5–10 business days. May need to contact 3–5 providers.',
    4:'Difficult market. Expect 1–2 week search. Begin outreach immediately.',
    5:'Critical gap. No reliable local coverage. Consider expanded radius, telehealth, or mobile unit.'
  }[v]||'';
}
