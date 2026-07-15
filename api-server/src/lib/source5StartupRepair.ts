import { getPool, type PoolClient } from "@workspace/db";
import { logger } from "./logger";

type CountryConfig = {
  code: "AL" | "AD" | "AO";
  commit: string;
  expected: number;
  compactFiles: number;
};

type CountryCounts = {
  raw_records: string;
  stage_records: string;
  master_records: string;
  lineage_records: string;
  type_links: string;
  legacy_records: string;
  invalid_records: string;
  invalid_type_links: string;
};

const REPAIR_LOCK_KEY = "network-map:source5:al-ad-ao:2026-07-15";
const RAW_ROOT = "https://raw.githubusercontent.com/Occumed79/Network-Map";
const COUNTRIES: CountryConfig[] = [
  {
    code: "AL",
    commit: "8da777f340b58ef705e5866674eb12afde71023b",
    expected: 1105,
    compactFiles: 45,
  },
  {
    code: "AD",
    commit: "03ec1b8c34ecb1dfaa6e25bd7d1567d8b2014f92",
    expected: 44,
    compactFiles: 2,
  },
  {
    code: "AO",
    commit: "e03f8f7bd825f383430a108394cb5ea75b117e0b",
    expected: 776,
    compactFiles: 32,
  },
];

const CREATE_STAGING_SQL = `
CREATE TABLE IF NOT EXISTS public.source5_import_staging (
  source_record_id text PRIMARY KEY,
  source_url text,
  name text NOT NULL,
  normalized_name text,
  address_line1 text,
  formatted_address text,
  city text,
  state_region text,
  postal_code text,
  country_code text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  phone text,
  website text,
  email text,
  primary_provider_type text,
  capability_tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  quality_score numeric,
  master_key text NOT NULL
)`;

