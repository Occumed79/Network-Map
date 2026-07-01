import { Router } from "express";
import { searchNpi as searchNpiCentral } from "../providerSources/adapters/npi";
import { upsertProvider } from "../providerSources/persistence";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";

const router = Router();

// Taxonomy codes/descriptions by service type
const TAXONOMY_MAP: Record<string, string[]> = {
  urgentCare:    ['Urgent Care', 'Clinic/Center, Urgent Care', 'Walk-in Clinic'],
  dental:        ['Dentist', 'Dentist General Practice', 'Oral & Maxillofacial Surgery', 'Orthodontics', 'Pediatric Dentistry'],
  pharmacy:      ['Pharmacy', 'Pharmacist'],
  physicalExam:  ['Preventive Medicine', 'Occupational Medicine', 'Family Medicine', 'Internal Medicine'],
  faamedical:    ['Aviation Medicine', 'Occupational Medicine', 'Aerospace Medicine'],
  stressTest:    ['Cardiology', 'Cardiovascular Disease', 'Clinical Cardiac Electrophysiology'],
  mammogram:     ['Radiology', 'Diagnostic Radiology', 'Breast Imaging'],
  dotExam:       ['Occupational Medicine', 'Occupational Therapy'],
  vaccinations:  ['Immunization', 'Public Health & General Preventive Medicine', 'Family Medicine'],
  fqhc:          ['Federally Qualified Health Center'],
};

// Search query override — used to improve NPI hits for specialty types
const SEARCH_LABEL: Record<string, string> = {
  urgentCare:   'urgent care clinic',
  dental:       'dental',
  pharmacy:     'pharmacy',
  physicalExam: 'physical exam / preventive medicine',
  faamedical:   'FAA aviation medical examiner',
  stressTest:   'cardiology / stress test',
  mammogram:    'mammogram / radiology',
  dotExam:      'DOT physical exam / occupational medicine',
  vaccinations: 'vaccination / immunization clinic',
};

const PRICE_DOMAINS: Record<string, string[]> = {
  urgentCare: ["site:sesamecare.com", "site:solvhealth.com", "site:cvs.com", "site:concentra.com", "site:mdsave.com"],
  dental: ["site:opencare.com", "site:1800dentist.com", "site:affordablecare.com", "site:dentalplans.com"],
  physicalExam: ["site:sesamecare.com", "site:concentra.com", "site:cvs.com", "site:mdsave.com"],
  stressTest: ["site:mdsave.com", "site:newchoicehealth.com", "site:healthcarebluebook.com", "site:fairhealthconsumer.org"],
  mammogram: ["site:mdsave.com", "site:newchoicehealth.com", "site:healthcarebluebook.com"],
  dotExam: ["site:concentra.com", "site:carenow.com", "site:ohshealth.com", "site:sesamecare.com"],
  vaccinations: ["site:cvs.com", "site:walgreens.com", "site:costco.com", "site:vaccines.gov"],
  pharmacy: ["site:goodrx.com", "site:rxsaver.com", "site:costplusdrugs.com", "site:blinkhealth.com"],
  faamedical: ["site:aopa.org", "site:aeromd.com", "site:mdsave.com", "site:sesamecare.com"],
};

const OCC_HUNT_TAXONOMIES = [
  "Occupational Medicine",
  "Preventive Medicine",
  "Family Medicine",
  "Internal Medicine",
  "Chiropractor",
  "Urgent Care",
];

