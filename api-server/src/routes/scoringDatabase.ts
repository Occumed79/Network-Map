import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { getProviderDatabaseProjects, getScoringPool } from "@workspace/db";
import { burdenScore, calculateUnifiedAccessScore, scarcityScore, type ComponentInput } from "../lib/healthcareAccessScoring";

const router: IRouter = Router();
const ACS_YEAR = 2024;
const LOCAL_RADIUS_MILES = 50;
const SERVICE_TERMS: Record<string, string[]> = {
  primaryCare: ["primary", "general", "family", "internal"], specialist: ["specialist"], urgentCare: ["urgent", "walk_in"],
  dental: ["dent"], pharmacy: ["pharmacy"], vision: ["vision", "ophthalm", "optometr"], audiology: ["audiolog", "hearing"],
  occupationalMedicine: ["occupational"], physicalTherapy: ["physical"], drugScreening: ["drug", "laboratory", "lab"], dotExam: ["dot"], faaExam: ["faa"],
};
const COUNTRY_ALIASES: Record<string, string> = { GB:"GBR", UK:"GBR", PL:"POL", US:"USA", DE:"DEU", FR:"FRA", CA:"CAN", AU:"AUS" };
const FIPS_TO_STATE:Record<string,string>={"01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT","10":"DE","11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL","18":"IN","19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD","25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE","32":"NV","33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND","39":"OH","40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD","47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV","55":"WI","56":"WY"};

type ProviderEvidence = { relevant:number; facilities:number; nearestMiles:number|null; nearestName:string|null; nearestLat:number|null; nearestLng:number|null };
type AssessmentQuery = { lat:number; lng:number; service:string; countryCode:string; admin1?:string; countyFips?:string };
type UsProfile = { countyFips:string; countyName:string; state:string; population:number; landSquareMiles:number; density:number; sourceYear:number };
type ShortageEvidence = { hpsaScore:number|null; hpsaDesignated:boolean|null; muaDesignated:boolean|null; facilityCount:number|null; sourceYear:number|null };
const hrsaStateCache = new Map<string, { expires:number; hpsa:any[]; mua:any[] }>();

function finite(value:unknown): number|null { if (value === null || value === undefined || value === "") return null; const n=Number(value); return Number.isFinite(n)?n:null; }
function numberParam(value:unknown,min:number,max:number):number|null { const n=finite(value); return n!==null&&n>=min&&n<=max?n:null; }
function normalizeCountry(code:string):string { const upper=code.toUpperCase(); return COUNTRY_ALIASES[upper]||upper; }
async function fetchJson(url:URL, init:RequestInit={}):Promise<any>{ const response=await fetch(url,{...init,signal:AbortSignal.timeout(15_000),headers:{"user-agent":"Network-Map healthcare access scoring",...(init.headers||{})}}); if(!response.ok)throw new Error(`Upstream ${url.hostname} returned HTTP ${response.status}`); return response.json(); }

