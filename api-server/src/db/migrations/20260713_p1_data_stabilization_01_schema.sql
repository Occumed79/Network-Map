-- P1 data stabilization, step 1 of 4.
-- Safe to apply repeatedly. No provider rows are deleted or changed here.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

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

-- Provider Explorer persistence is migration-owned instead of request-owned.
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
  last_seen timestamptz,
  geog geography(Point, 4326)
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
CREATE INDEX IF NOT EXISTS idx_provider_candidates_geog
  ON public.provider_candidates USING gist (geog);

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
  AND lower(btrim(mp.name)) NOT IN (
    'nan', 'null', 'none', 'n/a', 'na', 'unnamed', 'unnamed clinic'
  );

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
    CASE
      WHEN lower(btrim(COALESCE(mp.name, ''))) IN (
        'nan', 'null', 'none', 'n/a', 'na', 'unnamed', 'unnamed clinic'
      ) THEN 'placeholder_name'
    END,
    CASE
      WHEN lower(btrim(COALESCE(mp.formatted_address, ''))) IN (
        'nan', 'null', 'none', 'n/a', 'na'
      ) THEN 'placeholder_address'
    END
  ]::text[], NULL) AS reason_codes,
  to_jsonb(mp) AS record_snapshot
FROM public.medical_providers mp
WHERE NOT EXISTS (
  SELECT 1
  FROM public.provider_map_eligible eligible
  WHERE eligible.id = mp.id
)
OR lower(btrim(COALESCE(mp.formatted_address, ''))) IN (
  'nan', 'null', 'none', 'n/a', 'na'
);

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
  array_agg(
    DISTINCT COALESCE(data_source, 'unknown')
    ORDER BY COALESCE(data_source, 'unknown')
  ) AS sources
FROM normalized
WHERE normalized_name <> ''
GROUP BY normalized_name, location_key
HAVING count(*) > 1;

CREATE OR REPLACE VIEW public.provider_legacy_normalized AS
SELECT
  mp.id AS legacy_id,
  CASE
    WHEN NULLIF(
      regexp_replace(COALESCE(mp.raw_data->>'npi', ''), '[^0-9]', '', 'g'),
      ''
    ) ~ '^[0-9]{10}$'
    THEN 'npi:' || regexp_replace(mp.raw_data->>'npi', '[^0-9]', '', 'g')
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
      COALESCE(
        lower(regexp_replace(btrim(mp.formatted_address), '[^a-zA-Z0-9]+', ' ', 'g')),
        ''
      ) || '|' ||
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
    WHEN NULLIF(
      regexp_replace(COALESCE(mp.raw_data->>'npi', ''), '[^0-9]', '', 'g'),
      ''
    ) ~ '^[0-9]{10}$'
    THEN regexp_replace(mp.raw_data->>'npi', '[^0-9]', '', 'g')
    ELSE NULL
  END AS npi,
  CASE
    WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'dent'
      THEN 'dental'
    WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ '(^|[^a-z])dot([^a-z]|$)|cdl|medical examiner'
      THEN 'dot_provider'
    WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ '(^|[^a-z])faa([^a-z]|$)|aviation|(^|[^a-z])ame([^a-z]|$)'
      THEN 'faa_provider'
    WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'urgent|walk.?in|immediate care'
      THEN 'urgent_care'
    WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'occupational|employee health|workers.? comp'
      THEN 'occupational_health_clinic'
    WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'lab|toxicology|drug|specimen'
      THEN 'lab'
    WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'imag|radiolog|x.?ray|mammogram|ultrasound|mri|ct scan'
      THEN 'imaging'
    WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'pharmacy|vaccin|immuni'
      THEN 'pharmacy_vaccination'
    WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'hospital|medical center|emergency'
      THEN 'hospital'
    WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'family medicine|internal medicine|primary care|general practice'
      THEN 'general_practitioner'
    WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'cardiolog|pulmonary|orthopedic|neurolog|special'
      THEN 'specialist'
    ELSE 'unknown'
  END AS primary_provider_type,
  array_remove(ARRAY[
    CASE WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'dent' THEN 'dental' END,
    CASE WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ '(^|[^a-z])dot([^a-z]|$)|cdl|medical examiner' THEN 'dot_provider' END,
    CASE WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ '(^|[^a-z])faa([^a-z]|$)|aviation|(^|[^a-z])ame([^a-z]|$)' THEN 'faa_provider' END,
    CASE WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'urgent|walk.?in|immediate care' THEN 'urgent_care' END,
    CASE WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'occupational|employee health|workers.? comp' THEN 'occupational_health_clinic' END,
    CASE WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'lab|toxicology|drug|specimen' THEN 'lab' END,
    CASE WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'imag|radiolog|x.?ray|mammogram|ultrasound|mri|ct scan' THEN 'imaging' END,
    CASE WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'pharmacy|vaccin|immuni' THEN 'pharmacy_vaccination' END,
    CASE WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'hospital|medical center|emergency' THEN 'hospital' END,
    CASE WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'family medicine|internal medicine|primary care|general practice' THEN 'general_practitioner' END,
    CASE WHEN lower(COALESCE(mp.category, '') || ' ' || COALESCE(array_to_string(mp.types, ' '), '')) ~ 'cardiolog|pulmonary|orthopedic|neurolog|special' THEN 'specialist' END
  ]::text[], NULL) AS capability_tags,
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
  AND lower(btrim(pm.name)) NOT IN (
    'nan', 'null', 'none', 'n/a', 'na', 'unnamed', 'unnamed clinic'
  );