// Known transparent-pricing clinic networks by type
const TRANSPARENT_NETWORKS: Record<string, Array<{name:string;desc:string;url:string;tag:string}>> = {
  urgentCare: [
    { name:'Sesame Care', desc:'Transparent cash-pay urgent care & primary care. Prices listed upfront.', url:'https://sesamecare.com/urgent-care', tag:'CASH PAY' },
    { name:'GoodRx Care', desc:'Online urgent care with upfront pricing, starting at $20.', url:'https://www.goodrx.com/care/urgent-care', tag:'ONLINE' },
    { name:'MinuteClinic (CVS)', desc:'Walk-in urgent care — prices posted online before your visit.', url:'https://www.cvs.com/minuteclinic/visit-types-and-costs', tag:'TRANSPARENT' },
    { name:'Mira Health', desc:'Low flat-fee urgent care membership — $45/mo includes visits & labs.', url:'https://www.talkmira.com/', tag:'FLAT FEE' },
    { name:'MDsave', desc:'Prepay for urgent care at listed prices and save up to 60%.', url:'https://www.mdsave.com/', tag:'PREPAY' },
    { name:'Solv Health', desc:'Book urgent care online — many locations list wait times and prices.', url:'https://www.solvhealth.com/', tag:'BOOKING' },
  ],
  dental: [
    { name:'Affordable Care', desc:'600+ dental practices with transparent fee schedules.', url:'https://www.affordablecare.com/', tag:'FEE SCHEDULE' },
    { name:'SmileDirectClub', desc:'Orthodontic care with published pricing starting at $1,950.', url:'https://smiledirectclub.com/', tag:'TRANSPARENT' },
    { name:'1-800-Dentist', desc:'Find local dentists and compare prices in your area.', url:'https://www.1800dentist.com/', tag:'COMPARE' },
    { name:'Open Care', desc:'Compares dental practices by price, insurance, and location.', url:'https://www.opencare.com/', tag:'COMPARE' },
    { name:'Dental Plans', desc:'Discount dental plans with listed savings on procedures.', url:'https://www.dentalplans.com/', tag:'DISCOUNT' },
    { name:'CostHelper Health', desc:'Real user-reported dental costs with ranges for common procedures.', url:'https://health.costhelper.com/dentist.html', tag:'COST GUIDE' },
  ],
  pharmacy: [
    { name:'GoodRx', desc:'Compare prescription prices at pharmacies near you.', url:'https://www.goodrx.com/', tag:'FREE COUPONS' },
    { name:'RxSaver', desc:'Compare pharmacy prices and print discount coupons.', url:'https://www.rxsaver.com/', tag:'COMPARE' },
    { name:'Mark Cuban Cost Plus Drugs', desc:'Transparent drug pricing — 1,000+ medications at cost + 15%.', url:'https://costplusdrugs.com/', tag:'COST + 15%' },
    { name:'Blink Health', desc:'Prepay for prescriptions online and pick up at local pharmacies.', url:'https://www.blinkhealth.com/', tag:'PREPAY' },
  ],
  physicalExam: [
    { name:'Sesame Care – Physical Exams', desc:'Book a physical exam with upfront transparent pricing.', url:'https://sesamecare.com/physical-exam', tag:'CASH PAY' },
    { name:'MDsave – Physicals', desc:'Pre-purchase physical exam packages at listed prices.', url:'https://www.mdsave.com/', tag:'PREPAY' },
    { name:'Concentra', desc:'Occupational health physicals with pricing available by location.', url:'https://www.concentra.com/', tag:'OCC HEALTH' },
    { name:'MinuteClinic – Annual Physical', desc:'CVS walk-in physical exams with published visit costs.', url:'https://www.cvs.com/minuteclinic/services/preventive-care/physical-exams', tag:'WALK-IN' },
    { name:'LabCorp OnDemand', desc:'Wellness panels and physical exam lab work at transparent prices.', url:'https://www.labcorp.com/labs-and-appointments', tag:'LAB WORK' },
    { name:'FAIR Health Consumer', desc:'Look up fair prices for physical exam codes in your zip code.', url:'https://fairhealthconsumer.org/', tag:'PRICE GUIDE' },
  ],
  faamedical: [
    { name:'FAA AME Locator', desc:'Official FAA tool to find certified Aviation Medical Examiners near you.', url:'https://designee.faa.gov/designeeLocator', tag:'OFFICIAL FAA' },
    { name:'AOPA Medical Certification', desc:'AOPA guide to FAA medical exams with typical cost ranges.', url:'https://www.aopa.org/go-fly/medical-resources/a-guide-to-faa-medical-certification', tag:'COST GUIDE' },
    { name:'FAA Medical FAQ', desc:'FAA official guidance on Class 1, 2, and 3 medical exam requirements.', url:'https://www.faa.gov/pilots/medical_certification', tag:'REQUIREMENTS' },
    { name:'Sesame Care – Aviation Medical', desc:'Find AMEs who list transparent pricing on Sesame platform.', url:'https://sesamecare.com/', tag:'TRANSPARENT' },
    { name:'MDsave – Aviation Medical', desc:'Pre-purchase FAA medical exam packages where available.', url:'https://www.mdsave.com/', tag:'PREPAY' },
    { name:'AeroMD', desc:'Specialized FAA medical exam service with upfront online booking.', url:'https://aeromd.com/', tag:'SPECIALIST' },
  ],
  stressTest: [
    { name:'MDsave – Stress Test', desc:'Pre-purchase treadmill stress test at listed prices, up to 60% off.', url:'https://www.mdsave.com/procedures/stress-test', tag:'PREPAY' },
    { name:'Healthcare Bluebook – Stress Test', desc:'Find fair prices for exercise stress tests in your area.', url:'https://www.healthcarebluebook.com/', tag:'FAIR PRICE' },
    { name:'FAIR Health – Cardiology', desc:'Estimate out-of-pocket costs for cardiac stress testing.', url:'https://fairhealthconsumer.org/', tag:'ESTIMATOR' },
    { name:'Sesame Care – Cardiology', desc:'Book cardiology consultations with upfront transparent pricing.', url:'https://sesamecare.com/', tag:'CASH PAY' },
    { name:'New Choice Health', desc:'Compare stress test prices at facilities near you.', url:'https://www.newchoicehealth.com/', tag:'COMPARE' },
    { name:'Amino Health', desc:'Find cardiologists by price and patient outcomes.', url:'https://amino.com/', tag:'OUTCOMES' },
  ],
  mammogram: [
    { name:'MDsave – Mammogram', desc:'Pre-purchase screening mammograms at listed prices, typically $80–$250.', url:'https://www.mdsave.com/procedures/mammogram', tag:'PREPAY' },
    { name:'New Choice Health – Mammogram', desc:'Compare mammogram prices at imaging centers near you.', url:'https://www.newchoicehealth.com/mammogram', tag:'COMPARE' },
    { name:'Healthcare Bluebook', desc:'Fair price benchmark for screening and diagnostic mammograms.', url:'https://www.healthcarebluebook.com/', tag:'FAIR PRICE' },
    { name:'Susan G. Komen – Free Screening', desc:'Connects uninsured/underinsured women to free or low-cost mammograms.', url:'https://www.komen.org/breast-health/screening/mammograms/free-low-cost-mammograms/', tag:'FREE/LOW COST' },
    { name:'CDC NBCCEDP', desc:'National Breast and Cervical Cancer Early Detection Program — free mammograms for qualifying women.', url:'https://www.cdc.gov/cancer/nbccedp/', tag:'FREE PROGRAM' },
    { name:'Sesame Care – Imaging', desc:'Book imaging services with transparent upfront pricing.', url:'https://sesamecare.com/', tag:'CASH PAY' },
  ],
  dotExam: [
    { name:'Concentra – DOT Physicals', desc:'DOT physical exams at 500+ locations. Prices typically $75–$150.', url:'https://www.concentra.com/occupational-health/dot-physicals/', tag:'CHAIN PRICING' },
    { name:'CareNow – DOT Physicals', desc:'Urgent care chain offering DOT exams with online check-in.', url:'https://www.carenow.com/services/dot-physical/', tag:'WALK-IN' },
    { name:'FMCSA Medical Examiner Locator', desc:'Official FMCSA tool to find certified DOT medical examiners near you.', url:'https://ai.fmcsa.dot.gov/mcs150/commonMESearchForm.aspx', tag:'OFFICIAL FMCSA' },
    { name:'OHS Health', desc:'Occupational health clinics specializing in DOT exams with listed fees.', url:'https://ohshealth.com/', tag:'TRANSPARENT' },
    { name:'Sesame Care – DOT Physical', desc:'Find DOT examiners with upfront transparent pricing.', url:'https://sesamecare.com/', tag:'CASH PAY' },
    { name:'MDsave – DOT Physical', desc:'Pre-purchase DOT exam packages at listed prices.', url:'https://www.mdsave.com/', tag:'PREPAY' },
  ],
  vaccinations: [
    { name:'VaccineFinder (CDC)', desc:'Official CDC tool to find COVID, flu, and other vaccines near you — many free.', url:'https://vaccinefinder.org/', tag:'FREE / CDC' },
    { name:'CVS Pharmacy – Vaccines', desc:'Walk-in vaccinations with prices listed online. Many covered by insurance.', url:'https://www.cvs.com/immunizations/in-store-immunizations', tag:'PRICE LIST' },
    { name:'Walgreens – Vaccines', desc:'Walk-in vaccine clinic with published vaccine prices by type.', url:'https://www.walgreens.com/topic/pharmacy/walgreens-immunization-services.jsp', tag:'PRICE LIST' },
    { name:'Costco Pharmacy – Vaccines', desc:'Low-cost vaccines at Costco pharmacies — prices posted in-store and online.', url:'https://www.costco.com/pharmacy-immunizations.html', tag:'LOW COST' },
    { name:'Sesame Care – Vaccinations', desc:'Book vaccinations with upfront transparent pricing.', url:'https://sesamecare.com/', tag:'CASH PAY' },
    { name:'Vaccines.gov', desc:'Find flu shots, travel vaccines, and immunization clinics near you.', url:'https://www.vaccines.gov/', tag:'LOCATOR' },
  ],
};