async function resolveCounty(query:AssessmentQuery):Promise<{countyFips:string;countyName:string;state:string}|null>{
  if(query.countyFips&&/^\d{5}$/.test(query.countyFips)) return {countyFips:query.countyFips,countyName:query.countyFips,state:FIPS_TO_STATE[query.countyFips.slice(0,2)]||query.admin1||""};
  const url=new URL("https://geocoding.geo.census.gov/geocoder/geographies/coordinates"); url.searchParams.set("x",String(query.lng));url.searchParams.set("y",String(query.lat));url.searchParams.set("benchmark","Public_AR_Current");url.searchParams.set("vintage","Current_Current");url.searchParams.set("format","json");
  const data=await fetchJson(url);const county=data?.result?.geographies?.Counties?.[0];if(!county?.GEOID)return null;
  return {countyFips:String(county.GEOID),countyName:String(county.NAME||county.BASENAME||county.GEOID),state:FIPS_TO_STATE[String(county.STATE)]||query.admin1||""};
}
async function usProfile(query:AssessmentQuery):Promise<UsProfile|null>{
  const county=await resolveCounty(query).catch(()=>null);if(!county)return null;
  const key=process.env.CENSUS_DATA_API_KEY?`&key=${encodeURIComponent(process.env.CENSUS_DATA_API_KEY)}`:"";
  const census=await fetchJson(new URL(`https://api.census.gov/data/${ACS_YEAR}/acs/acs5?get=NAME,B01003_001E&for=county:${county.countyFips.slice(2)}&in=state:${county.countyFips.slice(0,2)}${key}`)).catch(()=>null);
  const population=finite(census?.[1]?.[1]);if(population===null)return null;
  const tiger=new URL("https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer/82/query");tiger.searchParams.set("where",`GEOID='${county.countyFips}'`);tiger.searchParams.set("outFields","AREALAND");tiger.searchParams.set("returnGeometry","false");tiger.searchParams.set("f","json");
  const areaMeters=finite((await fetchJson(tiger).catch(()=>null))?.features?.[0]?.attributes?.AREALAND);if(areaMeters===null)return null;
  const landSquareMiles=areaMeters/2_589_988.110336;
  return {...county,countyName:String(census?.[1]?.[0]||county.countyName).split(",")[0],population,landSquareMiles,density:population/landSquareMiles,sourceYear:ACS_YEAR};
}
async function hrsaEvidence(profile:UsProfile):Promise<ShortageEvidence>{
  const token=process.env.HRSA_DATA_API_TOKEN?.trim(); if(!token)return {hpsaScore:null,hpsaDesignated:null,muaDesignated:null,facilityCount:null,sourceYear:null};
  const configured=process.env.HRSA_DATA_API_URL?.trim();
  if (!configured) {
    let cached=hrsaStateCache.get(profile.state);
    if(!cached||cached.expires<Date.now()){
      const headers={Authorization:`Bearer ${token}`,"x-api-key":token};
      const [hpsa,mua]=await Promise.all([
        fetchJson(new URL(`https://data.hrsa.gov/hpsafind/find?state=${encodeURIComponent(profile.state)}&counties=&id=`),{headers}).catch(()=>[]),
        fetchJson(new URL(`https://data.hrsa.gov/Muafind/find?state=${encodeURIComponent(profile.state)}&counties=&id=`),{headers}).catch(()=>[]),
      ]);
      cached={expires:Date.now()+6*60*60*1000,hpsa:Array.isArray(hpsa)?hpsa:[],mua:Array.isArray(mua)?mua:[]};hrsaStateCache.set(profile.state,cached);
    }
    const county=profile.countyName.replace(/ County$/i,"").toLowerCase();
    const hpsa=cached.hpsa.filter(row=>String(row.PRIMARY_COUNTY_NM||row.county_name||row.HF_AUTO_HPSA_SITE_CNTY_NM||"").toLowerCase()===county&&String(row.hpsa_status_desc||row.hpsa_status||"").toLowerCase()!=="withdrawn");
    const mua=cached.mua.filter(row=>String(row.PRIMARY_COUNTY_NM||row.county_name||row.COUNTY_NM||"").toLowerCase()===county&&String(row.mua_status_desc||row.status||"").toLowerCase()!=="withdrawn");
    return {hpsaScore:hpsa.map(row=>finite(row.current_score??row.HPSA_SCORE)).filter((value):value is number=>value!==null).sort((a,b)=>b-a)[0]??null,hpsaDesignated:hpsa.length?true:false,muaDesignated:mua.length?true:false,facilityCount:hpsa.filter(row=>row.HF_AUTO_HPSA_SITE_ADDRESS).length||null,sourceYear:new Date().getUTCFullYear()};
  }
  const url=new URL(configured);url.searchParams.set("countyFips",profile.countyFips);
  const data=await fetchJson(url,{headers:{Authorization:`Bearer ${token}`,"x-api-key":token}}).catch(()=>null);
  if(!data)return {hpsaScore:null,hpsaDesignated:null,muaDesignated:null,facilityCount:null,sourceYear:null};
  return {hpsaScore:finite(data.hpsaScore??data.hpsa_score),hpsaDesignated:typeof(data.hpsaDesignated??data.hpsa_designated)==="boolean"?(data.hpsaDesignated??data.hpsa_designated):null,muaDesignated:typeof(data.muaDesignated??data.mua_designated)==="boolean"?(data.muaDesignated??data.mua_designated):null,facilityCount:finite(data.facilityCount??data.facility_count),sourceYear:finite(data.year)};
}
async function providerEvidence(query:AssessmentQuery):Promise<ProviderEvidence>{
  const terms=SERVICE_TERMS[query.service]||[query.service]; const patterns=terms.map(term=>`%${term.toLowerCase()}%`);
  const results=await Promise.allSettled(getProviderDatabaseProjects().map(({pool})=>pool.query(`WITH candidates AS (SELECT name,lat,lng,primary_provider_type,capability_tags,3959*acos(least(1,greatest(-1,cos(radians($1))*cos(radians(lat))*cos(radians(lng)-radians($2))+sin(radians($1))*sin(radians(lat))))) distance FROM public.provider_master_map_view WHERE lat BETWEEN $1-1 AND $1+1 AND lng BETWEEN $2-1.3 AND $2+1.3), relevant AS (SELECT * FROM candidates WHERE distance<=$4 AND (lower(coalesce(primary_provider_type,'')) LIKE ANY($3::text[]) OR lower(coalesce(array_to_string(capability_tags,' '),'')) LIKE ANY($3::text[]))) SELECT (SELECT count(*)::int FROM relevant) relevant,(SELECT count(*)::int FROM candidates WHERE distance<=$4 AND lower(coalesce(primary_provider_type,''))~'hospital|facility|clinic|urgent') facilities,(SELECT distance FROM relevant ORDER BY distance LIMIT 1) nearest_miles,(SELECT name FROM relevant ORDER BY distance LIMIT 1) nearest_name,(SELECT lat FROM relevant ORDER BY distance LIMIT 1) nearest_lat,(SELECT lng FROM relevant ORDER BY distance LIMIT 1) nearest_lng`,[query.lat,query.lng,patterns,LOCAL_RADIUS_MILES])));
  let relevant=0,facilities=0;let nearestMiles:number|null=null,nearestName:string|null=null,nearestLat:number|null=null,nearestLng:number|null=null;
  for(const result of results)if(result.status==="fulfilled"){const row=result.value.rows[0]||{};relevant+=Number(row.relevant||0);facilities+=Number(row.facilities||0);const distance=finite(row.nearest_miles);if(distance!==null&&(nearestMiles===null||distance<nearestMiles)){nearestMiles=distance;nearestName=row.nearest_name||null;nearestLat=finite(row.nearest_lat);nearestLng=finite(row.nearest_lng);}}
  return {relevant,facilities,nearestMiles,nearestName,nearestLat,nearestLng};
}
async function travelMinutes(query:AssessmentQuery,evidence:ProviderEvidence):Promise<{minutes:number|null;source:string|null}>{
  if(evidence.nearestMiles===null)return {minutes:null,source:null};const token=process.env.MAPBOX_ACCESS_TOKEN||process.env.VITE_MAPBOX_TOKEN;
  if(token&&evidence.nearestLng!==null&&evidence.nearestLat!==null){const url=new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${query.lng},${query.lat};${evidence.nearestLng},${evidence.nearestLat}`);url.searchParams.set("access_token",token);url.searchParams.set("overview","false");const seconds=finite((await fetchJson(url).catch(()=>null))?.routes?.[0]?.duration);if(seconds!==null)return {minutes:Number((seconds/60).toFixed(1)),source:"Mapbox Directions"};}
  return {minutes:Number(Math.max(1,evidence.nearestMiles/35*60).toFixed(1)),source:"Distance-based travel estimate"};
}
function localPopulation(profile:UsProfile):number{return Math.min(profile.population,profile.density*Math.PI*LOCAL_RADIUS_MILES**2);}
function usInputs(profile:UsProfile,shortage:ShortageEvidence,evidence:ProviderEvidence,travel:{minutes:number|null;source:string|null}):Partial<Record<keyof typeof import("../lib/healthcareAccessScoring").ACCESS_COMPONENT_WEIGHTS,ComponentInput>>{
  const population=localPopulation(profile);const inputs:Record<string,ComponentInput>={};
  if(evidence.relevant>0)inputs.workforce={score:Math.max(scarcityScore(evidence.relevant/population*100_000,120,10),shortage.hpsaScore===null?1:burdenScore(shortage.hpsaScore,0,26)),evidence:{relevantProviders:evidence.relevant,compatibleLocalPopulation:Math.round(population),providersPer100k:Number((evidence.relevant/population*100_000).toFixed(2)),hpsaScore:shortage.hpsaScore,hpsaDesignated:shortage.hpsaDesignated},sources:["Network Map provider registries","U.S. Census ACS 5-year",...(shortage.hpsaScore!==null?["HRSA HPSA"]:[])],year:profile.sourceYear};
  const facilities=shortage.facilityCount??evidence.facilities;if(facilities>0)inputs.capacity={score:scarcityScore(facilities/population*100_000,20,1),evidence:{facilities,facilitiesPer100k:Number((facilities/population*100_000).toFixed(2))},sources:[shortage.facilityCount!==null?"HRSA healthcare facilities":"Network Map provider registries"],year:shortage.sourceYear??profile.sourceYear};
  if(evidence.relevant>0)inputs.coverage={score:Math.max(scarcityScore(evidence.relevant,50,1),shortage.muaDesignated?4:1),evidence:{relevantProviders:evidence.relevant,muaDesignated:shortage.muaDesignated,serviceRadiusMiles:LOCAL_RADIUS_MILES},sources:["Network Map provider registries",...(shortage.muaDesignated!==null?["HRSA MUA/P"]:[])]};
  inputs.geographic={score:scarcityScore(profile.density,500,5),evidence:{populationDensity:profile.density,landSquareMiles:profile.landSquareMiles,ruralityProxy:"Census population density"},sources:["U.S. Census ACS 5-year","Census TIGER/Line"],year:profile.sourceYear};
  if(travel.minutes!==null)inputs.localAccess={score:burdenScore(travel.minutes,10,120),evidence:{nearestRelevantProviderMiles:evidence.nearestMiles,nearestRelevantProvider:evidence.nearestName,travelMinutes:travel.minutes},sources:[travel.source||"Network Map provider registries"]};return inputs as any;
}

type IndicatorRow={indicator_code:string;indicator_name:string;value:unknown;year:unknown;source_name:string;source_url?:string;geography_level:string;admin1_code?:string|null;admin1_name?:string|null};
function indicator(rows:IndicatorRow[],codes:string[]):IndicatorRow|undefined{return rows.filter(row=>codes.includes(row.indicator_code)&&finite(row.value)!==null).sort((a,b)=>Number(b.year)-Number(a.year))[0];}
function internationalInputs(rows:IndicatorRow[], evidence:ProviderEvidence, travel:{minutes:number|null;source:string|null}):Record<string,ComponentInput>{
  const inputs:Record<string,ComponentInput>={};const physicians=indicator(rows,["SH.MED.PHYS.ZS","SH.MED.PHYS.ZS"]);const nurses=indicator(rows,["SH.MED.NUMW.P3"]);const beds=indicator(rows,["SH.MED.BEDS.ZS"]);const uhc=indicator(rows,["SH.UHC.SRVS.CV.XD"]);const rural=indicator(rows,["SP.RUR.TOTL.ZS"]);const density=indicator(rows,["EN.POP.DNST"]);const population=indicator(rows,["SP.POP.TOTL"]);
  const source=(row:IndicatorRow)=>[row.source_name||"International health indicators"];
  if(physicians){const value=finite(physicians.value)!;inputs.workforce={score:scarcityScore(value,3,0.2),evidence:{physiciansPer1000:value,nursesPer1000:nurses?finite(nurses.value):null},sources:source(physicians),year:finite(physicians.year)??undefined};}
  if(beds){const value=finite(beds.value)!;inputs.capacity={score:scarcityScore(value,5,0.5),evidence:{bedsPer1000:value,localFacilities:evidence.facilities},sources:source(beds),year:finite(beds.year)??undefined};}
  if(uhc){const value=finite(uhc.value)!;inputs.coverage={score:scarcityScore(value,90,30),evidence:{universalHealthCoverageIndex:value,relevantProviders:evidence.relevant},sources:source(uhc),year:finite(uhc.year)??undefined};}
  if(rural||density){const ruralValue=rural?finite(rural.value):null;const densityValue=density?finite(density.value):null;const scores=[ruralValue===null?null:burdenScore(ruralValue,10,80),densityValue===null?null:scarcityScore(densityValue,500,5)].filter((value):value is number=>value!==null);inputs.geographic={score:scores.reduce((a,b)=>a+b,0)/scores.length,evidence:{ruralPopulationPercent:ruralValue,populationDensity:densityValue,population:population?finite(population.value):null},sources:[...new Set([...(rural?source(rural):[]),...(density?source(density):[])])],year:Math.max(finite(rural?.year)??0,finite(density?.year)??0)||undefined};}
  if(travel.minutes!==null)inputs.localAccess={score:burdenScore(travel.minutes,10,120),evidence:{nearestRelevantProviderMiles:evidence.nearestMiles,nearestRelevantProvider:evidence.nearestName,travelMinutes:travel.minutes,localRelevantProviders:evidence.relevant},sources:[travel.source||"Network Map provider registries"]};
  return inputs;
}
async function internationalRows(query:AssessmentQuery):Promise<{rows:IndicatorRow[];level:string;fallback:boolean}>{
  if(!process.env.DATABASE_URL_2)return {rows:[],level:"country",fallback:Boolean(query.admin1)};const code=normalizeCountry(query.countryCode);const pool=getScoringPool();
  if(query.admin1){const regional=await pool.query(`SELECT indicator_code,indicator_name,value,year,source_name,source_url,geography_level,admin1_code,admin1_name FROM public.international_health_indicators WHERE upper(country_code) IN (upper($1),upper($2)) AND (lower(admin1_name)=lower($3) OR lower(admin1_code)=lower($3)) ORDER BY year DESC`,[query.countryCode,code,query.admin1]);if(regional.rows.length)return {rows:regional.rows,level:"admin1",fallback:false};}
  const country=await pool.query(`SELECT indicator_code,indicator_name,value,year,source_name,source_url,geography_level,admin1_code,admin1_name FROM public.international_health_indicators WHERE upper(country_code) IN (upper($1),upper($2)) AND admin1_code IS NULL ORDER BY year DESC`,[query.countryCode,code]);return {rows:country.rows,level:"country",fallback:Boolean(query.admin1)};
}
async function persistInternationalScore(query:AssessmentQuery, result:ReturnType<typeof calculateUnifiedAccessScore>, level:string, fallback:boolean):Promise<void>{
  if(!process.env.DATABASE_URL_2)return;const pool=getScoringPool();const code=normalizeCountry(query.countryCode);const persistedAdmin1=level==="admin1"?query.admin1||null:null;const columns:any={workforce:result.components.workforce?.score??null,capacity:result.components.capacity?.score??null,coverage:result.components.coverage?.score??null,geographic:result.components.geographic?.score??null,localAccess:result.components.localAccess?.score??null};
  const details=Object.fromEntries(Object.entries(result.components).map(([key,value])=>[key,value?.evidence]));
  const params=[code,persistedAdmin1,query.service,result.score,result.confidence,columns.workforce,columns.capacity,columns.coverage,columns.geographic,columns.localAccess,JSON.stringify(details),result.sourceYears,result.sourceNames,result.missingIndicators,level,result.algorithmVersion];
  const updated=await pool.query(`UPDATE public.international_access_scores SET score=$4,confidence=$5,workforce_component=$6,capacity_component=$7,coverage_component=$8,geographic_component=$9,local_access_component=$10,component_details=$11::jsonb,source_years=$12,source_names=$13,missing_indicators=$14,geography_level=$15,algorithm_version=$16,calculated_at=now(),updated_at=now() WHERE country_code=$1 AND admin1_code IS NOT DISTINCT FROM $2 AND service_type=$3`,params);
  if(!updated.rowCount)await pool.query(`INSERT INTO public.international_access_scores(id,country_code,country_name,admin1_code,admin1_name,service_type,score,confidence,workforce_component,capacity_component,coverage_component,geographic_component,local_access_component,component_details,source_years,source_names,missing_indicators,geography_level,algorithm_version,calculated_at,updated_at) VALUES($17,$1,$1,$2,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15,$16,now(),now())`,[...params,randomUUID()]);
}
async function buildAssessment(query:AssessmentQuery){
  const evidence=await providerEvidence(query);const travel=await travelMinutes(query,evidence);let inputs:Record<string,ComponentInput>={};let population:number|null=null,density:number|null=null,rurality:number|null=null,geographyLevel="country",nationalBaselineFallback=false;let profile:UsProfile|null=null;
  if(query.countryCode==="US"){profile=await usProfile(query);if(profile){population=profile.population;density=profile.density;geographyLevel="county";const shortage=await hrsaEvidence(profile);inputs=usInputs(profile,shortage,evidence,travel) as Record<string,ComponentInput>;}}
  else{const available=await internationalRows(query);geographyLevel=available.level;nationalBaselineFallback=available.fallback;inputs=internationalInputs(available.rows,evidence,travel);const ruralRow=indicator(available.rows,["SP.RUR.TOTL.ZS"]),densityRow=indicator(available.rows,["EN.POP.DNST"]),popRow=indicator(available.rows,["SP.POP.TOTL"]);rurality=finite(ruralRow?.value);density=finite(densityRow?.value);population=finite(popRow?.value);}
  const score=calculateUnifiedAccessScore(inputs as any);if(query.countryCode!=="US")await persistInternationalScore(query,score,geographyLevel,nationalBaselineFallback).catch(()=>undefined);
  return {...score,service:query.service,geography:{countryCode:query.countryCode,admin1:query.admin1||null,countyFips:profile?.countyFips||null,countyName:profile?.countyName||null,level:geographyLevel,nationalBaselineFallback,lat:query.lat,lng:query.lng},evidence:{population,populationDensity:density,rurality,remotenessClass:density===null?null:density<10?"Remote":density<100?"Rural / low density":"Urban / higher density",nearestRelevantProviderMiles:evidence.nearestMiles,nearestRelevantProvider:evidence.nearestName,travelMinutes:travel.minutes,relevantProviders:evidence.relevant,facilities:evidence.facilities},warnings:score.missingIndicators.length?["Some authoritative indicators are unavailable; confidence has been reduced. Missing data was not scored as zero, Easy, or Critical."]:[]};
}
router.get("/scoring/assessment",async(req,res)=>{const lat=numberParam(req.query.lat,-90,90),lng=numberParam(req.query.lng,-180,180);if(lat===null||lng===null){res.status(400).json({error:"Valid lat and lng are required"});return;}const query:AssessmentQuery={lat,lng,service:String(req.query.service||"primaryCare"),countryCode:String(req.query.countryCode||"US").toUpperCase(),admin1:req.query.admin1?String(req.query.admin1):undefined,countyFips:req.query.countyFips?String(req.query.countyFips):undefined};try{res.json({ok:true,assessment:await buildAssessment(query)});}catch(error){res.status(503).json({ok:false,error:error instanceof Error?error.message:String(error)});}});
router.get("/scoring/us/states", async (req, res) => {
  const service = String(req.query.service || "primaryCare");
  const patterns = (SERVICE_TERMS[service] || [service]).map((term) => `%${term.toLowerCase()}%`);
  try {
    const tigerUrl = new URL("https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer/80/query");
    tigerUrl.searchParams.set("where", "1=1"); tigerUrl.searchParams.set("outFields", "STATE,AREALAND");
    tigerUrl.searchParams.set("returnGeometry", "false"); tigerUrl.searchParams.set("f", "json");
    const tigerRows = (await fetchJson(tigerUrl)).features || [];
    const stateAreas = new Map<string, number>(tigerRows.map((feature:any) => [String(feature.attributes?.STATE).padStart(2,"0"), Number(feature.attributes?.AREALAND) / 2_589_988.110336]));
    const key = process.env.CENSUS_DATA_API_KEY ? `&key=${encodeURIComponent(process.env.CENSUS_DATA_API_KEY)}` : "";
    const census = await fetchJson(new URL(`https://api.census.gov/data/${ACS_YEAR}/acs/acs5?get=NAME,B01003_001E&for=state:*${key}`));
    const populations = new Map<string,number|null>((census||[]).slice(1).map((row:any[]) => [String(row[2]).padStart(2,"0"), finite(row[1])] as [string,number|null]));
    const projects = await Promise.allSettled(getProviderDatabaseProjects().map(({pool}) => pool.query(`
      SELECT upper(admin_area) state,
        count(*) FILTER (WHERE lower(coalesce(primary_provider_type,'')) LIKE ANY($1::text[])
          OR lower(coalesce(array_to_string(capability_tags,' '),'')) LIKE ANY($1::text[]))::int relevant,
        count(*) FILTER (WHERE lower(coalesce(primary_provider_type,'')) ~ 'hospital|facility|clinic|urgent')::int facilities
      FROM public.provider_master_map_view
      WHERE admin_area IS NOT NULL AND (country IS NULL OR upper(country) IN ('US','USA','UNITED STATES'))
      GROUP BY upper(admin_area)
    `, [patterns])));
    const providerCounts = new Map<string,{relevant:number;facilities:number}>();
    for (const project of projects) if (project.status === "fulfilled") for (const row of project.value.rows) {
      const prior = providerCounts.get(row.state) || { relevant:0, facilities:0 };
      prior.relevant += Number(row.relevant || 0); prior.facilities += Number(row.facilities || 0); providerCounts.set(row.state, prior);
    }
    const states=[];
    for (const [fips,state] of Object.entries(FIPS_TO_STATE)) {
      const population=populations.get(fips)??null; if(population===null) continue;
      const {relevant,facilities}=providerCounts.get(state)||{relevant:0,facilities:0};
      const inputs:Record<string,ComponentInput>={};
      if(relevant) inputs.workforce={score:scarcityScore(relevant/population*100000,120,10),evidence:{relevant,providersPer100k:relevant/population*100000},sources:["Network Map provider registries","U.S. Census ACS 5-year"],year:ACS_YEAR};
      if(facilities) inputs.capacity={score:scarcityScore(facilities/population*100000,20,1),evidence:{facilities},sources:["Network Map provider registries"]};
      if(relevant) inputs.coverage={score:scarcityScore(relevant/population*100000,120,10),evidence:{relevant},sources:["Network Map provider registries"]};
      const landArea=finite(stateAreas.get(fips));
      if(landArea!==null){const density=population/landArea;inputs.geographic={score:scarcityScore(density,500,5),evidence:{populationDensity:density,landSquareMiles:landArea},sources:["U.S. Census ACS 5-year","Census TIGER/Line"],year:ACS_YEAR};}
      if (Object.keys(inputs).length) states.push({state,population,...calculateUnifiedAccessScore(inputs as any)});
    }
    res.json({ok:true,service,states});
  } catch(error) { res.status(503).json({ok:false,error:error instanceof Error?error.message:String(error)}); }
});
router.get("/scoring/status",async(_req,res)=>{if(!process.env.DATABASE_URL_2?.trim()){res.status(503).json({ok:false,configured:false,error:"DATABASE_URL_2 is not configured"});return;}try{const counts=await getScoringPool().query(`SELECT (SELECT count(*)::int FROM public.international_health_indicators) indicators,(SELECT count(*)::int FROM public.international_health_inequality_observations) inequality_observations,(SELECT count(*)::int FROM public.international_access_scores) access_scores`);res.json({ok:true,configured:true,databaseRole:"scoring",counts:counts.rows[0]});}catch(error){res.status(503).json({ok:false,configured:true,error:error instanceof Error?error.message:String(error)});}});
export const scoringRouteInternals={buildAssessment,usProfile,hrsaEvidence,providerEvidence,usInputs,internationalInputs,internationalRows};
export default router;
