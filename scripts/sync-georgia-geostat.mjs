#!/usr/bin/env node

import { chromium } from "playwright";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SOURCE_PAGE = "https://www.br.geostat.ge/register_geo/?lang=en";
const NACE_CODES = ["86.10.0", "86.21.0", "86.22.0", "86.23.0", "86.90.0"];
const USER_AGENT = "Occu-Med-Network-Map/1.0 (+https://github.com/Occumed79/Network-Map)";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const columns = [
  "source_record_id","source_url","name","normalized_name","address_line1",
  "formatted_address","city","state_region","postal_code","country_code",
  "lat","lng","phone","website","email","primary_provider_type",
  "capability_tags","quality_score","master_key",
];

function argument(name, fallback="") {
  const i=process.argv.indexOf(`--${name}`);
  return i>=0 ? String(process.argv[i+1]||"") : fallback;
}
const outputPath=argument("output");
if(!outputPath) throw new Error("--output is required");

const text=(v)=>v===null||v===undefined?"":String(v).trim();
const hash=(v)=>createHash("sha256").update(String(v)).digest("hex");
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
function normalized(v){
  return text(v).normalize("NFKD").replace(/[\u0300-\u036f]/gu,"").toLowerCase()
    .replace(/[^a-z0-9\u10a0-\u10ff]+/gu," ").trim().replace(/\s+/gu," ");
}
function postgresArray(values){
  return `{${[...new Set(values.filter(Boolean))].map(v=>`"${String(v).replaceAll("\\","\\\\").replaceAll('"','\\"')}"`).join(",")}}`;
}
function csvField(v){
  if(v===null||v===undefined||v==="") return "\\N";
  return `"${String(v).replace(/[\t\r\n]+/gu," ").replaceAll('"','""')}"`;
}
function classify(code,name){
  if(code==="86.10.0") return "hospital";
  if(code==="86.21.0") return "general_practitioner";
  if(code==="86.23.0") return "dental";
  if(/laborator/u.test(normalized(name))) return "lab";
  if(/radiolog|diagnost|imaging/u.test(normalized(name))) return "imaging";
  return code==="86.22.0" ? "specialist" : "healthcare_facility";
}
function stripHtml(value){
  return text(value)
    .replace(/<script[\s\S]*?<\/script>/giu," ")
    .replace(/<style[\s\S]*?<\/style>/giu," ")
    .replace(/<[^>]+>/gu," ")
    .replace(/&nbsp;/giu," ").replace(/&amp;/giu,"&")
    .replace(/&#39;/giu,"'").replace(/&quot;/giu,'"')
    .replace(/\s+/gu," ").trim();
}
function firstMatch(html,patterns){
  for(const pattern of patterns){
    const m=html.match(pattern);
    if(m) return stripHtml(m[1]);
  }
  return "";
}
function coordinatesFromHtml(html){
  const pairs=[
    [/\b(?:lat|latitude)[^0-9-]{0,60}([34][0-9]\.[0-9]{3,})/iu,/\b(?:lng|lon|longitude)[^0-9-]{0,60}(4[0-8]\.[0-9]{3,})/iu],
    [/value=["']([34][0-9]\.[0-9]{3,})["'][^>]*(?:lat|latitude)/iu,/value=["'](4[0-8]\.[0-9]{3,})["'][^>]*(?:lng|lon|longitude)/iu],
  ];
  for(const [latRe,lngRe] of pairs){
    const a=html.match(latRe), b=html.match(lngRe);
    if(a&&b){
      const lat=Number(a[1]),lng=Number(b[1]);
      if(lat>=40.8&&lat<=43.7&&lng>=40.0&&lng<=47.8) return {lat,lng};
    }
  }
  const nums=[...html.matchAll(/(?:^|[^0-9])([0-9]{2}\.[0-9]{4,})(?![0-9])/gu)].map(m=>Number(m[1]));
  for(const lat of nums.filter(n=>n>=40.8&&n<=43.7)){
    for(const lng of nums.filter(n=>n>=40.0&&n<=47.8)){
      if(lat!==lng) return {lat,lng};
    }
  }
  return null;
}
async function geocode(query){
  const u=new URL(NOMINATIM);
  u.searchParams.set("format","jsonv2");u.searchParams.set("limit","1");u.searchParams.set("countrycodes","ge");u.searchParams.set("q",query);
  try{
    const r=await fetch(u,{headers:{"user-agent":USER_AGENT,"accept-language":"ka,en"},signal:AbortSignal.timeout(30000)});
    if(r.status===429){await sleep(2000);return null;}
    if(!r.ok)return null;
    const data=await r.json();
    const lat=Number(data?.[0]?.lat),lng=Number(data?.[0]?.lon);
    return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=40.8&&lat<=43.7&&lng>=40.0&&lng<=47.8?{lat,lng}:null;
  }catch(_){return null;}
}

async function controlForEconomicActivity(page){
  return await page.evaluate(() => {
    const all=[...document.querySelectorAll("body *")];
    const label=all.find(el=>/Economic Activity \(NACE Rev\.2\)/i.test((el.textContent||"").trim()) && (el.children?.length||0)<6);
    if(!label) return null;
    let node=label;
    for(let i=0;i<5 && node;i+=1,node=node.parentElement){
      const controls=[...node.querySelectorAll("input,select")].map(el=>({
        tag:el.tagName.toLowerCase(),type:el.getAttribute("type")||"",name:el.getAttribute("name")||"",
        id:el.id||"",options:el.tagName==="SELECT"?[...el.options].map(o=>({value:o.value,text:o.textContent?.trim()||""})):[],
      }));
      if(controls.length) return controls;
    }
    return null;
  });
}

async function runSearch(page,code){
  await page.goto(SOURCE_PAGE,{waitUntil:"domcontentloaded",timeout:90000});
  await page.waitForTimeout(1500);
  const controls=await controlForEconomicActivity(page);
  if(!controls?.length) throw new Error("GeoStat Economic Activity controls were not discovered");

  let selected=false;
  for(const meta of controls){
    if(meta.tag==="select"){
      const option=meta.options.find(o=>o.text.includes(code)||o.value===code||o.text.startsWith(code));
      if(option){
        const locator=meta.id?page.locator(`#${CSS.escape(meta.id)}`):page.locator(`select[name="${meta.name.replaceAll('"','\\\"')}"]`).first();
        await locator.selectOption(option.value);
        selected=true;
        await page.waitForTimeout(400);
      }
    }
  }
  if(!selected){
    const group=page.getByText(/Economic Activity \(NACE Rev\.2\)/i).first();
    const container=group.locator("xpath=..");
    const inputs=container.locator('input:not([type="checkbox"]):not([type="submit"]):not([type="button"])');
    if(await inputs.count()){
      await inputs.last().fill(code);
      await page.waitForTimeout(700);
      const suggestion=page.getByText(new RegExp(`^${code.replaceAll(".","\\.")}`)).last();
      if(await suggestion.count() && await suggestion.isVisible().catch(()=>false)) await suggestion.click().catch(()=>{});
    }
  }

  const activeText=page.getByText(/Active economic entities/i).first();
  if(await activeText.count()){
    const container=activeText.locator("xpath=..");
    const checkbox=container.locator('input[type="checkbox"]').first();
    if(await checkbox.count() && !(await checkbox.isChecked().catch(()=>false))) await checkbox.check({force:true}).catch(()=>{});
  }

  const searchButton=page.getByRole("button",{name:/^Search$/i}).first();
  if(await searchButton.count()) await searchButton.click();
  else {
    const submit=page.locator('input[type="submit"][value*="Search" i], input[type="button"][value*="Search" i]').first();
    if(!(await submit.count())) throw new Error("GeoStat Search button not found");
    await submit.click();
  }
  await page.waitForTimeout(1800);

  const urls=new Set();
  let stagnant=0;
  for(let pass=0;pass<250 && stagnant<4;pass+=1){
    const found=await page.locator('a[href*="Stat_ID="][href*="action=History"]').evaluateAll(nodes=>nodes.map(a=>a.href));
    const before=urls.size; for(const url of found) urls.add(url);
    stagnant=urls.size===before?stagnant+1:0;
    const next=page.locator('a[rel="next"], button:has-text("Next"), a:has-text("Next"), a:has-text("›"), a:has-text("»")').filter({visible:true}).first();
    if(!(await next.count()) || !(await next.isVisible().catch(()=>false))) break;
    await next.click().catch(()=>{});
    await page.waitForTimeout(700);
  }
  if(urls.size<10){
    const diag=await page.evaluate(()=>({
      title:document.title,
      controls:[...document.querySelectorAll("input,select,button")].slice(0,120).map(el=>({
        tag:el.tagName,type:el.getAttribute("type"),name:el.getAttribute("name"),id:el.id,
        value:el.getAttribute("value"),text:(el.textContent||"").trim().slice(0,80)
      })),
      text:(document.body?.innerText||"").slice(0,5000)
    }));
    throw new Error(`GeoStat NACE ${code} search returned only ${urls.size} detail links: ${JSON.stringify(diag)}`);
  }
  return [...urls];
}

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({locale:"en-US",userAgent:USER_AGENT});
const page=await context.newPage();
const detailUrls=new Map();
try{
  for(const code of NACE_CODES){
    const urls=await runSearch(page,code);
    for(const url of urls) detailUrls.set(url,code);
  }
}finally{
  await page.close();
}
if(detailUrls.size<200){
  await context.close();await browser.close();
  throw new Error(`Only ${detailUrls.size} active GeoStat healthcare entities discovered; refusing incomplete output`);
}

const records=[];
const entries=[...detailUrls.entries()];
let cursor=0;
async function worker(){
  while(true){
    const index=cursor++;
    if(index>=entries.length)return;
    const [url,code]=entries[index];
    try{
      const response=await context.request.get(url,{timeout:60000});
      if(!response.ok())continue;
      const html=await response.text();
      const plain=stripHtml(html);
      if(/Active economic entit(?:y|ies)\s*:?\s*(?:No|არა აქტიური)/iu.test(plain))continue;
      const name=firstMatch(html,[
        /<h1[^>]*>([\s\S]*?)<\/h1>/iu,
        /(?:Name of the organization|ორგანიზაციის დასახელება)\s*<[^>]*>\s*([^<]{3,200})/iu,
      ]);
      if(!name)continue;
      const address=firstMatch(html,[
        /(?:Actual address|ფაქტობრივი მისამართი)\s*:?\s*<[^>]*>\s*([^<]{3,300})/iu,
        /(?:Legal address|იურიდიული მისამართი)\s*:?\s*<[^>]*>\s*([^<]{3,300})/iu,
      ]);
      const region=firstMatch(html,[/(?:Region|რეგიონი)\s*:?\s*<[^>]*>\s*([^<]{2,160})/iu]);
      const idMatch=url.match(/[?&]Stat_ID=(\d+)/iu);
      let coords=coordinatesFromHtml(html);
      if(!coords && address)coords=await geocode(`${address}, Georgia`);
      if(!coords)coords=await geocode(`${name}, Georgia`);
      if(!coords)continue;
      const providerType=classify(code,name);
      const formatted=[address,region,"Georgia"].filter(Boolean).join(", ");
      const sourceId=`ge-geostat:${idMatch?.[1]||hash(url).slice(0,20)}`;
      const master=`loc:${hash(JSON.stringify({name:normalized(name),country:"GE",lat:Number(coords.lat.toFixed(6)),lng:Number(coords.lng.toFixed(6))}))}`;
      records.push([
        sourceId,url,name,normalized(name),address,formatted,"",region,"","GE",coords.lat,coords.lng,
        "","","",providerType,postgresArray([providerType,"healthcare_facility","georgia_geostat",`nace:${code}`]),
        0.96,master
      ]);
    }catch(_){}
    if(index%25===0)await sleep(100);
  }
}
await Promise.all(Array.from({length:8},()=>worker()));
await context.close();await browser.close();

const unique=new Map(records.map(row=>[row[0],row]));
if(unique.size<200)throw new Error(`Only ${unique.size} GeoStat healthcare entities became map-renderable from ${detailUrls.size} active records`);
const sorted=[...unique.values()].sort((a,b)=>String(a[2]).localeCompare(String(b[2])));
fs.mkdirSync(path.dirname(outputPath),{recursive:true});
fs.writeFileSync(outputPath,`${[columns.join("\t"),...sorted.map(row=>row.map(csvField).join("\t"))].join("\n")}\n`,"utf8");
console.log(JSON.stringify({source:"ge_geostat_healthcare",discovered:detailUrls.size,mapRows:sorted.length,outputPath}));