// Pricing resource guides
const PRICING_RESOURCES = [
  { name:'Healthcare Bluebook', desc:'Fair price range for medical procedures in your area.', url:'https://www.healthcarebluebook.com/', tag:'FAIR PRICE' },
  { name:'FAIR Health Consumer', desc:'Estimate out-of-pocket costs for medical and dental care.', url:'https://fairhealthconsumer.org/', tag:'ESTIMATOR' },
  { name:'ClearHealthCosts', desc:'Crowdsourced prices for medical procedures. Find what others paid.', url:'https://clearhealthcosts.com/', tag:'CROWDSOURCED' },
];

interface NpiResult {
  basic: Record<string, string>;
  addresses: Array<Record<string, string>>;
  taxonomies: Array<{code: string; desc: string; primary: boolean}>;
}

interface PriceHit {
  value: string;
  context: string;
}

async function serperSearch(query: string, limit = 5): Promise<string[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return [];
  try {
    const resp = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
      },
      body: JSON.stringify({ q: query, num: limit }),
      signal: AbortSignal.timeout(9000),
    });
    if (!resp.ok) return [];
    const data = (await resp.json()) as { organic?: Array<{ link?: string }> };
    return (data.organic || []).map((r) => r.link || "").filter((u) => /^https?:\/\//.test(u)).slice(0, limit);
  } catch {
    return [];
  }
}

