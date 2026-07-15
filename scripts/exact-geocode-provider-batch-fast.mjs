#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, '').split('=');
  return [key, rest.join('=') || 'true'];
}));

const inputPath = path.resolve(args.input);
const outputPrefix = path.resolve(args.outputPrefix);
const concurrency = Math.max(1, Math.min(6, Number(args.concurrency || 3)));
const ARCGIS_URL = 'https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates';
const USER_AGENT = 'Occu-Med-Network-Map/1.0 (strict-exact-provider-geocoding; https://github.com/Occumed79/Network-Map)';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalize(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(rruga|rr\.?|rue|road|rd\.?|street|st\.?|avenue|ave\.?|boulevard|blvd\.?|chemin|route|strasse|straße|via|calle|carrera|ulica|ul\.?|prospekt)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePostal(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function exactTextMatch(left, right) {
  const a = normalize(left);
  const b = normalize(right);
  return Boolean(a && b && a === b);
}

function extractHouseNumber(address) {
  const value = String(address || '');
  const labeled = value.match(/\b(?:nr\.?|no\.?|number|#)\s*([0-9]+[a-zA-Z]?(?:[-/]\d+[a-zA-Z]?)?)/i);
  if (labeled) return labeled[1].toUpperCase().replace(/\s+/g, '');
  const leading = value.match(/^\s*([0-9]+[a-zA-Z]?(?:[-/]\d+[a-zA-Z]?)?)\s+[A-Za-zÀ-ž]/u);
  return leading ? leading[1].toUpperCase().replace(/\s+/g, '') : '';
}

function expectedStreetTokens(source) {
  const sourceNormalized = normalize(source.address);
  return sourceNormalized.split(' ').filter((token) => token.length >= 3 && !/^\d+$/.test(token));
}

function streetMatchesSource(source, attributes) {
  const returnedStreet = normalize(attributes.StName || attributes.StAddr || attributes.Address || '');
  if (!returnedStreet) return false;
  const sourceText = normalize(source.address);
  if (sourceText.includes(returnedStreet)) return true;
  const returnedTokens = returnedStreet.split(' ').filter((token) => token.length >= 3);
  if (!returnedTokens.length) return false;
  const sourceTokens = new Set(expectedStreetTokens(source));
  return returnedTokens.every((token) => sourceTokens.has(token));
}

function countryMatches(source, attributes) {
  const iso2 = String(source.countryCode || '').toUpperCase();
  const returnedCodes = [attributes.CountryCode, attributes.Country, attributes.CntryCode]
    .filter(Boolean)
    .map((value) => String(value).toUpperCase());
  if (returnedCodes.includes(iso2)) return true;
  const returnedName = attributes.CntryName || attributes.CountryName || '';
  return exactTextMatch(source.country, returnedName);
}

function cityMatches(source, attributes) {
  if (!source.city) return true;
  const expected = normalize(source.city);
  return [attributes.City, attributes.District, attributes.Subregion]
    .filter(Boolean)
    .some((value) => normalize(value) === expected);
}

function stateMatches(source, attributes) {
  if (!source.state) return true;
  const expected = normalize(source.state);
  return [attributes.Region, attributes.RegionAbbr, attributes.Subregion]
    .filter(Boolean)
    .some((value) => normalize(value) === expected);
}

function postalMatches(source, attributes) {
  if (!source.postalCode) return true;
  const expected = normalizePostal(source.postalCode);
  const returned = normalizePostal(attributes.Postal || attributes.PostalExt);
  return Boolean(returned && returned === expected);
}

function evaluateCandidate(source, candidate) {
  const attributes = candidate.attributes || {};
  const reasons = [];
  const score = Number(candidate.score);
  const addressType = String(attributes.Addr_type || '').toLowerCase();
  const exactTypes = new Set(['poi', 'pointaddress', 'subaddress']);

  if (score !== 100) reasons.push('score_not_100');
  if (!exactTypes.has(addressType)) reasons.push('not_poi_rooftop_or_subaddress');
  if (!countryMatches(source, attributes)) reasons.push('country_not_exact');
  if (!cityMatches(source, attributes)) reasons.push('city_not_exact');
  if (!stateMatches(source, attributes)) reasons.push('state_not_exact');
  if (!postalMatches(source, attributes)) reasons.push('postal_code_not_exact');

  const sourceHouse = extractHouseNumber(source.address);
  const returnedHouse = String(attributes.AddNum || '').toUpperCase().replace(/\s+/g, '');
  const returnedName = attributes.PlaceName || attributes.POIName || attributes.ShortLabel || attributes.Match_addr?.split(',')[0] || '';
  const exactName = exactTextMatch(source.name, returnedName);

  if (sourceHouse) {
    if (!returnedHouse || returnedHouse !== sourceHouse) reasons.push('house_number_not_exact');
    if (!streetMatchesSource(source, attributes)) reasons.push('street_not_exact');
  } else {
    if (addressType !== 'poi') reasons.push('no_house_number_requires_exact_poi');
    if (!exactName) reasons.push('facility_name_not_exact');
  }

  const lat = Number(candidate.location?.y);
  const lng = Number(candidate.location?.x);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) reasons.push('invalid_coordinates');

  return {
    accepted: reasons.length === 0,
    reasons,
    lat,
    lng,
    score,
    addressType,
    sourceHouse,
    returnedHouse,
    exactName,
    matchBasis: sourceHouse
      ? 'arcgis_score_100_exact_house_street_city_country'
      : 'arcgis_score_100_exact_poi_name_city_country',
  };
}

async function searchArcgis(query, countryCode) {
  const url = new URL(ARCGIS_URL);
  url.searchParams.set('SingleLine', query);
  url.searchParams.set('f', 'json');
  url.searchParams.set('outFields', '*');
  url.searchParams.set('maxLocations', '10');
  url.searchParams.set('forStorage', 'false');
  url.searchParams.set('matchOutOfRange', 'false');
  if (countryCode) url.searchParams.set('sourceCountry', countryCode);

  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
        signal: controller.signal,
      });
      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number(response.headers.get('retry-after') || 0);
        await sleep(Math.max(retryAfter * 1000, attempt * 2500));
        continue;
      }
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const payload = await response.json();
      if (payload.error) throw new Error(payload.error.message || 'ArcGIS geocoder error');
      return Array.isArray(payload.candidates) ? payload.candidates : [];
    } catch (error) {
      lastError = error;
      if (attempt < 5) await sleep(attempt * 2000);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error('ArcGIS request failed');
}

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rowsToCsv(rows, columns) {
  return [columns.join(','), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(','))].join('\n') + '\n';
}

