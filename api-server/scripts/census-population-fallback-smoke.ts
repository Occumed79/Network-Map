import assert from 'node:assert/strict';
import {parsePopulationEstimates} from '../src/lib/censusPopulation';
import scoringRouter, {scoringRouteInternals} from '../src/routes/scoringDatabase';
delete process.env.CENSUS_DATA_API_KEY;
let areaRequested!:()=>void;
const areaReady=new Promise<void>(resolve=>{areaRequested=resolve;});
let acsRequests=0;
globalThis.fetch = (async(input:any) => {
 const url=String(input);
 if(url.includes('api.census.gov')) {
  acsRequests++;
  return process.env.CENSUS_DATA_API_KEY==='smoke-key'
   ? new Response(JSON.stringify([['NAME','B01003_001E'],['Fresno County',1020100]]))
   : new Response('<html>Missing Key</html>');
 }
 if(url.includes('www2.census.gov')) { await areaReady; return new Response('SUMLEV,STATE,COUNTY,CTYNAME,POPESTIMATE2024\n050,06,019,Fresno County,1024125\n040,06,000,California,39431263\n'); }
 areaRequested();
 return new Response(JSON.stringify({features:[{attributes:{STATE:"06",AREALAND:15432655992}}]}));
}) as typeof fetch;
let profileDeadline:ReturnType<typeof setTimeout>;
const p=await Promise.race([
 scoringRouteInternals.usProfile({lat:36.7378,lng:-119.7871,countryCode:'US',service:'primaryCare',countyFips:'06019'}),
 new Promise<never>((_,reject)=>{profileDeadline=setTimeout(()=>reject(new Error('Population and county area lookups must run concurrently')),1000);}),
]).finally(()=>clearTimeout(profileDeadline));
assert.equal(p?.population,1024125,'Missing Census API key must not discard official county population');
assert.equal((p as any)?.populationSource,'U.S. Census Population Estimates');
assert.equal(acsRequests,0,'Without a Census API key, use public estimates without waiting for an ACS rejection');
console.log('Census no-key fallback passes');
process.env.CENSUS_DATA_API_KEY='smoke-key';
const keyedProfile=await scoringRouteInternals.usProfile({lat:36.7378,lng:-119.7871,countryCode:'US',service:'primaryCare',countyFips:'06019'});
assert.equal(keyedProfile?.population,1020100);
assert.equal(keyedProfile?.populationSource,'U.S. Census ACS 5-year');
process.env.CENSUS_DATA_API_KEY='invalid-key';
const failedKeyProfile=await scoringRouteInternals.usProfile({lat:36.7378,lng:-119.7871,countryCode:'US',service:'primaryCare',countyFips:'06019'});
assert.equal(failedKeyProfile?.population,1024125);
assert.equal(failedKeyProfile?.populationSource,'U.S. Census Population Estimates');
delete process.env.CENSUS_DATA_API_KEY;

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