async function tavilySearch(query: string, limit = 5): Promise<string[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  try {
    const resp = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query,
        max_results: limit,
        search_depth: "basic",
        include_raw_content: false,
      }),
      signal: AbortSignal.timeout(9000),
    });
    if (!resp.ok) return [];
    const data = (await resp.json()) as { results?: Array<{ url?: string }> };
    return (data.results || []).map((r) => r.url || "").filter((u) => /^https?:\/\//.test(u)).slice(0, limit);
  } catch {
    return [];
  }
}

async function geminiExpandQuery(query: string): Promise<string[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return [query];
  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Return JSON only: {"queries":["q1","q2","q3"]}. Rewrite this clinic price-hunt search query into up to 3 concise web-search queries focused on posted self-pay prices: ${query}`,
          }],
        }],
      }),
      signal: AbortSignal.timeout(9000),
    });
    if (!resp.ok) return [query];
    const data = (await resp.json()) as any;
    const txt: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "";
    const jsonStart = txt.indexOf("{");
    const jsonEnd = txt.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd <= jsonStart) return [query];
    const parsed = JSON.parse(txt.slice(jsonStart, jsonEnd + 1)) as { queries?: string[] };
    const queries = (parsed.queries || []).map((q) => String(q || "").trim()).filter(Boolean);
    return queries.length ? queries.slice(0, 3) : [query];
  } catch {
    return [query];
  }
}

async function duckSearch(query: string, limit = 5): Promise<string[]> {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const resp = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; OccuMedBot/1.0)" },
    signal: AbortSignal.timeout(9000),
  });
  if (!resp.ok) return [];
  const html = await resp.text();
  const urls = new Set<string>();
  const re = /uddg=([^"&]+)|href="(https?:\/\/[^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && urls.size < limit) {
    const raw = m[1] ? decodeURIComponent(m[1]) : m[2];
    if (!raw) continue;
    if (!/^https?:\/\//i.test(raw)) continue;
    if (raw.includes("duckduckgo.com")) continue;
    urls.add(raw);
  }
  return [...urls];
}

async function smartSearch(query: string, limit = 8): Promise<string[]> {
  const queries = await geminiExpandQuery(query);
  const out: string[] = [];

  for (const q of queries) {
    const buckets = await Promise.all([
      serperSearch(q, limit).catch(() => []),
      tavilySearch(q, limit).catch(() => []),
      duckSearch(q, limit).catch(() => []),
    ]);
    for (const urls of buckets) {
      for (const url of urls) {
        const clean = url.split("#")[0];
        if (!out.includes(clean)) out.push(clean);
        if (out.length >= limit) return out.slice(0, limit);
      }
    }
  }

  return out.slice(0, limit);
}

function extractPriceHitsFromHtml(html: string): PriceHit[] {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
  const patterns = [
    /\$\s?\d{1,4}(?:,\d{3})*(?:\.\d{2})?\s?(?:-|to)\s?\$?\s?\d{1,4}(?:,\d{3})*(?:\.\d{2})?/gi,
    /(?:starting at|from|cash(?: price)?|self[- ]pay|self pay|fee(?: schedule)?|visit cost|price)[^$]{0,40}\$\s?\d{1,4}(?:,\d{3})*(?:\.\d{2})?/gi,
    /\$\s?\d{1,4}(?:,\d{3})*(?:\.\d{2})?/g,
  ];
  const strongSignals = ["price", "cost", "cash", "self-pay", "self pay", "starting at", "from", "fee", "visit", "uninsured"];
  const hits: PriceHit[] = [];
  const seen = new Set<string>();

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(cleaned))) {
      const start = Math.max(0, match.index - 90);
      const end = Math.min(cleaned.length, match.index + 140);
      const snippet = cleaned.slice(start, end).trim();
      const lc = snippet.toLowerCase();
      if (!strongSignals.some((s) => lc.includes(s))) continue;
      const value = match[0].replace(/\s+/g, " ").trim();
      const dedupeKey = `${value}|${snippet.slice(0, 80)}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      hits.push({ value, context: snippet.slice(0, 220) });
      if (hits.length >= 8) return hits;
    }
  }
  return hits;
}