async function processSource(source, index, total) {
  const queries = [
    [source.name, source.geocodeQuery || source.address].filter(Boolean).join(', '),
    source.geocodeQuery || source.address,
  ].filter((value, position, values) => value && values.indexOf(value) === position);

  const attempts = [];
  let best = null;
  let requestError = '';

  for (const query of queries) {
    try {
      const candidates = await searchArcgis(query, source.countryCode);
      const evaluated = candidates.map((candidate) => ({ candidate, evaluation: evaluateCandidate(source, candidate) }));
      attempts.push({
        provider: 'ArcGIS World Geocoding Service',
        query,
        resultCount: candidates.length,
        evaluated: evaluated.map(({ candidate, evaluation }) => ({
          displayName: candidate.attributes?.LongLabel || candidate.attributes?.Match_addr || candidate.address,
          score: candidate.score,
          addressType: candidate.attributes?.Addr_type,
          accepted: evaluation.accepted,
          reasons: evaluation.reasons,
        })),
      });
      const accepted = evaluated.find(({ evaluation }) => evaluation.accepted);
      if (accepted) {
        best = { query, ...accepted };
        break;
      }
    } catch (error) {
      requestError = String(error?.message || error);
      attempts.push({ provider: 'ArcGIS World Geocoding Service', query, error: requestError });
    }
  }

  console.log(`[${index + 1}/${total}] ${source.name}: ${best ? 'EXACT MATCH' : 'UNRESOLVED'}`);
  return { source, best, attempts, requestError, checkedAt: new Date().toISOString() };
}