const PROMOTION_STATEMENTS = [
  `INSERT INTO public.provider_source_catalog
    (source_key, display_name, source_kind, trust_tier, active, notes)
   VALUES
    ('healthsites_osm', 'Healthsites / OpenStreetMap health facilities', 'open_data', 'directory', true,
     'International health-facility locations; backend ingestion only')
   ON CONFLICT (source_key) DO UPDATE SET
    display_name=EXCLUDED.display_name,
    source_kind=EXCLUDED.source_kind,
    trust_tier=EXCLUDED.trust_tier,
    active=true,
    notes=EXCLUDED.notes,
    updated_at=now()`,
  `INSERT INTO public.provider_raw_records
    (source_key, source_record_id, content_hash, raw_payload, raw_text, status)
   SELECT
    'healthsites_osm', t.source_record_id, md5(to_jsonb(t)::text),
    to_jsonb(t), to_jsonb(t)::text, 'raw_loaded'
   FROM public.source5_import_staging t
   WHERE NOT EXISTS (
    SELECT 1 FROM public.provider_raw_records r
    WHERE r.source_key='healthsites_osm' AND r.source_record_id=t.source_record_id
   )`,
  `UPDATE public.provider_raw_records r
   SET content_hash=md5(to_jsonb(t)::text),
       raw_payload=to_jsonb(t),
       raw_text=to_jsonb(t)::text,
       status='raw_loaded',
       updated_at=now()
   FROM public.source5_import_staging t
   WHERE r.source_key='healthsites_osm'
     AND r.source_record_id=t.source_record_id`,
  `INSERT INTO public.provider_stage_records (
    raw_record_id, source_key, source_record_id, name, normalized_name,
    address_line1, formatted_address, city, state_region, postal_code,
    country_code, lat, lng, phone, website, email, primary_provider_type,
    capability_tags, confidence_score, normalization_status, normalized_payload
   )
   SELECT
    r.id, 'healthsites_osm', t.source_record_id, t.name,
    NULLIF(t.normalized_name,''), t.address_line1, t.formatted_address,
    t.city, t.state_region, t.postal_code, t.country_code, t.lat, t.lng,
    t.phone, t.website, t.email, t.primary_provider_type,
    t.capability_tags, t.quality_score, 'staged', to_jsonb(t)
   FROM public.source5_import_staging t
   JOIN LATERAL (
    SELECT id FROM public.provider_raw_records r
    WHERE r.source_key='healthsites_osm' AND r.source_record_id=t.source_record_id
    ORDER BY r.created_at ASC LIMIT 1
   ) r ON true
   WHERE NOT EXISTS (
    SELECT 1 FROM public.provider_stage_records s
    WHERE s.source_key='healthsites_osm' AND s.source_record_id=t.source_record_id
   )`,
  `UPDATE public.provider_stage_records s
   SET name=t.name,
       normalized_name=NULLIF(t.normalized_name,''),
       address_line1=t.address_line1,
       formatted_address=t.formatted_address,
       city=t.city,
       state_region=t.state_region,
       postal_code=t.postal_code,
       country_code=t.country_code,
       lat=t.lat,
       lng=t.lng,
       phone=t.phone,
       website=t.website,
       email=t.email,
       primary_provider_type=t.primary_provider_type,
       capability_tags=t.capability_tags,
       confidence_score=t.quality_score,
       normalization_status='staged',
       normalized_payload=to_jsonb(t),
       updated_at=now()
   FROM public.source5_import_staging t
   WHERE s.source_key='healthsites_osm'
     AND s.source_record_id=t.source_record_id`,
  `INSERT INTO public.provider_master (
    master_key, name, normalized_name, address_line1, formatted_address,
    city, state_region, postal_code, country_code, lat, lng, phone,
    website, email, primary_provider_type, capability_tags,
    primary_source_key, quality_score, active, last_seen_at, updated_at
   )
   SELECT
    master_key, name, NULLIF(normalized_name,''), address_line1,
    formatted_address, city, state_region, postal_code, country_code,
    lat, lng, phone, website, email, primary_provider_type,
    capability_tags, 'healthsites_osm', quality_score, true, now(), now()
   FROM public.source5_import_staging
   ON CONFLICT (master_key) DO UPDATE SET
    name=EXCLUDED.name,
    normalized_name=COALESCE(EXCLUDED.normalized_name, provider_master.normalized_name),
    address_line1=COALESCE(NULLIF(EXCLUDED.address_line1,''), provider_master.address_line1),
    formatted_address=COALESCE(NULLIF(EXCLUDED.formatted_address,''), provider_master.formatted_address),
    city=COALESCE(NULLIF(EXCLUDED.city,''), provider_master.city),
    state_region=COALESCE(NULLIF(EXCLUDED.state_region,''), provider_master.state_region),
    postal_code=COALESCE(NULLIF(EXCLUDED.postal_code,''), provider_master.postal_code),
    country_code=EXCLUDED.country_code,
    lat=EXCLUDED.lat,
    lng=EXCLUDED.lng,
    phone=COALESCE(NULLIF(EXCLUDED.phone,''), provider_master.phone),
    website=COALESCE(NULLIF(EXCLUDED.website,''), provider_master.website),
    email=COALESCE(NULLIF(EXCLUDED.email,''), provider_master.email),
    primary_provider_type=CASE
      WHEN provider_master.primary_provider_type IS NULL OR provider_master.primary_provider_type='unknown'
      THEN EXCLUDED.primary_provider_type ELSE provider_master.primary_provider_type END,
    capability_tags=ARRAY(
      SELECT DISTINCT value
      FROM unnest(provider_master.capability_tags || EXCLUDED.capability_tags) value
      WHERE value IS NOT NULL AND value<>''
    ),
    primary_source_key=COALESCE(provider_master.primary_source_key, EXCLUDED.primary_source_key),
    quality_score=GREATEST(COALESCE(provider_master.quality_score,0), COALESCE(EXCLUDED.quality_score,0)),
    active=true,
    last_seen_at=now(),
    updated_at=now()`,
  `INSERT INTO public.provider_master_sources (
    master_provider_id, stage_record_id, raw_record_id, source_key,
    source_record_id, source_url, source_confidence_score, raw_payload
   )
   SELECT
    pm.id, s.id, r.id, 'healthsites_osm', t.source_record_id,
    t.source_url, t.quality_score, to_jsonb(t)
   FROM public.source5_import_staging t
   JOIN public.provider_master pm ON pm.master_key=t.master_key
   LEFT JOIN LATERAL (
    SELECT id FROM public.provider_raw_records r
    WHERE r.source_key='healthsites_osm' AND r.source_record_id=t.source_record_id
    ORDER BY r.created_at ASC LIMIT 1
   ) r ON true
   LEFT JOIN LATERAL (
    SELECT id FROM public.provider_stage_records s
    WHERE s.source_key='healthsites_osm' AND s.source_record_id=t.source_record_id
    ORDER BY s.created_at ASC LIMIT 1
   ) s ON true
   ON CONFLICT (master_provider_id, source_key, (COALESCE(source_record_id,''))) DO UPDATE SET
    stage_record_id=EXCLUDED.stage_record_id,
    raw_record_id=EXCLUDED.raw_record_id,
    source_url=EXCLUDED.source_url,
    source_confidence_score=GREATEST(
      COALESCE(provider_master_sources.source_confidence_score,0),
      COALESCE(EXCLUDED.source_confidence_score,0)
    ),
    raw_payload=EXCLUDED.raw_payload,
    updated_at=now()`,
  `INSERT INTO public.provider_master_types
    (master_provider_id, type_key, source_key, confidence_score)
   SELECT DISTINCT
    pm.id, type_key, 'healthsites_osm', t.quality_score
   FROM public.source5_import_staging t
   JOIN public.provider_master pm ON pm.master_key=t.master_key
   CROSS JOIN LATERAL unnest(ARRAY[t.primary_provider_type] || t.capability_tags) type_key
   WHERE type_key IS NOT NULL AND type_key<>''
     AND EXISTS (SELECT 1 FROM public.provider_type_catalog c WHERE c.type_key=type_key)
   ON CONFLICT (master_provider_id, type_key) DO UPDATE SET
    source_key=EXCLUDED.source_key,
    confidence_score=GREATEST(
      COALESCE(provider_master_types.confidence_score,0),
      COALESCE(EXCLUDED.confidence_score,0)
    )`,
  `INSERT INTO public.medical_providers (
    place_id, name, formatted_address, lat, lng, types, category,
    phone, website, country_code, locality, administrative_area_level_1,
    postal_code, data_source, source_id, source_type, confidence_score,
    raw_data, scraped_at, updated_at
   )
   SELECT
    'healthsites_osm:' || source_record_id, name, formatted_address,
    lat, lng, capability_tags, primary_provider_type, phone, website,
    country_code, city, state_region, postal_code,
    'Healthsites / OpenStreetMap', 'healthsites_osm:' || source_record_id,
    'open_data', quality_score::double precision,
    to_jsonb(t) || jsonb_build_object('provider_master_key',master_key,'source_key','healthsites_osm'),
    now(), now()
   FROM public.source5_import_staging t
   ON CONFLICT (source_id) DO UPDATE SET
    name=EXCLUDED.name,
    formatted_address=EXCLUDED.formatted_address,
    lat=EXCLUDED.lat,
    lng=EXCLUDED.lng,
    types=EXCLUDED.types,
    category=EXCLUDED.category,
    phone=COALESCE(EXCLUDED.phone, medical_providers.phone),
    website=COALESCE(EXCLUDED.website, medical_providers.website),
    country_code=EXCLUDED.country_code,
    locality=EXCLUDED.locality,
    administrative_area_level_1=EXCLUDED.administrative_area_level_1,
    postal_code=EXCLUDED.postal_code,
    confidence_score=GREATEST(COALESCE(medical_providers.confidence_score,0), COALESCE(EXCLUDED.confidence_score,0)),
    raw_data=EXCLUDED.raw_data,
    updated_at=now()`,
];

