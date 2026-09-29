import { Router, type IRouter } from "express";
import { getProviderDatabaseProjects, getScoringPool } from "@workspace/db";
import {
  burdenScore,
  calculateUnifiedAccessScore,
  scarcityScore,
  type ComponentInput,
} from "../lib/healthcareAccessScoring";

const router: IRouter = Router();
const ACS_YEAR = 2024;
const SERVICE_TERMS: Record<string, string[]> = {
  primaryCare: ["primary", "general", "family", "internal"], specialist: ["specialist"],
  urgentCare: ["urgent", "walk_in"], dental: ["dent"], pharmacy: ["pharmacy"],
  vision: ["vision", "ophthalm", "optometr"], audiology: ["audiolog", "hearing"],
  occupationalMedicine: ["occupational"], physicalTherapy: ["physical"],
  drugScreening: ["drug", "laboratory", "lab"], dotExam: ["dot"], faaExam: ["faa"],
};

type ProviderEvidence = { relevant: number; facilities: number; nearestMiles: number | null };
type AssessmentQuery = { lat: number; lng: number; service: string; countryCode: string; admin1?: string; countyFips?: string };

function numberParam(value: unknown, min: number, max: number): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

async function fetchJson(url: URL): Promise<any> {
  const response = await fetch(url, { signal: AbortSignal.timeout(12_000), headers: { "user-agent": "Network-Map healthcare access scoring" } });
  if (!response.ok) throw new Error(`Upstream ${url.hostname} returned HTTP ${response.status}`);
  return response.json();
}