const inputText = await fs.readFile(inputPath, 'utf8');
const sources = inputText.split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
const results = new Array(sources.length);
let cursor = 0;

async function worker() {
  while (true) {
    const index = cursor;
    cursor += 1;
    if (index >= sources.length) return;
    results[index] = await processSource(sources[index], index, sources.length);
    await sleep(75);
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

const accepted = [];
const unresolved = [];
const audit = [];

for (const result of results) {
  const { source, best, attempts, requestError, checkedAt } = result;
  if (best) {
    const candidate = best.candidate;
    const evaluation = best.evaluation;
    const attributes = candidate.attributes || {};
    const enriched = {
      ...source,
      lat: evaluation.lat,
      lng: evaluation.lng,
      geocodeStatus: 'exact_match',
      matchBasis: evaluation.matchBasis,
      matchedQuery: best.query,
      matchedDisplayName: attributes.LongLabel || attributes.Match_addr || candidate.address,
      geocoder: 'ArcGIS World Geocoding Service',
      geocoderScore: evaluation.score,
      geocoderAddressType: evaluation.addressType,
      geocodedAt: checkedAt,
    };
    accepted.push(enriched);
  } else {
    const rejectionReasons = [...new Set(attempts.flatMap((attempt) =>
      Array.isArray(attempt.evaluated) ? attempt.evaluated.flatMap((item) => item.reasons || []) : [],
    ))];
    unresolved.push({
      sourceRecordId: source.sourceRecordId,
      name: source.name,
      address: source.address,
      city: source.city,
      state: source.state,
      postalCode: source.postalCode,
      country: source.country,
      countryCode: source.countryCode,
      geocodeStatus: requestError ? 'request_error' : 'unresolved_no_exact_match',
      rejectionReasons: rejectionReasons.join('; '),
      requestError,
      geocoder: 'ArcGIS World Geocoding Service',
      checkedAt,
    });
  }
  audit.push({ sourceRecordId: source.sourceRecordId, source, accepted: Boolean(best), attempts, checkedAt });
}

await fs.mkdir(path.dirname(outputPrefix), { recursive: true });
const acceptedCsvColumns = [
  'sourceRecordId', 'name', 'address', 'city', 'state', 'postalCode', 'country', 'countryCode',
  'lat', 'lng', 'geocodeStatus', 'matchBasis', 'matchedQuery', 'matchedDisplayName',
  'geocoder', 'geocoderScore', 'geocoderAddressType', 'geocodedAt',
];
const unresolvedCsvColumns = [
  'sourceRecordId', 'name', 'address', 'city', 'state', 'postalCode', 'country', 'countryCode',
  'geocodeStatus', 'rejectionReasons', 'requestError', 'geocoder', 'checkedAt',
];

await fs.writeFile(`${outputPrefix}-geocoded.csv`, rowsToCsv(accepted, acceptedCsvColumns), 'utf8');
await fs.writeFile(`${outputPrefix}-geocoded.jsonl`, accepted.map((row) => JSON.stringify(row)).join('\n') + (accepted.length ? '\n' : ''), 'utf8');
await fs.writeFile(`${outputPrefix}-unresolved.csv`, rowsToCsv(unresolved, unresolvedCsvColumns), 'utf8');
await fs.writeFile(`${outputPrefix}-audit.jsonl`, audit.map((row) => JSON.stringify(row)).join('\n') + '\n', 'utf8');
await fs.writeFile(`${outputPrefix}-summary.json`, JSON.stringify({
  input: sources.length,
  exactMatches: accepted.length,
  unresolved: unresolved.length,
  requestErrors: unresolved.filter((row) => row.geocodeStatus === 'request_error').length,
  geocoder: 'ArcGIS World Geocoding Service',
  strictRules: [
    'score_100_only',
    'poi_pointaddress_subaddress_only',
    'exact_country',
    'exact_city_when_present',
    'exact_state_when_present',
    'exact_postal_when_present',
    'exact_house_and_street_or_exact_poi_name',
    'no_centroids',
  ],
}, null, 2) + '\n', 'utf8');

console.log(JSON.stringify({ input: sources.length, exactMatches: accepted.length, unresolved: unresolved.length }, null, 2));
