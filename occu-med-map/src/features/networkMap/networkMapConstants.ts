import { DCOL, DLBL, MICONS, MLBL, ALL_METRICS, getVal } from '../../lib/data';
import { STATE_COST_INDEX, STATE_COST_TIER, tierColor } from '../../lib/procedurePrices';

export const FIPS2CODE: Record<string,string> = {
  "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT","10":"DE",
  "11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL","18":"IN","19":"IA",
  "20":"KS","21":"KY","22":"LA","23":"ME","24":"MD","25":"MA","26":"MI","27":"MN",
  "28":"MS","29":"MO","30":"MT","31":"NE","32":"NV","33":"NH","34":"NJ","35":"NM",
  "36":"NY","37":"NC","38":"ND","39":"OH","40":"OK","41":"OR","42":"PA","44":"RI",
  "45":"SC","46":"SD","47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA",
  "54":"WV","55":"WI","56":"WY"
};

export const NAME2CODE: Record<string,string> = {
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

export const STATE_TZ: Record<string,number> = {
  ME:0,NH:0,VT:0,MA:0,RI:0,CT:0,NY:0,NJ:0,PA:0,DE:0,MD:0,VA:0,WV:0,NC:0,SC:0,GA:0,FL:0,
  OH:0,MI:0,IN:0,KY:0,TN:0,MS:1,WI:1,IL:1,MN:1,IA:1,MO:1,AR:1,LA:1,TX:1,OK:1,KS:1,NE:1,
  SD:1,ND:1,AL:1,MT:2,WY:2,CO:2,NM:2,ID:2,UT:2,AZ:2,NV:3,CA:3,OR:3,WA:3,AK:4,HI:5
};

export const TZ_INFO = [
  {color:'#7c3aed',abbr:'ET',name:'Eastern',utc:'UTC-5/-4',labelLat:38.5,labelLng:-79.5},
  {color:'#1d4ed8',abbr:'CT',name:'Central',utc:'UTC-6/-5',labelLat:38.5,labelLng:-92.0},
  {color:'#0891b2',abbr:'MT',name:'Mountain',utc:'UTC-7/-6',labelLat:40.5,labelLng:-110.5},
  {color:'#c7c000',abbr:'PT',name:'Pacific',utc:'UTC-8/-7',labelLat:40.5,labelLng:-121.5},
  {color:'#be185d',abbr:'AK',name:'Alaska',utc:'UTC-9/-8',labelLat:64.0,labelLng:-153.0},
  {color:'#0f766e',abbr:'HI',name:'Hawaii',utc:'UTC-10',labelLat:20.5,labelLng:-157.3}
];

export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
  'https://corsproxy.io/?https://overpass-api.de/api/interpreter',
  'https://corsproxy.io/?https://overpass.kumi.systems/api/interpreter'
];

export const RADIUS_COLORS = ['#f43f5e','#f97316','#facc15','#22c55e','#06b6d4','#3b82f6','#a855f7','#ec4899'];

export const CATS: Record<string,{ico:string;col:string;lbl:string}> = {
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

export const PROVIDER_DIRS = [
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

export const REQUIRED_NETWORK_CATS = ['mammogram','dotchiro','dotmd','faa','physical','urgent','lab','drugscreen','dentist','stress','audiology'] as const;

export { DCOL, DLBL, MICONS, MLBL, ALL_METRICS, getVal, STATE_COST_INDEX, STATE_COST_TIER, tierColor };
