#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  documentCoordinates,
  documentSearchUrl,
  publicRegistryUrl,
} from "./lib/georgia-geostat-api.mjs";

const NACE_CODES = ["86.10.0", "86.21.0", "86.22.0", "86.23.0", "86.90.0"];
const FETCH_RETRIES = 4;
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
const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
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

async function fetchDocuments(code) {
  let lastError;
  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt += 1) {
    try {
      const response = await fetch(documentSearchUrl({ activityCode: code }), {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(90000),
      });
      if (!response.ok) throw new Error(`GeoStat API returned ${response.status}`);
      const payload = await response.json();
      const documents = Array.isArray(payload?.data) ? payload.data : [];
      if (!documents.length) throw new Error(`GeoStat API returned no active ${code} records`);
      return documents;
    } catch (error) {
      lastError = error;
      if (attempt < FETCH_RETRIES) await sleep(attempt * 1500);
    }
  }
  throw lastError;
}

const records=[];
for(const code of NACE_CODES){
  for(const document of await fetchDocuments(code)){
    const name=text(document.Full_Name);
    const coords=documentCoordinates(document);
    if(!name || !coords) continue;
    const address=text(document.Address2)||text(document.Address);
    const region=text(document.Region_name2)||text(document.Region_name);
    const city=text(document.City_name2)||text(document.City_name);
    const providerType=classify(code,name);
    const sourceId=`ge-geostat:${text(document.Stat_ID)||hash(JSON.stringify(document)).slice(0,20)}`;
    const master=`loc:${hash(JSON.stringify({name:normalized(name),country:"GE",lat:Number(coords.lat.toFixed(6)),lng:Number(coords.lng.toFixed(6))}))}`;
    records.push([
      sourceId,publicRegistryUrl(document),name,normalized(name),address,[address,city,region,"Georgia"].filter(Boolean).join(", "),city,region,"","GE",coords.lat,coords.lng,
      text(document.mob),text(document.web),text(document.Email),providerType,postgresArray([providerType,"healthcare_facility","georgia_geostat",`nace:${code}`]),
      0.96,master
    ]);
  }
}

const unique=new Map(records.map(row=>[row[0],row]));
if(unique.size<200)throw new Error(`Only ${unique.size} GeoStat healthcare entities became map-renderable from the official active registry API`);
const sorted=[...unique.values()].sort((a,b)=>a[0].localeCompare(b[0]));
fs.mkdirSync(path.dirname(outputPath),{recursive:true});
fs.writeFileSync(outputPath,[columns.join("\t"),...sorted.map(row=>row.map(csvField).join("\t"))].join("\n")+"\n");
console.log(JSON.stringify({source:"ge_geostat_healthcare",discovered:records.length,mapRows:sorted.length,outputPath}));