CREATE OR REPLACE VIEW public.provider_data_quality_metrics AS
SELECT 'legacy_total'::text AS metric, count(*)::bigint AS value
FROM public.medical_providers
UNION ALL
SELECT 'legacy_map_eligible', count(*)::bigint
FROM public.provider_map_eligible
UNION ALL
SELECT 'invalid_or_zero_coordinates', count(*)::bigint
FROM public.medical_providers
WHERE lat IS NULL OR lng IS NULL
   OR lat < -90 OR lat > 90
   OR lng < -180 OR lng > 180
   OR (lat = 0 AND lng = 0)
UNION ALL
SELECT 'blank_names', count(*)::bigint
FROM public.medical_providers
WHERE NULLIF(btrim(name), '') IS NULL
UNION ALL
SELECT 'placeholder_names', count(*)::bigint
FROM public.medical_providers
WHERE lower(btrim(COALESCE(name, ''))) IN (
  'nan', 'null', 'none', 'n/a', 'na', 'unnamed', 'unnamed clinic'
)
UNION ALL
SELECT 'duplicate_groups', count(*)::bigint
FROM public.provider_duplicate_candidates
UNION ALL
SELECT 'duplicate_rows', COALESCE(sum(row_count), 0)::bigint
FROM public.provider_duplicate_candidates
UNION ALL
SELECT 'quarantined_rows', count(*)::bigint
FROM public.provider_quarantine
UNION ALL
SELECT 'canonical_total', count(*)::bigint
FROM public.provider_master
UNION ALL
SELECT 'canonical_map_eligible', count(*)::bigint
FROM public.provider_master_map_view
UNION ALL
SELECT 'legacy_source_lineage_rows', count(*)::bigint
FROM public.provider_master_sources
WHERE raw_payload ? '_legacy_medical_provider_id';

COMMENT ON TABLE public.provider_schema_state IS
  'Singleton cutover state. provider_master is canonical; reads remain on legacy until canonical_read_enabled is explicitly enabled after verification.';
COMMENT ON VIEW public.provider_map_eligible IS
  'Legacy map-safe records only: valid non-zero coordinates and usable provider names.';
COMMENT ON VIEW public.provider_duplicate_candidates IS
  'Probable duplicates grouped by normalized name and location. Review before any merge or deletion.';
