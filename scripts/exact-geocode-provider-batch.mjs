#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    return [key, rest.join('=') || 'true'];
  }),
);

const inputPath = path.resolve(args.input || 'data/geocoding/provider-import-batch-001.jsonl');
const outputPath = path.resolve(args.output || 'data/geocoding/results/provider-geocoded-batch-001.csv');
const unresolvedPath = path.resolve(args.unresolved || 'data/geocoding/results/provider-unresolved-batch-001.csv');
const auditPath = path.resolve(args.audit || 'data/geocoding/results/provider-geocode-audit-batch-001.jsonl');
const delayMs = Math.max(1100, Number(args.delayMs || 1250));
const limit = Math.max(1, Number(args.limit || 10));

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const ARCGIS_URL = 'https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates';
const USER_AGENT = 'Occu-Med-Network-Map/1.0 (exact-provider-geocoding; https://github.com/Occumed79/Network-Map)';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalize(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(rruga|rr\.?|rue|road|rd\.?|street|st\.?|avenue|ave\.?|boulevard|blvd\.?|chemin|route)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePostal(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function exactTextMatch(a, b) {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return false;
  return left === right || (left.length >= 8 && right.length >= 8 && (left.includes(right) || right.includes(left)));
}

function extractExplicitHouseNumber(address) {
  const value = String(address || '');
  const labeled = value.match(/\b(?:nr\.?|no\.?|number|#)\s*([0-9]+[a-zA-Z]?(?:[-/]\d+[a-zA-Z]?)?)/i);
  if (labeled) return labeled[1].toUpperCase();
  const leading = value.match(/^\s*([0-9]+[a-zA-Z]?(?:[-/]\d+[a-zA-Z]?)?)\s+[A-Za-zÀ-ž]/u);
  return leading ? leading[1].toUpperCase() : '';
}

function cityCandidates(address = {}) {
  return [
    address.city,
    address.town,
    address.village,
    address.municipality,
    address.city_district,
    address.county,
    address.state_district,
  ].filter(Boolean);
}

function isExactLocationType(result) {
  const cls = String(result.class || '').toLowerCase();
  const type = String(result.type || '').toLowerCase();
  const addresstype = String(result.addresstype || '').toLowerCase();

  const forbidden = new Set([
    'country', 'state', 'region', 'province', 'county', 'municipality',
    'city', 'town', 'village', 'hamlet', 'suburb', 'neighbourhood',
    'postcode', 'administrative', 'boundary', 'island', 'continent',
  ]);
  if (forbidden.has(type) || forbidden.has(addresstype)) return false;
  if (cls === 'boundary') return false;

  const exactClasses = new Set(['amenity', 'healthcare', 'building', 'office', 'shop', 'place']);
  const exactTypes = new Set([
    'house', 'building', 'clinic', 'hospital', 'doctors', 'doctor', 'dentist',
    'laboratory', 'medical_lab', 'pharmacy', 'healthcare', 'medical_centre',
    'medical_center', 'yes', 'commercial', 'office', 'company',
  ]);
  return exactClasses.has(cls) && (exactTypes.has(type) || addresstype === 'amenity' || addresstype === 'building' || addresstype === 'house');
}

function evaluateCandidate(source, result) {
  const address = result.address || {};
  const reasons = [];
  const countryCode = String(address.country_code || '').toUpperCase();
  const expectedCountry = String(source.countryCode || '').toUpperCase();

  if (!isExactLocationType(result)) reasons.push('result_is_not_a_building_address_or_named_facility');
  if (!countryCode || countryCode !== expectedCountry) reasons.push('country_code_mismatch');

  if (source.city) {
    const sourceCity = normalize(source.city);
    const exactCity = cityCandidates(address).some((value) => normalize(value) === sourceCity);
    if (!exactCity) reasons.push('city_not_exact');
  }

  if (source.postalCode) {
    const expectedPostal = normalizePostal(source.postalCode);
    const returnedPostal = normalizePostal(address.postcode);
    if (!returnedPostal || returnedPostal !== expectedPostal) reasons.push('postal_code_not_exact');
  }

  const sourceHouse = extractExplicitHouseNumber(source.address);
  const resultHouse = String(address.house_number || '').toUpperCase().replace(/\s+/g, '');
  const exactName = exactTextMatch(source.name, result.name || result.display_name?.split(',')[0]);

  if (sourceHouse) {
    const normalizedSourceHouse = sourceHouse.replace(/\s+/g, '');
    if (!resultHouse || resultHouse !== normalizedSourceHouse) reasons.push('house_number_not_exact');
  } else if (!exactName) {
    reasons.push('no_exact_house_number_or_exact_facility_name');
  }

  const lat = Number(result.lat);
  const lng = Number(result.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) reasons.push('invalid_coordinates');

  return {
    accepted: reasons.length === 0,
    reasons,
    matchBasis: sourceHouse ? 'exact_house_number_city_country' : 'exact_facility_name_city_country',
    exactName,
    sourceHouse,
    resultHouse,
    lat,
    lng,
  };
}

function evaluateArcgisCandidate(source, candidate) {
  const attributes = candidate.attributes || {};
  const reasons = [];
  const score = Number(candidate.score);
  const addrType = String(attributes.Addr_type || '').toLowerCase();
  const exactTypes = new Set(['poi', 'pointaddress', 'subaddress']);

  if (score !== 100) reasons.push('arcgis_score_not_100');
  if (!exactTypes.has(addrType)) reasons.push('result_is_not_poi_rooftop_or_subaddress');

  const returnedCountryName = attributes.CntryName || attributes.CountryName || '';
  if (!exactTextMatch(source.country, returnedCountryName)) reasons.push('country_not_exact');

  if (source.city) {
    const expectedCity = normalize(source.city);
    const returnedCities = [attributes.City, attributes.District, attributes.Subregion].filter(Boolean).map(normalize);
    if (!returnedCities.includes(expectedCity)) reasons.push('city_not_exact');
  }

  if (source.postalCode) {
    const expectedPostal = normalizePostal(source.postalCode);
    const returnedPostal = normalizePostal(attributes.Postal || attributes.PostalExt);
    if (!returnedPostal || returnedPostal !== expectedPostal) reasons.push('postal_code_not_exact');
  }

  const sourceHouse = extractExplicitHouseNumber(source.address);
  const returnedHouse = String(attributes.AddNum || '').toUpperCase().replace(/\s+/g, '');
  const returnedName = attributes.PlaceName || attributes.ShortLabel || attributes.Match_addr?.split(',')[0] || '';
  const exactName = exactTextMatch(source.name, returnedName);

  if (sourceHouse) {
    const normalizedSourceHouse = sourceHouse.replace(/\s+/g, '');
    if (!returnedHouse || returnedHouse !== normalizedSourceHouse) reasons.push('house_number_not_exact');
  } else if (!exactName) {
    reasons.push('no_exact_house_number_or_exact_facility_name');
  }

  const lat = Number(candidate.location?.y);
  const lng = Number(candidate.location?.x);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) reasons.push('invalid_coordinates');

  return {
    accepted: reasons.length === 0,
    reasons,
    matchBasis: sourceHouse ? 'arcgis_score_100_exact_house_city_country' : 'arcgis_score_100_exact_poi_name_city_country',
    exactName,
    sourceHouse,
    resultHouse: returnedHouse,
    lat,
    lng,
  };
}

async function searchArcgis(query) {
  const url = new URL(ARCGIS_URL);
  url.searchParams.set('SingleLine', query);
  url.searchParams.set('f', 'json');
  url.searchParams.set('outFields', '*');
  url.searchParams.set('maxLocations', '10');
  url.searchParams.set('forStorage', 'false');
  url.searchParams.set('matchOutOfRange', 'false');

  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
        signal: controller.signal,
      });
      if (response.status === 429 || response.status >= 500) {
        await sleep(attempt * 5000);
        continue;
      }
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const payload = await response.json();
      if (payload.error) throw new Error(payload.error.message || 'ArcGIS geocoder error');
      return Array.isArray(payload.candidates) ? payload.candidates : [];
    } catch (error) {
      lastError = error;
      if (attempt < 4) await sleep(attempt * 4000);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error('ArcGIS request failed');
}

async function searchNominatim(query, countryCode) {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('namedetails', '1');
  url.searchParams.set('limit', '10');
  url.searchParams.set('dedupe', '1');
  if (countryCode) url.searchParams.set('countrycodes', String(countryCode).toLowerCase());

  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
          Referer: 'https://github.com/Occumed79/Network-Map',
        },
        signal: controller.signal,
      });
      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number(response.headers.get('retry-after') || 0);
        await sleep(Math.max(retryAfter * 1000, attempt * 5000));
        continue;
      }
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 4) await sleep(attempt * 4000);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error('Nominatim request failed');
}

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rowsToCsv(rows, columns) {
  return [columns.join(','), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(','))].join('\n') + '\n';
}

