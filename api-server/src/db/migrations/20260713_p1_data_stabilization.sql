-- P1 data stabilization foundation
--
-- Canonical provider store: public.provider_master and its lineage tables.
-- Legacy public.medical_providers remains readable during a controlled backfill.
-- The application must not enable canonical reads until the migration state says
-- the eligible legacy inventory has been fully verified.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
  EXCEPTION
    WHEN insufficient_privilege OR feature_not_supported THEN
      RAISE NOTICE 'pg_stat_statements is unavailable in this environment';
  END;
END
$$;

CREATE TABLE IF NOT EXISTS public.provider_schema_state (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  canonical_schema text NOT NULL DEFAULT 'provider_master',
  canonical_read_enabled boolean NOT NULL DEFAULT false,
  migration_after_legacy_id bigint NOT NULL DEFAULT 0,
  expected_eligible_rows bigint,
  migrated_eligible_rows bigint NOT NULL DEFAULT 0,
  migration_completed_at timestamptz,
  verification_notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.provider_schema_state (id, canonical_schema)
VALUES (1, 'provider_master')
ON CONFLICT (id) DO UPDATE
SET canonical_schema = EXCLUDED.canonical_schema,
    updated_at = now();

CREATE TABLE IF NOT EXISTS public.provider_quarantine (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  source_pk text NOT NULL,
  reason_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  record_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  resolution_notes text,
  first_quarantined_at timestamptz NOT NULL DEFAULT now(),
  last_quarantined_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE (source_table, source_pk)
);

CREATE INDEX IF NOT EXISTS idx_provider_quarantine_status
  ON public.provider_quarantine (status, last_quarantined_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_quarantine_reasons
  ON public.provider_quarantine USING gin (reason_codes);

-- These persistence tables were previously created from request handlers.
-- They are now owned by versioned migrations.
CREATE TABLE IF NOT EXISTS public.provider_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_kind text NOT NULL DEFAULT 'candidate',
  source_label text NOT NULL DEFAULT 'Live discovery',
  name text NOT NULL,
  normalized_name text,
  clinic_type text DEFAULT 'unknown',
  services text[] DEFAULT ARRAY[]::text[],
  categories text[] DEFAULT ARRAY[]::text[],
  address text,
  city text,
  admin_area text,
  country text,
  postal_code text,
  lat double precision,
  lng double precision,
  phone text,
  website text,
  source_url text,
  confidence_score numeric,
  trust_tier text DEFAULT 'lead',
  status text NOT NULL DEFAULT 'candidate',
  notes text,
  raw_source_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  saved_at timestamptz,
  dismissed_at timestamptz,
  last_seen timestamptz
);

CREATE INDEX IF NOT EXISTS idx_provider_candidates_status
  ON public.provider_candidates (status);
CREATE INDEX IF NOT EXISTS idx_provider_candidates_source_kind
  ON public.provider_candidates (source_kind);
CREATE INDEX IF NOT EXISTS idx_provider_candidates_country_admin_city
  ON public.provider_candidates (country, admin_area, city);
CREATE INDEX IF NOT EXISTS idx_provider_candidates_lat_lng
  ON public.provider_candidates (lat, lng);
CREATE INDEX IF NOT EXISTS idx_provider_candidates_normalized_name
  ON public.provider_candidates (normalized_name);

CREATE TABLE IF NOT EXISTS public.provider_outreach_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_candidate_id uuid REFERENCES public.provider_candidates(id) ON DELETE SET NULL,
  provider_source_id text,
  source_kind text,
  source_label text,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'outreach_target',
  notes text,
  raw_source_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_outreach_status
  ON public.provider_outreach_targets (status);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    ALTER TABLE public.provider_candidates
      ADD COLUMN IF NOT EXISTS geog geography(Point, 4326);
    UPDATE public.provider_candidates
       SET geog = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
     WHERE geog IS NULL
       AND lat BETWEEN -90 AND 90
       AND lng BETWEEN -180 AND 180
       AND (lat <> 0 OR lng <> 0);
    CREATE INDEX IF NOT EXISTS idx_provider_candidates_geog
      ON public.provider_candidates USING gist (geog);
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_master_sources_source_record
  ON public.provider_master_sources (source_key, source_record_id)
  WHERE source_record_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_provider_master_map_coordinates
  ON public.provider_master (lat, lng)
  WHERE active = true
    AND lat IS NOT NULL
    AND lng IS NOT NULL
    AND (lat <> 0 OR lng <> 0);
CREATE INDEX IF NOT EXISTS idx_provider_master_normalized_name
  ON public.provider_master (normalized_name);
CREATE INDEX IF NOT EXISTS idx_provider_master_primary_source
  ON public.provider_master (primary_source_key)
  WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_provider_master_sources_lookup
  ON public.provider_master_sources (master_provider_id, source_key);

CREATE OR REPLACE VIEW public.provider_map_eligible AS
SELECT mp.*
FROM public.medical_providers mp
WHERE mp.lat IS NOT NULL
  AND mp.lng IS NOT NULL
  AND mp.lat BETWEEN -90 AND 90
  AND mp.lng BETWEEN -180 AND 180
  AND (mp.lat <> 0 OR mp.lng <> 0)
  AND NULLIF(btrim(mp.name), '') IS NOT NULL
  AND lower(btrim(mp.name)) NOT IN ('nan', 'null', 'none', 'n/a', 'na', 'unnamed', 'unnamed clinic');

CREATE OR REPLACE VIEW public.provider_quarantine_candidates AS
SELECT
  'medical_providers'::text AS source_table,
  mp.id::text AS source_pk,
  array_remove(ARRAY[
    CASE
      WHEN mp.lat IS NULL OR mp.lng IS NULL
        OR mp.lat < -90 OR mp.lat > 90
        OR mp.lng < -180 OR mp.lng > 180
      THEN 'invalid_coordinates'
    END,
    CASE WHEN mp.lat = 0 AND mp.lng = 0 THEN 'zero_coordinates' END,
    CASE WHEN NULLIF(btrim(mp.name), '') IS NULL THEN 'blank_name' END,
    CASE WHEN lower(btrim(COALESCE(mp.name, ''))) IN ('nan', 'null', 'none', 'n/a', 'na', 'unnamed', 'unnamed clinic') THEN 'placeholder_name' END,
    CASE WHEN lower(btrim(COALESCE(mp.formatted_address, ''))) IN ('nan', 'null', 'none', 'n/a', 'na') THEN 'placeholder_address' END
  ]::text[], NULL) AS reason_codes,
  to_jsonb(mp) AS record_snapshot
FROM public.medical_providers mp
WHERE NOT EXISTS (
  SELECT 1
  FROM public.provider_map_eligible eligible
  WHERE eligible.id = mp.id
)
   OR lower(btrim(COALESCE(mp.formatted_address, ''))) IN ('nan', 'null', 'none', 'n/a', 'na');

CREATE OR REPLACE FUNCTION public.network_map_refresh_quarantine(p_limit integer DEFAULT 10000)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  affected integer := 0;
BEGIN
  WITH candidates AS (
    SELECT source_table, source_pk, reason_codes, record_snapshot
    FROM public.provider_quarantine_candidates
    WHERE cardinality(reason_codes) > 0
    ORDER BY source_pk::bigint
    LIMIT GREATEST(COALESCE(p_limit, 10000), 1)
  )
  INSERT INTO public.provider_quarantine (
    source_table,
    source_pk,
    reason_codes,
    record_snapshot,
    last_quarantined_at
  )
  SELECT source_table, source_pk, reason_codes, record_snapshot, now()
  FROM candidates
  ON CONFLICT (source_table, source_pk) DO UPDATE
  SET reason_codes = EXCLUDED.reason_codes,
      record_snapshot = EXCLUDED.record_snapshot,
      last_quarantined_at = now();

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END
$$;

CREATE OR REPLACE VIEW public.provider_duplicate_candidates AS
WITH normalized AS (
  SELECT
    mp.id,
    lower(regexp_replace(btrim(mp.name), '[^a-zA-Z0-9]+', ' ', 'g')) AS normalized_name,
    CASE
      WHEN NULLIF(btrim(mp.formatted_address), '') IS NOT NULL
        AND lower(btrim(mp.formatted_address)) NOT IN ('nan', 'null', 'none', 'n/a', 'na')
      THEN lower(regexp_replace(btrim(mp.formatted_address), '[^a-zA-Z0-9]+', ' ', 'g'))
           || '|' || lower(COALESCE(mp.locality, ''))
           || '|' || lower(COALESCE(mp.administrative_area_level_1, ''))
      ELSE round(mp.lat::numeric, 5)::text || '|' || round(mp.lng::numeric, 5)::text
    END AS location_key,
    mp.data_source
  FROM public.provider_map_eligible mp
)
SELECT
  normalized_name,
  location_key,
  count(*)::integer AS row_count,
  array_agg(id ORDER BY id) AS legacy_provider_ids,
  array_agg(DISTINCT COALESCE(data_source, 'unknown') ORDER BY COALESCE(data_source, 'unknown')) AS sources
FROM normalized
WHERE normalized_name <> ''
GROUP BY normalized_name, location_key
HAVING count(*) > 1;

CREATE OR REPLACE VIEW public.provider_legacy_normalized AS
SELECT
  mp.id AS legacy_id,
  CASE
    WHEN NULLIF(regexp_replace(COALESCE(mp.raw_data->>'npi', ''), '\D', '', 'g'), '') ~ '^\d{10}$'
      THEN 'npi:' || regexp_replace(mp.raw_data->>'npi', '\D', '', 'g')
    WHEN NULLIF(btrim(mp.source_id), '') IS NOT NULL
      THEN 'source:' ||
        CASE lower(btrim(COALESCE(mp.data_source, '')))
          WHEN 'bluehive' THEN 'bluehive'
          WHEN 'dentist dataset' THEN 'dentist_dataset'
          WHEN 'npi_bulk' THEN 'nppes_bulk'
          WHEN 'npi registry' THEN 'npi_registry'
          WHEN 'npi_registry' THEN 'npi_registry'
          WHEN 'healthgrades' THEN 'healthgrades'
          WHEN 'my clinics' THEN 'my_clinics_upload'
          ELSE 'other_registry'
        END
        || ':' || btrim(mp.source_id)
    ELSE 'loc:' || md5(
      lower(regexp_replace(btrim(mp.name), '[^a-zA-Z0-9]+', ' ', 'g')) || '|' ||
      COALESCE(lower(regexp_replace(btrim(mp.formatted_address), '[^a-zA-Z0-9]+', ' ', 'g')), '') || '|' ||
      round(mp.lat::numeric, 5)::text || '|' || round(mp.lng::numeric, 5)::text
    )
  END AS master_key,
  mp.name,
  lower(regexp_replace(btrim(mp.name), '[^a-zA-Z0-9]+', ' ', 'g')) AS normalized_name,
  mp.formatted_address,
  mp.locality AS city,
  mp.administrative_area_level_1 AS state_region,
  mp.postal_code,
  upper(COALESCE(NULLIF(btrim(mp.country_code), ''), 'US')) AS country_code,
  mp.lat,
  mp.lng,
  mp.phone,
  mp.website,
  CASE
    WHEN NULLIF(regexp_replace(COALESCE(mp.raw_data->>'npi', ''), '\D', '', 'g'), '') ~ '^\d{10}$'
      THEN regexp_replace(mp.raw_data->>'npi', '\D', '', 'g')
    ELSE NULL
  END AS npi,
  CASE
    WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'dent' THEN 'dental'
    WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ '\bdot\b|cdl|medical examiner' THEN 'dot_provider'
    WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ '\bfaa\b|aviation|\bame\b' THEN 'faa_provider'
    WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'urgent|walk.?in|immediate care' THEN 'urgent_care'
    WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'occupational|employee health|workers.? comp' THEN 'occupational_health_clinic'
    WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'lab|toxicology|drug|specimen' THEN 'lab'
    WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'imag|radiolog|x.?ray|mammogram|ultrasound|mri|ct scan' THEN 'imaging'
    WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'pharmacy|vaccin|immuni' THEN 'pharmacy_vaccination'
    WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'hospital|medical center|emergency' THEN 'hospital'
    WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'family medicine|internal medicine|primary care|general practice' THEN 'general_practitioner'
    WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'cardiolog|pulmonary|orthopedic|neurolog|special' THEN 'specialist'
    ELSE 'unknown'
  END AS primary_provider_type,
  ARRAY[
    CASE
      WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'dent' THEN 'dental'
      ELSE NULL
    END,
    CASE
      WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'urgent|walk.?in|immediate care' THEN 'urgent_care'
      ELSE NULL
    END,
    CASE
      WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'occupational|employee health|workers.? comp' THEN 'occupational_health_clinic'
      ELSE NULL
    END,
    CASE
      WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'lab|toxicology|drug|specimen' THEN 'lab'
      ELSE NULL
    END
  ]::text[] AS raw_capability_tags,
  CASE lower(btrim(COALESCE(mp.data_source, '')))
    WHEN 'bluehive' THEN 'bluehive'
    WHEN 'dentist dataset' THEN 'dentist_dataset'
    WHEN 'npi_bulk' THEN 'nppes_bulk'
    WHEN 'npi registry' THEN 'npi_registry'
    WHEN 'npi_registry' THEN 'npi_registry'
    WHEN 'healthgrades' THEN 'healthgrades'
    WHEN 'my clinics' THEN 'my_clinics_upload'
    ELSE 'other_registry'
  END AS source_key,
  COALESCE(NULLIF(btrim(mp.source_id), ''), 'legacy:' || mp.id::text) AS source_record_id,
  COALESCE(mp.confidence_score, 0.5)::numeric AS quality_score,
  to_jsonb(mp) AS raw_payload,
  COALESCE(mp.updated_at, mp.scraped_at, now()::timestamp) AS last_seen_at
FROM public.provider_map_eligible mp;

CREATE OR REPLACE FUNCTION public.network_map_migrate_legacy_batch(p_limit integer DEFAULT 1000)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  cursor_id bigint;
  processed integer := 0;
  last_id bigint := 0;
  canonical_count bigint := 0;
  eligible_count bigint := 0;
BEGIN
  SELECT migration_after_legacy_id
    INTO cursor_id
    FROM public.provider_schema_state
   WHERE id = 1
   FOR UPDATE;

  SELECT count(*)::integer, COALESCE(max(legacy_id), cursor_id)
    INTO processed, last_id
    FROM (
      SELECT legacy_id
      FROM public.provider_legacy_normalized
      WHERE legacy_id > cursor_id
      ORDER BY legacy_id
      LIMIT GREATEST(COALESCE(p_limit, 1000), 1)
    ) batch;

  IF processed = 0 THEN
    SELECT count(*) INTO eligible_count FROM public.provider_map_eligible;
    SELECT count(*) INTO canonical_count FROM public.provider_master_map_view;
    UPDATE public.provider_schema_state
       SET expected_eligible_rows = eligible_count,
           migrated_eligible_rows = canonical_count,
           migration_completed_at = CASE WHEN canonical_count >= eligible_count THEN now() ELSE migration_completed_at END,
           updated_at = now()
     WHERE id = 1;
    RETURN jsonb_build_object(
      'processed', 0,
      'afterLegacyId', cursor_id,
      'eligibleLegacyRows', eligible_count,
      'canonicalMapRows', canonical_count,
      'complete', canonical_count >= eligible_count
    );
  END IF;

  INSERT INTO public.provider_master (
    master_key,
    name,
    normalized_name,
    address_line1,
    formatted_address,
    city,
    state_region,
    postal_code,
    country_code,
    lat,
    lng,
    phone,
    website,
    npi,
    primary_provider_type,
    capability_tags,
    primary_source_key,
    quality_score,
    active,
    last_seen_at,
    updated_at
  )
  SELECT
    n.master_key,
    n.name,
    n.normalized_name,
    n.formatted_address,
    n.formatted_address,
    n.city,
    n.state_region,
    n.postal_code,
    n.country_code,
    n.lat,
    n.lng,
    n.phone,
    n.website,
    n.npi,
    n.primary_provider_type,
    CASE
      WHEN cardinality(array_remove(n.raw_capability_tags, NULL)) > 0
        THEN array_remove(n.raw_capability_tags, NULL)
      ELSE ARRAY[n.primary_provider_type]
    END,
    n.source_key,
    n.quality_score,
    true,
    n.last_seen_at,
    now()
  FROM (
    SELECT *
    FROM public.provider_legacy_normalized
    WHERE legacy_id > cursor_id
    ORDER BY legacy_id
    LIMIT GREATEST(COALESCE(p_limit, 1000), 1)
  ) n
  ON CONFLICT (master_key) DO UPDATE
  SET name = EXCLUDED.name,
      normalized_name = EXCLUDED.normalized_name,
      address_line1 = COALESCE(NULLIF(EXCLUDED.address_line1, ''), provider_master.address_line1),
      formatted_address = COALESCE(NULLIF(EXCLUDED.formatted_address, ''), provider_master.formatted_address),
      city = COALESCE(NULLIF(EXCLUDED.city, ''), provider_master.city),
      state_region = COALESCE(NULLIF(EXCLUDED.state_region, ''), provider_master.state_region),
      postal_code = COALESCE(NULLIF(EXCLUDED.postal_code, ''), provider_master.postal_code),
      country_code = COALESCE(NULLIF(EXCLUDED.country_code, ''), provider_master.country_code),
      lat = EXCLUDED.lat,
      lng = EXCLUDED.lng,
      phone = COALESCE(NULLIF(EXCLUDED.phone, ''), provider_master.phone),
      website = COALESCE(NULLIF(EXCLUDED.website, ''), provider_master.website),
      npi = COALESCE(NULLIF(EXCLUDED.npi, ''), provider_master.npi),
      primary_provider_type = CASE
        WHEN provider_master.primary_provider_type IS NULL OR provider_master.primary_provider_type = 'unknown'
          THEN EXCLUDED.primary_provider_type
        ELSE provider_master.primary_provider_type
      END,
      capability_tags = ARRAY(
        SELECT DISTINCT value
        FROM unnest(provider_master.capability_tags || EXCLUDED.capability_tags) value
        WHERE value IS NOT NULL AND value <> ''
      ),
      quality_score = GREATEST(COALESCE(provider_master.quality_score, 0), COALESCE(EXCLUDED.quality_score, 0)),
      active = true,
      last_seen_at = GREATEST(provider_master.last_seen_at, EXCLUDED.last_seen_at),
      updated_at = now();

  INSERT INTO public.provider_master_sources (
    master_provider_id,
    source_key,
    source_record_id,
    source_url,
    source_confidence_score,
    raw_payload,
    updated_at
  )
  SELECT
    pm.id,
    n.source_key,
    n.source_record_id,
    COALESCE(n.website, n.raw_payload->>'source_url', n.raw_payload->>'url'),
    n.quality_score,
    n.raw_payload,
    now()
  FROM (
    SELECT *
    FROM public.provider_legacy_normalized
    WHERE legacy_id > cursor_id
    ORDER BY legacy_id
    LIMIT GREATEST(COALESCE(p_limit, 1000), 1)
  ) n
  JOIN public.provider_master pm ON pm.master_key = n.master_key
  ON CONFLICT (source_key, source_record_id) WHERE source_record_id IS NOT NULL DO UPDATE
  SET master_provider_id = EXCLUDED.master_provider_id,
      source_url = COALESCE(EXCLUDED.source_url, provider_master_sources.source_url),
      source_confidence_score = GREATEST(COALESCE(provider_master_sources.source_confidence_score, 0), COALESCE(EXCLUDED.source_confidence_score, 0)),
      raw_payload = EXCLUDED.raw_payload,
      updated_at = now();

  INSERT INTO public.provider_master_types (
    master_provider_id,
    type_key,
    source_key,
    confidence_score
  )
  SELECT DISTINCT
    pm.id,
    n.primary_provider_type,
    n.source_key,
    n.quality_score
  FROM (
    SELECT *
    FROM public.provider_legacy_normalized
    WHERE legacy_id > cursor_id
    ORDER BY legacy_id
    LIMIT GREATEST(COALESCE(p_limit, 1000), 1)
  ) n
  JOIN public.provider_master pm ON pm.master_key = n.master_key
  ON CONFLICT (master_provider_id, type_key) DO UPDATE
  SET source_key = EXCLUDED.source_key,
      confidence_score = GREATEST(COALESCE(provider_master_types.confidence_score, 0), COALESCE(EXCLUDED.confidence_score, 0));

  UPDATE public.provider_schema_state
     SET migration_after_legacy_id = last_id,
         updated_at = now()
   WHERE id = 1;

  SELECT count(*) INTO eligible_count FROM public.provider_map_eligible;
  SELECT count(*) INTO canonical_count FROM public.provider_master_map_view;

  UPDATE public.provider_schema_state
     SET expected_eligible_rows = eligible_count,
         migrated_eligible_rows = canonical_count,
         migration_completed_at = CASE WHEN canonical_count >= eligible_count THEN now() ELSE migration_completed_at END,
         updated_at = now()
   WHERE id = 1;

  RETURN jsonb_build_object(
    'processed', processed,
    'afterLegacyId', last_id,
    'eligibleLegacyRows', eligible_count,
    'canonicalMapRows', canonical_count,
    'complete', canonical_count >= eligible_count
  );
END
$$;

CREATE OR REPLACE VIEW public.provider_master_map_view AS
SELECT
  pm.id::text AS id,
  pm.master_key,
  pm.name,
  pm.normalized_name,
  pm.formatted_address AS address,
  pm.city,
  pm.state_region AS admin_area,
  pm.country_code AS country,
  pm.postal_code,
  pm.lat,
  pm.lng,
  pm.phone,
  pm.website,
  pm.primary_source_key AS source,
  pm.primary_provider_type AS clinic_type,
  pm.capability_tags AS services,
  pm.capability_tags AS categories,
  pm.quality_score AS confidence_score,
  CASE WHEN pm.primary_source_key = 'my_clinics_upload' THEN 'saved' ELSE 'stored' END AS source_kind,
  pm.active,
  pm.last_seen_at,
  pm.created_at,
  pm.updated_at,
  pm.formatted_address AS address_1,
  pm.state_region AS state,
  pm.country_code,
  pm.postal_code AS zip,
  pm.npi,
  pm.primary_source_key AS source_key,
  pm.primary_source_key,
  pm.primary_provider_type,
  pm.capability_tags,
  pm.quality_score
FROM public.provider_master pm
WHERE pm.active = true
  AND pm.lat IS NOT NULL
  AND pm.lng IS NOT NULL
  AND pm.lat BETWEEN -90 AND 90
  AND pm.lng BETWEEN -180 AND 180
  AND (pm.lat <> 0 OR pm.lng <> 0)
  AND NULLIF(btrim(pm.name), '') IS NOT NULL
  AND lower(btrim(pm.name)) NOT IN ('nan', 'null', 'none', 'n/a', 'na', 'unnamed', 'unnamed clinic');

CREATE OR REPLACE VIEW public.provider_data_quality_metrics AS
SELECT 'legacy_total'::text AS metric, count(*)::bigint AS value FROM public.medical_providers
UNION ALL
SELECT 'legacy_map_eligible', count(*)::bigint FROM public.provider_map_eligible
UNION ALL
SELECT 'invalid_or_zero_coordinates', count(*)::bigint
FROM public.medical_providers
WHERE lat IS NULL OR lng IS NULL OR lat < -90 OR lat > 90 OR lng < -180 OR lng > 180 OR (lat = 0 AND lng = 0)
UNION ALL
SELECT 'blank_names', count(*)::bigint
FROM public.medical_providers
WHERE NULLIF(btrim(name), '') IS NULL
UNION ALL
SELECT 'placeholder_names', count(*)::bigint
FROM public.medical_providers
WHERE lower(btrim(COALESCE(name, ''))) IN ('nan', 'null', 'none', 'n/a', 'na', 'unnamed', 'unnamed clinic')
UNION ALL
SELECT 'duplicate_groups', count(*)::bigint FROM public.provider_duplicate_candidates
UNION ALL
SELECT 'duplicate_rows', COALESCE(sum(row_count), 0)::bigint FROM public.provider_duplicate_candidates
UNION ALL
SELECT 'quarantined_rows', count(*)::bigint FROM public.provider_quarantine
UNION ALL
SELECT 'canonical_total', count(*)::bigint FROM public.provider_master
UNION ALL
SELECT 'canonical_map_eligible', count(*)::bigint FROM public.provider_master_map_view;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.network_map_query_monitoring AS
      SELECT
        queryid,
        calls,
        total_exec_time,
        mean_exec_time,
        rows,
        query
      FROM pg_stat_statements
      WHERE query ILIKE '%provider_%'
         OR query ILIKE '%medical_providers%'
      ORDER BY total_exec_time DESC
    $view$;
  ELSE
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.network_map_query_monitoring AS
      SELECT
        NULL::bigint AS queryid,
        NULL::bigint AS calls,
        NULL::double precision AS total_exec_time,
        NULL::double precision AS mean_exec_time,
        NULL::bigint AS rows,
        NULL::text AS query
      WHERE false
    $view$;
  END IF;
END
$$;

COMMENT ON TABLE public.provider_schema_state IS
  'Singleton cutover state. provider_master is canonical; reads stay on legacy until canonical_read_enabled is explicitly set after verification.';
COMMENT ON VIEW public.provider_map_eligible IS
  'Legacy map-safe records only: valid non-zero coordinates and usable provider names.';
COMMENT ON VIEW public.provider_duplicate_candidates IS
  'Probable duplicate legacy records grouped by normalized name and address or coordinates. Review before destructive deduplication.';
COMMENT ON FUNCTION public.network_map_migrate_legacy_batch(integer) IS
  'Idempotently migrates one map-eligible legacy batch into provider_master with source lineage; advances provider_schema_state cursor.';

COMMIT;