async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Network-Map-Source5-Repair/1.0" },
        signal: AbortSignal.timeout(30_000),
      });
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status} for ${url}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Unable to fetch ${url}`);
}

async function getCountryCounts(client: PoolClient, code: string): Promise<CountryCounts> {
  const result = await client.query<CountryCounts>(
    `SELECT
      (SELECT COUNT(*) FROM public.provider_raw_records
        WHERE source_key='healthsites_osm' AND raw_payload->>'country_code'=$1) AS raw_records,
      (SELECT COUNT(*) FROM public.provider_stage_records
        WHERE source_key='healthsites_osm' AND country_code=$1) AS stage_records,
      (SELECT COUNT(*) FROM public.provider_master
        WHERE primary_source_key='healthsites_osm' AND country_code=$1) AS master_records,
      (SELECT COUNT(*) FROM public.provider_master_sources pms
        JOIN public.provider_master pm ON pm.id=pms.master_provider_id
        WHERE pms.source_key='healthsites_osm' AND pm.country_code=$1) AS lineage_records,
      (SELECT COUNT(*) FROM public.provider_master_types pmt
        JOIN public.provider_master pm ON pm.id=pmt.master_provider_id
        WHERE pmt.source_key='healthsites_osm' AND pm.country_code=$1) AS type_links,
      (SELECT COUNT(*) FROM public.medical_providers
        WHERE data_source='Healthsites / OpenStreetMap' AND country_code=$1) AS legacy_records,
      (SELECT COUNT(*) FROM public.provider_master_sources pms
        JOIN public.provider_master pm ON pm.id=pms.master_provider_id
        WHERE pms.source_key='healthsites_osm' AND pm.country_code=$1
          AND (pm.name IS NULL OR btrim(pm.name)='' OR pm.lat IS NULL OR pm.lng IS NULL
            OR pm.lat=0 OR pm.lng=0 OR pm.lat NOT BETWEEN -90 AND 90 OR pm.lng NOT BETWEEN -180 AND 180)) AS invalid_records,
      (SELECT COUNT(*) FROM public.provider_master_types pmt
        JOIN public.provider_master pm ON pm.id=pmt.master_provider_id
        LEFT JOIN public.provider_type_catalog c ON c.type_key=pmt.type_key
        WHERE pmt.source_key='healthsites_osm' AND pm.country_code=$1 AND c.type_key IS NULL) AS invalid_type_links`,
    [code],
  );
  const row = result.rows[0];
  if (!row) throw new Error(`No reconciliation result returned for ${code}`);
  return row;
}

function isComplete(counts: CountryCounts, expected: number): boolean {
  return Number(counts.raw_records) === expected
    && Number(counts.stage_records) === expected
    && Number(counts.master_records) === expected
    && Number(counts.lineage_records) === expected
    && Number(counts.legacy_records) === expected
    && Number(counts.invalid_records) === 0
    && Number(counts.invalid_type_links) === 0;
}

async function loadCountryIntoStaging(client: PoolClient, country: CountryConfig): Promise<void> {
  const base = `${RAW_ROOT}/${country.commit}/data/generated/global-health-facilities`;
  const manifestResponse = await fetchWithRetry(`${base}/manifest.json`);
  const manifest = await manifestResponse.json() as {
    total_rows?: number;
    countries_requested?: string[];
  };
  if (manifest.total_rows !== country.expected || manifest.countries_requested?.join(",") !== country.code) {
    throw new Error(`Manifest mismatch for ${country.code}`);
  }

  const urls = Array.from({ length: country.compactFiles }, (_, index) => {
    const file = `source5_compact_${String(index + 1).padStart(3, "0")}.sql`;
    return `${base}/compact/${file}`;
  });
  const sqlFiles = await Promise.all(urls.map(async (url) => (await fetchWithRetry(url)).text()));

  await client.query("TRUNCATE public.source5_import_staging");
  for (const sql of sqlFiles) {
    await client.query(sql);
  }

  const staged = await client.query<{ count: string; countries: string[] }>(
    `SELECT COUNT(*) AS count, ARRAY_AGG(DISTINCT country_code ORDER BY country_code) AS countries
     FROM public.source5_import_staging`,
  );
  const row = staged.rows[0];
  if (!row || Number(row.count) !== country.expected || row.countries.join(",") !== country.code) {
    throw new Error(`Staging validation failed for ${country.code}: ${JSON.stringify(row)}`);
  }
}

async function promoteCountry(client: PoolClient, country: CountryConfig): Promise<CountryCounts> {
  await client.query("BEGIN");
  try {
    for (const statement of PROMOTION_STATEMENTS) {
      await client.query(statement);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }

  const counts = await getCountryCounts(client, country.code);
  if (!isComplete(counts, country.expected)) {
    throw new Error(
      `Production reconciliation failed for ${country.code}: expected=${country.expected} counts=${JSON.stringify(counts)}`,
    );
  }
  return counts;
}

async function runSource5StartupRepair(): Promise<void> {
  const client = await getPool().connect();
  let lockHeld = false;
  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [REPAIR_LOCK_KEY]);
    lockHeld = true;

    const initial = await Promise.all(
      COUNTRIES.map(async (country) => ({ country, counts: await getCountryCounts(client, country.code) })),
    );
    if (initial.every(({ country, counts }) => isComplete(counts, country.expected))) {
      logger.info({ countries: initial }, "Source 5 startup repair already complete");
      return;
    }

    await client.query(CREATE_STAGING_SQL);
    for (const { country, counts } of initial) {
      if (isComplete(counts, country.expected)) {
        logger.info({ country: country.code, counts }, "Source 5 country already complete; skipping");
        continue;
      }
      logger.info({ country: country.code, before: counts }, "Starting direct Source 5 production repair");
      await loadCountryIntoStaging(client, country);
      const after = await promoteCountry(client, country);
      logger.info({ country: country.code, after }, "Completed direct Source 5 production repair");
    }

    await client.query("DROP TABLE IF EXISTS public.source5_import_staging");
    await client.query("DROP TABLE IF EXISTS public.source5_temp_auth");
    try {
      await client.query("DROP ROLE IF EXISTS source5_tmp_0715a");
    } catch (error) {
      logger.warn({ err: error }, "Could not remove unused temporary Source 5 role");
    }

    const final = await Promise.all(
      COUNTRIES.map(async (country) => ({ country, counts: await getCountryCounts(client, country.code) })),
    );
    if (!final.every(({ country, counts }) => isComplete(counts, country.expected))) {
      throw new Error(`Final Source 5 reconciliation failed: ${JSON.stringify(final)}`);
    }
    logger.info({ countries: final }, "Source 5 AL/AD/AO production repair fully verified");
  } finally {
    if (lockHeld) {
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [REPAIR_LOCK_KEY]).catch(() => undefined);
    }
    client.release();
  }
}

let scheduled = false;

export function scheduleSource5StartupRepair(): void {
  if (scheduled || process.env.NODE_ENV !== "production") return;
  if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_POOLED) return;
  if (process.env.SOURCE5_STARTUP_REPAIR_DISABLED === "true") return;
  scheduled = true;
  const timer = setTimeout(() => {
    void runSource5StartupRepair().catch((error) => {
      logger.error({ err: error }, "Source 5 startup repair failed");
    });
  }, 2_000);
  timer.unref();
}