async function censusPopulation(state: string, countyFips?: string): Promise<{ population: number; source: string; year: number; level: string } | null> {
  if (!/^[A-Z]{2}$/.test(state)) return null;
  const key = process.env.CENSUS_DATA_API_KEY ? `&key=${encodeURIComponent(process.env.CENSUS_DATA_API_KEY)}` : "";
  const fipsResponse = await fetchJson(new URL(`https://api.census.gov/data/${ACS_YEAR}/acs/acs5?get=NAME,B01003_001E&for=state:*${key}`)).catch(() => null);
  if (!Array.isArray(fipsResponse)) return null;
  const stateNames: Record<string, string> = { AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming" };
  const row = fipsResponse.slice(1).find((item: string[]) => item[0] === stateNames[state]);
  if (!row) return null;
  const stateFips = row[2];
  if (countyFips && /^\d{5}$/.test(countyFips)) {
    const county = await fetchJson(new URL(`https://api.census.gov/data/${ACS_YEAR}/acs/acs5?get=NAME,B01003_001E&for=county:${countyFips.slice(2)}&in=state:${countyFips.slice(0,2)}${key}`)).catch(() => null);
    if (Array.isArray(county) && county[1]) return { population: Number(county[1][1]), source: "U.S. Census ACS 5-year", year: ACS_YEAR, level: "county" };
  }
  return { population: Number(row[1]), source: "U.S. Census ACS 5-year", year: ACS_YEAR, level: "state" };
}

async function providerEvidence(query: AssessmentQuery): Promise<ProviderEvidence> {
  const terms = SERVICE_TERMS[query.service] || [query.service];
  const results = await Promise.allSettled(getProviderDatabaseProjects().map(({ pool }) => pool.query(`
    SELECT
      count(*) FILTER (WHERE lower(coalesce(primary_provider_type,'')) LIKE ANY($3::text[])
        OR lower(coalesce(array_to_string(capability_tags,' '),'')) LIKE ANY($3::text[]))::int AS relevant,
      count(*) FILTER (WHERE lower(coalesce(primary_provider_type,'')) ~ 'hospital|facility|clinic|urgent')::int AS facilities,
      min(3959 * acos(least(1, greatest(-1, cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2)) + sin(radians($1)) * sin(radians(lat))))))
        FILTER (WHERE lower(coalesce(primary_provider_type,'')) LIKE ANY($3::text[])) AS nearest_miles
    FROM public.provider_master_map_view
    WHERE lat BETWEEN $1 - 1.5 AND $1 + 1.5 AND lng BETWEEN $2 - 1.5 AND $2 + 1.5
  `, [query.lat, query.lng, terms.map((term) => `%${term.toLowerCase()}%`)])));
  let relevant = 0; let facilities = 0; let nearestMiles: number | null = null;
  for (const result of results) if (result.status === "fulfilled") {
    const row = result.value.rows[0] || {};
    relevant += Number(row.relevant || 0); facilities += Number(row.facilities || 0);
    const distance = Number(row.nearest_miles);
    if (Number.isFinite(distance)) nearestMiles = nearestMiles === null ? distance : Math.min(nearestMiles, distance);
  }
  return { relevant, facilities, nearestMiles };
}

async function storedInternational(query: AssessmentQuery): Promise<any | null> {
  if (!process.env.DATABASE_URL_2) return null;
  const result = await getScoringPool().query(`
    SELECT * FROM public.international_access_scores
    WHERE upper(country_code)=upper($1) AND service_type IN ($2,'all','overall')
      AND ($3::text IS NULL OR lower(admin1_name)=lower($3) OR admin1_code=$3)
    ORDER BY (admin1_code IS NOT NULL) DESC, calculated_at DESC LIMIT 1
  `, [query.countryCode, query.service, query.admin1 || null]);
  return result.rows[0] || null;
}

async function buildAssessment(query: AssessmentQuery) {
  const evidence = await providerEvidence(query);
  const inputs: Record<string, ComponentInput> = {};
  let population: number | null = null;
  let geographyLevel = query.countryCode === "US" ? "state" : "country";
  let nationalBaselineFallback = false;
  if (query.countryCode === "US") {
    const census = await censusPopulation(query.admin1 || "", query.countyFips);
    if (census) { population = census.population; geographyLevel = census.level; }
    if (population && evidence.relevant > 0) inputs.workforce = { score: scarcityScore(evidence.relevant / population * 100_000, 120, 10), evidence: { relevantProviders: evidence.relevant, providersPer100k: Number((evidence.relevant / population * 100_000).toFixed(2)) }, sources: ["Network Map provider registries", "U.S. Census ACS 5-year"], year: ACS_YEAR };
    if (population && evidence.facilities > 0) inputs.capacity = { score: scarcityScore(evidence.facilities / population * 100_000, 20, 1), evidence: { facilities: evidence.facilities, facilitiesPer100k: Number((evidence.facilities / population * 100_000).toFixed(2)) }, sources: ["Network Map provider registries", "U.S. Census ACS 5-year"], year: ACS_YEAR };
  } else {
    const stored = await storedInternational(query).catch(() => null);
    if (stored) {
      for (const [key, column] of Object.entries({ workforce:"workforce_component",capacity:"capacity_component",coverage:"coverage_component",geographic:"geographic_component",localAccess:"local_access_component" })) {
        const score = Number(stored[column]); if (Number.isFinite(score)) inputs[key] = { score, evidence: stored.component_details?.[key] || {}, sources: stored.source_names || [], year: Math.max(...(stored.source_years || [0])) || undefined };
      }
      geographyLevel = stored.geography_level || "country";
      nationalBaselineFallback = geographyLevel === "country" && Boolean(query.admin1);
    }
  }
  if (evidence.nearestMiles !== null) inputs.localAccess = { score: burdenScore(evidence.nearestMiles, 2, 75), evidence: { nearestRelevantProviderMiles: Number(evidence.nearestMiles.toFixed(1)), localRelevantProviders: evidence.relevant }, sources: ["Network Map provider registries"] };
  if (evidence.relevant > 0) inputs.coverage = { score: scarcityScore(evidence.relevant, 50, 1), evidence: { relevantProvidersWithinApproximate90Miles: evidence.relevant, service: query.service }, sources: ["Network Map provider registries"] };
  const score = calculateUnifiedAccessScore(inputs as any);
  return { ...score, service: query.service, geography: { countryCode: query.countryCode, admin1: query.admin1 || null, level: geographyLevel, nationalBaselineFallback, lat: query.lat, lng: query.lng }, evidence: { population, populationDensity: null, rurality: null, nearestRelevantProviderMiles: evidence.nearestMiles, travelMinutes: null, relevantProviders: evidence.relevant, facilities: evidence.facilities }, warnings: score.missingIndicators.length ? ["Some authoritative indicators are unavailable; confidence has been reduced. Missing data was not scored as zero or Critical."] : [] };
}

router.get("/scoring/assessment", async (req, res) => {
  const lat = numberParam(req.query.lat, -90, 90); const lng = numberParam(req.query.lng, -180, 180);
  if (lat === null || lng === null) { res.status(400).json({ error: "Valid lat and lng are required" }); return; }
  const query: AssessmentQuery = { lat, lng, service: String(req.query.service || "primaryCare"), countryCode: String(req.query.countryCode || "US").toUpperCase(), admin1: req.query.admin1 ? String(req.query.admin1).toUpperCase() : undefined, countyFips: req.query.countyFips ? String(req.query.countyFips) : undefined };
  try { res.json({ ok: true, assessment: await buildAssessment(query) }); }
  catch (error) { res.status(503).json({ ok: false, error: error instanceof Error ? error.message : String(error) }); }
});

router.get("/scoring/us/states", async (req, res) => {
  const service = String(req.query.service || "primaryCare");
  const terms = SERVICE_TERMS[service] || [service];
  try {
    const key = process.env.CENSUS_DATA_API_KEY ? `&key=${encodeURIComponent(process.env.CENSUS_DATA_API_KEY)}` : "";
    const census = await fetchJson(new URL(`https://api.census.gov/data/${ACS_YEAR}/acs/acs5?get=NAME,B01003_001E&for=state:*${key}`));
    const populations = new Map<string, number>();
    for (const row of census.slice(1)) populations.set(String(row[2]), Number(row[1]));
    const projects = await Promise.allSettled(getProviderDatabaseProjects().map(({ pool }) => pool.query(`
      SELECT upper(admin_area) state,
        count(*) FILTER (WHERE lower(coalesce(primary_provider_type,'')) LIKE ANY($1::text[])
          OR lower(coalesce(array_to_string(capability_tags,' '),'')) LIKE ANY($1::text[]))::int relevant,
        count(*) FILTER (WHERE lower(coalesce(primary_provider_type,'')) ~ 'hospital|facility|clinic|urgent')::int facilities
      FROM public.provider_master_map_view WHERE country IS NULL OR upper(country) IN ('US','USA','UNITED STATES')
      GROUP BY upper(admin_area)
    `, [terms.map((term) => `%${term.toLowerCase()}%`)])));
    const counts = new Map<string, { relevant:number; facilities:number }>();
    for (const project of projects) if (project.status === "fulfilled") for (const row of project.value.rows) {
      if (!/^[A-Z]{2}$/.test(row.state || "")) continue;
      const prior=counts.get(row.state)||{relevant:0,facilities:0}; prior.relevant+=Number(row.relevant||0); prior.facilities+=Number(row.facilities||0); counts.set(row.state,prior);
    }
    const stateFips:Record<string,string>={"01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT","10":"DE","11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL","18":"IN","19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD","25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE","32":"NV","33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND","39":"OH","40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD","47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV","55":"WI","56":"WY"};
    const states=[];
    for (const [fips,population] of populations) {
      const state=stateFips[fips]; if (!state) continue; const evidence=counts.get(state);
      const inputs:Record<string,ComponentInput>={};
      if(evidence?.relevant) inputs.workforce={score:scarcityScore(evidence.relevant/population*100000,120,10),evidence:{relevantProviders:evidence.relevant,providersPer100k:evidence.relevant/population*100000},sources:["Network Map provider registries","U.S. Census ACS 5-year"],year:ACS_YEAR};
      if(evidence?.facilities) inputs.capacity={score:scarcityScore(evidence.facilities/population*100000,20,1),evidence:{facilities:evidence.facilities},sources:["Network Map provider registries","U.S. Census ACS 5-year"],year:ACS_YEAR};
      if(!Object.keys(inputs).length) continue;
      states.push({state,population,...calculateUnifiedAccessScore(inputs as any)});
    }
    res.json({ok:true,service,states});
  } catch(error) { res.status(503).json({ok:false,error:error instanceof Error?error.message:String(error)}); }
});

router.get("/scoring/status", async (_req, res) => {
  if (!process.env.DATABASE_URL_2?.trim()) { res.status(503).json({ ok:false, configured:false, error:"DATABASE_URL_2 is not configured" }); return; }
  try {
    const pool=getScoringPool(); const counts=await pool.query(`SELECT (SELECT count(*)::int FROM public.international_health_indicators) indicators,(SELECT count(*)::int FROM public.international_health_inequality_observations) inequality_observations,(SELECT count(*)::int FROM public.international_access_scores) access_scores`);
    res.json({ok:true,configured:true,databaseRole:"scoring",counts:counts.rows[0]});
  } catch(error) { res.status(503).json({ok:false,configured:true,error:error instanceof Error?error.message:String(error)}); }
});

export const scoringRouteInternals = { buildAssessment, censusPopulation, providerEvidence };
export default router;