type HuntFetchResult = {
  url: string;
  hits: PriceHit[];
  contentType?: string;
  isPdf?: boolean;
  blocked?: boolean;
  likelyTransparentSource?: boolean;
};

const TRANSPARENT_PRICE_HOSTS = [
  "mdsave.com",
  "newchoicehealth.com",
  "healthcarebluebook.com",
  "fairhealthconsumer.org",
  "sesamecare.com",
  "solvhealth.com",
  "goodrx.com",
  "rxsaver.com",
  "costplusdrugs.com",
  "blinkhealth.com",
  "cvs.com",
  "walgreens.com",
  "concentra.com",
];

function isTransparentPriceHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return TRANSPARENT_PRICE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

function buildPriceQueries(clinicName: string, city: string, state: string, serviceType: string): string[] {
  const base = `${clinicName} ${city} ${state}`.trim();
  const domains = PRICE_DOMAINS[serviceType] || [];
  return [
    `${base} self pay price`,
    `${base} cash price`,
    `${base} fee schedule`,
    `${base} visit cost`,
    `${base} price pdf`,
    `${base} uninsured price`,
    ...domains.map((d) => `${base} ${d}`),
  ];
}

async function fetchPriceSignals(url: string): Promise<HuntFetchResult> {
  const likelyTransparentSource = isTransparentPriceHost(url);
  try {
    const resp = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; OccuMedBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    const contentType = resp.headers.get("content-type") || "";
    if (!resp.ok) return { url, hits: [], contentType, blocked: true, likelyTransparentSource };
    if (contentType.includes("pdf") || /\.pdf(\?|$)/i.test(url)) {
      return { url, hits: [], contentType, isPdf: true, likelyTransparentSource };
    }
    if (!contentType.includes("text/html")) return { url, hits: [], contentType, likelyTransparentSource };
    const html = await resp.text();
    return { url, hits: extractPriceHitsFromHtml(html).slice(0, 5), contentType, likelyTransparentSource };
  } catch {
    return { url, hits: [], blocked: true, likelyTransparentSource };
  }
}

