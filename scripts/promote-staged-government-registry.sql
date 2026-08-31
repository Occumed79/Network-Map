\set ON_ERROR_STOP on
BEGIN;

SELECT (
  COUNT(*) = :expected::bigint
  AND COUNT(DISTINCT source_record_id) = :expected::bigint
  AND COUNT(DISTINCT master_key) = :expected_master::bigint
  AND BOOL_AND(source_record_id LIKE :'source_prefix_pattern')
  AND BOOL_AND(country_code = :'country_code')
  AND BOOL_AND(name IS NOT NULL AND btrim(name) <> '')
  AND BOOL_AND(lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
) AS staging_ok
FROM public.source5_import_staging
\gset

\if :staging_ok
\else
  \echo 'Government registry staging validation failed'
  ROLLBACK;
  \quit 2
\endif

INSERT INTO public.provider_type_catalog
  (type_key, display_name, description, active)
VALUES
  ('general_practitioner', 'General Practitioner', 'Primary care, family medicine, internal medicine, or general practice provider', true),
  ('occupational_health_clinic', 'Occupational Health Clinic', 'Occupational medicine, employee health, workplace health, or employer services clinic', true),
  ('dental', 'Dental', 'Dental provider or clinic', true),
  ('lab', 'Lab', 'Laboratory, pathology, specimen collection, or diagnostics location', true),
  ('imaging', 'Imaging', 'Radiology, X-ray, MRI, CT, ultrasound, or imaging center', true),
  ('pharmacy_vaccination', 'Pharmacy / Vaccination', 'Pharmacy, immunization, vaccination, or travel medicine provider', true),
  ('hospital', 'Hospital', 'Hospital, medical center, emergency, or inpatient facility', true),
  ('specialist', 'Specialist', 'Specialty physician or specialist clinic', true),
  ('healthcare_facility', 'Healthcare Facility', 'Licensed or registered healthcare facility', true),
  ('unknown', 'Unknown', 'Unclassified provider', true)
ON CONFLICT (type_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  active = EXCLUDED.active;

CREATE TEMP TABLE registry_old_master_ids ON COMMIT DROP AS
SELECT DISTINCT master_provider_id
FROM public.provider_master_sources
WHERE source_key = :'source_key';

DELETE FROM public.provider_master_sources WHERE source_key = :'source_key';
DELETE FROM public.provider_master_types WHERE source_key = :'source_key';
DELETE FROM public.medical_providers WHERE data_source = :'data_source_name';
DELETE FROM public.provider_stage_records WHERE source_key = :'source_key';
DELETE FROM public.provider_raw_records WHERE source_key = :'source_key';

DELETE FROM public.provider_master pm
USING registry_old_master_ids old
WHERE pm.id = old.master_provider_id
  AND NOT EXISTS (
    SELECT 1 FROM public.provider_master_sources pms
    WHERE pms.master_provider_id = pm.id
  );

INSERT INTO public.provider_source_catalog
  (source_key, display_name, source_kind, trust_tier, active, notes)
VALUES
  (:'source_key', :'source_display_name', 'government_registry', 'registry', true, :'source_notes')
ON CONFLICT (source_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  source_kind = EXCLUDED.source_kind,
  trust_tier = EXCLUDED.trust_tier,
  active = true,
  notes = EXCLUDED.notes,
  updated_at = now();

INSERT INTO public.provider_raw_records
  (source_key, source_record_id, content_hash, raw_payload, raw_text, status)
SELECT
  :'source_key',
  t.source_record_id,
  md5(to_jsonb(t)::text),
  '{}'::jsonb,
  NULL,
  'raw_loaded'
FROM public.source5_import_staging t;

INSERT INTO public.provider_stage_records (
  raw_record_id, source_key, source_record_id, name, normalized_name,
  country_code, lat, lng, primary_provider_type, capability_tags,
  confidence_score, normalization_status, normalized_payload
)
SELECT
  r.id, :'source_key', t.source_record_id, t.name,
  NULLIF(t.normalized_name, ''), t.country_code, t.lat, t.lng,
  t.primary_provider_type, t.capability_tags, t.quality_score, 'staged',
  jsonb_build_object('master_key', t.master_key)
FROM public.source5_import_staging t
JOIN public.provider_raw_records r
  ON r.source_key = :'source_key'
 AND r.source_record_id = t.source_record_id;

INSERT INTO public.provider_master (
  master_key, name, normalized_name, address_line1, formatted_address,
  city, state_region, postal_code, country_code, lat, lng, phone,
  website, email, primary_provider_type, capability_tags,
  primary_source_key, quality_score, active, last_seen_at, updated_at
)
SELECT
  master_key, name, NULLIF(normalized_name, ''), address_line1,
  formatted_address, city, state_region, postal_code, country_code,
  lat, lng, phone, website, email, primary_provider_type,
  capability_tags, :'source_key', quality_score, true, now(), now()
FROM (
  SELECT DISTINCT ON (master_key) *
  FROM public.source5_import_staging
  ORDER BY master_key, quality_score DESC NULLS LAST, source_record_id
) dedup
ON CONFLICT (master_key) DO UPDATE SET
  name = EXCLUDED.name,
  normalized_name = COALESCE(EXCLUDED.normalized_name, provider_master.normalized_name),
  address_line1 = COALESCE(NULLIF(EXCLUDED.address_line1, ''), provider_master.address_line1),
  formatted_address = COALESCE(NULLIF(EXCLUDED.formatted_address, ''), provider_master.formatted_address),
  city = COALESCE(NULLIF(EXCLUDED.city, ''), provider_master.city),
  state_region = COALESCE(NULLIF(EXCLUDED.state_region, ''), provider_master.state_region),
  postal_code = COALESCE(NULLIF(EXCLUDED.postal_code, ''), provider_master.postal_code),
  country_code = EXCLUDED.country_code,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  phone = COALESCE(NULLIF(EXCLUDED.phone, ''), provider_master.phone),
  website = COALESCE(NULLIF(EXCLUDED.website, ''), provider_master.website),
  email = COALESCE(NULLIF(EXCLUDED.email, ''), provider_master.email),
  primary_provider_type = CASE
    WHEN provider_master.primary_provider_type IS NULL OR provider_master.primary_provider_type = 'unknown'
    THEN EXCLUDED.primary_provider_type ELSE provider_master.primary_provider_type END,
  capability_tags = ARRAY(
    SELECT DISTINCT value
    FROM unnest(provider_master.capability_tags || EXCLUDED.capability_tags) value
    WHERE value IS NOT NULL AND value <> ''
  ),
  primary_source_key = CASE
    WHEN COALESCE(provider_master.quality_score, 0) <= COALESCE(EXCLUDED.quality_score, 0)
    THEN :'source_key' ELSE provider_master.primary_source_key END,
  quality_score = GREATEST(COALESCE(provider_master.quality_score, 0), COALESCE(EXCLUDED.quality_score, 0)),
  active = true,
  last_seen_at = now(),
  updated_at = now();

CREATE INDEX IF NOT EXISTS idx_provider_stage_records_source_record
  ON public.provider_stage_records(source_key, source_record_id);

INSERT INTO public.provider_master_sources (
  master_provider_id, stage_record_id, raw_record_id, source_key,
  source_record_id, source_url, source_confidence_score, raw_payload
)
SELECT
  pm.id, s.id, r.id, :'source_key', t.source_record_id,
  t.source_url, t.quality_score, '{}'::jsonb
FROM public.source5_import_staging t
JOIN public.provider_master pm ON pm.master_key = t.master_key
JOIN public.provider_raw_records r
  ON r.source_key = :'source_key'
 AND r.source_record_id = t.source_record_id
JOIN public.provider_stage_records s
  ON s.source_key = :'source_key'
 AND s.source_record_id = t.source_record_id
ON CONFLICT (master_provider_id, source_key, (COALESCE(source_record_id, ''))) DO UPDATE SET
  stage_record_id = EXCLUDED.stage_record_id,
  raw_record_id = EXCLUDED.raw_record_id,
  source_url = EXCLUDED.source_url,
  source_confidence_score = GREATEST(
    COALESCE(provider_master_sources.source_confidence_score, 0),
    COALESCE(EXCLUDED.source_confidence_score, 0)
  ),
  raw_payload = EXCLUDED.raw_payload,
  updated_at = now();

INSERT INTO public.provider_master_types
  (master_provider_id, type_key, source_key, confidence_score)
SELECT DISTINCT
  pm.id, type_key, :'source_key', t.quality_score
FROM public.source5_import_staging t
JOIN public.provider_master pm ON pm.master_key = t.master_key
CROSS JOIN LATERAL unnest(ARRAY[t.primary_provider_type] || t.capability_tags) type_key
WHERE type_key IS NOT NULL AND type_key <> ''
  AND EXISTS (SELECT 1 FROM public.provider_type_catalog c WHERE c.type_key = type_key)
ON CONFLICT (master_provider_id, type_key) DO UPDATE SET
  confidence_score = GREATEST(
    COALESCE(provider_master_types.confidence_score, 0),
    COALESCE(EXCLUDED.confidence_score, 0)
  );

INSERT INTO public.medical_providers (
  place_id, name, formatted_address, lat, lng, types, category,
  phone, website, country_code, locality, administrative_area_level_1,
  postal_code, data_source, source_id, source_type, confidence_score,
  raw_data, scraped_at, updated_at
)
SELECT
  source_record_id, name, formatted_address,
  lat, lng, capability_tags, primary_provider_type, phone, website,
  country_code, city, state_region, postal_code,
  :'data_source_name', source_record_id,
  'government_registry', quality_score::double precision,
  NULL,
  now(), now()
FROM public.source5_import_staging t
ON CONFLICT (source_id) DO UPDATE SET
  name = EXCLUDED.name,
  formatted_address = EXCLUDED.formatted_address,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  types = EXCLUDED.types,
  category = EXCLUDED.category,
  phone = COALESCE(EXCLUDED.phone, medical_providers.phone),
  website = COALESCE(EXCLUDED.website, medical_providers.website),
  country_code = EXCLUDED.country_code,
  locality = EXCLUDED.locality,
  administrative_area_level_1 = EXCLUDED.administrative_area_level_1,
  postal_code = EXCLUDED.postal_code,
  confidence_score = GREATEST(COALESCE(medical_providers.confidence_score, 0), COALESCE(EXCLUDED.confidence_score, 0)),
  updated_at = now();

ANALYZE public.provider_stage_records;
ANALYZE public.provider_raw_records;
ANALYZE public.provider_master;

SELECT (
  (SELECT COUNT(DISTINCT r.source_record_id)
   FROM public.provider_raw_records r
   WHERE r.source_key = :'source_key') = :expected::bigint
  AND (SELECT COUNT(*) FROM public.provider_stage_records
       WHERE source_key = :'source_key') = :expected::bigint
  AND (SELECT COUNT(DISTINCT master_provider_id)
       FROM public.provider_master_sources
       WHERE source_key = :'source_key') = :expected_master::bigint
  AND (SELECT COUNT(*) FROM public.provider_master_sources
       WHERE source_key = :'source_key') = :expected::bigint
  AND (SELECT COUNT(*) FROM public.medical_providers
       WHERE data_source = :'data_source_name') = :expected::bigint
  AND (SELECT COUNT(*) FROM public.provider_master_sources pms
       JOIN public.provider_master pm ON pm.id = pms.master_provider_id
       WHERE pms.source_key = :'source_key'
         AND (pm.name IS NULL OR btrim(pm.name) = '' OR pm.lat IS NULL OR pm.lng IS NULL
           OR pm.lat NOT BETWEEN -90 AND 90 OR pm.lng NOT BETWEEN -180 AND 180)) = 0
) AS production_ok
\gset

\if :production_ok
\else
  \echo 'Government registry production reconciliation failed'
  ROLLBACK;
  \quit 3
\endif

TRUNCATE public.source5_import_staging;
COMMIT;
