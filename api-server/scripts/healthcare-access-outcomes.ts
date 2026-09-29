import assert from "node:assert/strict";
import { calculateUnifiedAccessScore } from "../src/lib/healthcareAccessScoring";
import { scoringRouteInternals } from "../src/routes/scoringDatabase";

const originalFetch = globalThis.fetch;
process.env.CENSUS_DATA_API_KEY = "acceptance-census-key";
const requestedUrls:string[]=[];
globalThis.fetch = (async (input:RequestInfo|URL) => {
  const url=String(input);requestedUrls.push(url);
  if(url.includes("api.census.gov")) return new Response(JSON.stringify([["NAME","B01003_001E","state","county"],["Fresno County, California","1020100","06","019"]]),{status:200});
  return new Response(JSON.stringify({features:[{attributes:{AREALAND:15431234567}}]}),{status:200});
}) as typeof fetch;
const fetchedFresno = await scoringRouteInternals.usProfile({lat:36.7,lng:-119.7,service:"primaryCare",countryCode:"US",admin1:"CA",countyFips:"06019"});
assert.equal(fetchedFresno?.countyFips,"06019");
assert.ok(requestedUrls.some(url=>url.includes("key=acceptance-census-key")),"CENSUS_DATA_API_KEY must be sent server-side");

process.env.HRSA_DATA_API_TOKEN="acceptance-hrsa-token";
process.env.HRSA_DATA_API_URL="https://data.hrsa.gov/test-healthcare-access";
let hrsaAuthorization="";
globalThis.fetch=(async(_input:RequestInfo|URL,init?:RequestInit)=>{hrsaAuthorization=String((init?.headers as Record<string,string>)?.Authorization||"");return new Response(JSON.stringify({hpsaScore:18,hpsaDesignated:true,muaDesignated:true,facilityCount:44,year:2025}),{status:200});}) as typeof fetch;
const fetchedHrsa=await scoringRouteInternals.hrsaEvidence(fetchedFresno!);
assert.equal(hrsaAuthorization,"Bearer acceptance-hrsa-token","HRSA_DATA_API_TOKEN must be sent server-side");
assert.equal(fetchedHrsa.hpsaScore,18);
globalThis.fetch=originalFetch;

const provider = (relevant:number, facilities:number, nearestMiles:number) => ({ relevant, facilities, nearestMiles, nearestName:"Nearest verified facility", nearestLat:0, nearestLng:0 });
const travel = (minutes:number) => ({ minutes, source:"Mapbox Directions" });
const shortage = (hpsaScore:number|null, muaDesignated:boolean|null, facilityCount:number|null) => ({ hpsaScore, hpsaDesignated:hpsaScore!==null, muaDesignated, facilityCount, sourceYear:2025 });

const fresnoInputs = scoringRouteInternals.usInputs(
  { countyFips:"06019", countyName:"Fresno County", state:"CA", population:1_020_100, landSquareMiles:5_958, density:171.2, sourceYear:2024 },
  shortage(10, true, 44), provider(312, 39, 8.4), travel(18.7),
);
const sparseInputs = scoringRouteInternals.usInputs(
  { countyFips:"30069", countyName:"Petroleum County", state:"MT", population:519, landSquareMiles:1_655, density:0.31, sourceYear:2024 },
  shortage(22, true, 1), provider(1, 1, 47.8), travel(83.2),
);
const fresno = calculateUnifiedAccessScore(fresnoInputs);
const sparse = calculateUnifiedAccessScore(sparseInputs);
assert.ok(sparse.score > fresno.score, "sparse rural county must score as more difficult than Fresno County");
assert.equal(fresno.confidence, 1);
assert.equal(sparse.confidence, 1);

const rows = (country:string, workforce:unknown = 2.8) => [
  { indicator_code:"SH.MED.PHYS.ZS", indicator_name:"Physicians", value:workforce, year:2023, source_name:"World Bank", geography_level:"country" },
  { indicator_code:"SH.MED.BEDS.ZS", indicator_name:"Beds", value:2.4, year:2022, source_name:"World Bank", geography_level:"country" },
  { indicator_code:"SH.UHC.SRVS.CV.XD", indicator_name:"UHC", value:82, year:2021, source_name:"WHO / World Bank", geography_level:"country" },
  { indicator_code:"SP.RUR.TOTL.ZS", indicator_name:"Rural", value:country==="GBR"?15.8:39.8, year:2024, source_name:"World Bank", geography_level:"country" },
  { indicator_code:"EN.POP.DNST", indicator_name:"Density", value:country==="GBR"?286:124, year:2024, source_name:"World Bank", geography_level:"country" },
] as any[];
const london = calculateUnifiedAccessScore(scoringRouteInternals.internationalInputs(rows("GBR"),provider(180,45,1.2),travel(8)));
const slupsk = calculateUnifiedAccessScore(scoringRouteInternals.internationalInputs(rows("POL",2.4),provider(18,6,4.9),travel(14)));
const missingWorkforce = calculateUnifiedAccessScore(scoringRouteInternals.internationalInputs(rows("POL",null),provider(18,6,4.9),travel(14)));
assert.equal(missingWorkforce.components.workforce, undefined, "NULL workforce must remain missing");
assert.ok(missingWorkforce.missingIndicators.includes("workforce"));
assert.ok(missingWorkforce.confidence < slupsk.confidence, "missing workforce must reduce confidence");
assert.ok(missingWorkforce.score > 1 && missingWorkforce.score < 5, "missing workforce must not force Easy or Critical");

const dental = calculateUnifiedAccessScore(scoringRouteInternals.usInputs(
  { countyFips:"06019", countyName:"Fresno County", state:"CA", population:1_020_100, landSquareMiles:5_958, density:171.2, sourceYear:2024 },
  shortage(10,true,44),provider(94,39,13.2),travel(29),
));
assert.notEqual(dental.score,fresno.score,"changing service evidence must change the score");

for (const [name, response] of Object.entries({ fresnoCounty:fresno, sparseRuralCounty:sparse, londonNationalFallback:{...london,nationalBaselineFallback:true}, slupskNationalFallback:{...slupsk,nationalBaselineFallback:true}, missingWorkforce })) {
  console.log(`${name}: ${JSON.stringify(response)}`);
}
console.log("Healthcare-access acceptance outcomes passed.");