async function huntPrices(queries: string[]): Promise<HuntFetchResult[]> {
  const urlSet = new Set<string>();
  for (const q of queries) {
    const urls = await smartSearch(q, 6);
    for (const url of urls) {
      urlSet.add(url);
      if (urlSet.size >= 15) break;
    }
    if (urlSet.size >= 15) break;
  }
  const rows = await Promise.all([...urlSet].map((url) => fetchPriceSignals(url)));
  const ranked = rows
    .filter((r) => !r.blocked)
    .sort((a, b) => {
      const score = (r: HuntFetchResult) =>
        (r.hits.length > 0 ? 3 : 0) + (r.isPdf ? 2 : 0) + (r.likelyTransparentSource ? 1 : 0);
      return score(b) - score(a);
    });

  // Return best candidates even when parsing misses explicit prices so users can still click through.
  return ranked.slice(0, 8);
}

/**
 * Uses the central NPI adapter and converts results to the local format.
 * This removes the duplicate NPI API call — all NPI queries go through
 * api-server/src/providerSources/adapters/npi.ts
 */
async function fetchNpiClinics(city: string, state: string, serviceType: string) {
  const candidates = await searchNpiCentral(city, state, serviceType);

  // Upsert into Neon (non-blocking)
  if (isPersistenceConfigured()) {
    for (const c of candidates) {
      try { await upsertProvider(c, serviceType); } catch { /* ignore */ }
    }
  }

  return candidates.map((c) => formatCandidate(c));
}

function formatCandidate(c: { name: string; address: string; phone: string; taxonomy?: string; npi?: string; sourceUrl?: string }) {
  const taxonomy = c.taxonomy || '';
  const isFqhc = taxonomy.toLowerCase().includes('federally qualified') ||
    taxonomy.toLowerCase().includes('fqhc');

  return {
    name: c.name || 'Unknown',
    address: c.address,
    phone: c.phone,
    taxonomy,
    isFqhc,
    npiUrl: c.sourceUrl || `https://npiregistry.cms.hhs.gov/provider-view/${c.npi || ''}`,
    searchUrl: `https://www.google.com/search?q=${encodeURIComponent(c.name + ' ' + c.address + ' pricing cost')}`,
  };
}

function occHuntScore(c: ReturnType<typeof formatCandidate>) {
  const txt = `${c.name} ${c.taxonomy}`.toLowerCase();
  let score = 0;
  const reasons: string[] = [];
  if (txt.includes("occupational")) { score += 5; reasons.push("Occupational taxonomy"); }
  if (txt.includes("urgent")) { score += 2; reasons.push("Urgent care capability"); }
  if (txt.includes("family medicine") || txt.includes("internal medicine")) { score += 1; reasons.push("Primary care compatible"); }
  if (txt.includes("chiropr")) { score += 2; reasons.push("DOT/chiro potential"); }
  if (txt.includes("aerospace") || txt.includes("aviation")) { score += 2; reasons.push("FAA potential"); }
  if (c.isFqhc) { score += 1; reasons.push("FQHC / sliding scale"); }
  return { score: Math.min(score, 10), reasons };
}

