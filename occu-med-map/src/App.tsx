import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import * as topojson from 'topojson-client';
import * as XLSX from 'xlsx';
import {
  SD, LOCS, MKEYS, MICONS, MLBL, DCOL, DLBL, ALL_METRICS, getVal, STATE_CTR, EXTRA_COORDS
} from './lib/data';
import { STATE_POP, densityColor, densityLabel } from './lib/populationData';
import {
  PROCEDURE_RATES, STATE_COST_INDEX, STATE_COST_TIER,
  adjustedPrice, tierColor,
} from './lib/procedurePrices';
import { buildCitiesInRadius, buildFacilityRows, queryFacilitiesInRadius, type FacilityResult } from './lib/radiusExtractor';

// ── FIPS → state abbreviation lookup ────────────────────────────────────────
const FIPS2CODE: Record<string,string> = {
  "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT","10":"DE",
  "11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL","18":"IN","19":"IA",
  "20":"KS","21":"KY","22":"LA","23":"ME","24":"MD","25":"MA","26":"MI","27":"MN",
  "28":"MS","29":"MO","30":"MT","31":"NE","32":"NV","33":"NH","34":"NJ","35":"NM",
  "36":"NY","37":"NC","38":"ND","39":"OH","40":"OK","41":"OR","42":"PA","44":"RI",
  "45":"SC","46":"SD","47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA",
  "54":"WV","55":"WI","56":"WY"
};
const NAME2CODE: Record<string,string> = {
  "alabama":"AL","alaska":"AK","arizona":"AZ","arkansas":"AR","california":"CA",
  "colorado":"CO","connecticut":"CT","delaware":"DE","district of columbia":"DC",
  "florida":"FL","georgia":"GA","hawaii":"HI","idaho":"ID","illinois":"IL","indiana":"IN",
  "iowa":"IA","kansas":"KS","kentucky":"KY","louisiana":"LA","maine":"ME","maryland":"MD",
  "massachusetts":"MA","michigan":"MI","minnesota":"MN","mississippi":"MS","missouri":"MO",
  "montana":"MT","nebraska":"NE","nevada":"NV","new hampshire":"NH","new jersey":"NJ",
  "new mexico":"NM","new york":"NY","north carolina":"NC","north dakota":"ND","ohio":"OH",
  "oklahoma":"OK","oregon":"OR","pennsylvania":"PA","rhode island":"RI","south carolina":"SC",
  "south dakota":"SD","tennessee":"TN","texas":"TX","utah":"UT","vermont":"VT",
  "virginia":"VA","washington":"WA","west virginia":"WV","wisconsin":"WI","wyoming":"WY"
};

const STATE_TZ: Record<string,number> = {
  ME:0,NH:0,VT:0,MA:0,RI:0,CT:0,NY:0,NJ:0,PA:0,DE:0,MD:0,VA:0,WV:0,NC:0,SC:0,GA:0,FL:0,
  OH:0,MI:0,IN:0,KY:0,TN:0,MS:1,WI:1,IL:1,MN:1,IA:1,MO:1,AR:1,LA:1,TX:1,OK:1,KS:1,NE:1,
  SD:1,ND:1,AL:1,MT:2,WY:2,CO:2,NM:2,ID:2,UT:2,AZ:2,NV:3,CA:3,OR:3,WA:3,AK:4,HI:5
};
const TZ_INFO = [
  {color:'#7c3aed',abbr:'ET',name:'Eastern',utc:'UTC-5/-4',labelLat:38.5,labelLng:-79.5},
  {color:'#1d4ed8',abbr:'CT',name:'Central',utc:'UTC-6/-5',labelLat:38.5,labelLng:-92.0},
  {color:'#0891b2',abbr:'MT',name:'Mountain',utc:'UTC-7/-6',labelLat:40.5,labelLng:-110.5},
  {color:'#c7c000',abbr:'PT',name:'Pacific',utc:'UTC-8/-7',labelLat:40.5,labelLng:-121.5},
  {color:'#be185d',abbr:'AK',name:'Alaska',utc:'UTC-9/-8',labelLat:64.0,labelLng:-153.0},
  {color:'#0f766e',abbr:'HI',name:'Hawaii',utc:'UTC-10',labelLat:20.5,labelLng:-157.3}
];

// ── Overpass mirrors ─────────────────────────────────────────────────────────
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
  'https://corsproxy.io/?https://overpass-api.de/api/interpreter',
  'https://corsproxy.io/?https://overpass.kumi.systems/api/interpreter'
];
const RADIUS_COLORS = ['#f43f5e','#f97316','#facc15','#22c55e','#06b6d4','#3b82f6','#a855f7','#ec4899'];

const CATS: Record<string,{ico:string;col:string;lbl:string}> = {
  hospital:{ico:'🏥',col:'#ef4444',lbl:'Hospital'},
  clinic:  {ico:'🏨',col:'#f97316',lbl:'Clinic'},
  urgent:  {ico:'⚡',col:'#f59e0b',lbl:'Urgent Care'},
  doctor:  {ico:'👨‍⚕️',col:'#84cc16',lbl:'Doctor / GP'},
  physical:{ico:'🩺',col:'#22d3ee',lbl:'Physical Exam'},
  faa:     {ico:'✈️',col:'#38bdf8',lbl:'FAA Exam'},
  dotmd:   {ico:'🚛',col:'#facc15',lbl:'DOT MD/DO/PA/NP'},
  dotchiro:{ico:'🦴',col:'#fb7185',lbl:'DOT Chiropractor'},
  mammogram:{ico:'🎀',col:'#f472b6',lbl:'Mammogram'},
  pharmacy:{ico:'💊',col:'#10b981',lbl:'Pharmacy'},
  dentist: {ico:'🦷',col:'#06b6d4',lbl:'Dentist'},
  audiology:{ico:'🎧',col:'#60a5fa',lbl:'Audiology'},
  stress:  {ico:'🫀',col:'#f97316',lbl:'Stress Test'},
  drugscreen:{ico:'🧪',col:'#a78bfa',lbl:'Drug Screen'},
  eye:     {ico:'👁️',col:'#3b82f6',lbl:'Eye Care'},
  physio:  {ico:'🦴',col:'#8b5cf6',lbl:'Physical Therapy'},
  lab:     {ico:'🧪',col:'#ec4899',lbl:'Lab / Diagnostics'},
  blood:   {ico:'🩸',col:'#dc2626',lbl:'Blood Bank'},
  nursing: {ico:'🏠',col:'#a78bfa',lbl:'Nursing Home'},
};

const PROVIDER_DIRS = [
  {name:'NAOHP Directory',url:'https://naohp.com/',tag:'OCC MED'},
  {name:'ACOEM Provider Search',url:'https://www.acoem.org/',tag:'OCC MED'},
  {name:'AAMRO MRO Locator',url:'https://www.aamro.com/',tag:'DRUG TEST'},
  {name:'DATIA Collector Network',url:'https://www.datia.org/',tag:'DRUG TEST'},
  {name:'CAOHC Au Program',url:'https://caohc.org/',tag:'AUDIOMETRY'},
  {name:'NIOSH OEM Residencies',url:'https://www.cdc.gov/niosh/',tag:'OCC MED'},
  {name:'AAOHN Nurse Locator',url:'https://www.aaohn.org/',tag:'OCC HEALTH'},
  {name:'NPI Registry',url:'https://npiregistry.cms.hhs.gov/',tag:'ANY'},
  {name:'HealthGrades',url:'https://www.healthgrades.com/',tag:'ANY'},
  {name:'Zocdoc',url:'https://www.zocdoc.com/',tag:'ANY'},
  {name:'CVS MinuteClinic',url:'https://www.cvs.com/minuteclinic/',tag:'URGENT'},
  {name:'Concentra',url:'https://www.concentra.com/',tag:'OCC MED'},
  {name:'AFC Urgent Care',url:'https://www.afcurgentcare.com/',tag:'URGENT'},
  {name:'Quest Diagnostics',url:'https://www.questdiagnostics.com/',tag:'DRUG TEST'},
  {name:'LabCorp',url:'https://www.labcorp.com/',tag:'DRUG TEST'},
  {name:'SpecFit360',url:'https://specfit360.com/',tag:'OCC MED'},
  {name:'US HealthWorks',url:'https://www.ushealthworks.com/',tag:'OCC MED'},
  {name:'National Drug Screening',url:'https://ndsinc.com/',tag:'DRUG TEST'},
];

// ── Price Finder: static data ────────────────────────────────────────────────
const PF_SERVICE_LABELS: Record<string,string> = {
  urgentCare:'Urgent Care', dental:'Dental', pharmacy:'Pharmacy',
  physicalExam:'Physical Exam', faamedical:'FAA Medical Exam',
  stressTest:'Stress Test', mammogram:'Mammogram',
  dotExam:'DOT Physical', vaccinations:'Vaccinations',
};
const PF_TAXONOMY_MAP: Record<string,string[]> = {
  urgentCare:  ['Clinic/Center, Urgent Care','Urgent Care'],
  dental:      ['Dentist General Practice','Dentist'],
  pharmacy:    ['Pharmacy'],
  physicalExam:['Occupational Medicine','Preventive Medicine','Family Medicine'],
  faamedical:  ['Aerospace Medicine','Occupational Medicine'],
  stressTest:  ['Cardiovascular Disease','Cardiology'],
  mammogram:   ['Diagnostic Radiology','Radiology'],
  dotExam:     ['Occupational Medicine'],
  vaccinations:['Public Health & General Preventive Medicine','Family Medicine'],
};
const PF_REF_PRICES: Record<string,{range:string;note:string}> = {
  urgentCare:  {range:'$120 – $280', note:'Self-pay typical; Medicare avg ~$120; FQHCs $20–$40 sliding scale'},
  dental:      {range:'$200 – $350', note:'Exam + cleaning; crown $1,000–$1,500; FQHCs ~$20–$80 sliding scale'},
  pharmacy:    {range:'Varies widely', note:'Use GoodRx or Cost Plus Drugs for generics — may save 80%+'},
  physicalExam:{range:'$100 – $200', note:'Medicare covers annual wellness visit free; occ-med physicals $100–$200'},
  faamedical:  {range:'$75 – $250', note:'Class 3 (private pilot) ~$75–$150; Class 1 (ATP) ~$150–$250'},
  stressTest:  {range:'$350 – $800', note:'Exercise stress test; echo stress test $800–$1,500; Medicare avg ~$350'},
  mammogram:   {range:'$100 – $300', note:'Medicare covers annual screening free; ACS & CDC free programs available'},
  dotExam:     {range:'$75 – $150', note:'FMCSA certified examiner required; Concentra/CareNow ~$75–$100'},
  vaccinations:{range:'$0 – $300',  note:'Flu/COVID often free; travel vaccines $100–$300; see VaccineFinder.org'},
};
const PF_ZOCDOC_SPEC: Record<string,string> = {
  urgentCare:'Urgent Care', dental:'Dentist', pharmacy:'General Practice',
  physicalExam:'General Practice', faamedical:'Internal Medicine',
  stressTest:'Cardiologist', mammogram:'OB-GYN',
  dotExam:'Internal Medicine', vaccinations:'General Practice',
};
const PF_SESAME_SPEC: Record<string,string> = {
  urgentCare:'urgent-care', dental:'dentist', pharmacy:'primary-care',
  physicalExam:'physical-exam', faamedical:'primary-care',
  stressTest:'cardiology', mammogram:'mammogram',
  dotExam:'dot-physical-exam', vaccinations:'primary-care',
};
const PF_MDSAVE_SLUG: Record<string,string> = {
  urgentCare:'urgent-care-visit', dental:'dental-exam-and-cleaning',
  pharmacy:'', physicalExam:'annual-physical-exam',
  faamedical:'faa-medical-exam', stressTest:'stress-test',
  mammogram:'mammogram', dotExam:'dot-physical-exam', vaccinations:'',
};
const PF_NEWCHOICE_SLUG: Record<string,string> = {
  urgentCare:'urgent-care', dental:'dental', pharmacy:'',
  physicalExam:'physical-exam', faamedical:'', stressTest:'stress-test',
  mammogram:'mammogram', dotExam:'', vaccinations:'',
};
function pfDeepLinks(city:string, state:string, svc:string) {
  const loc = encodeURIComponent(`${city}${state?', '+state:''}`);
  const links:Array<{name:string;url:string;tag:string;desc:string}> = [];
  const zSpec = PF_ZOCDOC_SPEC[svc];
  if (zSpec) links.push({name:'ZocDoc', tag:'BOOK ONLINE',
    desc:'Book in-network appointments & compare accepted insurance',
    url:`https://www.zocdoc.com/search?address=${loc}&dr_specialty=${encodeURIComponent(zSpec)}`});
  const mSlug = PF_MDSAVE_SLUG[svc];
  if (mSlug) links.push({name:'MDsave', tag:'PRE-PAY PRICE',
    desc:'Pre-purchase procedures at listed prices — up to 60% off',
    url:`https://www.mdsave.com/procedures/${mSlug}`});
  const sSpec = PF_SESAME_SPEC[svc];
  if (sSpec) links.push({name:'Sesame Care', tag:'CASH PAY',
    desc:'Direct-pay appointments with upfront transparent pricing',
    url:`https://sesamecare.com/search?specialty=${sSpec}&location=${loc}`});
  const ncSlug = PF_NEWCHOICE_SLUG[svc];
  if (ncSlug) links.push({name:'New Choice Health', tag:'COMPARE',
    desc:'Side-by-side price comparison at nearby facilities',
    url:`https://www.newchoicehealth.com/${ncSlug}?location=${loc}`});
  links.push({name:'Healthcare Bluebook', tag:'FAIR PRICE',
    desc:'Find the fair price for this service in your area',
    url:'https://www.healthcarebluebook.com/'});
  links.push({name:'FAIR Health Consumer', tag:'ESTIMATOR',
    desc:'Estimate out-of-pocket costs by zip code and procedure',
    url:'https://fairhealthconsumer.org/'});
  return links;
}
const PF_NETWORKS: Record<string,Array<{name:string;desc:string;url:string;tag:string}>> = {
  urgentCare:[
    {name:'Sesame Care',desc:'Transparent cash-pay urgent care. Prices listed upfront.',url:'https://sesamecare.com/urgent-care',tag:'CASH PAY'},
    {name:'GoodRx Care',desc:'Online urgent care with upfront pricing, starting at $20.',url:'https://www.goodrx.com/care/urgent-care',tag:'ONLINE'},
    {name:'MinuteClinic (CVS)',desc:'Walk-in urgent care — prices posted online before your visit.',url:'https://www.cvs.com/minuteclinic/visit-types-and-costs',tag:'TRANSPARENT'},
    {name:'Mira Health',desc:'Flat-fee urgent care membership — $45/mo includes visits & labs.',url:'https://www.talkmira.com/',tag:'FLAT FEE'},
    {name:'MDsave',desc:'Prepay for urgent care at listed prices and save up to 60%.',url:'https://www.mdsave.com/',tag:'PREPAY'},
    {name:'Solv Health',desc:'Book urgent care online — many locations list wait times and prices.',url:'https://www.solvhealth.com/',tag:'BOOKING'},
  ],
  dental:[
    {name:'Affordable Care',desc:'600+ dental practices with transparent fee schedules.',url:'https://www.affordablecare.com/',tag:'FEE SCHEDULE'},
    {name:'1-800-Dentist',desc:'Find local dentists and compare prices in your area.',url:'https://www.1800dentist.com/',tag:'COMPARE'},
    {name:'Open Care',desc:'Compares dental practices by price, insurance, and location.',url:'https://www.opencare.com/',tag:'COMPARE'},
    {name:'Dental Plans',desc:'Discount dental plans with listed savings on procedures.',url:'https://www.dentalplans.com/',tag:'DISCOUNT'},
    {name:'CostHelper Health',desc:'Real user-reported dental costs with ranges for common procedures.',url:'https://health.costhelper.com/dentist.html',tag:'COST GUIDE'},
  ],
  pharmacy:[
    {name:'GoodRx',desc:'Compare prescription prices at pharmacies near you.',url:'https://www.goodrx.com/',tag:'FREE COUPONS'},
    {name:'RxSaver',desc:'Compare pharmacy prices and print discount coupons.',url:'https://www.rxsaver.com/',tag:'COMPARE'},
    {name:'Mark Cuban Cost Plus Drugs',desc:'Transparent drug pricing — 1,000+ medications at cost + 15%.',url:'https://costplusdrugs.com/',tag:'COST + 15%'},
    {name:'Blink Health',desc:'Prepay for prescriptions online and pick up at local pharmacies.',url:'https://www.blinkhealth.com/',tag:'PREPAY'},
  ],
  physicalExam:[
    {name:'Sesame Care – Physical Exams',desc:'Book a physical exam with upfront transparent pricing.',url:'https://sesamecare.com/physical-exam',tag:'CASH PAY'},
    {name:'Concentra',desc:'Occupational health physicals with pricing available by location.',url:'https://www.concentra.com/',tag:'OCC HEALTH'},
    {name:'MinuteClinic – Annual Physical',desc:'CVS walk-in physical exams with published visit costs.',url:'https://www.cvs.com/minuteclinic/services/preventive-care/physical-exams',tag:'WALK-IN'},
    {name:'FAIR Health Consumer',desc:'Look up fair prices for physical exam codes in your zip code.',url:'https://fairhealthconsumer.org/',tag:'PRICE GUIDE'},
  ],
  faamedical:[
    {name:'FAA AME Locator',desc:'Official FAA tool to find certified Aviation Medical Examiners near you.',url:'https://designee.faa.gov/designeeLocator',tag:'OFFICIAL FAA'},
    {name:'AOPA Medical Certification',desc:'AOPA guide to FAA medical exams with typical cost ranges.',url:'https://www.aopa.org/go-fly/medical-resources/a-guide-to-faa-medical-certification',tag:'COST GUIDE'},
    {name:'AeroMD',desc:'Specialized FAA medical exam service with upfront online booking.',url:'https://aeromd.com/',tag:'SPECIALIST'},
    {name:'MDsave – FAA Medical',desc:'Find and pre-purchase FAA exam packages where available.',url:'https://www.mdsave.com/',tag:'PREPAY'},
  ],
  stressTest:[
    {name:'MDsave – Stress Test',desc:'Pre-purchase treadmill stress test at listed prices, up to 60% off.',url:'https://www.mdsave.com/procedures/stress-test',tag:'PREPAY'},
    {name:'Healthcare Bluebook',desc:'Find fair prices for exercise stress tests in your area.',url:'https://www.healthcarebluebook.com/',tag:'FAIR PRICE'},
    {name:'New Choice Health',desc:'Compare stress test prices at facilities near you.',url:'https://www.newchoicehealth.com/',tag:'COMPARE'},
    {name:'Sesame Care – Cardiology',desc:'Book cardiology consultations with upfront transparent pricing.',url:'https://sesamecare.com/',tag:'CASH PAY'},
  ],
  mammogram:[
    {name:'MDsave – Mammogram',desc:'Pre-purchase screening mammograms at listed prices.',url:'https://www.mdsave.com/procedures/mammogram',tag:'PREPAY'},
    {name:'New Choice Health – Mammogram',desc:'Compare mammogram prices at imaging centers near you.',url:'https://www.newchoicehealth.com/mammogram',tag:'COMPARE'},
    {name:'Susan G. Komen – Free Screening',desc:'Connects uninsured women to free or low-cost mammograms.',url:'https://www.komen.org/breast-health/screening/mammograms/free-low-cost-mammograms/',tag:'FREE/LOW COST'},
    {name:'CDC NBCCEDP',desc:'National Breast & Cervical Cancer Early Detection — free mammograms for qualifying women.',url:'https://www.cdc.gov/cancer/nbccedp/',tag:'FREE PROGRAM'},
  ],
  dotExam:[
    {name:'Concentra – DOT Physicals',desc:'DOT physical exams at 500+ locations. Prices typically $75–$150.',url:'https://www.concentra.com/occupational-health/dot-physicals/',tag:'CHAIN PRICING'},
    {name:'CareNow – DOT Physicals',desc:'Urgent care chain offering DOT exams with online check-in.',url:'https://www.carenow.com/services/dot-physical/',tag:'WALK-IN'},
    {name:'FMCSA Medical Examiner Locator',desc:'Official FMCSA tool to find certified DOT medical examiners near you.',url:'https://ai.fmcsa.dot.gov/mcs150/commonMESearchForm.aspx',tag:'OFFICIAL FMCSA'},
    {name:'OHS Health',desc:'Occupational health clinics specializing in DOT exams with listed fees.',url:'https://ohshealth.com/',tag:'TRANSPARENT'},
  ],
  vaccinations:[
    {name:'VaccineFinder (CDC)',desc:'Official CDC tool to find COVID, flu, and other vaccines near you.',url:'https://vaccinefinder.org/',tag:'FREE / CDC'},
    {name:'CVS Pharmacy – Vaccines',desc:'Walk-in vaccinations with prices listed online.',url:'https://www.cvs.com/immunizations/in-store-immunizations',tag:'PRICE LIST'},
    {name:'Walgreens – Vaccines',desc:'Walk-in vaccine clinic with published vaccine prices.',url:'https://www.walgreens.com/topic/pharmacy/walgreens-immunization-services.jsp',tag:'PRICE LIST'},
    {name:'Vaccines.gov',desc:'Find flu shots, travel vaccines, and immunization clinics near you.',url:'https://www.vaccines.gov/',tag:'LOCATOR'},
  ],
};
const PF_RESOURCES = [
  {name:'Healthcare Bluebook',desc:'Fair price range for medical procedures in your area.',url:'https://www.healthcarebluebook.com/',tag:'FAIR PRICE'},
  {name:'FAIR Health Consumer',desc:'Estimate out-of-pocket costs by procedure and zip code.',url:'https://fairhealthconsumer.org/',tag:'ESTIMATOR'},
  {name:'ClearHealthCosts',desc:'Crowdsourced prices for medical procedures. Find what others paid.',url:'https://clearhealthcosts.com/',tag:'CROWDSOURCED'},
  {name:'New Choice Health',desc:'Compare procedure prices at facilities near you.',url:'https://www.newchoicehealth.com/',tag:'COMPARE'},
];

// ── Utils ─────────────────────────────────────────────────────────────────────
function haversine(lat1:number,lng1:number,lat2:number,lng2:number):number {
  const R=6371000,dL=(lat2-lat1)*Math.PI/180,dN=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dN/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function fmtDist(m:number):string { return m<1000?Math.round(m)+'m':((m/1609.34).toFixed(1)+' mi'); }

function calcDrive(lat1:number,lng1:number,lat2:number,lng2:number) {
  const R=3958.8,dL=(lat2-lat1)*Math.PI/180,dN=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dN/2)**2;
  const dist=R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  const hrs=(dist/55)*1.15;
  const h=Math.floor(hrs),m=Math.round((hrs-h)*60);
  return {miles:Math.round(dist),timeStr:h>0?`${h}h ${m}m`:`${m}m`,hours:hrs};
}

function approxMiles(lat1:number,lng1:number,lat2:number,lng2:number):number {
  const dlat=lat2-lat1,dlng=lng2-lng1;
  return Math.round(Math.sqrt(dlat*dlat+dlng*dlng)*69);
}