const inputText = await fs.readFile(inputPath, 'utf8');
const sources = inputText.split(/\r?\n/u).filter(Boolean).slice(0, limit).map((line) => JSON.parse(line));
await fs.mkdir(path.dirname(outputPath), { recursive: true });

const accepted = [];
const unresolved = [];
const audit = [];
let requestCount = 0;

for (const [index, source] of sources.entries()) {
  const queries = [
    [source.name, source.geocodeQuery].filter(Boolean).join(', '),
    source.geocodeQuery,
  ].filter((value, position, values) => value && values.indexOf(value) === position);

  let bestAccepted = null;
  const attempts = [];
  let requestError = '';

  for (const query of queries) {
    if (requestCount > 0) await sleep(delayMs);
    requestCount += 1;
    try {
      const results = await searchNominatim(query, source.countryCode);
      const evaluated = results.map((result) => ({ result, evaluation: evaluateCandidate(source, result) }));
      attempts.push({ query, resultCount: results.length, evaluated: evaluated.map(({ result, evaluation }) => ({
        display_name: result.display_name,
        class: result.class,
        type: result.type,
        addresstype: result.addresstype,
        osm_type: result.osm_type,
        osm_id: result.osm_id,
        accepted: evaluation.accepted,
        reasons: evaluation.reasons,
      })) });
      const acceptedCandidate = evaluated.find(({ evaluation }) => evaluation.accepted);
      if (acceptedCandidate) {
        bestAccepted = { provider: 'OpenStreetMap Nominatim', query, ...acceptedCandidate };
        break;
      }
    } catch (error) {
      requestError = String(error?.message || error);
      attempts.push({ query, error: requestError });
    }
  }

  if (!bestAccepted) {
    for (const query of queries) {
      if (requestCount > 0) await sleep(delayMs);
      requestCount += 1;
      try {
        const candidates = await searchArcgis(query);
        const evaluated = candidates.map((result) => ({ result, evaluation: evaluateArcgisCandidate(source, result) }));
        attempts.push({ provider: 'ArcGIS World Geocoding Service', query, resultCount: candidates.length, evaluated: evaluated.map(({ result, evaluation }) => ({
          display_name: result.attributes?.LongLabel || result.attributes?.Match_addr || result.address,
          score: result.score,
          address_type: result.attributes?.Addr_type,
          accepted: evaluation.accepted,
          reasons: evaluation.reasons,
        })) });
        const acceptedCandidate = evaluated.find(({ evaluation }) => evaluation.accepted);
        if (acceptedCandidate) {
          bestAccepted = { provider: 'ArcGIS World Geocoding Service', query, ...acceptedCandidate };
          break;
        }
      } catch (error) {
        requestError = String(error?.message || error);
        attempts.push({ provider: 'ArcGIS World Geocoding Service', query, error: requestError });
      }
    }
  }

  if (bestAccepted) {
    const { result, evaluation, query, provider } = bestAccepted;
    const isArcgis = provider === 'ArcGIS World Geocoding Service';
    accepted.push({
      sourceRecordId: source.sourceRecordId,
      name: source.name,
      address: source.address,
      city: source.city,
      state: source.state,
      postalCode: source.postalCode,
      country: source.country,
      countryCode: source.countryCode,
      lat: evaluation.lat,
      lng: evaluation.lng,
      geocodeStatus: 'exact_match',
      matchBasis: evaluation.matchBasis,
      matchedQuery: query,
      matchedDisplayName: isArcgis ? (result.attributes?.LongLabel || result.attributes?.Match_addr || result.address) : result.display_name,
      osmType: isArcgis ? '' : result.osm_type,
      osmId: isArcgis ? '' : result.osm_id,
      geocoder: provider,
      geocodedAt: new Date().toISOString(),
    });
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
      geocoder: 'OpenStreetMap Nominatim + ArcGIS World Geocoding Service',
      checkedAt: new Date().toISOString(),
    });
  }

  audit.push({
    sourceRecordId: source.sourceRecordId,
    source,
    accepted: Boolean(bestAccepted),
    attempts,
    checkedAt: new Date().toISOString(),
  });
  console.log(`[${index + 1}/${sources.length}] ${source.name}: ${bestAccepted ? 'EXACT MATCH' : 'UNRESOLVED'}`);
}

const acceptedColumns = [
  'sourceRecordId', 'name', 'address', 'city', 'state', 'postalCode', 'country', 'countryCode',
  'lat', 'lng', 'geocodeStatus', 'matchBasis', 'matchedQuery', 'matchedDisplayName',
  'osmType', 'osmId', 'geocoder', 'geocodedAt',
];
const unresolvedColumns = [
  'sourceRecordId', 'name', 'address', 'city', 'state', 'postalCode', 'country', 'countryCode',
  'geocodeStatus', 'rejectionReasons', 'requestError', 'geocoder', 'checkedAt',
];

await fs.writeFile(outputPath, rowsToCsv(accepted, acceptedColumns), 'utf8');
await fs.writeFile(unresolvedPath, rowsToCsv(unresolved, unresolvedColumns), 'utf8');
await fs.writeFile(auditPath, audit.map((row) => JSON.stringify(row)).join('\n') + '\n', 'utf8');

console.log(JSON.stringify({
  input: sources.length,
  exactMatches: accepted.length,
  unresolved: unresolved.length,
  requests: requestCount,
  outputPath,
  unresolvedPath,
  auditPath,
}, null, 2));