router.get('/price-finder', async (req, res) => {
  try {
    const city = String(req.query.city || '').trim();
    const state = String(req.query.state || '').trim();
    const serviceType = String(req.query.serviceType || 'urgentCare');

    if (!city) {
      res.status(400).json({ error: 'city is required' });
      return;
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('NPI Registry timeout')), 15000)
    );

    const [mainClinics, fqhcClinics] = await Promise.all([
      Promise.race([fetchNpiClinics(city, state, serviceType), timeoutPromise]).catch(() => []),
      Promise.race([fetchNpiClinics(city, state, "fqhc"), timeoutPromise]).catch(() => []),
    ]);

    // Deduplicate by name
    const seen = new Set<string>();
    const clinics: ReturnType<typeof formatCandidate>[] = [];
    for (const c of [...fqhcClinics, ...mainClinics]) {
      const key = c.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        clinics.push(c);
      }
    }

    // FQHCs come first (they're required to post sliding scale fees)
    clinics.sort((a, b) => (b.isFqhc ? 1 : 0) - (a.isFqhc ? 1 : 0));

    const networks = TRANSPARENT_NETWORKS[serviceType] || TRANSPARENT_NETWORKS.urgentCare;

    res.json({
      location: `${city}${state ? ', ' + state.toUpperCase() : ''}`,
      serviceType,
      clinicCount: clinics.length,
      clinics: clinics.slice(0, 20),
      networks,
      pricingResources: PRICING_RESOURCES,
    });
  } catch (err) {
    console.error('price-finder error', err);
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

router.get('/price-hunt', async (req, res) => {
  try {
    const city = String(req.query.city || '').trim();
    const state = String(req.query.state || '').trim();
    const serviceType = String(req.query.serviceType || 'urgentCare');
    if (!city) {
      res.status(400).json({ error: 'city is required' });
      return;
    }

    // Use central NPI adapter for Price Hunt provider discovery
    const allClinics = await fetchNpiClinics(city, state, serviceType).catch((): ReturnType<typeof formatCandidate>[] => []);
    const seen = new Set<string>();
    const clinics = allClinics
      .filter((c) => {
        const k = c.name.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 15);

    const hunted = (await Promise.all(
      clinics.map(async (c) => {
        const queries = buildPriceQueries(c.name, city, state, serviceType);
        const matches = await huntPrices(queries);
        return {
          ...c,
          queries,
          matches,
          hitCount: matches.reduce((n, m) => n + m.hits.length, 0),
        };
      }),
    )).slice(0, 8);

    res.json({
      location: `${city}${state ? ', ' + state.toUpperCase() : ''}`,
      serviceType,
      clinicCount: hunted.length,
      results: hunted,
      extracted: hunted.reduce((n, c) => n + c.matches.reduce((a, m) => a + m.hits.length, 0), 0),
      pricingResources: PRICING_RESOURCES,
      debug: {
        apiKeys: {
          serper: Boolean(process.env.SERPER_API_KEY),
          tavily: Boolean(process.env.TAVILY_API_KEY),
          gemini: Boolean(process.env.GEMINI_API_KEY),
        },
        huntedClinicCount: clinics.length,
      },
    });
  } catch (err) {
    console.error('price-hunt error', err);
    res.status(500).json({ error: 'Price hunt failed. Please try again.' });
  }
});

router.get('/occ-hunt', async (req, res) => {
  try {
    const city = String(req.query.city || '').trim();
    const state = String(req.query.state || '').trim();
    if (!city) {
      res.status(400).json({ error: 'city is required' });
      return;
    }

    // Use central NPI adapter for Occ Hunt
    const allClinics = await fetchNpiClinics(city, state, "occupational").catch((): ReturnType<typeof formatCandidate>[] => []);
    const seen = new Set<string>();
    const ranked = allClinics
      .filter((c) => {
        const k = c.name.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .map((c) => ({ ...c, ...occHuntScore(c) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 25);

    res.json({
      location: `${city}${state ? ', ' + state.toUpperCase() : ''}`,
      count: ranked.length,
      partners: ranked,
    });
  } catch (err) {
    console.error('occ-hunt error', err);
    res.status(500).json({ error: 'OCC hunt failed. Please try again.' });
  }
});

export default router;