function isLikelyUsCoord(lat:number,lng:number):boolean {
  const inLower48 = lat>=24.3 && lat<=49.6 && lng>=-125.0 && lng<=-66.7;
  const inAlaska = lat>=51.2 && lat<=71.6 && lng>=-170.0 && lng<=-129.5;
  const inHawaii = lat>=18.8 && lat<=22.5 && lng>=-160.8 && lng<=-154.6;
  return inLower48 || inAlaska || inHawaii;
}

function localSearch(q:string,limit=8):typeof LOCS {
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

function estimateDifficultyFromNeighbors(lat:number,lng:number,examKey:string):number {
  const candidates=LOCS.map(l=>{
    const dist=approxMiles(l[2],l[3],lat,lng);
    return{l,dist};
  }).sort((a,b)=>a.dist-b.dist).slice(0,5);
  if(!candidates.length) return 3;
  let totalW=0,weightedV=0;
  for(const {l,dist} of candidates) {
    const w=1/(dist+1);
    weightedV+=getVal(l,examKey)*w;
    totalW+=w;
  }
  return Math.round(weightedV/totalW);
}

function findNearby(lat:number,lng:number,excludeLoc:any,examKey:string) {
  return LOCS.filter(l=>l!==excludeLoc&&l[4]<=3)
    .map(l=>{const dist=approxMiles(l[2],l[3],lat,lng);return{name:l[0],state:l[1],dist,v:getVal(l,examKey),tier:l[4]};})
    .filter(l=>l.dist>2&&l.dist<300)
    .sort((a,b)=>a.dist-b.dist).slice(0,4);
}

function findNearestEasier(lat:number,lng:number,currentScore:number,examKey:string,excludeName:string) {
  return LOCS.filter(l=>l[0]!==excludeName)
    .map(l=>{
      const dist=approxMiles(l[2],l[3],lat,lng);
      const v=getVal(l,examKey);
      return{name:l[0],state:l[1],lat:l[2],lng:l[3],tier:l[4],dist,v};
    })
    .filter(r=>r.dist>5&&r.dist<500&&r.v<currentScore)
    .sort((a,b)=>a.dist-b.dist).slice(0,5);
}

function countProvidersInRadius(lat:number,lng:number,examKey:string) {
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

function classifyFacility(tags:any):string {
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

function normalizeLookupQuery(q:string):{normalized:string;stateCode:string|null} {
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

async function geocodeQuery(q:string):Promise<{lat:number;lng:number;display:string;city:string;state:string;zip:string}|null> {
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
    return{
      lat:Number(hit.lat),
      lng:Number(hit.lon),
      display:hit.display_name||`${city}${state?`, ${state}`:''}`,
      city,
      state,
      zip:addr.postcode||'',
    };
  } catch {
    return null;
  }
}

// ── Build popup HTML ──────────────────────────────────────────────────────────
function buildStatePopup(postal:string):string {
  const d=SD[postal];
  if(!d) return `<div class="pi"><div class="pt">${postal}</div></div>`;
  const pop=STATE_POP[postal];
  const tier=STATE_COST_TIER[postal]||'Average';
  const costIdx=STATE_COST_INDEX[postal]??1.0;
  const metrics=ALL_METRICS;
  const rows=metrics.map(m=>{
    const v=getVal(d,m);
    return `<div class="pcrow">
      <span class="pcico">${MICONS[m]}</span>
      <span class="pcn">${MLBL[m]}</span>
      <div class="pct"><div class="pcf" style="width:${v*20}%;background:${DCOL[v]}"></div></div>
      <span class="pcs" style="color:${DCOL[v]}">${DLBL[v]}</span>
    </div>`;
  }).join('');
  const popBlock=pop?`
    <div class="pdiv"></div>
    <div class="pcl">POPULATION (2020 CENSUS)</div>
    <div class="pg">
      <div><div class="psl">Population</div><div class="psv">${pop.pop.toLocaleString()}</div></div>
      <div><div class="psl">Density</div><div class="psv">${pop.density>=1000?(pop.density/1000).toFixed(1)+'k':Math.round(pop.density)}/mi²</div></div>
      <div><div class="psl">Land Area</div><div class="psv">${pop.area.toLocaleString()} mi²</div></div>
    </div>
    <div class="pdiv"></div>
    <div class="pcl">HEALTHCARE COST INDEX</div>
    <div class="pg">
      <div><div class="psl">Cost Tier</div><div class="psv" style="color:${tierColor(tier)}">${tier}</div></div>
      <div><div class="psl">vs. National</div><div class="psv" style="color:${costIdx>1.05?'#f97316':costIdx<0.95?'#22c55e':'#67e8f9'}">${costIdx>=1?'+':''}${((costIdx-1)*100).toFixed(0)}%</div></div>
    </div>`:'';
  return `<div class="pi">
    <div class="pt">${d.n}</div>
    <div class="ps">${postal} · ${d.rur}% Rural</div>
    <div class="pg">
      <div><div class="psl">Providers/100k</div><div class="psv">${d.prov}</div></div>
      <div><div class="psl">Avg Wait</div><div class="psv">${d.wait}d</div></div>
    </div>
    ${popBlock}
    <div class="pdiv"></div>
    <div class="pcl">SERVICE METRICS</div>
    ${rows}
  </div>`;
}

function buildCityPopup(loc:any,examKey:string):string {
  const [name,state,,,,,,,,,,,,,,,,prov,wait]=loc;
  const tier=loc[4];
  const v=getVal(loc,examKey);
  const col=DCOL[v];
  const tierLabel=tier===1?'Major Metro':tier===2?'Mid-Size City':tier===3?'Small City':'Rural';
  const metrics=ALL_METRICS;
  const rows=metrics.map(m=>{
    const mv=getVal(loc,m);
    const isHL=m===examKey;
    return `<div class="pcrow" style="${isHL?'background:rgba(59,130,246,0.06);padding:1px 3px;border-radius:3px':''}">
      <span class="pcico">${MICONS[m]}</span>
      <span class="pcn" style="${isHL?'color:#cdd9f0;font-weight:600':''}">${MLBL[m]}</span>
      <div class="pct"><div class="pcf" style="width:${mv*20}%;background:${DCOL[mv]}"></div></div>
      <span class="pcs" style="color:${DCOL[mv]}">${DLBL[mv]}</span>
    </div>`;
  }).join('');
  return `<div class="pi">
    <div class="pt">${name}</div>
    <div class="ps">${state} · ${tierLabel.toUpperCase()} · ${prov} prov/100k · ~${wait}d wait</div>
    <div class="pb" style="background:${col}12;border:1px solid ${col}30;color:${col}">
      <span style="width:8px;height:8px;border-radius:50%;background:${col};display:inline-block;box-shadow:0 0 6px ${col}"></span>
      ${MLBL[examKey]}: <strong>${DLBL[v]}</strong> (${v}/5)
    </div>
    <div class="pdiv"></div>
    <div class="pcl">ALL METRICS</div>
    ${rows}
  </div>`;
}

// ── Report generator ─────────────────────────────────────────────────────────
interface ReportData {
  locName:string;stateCode:string;examKey:string;
  scores:{key:string;v:number}[];
  nearby:{name:string;state:string;dist:number;v:number}[];
  recommendation:number;isGeo:boolean;
  prov:number|null;wait:number|null;tier:number|null;
  queryCity:string;queryState:string;
}

interface VerifiedProviderRef {
  name:string;
  npi:string;
  taxonomy:string;
  address:string;
  phone:string;
  detailsUrl:string;
}

interface EvidencePayload {
  providers:VerifiedProviderRef[];
  fetchedAt:string;
  querySummary:string;
  sourceLinks:{label:string;url:string}[];
  warning:string;
}

function examTaxonomyHint(examKey:string):string {
  const map:Record<string,string>={
    dental:'Dentist',
    pharmacy:'Pharmacy',
    vision:'Optometrist',
    audiology:'Audiologist',
    dot:'Occupational Medicine',
    urgentCare:'Urgent Care',
    primaryCare:'Family Medicine',
  };
  return map[examKey] || 'Clinic/Center';
}

function generateReportHtml(data:ReportData,evidence:EvidencePayload|null):string {
  const {locName,stateCode,examKey,scores,nearby,recommendation,isGeo,prov,wait,tier}=data;
  const today=new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  const examLabel=MLBL[examKey]||'All Services';
  const ps=scores.find(s=>s.key===examKey)||scores[0];
  const col=DCOL[ps.v];
  const urgency=ps.v>=5?'CRITICAL':ps.v>=4?'HIGH PRIORITY':ps.v>=3?'PLAN AHEAD':ps.v>=2?'STANDARD':'ROUTINE';
  const urgencyColor=ps.v>=5?'#ef4444':ps.v>=4?'#f97316':ps.v>=3?'#f59e0b':ps.v>=2?'#84cc16':'#10b981';
  const recText:{[k:number]:string}={
    1:'Standard outreach. Results expected within 24–48 hours using direct network list.',
    2:'Moderate effort required. Allow 2–5 day turnaround. Check contracted providers first, then expand to credentialed network.',
    3:'Plan ahead. Allow 5–10 business days. May require contacting 3–5 providers. Recommend scheduling buffer for contractor.',
    4:'Difficult market. Begin outreach immediately. Expect 1–2 week search window. Prepare contractor for possible drive to adjacent metro area.',
    5:'Critical coverage gap. No reliable local providers. Recommended actions: (1) expand search radius to nearest accessible metro, (2) evaluate telehealth pre-screening options, (3) consider mobile occupational health unit if request volume justifies.'
  };
  const scoreBars=scores.map(s=>`<tr>
    <td style="padding:5px 10px 5px 0;font-size:11px;color:#334155;width:160px;white-space:nowrap">${MLBL[s.key]}</td>
    <td style="padding:5px 8px 5px 0;width:120px;">
      <div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;"><div style="height:100%;width:${s.v*20}%;background:${DCOL[s.v]};border-radius:3px;"></div></div>
    </td>
    <td style="padding:5px 0;font-size:11px;font-weight:700;color:${DCOL[s.v]};font-family:monospace;white-space:nowrap">${DLBL[s.v]} (${s.v}/5)</td>
  </tr>`).join('');
  const nearbyRows=nearby.map(n=>`<tr>
    <td style="padding:5px 10px 5px 0;font-size:11px;color:#334155">${n.name}, ${n.state}</td>
    <td style="padding:5px 10px 5px 0;font-size:11px;color:${DCOL[n.v]};font-weight:700">${DLBL[n.v]}</td>
    <td style="padding:5px 0;font-size:11px;color:#64748b;font-family:monospace">~${n.dist} mi</td>
  </tr>`).join('');
  const evidenceRows=(evidence?.providers||[]).map((p,i)=>`<tr>
    <td style="padding:6px 10px 6px 0;font-size:11px;color:#0f172a">${i+1}. ${p.name}</td>
    <td style="padding:6px 10px 6px 0;font-size:10px;color:#334155">${p.taxonomy}</td>
    <td style="padding:6px 10px 6px 0;font-size:10px;color:#334155">${p.address}</td>
    <td style="padding:6px 0;font-size:10px;color:#1d4ed8"><a href="${p.detailsUrl}" target="_blank" rel="noopener noreferrer">${p.npi}</a></td>
  </tr>`).join('');
  const evidenceLinks=(evidence?.sourceLinks||[]).map(s=>`<li style="margin:2px 0"><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.label}</a></li>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Coverage Assessment — ${locName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Inter',sans-serif;background:#f8fafc;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .page{width:780px;margin:0 auto;background:white;min-height:100vh;}
  .header{background:#040c1a;padding:22px 36px;display:flex;justify-content:space-between;align-items:center;}
  .org-name{font-family:'IBM Plex Mono',monospace;font-size:9px;color:#3b82f6;letter-spacing:3px;text-transform:uppercase;margin-bottom:5px;}
  .doc-title{font-size:18px;font-weight:700;color:#f0f6ff;}
  .doc-subtitle{font-size:11px;color:#4a6888;margin-top:3px;font-family:'IBM Plex Mono',monospace;}
  .doc-date{font-size:10px;color:#3d5478;font-family:'IBM Plex Mono',monospace;letter-spacing:0.5px;text-align:right;}
  .doc-id{font-size:9px;color:#2d4060;font-family:'IBM Plex Mono',monospace;margin-top:3px;text-align:right;}
  .location-hero{padding:24px 36px 20px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#f8fafc 0%,#f0f7ff 100%);}
  .loc-badge{display:inline-block;font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:2px;text-transform:uppercase;padding:3px 10px;border-radius:2px;margin-bottom:10px;font-weight:600;}
  .loc-name{font-size:28px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;margin-bottom:4px;}
  .loc-meta{font-size:12px;color:#64748b;font-family:'IBM Plex Mono',monospace;}
  .priority-flag{display:inline-flex;align-items:center;gap:7px;padding:6px 14px;border-radius:3px;margin-top:12px;font-size:11px;font-weight:700;font-family:'IBM Plex Mono',monospace;letter-spacing:1px;}
  .score-hero{padding:20px 36px;display:flex;gap:24px;align-items:stretch;border-bottom:1px solid #e2e8f0;}
  .score-primary{flex:0 0 180px;padding:18px;border-radius:6px;text-align:center;border:1px solid;}
  .score-primary-label{font-size:9px;color:#64748b;letter-spacing:1.5px;text-transform:uppercase;font-family:'IBM Plex Mono',monospace;margin-bottom:8px;}
  .score-primary-num{font-size:52px;font-weight:700;font-family:'IBM Plex Mono',monospace;line-height:1;}
  .score-primary-max{font-size:14px;color:#94a3b8;margin-top:2px;}
  .score-primary-lbl{font-size:13px;font-weight:700;margin-top:6px;}
  .score-meta{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:12px;}
  .score-meta-item{padding:12px 14px;background:#f8fafc;border-radius:5px;border:1px solid #e2e8f0;}
  .score-meta-label{font-size:8.5px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;font-family:'IBM Plex Mono',monospace;margin-bottom:4px;}
  .score-meta-value{font-size:18px;font-weight:700;font-family:'IBM Plex Mono',monospace;color:#1e293b;}
  .section{padding:20px 36px;border-bottom:1px solid #f1f5f9;}
  .section-title{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;font-family:'IBM Plex Mono',monospace;margin-bottom:14px;display:flex;align-items:center;gap:8px;}
  .section-title::after{content:'';flex:1;height:1px;background:#e2e8f0;}
  .rec-box{padding:14px 16px;border-radius:5px;border-left:3px solid;font-size:12px;line-height:1.7;color:#334155;}
  table{width:100%;border-collapse:collapse;}
  th{text-align:left;font-size:8.5px;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;font-family:'IBM Plex Mono',monospace;padding:0 10px 8px 0;border-bottom:1px solid #e2e8f0;}
  .footer{padding:16px 36px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;}
  .footer-brand{font-family:'IBM Plex Mono',monospace;font-size:9px;color:#94a3b8;letter-spacing:1.5px;}
  .footer-note{font-size:9px;color:#cbd5e1;font-style:italic;}
  .geo-note{font-size:10px;color:#64748b;padding:8px 12px;background:#f8fafc;border-radius:4px;border:1px solid #e2e8f0;margin-top:8px;font-family:'IBM Plex Mono',monospace;}
  @media print{body{background:white;}.page{width:100%;box-shadow:none;}.no-print{display:none;}}
</style></head><body><div class="page">
  <div class="header">
    <div><div class="org-name">Occu-Med · Network Management</div><div class="doc-title">Provider Coverage Assessment</div><div class="doc-subtitle">CONTRACTOR LOCATION ANALYSIS REPORT</div></div>
    <div><div class="doc-date">${today}</div><div class="doc-id">REF: CLA-${Math.random().toString(36).substr(2,8).toUpperCase()}</div></div>
  </div>
  <div class="location-hero">
    <div class="loc-badge" style="background:${col}18;color:${col};border:1px solid ${col}44">${isGeo?'◈ GEOCODED ESTIMATE':'● VERIFIED DATASET'}</div>
    <div class="loc-name">${locName}</div>
    <div class="loc-meta">${stateCode}${tier?' · '+(tier===1?'MAJOR METRO':tier===2?'MID-SIZE CITY':tier===3?'SMALL CITY':'RURAL / REMOTE'):''} · EXAM: ${examLabel.toUpperCase()}</div>
    <div class="priority-flag" style="background:${urgencyColor}12;color:${urgencyColor};border:1px solid ${urgencyColor}33">
      <span style="width:7px;height:7px;border-radius:50%;background:${urgencyColor};display:inline-block"></span>${urgency}
    </div>
  </div>
  <div class="score-hero">
    <div class="score-primary" style="background:${col}08;border-color:${col}30;">
      <div class="score-primary-label">Difficulty Score</div>
      <div class="score-primary-num" style="color:${col}">${ps.v}</div>
      <div class="score-primary-max" style="color:${col}88">/ 5</div>
      <div class="score-primary-lbl" style="color:${col}">${DLBL[ps.v]}</div>
    </div>
    <div class="score-meta">
      <div class="score-meta-item"><div class="score-meta-label">Est. Providers / 100k</div><div class="score-meta-value">${prov||'—'}</div></div>
      <div class="score-meta-item"><div class="score-meta-label">Avg. Wait Days</div><div class="score-meta-value">${wait||'—'}</div></div>
      <div class="score-meta-item"><div class="score-meta-label">Primary Exam Type</div><div class="score-meta-value" style="font-size:12px;color:#475569">${examLabel}</div></div>
      <div class="score-meta-item"><div class="score-meta-label">Assessment Date</div><div class="score-meta-value" style="font-size:12px;color:#475569">${today}</div></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Operational Recommendation</div>
    <div class="rec-box" style="background:${col}08;border-left-color:${col}">${recText[ps.v]||recText[3]}</div>
    ${isGeo?'<div class="geo-note">◈ Geocoded estimate shown. Use the verified provider evidence section below for source-backed outreach targets.</div>':''}
  </div>
  <div class="section">
    <div class="section-title">Full Service Scorecard</div>
    <table><tr><th>Service Type</th><th style="width:130px">Difficulty Level</th><th></th></tr>${scoreBars}</table>
  </div>
  ${nearbyRows?`<div class="section">
    <div class="section-title">Nearest Alternative Markets</div>
    <table><tr><th>Location</th><th>Difficulty</th><th>Distance</th></tr>${nearbyRows}</table>
  </div>`:''}
  ${evidence?`<div class="section">
    <div class="section-title">Verified Provider Evidence (No Medicare/Medicaid Claims Proxies)</div>
    <div style="font-size:11px;color:#334155;line-height:1.6;margin-bottom:8px;">
      Query: ${evidence.querySummary}<br/>
      Retrieved: ${evidence.fetchedAt}<br/>
      ${evidence.warning?`<span style="color:#b45309">${evidence.warning}</span>`:''}
    </div>
    ${evidenceRows?`<table><tr><th>Provider</th><th>Specialty</th><th>Address</th><th>NPI</th></tr>${evidenceRows}</table>`:'<div style="font-size:11px;color:#475569">No NPI providers returned for this exact city/state query. Expand location or exam taxonomy and rerun.</div>'}
    <div style="margin-top:10px;font-size:11px;color:#334155;">
      <strong>References:</strong>
      <ul style="margin:6px 0 0 18px">${evidenceLinks}</ul>
    </div>
  </div>`:''}
  <div class="footer">
    <div class="footer-brand">OCCU-MED · NETWORK MANAGEMENT SYSTEM · CONFIDENTIAL</div>
    <div class="footer-note">For internal use only. Data reflects network intelligence as of report date.</div>
  </div>
</div></body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main App Component
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const mapRef = useRef<L.Map|null>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const stateGeoRef = useRef<L.GeoJSON|null>(null);
  const cityLayerRef = useRef<L.LayerGroup|null>(null);
  const customPinRef = useRef<L.Marker|null>(null);
  const radiusCircleRef = useRef<any>(null);
  const tzLayerRef = useRef<L.LayerGroup|null>(null);
  const liveGrpRef = useRef<L.LayerGroup|null>(null);
  const liveCircleRef = useRef<L.Circle|null>(null);
  const livePinRef = useRef<L.Marker|null>(null);
  const dropCircleRef = useRef<L.Circle|null>(null);
  const dropPinRef = useRef<L.Marker|null>(null);
  const popDensityLayerRef = useRef<L.LayerGroup|null>(null);
  const clinicLayerRef = useRef<L.LayerGroup|null>(null);
  const savedRadiusLayerRef = useRef<L.LayerGroup|null>(null);
  const rawStateFeaturesRef = useRef<any[]>([]);
  const clinicFileInputRef = useRef<HTMLInputElement>(null);

  // UI State
  const [metric, setMetric] = useState('primaryCare');
  const [showLabels, setShowLabels] = useState(true);
  const [showTZ, setShowTZ] = useState(false);
  const [showRadius, setShowRadius] = useState(true);
  const [showPopDensity, setShowPopDensity] = useState(false);
  const [showStateColors, setShowStateColors] = useState(true);
  const [filterDiff, setFilterDiff] = useState<number|null>(null);
  // Clinic upload
  const [uploadedClinics, setUploadedClinics] = useState<Array<{
    name:string; address:string; city:string; state:string; zip:string;
    phone:string; notes:string; lat:number|null; lng:number|null; color:string;
  }>>(() => { try { return JSON.parse(localStorage.getItem('uploaded_clinics')||'[]'); } catch { return []; } });
  const [showUploadedClinics, setShowUploadedClinics] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadColor, setUploadColor] = useState('#f472b6');
  const [showUploadModal, setShowUploadModal] = useState(false);
  // Area prices
  const [showAreaPrices, setShowAreaPrices] = useState(false);
  const [apState, setApState] = useState('');
  const [apProcedure, setApProcedure] = useState('urgentCareL3');
  const [view, setView] = useState<'us'|'east'|'central'|'west'>('us');
  const [rpOpen, setRpOpen] = useState(true);
  const [liveOpen, setLiveOpen] = useState(false);
  const [showDir, setShowDir] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [pdfHtml, setPdfHtml] = useState('');
  const [pdfDlName, setPdfDlName] = useState('');

  // Coverage request panel state
  const [rpCity, setRpCity] = useState('');
  const [rpExam, setRpExam] = useState('primaryCare');
  const [rpResult, setRpResult] = useState<React.ReactNode>(null);
  const [rpSuggestions, setRpSuggestions] = useState<any[]>([]);
  const [lastGeoResult, setLastGeoResult] = useState<any>(null);
  const [lastReportData, setLastReportData] = useState<ReportData|null>(null);
  const [driveLocA, setDriveLocA] = useState<{name:string;lat:number;lng:number}|null>(null);
  const [driveLocB, setDriveLocB] = useState<{name:string;lat:number;lng:number}|null>(null);
  const [dtInput, setDtInput] = useState('');

  // Compare
  const [pinnedCities, setPinnedCities] = useState<any[]>([]);

  // Live finder state
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveResults, setLiveResults] = useState<any[]>([]);
  const [liveFilter, setLiveFilter] = useState<string>('all');
  const [liveTextFilter, setLiveTextFilter] = useState('');
  const [liveRegionFilter, setLiveRegionFilter] = useState<'all'|'us'|'intl'>('all');
  const [liveSort, setLiveSort] = useState<'distance'|'name'>('distance');
  const [liveLocation, setLiveLocation] = useState('');
  const [liveRadius, setLiveRadius] = useState(10);
  const [liveAutoPin, setLiveAutoPin] = useState(true);
  const [liveHighlightId, setLiveHighlightId] = useState<any>(null);
  const [liveHint, setLiveHint] = useState('Click anywhere on the map to search for facilities');
  const [liveMirror, setLiveMirror] = useState('');
  const [dropCenter, setDropCenter] = useState<{lat:number;lng:number}|null>(null);
  const [dropRadiusMiles, setDropRadiusMiles] = useState(25);
  const [dropFacilityType, setDropFacilityType] = useState('all');
  const [dropIncludeFacilities, setDropIncludeFacilities] = useState(true);
  const [savedRadii, setSavedRadii] = useState<Array<{id:number;lat:number;lng:number;radiusMiles:number;color:string}>>([]);
  const [showGlowPoints, setShowGlowPoints] = useState(true);
  const [outreachNotes, setOutreachNotes] = useState<Record<string,string>>(() => { try { return JSON.parse(localStorage.getItem('outreach_notes')||'{}'); } catch { return {}; } });
  const [outreachStatus, setOutreachStatus] = useState<Record<string,string>>(() => { try { return JSON.parse(localStorage.getItem('outreach_status')||'{}'); } catch { return {}; } });
  const [dropUi, setDropUi] = useState({panelOpen:false, exportLoading:false, status:''});
  const lastRadiusRef = useRef<{lat:number;lng:number}|null>(null);

  function updateOutreachNote(id:any, value:string) {
    setOutreachNotes(prev=>{
      const next={...prev,[String(id)]:value};
      localStorage.setItem('outreach_notes', JSON.stringify(next));
      return next;
    });
  }
  function updateOutreachStatus(id:any, value:string) {
    setOutreachStatus(prev=>{
      const next={...prev,[String(id)]:value};
      localStorage.setItem('outreach_status', JSON.stringify(next));
      return next;
    });
  }

  // ── Price Finder state ────────────────────────────────────────────────────
  const [showPriceFinder, setShowPriceFinder] = useState(false);
  const [pfCity, setPfCity] = useState('');
  const [pfState, setPfState] = useState('');
  const [pfServiceType, setPfServiceType] = useState<'urgentCare'|'dental'|'pharmacy'|'physicalExam'|'faamedical'|'stressTest'|'mammogram'|'dotExam'|'vaccinations'>('urgentCare');
  const [pfLoading, setPfLoading] = useState(false);
  const [pfClinics, setPfClinics] = useState<Array<{name:string;address:string;phone:string;taxonomy:string;isFqhc:boolean;npiUrl:string;searchUrl:string}>>([]);
  const [pfError, setPfError] = useState('');
  const [pfLocation, setPfLocation] = useState('');
  const [pfDone, setPfDone] = useState(false);
  const [pfTab, setPfTab] = useState<'providers'|'compare'|'areaPrices'|'priceHunt'|'occHunt'|'report'>('providers');
  const [pfNetworks, setPfNetworks] = useState<any[]>([]);
  const [pfResources, setPfResources] = useState<any[]>([]);
  const [phLoading, setPhLoading] = useState(false);
  const [phResults, setPhResults] = useState<any[]>([]);
  const [phExtracted, setPhExtracted] = useState(0);
  const [phDebug, setPhDebug] = useState<any>(null);
  const [ohLoading, setOhLoading] = useState(false);
  const [ohResults, setOhResults] = useState<any[]>([]);
  const [pfReports, setPfReports] = useState<Array<{provider:string;price:string;service:string;city:string;date:string}>>(() => {
    try { return JSON.parse(localStorage.getItem('occumed_price_reports') || '[]'); } catch { return []; }
  });
  const [pfReportProvider, setPfReportProvider] = useState('');
  const [pfReportPrice, setPfReportPrice] = useState('');
  const [pfShareCopied, setPfShareCopied] = useState(false);

  async function pfSearchNpi(city: string, state: string, taxonomyDesc: string) {
    const params = new URLSearchParams({
      version: '2.1', city: city.trim(),
      state: state.trim().toUpperCase(),
      taxonomy_description: taxonomyDesc,
      enumeration_type: 'NPI-2', limit: '15',
    });
    const resp = await fetch(`https://npiregistry.cms.hhs.gov/api/?${params}`, {signal: AbortSignal.timeout(8000)});
    if (!resp.ok) throw new Error(`NPI ${resp.status}`);
    const data = await resp.json() as {results?: any[]};
    return data.results || [];
  }

  async function runPriceSearch() {
    if (!pfCity.trim()) return;
    setPfLoading(true);
    setPfError('');
    setPfClinics([]);
    setPfDone(false);
    setPfNetworks([]);
    setPfResources([]);
    try {
      const params = new URLSearchParams({
        city: pfCity.trim(),
        state: pfState.trim().toUpperCase(),
        serviceType: pfServiceType,
      });
      const resp = await fetch(`/api/price-finder?${params.toString()}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setPfClinics(data.clinics || []);
      setPfNetworks(data.networks || []);
      setPfResources(data.pricingResources || []);
      setPfLocation(data.location || `${pfCity}${pfState ? ', ' + pfState.toUpperCase() : ''}`);
      setPfTab('providers');
      setPfDone(true);
      runAutomatedPriceHunt();
    } catch (e: any) {
      setPfError(e.message || 'Search failed. Please try again.');
    } finally {
      setPfLoading(false);
    }
  }

  function pfAddReport() {
    if (!pfReportProvider.trim() || !pfReportPrice.trim()) return;
    const report = {
      provider: pfReportProvider.trim(),
      price: pfReportPrice.trim(),
      service: PF_SERVICE_LABELS[pfServiceType] || pfServiceType,
      city: pfLocation || pfCity,
      date: new Date().toLocaleDateString(),
    };
    const next = [report, ...pfReports].slice(0, 50);
    setPfReports(next);
    localStorage.setItem('occumed_price_reports', JSON.stringify(next));
    setPfReportProvider('');
    setPfReportPrice('');
  }

  function pfShareReports() {
    try {
      const encoded = btoa(JSON.stringify(pfReports));
      const url = `${window.location.origin}${window.location.pathname}?pf_reports=${encoded}`;
      navigator.clipboard.writeText(url).then(() => {
        setPfShareCopied(true);
        setTimeout(() => setPfShareCopied(false), 2500);
      });
    } catch {}
  }

  function occHealthScore(c:{name:string;taxonomy:string;isFqhc:boolean}) {
    const txt = `${c.name} ${c.taxonomy}`.toLowerCase();
    let score = 0;
    if (txt.includes('occupational')) score += 4;
    if (txt.includes('urgent')) score += 2;
    if (txt.includes('family medicine')) score += 1;
    if (txt.includes('internal medicine')) score += 1;
    if (txt.includes('chiropr')) score += 2;
    if (txt.includes('cardiology')) score += 1;
    if (txt.includes('radiology')) score += 1;
    if (txt.includes('federally qualified') || c.isFqhc) score += 2;
    return Math.min(score, 10);
  }

  function exportOutreachCsv() {
    const rows = [
      ['facility_id','status','notes'],
      ...Object.keys(outreachStatus).map(id => [id, outreachStatus[id] || 'new', (outreachNotes[id] || '').replace(/\n/g,' ')])
    ];
    const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `outreach_export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function drawDropRadius(lat:number,lng:number,radiusMiles:number) {
    const map = mapRef.current;
    if (!map) return;
    if (dropCircleRef.current) { try { map.removeLayer(dropCircleRef.current); } catch {} }
    if (dropPinRef.current) { try { map.removeLayer(dropPinRef.current); } catch {} }
    const meters = Math.max(radiusMiles, 0.1) * 1609.34;
    dropCircleRef.current = L.circle([lat, lng], {
      radius: meters,
      color: '#ef4444',
      weight: 2,
      opacity: 0.95,
      fillColor: '#ef4444',
      fillOpacity: 0.1,
      className: 'drop-radius-ring',
    }).addTo(map);
    dropPinRef.current = L.marker([lat,lng], {
      icon: L.divIcon({
        className: '',
        html: '<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 0 0 4px rgba(239,68,68,0.26),0 0 16px rgba(239,68,68,0.72);"></div>',
        iconSize:[14,14],
        iconAnchor:[7,7],
      }),
      zIndexOffset: 3500,
      interactive: false,
    }).addTo(map);
  }

  function saveCurrentRadius() {
    if (!dropCenter) return;
    setSavedRadii(prev=>{
      const color = RADIUS_COLORS[prev.length % RADIUS_COLORS.length];
      return [{id:Date.now(),lat:dropCenter.lat,lng:dropCenter.lng,radiusMiles:dropRadiusMiles,color}, ...prev].slice(0, 24);
    });
  }

  async function exportRadiusWorkbook() {
    if (!dropCenter) { alert('Click the map first to set a radius center.'); return; }
    setDropUi(prev=>({...prev, exportLoading:true, status:'Preparing city and facility extraction…'}));
    try {
      const cities = buildCitiesInRadius(dropCenter, dropRadiusMiles);

      let facilities: ReturnType<typeof buildFacilityRows> = [];
      if (dropIncludeFacilities) {
        const facilitiesRaw: FacilityResult[] = await queryFacilitiesInRadius({
          lat: dropCenter.lat,
          lng: dropCenter.lng,
          radiusMiles: dropRadiusMiles,
          endpoints: OVERPASS_ENDPOINTS,
          classifyFacility,
          onStatus: (msg) => setDropUi(prev=>({...prev, status:msg})),
        });
        if (facilitiesRaw.length) {
          setLiveResults(facilitiesRaw.map((r)=>({
            ...r,
            dist: haversine(dropCenter.lat, dropCenter.lng, r.lat, r.lng),
          })));
        }
        facilities = buildFacilityRows(dropCenter, facilitiesRaw, dropFacilityType, CATS);
      }

      const wb = XLSX.utils.book_new();
      const wsCities = XLSX.utils.json_to_sheet(cities.length ? cities : [{
        city: 'No cities in radius',
        state: '',
        distanceMiles: '',
        populationEstimate: '',
      }], {header:['city','state','distanceMiles','populationEstimate']});
      XLSX.utils.book_append_sheet(wb, wsCities, 'Cities');
      const wsFacilities = XLSX.utils.json_to_sheet(dropIncludeFacilities
        ? (facilities.length ? facilities : [{
          name: 'No facilities available',
          type: dropFacilityType === 'all' ? 'All types' : (CATS[dropFacilityType]?.lbl || dropFacilityType),
          distanceMiles: '',
          address: '',
          phone: '',
          website: '',
        }])
        : [{
          name: 'Facilities not requested',
          type: 'Exported cities only',
          distanceMiles: '',
          address: '',
          phone: '',
          website: '',
        }]
      , {header:['name','type','distanceMiles','address','phone','website']});
      XLSX.utils.book_append_sheet(wb, wsFacilities, 'Facilities');
      XLSX.writeFile(wb, `radius_extract_${new Date().toISOString().slice(0,10)}.xlsx`);
      setDropUi(prev=>({...prev, status:`Done: ${cities.length} cities/towns${dropIncludeFacilities?` and ${facilities.length} facilities`:''} exported.`}));
    } catch (e:any) {
      setDropUi(prev=>({...prev, status:`Export failed: ${e?.message || 'unknown error'}`}));
    } finally {
      setDropUi(prev=>({...prev, exportLoading:false}));
    }
  }

  // Stats
  const totalCities = LOCS.length;
  const statesCount = Object.keys(SD).length;
  const criticalCount = LOCS.filter(l=>getVal(l,metric)>=4).length;

  const [mapReady, setMapReady] = useState(false);
  const [localPopInfo, setLocalPopInfo] = useState<null|{lat:number;lng:number;density:number;state:string;population:number;nearestCity:string;nearestDist:number}>(null);

  // ── Import shared price reports from URL on first load ────────────────────
  useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('pf_reports');
    if (!encoded) return;
    try {
      const imported = JSON.parse(atob(encoded));
      if (!Array.isArray(imported)) return;
      setPfReports(prev => {
        const merged = [...imported, ...prev];
        const unique = merged.filter((r, i, arr) =>
          arr.findIndex(x => x.provider===r.provider && x.price===r.price && x.date===r.date) === i
        ).slice(0, 50);
        localStorage.setItem('occumed_price_reports', JSON.stringify(unique));
        return unique;
      });
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // ── Init Map ───────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(mapRef.current||!mapDivRef.current) return;
    const map = L.map(mapDivRef.current, {
      center:[38.5,-96],zoom:4,zoomControl:true,
      preferCanvas:true,
      attributionControl:false,
    });
    mapRef.current = map;

    // Tile layer with dark filter
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,className:'dark-tiles'
    }).addTo(map);

    // City layer
    const cityLayer = L.layerGroup().addTo(map);
    cityLayerRef.current = cityLayer;

    // Live layer
    const liveGrp = L.layerGroup().addTo(map);
    liveGrpRef.current = liveGrp;

    // Load GeoJSON
    loadStateGeo(map);

    // Map click for live finder + local population estimate
    map.on('click',(e:L.LeafletMouseEvent)=>{
      const est = estimateLocalPopulationDensity(e.latlng.lat, e.latlng.lng);
      if (est) setLocalPopInfo(est);
      setDropCenter({lat:e.latlng.lat,lng:e.latlng.lng});
      setDropUi(prev=>({...prev, panelOpen:true, status:''}));
      drawDropRadius(e.latlng.lat, e.latlng.lng, dropRadiusMiles);
      if(liveOpenRef.current || liveAutoPinRef.current) {
        if(liveAutoPinRef.current && !liveOpenRef.current) setLiveOpen(true);
        doLiveSearch(e.latlng.lat, e.latlng.lng);
      }
    });

    setMapReady(true);

    return ()=>{ map.remove(); mapRef.current=null; cityLayerRef.current=null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const liveOpenRef = useRef(false);
  useEffect(()=>{ liveOpenRef.current = liveOpen; },[liveOpen]);
  const liveAutoPinRef = useRef(true);
  useEffect(()=>{ liveAutoPinRef.current = liveAutoPin; },[liveAutoPin]);
  const showStateColorsRef = useRef(showStateColors);
  useEffect(()=>{ showStateColorsRef.current = showStateColors; },[showStateColors]);
  useEffect(()=>{
    if(!dropCenter) return;
    drawDropRadius(dropCenter.lat, dropCenter.lng, dropRadiusMiles);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[dropCenter, dropRadiusMiles]);

  const labelLayerRef = useRef<L.LayerGroup|null>(null);

  // ── Load State GeoJSON ───────────────────────────────────────────────────
  async function loadStateGeo(map:L.Map) {
    const urls = [
      'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json',
      'https://unpkg.com/us-atlas@3/states-10m.json',
    ];
    for(const url of urls) {
      try {
        const r = await fetch(url);
        if(!r.ok) continue;
        const topo = await r.json();
        const gj = topojson.feature(topo, topo.objects.states) as any;
        gj.features.forEach((f:any)=>{
          const id = String(f.properties.id||'').padStart(2,'0');
          f.properties.postal = FIPS2CODE[id]||NAME2CODE[(f.properties.name||'').toLowerCase()]||'';
        });
        const stateGeo = L.geoJSON(gj,{
          style:(f:any)=>sStyle(f?.properties?.postal||'',metric),
          onEachFeature:(f:any,layer:any)=>{
            const postal = f.properties.postal;
            layer.on({
              mouseover:(e:any)=>{ e.target.setStyle({weight:2,opacity:0.9}); },
              mouseout:(e:any)=>{ e.target.setStyle(sStyle(postal, metricRef.current)); },
              click:(e:any)=>{
                L.popup({maxWidth:340,className:''})
                  .setLatLng(e.latlng)
                  .setContent(buildStatePopup(postal))
                  .openOn(map);
              }
            });
            layer.bindTooltip(()=>{
              const d=SD[postal];
              if(!d) return postal;
              const v=getVal(d,metricRef.current);
              return `<div style="padding:5px 8px;font-family:'IBM Plex Mono',monospace">
                <span style="font-weight:700;font-size:11px;color:#eef4ff">${postal}</span>&nbsp;
                <span style="font-size:9px;color:${DCOL[v]};font-weight:700">${DLBL[v]}</span>
              </div>`;
            },{sticky:true,direction:'top'});
          }
        }).addTo(map);
        stateGeoRef.current = stateGeo;
        rawStateFeaturesRef.current = gj.features;
        buildStateLabels(map, stateGeo);
        break;
      } catch(e) { console.warn('GeoJSON load error',e); }
    }
  }

  function sStyle(postal:string,m:string):L.PathOptions {
    const d=SD[postal];
    if(!d) return{fillColor:'#0a1830',fillOpacity:0.38,weight:1,color:'rgba(99,179,237,0.15)',opacity:0.6};
    if(!showStateColorsRef.current) return {fillColor:'#11243f',fillOpacity:0.12,weight:1,color:'rgba(161,209,255,0.25)',opacity:0.8};
    const v=getVal(d,m);
    const col=DCOL[v]||'#3d5478';
    return{fillColor:col,fillOpacity:0.25,weight:1,color:col,opacity:0.45};
  }

  const metricRef = useRef(metric);
  useEffect(()=>{ metricRef.current=metric; },[metric]);
  useEffect(()=>{
    if(!stateGeoRef.current) return;
    stateGeoRef.current.setStyle((f:any)=>sStyle(f?.properties?.postal||'',metricRef.current));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[showStateColors]);

  function estimateLocalPopulationDensity(lat:number,lng:number) {
    const nearest = LOCS
      .map((l:any)=>({name:l[0],state:l[1],dist:Math.max(approxMiles(lat,lng,l[2],l[3]),1)}))
      .sort((a,b)=>a.dist-b.dist)
      .slice(0,8);
    if(!nearest.length) return null;
    let weightedDensity = 0;
    let weightedPop = 0;
    let totalWeight = 0;
    let nearestState = nearest[0].state || '';
    nearest.forEach(n=>{
      const sp = STATE_POP[n.state];
      if(!sp) return;
      const w = 1 / n.dist;
      totalWeight += w;
      weightedDensity += sp.density * w;
      weightedPop += sp.pop * w;
    });
    if(!totalWeight) return null;
    return {
      lat,
      lng,
      density: weightedDensity / totalWeight,
      state: nearestState,
      population: Math.round(weightedPop / totalWeight),
      nearestCity: nearest[0].name,
      nearestDist: nearest[0].dist,
    };
  }

  const REQUIRED_NETWORK_CATS = ['mammogram','dotchiro','dotmd','faa','physical','urgent','lab','drugscreen','dentist','stress','audiology'] as const;
  function territoryGapSummary() {
    const counts: Record<string, number> = {};
    liveResults.forEach((r:any)=>{ counts[r.cat] = (counts[r.cat] || 0) + 1; });
    const missing = REQUIRED_NETWORK_CATS.filter(c => (counts[c] || 0) === 0);
    return { counts, missing, covered: REQUIRED_NETWORK_CATS.length - missing.length, total: REQUIRED_NETWORK_CATS.length };
  }

  function exportLeadershipPackage() {
    const summary = territoryGapSummary();
    const payload = {
      generatedAt: new Date().toISOString(),
      location: liveLocation || null,
      totalFacilities: liveResults.length,
      requiredCategories: REQUIRED_NETWORK_CATS,
      missingCategories: summary.missing,
      coverageRatio: `${summary.covered}/${summary.total}`,
      outreachStatus,
      outreachNotes,
      topFacilities: liveResults.slice(0, 30).map((r:any)=>({
        id: r.id, name: r.name, category: r.cat, distanceKm: Number(r.dist.toFixed(2)),
        phone: r.phone || '', website: r.website || '', address: r.addr || '',
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `leadership_package_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function runAutomatedPriceHunt() {
    if (!pfCity.trim()) return;
    setPhLoading(true);
    try {
      const params = new URLSearchParams({
        city: pfCity.trim(),
        state: pfState.trim().toUpperCase(),
        serviceType: pfServiceType,
      });
      const resp = await fetch(`/api/price-hunt?${params.toString()}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setPhResults(data.results || []);
      setPhExtracted(data.extracted || 0);
      setPhDebug(data.debug || null);
    } catch (e) {
      console.warn('price hunt failed', e);
      setPhResults([]);
      setPhExtracted(0);
      setPhDebug(null);
    } finally {
      setPhLoading(false);
    }
  }

  async function runAutomatedOccHunt() {
    if (!pfCity.trim()) return;
    setOhLoading(true);
    try {
      const params = new URLSearchParams({
        city: pfCity.trim(),
        state: pfState.trim().toUpperCase(),
      });
      const resp = await fetch(`/api/occ-hunt?${params.toString()}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setOhResults(data.partners || []);
    } catch (e) {
      console.warn('occ hunt failed', e);
      setOhResults([]);
    } finally {
      setOhLoading(false);
    }
  }

  function buildStateLabels(map:L.Map,stateGeo:L.GeoJSON) {
    const labelGrp = L.layerGroup();
    stateGeo.eachLayer((layer:any)=>{
      const props = layer.feature?.properties;
      if(!props) return;
      const postal = props.postal;
      if(!postal) return;
      const rawCtr = layer.getBounds().getCenter();
      const [lat,lng] = STATE_CTR[postal]||[rawCtr.lat,rawCtr.lng];
      const icon = L.divIcon({
        className:'',
        html:`<div style="font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:700;color:#8aa4c4;text-shadow:0 1px 4px rgba(0,0,0,0.9),0 0 8px rgba(0,0,0,0.7);pointer-events:none;white-space:nowrap;letter-spacing:0.5px;">${postal}</div>`,
        iconSize:[0,0],iconAnchor:[10,7]
      });
      const mk = L.marker([lat,lng],{icon,interactive:false,zIndexOffset:200});
      labelGrp.addLayer(mk);
    });
    labelLayerRef.current = labelGrp;
    if(showLabelsRef.current) labelGrp.addTo(map);
    return labelGrp;
  }

  // ── Population density overlay ─────────────────────────────────────────────
  const showPopDensityRef = useRef(showPopDensity);
  useEffect(()=>{ showPopDensityRef.current = showPopDensity; },[showPopDensity]);
  useEffect(()=>{
    const map = mapRef.current;
    if (!map) return;
    if (!showPopDensity) {
      if (popDensityLayerRef.current) { map.removeLayer(popDensityLayerRef.current); popDensityLayerRef.current = null; }
      return;
    }
    const features = rawStateFeaturesRef.current;
    if (!features.length) return;
    const layers: L.Layer[] = [];
    features.forEach((f: any) => {
      const postal = f.properties?.postal;
      const pop = STATE_POP[postal];
      if (!pop) return;
      const color = densityColor(pop.density);
      const lyr = L.geoJSON(f, {
        style: { fillColor: color, fillOpacity: 0.55, weight: 1, color: color, opacity: 0.6 },
      });
      lyr.bindTooltip(()=>{
        return `<div style="padding:5px 8px;font-family:'IBM Plex Mono',monospace;font-size:10px">
          <span style="font-weight:700;color:#eef4ff">${postal}</span>
          <span style="color:${color};margin-left:6px;font-weight:700">${densityLabel(pop.density)}</span><br/>
          <span style="color:#67e8f9">${Math.round(pop.density).toLocaleString()}/mi²</span>
          <span style="color:#3d5478;margin-left:6px">${pop.pop.toLocaleString()}</span>
        </div>`;
      },{sticky:true,direction:'top'});
      layers.push(lyr);
    });
    const grp = L.layerGroup(layers).addTo(map);
    popDensityLayerRef.current = grp;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[showPopDensity]);

  // ── Uploaded clinic pins ───────────────────────────────────────────────────
  useEffect(()=>{
    const map = mapRef.current;
    if (!map) return;
    if (clinicLayerRef.current) { map.removeLayer(clinicLayerRef.current); clinicLayerRef.current = null; }
    if (!showUploadedClinics || uploadedClinics.length===0) return;
    const grp = L.layerGroup();
    uploadedClinics.forEach((c,i)=>{
      if (c.lat===null || c.lng===null) return;
      const col = c.color || uploadColor;
      const mk = L.marker([c.lat, c.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="width:18px;height:18px;border-radius:50%;background:${col};${showGlowPoints?`box-shadow:0 0 10px ${col},0 0 20px ${col}66,0 0 4px rgba(0,0,0,0.6);animation:clinic-pulse 2s ease-in-out ${(i*0.15).toFixed(1)}s infinite;`:'box-shadow:0 0 0 1px rgba(255,255,255,0.35);'}cursor:pointer;"></div>`,
          iconSize: [18,18], iconAnchor: [9,9],
        }),
        zIndexOffset: 2000,
      });
      mk.bindPopup(`<div style="font-family:Inter,sans-serif;padding:10px 12px;min-width:170px;">
        <div style="font-size:12px;font-weight:700;color:#e2f0ff;margin-bottom:4px">${c.name}</div>
        ${c.address?`<div style="font-size:9.5px;color:#4a6888">📍 ${c.address}${c.city?', '+c.city:''}${c.state?' '+c.state:''}${c.zip?' '+c.zip:''}</div>`:''}
        ${c.phone?`<div style="font-size:9.5px;color:#67e8f9;margin-top:2px">📞 <a href="tel:${c.phone}" style="color:#67e8f9;text-decoration:none">${c.phone}</a></div>`:''}
        ${c.notes?`<div style="font-size:9px;color:#3d5478;margin-top:3px">${c.notes}</div>`:''}
        <div style="margin-top:6px;display:flex;gap:5px">
          <div style="width:8px;height:8px;border-radius:50%;background:${col};box-shadow:0 0 6px ${col};flex-shrink:0;margin-top:2px"></div>
          <span style="font-size:8.5px;color:#3d5478;font-family:'IBM Plex Mono',monospace">UPLOADED CLINIC</span>
        </div>
      </div>`);
      grp.addLayer(mk);
    });
    grp.addTo(map);
    clinicLayerRef.current = grp;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[uploadedClinics, showUploadedClinics, uploadColor, showGlowPoints]);

  async function handleClinicUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadLoading(true);
    setUploadProgress('Parsing file…');
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, {type:'array'});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, {defval:''});
      if (!rows.length) { setUploadProgress('No data found in file.'); setUploadLoading(false); return; }

      // Flexible column detection (case-insensitive)
      function col(row:any, ...keys:string[]):string {
        for (const k of keys) {
          const found = Object.keys(row).find(r=>r.toLowerCase().replace(/[\s_-]/g,'')===k.toLowerCase().replace(/[\s_-]/g,''));
          if (found && row[found]!=='' && row[found]!==undefined) return String(row[found]).trim();
        }
        return '';
      }

      const parsed = rows.map(r=>({
        name:    col(r,'name','providername','clinicname','practicename','facility') || 'Unnamed',
        address: col(r,'address','streetaddress','street','addr'),
        city:    col(r,'city','town'),
        state:   col(r,'state','st').toUpperCase().slice(0,2),
        zip:     col(r,'zip','zipcode','postalcode','postal'),
        phone:   col(r,'phone','telephone','tel'),
        notes:   col(r,'notes','note','description','desc'),
        lat:     parseFloat(col(r,'lat','latitude')) || null,
        lng:     parseFloat(col(r,'lng','lon','long','longitude')) || null,
        color:   uploadColor,
      }));

      // Geocode rows missing coordinates
      const toGeocode = parsed.filter(p=>p.lat===null||isNaN(p.lat as any));
      let geocoded = 0;
      for (const p of toGeocode) {
        const q = [p.address, p.city, p.state, p.zip].filter(Boolean).join(', ');
        if (!q) continue;
        setUploadProgress(`Geocoding ${++geocoded}/${toGeocode.length}: ${p.name}`);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,{headers:{'Accept-Language':'en'}});
          const data = await res.json();
          if (data?.[0]) { p.lat = parseFloat(data[0].lat); p.lng = parseFloat(data[0].lon); }
        } catch {}
        await new Promise(r=>setTimeout(r, 1100)); // Nominatim rate limit: 1 req/sec
      }

      const final = parsed.filter(p=>p.lat!==null&&!isNaN(p.lat as any));
      const skipped = parsed.length - final.length;
      const merged = [...final, ...uploadedClinics].slice(0, 500);
      setUploadedClinics(merged);
      localStorage.setItem('uploaded_clinics', JSON.stringify(merged));
      setUploadProgress(`✓ Added ${final.length} clinics${skipped>0?` (${skipped} skipped — no address/coordinates)`:''}. Toggle with the MY CLINICS button.`);
    } catch(err:any) {
      setUploadProgress(`Error: ${err.message||'Could not parse file'}`);
    } finally {
      setUploadLoading(false);
    }
  }

  const showLabelsRef = useRef(showLabels);
  useEffect(()=>{
    showLabelsRef.current = showLabels;
    const map = mapRef.current;
    const lyr = labelLayerRef.current;
    if(!map||!lyr) return;
    if(showLabels) lyr.addTo(map); else map.removeLayer(lyr);
  },[showLabels]);

  useEffect(()=>{
    const map = mapRef.current;
    if(!map) return;
    if(savedRadiusLayerRef.current) {
      try { map.removeLayer(savedRadiusLayerRef.current); } catch {}
      savedRadiusLayerRef.current = null;
    }
    if(!savedRadii.length) return;
    const grp = L.layerGroup();
    savedRadii.forEach((r, idx)=>{
      L.circle([r.lat,r.lng],{
        radius: Math.max(r.radiusMiles,0.1)*1609.34,
        color: r.color,
        weight: 2,
        opacity: 0.88,
        fillColor: r.color,
        fillOpacity: 0.06,
        dashArray: '8 5',
        interactive: false,
      }).addTo(grp);
      L.marker([r.lat,r.lng],{
        icon:L.divIcon({
          className:'',
          html:`<div style="width:10px;height:10px;border-radius:50%;background:${r.color};border:2px solid #fff;box-shadow:${showGlowPoints?`0 0 0 3px ${r.color}55,0 0 12px ${r.color}aa`:'0 0 0 2px rgba(255,255,255,0.5)'};"></div>`,
          iconSize:[10,10],iconAnchor:[5,5],
        }),
        interactive:false,
        zIndexOffset: 2800 - idx,
      }).addTo(grp);
    });
    grp.addTo(map);
    savedRadiusLayerRef.current = grp;
  },[savedRadii, showGlowPoints]);

  // ── Re-style states when metric changes ─────────────────────────────────
  useEffect(()=>{
    if(!stateGeoRef.current) return;
    stateGeoRef.current.setStyle((f:any)=>sStyle(f?.properties?.postal||'',metric));
  },[metric]);

  // ── City markers ─────────────────────────────────────────────────────────
  useEffect(()=>{
    const map = mapRef.current;
    const cityLayer = cityLayerRef.current;
    if(!map||!cityLayer) return;
    cityLayer.clearLayers();

    // Show ALL cities — only apply difficulty filter if one is active
    const visibleLocs = LOCS.filter(loc=>{
      if(filterDiff!==null && getVal(loc,metric)!==filterDiff) return false;
      return true;
    });

    for(const loc of visibleLocs) {
      const [name,state,lat,lng,tier]=loc;
      const v = getVal(loc,metric);
      const col = DCOL[v];
      // Scale dot by tier: 1=major metro large, 2=mid, 3/4=small
      const r = tier===1?9:tier===2?6:tier===3?4:3;
      const borderW = tier<=2 ? 2 : 1.5;
      const icon = L.divIcon({
        className:'',
        html:`<div style="width:${r*2}px;height:${r*2}px;border-radius:50%;background:${col};border:${borderW}px solid rgba(255,255,255,${tier===1?0.8:0.5});${showGlowPoints?`box-shadow:0 0 ${r+4}px ${col}55,0 1px 4px rgba(0,0,0,0.6);`:'box-shadow:0 0 0 1px rgba(255,255,255,0.2);'}cursor:pointer;"></div>`,
        iconSize:[r*2,r*2],iconAnchor:[r,r]
      });
      const mk = L.marker([lat,lng],{icon,zIndexOffset:tier===1?300:tier===2?200:tier===3?100:50});
      mk.bindPopup(()=>buildCityPopup(loc,metricRef.current),{maxWidth:320,className:''});
      mk.bindTooltip(()=>`<div style="padding:5px 8px;font-family:'IBM Plex Mono',monospace">
        <span style="font-weight:700;color:#eef4ff">${name}, ${state}</span><br>
        <span style="font-size:9px;color:${DCOL[getVal(loc,metricRef.current)]}">${DLBL[getVal(loc,metricRef.current)]}</span>
      </div>`,{sticky:false,direction:'top'});
      cityLayer.addLayer(mk);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[metric,filterDiff,mapReady,showGlowPoints]);

  // ── Timezone layer ────────────────────────────────────────────────────────
  useEffect(()=>{
    const map = mapRef.current;
    if(!map) return;
    if(!showTZ) {
      if(tzLayerRef.current) { map.removeLayer(tzLayerRef.current); tzLayerRef.current=null; }
      return;
    }
    if(tzLayerRef.current) return;
    if(!stateGeoRef.current) return;
    const layers:L.Layer[]=[];
    const labelDone:Record<string,boolean>={};
    stateGeoRef.current.eachLayer((layer:any)=>{
      const props=layer.feature?.properties;
      if(!props) return;
      const postal=props.postal||'';
      const tzIdx=(STATE_TZ as any)[postal];
      if(tzIdx===undefined) return;
      const info=TZ_INFO[tzIdx];
      const poly=L.geoJSON(layer.feature,{
        style:{color:info.color,weight:1.2,opacity:0.7,fillColor:info.color,fillOpacity:0.16},
        interactive:true
      });
      poly.bindTooltip(`<div style="padding:5px 8px;font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:700;color:${info.color}">${info.name} Time<br><span style="font-size:10px;color:#aac">${info.abbr} · ${info.utc}</span></div>`,{direction:'top'});
      layers.push(poly);
      const rawCtr=layer.getBounds().getCenter();
      const [lat,lng]=STATE_CTR[postal]||[rawCtr.lat,rawCtr.lng];
      const stateIcon=L.divIcon({className:'',html:`<div style="font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:700;color:${info.color};text-shadow:0 0 6px rgba(0,0,0,0.9),0 1px 3px rgba(0,0,0,0.9);pointer-events:none;white-space:nowrap;letter-spacing:0.5px;">${postal}</div>`,iconSize:[0,0],iconAnchor:[10,7]});
      layers.push(L.marker([lat,lng],{icon:stateIcon,interactive:false,zIndexOffset:200}));
      if(!labelDone[info.abbr]&&info.abbr!=='AK'&&info.abbr!=='HI') {
        labelDone[info.abbr]=true;
        const bigIcon=L.divIcon({className:'',html:`<div style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:700;color:${info.color};text-shadow:0 0 14px ${info.color},0 1px 6px rgba(0,0,0,0.95);letter-spacing:3px;pointer-events:none;white-space:nowrap;padding:2px 8px;border-radius:3px;background:rgba(4,12,26,0.55);border:1px solid ${info.color}44;">${info.abbr}</div>`,iconSize:[0,0],iconAnchor:[-4,10]});
        layers.push(L.marker([info.labelLat,info.labelLng],{icon:bigIcon,interactive:false,zIndexOffset:-500}));
      }
    });
    tzLayerRef.current=L.layerGroup(layers).addTo(map);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[showTZ]);

  // ── View presets ─────────────────────────────────────────────────────────
  function flyToView(v:'us'|'east'|'central'|'west') {
    setView(v);
    const map=mapRef.current;
    if(!map) return;
    if(v==='us') map.flyTo([38.5,-96],4,{duration:1});
    else if(v==='east') map.flyTo([38,-79],5.5,{duration:1});
    else if(v==='central') map.flyTo([38.5,-96],5,{duration:1});
    else if(v==='west') map.flyTo([40,-118],5.5,{duration:1});
  }

  // ── Radius circle ─────────────────────────────────────────────────────────
  const lastRadiusLatRef = useRef<number|null>(null);
  const lastRadiusLngRef = useRef<number|null>(null);
  function drawRadiusCircle(lat:number,lng:number) {
    const map=mapRef.current;
    if(!map) return;
    lastRadiusLatRef.current=lat;
    lastRadiusLngRef.current=lng;
    if(!showRadiusRef.current) return;
    if(radiusCircleRef.current) {
      try{ if(radiusCircleRef.current._label) map.removeLayer(radiusCircleRef.current._label); }catch(e){}
      try{ map.removeLayer(radiusCircleRef.current); }catch(e){}
      radiusCircleRef.current=null;
    }
    const circle=L.circle([lat,lng],{radius:70*1609.34,color:'#00d4ff',opacity:1,weight:3,dashArray:'10 6',fillColor:'#00d4ff',fillOpacity:0.07,interactive:false}).addTo(map);
    const lbl=L.marker([lat,lng],{
      icon:L.divIcon({className:'',html:`<div style="font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:700;color:#00d4ff;white-space:nowrap;pointer-events:none;margin-top:-26px;margin-left:8px;text-shadow:0 0 8px rgba(0,212,255,0.8),0 1px 4px rgba(0,0,0,0.9)">70mi radius</div>`,iconSize:[0,0]}),
      interactive:false,zIndexOffset:-100
    }).addTo(map);
    (circle as any)._label=lbl;
    radiusCircleRef.current=circle;
  }
  const showRadiusRef=useRef(showRadius);
  useEffect(()=>{
    showRadiusRef.current=showRadius;
    if(!showRadius) {
      const map=mapRef.current;
      if(radiusCircleRef.current&&map) {
        try{ if(radiusCircleRef.current._label) map.removeLayer(radiusCircleRef.current._label); }catch(e){}
        try{ map.removeLayer(radiusCircleRef.current); }catch(e){}
        radiusCircleRef.current=null;
      }
    } else if(lastRadiusLatRef.current!==null&&lastRadiusLngRef.current!==null) {
      drawRadiusCircle(lastRadiusLatRef.current,lastRadiusLngRef.current);
    }
  },[showRadius]);

  // ── Coverage Lookup ──────────────────────────────────────────────────────
  function handleCityInput(val:string) {
    setRpCity(val);
    if(!val.trim()){ setRpSuggestions([]); return; }
    const results=localSearch(val,8);
    setRpSuggestions(results);
  }

  function selectSuggestion(loc:any) {
    setRpCity(`${loc[0]}, ${loc[1]}`);
    setRpSuggestions([]);
    setLastGeoResult({lat:loc[2],lng:loc[3],display:`${loc[0]}, ${loc[1]}`,city:loc[0],state:loc[1],zip:''});
  }

  async function runLookup() {
    const inputVal=rpCity.trim();
    if(!inputVal){ alert('Please enter a city, address, or ZIP code.'); return; }
    setRpSuggestions([]);
    // try dataset match
    const query=inputVal.toLowerCase().replace(/,.*$/,'').trim();
    const stateHint=inputVal.match(/,?\s*([A-Za-z]{2})\s*$/);
    const stateCode=stateHint?stateHint[1].toUpperCase():null;
    let match=LOCS.find(l=>l[0].toLowerCase()===query&&(!stateCode||l[1]===stateCode));
    if(!match) match=LOCS.find(l=>l[0].toLowerCase()===query);
    if(!match) match=LOCS.find(l=>l[0].toLowerCase().startsWith(query)&&(!stateCode||l[1]===stateCode));
    if(!match) match=LOCS.find(l=>l[0].toLowerCase().startsWith(query));
    if(!match) match=LOCS.find(l=>l[0].toLowerCase().includes(query)&&(!stateCode||l[1]===stateCode));
    if(!match) match=LOCS.find(l=>l[0].toLowerCase().includes(query));
    if(match){ renderDatasetMatch(match); return; }
    let geo=lastGeoResult;
    if(!geo||!inputVal.toLowerCase().includes((geo.city||'').toLowerCase())) geo=await geocodeQuery(inputVal);
    setLastGeoResult(null);
    if(!geo){ setRpResult(<div style={{fontSize:'11px',color:'#3d5478',textAlign:'center',padding:'14px 0'}}>LOCATION NOT FOUND.<br/>Try city + state abbreviation, e.g. "Sweetwater TX".</div>); return; }
    renderGeocodedResult(geo);
  }

  function renderDatasetMatch(match:any) {
    const [name,state,lat,lng,tier]=match;
    const prov=match[16];const wait=match[17];
    const v=getVal(match,rpExam);const col=DCOL[v];
    const tierLabel=tier===1?'Major Metro':tier===2?'Mid-Size City':tier===3?'Small City':'Rural / Remote';
    const nearby=findNearby(lat,lng,match,rpExam);
    const scores=ALL_METRICS.map(mk=>({key:mk,v:getVal(match,mk)}));
    const nearbyData=LOCS.filter(l=>l!==match&&l[4]<=2).map(l=>{const dist=approxMiles(l[2],l[3],lat,lng);return{name:l[0],state:l[1],dist,v:getVal(l,rpExam)};}).filter(l=>l.dist<250&&l.dist>0).sort((a,b)=>a.dist-b.dist).slice(0,4);
    const rd:ReportData={locName:`${name}, ${state}`,stateCode:state,examKey:rpExam,scores,nearby:nearbyData,recommendation:v,isGeo:false,prov,wait,tier,queryCity:name,queryState:state};
    setLastReportData(rd);
    const map=mapRef.current;
    if(map) { map.flyTo([lat,lng],tier<=2?9:11,{duration:1.2}); drawRadiusCircle(lat,lng); }
    placeCustomPin(lat,lng,`${name}, ${state}`,col);
    setDriveLocA(a=>{ setDriveLocB(a||null); return {name:`${name}, ${state}`,lat,lng}; });
    const provData=countProvidersInRadius(lat,lng,rpExam);
    const nearerItems=findNearestEasier(lat,lng,v,rpExam,name);
    setRpResult(
      <div className="fadein">
        <div className="rp-divider"/>
        <div className="rp-city-name">{name}</div>
        <div className="rp-city-meta">{state} · {tierLabel.toUpperCase()} · Prov/100k: {prov} · Wait: ~{wait}d</div>
        <div className="rp-alert" style={{background:`${col}12`,border:`1px solid ${col}30`,color:col}}>
          {MLBL[rpExam]}: <strong>{DLBL[v]}</strong> — Score {v}/5
        </div>
        <ScoreCard scores={ALL_METRICS.map(m=>({key:m,v:getVal(match,m),hl:m===rpExam}))}/>
        <div className="rp-rec">▸ {buildRecText(v)}</div>
        {nearby.length>0&&<div className="rp-nearby">
          <div className="rp-nearby-ttl">Nearest Markets</div>
          {nearby.map((n,i)=><div key={i} className="rp-nearby-item">
            <span className="rp-nearby-city">{n.name}, {n.state}</span>
            <span style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{fontSize:10,color:DCOL[n.v]}}>{DLBL[n.v]}</span>
              <span className="rp-nearby-dist">~{n.dist}mi</span>
            </span>
          </div>)}
        </div>}
        <ProviderBox data={provData} examKey={rpExam} cityName={`${name}, ${state}`} locIdx={LOCS.indexOf(match)} onPin={pinCity}/>
        <DriveTimeBox fromLat={lat} fromLng={lng} fromName={`${name}, ${state}`} locB={null}/>
        {nearerItems.length>0&&<NearestEasier items={nearerItems} onFly={flyToNearer}/>}
        <button className="export-btn" onClick={()=>doExportReport(rd)}>↓ EXPORT PDF REPORT</button>
      </div>
    );
  }

  function renderGeocodedResult(geo:any) {
    const {lat,lng,city,state,zip,display}=geo;
    const v=estimateDifficultyFromNeighbors(lat,lng,rpExam);
    const col=DCOL[v];
    const stD=SD[state]||null;
    const nearby=findNearby(lat,lng,null,rpExam);
    const scores=ALL_METRICS.map(mk=>({key:mk,v:estimateDifficultyFromNeighbors(lat,lng,mk)}));
    const nearbyData=LOCS.filter(l=>l[4]<=2).map(l=>{const dist=approxMiles(l[2],l[3],lat,lng);return{name:l[0],state:l[1],dist,v:getVal(l,rpExam)};}).filter(l=>l.dist<250&&l.dist>0).sort((a,b)=>a.dist-b.dist).slice(0,4);
    const rd:ReportData={locName:`${city||display}${state?', '+state:''}`,stateCode:state||'',examKey:rpExam,scores,nearby:nearbyData,recommendation:v,isGeo:true,prov:stD?stD.prov:null,wait:stD?stD.wait:null,tier:null,queryCity:city||display,queryState:state||''};
    setLastReportData(rd);
    const map=mapRef.current;
    if(map){ map.flyTo([lat,lng],11,{duration:1.2}); drawRadiusCircle(lat,lng); }
    placeCustomPin(lat,lng,`${city}${zip?', '+zip:''}`,col);
    setDriveLocA(a=>{ setDriveLocB(a||null); return {name:`${city}, ${state}`,lat,lng}; });
    const provData=countProvidersInRadius(lat,lng,rpExam);
    const nearerItems=findNearestEasier(lat,lng,v,rpExam,city||'');
    let geoLocIdx=LOCS.findIndex(l=>l[0].toLowerCase()===(city||'').toLowerCase()&&l[1]===(state||''));
    if(geoLocIdx<0){let best=100,bi=-1;LOCS.forEach((l,i)=>{const d=approxMiles(l[2],l[3],lat,lng);if(d<best){best=d;bi=i;}});geoLocIdx=bi;}
    setRpResult(
      <div className="fadein">
        <div className="rp-divider"/>
        <div className="rp-city-name">{city||display}</div>
        <div className="rp-city-meta" style={{marginBottom:4}}>{state}{zip?' · ZIP '+zip:''} · <span style={{color:'#3b82f6'}}>◈ GEOCODED ESTIMATE</span></div>
        <div style={{fontSize:'9.5px',color:'#3d5478',marginBottom:8,padding:'5px 8px',background:'rgba(59,130,246,0.06)',borderRadius:5,lineHeight:1.5}}>
          Interpolated from nearest data points{stD?` · State baseline: <strong style="color:${DCOL[getVal(stD,rpExam)]}">${DLBL[getVal(stD,rpExam)]}</strong>`:''}
        </div>
        <div className="rp-alert" style={{background:`${col}12`,border:`1px solid ${col}30`,color:col}}>
          {MLBL[rpExam]}: <strong>{DLBL[v]}</strong> difficulty (est. {v}/5)
        </div>
        <GeoScoreCard lat={lat} lng={lng} examKey={rpExam}/>
        <div className="rp-rec">▸ {buildRecText(v)}</div>
        {nearby.length>0&&<div className="rp-nearby">
          <div className="rp-nearby-ttl">Nearest Markets</div>
          {nearby.map((n,i)=><div key={i} className="rp-nearby-item">
            <span className="rp-nearby-city">{n.name}, {n.state}</span>
            <span style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{fontSize:10,color:DCOL[n.v]}}>{DLBL[n.v]}</span>
              <span className="rp-nearby-dist">~{n.dist}mi</span>
            </span>
          </div>)}
        </div>}
        <ProviderBox data={provData} examKey={rpExam} cityName={`${city}, ${state}`} locIdx={geoLocIdx} onPin={pinCity}/>
        <DriveTimeBox fromLat={lat} fromLng={lng} fromName={`${city}, ${state}`} locB={null}/>
        {nearerItems.length>0&&<NearestEasier items={nearerItems} onFly={flyToNearer}/>}
        <button className="export-btn" onClick={()=>doExportReport(rd)}>↓ EXPORT PDF REPORT</button>
      </div>
    );
  }

  function buildRecText(v:number):string {
    return {
      1:'Easy fill. Standard outreach should yield results within 24–48 hrs.',
      2:'Moderate effort. 2–5 day turnaround expected. Check contracted providers first.',
      3:'Plan ahead. Allow 5–10 business days. May need to contact 3–5 providers.',
      4:'Difficult market. Expect 1–2 week search. Begin outreach immediately.',
      5:'Critical gap. No reliable local coverage. Consider expanded radius, telehealth, or mobile unit.'
    }[v]||'';
  }

  function placeCustomPin(lat:number,lng:number,label:string,color:string) {
    const map=mapRef.current;
    if(!map) return;
    if(customPinRef.current) map.removeLayer(customPinRef.current);
    const icon=L.divIcon({className:'',html:`<div style="position:relative;width:28px;height:28px;"><div style="width:20px;height:20px;border-radius:50% 50% 50% 0;background:${color};border:2px solid white;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.5);position:absolute;top:0;left:4px;"></div><div style="width:6px;height:6px;border-radius:50%;background:white;position:absolute;top:6px;left:11px;z-index:2;"></div></div>`,iconSize:[28,28],iconAnchor:[14,24]});
    const mk=L.marker([lat,lng],{icon}).addTo(map);
    mk.bindTooltip(`<div style="padding:5px 8px;font-size:11px;font-weight:600;color:#eef4ff">${label}</div>`,{permanent:false});
    customPinRef.current=mk;
  }

  function flyToNearer(lat:number,lng:number,name:string,state:string,score:number,examKey:string) {
    const map=mapRef.current;
    if(!map) return;
    map.flyTo([lat,lng],9,{duration:1.2});
    drawRadiusCircle(lat,lng);
    L.popup({closeButton:true,maxWidth:240})
      .setLatLng([lat,lng])
      .setContent(`<div style="font-family:'Inter',sans-serif;padding:4px 2px"><div style="font-size:13px;font-weight:700;color:#cdd9f0">${name}, ${state}</div><div style="font-size:10px;color:#3d5478;margin-top:2px">${MLBL[examKey]}: <span style="color:${DCOL[score]};font-weight:600">${DLBL[score]}</span></div></div>`)
      .openOn(map);
  }

  function pinCity(idx:number) {
    const match=LOCS[idx];
    if(!match) return;
    if(pinnedCities.find(p=>p[0]===match[0]&&p[1]===match[1])) return;
    if(pinnedCities.length>=5){ alert('Maximum 5 cities. Remove one first.'); return; }
    setPinnedCities(prev=>[...prev,match]);
  }

  async function fetchVerifiedEvidence(rd:ReportData):Promise<EvidencePayload|null> {
    const city=(rd.queryCity||'').trim();
    const state=(rd.queryState||'').trim().toUpperCase();
    if(!city||!state) return null;
    const taxonomy=examTaxonomyHint(rd.examKey);
    const params=new URLSearchParams({
      version:'2.1',
      city,
      state,
      taxonomy_description:taxonomy,
      enumeration_type:'NPI-2',
      limit:'10',
    });
    const sourceUrl=`https://npiregistry.cms.hhs.gov/api/?${params.toString()}`;
    try {
      const resp=await fetch(sourceUrl,{signal:AbortSignal.timeout(12000)});
      if(!resp.ok) throw new Error(`NPI HTTP ${resp.status}`);
      const data=await resp.json() as {results?:any[]};
      const providers=(data.results||[]).map((r:any)=>{
        const basic=r.basic||{};
        const tax=(r.taxonomies||[]).find((t:any)=>t.primary)||r.taxonomies?.[0]||{};
        const addr=(r.addresses||[]).find((a:any)=>a.address_purpose==='LOCATION')||r.addresses?.[0]||{};
        const npi=String(r.number||'');
        return {
          name:basic.organization_name || [basic.first_name,basic.last_name].filter(Boolean).join(' ') || 'Unknown',
          npi,
          taxonomy:tax.desc || taxonomy,
          address:[addr.address_1,addr.city,addr.state,addr.postal_code].filter(Boolean).join(', '),
          phone:addr.telephone_number || '',
          detailsUrl:npi?`https://npiregistry.cms.hhs.gov/provider-view/${npi}`:'https://npiregistry.cms.hhs.gov/',
        } as VerifiedProviderRef;
      });
      return {
        providers,
        fetchedAt:new Date().toISOString(),
        querySummary:`${city}, ${state} · ${MLBL[rd.examKey]||rd.examKey} · taxonomy hint "${taxonomy}"`,
        sourceLinks:[
          {label:'NPPES NPI Registry API',url:sourceUrl},
          {label:'NPPES Provider Search',url:'https://npiregistry.cms.hhs.gov/search'},
        ],
        warning:providers.length?'':'No exact providers returned by NPPES for this city/state and taxonomy filter.',
      };
    } catch (e:any) {
      return {
        providers:[],
        fetchedAt:new Date().toISOString(),
        querySummary:`${city}, ${state} · ${MLBL[rd.examKey]||rd.examKey} · taxonomy hint "${taxonomy}"`,
        sourceLinks:[{label:'NPPES NPI Registry API',url:sourceUrl}],
        warning:`Live NPPES lookup failed: ${e?.message||'unknown error'}`,
      };
    }
  }

  async function doExportReport(rd:ReportData) {
    const evidence=await fetchVerifiedEvidence(rd);
    const html=generateReportHtml(rd,evidence);
    const name=`OccuMed_Coverage_${rd.locName.replace(/[^a-z0-9]/gi,'_')}.html`;
    setPdfHtml(html);
    setPdfDlName(name);
    setShowPdf(true);
  }

  // ── Live Finder ──────────────────────────────────────────────────────────
  async function doLiveSearch(lat:number,lng:number) {
    const map=mapRef.current;
    if(!map) return;
    setLiveLoading(true);
    setLiveResults([]);
    setLiveHint('Searching...');
    lastRadiusRef.current={lat,lng};

    if(liveCircleRef.current) { try{map.removeLayer(liveCircleRef.current);}catch(e){} }
    if(livePinRef.current) { try{map.removeLayer(livePinRef.current);}catch(e){} }
    liveCircleRef.current=L.circle([lat,lng],{radius:liveRadius*1000,color:'#06b6d4',weight:1.5,opacity:0.45,dashArray:'7 5',fillColor:'#06b6d4',fillOpacity:0.03,interactive:false}).addTo(map);
    livePinRef.current=L.marker([lat,lng],{icon:L.divIcon({className:'',html:'<div style="width:14px;height:14px;border-radius:50%;background:#06b6d4;border:2.5px solid #fff;box-shadow:0 0 0 4px rgba(6,182,212,0.28),0 0 14px rgba(6,182,212,0.6);"></div>',iconSize:[14,14],iconAnchor:[7,7]}),zIndexOffset:3000,interactive:false}).addTo(map);

    try { await revGeo(lat,lng); } catch(e){}

    const r=liveRadius*1000;
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

    let success=false;
    for(let i=0;i<OVERPASS_ENDPOINTS.length;i++) {
      const url=OVERPASS_ENDPOINTS[i];
      setLiveMirror(`Trying mirror ${i+1}/${OVERPASS_ENDPOINTS.length}…`);
      try {
        const controller=new AbortController();
        const timer=setTimeout(()=>controller.abort(),8000);
        const res=await fetch(url,{method:'POST',body:'data='+encodeURIComponent(q),signal:controller.signal});
        clearTimeout(timer);
        if(!res.ok) throw new Error('HTTP '+res.status);
        const data=await res.json();
        if(!data||!Array.isArray(data.elements)) throw new Error('Bad response');
        const seen:Record<string,boolean>={};
        const results=data.elements.map((el:any)=>{
          const la=el.lat||(el.center&&el.center.lat);
          const lo=el.lon||(el.center&&el.center.lon);
          if(!la||!lo) return null;
          const t=el.tags||{};
          const nm=t.name||t['name:en']||t.operator||'Unnamed Facility';
          const key=nm.toLowerCase()+'|'+Math.round(la*500)+'|'+Math.round(lo*500);
          if(seen[key]) return null; seen[key]=true;
          const ad=[t['addr:housenumber'],t['addr:street'],t['addr:city']].filter(Boolean).join(' ');
          return{id:el.id,lat:la,lng:lo,name:nm,cat:classifyFacility(t),
            dist:haversine(lat,lng,la,lo),addr:ad,phone:t.phone||t['contact:phone']||'',
            website:t.website||t['contact:website']||'',hours:t.opening_hours||'',op:t.operator||''};
        }).filter(Boolean).sort((a:any,b:any)=>a.dist-b.dist);
        setLiveResults(results);
        renderLiveMarkers(results);
        setLiveHint('');
        setLiveMirror('');
        setLiveLoading(false);
        success=true;
        break;
      } catch(err) { console.warn('[LiveFinder] Mirror failed',url,err); }
    }
    if(!success) {
      setLiveHint('⚠ Could not reach OpenStreetMap. Try a different location or larger radius.');
      setLiveMirror('');
      setLiveLoading(false);
    }
  }

  async function revGeo(lat:number,lng:number) {
    try {
      const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12`,{headers:{'Accept-Language':'en'}});
      const d=await r.json();
      const a=d.address||{};
      setLiveLocation((a.city||a.town||a.village||a.county||a.state||'')+(a.state_code?' · '+a.state_code:''));
    } catch(e){ setLiveLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`); }
  }

  function renderLiveMarkers(results:any[]) {
    const liveGrp=liveGrpRef.current;
    const map=mapRef.current;
    if(!liveGrp||!map) return;
    liveGrp.clearLayers();
    const filtered=liveFilter==='all'?results:results.filter(r=>r.cat===liveFilter);
    filtered.forEach((r:any,i:number)=>{
      const c=CATS[r.cat]||CATS.clinic;
      const gmUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name+(r.addr?' '+r.addr:''))}`;
      const mk=L.marker([r.lat,r.lng],{icon:L.divIcon({className:'',html:`<div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(4,10,22,0.92);border:2px solid ${c.col};${showGlowPoints?`box-shadow:0 0 8px ${c.col}44,0 2px 6px rgba(0,0,0,0.6);`:'box-shadow:0 0 0 1px rgba(255,255,255,0.18);'}font-size:13px;cursor:pointer;">${c.ico}</div>`,iconSize:[28,28],iconAnchor:[14,14]}),zIndexOffset:1000+i});
      mk.bindPopup(`<div style="font-family:Inter,sans-serif;padding:10px 12px;min-width:190px;">
        <div style="display:flex;gap:7px;align-items:flex-start;margin-bottom:6px;"><span style="font-size:16px">${c.ico}</span>
        <div><div style="font-size:12.5px;font-weight:700;color:#e2f0ff;line-height:1.3">${r.name}</div>
        <div style="font-size:8.5px;font-weight:700;font-family:'IBM Plex Mono',monospace;color:${c.col};letter-spacing:1px;text-transform:uppercase;margin-top:2px">${c.lbl}</div></div></div>
        ${r.addr?`<div style="font-size:9.5px;color:#4a6888;margin-bottom:3px;">📍 ${r.addr}</div>`:''}
        ${r.phone?`<div style="font-size:9.5px;color:#4a6888;margin-bottom:3px;">📞 <a href="tel:${r.phone}" style="color:#67e8f9;text-decoration:none">${r.phone}</a></div>`:''}
        ${r.hours?`<div style="font-size:9px;color:#3d5478;margin-bottom:5px;">🕐 ${r.hours}</div>`:''}
        <div style="font-size:8.5px;color:#2d3f55;margin-bottom:7px;">~${fmtDist(r.dist)} away</div>
        <div style="display:flex;gap:4px;">
          <a href="${gmUrl}" target="_blank" rel="noopener" style="flex:1;text-align:center;padding:5px;border-radius:3px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.25);color:#93c5fd;font-size:8.5px;font-family:'IBM Plex Mono',monospace;font-weight:700;text-decoration:none;">GOOGLE MAPS</a>
          ${r.website?`<a href="${r.website}" target="_blank" rel="noopener" style="flex:1;text-align:center;padding:5px;border-radius:3px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);color:#34d399;font-size:8.5px;font-family:'IBM Plex Mono',monospace;font-weight:700;text-decoration:none;">WEBSITE</a>`:''}
        </div></div>`,{maxWidth:270,className:'live-marker-popup'});
      mk.on('click',()=>setLiveHighlightId(r.id));
      r._mk=mk;
      liveGrp.addLayer(mk);
    });
  }

  function filterAndSortLiveResults(results:any[]) {
    const q=liveTextFilter.trim().toLowerCase();
    const filtered=results
      .filter(r=>liveFilter==='all' ? true : r.cat===liveFilter)
      .filter(r=>q ? `${r.name||''} ${r.addr||''} ${r.cat||''}`.toLowerCase().includes(q) : true)
      .filter(r=>{
        if(liveRegionFilter==='all') return true;
        const isUs=isLikelyUsCoord(r.lat, r.lng);
        return liveRegionFilter==='us' ? isUs : !isUs;
      });
    const sorted=[...filtered].sort((a,b)=>{
      if(liveSort==='name') return String(a.name||'').localeCompare(String(b.name||''));
      return (a.dist||0)-(b.dist||0);
    });
    return sorted;
  }

  useEffect(()=>{
    const filtered=filterAndSortLiveResults(liveResults);
    renderLiveMarkers(filtered.length?filtered:liveResults);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[liveFilter, liveTextFilter, liveResults, liveRegionFilter, liveSort, showGlowPoints]);

  function lpFly(lat:number,lng:number,id:any) {
    const map=mapRef.current;
    if(!map) return;
    map.flyTo([lat,lng],17,{duration:0.8});
    const r=liveResults.find(x=>x.id==id);
    if(r&&r._mk) setTimeout(()=>r._mk.openPopup(),900);
    setLiveHighlightId(id);
  }

  // ── Distribution stats ─────────────────────────────────────────────────
  const dist = [1,2,3,4,5].map(v=>({v,count:LOCS.filter(l=>getVal(l,metric)===v).length}));
  const maxDist = Math.max(...dist.map(d=>d.count),1);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="app-wrap">
      {/* ── HEADER ── */}
      <header className="app-header">
        <div className="hdr-brand">
          <div className="hdr-brand-dot"/>
          <span>OCCU-MED</span>
        </div>
        <div className="hdr-sep"/>
        <div className="hdr-stat"><div className="hdr-stat-v">{totalCities}</div><div className="hdr-stat-l">Cities</div></div>
        <div className="hdr-sep"/>
        <div className="hdr-stat"><div className="hdr-stat-v">{statesCount}</div><div className="hdr-stat-l">States</div></div>
        <div className="hdr-sep"/>
        <div className="hdr-stat"><div className="hdr-stat-v" style={{color:'#f97316'}}>{criticalCount}</div><div className="hdr-stat-l">Difficult+</div></div>
        <div className="hdr-actions">
          <button className={`hdr-btn${rpOpen?' active':''}`} onClick={()=>setRpOpen(o=>!o)}>◎ COVERAGE</button>
          <button className={`hdr-btn${liveOpen?' active':''}`} onClick={()=>setLiveOpen(o=>!o)}>📡 LIVE FINDER</button>
          <button className={`hdr-btn${dropUi.panelOpen?' active':''}`} style={{color:'#fca5a5'}} onClick={()=>setDropUi(prev=>({...prev, panelOpen:!prev.panelOpen}))}>⭕ RADIUS TOOL</button>
          <button className="hdr-btn" onClick={()=>setShowDir(true)}>📁 DIRECTORIES</button>
          <button className={`hdr-btn${showPriceFinder?' active':''}`} style={{color:'#34d399'}} onClick={()=>setShowPriceFinder(o=>!o)}>💲 PRICE FINDER</button>
          <button className="hdr-btn" style={{color:'#f472b6'}} onClick={()=>setShowUploadModal(true)}>
            📤 MY CLINICS{uploadedClinics.length>0&&<span className="badge" style={{background:'rgba(244,114,182,0.25)',color:'#f472b6'}}>{uploadedClinics.length}</span>}
          </button>
          <button className={`hdr-btn green`} onClick={()=>setShowCompare(true)}>
            ⊞ COMPARE{pinnedCities.length>0&&<span className="badge">{pinnedCities.length}</span>}
          </button>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="app-body">
        {/* ── SIDEBAR ── */}
        <aside className="sidebar">
          <div className="hero-card">
            <div className="hero-title">Occu-Med Network Command</div>
            <div className="hero-sub">Find occupational providers, compare prices, and build smarter coverage faster.</div>
            <div className="hero-actions">
              <button className="hero-btn" onClick={()=>setShowPriceFinder(true)}>Area Prices</button>
              <button className="hero-btn" onClick={()=>setShowPopDensity(v=>!v)}>Population Overlay</button>
              <button className="hero-btn" onClick={()=>setShowUploadModal(true)}>My Clinics</button>
            </div>
          </div>
          <div className="sb-section">
            <div className="sb-lbl">SERVICE METRIC</div>
            {ALL_METRICS.map(m=>(
              <button key={m} className={`mbtn${metric===m?' active':''}`} onClick={()=>setMetric(m)}>
                <span className="mico">{MICONS[m]}</span>{MLBL[m]}
              </button>
            ))}
          </div>
          <div className="sb-divider"/>
          <div className="sb-section">
            <div className="sb-lbl">VIEW PRESETS</div>
            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
              {(['us','east','central','west'] as const).map(v=>(
                <button key={v} className={`vbtn${view===v?' active':''}`} onClick={()=>flyToView(v)}>{v.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div className="sb-divider"/>
          <div className="sb-section">
            <div className="sb-lbl">LAYERS</div>
            <div className="tog-row">
              <span className="tog-lbl">State labels</span>
              <label className="tog-switch"><input type="checkbox" checked={showLabels} onChange={e=>setShowLabels(e.target.checked)}/><span className="tog-slider"/></label>
            </div>
            <div className="tog-row">
              <span className="tog-lbl">Timezone overlay</span>
              <label className="tog-switch"><input type="checkbox" checked={showTZ} onChange={e=>setShowTZ(e.target.checked)}/><span className="tog-slider"/></label>
            </div>
            <div className="tog-row">
              <span className="tog-lbl">Population density</span>
              <label className="tog-switch"><input type="checkbox" checked={showPopDensity} onChange={e=>setShowPopDensity(e.target.checked)}/><span className="tog-slider"/></label>
            </div>
            <div className="tog-row">
              <span className="tog-lbl">State color fill</span>
              <label className="tog-switch"><input type="checkbox" checked={showStateColors} onChange={e=>setShowStateColors(e.target.checked)}/><span className="tog-slider"/></label>
            </div>
            <div className="tog-row">
              <span className="tog-lbl">70mi radius ring</span>
              <label className="tog-switch"><input type="checkbox" checked={showRadius} onChange={e=>setShowRadius(e.target.checked)}/><span className="tog-slider"/></label>
            </div>
            <div className="tog-row">
              <span className="tog-lbl">Glow effects</span>
              <label className="tog-switch"><input type="checkbox" checked={showGlowPoints} onChange={e=>setShowGlowPoints(e.target.checked)}/><span className="tog-slider"/></label>
            </div>
            {uploadedClinics.length>0&&<div className="tog-row">
              <span className="tog-lbl" style={{color:'#f472b6'}}>My clinics ({uploadedClinics.length})</span>
              <label className="tog-switch"><input type="checkbox" checked={showUploadedClinics} onChange={e=>setShowUploadedClinics(e.target.checked)}/><span className="tog-slider"/></label>
            </div>}
          </div>
          <div className="sb-divider"/>
          <div className="sb-section">
            <div className="sb-lbl">FILTER CITIES</div>
            <div style={{display:'flex',gap:3,flexWrap:'wrap',marginBottom:8}}>
              <button className={`fbtn${filterDiff===null?' active':''}`} onClick={()=>setFilterDiff(null)}>ALL</button>
              {[1,2,3,4,5].map(v=>(
                <button key={v} className={`fbtn${filterDiff===v?' active':''}`} style={{color:DCOL[v]}} onClick={()=>setFilterDiff(filterDiff===v?null:v)}>{DLBL[v]}</button>
              ))}
            </div>
          </div>
          <div className="sb-divider"/>
          <div className="sb-section" style={{paddingBottom:10}}>
            <div className="sb-lbl">DISTRIBUTION</div>
            {dist.map(d=>(
              <div key={d.v} className="br">
                <div className="br-hdr">
                  <span style={{fontSize:9.5,color:DCOL[d.v],fontFamily:'IBM Plex Mono, monospace',fontWeight:700}}>{DLBL[d.v]}</span>
                  <span style={{fontSize:9,color:'#3d5478'}}>{d.count}</span>
                </div>
                <div className="br-track"><div className="br-fill" style={{width:`${(d.count/maxDist)*100}%`,background:DCOL[d.v]}}/></div>
              </div>
            ))}
          </div>
          <div className="sb-divider"/>
          <div className="sb-section" style={{paddingBottom:12}}>
            <div className="sb-lbl">LEGEND</div>
            {[1,2,3,4,5].map(v=>(
              <div key={v} className="legend-row">
                <div className="legend-dot" style={{background:DCOL[v]}}/>
                <span className="legend-lbl">{v} — {DLBL[v]}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* ── MAP ── */}
        <div className="map-wrap">
          <div id="map" ref={mapDivRef}/>
          {localPopInfo&&(
            <div className="local-pop-card">
              <div className="local-pop-title">Local population estimate</div>
              <div className="local-pop-row"><span>Density</span><strong>{Math.round(localPopInfo.density).toLocaleString()}/mi²</strong></div>
              <div className="local-pop-row"><span>State baseline</span><strong>{localPopInfo.state}</strong></div>
              <div className="local-pop-row"><span>Population context</span><strong>{localPopInfo.population.toLocaleString()}</strong></div>
              <div className="local-pop-row"><span>Nearest city</span><strong>{localPopInfo.nearestCity}</strong></div>
              <div className="local-pop-row"><span>Distance</span><strong>{localPopInfo.nearestDist.toFixed(1)} mi</strong></div>
              <div className="local-pop-meta">{localPopInfo.lat.toFixed(4)}, {localPopInfo.lng.toFixed(4)}</div>
            </div>
          )}
          {dropUi.panelOpen&&(
            <div className="local-pop-card" style={{top: dropCenter ? 184 : 96, borderColor:'rgba(252,165,165,0.35)', boxShadow:'0 10px 30px rgba(239,68,68,0.16)'}}>
              <div className="local-pop-title" style={{color:'#fecaca'}}>Radius extractor</div>
              <div className="local-pop-meta" style={{marginBottom:8,color:'#fca5a5'}}>Click map to move the center point</div>
              <div style={{display:'grid',gap:6}}>
                <div>
                  <div style={{fontSize:9,color:'#fda4af',marginBottom:3}}>Radius (miles)</div>
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={dropRadiusMiles}
                    onChange={e=>setDropRadiusMiles(Math.max(0.1, Number(e.target.value)||0.1))}
                    className="drivetime-input"
                  />
                </div>
                <div>
                  <div style={{fontSize:9,color:'#fda4af',marginBottom:3}}>Facility type for export</div>
                  <select className="rp-select" value={dropFacilityType} onChange={e=>setDropFacilityType(e.target.value)}>
                    <option value="all">All facilities</option>
                    <option value="hospital">Hospital</option>
                    <option value="clinic">Clinic</option>
                    <option value="dentist">Dental</option>
                    <option value="stress">Cardio / Stress Test</option>
                    <option value="doctor">Doctor / GP</option>
                    <option value="pharmacy">Pharmacy</option>
                    {Object.entries(CATS).filter(([k])=>!['hospital','clinic','dentist','stress','doctor','pharmacy'].includes(k)).map(([cat,c])=>(
                      <option key={cat} value={cat}>{c.lbl}</option>
                    ))}
                  </select>
                </div>
                <label style={{display:'flex',alignItems:'center',gap:6,fontSize:9,color:'#fecaca',cursor:'pointer'}}>
                  <input
                    type="checkbox"
                    checked={dropIncludeFacilities}
                    onChange={e=>setDropIncludeFacilities(e.target.checked)}
                  />
                  Include facilities in export
                </label>
                {dropCenter&&<div style={{fontSize:9,color:'#fecaca'}}>Center: {dropCenter.lat.toFixed(4)}, {dropCenter.lng.toFixed(4)}</div>}
                <div style={{display:'flex',gap:6}}>
                  <button className="drivetime-btn" disabled={!dropCenter} onClick={saveCurrentRadius} style={{background:'rgba(244,114,182,0.14)',borderColor:'rgba(244,114,182,0.35)',color:'#fbcfe8'}}>
                    Save ring
                  </button>
                  <button className="drivetime-btn" disabled={!savedRadii.length} onClick={()=>setSavedRadii([])} style={{background:'rgba(148,163,184,0.14)',borderColor:'rgba(148,163,184,0.35)',color:'#cbd5e1'}}>
                    Clear saved
                  </button>
                </div>
                {savedRadii.length>0&&(
                  <div style={{display:'grid',gap:3,maxHeight:76,overflowY:'auto',paddingRight:2}}>
                    {savedRadii.slice(0,8).map((r,i)=>(
                      <div key={r.id} style={{display:'flex',justifyContent:'space-between',fontSize:8.5,color:'#fecaca',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(252,165,165,0.2)',borderRadius:4,padding:'3px 5px'}}>
                        <span style={{display:'inline-flex',alignItems:'center',gap:5}}><span style={{width:7,height:7,borderRadius:'50%',background:r.color,display:'inline-block'}}/>Ring {i+1}</span>
                        <span>{r.radiusMiles.toFixed(1)} mi</span>
                      </div>
                    ))}
                  </div>
                )}
                {dropUi.status&&<div style={{fontSize:9,color:'#fca5a5',lineHeight:1.4}}>{dropUi.status}</div>}
                <div style={{display:'flex',gap:6}}>
                  <button className="drivetime-btn" disabled={dropUi.exportLoading||!dropCenter} onClick={exportRadiusWorkbook} style={{background:'rgba(239,68,68,0.16)',borderColor:'rgba(252,165,165,0.4)',color:'#fecaca'}}>
                    {dropUi.exportLoading ? 'Extracting…' : 'Extract to Excel'}
                  </button>
                  <button className="drivetime-btn" onClick={()=>setDropUi(prev=>({...prev, panelOpen:false}))} style={{background:'rgba(148,163,184,0.15)',borderColor:'rgba(148,163,184,0.35)',color:'#cbd5e1',maxWidth:88}}>
                    Hide
                  </button>
                </div>
              </div>
            </div>
          )}
          {showTZ&&(
            <div className="tz-legend">
              {TZ_INFO.map(tz=>(
                <div key={tz.abbr} className="tz-item">
                  <div className="tz-dot" style={{background:tz.color}}/>
                  <span style={{color:tz.color}}>{tz.abbr}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className={`right-panel${rpOpen?' open':''}`}>
          {rpOpen&&(
            <div className="rp-inner">
              <div className="rp-header">
                <span className="rp-title">◎ Coverage Request</span>
                <button className="rp-close" onClick={()=>setRpOpen(false)}>✕</button>
              </div>
              <div className="rp-field" style={{position:'relative'}}>
                <label>CITY / ADDRESS / ZIP</label>
                <input
                  className="rp-input"
                  placeholder="e.g. Birmingham AL"
                  value={rpCity}
                  onChange={e=>handleCityInput(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&runLookup()}
                />
                {rpSuggestions.length>0&&(
                  <div className="rp-suggestions">
                    {rpSuggestions.map((loc,i)=>(
                      <div key={i} className="rp-sug-item" onClick={()=>selectSuggestion(loc)}>
                        <div className="rp-sug-main">{loc[0]}, {loc[1]}</div>
                        <div className="rp-sug-sub">{loc[4]===1?'Major Metro':loc[4]===2?'Mid-Size City':loc[4]===3?'Small City':'Rural'} · {DLBL[getVal(loc,metric)]}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rp-field">
                <label>EXAM / SERVICE TYPE</label>
                <select className="rp-select" value={rpExam} onChange={e=>setRpExam(e.target.value)}>
                  {ALL_METRICS.map(m=><option key={m} value={m}>{MLBL[m]}</option>)}
                </select>
              </div>
              <button className="rp-run-btn" onClick={runLookup}>▶ ASSESS COVERAGE</button>
              {rpResult}
            </div>
          )}
        </div>

        {/* ── LIVE PANEL ── */}
        <div className={`live-panel${liveOpen?' open':''}`}>
          {liveOpen&&(
            <div className="lp-inner">
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span className="lp-title">📡 LIVE HEALTHCARE FINDER</span>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <button
                    onClick={exportOutreachCsv}
                    style={{fontSize:8,padding:'4px 7px',borderRadius:4,border:'1px solid rgba(52,211,153,0.28)',background:'rgba(52,211,153,0.1)',color:'#34d399',fontFamily:"'IBM Plex Mono',monospace",cursor:'pointer'}}
                  >
                    EXPORT CSV
                  </button>
                  <button className="rp-close" onClick={()=>setLiveOpen(false)}>✕</button>
                </div>
              </div>
              <div style={{display:'flex',gap:6}}>
                <button
                  onClick={exportLeadershipPackage}
                  style={{fontSize:8,padding:'4px 7px',borderRadius:4,border:'1px solid rgba(56,189,248,0.28)',background:'rgba(56,189,248,0.1)',color:'#38bdf8',fontFamily:"'IBM Plex Mono',monospace",cursor:'pointer'}}
                >
                  LEADERSHIP EXPORT
                </button>
              </div>
              <div style={{fontSize:10,color:'#3d5478',lineHeight:1.5}}>
                {liveHint||`${liveResults.length} facilit${liveResults.length===1?'y':'ies'}${liveLocation?' · '+liveLocation:''}`}
                {liveMirror&&<div style={{fontSize:9,color:'#2d4060',marginTop:3}}>{liveMirror}</div>}
              </div>
              {(() => {
                const gap = territoryGapSummary();
                return (
                  <div style={{padding:'7px 9px',borderRadius:6,background:'rgba(15,33,63,0.45)',border:'1px solid rgba(103,232,249,0.16)'}}>
                    <div style={{fontSize:8.5,fontFamily:"'IBM Plex Mono',monospace",letterSpacing:'0.08em',color:'#67e8f9',marginBottom:4}}>TERRITORY GAP ANALYSIS</div>
                    <div style={{fontSize:9,color:'#8fb3d8',marginBottom:4}}>Coverage: <strong style={{color:'#cfe9ff'}}>{gap.covered}/{gap.total}</strong> required categories in current map radius.</div>
                    {gap.missing.length>0 ? (
                      <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                        {gap.missing.map(cat=>(
                          <span key={cat} style={{fontSize:8,padding:'2px 5px',borderRadius:999,background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.28)',color:'#fca5a5'}}>
                            Missing: {CATS[cat]?.lbl || cat}
                          </span>
                        ))}
                      </div>
                    ) : <div style={{fontSize:9,color:'#34d399'}}>All required categories covered in this search area.</div>}
                  </div>
                );
              })()}
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:9.5,color:'#3d5478',whiteSpace:'nowrap'}}>Radius:</span>
                <input type="range" min={2} max={50} value={liveRadius} onChange={e=>setLiveRadius(Number(e.target.value))} onMouseUp={()=>{ if(lastRadiusRef.current) doLiveSearch(lastRadiusRef.current.lat,lastRadiusRef.current.lng); }}/>
                <span style={{fontFamily:'IBM Plex Mono,monospace',fontSize:10,color:'#67e8f9',whiteSpace:'nowrap'}}>{liveRadius} km</span>
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,padding:'6px 8px',borderRadius:8,background:'rgba(125,211,252,0.06)',border:'1px solid rgba(125,211,252,0.18)'}}>
                <label style={{display:'flex',alignItems:'center',gap:6,fontSize:9.5,color:'#9cc7eb',cursor:'pointer'}}>
                  <input type="checkbox" checked={liveAutoPin} onChange={e=>setLiveAutoPin(e.target.checked)} />
                  Auto search on pin drop
                </label>
                <span style={{fontSize:9,color:'#67e8f9',fontFamily:"'IBM Plex Mono',monospace"}}>Global</span>
              </div>
              <input
                className="rp-input"
                placeholder="Filter providers by name, address, or type..."
                value={liveTextFilter}
                onChange={e=>setLiveTextFilter(e.target.value)}
              />
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                <select className="rp-select" value={liveRegionFilter} onChange={e=>setLiveRegionFilter(e.target.value as any)}>
                  <option value="all">All Regions</option>
                  <option value="us">US Only</option>
                  <option value="intl">International Only</option>
                </select>
                <select className="rp-select" value={liveSort} onChange={e=>setLiveSort(e.target.value as any)}>
                  <option value="distance">Sort: Distance</option>
                  <option value="name">Sort: Name</option>
                </select>
              </div>
              {/* Filter chips */}
              <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
                <button className={`lp-chip${liveFilter==='all'?' on':''}`} onClick={()=>setLiveFilter('all')}>All</button>
                {Object.entries(CATS).map(([cat,c])=>(
                  <button key={cat} className={`lp-chip${liveFilter===cat?' on':''}`} onClick={()=>setLiveFilter(cat)}>{c.ico} {c.lbl}</button>
                ))}
              </div>
              <div style={{fontSize:9,color:'#8fb3d8'}}>
                Showing {filterAndSortLiveResults(liveResults).length} of {liveResults.length} providers
              </div>
              <div className={`lp-loading${liveLoading?' show':''}`}>
                <div className="lp-spin"/>
                <div style={{fontSize:10,color:'#3d5478'}}>Querying Overpass API...</div>
              </div>
              {!liveLoading&&liveResults.length===0&&!liveHint.startsWith('⚠')&&(
                <div className="lp-empty show">Click anywhere on the map to search nearby facilities</div>
              )}
              {!liveLoading&&liveHint.startsWith('⚠')&&(
                <div style={{padding:14,textAlign:'center',fontSize:10.5,color:'#ef4444',lineHeight:1.9}}>
                  {liveHint}
                  <br/><button style={{marginTop:8,padding:'4px 12px',borderRadius:3,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',color:'#ef4444',fontFamily:"'IBM Plex Mono',monospace",fontSize:9,cursor:'pointer'}} onClick={()=>{if(lastRadiusRef.current)doLiveSearch(lastRadiusRef.current.lat,lastRadiusRef.current.lng);}}>↺ RETRY</button>
                </div>
              )}
              {filterAndSortLiveResults(liveResults).map((r:any)=>{
                const c=CATS[r.cat]||CATS.clinic;
                const gm=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name+(r.addr?' '+r.addr:''))}`;
                return (
                  <div key={r.id} className={`lp-item${liveHighlightId===r.id?' hl':''}`} onClick={()=>lpFly(r.lat,r.lng,r.id)}>
                    <div className="lp-row1">
                      <span className="lp-ico">{c.ico}</span>
                      <span className="lp-name">{r.name}</span>
                      <span className="lp-dist">{fmtDist(r.dist)}</span>
                    </div>
                    {r.addr&&<div className="lp-addr">{r.addr}</div>}
                    <div className="lp-tags">
                      <span className="lp-tag" style={{color:c.col,borderColor:c.col+'30',background:c.col+'0d'}}>{c.lbl}</span>
                      {r.hours&&<span className="lp-tag">{r.hours.substring(0,30)}</span>}
                      {r.phone&&<span className="lp-tag">📞</span>}
                    </div>
                    <div className="lp-acts">
                      <a href={gm} target="_blank" rel="noopener" className="lp-act pri" onClick={e=>e.stopPropagation()}>Google Maps ↗</a>
                      {r.website&&<a href={r.website} target="_blank" rel="noopener" className="lp-act" onClick={e=>e.stopPropagation()}>Website ↗</a>}
                      {r.phone&&<a href={`tel:${r.phone}`} className="lp-act" onClick={e=>e.stopPropagation()}>Call</a>}
                    </div>
                    <div style={{marginTop:6,display:'grid',gap:5}} onClick={e=>e.stopPropagation()}>
                      <select
                        value={outreachStatus[String(r.id)]||'new'}
                        onChange={e=>updateOutreachStatus(r.id,e.target.value)}
                        style={{fontSize:9,padding:'4px 6px',borderRadius:4,background:'rgba(7,20,42,0.7)',border:'1px solid rgba(103,232,249,0.2)',color:'#9cc7eb'}}
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="interested">Interested</option>
                        <option value="contracting">Contracting</option>
                        <option value="closed">Closed</option>
                      </select>
                      <textarea
                        value={outreachNotes[String(r.id)]||''}
                        onChange={e=>updateOutreachNote(r.id,e.target.value)}
                        placeholder="Outreach note..."
                        style={{minHeight:46,resize:'vertical',fontSize:9,padding:'6px 7px',borderRadius:4,background:'rgba(7,20,42,0.6)',border:'1px solid rgba(103,232,249,0.18)',color:'#cce7ff'}}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── DIRECTORIES MODAL ── */}
      <div className={`modal-backdrop${showDir?' open':''}`} onClick={()=>setShowDir(false)}>
        <div className="modal-box" style={{width:640}} onClick={e=>e.stopPropagation()}>
          <div className="modal-header">
            <span className="modal-title">📁 PROVIDER DIRECTORIES</span>
            <button className="modal-close" onClick={()=>setShowDir(false)}>✕</button>
          </div>
          <div className="modal-body">
            <div className="dir-section-lbl">OCCUPATIONAL HEALTH RESOURCES</div>
            <div className="dir-grid">
              {PROVIDER_DIRS.map((d,i)=>(
                <a key={i} className="dir-app" href={d.url} target="_blank" rel="noopener noreferrer">
                  <div style={{fontSize:18}}>🔗</div>
                  <div className="dir-app-name">{d.name}</div>
                  <div className="dir-app-tag">{d.tag}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── PRICE FINDER MODAL ── */}
      {showPriceFinder && (
        <div className="modal-backdrop open" onClick={()=>setShowPriceFinder(false)}>
          <div className="modal-box" style={{width:760,maxHeight:'88vh',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title" style={{color:'#34d399'}}>💲 PROVIDER PRICE FINDER</span>
              <button className="modal-close" onClick={()=>setShowPriceFinder(false)}>✕</button>
            </div>
            <div className="modal-body" style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>

              {/* Search form */}
              <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
                <div style={{flex:2,minWidth:140}}>
                  <div style={{fontSize:9,color:'#3d5478',letterSpacing:'0.08em',marginBottom:4}}>CITY / ZIP</div>
                  <input className="rp-input" style={{width:'100%',boxSizing:'border-box'}}
                    placeholder="e.g. Birmingham" value={pfCity}
                    onChange={e=>setPfCity(e.target.value)}
                    onKeyDown={e=>e.key==='Enter'&&runPriceSearch()} />
                </div>
                <div style={{flex:1,minWidth:70}}>
                  <div style={{fontSize:9,color:'#3d5478',letterSpacing:'0.08em',marginBottom:4}}>STATE</div>
                  <input className="rp-input" style={{width:'100%',boxSizing:'border-box'}}
                    placeholder="AL" value={pfState}
                    onChange={e=>setPfState(e.target.value.toUpperCase().slice(0,2))}
                    onKeyDown={e=>e.key==='Enter'&&runPriceSearch()} />
                </div>
                <div style={{flex:2,minWidth:160}}>
                  <div style={{fontSize:9,color:'#3d5478',letterSpacing:'0.08em',marginBottom:4}}>SERVICE TYPE</div>
                  <select className="rp-select" style={{width:'100%',boxSizing:'border-box'}}
                    value={pfServiceType} onChange={e=>setPfServiceType(e.target.value as any)}>
                    <option value="urgentCare">Urgent Care</option>
                    <option value="dental">Dental</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="physicalExam">Physical Exam</option>
                    <option value="faamedical">FAA Medical</option>
                    <option value="stressTest">Treadmill Stress Test</option>
                    <option value="mammogram">Mammogram</option>
                    <option value="dotExam">DOT Exam</option>
                    <option value="vaccinations">Vaccinations</option>
                  </select>
                </div>
                <div style={{display:'flex',alignItems:'flex-end'}}>
                  <button className="rp-assess-btn" style={{padding:'8px 18px',minWidth:90,opacity:pfLoading?0.6:1}}
                    onClick={runPriceSearch} disabled={pfLoading||!pfCity.trim()}>
                    {pfLoading ? '⏳ SEARCHING...' : '🔍 SEARCH'}
                  </button>
                </div>
              </div>

              {/* Reference price anchor */}
              {PF_REF_PRICES[pfServiceType] && (
                <div style={{background:'rgba(52,211,153,0.06)',border:'1px solid rgba(52,211,153,0.18)',borderRadius:6,padding:'8px 14px',marginBottom:12,display:'flex',gap:14,alignItems:'center',flexWrap:'wrap'}}>
                  <div>
                    <div style={{fontSize:8,fontFamily:"'IBM Plex Mono',monospace",color:'#34d399',letterSpacing:'0.1em',marginBottom:2}}>TYPICAL PRICE RANGE</div>
                    <div style={{fontSize:15,fontWeight:700,color:'#a7f3d0',fontFamily:"'IBM Plex Mono',monospace"}}>{PF_REF_PRICES[pfServiceType].range}</div>
                  </div>
                  <div style={{flex:1,fontSize:9,color:'#4a7a66',lineHeight:1.5}}>{PF_REF_PRICES[pfServiceType].note}</div>
                </div>
              )}

              {/* Tab bar */}
                  <div style={{display:'flex',gap:0,marginBottom:14,borderBottom:'1px solid rgba(20,50,100,0.5)',flexWrap:'wrap'}}>
                {([['providers','📋 PROVIDERS','#67e8f9'],['compare','💰 COMPARE PRICES','#34d399'],['areaPrices','📊 AREA PRICES','#a78bfa'],['priceHunt','🎯 PRICE HUNT','#f97316'],['occHunt','🩺 OCC HUNT','#38bdf8'],['report','⭐ REPORT A PRICE','#fbbf24']] as const).map(([tab,label,col])=>(
                  <button key={tab} onClick={()=>setPfTab(tab)} style={{
                    padding:'7px 16px',background:'transparent',border:'none',
                    borderBottom:`2px solid ${pfTab===tab?col:'transparent'}`,
                    color:pfTab===tab?col:'#3d5478',
                    fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fontWeight:700,
                    letterSpacing:'0.08em',cursor:'pointer',transition:'color 0.15s,border-color 0.15s',
                  }}>
                    {label}{tab==='report'&&pfReports.length>0?` (${pfReports.length})`:''}
                  </button>
                ))}
              </div>

              {/* Loading */}
              {pfLoading && (
                <div style={{textAlign:'center',padding:'30px 0',color:'#3d5478',fontSize:11}}>
                  <div style={{fontSize:20,marginBottom:8}}>⏳</div>
                  <div>Querying NPI Registry for licensed providers...</div>
                  <div style={{marginTop:4,fontSize:10,color:'#2a3f5e'}}>Searching primary taxonomy + FQHCs in parallel</div>
                </div>
              )}

              {/* Error */}
              {pfError && !pfLoading && (
                <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:6,padding:'10px 14px',color:'#fca5a5',fontSize:11,marginBottom:12}}>
                  ⚠ {pfError}
                </div>
              )}

              {/* ── PROVIDERS TAB ── */}
              {!pfLoading && pfTab==='providers' && (
                pfDone ? (
                  <>
                    <div style={{fontSize:9,color:'#3d5478',letterSpacing:'0.08em',marginBottom:8}}>
                      LICENSED PROVIDERS NEAR <span style={{color:'#06b6d4'}}>{pfLocation.toUpperCase()}</span>
                      <span style={{marginLeft:8,color:'#2a3f5e'}}>({pfClinics.length} found · NPI Registry)</span>
                    </div>
                    {pfClinics.length===0 && (
                      <div style={{fontSize:10,color:'#2a3f5e',marginBottom:12,padding:'8px 12px',background:'rgba(10,24,48,0.4)',borderRadius:6}}>
                        No licensed providers found for this city. Try a nearby major city, or use the <strong style={{color:'#34d399'}}>Compare Prices</strong> tab to book directly on ZocDoc, MDsave, or Sesame.
                      </div>
                    )}
                    <div style={{display:'flex',flexDirection:'column',gap:6}}>
                      {pfClinics.map((c,i)=>(
                        <div key={i} style={{
                          background:c.isFqhc?'rgba(52,211,153,0.07)':'rgba(6,10,24,0.5)',
                          border:c.isFqhc?'1px solid rgba(52,211,153,0.25)':'1px solid rgba(20,40,80,0.6)',
                          borderRadius:6,padding:'9px 12px',
                        }}>
                          <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                            {c.isFqhc && (
                              <span style={{fontSize:7,fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,color:'#34d399',border:'1px solid rgba(52,211,153,0.4)',borderRadius:3,padding:'2px 5px',whiteSpace:'nowrap',marginTop:2,flexShrink:0}}>
                                ✓ SLIDING SCALE
                              </span>
                            )}
                            <div style={{flex:1}}>
                              <div style={{fontSize:11,fontWeight:600,color:'#eef4ff',marginBottom:1}}>{c.name}</div>
                              <div style={{fontSize:8.5,color:'#4a5a7a',fontFamily:"'IBM Plex Mono',monospace",marginBottom:2}}>{c.taxonomy}</div>
                              {c.address && <div style={{fontSize:9,color:'#5d7a9e'}}>📍 {c.address}</div>}
                              {c.phone && <div style={{fontSize:9,color:'#3d8bcd',fontFamily:"'IBM Plex Mono',monospace",marginTop:1}}>
                                📞 <a href={`tel:${c.phone}`} style={{color:'#67e8f9',textDecoration:'none'}}>{c.phone}</a>
                              </div>}
                            </div>
                            <div style={{display:'flex',flexDirection:'column',gap:4,flexShrink:0}}>
                              <a href={c.searchUrl} target="_blank" rel="noopener noreferrer"
                                style={{fontSize:8,fontFamily:"'IBM Plex Mono',monospace",padding:'3px 7px',background:'rgba(6,182,212,0.1)',border:'1px solid rgba(6,182,212,0.25)',borderRadius:3,color:'#06b6d4',textDecoration:'none',textAlign:'center'}}>
                                FIND PRICE →
                              </a>
                              <button onClick={()=>{setPfReportProvider(c.name);setPfTab('report');}}
                                style={{fontSize:8,fontFamily:"'IBM Plex Mono',monospace",padding:'3px 7px',background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.2)',borderRadius:3,color:'#fbbf24',cursor:'pointer'}}>
                                REPORT PRICE
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{textAlign:'center',padding:'24px 0',color:'#2a3f5e',fontSize:11,lineHeight:1.8}}>
                    <div style={{fontSize:28,marginBottom:10}}>💲</div>
                    <div style={{color:'#3d5478',marginBottom:6}}>Enter a city above to find:</div>
                    <div style={{fontSize:10,color:'#2a3f5e'}}>
                      • Licensed providers from the federal NPI Registry<br/>
                      • FQHCs with income-based sliding scale fees<br/>
                      • Clickable phone numbers and address lookup<br/>
                      • One-click "Report Price" for any provider
                    </div>
                  </div>
                )
              )}

              {/* ── COMPARE PRICES TAB ── */}
              {!pfLoading && pfTab==='compare' && (
                <>
                  {/* Deep links: Book & compare */}
                  <div style={{fontSize:9,color:'#3d5478',letterSpacing:'0.08em',marginBottom:8}}>
                    BOOK & COMPARE{pfCity.trim()&&<> NEAR <span style={{color:'#06b6d4'}}>{(pfLocation||pfCity).toUpperCase()}{pfState?' · '+pfState.toUpperCase():''}</span></>}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:18}}>
                    {pfDeepLinks(pfCity||'your city', pfState, pfServiceType).map((lk,i)=>(
                      <a key={i} href={lk.url} target="_blank" rel="noopener noreferrer" style={{
                        background:'rgba(10,24,48,0.5)',border:'1px solid rgba(20,50,100,0.5)',
                        borderRadius:6,padding:'10px 12px',textDecoration:'none',display:'block',
                      }}>
                        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                          <span style={{fontSize:8,fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,color:'#34d399',border:'1px solid rgba(52,211,153,0.3)',borderRadius:3,padding:'1px 5px'}}>{lk.tag}</span>
                          <span style={{fontSize:10,fontWeight:700,color:'#c8ddf0'}}>{lk.name}</span>
                        </div>
                        <div style={{fontSize:9,color:'#4a6080',lineHeight:1.4}}>{lk.desc}</div>
                      </a>
                    ))}
                  </div>

                  {/* Transparent pricing networks */}
                  <div style={{fontSize:9,color:'#3d5478',letterSpacing:'0.08em',marginBottom:8}}>TRANSPARENT-PRICING NETWORKS</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:18}}>
                    {(pfNetworks.length ? pfNetworks : (PF_NETWORKS[pfServiceType]||PF_NETWORKS.urgentCare)).map((n,i)=>(
                      <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" style={{
                        background:'rgba(10,24,48,0.5)',border:'1px solid rgba(20,50,100,0.5)',
                        borderRadius:6,padding:'9px 11px',textDecoration:'none',display:'block',
                      }}>
                        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                          <span style={{fontSize:8,fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,color:'#fbbf24',border:'1px solid rgba(251,191,36,0.3)',borderRadius:3,padding:'1px 5px'}}>{n.tag}</span>
                        </div>
                        <div style={{fontSize:10,fontWeight:600,color:'#c8ddf0',marginBottom:3}}>{n.name}</div>
                        <div style={{fontSize:9,color:'#4a6080',lineHeight:1.4}}>{n.desc}</div>
                      </a>
                    ))}
                  </div>

                  {/* Research tools */}
                  <div style={{fontSize:9,color:'#3d5478',letterSpacing:'0.08em',marginBottom:8}}>PRICING RESEARCH TOOLS</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {(pfResources.length ? pfResources : PF_RESOURCES).map((r,i)=>(
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" style={{
                        flex:'1 1 180px',background:'rgba(6,182,212,0.05)',border:'1px solid rgba(6,182,212,0.15)',
                        borderRadius:6,padding:'8px 11px',textDecoration:'none',display:'block',
                      }}>
                        <div style={{fontSize:8,fontFamily:"'IBM Plex Mono',monospace",color:'#06b6d4',marginBottom:3}}>{r.tag}</div>
                        <div style={{fontSize:10,fontWeight:600,color:'#c8ddf0',marginBottom:2}}>{r.name}</div>
                        <div style={{fontSize:9,color:'#4a6080',lineHeight:1.4}}>{r.desc}</div>
                      </a>
                    ))}
                  </div>
                </>
              )}

              {/* ── AREA PRICES TAB ── */}
              {!pfLoading && pfTab==='areaPrices' && (()=>{
                const proc = PROCEDURE_RATES[apProcedure];
                const adjLow  = apState ? adjustedPrice(proc?.selfPayLow||0, apState) : proc?.selfPayLow||0;
                const adjHigh = apState ? adjustedPrice(proc?.selfPayLow||0, apState) : proc?.selfPayHigh||0;
                const adjMed  = apState ? adjustedPrice(proc?.medicareAvg||0, apState) : proc?.medicareAvg||0;
                const tier    = apState ? (STATE_COST_TIER[apState]||'Average') : 'Average';
                const costIdx = apState ? (STATE_COST_INDEX[apState]??1.0) : 1.0;
                const allStates = Object.entries(STATE_COST_INDEX)
                  .map(([st,idx])=>({st, cost: Math.round((proc?.selfPayLow||100)*idx)}))
                  .sort((a,b)=>a.cost-b.cost);
                const cheapest = allStates.slice(0,5);
                const priciest = allStates.slice(-5).reverse();
                return <>
                  <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
                    <div style={{flex:2,minWidth:200}}>
                      <div style={{fontSize:9,color:'#3d5478',letterSpacing:'0.08em',marginBottom:4}}>PROCEDURE</div>
                      <select className="rp-select" style={{width:'100%',boxSizing:'border-box'}}
                        value={apProcedure} onChange={e=>setApProcedure(e.target.value)}>
                        {Object.entries(PROCEDURE_RATES).map(([k,v])=>(
                          <option key={k} value={k}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{flex:1,minWidth:70}}>
                      <div style={{fontSize:9,color:'#3d5478',letterSpacing:'0.08em',marginBottom:4}}>STATE</div>
                      <input className="rp-input" style={{width:'100%',boxSizing:'border-box'}}
                        placeholder="e.g. AL" value={apState}
                        onChange={e=>setApState(e.target.value.toUpperCase().slice(0,2))} />
                    </div>
                  </div>

                  {proc && <>
                    {/* Reference card */}
                    <div style={{background:'rgba(167,139,250,0.07)',border:'1px solid rgba(167,139,250,0.2)',borderRadius:8,padding:'14px',marginBottom:14}}>
                      <div style={{fontSize:9,color:'#a78bfa',letterSpacing:'0.1em',marginBottom:8}}>{proc.cpt} · {proc.description}</div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:8}}>
                        <div>
                          <div style={{fontSize:8,color:'#3d5478',marginBottom:3}}>MEDICARE ALLOWED</div>
                          <div style={{fontSize:16,fontWeight:700,color:'#67e8f9',fontFamily:"'IBM Plex Mono',monospace"}}>
                            {adjMed>0?`$${adjMed.toLocaleString()}`:'Not covered'}
                          </div>
                          {apState&&<div style={{fontSize:8,color:'#2a3f5e',marginTop:1}}>Adjusted for {apState}</div>}
                        </div>
                        <div>
                          <div style={{fontSize:8,color:'#3d5478',marginBottom:3}}>SELF-PAY LOW</div>
                          <div style={{fontSize:16,fontWeight:700,color:'#34d399',fontFamily:"'IBM Plex Mono',monospace"}}>
                            ${adjLow.toLocaleString()}
                          </div>
                          <div style={{fontSize:8,color:'#2a3f5e',marginTop:1}}>Cash / uninsured</div>
                        </div>
                        <div>
                          <div style={{fontSize:8,color:'#3d5478',marginBottom:3}}>SELF-PAY HIGH</div>
                          <div style={{fontSize:16,fontWeight:700,color:'#f97316',fontFamily:"'IBM Plex Mono',monospace"}}>
                            ${apState?adjustedPrice(proc.selfPayHigh,apState):proc.selfPayHigh}
                          </div>
                          <div style={{fontSize:8,color:'#2a3f5e',marginTop:1}}>Without negotiation</div>
                        </div>
                      </div>
                      {apState && <>
                        <div style={{fontSize:8,color:'#3d5478',marginBottom:4}}>GEOGRAPHIC COST TIER · {apState}</div>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <span style={{fontSize:11,fontWeight:700,color:tierColor(tier),fontFamily:"'IBM Plex Mono',monospace"}}>{tier}</span>
                          <div style={{flex:1,height:6,borderRadius:3,background:'rgba(20,50,100,0.5)',overflow:'hidden'}}>
                            <div style={{height:'100%',borderRadius:3,background:tierColor(tier),width:`${Math.min(100,Math.max(5,((costIdx-0.8)/0.6)*100))}%`,transition:'width 0.3s'}}/>
                          </div>
                          <span style={{fontSize:10,fontFamily:"'IBM Plex Mono',monospace",color:costIdx>1.05?'#f97316':costIdx<0.95?'#22c55e':'#67e8f9'}}>
                            {costIdx>=1?'+':''}{ ((costIdx-1)*100).toFixed(0)}%
                          </span>
                        </div>
                      </>}
                    </div>

                    {/* Cheapest / most expensive states comparison */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
                      <div>
                        <div style={{fontSize:9,color:'#3d5478',letterSpacing:'0.08em',marginBottom:6}}>💚 LOWEST COST STATES</div>
                        {cheapest.map((s,i)=>(
                          <div key={s.st} style={{display:'flex',alignItems:'center',gap:6,marginBottom:4,padding:'4px 8px',background:'rgba(34,197,94,0.06)',borderRadius:4,border:'1px solid rgba(34,197,94,0.15)'}}>
                            <span style={{fontSize:8,color:'#3d5478',fontFamily:"'IBM Plex Mono',monospace",width:14}}>{i+1}</span>
                            <span style={{fontSize:10,fontWeight:600,color:'#eef4ff',flex:1}}>{s.st}</span>
                            <span style={{fontSize:10,fontWeight:700,color:'#22c55e',fontFamily:"'IBM Plex Mono',monospace"}}>${s.cost}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div style={{fontSize:9,color:'#3d5478',letterSpacing:'0.08em',marginBottom:6}}>🔴 HIGHEST COST STATES</div>
                        {priciest.map((s,i)=>(
                          <div key={s.st} style={{display:'flex',alignItems:'center',gap:6,marginBottom:4,padding:'4px 8px',background:'rgba(239,68,68,0.06)',borderRadius:4,border:'1px solid rgba(239,68,68,0.15)'}}>
                            <span style={{fontSize:8,color:'#3d5478',fontFamily:"'IBM Plex Mono',monospace",width:14}}>{i+1}</span>
                            <span style={{fontSize:10,fontWeight:600,color:'#eef4ff',flex:1}}>{s.st}</span>
                            <span style={{fontSize:10,fontWeight:700,color:'#ef4444',fontFamily:"'IBM Plex Mono',monospace"}}>${s.cost}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{fontSize:8.5,color:'#2a3f5e',lineHeight:1.5,padding:'8px 10px',background:'rgba(10,24,48,0.4)',borderRadius:6}}>
                      Prices are estimates based on 2024 Medicare Physician Fee Schedule and CMS Geographic Practice Cost Index.
                      Self-pay rates vary by facility. Use ZocDoc, MDsave, or Sesame Care for actual quoted prices.
                    </div>
                  </>}
                </>;
              })()}

              {/* ── PRICE HUNT TAB ── */}
              {!pfLoading && pfTab==='priceHunt' && (
                <>
                  <div style={{fontSize:9,color:'#3d5478',letterSpacing:'0.08em',marginBottom:8}}>
                    PRICE HUNT RESULTS{pfLocation&&<> · <span style={{color:'#f97316'}}>{pfLocation.toUpperCase()}</span></>}
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,marginBottom:8}}>
                    <button
                      onClick={runAutomatedPriceHunt}
                      disabled={phLoading || !pfCity.trim()}
                      style={{fontSize:9,padding:'6px 10px',borderRadius:5,border:'1px solid rgba(249,115,22,0.4)',background:'rgba(249,115,22,0.14)',color:'#f97316',fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,cursor:'pointer',opacity:phLoading?0.6:1}}
                    >
                      {phLoading ? 'HUNTING…' : 'RUN AUTOMATED HUNT'}
                    </button>
                    <span style={{fontSize:9,color:'#fbbf24',fontFamily:"'IBM Plex Mono',monospace"}}>{phExtracted} extracted prices</span>
                  </div>
                  <div style={{fontSize:10,color:'#4a6080',lineHeight:1.6,marginBottom:10}}>
                    Focused on clinics likely to post self-pay or transparent pricing. Use <strong style={{color:'#fbbf24'}}>FIND PRICE</strong> to jump directly to web search pages.
                  </div>
                  {phDebug && (
                    <div style={{background:'rgba(56,189,248,0.06)',border:'1px solid rgba(56,189,248,0.18)',borderRadius:6,padding:'8px 10px',marginBottom:10,fontSize:8.5,color:'#8ecae6',fontFamily:"'IBM Plex Mono', monospace"}}>
                      serper={String(phDebug.apiKeys?.serper)} · tavily={String(phDebug.apiKeys?.tavily)} · gemini={String(phDebug.apiKeys?.gemini)} · clinics={phDebug.huntedClinicCount}
                    </div>
                  )}
                  {phResults.length>0 && (
                    <div style={{display:'grid',gap:6,marginBottom:10}}>
                      {phResults.map((r:any,idx:number)=>(
                        <div key={idx} style={{background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.22)',borderRadius:6,padding:'9px 10px'}}>
                          <div style={{fontSize:11,fontWeight:700,color:'#ffe5a6',marginBottom:5}}>{r.name}</div>
                          {(r.matches||[]).map((m:any,mi:number)=>(
                            <div key={mi} style={{marginBottom:6,padding:'6px',borderRadius:5,background:'rgba(7,20,42,0.5)',border:'1px solid rgba(251,191,36,0.18)'}}>
                              <div style={{ fontSize: 8, color: '#67e8f9', marginBottom: 5 }}>
                                <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ color: '#67e8f9' }}>{m.url}</a>
                              </div>
                              {m.isPdf && (
                                <div style={{ fontSize: 8.5, color: '#fbbf24', marginBottom: 4 }}>
                                  PDF found — likely pricing document or fee schedule
                                </div>
                              )}
                              {!m.isPdf && (!m.hits || m.hits.length === 0) && (
                                <div style={{ fontSize: 8.5, color: '#93c5fd', marginBottom: 4 }}>
                                  No extractable price text found yet{m.likelyTransparentSource ? ' (transparent pricing source)' : ''} — open link to verify posted prices.
                                </div>
                              )}
                              {(m.hits || []).map((hit:any,hi:number)=>(
                                <div key={hi} style={{ marginBottom: 6 }}>
                                  <div style={{fontSize:9,color:'#fbbf24',marginBottom:3,fontFamily:"'IBM Plex Mono',monospace"}}>{hit.value}</div>
                                  <div style={{fontSize:8.5,color:'#9bb7d8',lineHeight:1.5}}>{hit.context}</div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {pfClinics.slice(0,15).map((c,i)=>(
                      <div key={i} style={{background:'rgba(249,115,22,0.08)',border:'1px solid rgba(249,115,22,0.22)',borderRadius:6,padding:'9px 10px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center'}}>
                          <div>
                            <div style={{fontSize:11,fontWeight:700,color:'#ffd7bf'}}>{c.name}</div>
                            <div style={{fontSize:9,color:'#c58b73'}}>{c.taxonomy||'Provider'}</div>
                          </div>
                          <a href={c.searchUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:8,padding:'4px 8px',borderRadius:4,background:'rgba(249,115,22,0.14)',border:'1px solid rgba(249,115,22,0.3)',color:'#f97316',textDecoration:'none',fontFamily:"'IBM Plex Mono',monospace",fontWeight:700}}>
                            FIND PRICE ↗
                          </a>
                        </div>
                      </div>
                    ))}
                    {pfClinics.length===0 && <div style={{fontSize:10,color:'#4a6080'}}>Run a provider search first, then use Price Hunt.</div>}
                  </div>
                </>
              )}

              {/* ── OCC HUNT TAB ── */}
              {!pfLoading && pfTab==='occHunt' && (
                <>
                  <div style={{fontSize:9,color:'#3d5478',letterSpacing:'0.08em',marginBottom:8}}>
                    OCC-HEALTH PARTNER HUNT{pfLocation&&<> · <span style={{color:'#38bdf8'}}>{pfLocation.toUpperCase()}</span></>}
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,marginBottom:8}}>
                    <button
                      onClick={runAutomatedOccHunt}
                      disabled={ohLoading || !pfCity.trim()}
                      style={{fontSize:9,padding:'6px 10px',borderRadius:5,border:'1px solid rgba(56,189,248,0.35)',background:'rgba(56,189,248,0.12)',color:'#38bdf8',fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,cursor:'pointer',opacity:ohLoading?0.6:1}}
                    >
                      {ohLoading ? 'SCORING…' : 'RUN OCC PARTNER HUNT'}
                    </button>
                    <span style={{fontSize:9,color:'#67e8f9',fontFamily:"'IBM Plex Mono',monospace"}}>{ohResults.length} partners scored</span>
                  </div>
                  {ohResults.length>0 && (
                    <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:10}}>
                      {ohResults.slice(0,15).map((c:any,i:number)=>(
                        <div key={i} style={{background:'rgba(56,189,248,0.08)',border:'1px solid rgba(56,189,248,0.22)',borderRadius:6,padding:'9px 10px'}}>
                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                            <div>
                              <div style={{fontSize:11,fontWeight:700,color:'#c9eeff'}}>{c.name}</div>
                              <div style={{fontSize:9,color:'#6fa7c8'}}>{c.taxonomy||'Provider'}</div>
                            </div>
                            <div style={{fontSize:8,fontFamily:"'IBM Plex Mono',monospace",padding:'2px 7px',borderRadius:999,border:'1px solid rgba(56,189,248,0.35)',color:'#38bdf8'}}>
                              FIT {c.score}/10
                            </div>
                          </div>
                          {Array.isArray(c.reasons) && c.reasons.length>0 && (
                            <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:6}}>
                              {c.reasons.slice(0,3).map((r:string,ri:number)=>(
                                <span key={ri} style={{fontSize:8,padding:'1px 6px',borderRadius:999,border:'1px solid rgba(103,232,249,0.25)',background:'rgba(103,232,249,0.08)',color:'#8ce6ff'}}>
                                  {r}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {pfClinics
                      .map(c=>({c,score:occHealthScore(c)}))
                      .sort((a,b)=>b.score-a.score)
                      .slice(0,20)
                      .map(({c,score},i)=>(
                        <div key={i} style={{background:'rgba(56,189,248,0.08)',border:'1px solid rgba(56,189,248,0.22)',borderRadius:6,padding:'9px 10px'}}>
                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                            <div>
                              <div style={{fontSize:11,fontWeight:700,color:'#c9eeff'}}>{c.name}</div>
                              <div style={{fontSize:9,color:'#6fa7c8'}}>{c.taxonomy||'Provider'}</div>
                            </div>
                            <div style={{fontSize:8,fontFamily:"'IBM Plex Mono',monospace",padding:'2px 7px',borderRadius:999,border:'1px solid rgba(56,189,248,0.35)',color:'#38bdf8'}}>
                              FIT {score}/10
                            </div>
                          </div>
                        </div>
                      ))}
                    {pfClinics.length===0 && <div style={{fontSize:10,color:'#4a6080'}}>Run a provider search first, then use OCC Hunt scoring.</div>}
                  </div>
                </>
              )}

              {/* ── REPORT A PRICE TAB ── */}
              {!pfLoading && pfTab==='report' && (
                <>
                  <div style={{background:'rgba(10,24,48,0.5)',border:'1px solid rgba(251,191,36,0.2)',borderRadius:8,padding:'14px',marginBottom:16}}>
                    <div style={{fontSize:9,color:'#fbbf24',letterSpacing:'0.08em',marginBottom:10}}>⭐ SUBMIT A PRICE YOU FOUND</div>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
                      <div style={{flex:2,minWidth:160}}>
                        <div style={{fontSize:8,color:'#3d5478',marginBottom:3}}>PROVIDER NAME</div>
                        <input className="rp-input" style={{width:'100%',boxSizing:'border-box'}}
                          placeholder="e.g. Concentra Urgent Care" value={pfReportProvider}
                          onChange={e=>setPfReportProvider(e.target.value)} />
                      </div>
                      <div style={{flex:1,minWidth:100}}>
                        <div style={{fontSize:8,color:'#3d5478',marginBottom:3}}>PRICE PAID</div>
                        <input className="rp-input" style={{width:'100%',boxSizing:'border-box'}}
                          placeholder="e.g. $95" value={pfReportPrice}
                          onChange={e=>setPfReportPrice(e.target.value)} />
                      </div>
                      <div style={{display:'flex',alignItems:'flex-end'}}>
                        <button className="rp-assess-btn"
                          style={{padding:'8px 14px',background:'rgba(251,191,36,0.12)',borderColor:'rgba(251,191,36,0.3)',color:'#fbbf24'}}
                          onClick={pfAddReport} disabled={!pfReportProvider.trim()||!pfReportPrice.trim()}>
                          + ADD
                        </button>
                      </div>
                    </div>
                    <div style={{fontSize:8.5,color:'#2a3f5e',lineHeight:1.5}}>
                      Service: <span style={{color:'#67e8f9'}}>{PF_SERVICE_LABELS[pfServiceType]}</span>
                      {pfLocation && <> · <span style={{color:'#67e8f9'}}>{pfLocation}</span></>}
                      {' · '}Saved to your browser — use Share to send to colleagues
                    </div>
                  </div>

                  {pfReports.length===0 ? (
                    <div style={{textAlign:'center',padding:'20px 0',color:'#2a3f5e',fontSize:10,lineHeight:1.7}}>
                      No prices reported yet.<br/>
                      Search for a provider above, then click <strong style={{color:'#fbbf24'}}>REPORT PRICE</strong> on any result,<br/>or fill in the form manually.
                    </div>
                  ) : (
                    <>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                        <div style={{fontSize:9,color:'#3d5478',letterSpacing:'0.08em'}}>{pfReports.length} PRICE REPORTS</div>
                        <button onClick={pfShareReports} style={{
                          fontSize:8,fontFamily:"'IBM Plex Mono',monospace",padding:'4px 10px',
                          background:'rgba(6,182,212,0.08)',border:'1px solid rgba(6,182,212,0.25)',
                          borderRadius:3,color:pfShareCopied?'#34d399':'#06b6d4',cursor:'pointer',
                        }}>
                          {pfShareCopied ? '✓ LINK COPIED' : '🔗 SHARE REPORTS'}
                        </button>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:5}}>
                        {pfReports.map((r,i)=>(
                          <div key={i} style={{background:'rgba(6,10,24,0.5)',border:'1px solid rgba(20,40,80,0.6)',borderRadius:6,padding:'8px 12px',display:'flex',gap:10,alignItems:'center'}}>
                            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:14,fontWeight:700,color:'#34d399',minWidth:70}}>{r.price}</div>
                            <div style={{flex:1}}>
                              <div style={{fontSize:10,fontWeight:600,color:'#eef4ff'}}>{r.provider}</div>
                              <div style={{fontSize:8.5,color:'#3d5478',fontFamily:"'IBM Plex Mono',monospace"}}>{r.service} · {r.city} · {r.date}</div>
                            </div>
                            <button onClick={()=>{const n=pfReports.filter((_,j)=>j!==i);setPfReports(n);localStorage.setItem('occumed_price_reports',JSON.stringify(n));}}
                              style={{background:'transparent',border:'1px solid rgba(255,255,255,0.06)',borderRadius:3,color:'#3d5478',fontSize:9,padding:'2px 7px',cursor:'pointer'}}>✕</button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── MY CLINICS / UPLOAD MODAL ── */}
      {showUploadModal && (
        <div className="modal-backdrop open" onClick={()=>setShowUploadModal(false)}>
          <div className="modal-box" style={{width:680,maxHeight:'85vh',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title" style={{color:'#f472b6'}}>📤 MY CLINICS</span>
              <button className="modal-close" onClick={()=>setShowUploadModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>

              {/* Upload section */}
              <div style={{background:'rgba(244,114,182,0.06)',border:'1px solid rgba(244,114,182,0.2)',borderRadius:8,padding:'14px',marginBottom:16}}>
                <div style={{fontSize:9,color:'#f472b6',letterSpacing:'0.08em',marginBottom:8}}>UPLOAD SPREADSHEET</div>
                <p style={{fontSize:10,color:'#4a6888',lineHeight:1.6,marginBottom:10}}>
                  Upload an Excel (.xlsx) or CSV file with your clinic locations. Columns detected automatically.
                  Supported: <span style={{color:'#c8ddf0'}}>Name, Address, City, State, Zip, Phone, Notes, Lat, Lng</span>.
                  Addresses without coordinates will be geocoded automatically.
                </p>
                <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',marginBottom:8}}>
                  <div>
                    <div style={{fontSize:8,color:'#3d5478',marginBottom:3}}>PIN COLOR</div>
                    <input type="color" value={uploadColor} onChange={e=>setUploadColor(e.target.value)}
                      style={{width:40,height:32,border:'1px solid rgba(244,114,182,0.3)',borderRadius:4,background:'transparent',cursor:'pointer',padding:2}} />
                  </div>
                  <button className="rp-assess-btn"
                    style={{padding:'8px 18px',background:'rgba(244,114,182,0.12)',borderColor:'rgba(244,114,182,0.3)',color:'#f472b6',opacity:uploadLoading?0.6:1}}
                    disabled={uploadLoading}
                    onClick={()=>clinicFileInputRef.current?.click()}>
                    {uploadLoading ? '⏳ PROCESSING...' : '📁 CHOOSE FILE (.xlsx / .csv)'}
                  </button>
                  <input ref={clinicFileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}}
                    onChange={handleClinicUpload} />
                </div>
                {uploadProgress && (
                  <div style={{fontSize:9,color:uploadProgress.startsWith('✓')?'#34d399':uploadProgress.startsWith('Error')?'#fca5a5':'#67e8f9',fontFamily:"'IBM Plex Mono',monospace",lineHeight:1.5}}>
                    {uploadProgress}
                  </div>
                )}
              </div>

              {/* Controls */}
              {uploadedClinics.length>0 && (
                <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:12,flexWrap:'wrap'}}>
                  <div style={{fontSize:9,color:'#f472b6',letterSpacing:'0.08em',flex:1}}>
                    {uploadedClinics.filter(c=>c.lat!==null).length} / {uploadedClinics.length} CLINICS MAPPED
                  </div>
                  <label style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer',fontSize:9,color:'#3d5478'}}>
                    <input type="checkbox" checked={showUploadedClinics} onChange={e=>setShowUploadedClinics(e.target.checked)}/>
                    Show on map
                  </label>
                  <button onClick={()=>{setUploadedClinics([]);localStorage.removeItem('uploaded_clinics');setUploadProgress('');}}
                    style={{fontSize:8,fontFamily:"'IBM Plex Mono',monospace",padding:'3px 8px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:3,color:'#fca5a5',cursor:'pointer'}}>
                    CLEAR ALL
                  </button>
                </div>
              )}

              {/* Clinic list */}
              {uploadedClinics.length===0 ? (
                <div style={{textAlign:'center',padding:'24px 0',color:'#2a3f5e',fontSize:10,lineHeight:1.8}}>
                  <div style={{fontSize:28,marginBottom:10}}>📍</div>
                  No clinics uploaded yet.<br/>
                  Upload a spreadsheet to see glowing pins on the map.
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:5}}>
                  {uploadedClinics.map((c,i)=>(
                    <div key={i} style={{background:'rgba(6,10,24,0.5)',border:`1px solid ${c.lat!==null?'rgba(244,114,182,0.2)':'rgba(30,50,80,0.5)'}`,borderRadius:6,padding:'8px 12px',display:'flex',gap:10,alignItems:'center'}}>
                      <div style={{width:10,height:10,borderRadius:'50%',background:c.color||uploadColor,boxShadow:`0 0 6px ${c.color||uploadColor}`,flexShrink:0}} />
                      <div style={{flex:1}}>
                        <div style={{fontSize:10,fontWeight:600,color:'#eef4ff'}}>{c.name}</div>
                        <div style={{fontSize:8.5,color:'#3d5478',fontFamily:"'IBM Plex Mono',monospace"}}>
                          {[c.address,c.city,c.state,c.zip].filter(Boolean).join(', ')||'No address'}
                          {c.lat!==null?<span style={{color:'#34d399',marginLeft:6}}>✓ {c.lat?.toFixed(3)},{c.lng?.toFixed(3)}</span>:<span style={{color:'#f97316',marginLeft:6}}>⚠ Not geocoded</span>}
                        </div>
                      </div>
                      <button onClick={()=>{const n=uploadedClinics.filter((_,j)=>j!==i);setUploadedClinics(n);localStorage.setItem('uploaded_clinics',JSON.stringify(n));}}
                        style={{background:'transparent',border:'1px solid rgba(255,255,255,0.06)',borderRadius:3,color:'#3d5478',fontSize:9,padding:'2px 7px',cursor:'pointer',flexShrink:0}}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── COMPARE MODAL ── */}
      <div className={`modal-backdrop${showCompare?' open':''}`} onClick={()=>setShowCompare(false)}>
        <div className="modal-box" style={{width:Math.min(900,pinnedCities.length*160+200)}} onClick={e=>e.stopPropagation()}>
          <div className="modal-header">
            <span className="modal-title">⊞ CITY COMPARISON</span>
            <span style={{fontSize:10,color:'#3d5478',marginLeft:10}}>{pinnedCities.length} of 5 cities pinned</span>
            <button className="modal-close" onClick={()=>setShowCompare(false)}>✕</button>
          </div>
          <div className="modal-body">
            {pinnedCities.length===0?(
              <div style={{textAlign:'center',padding:'30px 20px',fontSize:11,color:'#3d5478'}}>No cities pinned yet. Look up a city and click <strong style={{color:'#a78bfa'}}>+ PIN TO COMPARE</strong>.</div>
            ):(
              <>
                <div style={{marginBottom:10}}>
                  {pinnedCities.map((p,i)=>(
                    <div key={i} className="cmp-pin-slot">
                      <div className="cmp-pin-dot" style={{background:DCOL[getVal(p,metric)]}}/>
                      <span className="cmp-pin-name">{p[0]}, {p[1]}</span>
                      <span style={{fontSize:9,color:DCOL[getVal(p,metric)],fontFamily:'IBM Plex Mono,monospace'}}>{DLBL[getVal(p,metric)]}</span>
                      <button className="cmp-pin-rm" onClick={()=>setPinnedCities(prev=>prev.filter((_,j)=>j!==i))}>✕</button>
                    </div>
                  ))}
                </div>
                <div className="cmp-scroll">
                  <table className="cmp-table">
                    <thead><tr>
                      <th className="metric-label">METRIC</th>
                      {pinnedCities.map((p,i)=>{
                        const v=getVal(p,metric);
                        const dt=i>0?calcDrive(pinnedCities[0][2],pinnedCities[0][3],p[2],p[3]):null;
                        return <th key={i} style={{textAlign:'center',minWidth:140}}>
                          <div style={{fontSize:12,fontWeight:700,color:'#eef4ff'}}>{p[0]}</div>
                          <div style={{fontSize:9,color:'#3d5478',fontFamily:'IBM Plex Mono,monospace',marginTop:2}}>{p[1]} · {p[4]===1?'Major':p[4]===2?'Mid-Size':'Small'}</div>
                          <div style={{display:'inline-block',padding:'2px 6px',borderRadius:2,fontSize:8.5,fontWeight:700,fontFamily:'IBM Plex Mono,monospace',marginTop:4,background:`${DCOL[v]}22`,color:DCOL[v],border:`1px solid ${DCOL[v]}44`}}>{DLBL[v]}</div>
                          {dt&&<div style={{fontSize:9,color:'#34d399',marginTop:4,fontFamily:'IBM Plex Mono,monospace'}}>🚗 {dt.timeStr} · {dt.miles}mi</div>}
                          <div style={{fontSize:9,color:'#3d5478',marginTop:3}}>{p[16]} prov/100k · ~{p[17]}d</div>
                          <button onClick={()=>setPinnedCities(prev=>prev.filter((_,j)=>j!==i))} style={{marginTop:5,padding:'2px 8px',background:'transparent',border:'1px solid rgba(255,255,255,0.08)',color:'#3d5478',borderRadius:2,fontSize:8.5,cursor:'pointer',fontFamily:'IBM Plex Mono,monospace'}}>remove</button>
                        </th>;
                      })}
                    </tr></thead>
                    <tbody>
                      <tr>
                        <td className="metric-label" style={{fontWeight:700,color:'#67e8f9',borderTop:'1px solid rgba(6,182,212,0.2)'}}>Providers in 70mi</td>
                        {pinnedCities.map((p,i)=>{
                          const d=countProvidersInRadius(p[2],p[3],metric);
                          return <td key={i} style={{textAlign:'center',borderTop:'1px solid rgba(6,182,212,0.2)'}}>
                            <div style={{fontFamily:'IBM Plex Mono,monospace',fontSize:14,fontWeight:700,color:'#67e8f9'}}>{d.estProviders}</div>
                            <div style={{fontSize:8.5,color:'#3d5478'}}>{d.citiesInRadius} cities in zone</div>
                          </td>;
                        })}
                      </tr>
                      {ALL_METRICS.map(m=>(
                        <tr key={m}>
                          <td className="metric-label" style={{color:m===metric?'#93c5fd':'',fontWeight:m===metric?700:400}}>{m===metric?'▶ ':''}{MLBL[m]}</td>
                          {pinnedCities.map((p,i)=>{
                            const v=getVal(p,m);
                            return <td key={i} style={{textAlign:'center'}}>
                              <span className="cmp-score" style={{background:`${DCOL[v]}18`,color:DCOL[v],border:`1px solid ${DCOL[v]}33`}}>{DLBL[v]} <span style={{opacity:0.6}}>{v}/5</span></span>
                            </td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{marginTop:12,fontSize:9.5,color:'#3d5478',lineHeight:1.6}}>Drive times are estimates (~55mph avg). Provider counts estimated from HRSA density data within the 70mi radius.</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── PDF MODAL ── */}
      {showPdf&&(
        <div className="pdf-modal-wrap" onClick={()=>setShowPdf(false)}>
          <div className="pdf-toolbar" onClick={e=>e.stopPropagation()}>
            <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:'#3b82f6',letterSpacing:3,textTransform:'uppercase'}}>◈ Report Preview</span>
            <div style={{display:'flex',gap:10}}>
              <button style={{padding:'7px 18px',borderRadius:3,fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fontWeight:700,cursor:'pointer',letterSpacing:1.5,textTransform:'uppercase',border:'1px solid rgba(6,182,212,0.4)',background:'rgba(6,182,212,0.15)',color:'#67e8f9'}} onClick={()=>{const b=new Blob([pdfHtml],{type:'text/html'});const u=URL.createObjectURL(b);window.open(u,'_blank');}}>↗ OPEN IN NEW TAB</button>
              <button style={{padding:'7px 18px',borderRadius:3,fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fontWeight:700,cursor:'pointer',letterSpacing:1.5,textTransform:'uppercase',border:'1px solid rgba(59,130,246,0.4)',background:'rgba(59,130,246,0.15)',color:'#93c5fd'}} onClick={()=>{const b=new Blob([pdfHtml],{type:'text/html'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=pdfDlName;document.body.appendChild(a);a.click();setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(u);},1000);}}>↓ DOWNLOAD HTML</button>
              <button style={{padding:'7px 14px',background:'transparent',color:'#4a6888',border:'1px solid rgba(255,255,255,0.08)',borderRadius:3,fontFamily:"'IBM Plex Mono',monospace",fontSize:9,cursor:'pointer'}} onClick={()=>setShowPdf(false)}>✕ Close</button>
            </div>
          </div>
          <div className="pdf-tip" onClick={e=>e.stopPropagation()}><strong style={{color:'#93c5fd'}}>To save as PDF:</strong> Click "Open in New Tab" → then Ctrl+P / ⌘+P → Save as PDF. Or use "Download HTML" to save the file.</div>
          <div style={{flex:1,display:'flex',justifyContent:'center',padding:'0 0 40px',width:'100%'}} onClick={e=>e.stopPropagation()}>
            <iframe style={{width:860,maxWidth:'96vw',minHeight:'85vh',border:'none',borderRadius:4,background:'white',boxShadow:'0 4px 40px rgba(0,0,0,0.6)'}} srcDoc={pdfHtml}/>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────
function ScoreCard({scores}:{scores:{key:string;v:number;hl:boolean}[]}) {
  return (
    <div className="rp-scorecard">
      {scores.map(s=>(
        <div key={s.key} className="rp-score-row" style={s.hl?{background:'rgba(59,130,246,0.06)',padding:'2px 4px',borderRadius:4}:{}}>
          <span className="rp-score-icon">{MICONS[s.key]}</span>
          <span className="rp-score-name" style={s.hl?{color:'#cdd9f0',fontWeight:600}:{}}>{MLBL[s.key]}</span>
          <div className="rp-score-bar"><div className="rp-score-fill" style={{width:`${s.v*20}%`,background:DCOL[s.v]}}/></div>
          <span className="rp-score-val" style={{color:DCOL[s.v]}}>{DLBL[s.v]}</span>
        </div>
      ))}
    </div>
  );
}

function GeoScoreCard({lat,lng,examKey}:{lat:number;lng:number;examKey:string}) {
  return (
    <div className="rp-scorecard">
      {ALL_METRICS.map(m=>{
        const v=estimateDifficultyFromNeighbors(lat,lng,m);
        return (
          <div key={m} className="rp-score-row">
            <span className="rp-score-icon">{MICONS[m]}</span>
            <span className="rp-score-name">{MLBL[m]}</span>
            <div className="rp-score-bar"><div className="rp-score-fill" style={{width:`${v*20}%`,background:DCOL[v]}}/></div>
            <span className="rp-score-val" style={{color:DCOL[v]}}>{DLBL[v]}</span>
          </div>
        );
      })}
    </div>
  );
}

function ProviderBox({data,examKey,cityName,locIdx,onPin}:{data:any;examKey:string;cityName:string;locIdx:number;onPin:(i:number)=>void}) {
  const [pinned,setPinned]=useState(false);
  const hasPin=locIdx>=0;
  return (
    <div className="prov-box">
      <div className="prov-stat"><div className="prov-stat-v">{data.estProviders}</div><div className="prov-stat-l">Est. {MLBL[examKey]} Providers<br/><span style={{fontSize:8.5}}>within 70mi</span></div></div>
      <div className="prov-stat"><div className="prov-stat-v">{data.citiesInRadius}</div><div className="prov-stat-l">Cities / Markets<br/><span style={{fontSize:8.5}}>in coverage zone</span></div></div>
      <div className="prov-stat"><div className="prov-stat-v" style={{color:DCOL[Math.round(parseFloat(data.avgDifficulty))||3]}}>{data.avgDifficulty}</div><div className="prov-stat-l">Avg Difficulty</div></div>
      {hasPin&&(
        <button className="prov-pin-btn" style={pinned?{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.3)',color:'#10b981'}:{background:'rgba(167,139,250,0.1)',border:'1px solid rgba(167,139,250,0.25)',color:'#a78bfa'}} onClick={()=>{if(!pinned){onPin(locIdx);setPinned(true);}}}>{pinned?'✓ PINNED':'+ PIN TO COMPARE'}</button>
      )}
    </div>
  );
}

function DriveTimeBox({fromLat,fromLng,fromName,locB}:{fromLat:number;fromLng:number;fromName:string;locB:{name:string;lat:number;lng:number}|null}) {
  const [dest,setDest]=useState('');
  const [result,setResult]=useState<{timeStr:string;miles:number;hours:number;name:string}|null>(null);
  const [destB]=useState(locB);
  const dt=destB?calcDrive(fromLat,fromLng,destB.lat,destB.lng):null;
  const urgency=dt?(dt.hours<1?'#10b981':dt.hours<2.5?'#84cc16':dt.hours<4?'#f59e0b':'#f97316'):null;

  function calc() {
    const q=dest.trim().toLowerCase().replace(/,.*$/,'').trim();
    const match=LOCS.find(l=>l[0].toLowerCase()===q)||LOCS.find(l=>l[0].toLowerCase().startsWith(q))||LOCS.find(l=>l[0].toLowerCase().includes(q));
    if(!match){return;}
    const d=calcDrive(fromLat,fromLng,match[2],match[3]);
    setResult({...d,name:`${match[0]}, ${match[1]}`});
  }

  return (
    <div className="drivetime-box">
      <div className="drivetime-lbl">🚗 DRIVE TIME FROM HERE</div>
      {dt&&destB&&(
        <div style={{marginBottom:8}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
            <span style={{fontSize:10,color:'#3d5478'}}>{fromName}</span>
            <span style={{color:'#3d5478'}}>→</span>
            <span style={{fontSize:10,color:'#7aabda',fontWeight:600}}>{destB.name}</span>
          </div>
          <div style={{display:'flex',gap:18,marginBottom:6}}>
            <div><div className="drivetime-val" style={{color:urgency||'#eef4ff'}}>{dt.timeStr}</div><div className="drivetime-sub">est. drive time</div></div>
            <div><div className="drivetime-val">{dt.miles} mi</div><div className="drivetime-sub">straight-line</div></div>
          </div>
        </div>
      )}
      {result&&(
        <div style={{marginBottom:8}}>
          <div style={{fontSize:10,color:'#7aabda',marginBottom:4}}>{fromName} → {result.name}</div>
          <div style={{display:'flex',gap:18}}>
            <div><div className="drivetime-val" style={{color:result.hours<1?'#10b981':result.hours<2.5?'#84cc16':result.hours<4?'#f59e0b':'#f97316'}}>{result.timeStr}</div><div className="drivetime-sub">est. drive time</div></div>
            <div><div className="drivetime-val">{result.miles} mi</div><div className="drivetime-sub">straight-line</div></div>
          </div>
        </div>
      )}
      <div style={{fontSize:8.5,color:'#3d5478',marginBottom:4}}>Based on ~55mph avg. Actual time may vary.</div>
      <input className="drivetime-input" placeholder="Destination city, e.g. Dallas TX" value={dest} onChange={e=>setDest(e.target.value)} onKeyDown={e=>e.key==='Enter'&&calc()}/>
      <button className="drivetime-btn" onClick={calc}>CALCULATE DRIVE TIME</button>
    </div>
  );
}

function NearestEasier({items,onFly}:{items:any[];onFly:(lat:number,lng:number,name:string,state:string,score:number,examKey:string)=>void}) {
  return (
    <div style={{marginTop:10}}>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8.5,color:'#3d5478',letterSpacing:1.5,marginBottom:7}}>NEAREST EASIER CITIES</div>
      {items.map((r,i)=>{
        const col=DCOL[r.v];
        const tierIcon=r.tier===1?'◉':r.tier===2?'◎':'○';
        return (
          <div key={i} className="nearer-row" onClick={()=>onFly(r.lat,r.lng,r.name,r.state,r.v,'primaryCare')}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:12,fontWeight:600,color:'#cdd9f0'}}>{r.name}, {r.state}</span>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:'rgba(99,179,237,0.7)'}}>{r.dist} mi</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginTop:3}}>
              <span style={{fontSize:9,color:'#3d5478'}}>{tierIcon} {r.tier===1?'Major Metro':r.tier===2?'Mid-Size':'Small City'}</span>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:col,fontWeight:600}}>{DLBL[r.v]}</span>
            </div>
          </div>
        );
      })}
      <div style={{fontSize:9,color:'#3d5478',marginTop:4,textAlign:'center'}}>Click any city to fly to it on the map</div>
    </div>
  );
}
