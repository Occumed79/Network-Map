import assert from 'node:assert/strict';
import {parsePopulationEstimates} from '../src/lib/censusPopulation';
import scoringRouter, {scoringRouteInternals} from '../src/routes/scoringDatabase';
delete process.env.CENSUS_DATA_API_KEY;
globalThis.fetch = (async(input:any) => {
 const url=String(input);
 if(url.includes('api.census.gov')) return new Response('<html>Missing Key</html>');
 if(url.includes('www2.census.gov')) return new Response('SUMLEV,STATE,COUNTY,CTYNAME,POPESTIMATE2024\n050,06,019,Fresno County,1024125\n040,06,000,California,39431263\n');
 return new Response(JSON.stringify({features:[{attributes:{STATE:"06",AREALAND:15432655992}}]}));
}) as typeof fetch;
const p=await scoringRouteInternals.usProfile({lat:36.7378,lng:-119.7871,countryCode:'US',service:'primaryCare',countyFips:'06019'});
assert.equal(p?.population,1024125,'Missing Census API key must not discard official county population');
assert.equal((p as any)?.populationSource,'U.S. Census Population Estimates');
console.log('Census no-key fallback passes');

const parsed=parsePopulationEstimates('SUMLEV,STATE,COUNTY,CTYNAME,POPESTIMATE2024\n050,06,019,"Fresno, County",1024125\n040,06,000,California,39431263\n');
assert.equal(parsed.counties.get('06019')?.name,'Fresno, County');
assert.equal(parsed.states.get('06')?.population,39431263);
assert.throws(()=>parsePopulationEstimates('<html>Missing Key</html>'));
let statesResponse:any;
const handler=(scoringRouter as any).stack.find((layer:any)=>layer.route?.path==='/scoring/us/states').route.stack[0].handle;
await handler({query:{}},{json:(value:any)=>{statesResponse=value;},status:()=>({json:(value:any)=>{throw new Error(JSON.stringify(value));}})});
assert.equal(statesResponse.states[0].population,39431263);
assert.ok(statesResponse.states[0].sourceNames.includes('U.S. Census Population Estimates'));
console.log('County and state Census fallback, CSV validation, and provenance checks passed');
