\set ON_ERROR_STOP on
BEGIN;

SELECT (
  COUNT(*) = :expected::bigint
  AND COUNT(DISTINCT source_record_id) = :expected::bigint
  AND COUNT(DISTINCT master_key) = :expected_master::bigint
  AND BOOL_AND(source_record_id LIKE 'healthsites:%')
  AND BOOL_AND(name IS NOT NULL AND btrim(name)<>'')
  AND BOOL_AND(lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
) AS staging_ok
FROM public.source5_import_staging
\gset

\if :staging_ok
\else
  \echo 'Healthsites world staging validation failed'
  ROLLBACK;
  \quit 2
\endif

-- Provider projects are cloned schema-only. Seed the canonical provider type
-- reference rows before any FK-constrained stage/master inserts.
INSERT INTO public.provider_type_catalog
  (type_key, display_name, description, active)
VALUES
  ('urgent_care', 'Urgent Care', 'Urgent care and walk-in clinic locations', true),
  ('dot_provider', 'DOT Provider', 'DOT exam or CDL medical examiner capable provider', true),
  ('faa_provider', 'FAA Provider', 'FAA aviation medical examiner or aviation medical clinic', true),
  ('lab', 'Lab', 'Lab, toxicology, specimen collection, drug screen, or diagnostics location', true),
  ('general_practitioner', 'General Practitioner', 'Primary care, family medicine, internal medicine, or general practice provider', true),
  ('occupational_health_clinic', 'Occupational Health Clinic', 'Occupational medicine, employee health, workers comp, fit-for-duty, or employer services clinic', true),
  ('dental', 'Dental', 'Dental provider or DD 2813 capable clinic', true),
  ('imaging', 'Imaging', 'X-ray, radiology, mammogram, MRI, CT, ultrasound, or imaging center', true),
  ('pharmacy_vaccination', 'Pharmacy / Vaccination', 'Pharmacy, immunization, vaccination, or travel medicine provider', true),
  ('hospital', 'Hospital', 'Hospital, medical center, or emergency facility', true),
  ('specialist', 'Specialist', 'Specialty physician or specialist clinic', true),
  ('unknown', 'Unknown', 'Unclassified provider', true)
ON CONFLICT (type_key) DO UPDATE SET
  display_name=EXCLUDED.display_name,
  description=EXCLUDED.description,
  active=EXCLUDED.active;

CREATE TEMP TABLE healthsites_old_master_ids ON COMMIT DROP AS
SELECT DISTINCT master_provider_id
FROM public.provider_master_sources
WHERE source_key='healthsites_osm';

DELETE FROM public.provider_master_sources
WHERE source_key='healthsites_osm';

DELETE FROM public.provider_master_types
WHERE source_key='healthsites_osm';

DELETE FROM public.medical_providers
WHERE data_source='Healthsites / OpenStreetMap';

DELETE FROM public.provider_stage_records
WHERE source_key='healthsites_osm';

DELETE FROM public.provider_raw_records
WHERE source_key='healthsites_osm';

DELETE FROM public.provider_master pm
USING healthsites_old_master_ids old
WHERE pm.id=old.master_provider_id
  AND NOT EXISTS (
    SELECT 1 FROM public.provider_master_sources pms
    WHERE pms.master_provider_id=pm.id
  );

INSERT INTO public.provider_source_catalog
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
  updated_at=now();

INSERT INTO public.provider_raw_records
  (source_key, source_record_id, content_hash, raw_payload, raw_text, status)
SELECT
  'healthsites_osm',
  t.source_record_id,
  md5(to_jsonb(t)::text),
  jsonb_build_object(
    'source_record_id', t.source_record_id,
    'source_url', t.source_url,
    'name', t.name,
    'country_code', t.country_code,
    'lat', t.lat,
    'lng', t.lng
  ),
  '',
  'raw_loaded'
FROM public.source5_import_staging t;

INSERT INTO public.provider_stage_records (
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
  t.capability_tags, t.quality_score, 'staged',
  jsonb_build_object('source_record_id',t.source_record_id,'master_key',t.master_key,'country_code',t.country_code)
FROM public.source5_import_staging t
JOIN LATERAL (
  SELECT id FROM public.provider_raw_records r
  WHERE r.source_key='healthsites_osm' AND r.source_record_id=t.source_record_id
  ORDER BY r.created_at ASC LIMIT 1
) r ON true
WHERE NOT EXISTS (
  SELECT 1 FROM public.provider_stage_records s
  WHERE s.source_key='healthsites_osm' AND s.source_record_id=t.source_record_id
);

UPDATE public.provider_stage_records s
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
    normalized_payload=jsonb_build_object('source_record_id',t.source_record_id,'master_key',t.master_key,'country_code',t.country_code),
    updated_at=now()
FROM public.source5_import_staging t
WHERE s.source_key='healthsites_osm'
  AND s.source_record_id=t.source_record_id;

INSERT INTO public.provider_master (
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
FROM (
  SELECT DISTINCT ON (master_key) *
  FROM public.source5_import_staging
  ORDER BY master_key, quality_score DESC NULLS LAST, source_record_id
) dedup
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
  updated_at=now();

-- Bulk source linking looks up every staged Healthsites record by source id.
-- Keep that lookup indexed so a ~144k-row project remains set-scale instead of
-- repeatedly scanning the entire staging table.
CREATE INDEX IF NOT EXISTS idx_provider_stage_records_source_record
  ON public.provider_stage_records(source_key, source_record_id);

ANALYZE public.provider_stage_records;
ANALYZE public.provider_raw_records;

INSERT INTO public.provider_master_sources (
  master_provider_id, stage_record_id, raw_record_id, source_key,
  source_record_id, source_url, source_confidence_score, raw_payload
)
SELECT
  pm.id, s.id, r.id, 'healthsites_osm', t.source_record_id,
  t.source_url, t.quality_score,
  jsonb_build_object('source_record_id',t.source_record_id,'master_key',t.master_key,'country_code',t.country_code)
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
  updated_at=now();

INSERT INTO public.provider_master_types
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
  );

INSERT INTO public.medical_providers (
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
  jsonb_build_object('provider_master_key',master_key,'source_key','healthsites_osm','source_record_id',source_record_id,'source_url',source_url),
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
  updated_at=now();

SELECT (
  (SELECT COUNT(DISTINCT r.source_record_id)
   FROM public.provider_raw_records r
   WHERE r.source_key='healthsites_osm') = :expected::bigint
  AND (SELECT COUNT(*) FROM public.provider_stage_records
       WHERE source_key='healthsites_osm') = :expected::bigint
  AND (SELECT COUNT(DISTINCT master_provider_id)
       FROM public.provider_master_sources
       WHERE source_key='healthsites_osm') = :expected_master::bigint
  AND (SELECT COUNT(*) FROM public.provider_master_sources
       WHERE source_key='healthsites_osm') = :expected::bigint
  AND (SELECT COUNT(*) FROM public.medical_providers
       WHERE data_source='Healthsites / OpenStreetMap') = :expected::bigint
  AND (SELECT COUNT(*) FROM public.provider_master_sources pms
       JOIN public.provider_master pm ON pm.id=pms.master_provider_id
       WHERE pms.source_key='healthsites_osm'
         AND (pm.name IS NULL OR btrim(pm.name)='' OR pm.lat IS NULL OR pm.lng IS NULL
           OR pm.lat NOT BETWEEN -90 AND 90 OR pm.lng NOT BETWEEN -180 AND 180)) = 0
  AND (SELECT COUNT(*) FROM public.provider_master_types pmt
       JOIN public.provider_master pm ON pm.id=pmt.master_provider_id
       LEFT JOIN public.provider_type_catalog c ON c.type_key=pmt.type_key
       WHERE pmt.source_key='healthsites_osm' AND c.type_key IS NULL) = 0
) AS production_ok
\gset

\if :production_ok
\else
  \echo 'Healthsites world production reconciliation failed'
  ROLLBACK;
  \quit 3
\endif

TRUNCATE public.source5_import_staging;
COMMIT;
