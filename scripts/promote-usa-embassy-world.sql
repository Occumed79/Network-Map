\set ON_ERROR_STOP on
BEGIN;

SELECT (
  COUNT(*) = :expected::bigint
  AND COUNT(DISTINCT source_record_id) = :expected::bigint
  AND COUNT(DISTINCT master_key) = :expected_master::bigint
  AND BOOL_AND(source_record_id LIKE 'usembassy-%')
  AND BOOL_AND(name IS NOT NULL AND btrim(name)<>'')
  AND BOOL_AND(lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
) AS staging_ok
FROM public.source5_import_staging
\gset

\if :staging_ok
\else
  \echo 'USA Embassy staging validation failed'
  ROLLBACK;
  \quit 2
\endif

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

CREATE TEMP TABLE embassy_old_master_ids ON COMMIT DROP AS
SELECT DISTINCT master_provider_id
FROM public.provider_master_sources
WHERE source_key='embassy_clinic_docs';

DELETE FROM public.provider_master_sources
WHERE source_key='embassy_clinic_docs';

DELETE FROM public.provider_master_types
WHERE source_key='embassy_clinic_docs';

DELETE FROM public.medical_providers
WHERE data_source='U.S. Embassy Medical Provider Lists';

DELETE FROM public.provider_stage_records
WHERE source_key='embassy_clinic_docs';

DELETE FROM public.provider_raw_records
WHERE source_key='embassy_clinic_docs';

DELETE FROM public.provider_master pm
USING embassy_old_master_ids old
WHERE pm.id=old.master_provider_id
  AND NOT EXISTS (
    SELECT 1 FROM public.provider_master_sources pms
    WHERE pms.master_provider_id=pm.id
  );

INSERT INTO public.provider_source_catalog
  (source_key, display_name, source_kind, trust_tier, active, notes)
VALUES
  ('embassy_clinic_docs', 'U.S. Embassy Medical Provider Lists', 'document_extraction', 'registry', true,
   'Medical provider directories extracted from U.S. Embassy and consular source documents; geocoded and normalized for Network Map')
ON CONFLICT (source_key) DO UPDATE SET
  display_name=EXCLUDED.display_name,
  source_kind=EXCLUDED.source_kind,
  trust_tier=EXCLUDED.trust_tier,
  active=true,
  notes=EXCLUDED.notes,
  updated_at=now();

-- The final XLSX workbooks remain the raw source artifact. Keep compact lineage
-- in Postgres instead of duplicating the entire workbook row in JSONB.
INSERT INTO public.provider_raw_records
  (source_key, source_record_id, content_hash, raw_payload, raw_text, status)
SELECT
  'embassy_clinic_docs',
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
  r.id, 'embassy_clinic_docs', t.source_record_id, t.name,
  NULLIF(t.normalized_name,''), t.country_code, t.lat, t.lng,
  t.primary_provider_type, t.capability_tags, t.quality_score, 'staged',
  jsonb_build_object('master_key', t.master_key)
FROM public.source5_import_staging t
JOIN public.provider_raw_records r
  ON r.source_key='embassy_clinic_docs'
 AND r.source_record_id=t.source_record_id;

INSERT INTO public.provider_master (
  master_key, name, normalized_name, address_line1, formatted_address,
  city, state_region, postal_code, country_code, lat, lng, phone,
  website, email, primary_provider_type, capability_tags,
  primary_source_key, quality_score, active, last_seen_at, updated_at
)
SELECT
  master_key, name, NULLIF(normalized_name,''), NULLIF(address_line1,''),
  NULLIF(formatted_address,''), NULLIF(city,''), NULLIF(state_region,''),
  NULLIF(postal_code,''), country_code, lat, lng, NULLIF(phone,''),
  NULLIF(website,''), NULLIF(email,''), primary_provider_type,
  capability_tags, 'embassy_clinic_docs', quality_score, true, now(), now()
FROM (
  SELECT DISTINCT ON (master_key) *
  FROM public.source5_import_staging
  ORDER BY master_key, quality_score DESC NULLS LAST, source_record_id
) dedup
ON CONFLICT (master_key) DO UPDATE SET
  name=EXCLUDED.name,
  normalized_name=COALESCE(EXCLUDED.normalized_name, provider_master.normalized_name),
  address_line1=COALESCE(EXCLUDED.address_line1, provider_master.address_line1),
  formatted_address=COALESCE(EXCLUDED.formatted_address, provider_master.formatted_address),
  city=COALESCE(EXCLUDED.city, provider_master.city),
  state_region=COALESCE(EXCLUDED.state_region, provider_master.state_region),
  postal_code=COALESCE(EXCLUDED.postal_code, provider_master.postal_code),
  country_code=EXCLUDED.country_code,
  lat=EXCLUDED.lat,
  lng=EXCLUDED.lng,
  phone=COALESCE(EXCLUDED.phone, provider_master.phone),
  website=COALESCE(EXCLUDED.website, provider_master.website),
  email=COALESCE(EXCLUDED.email, provider_master.email),
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

CREATE INDEX IF NOT EXISTS idx_provider_stage_records_source_record
  ON public.provider_stage_records(source_key, source_record_id);

ANALYZE public.provider_stage_records;
ANALYZE public.provider_raw_records;
ANALYZE public.provider_master;

INSERT INTO public.provider_master_sources (
  master_provider_id, stage_record_id, raw_record_id, source_key,
  source_record_id, source_url, source_confidence_score, raw_payload
)
SELECT
  pm.id, s.id, r.id, 'embassy_clinic_docs', t.source_record_id,
  NULLIF(t.source_url,''), t.quality_score, '{}'::jsonb
FROM public.source5_import_staging t
JOIN public.provider_master pm
  ON pm.master_key=t.master_key
JOIN public.provider_raw_records r
  ON r.source_key='embassy_clinic_docs'
 AND r.source_record_id=t.source_record_id
JOIN public.provider_stage_records s
  ON s.source_key='embassy_clinic_docs'
 AND s.source_record_id=t.source_record_id
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
SELECT
  pm.id,
  type_key,
  'embassy_clinic_docs',
  MAX(t.quality_score)
FROM public.source5_import_staging t
JOIN public.provider_master pm ON pm.master_key=t.master_key
CROSS JOIN LATERAL unnest(ARRAY[t.primary_provider_type] || t.capability_tags) type_key
WHERE type_key IS NOT NULL AND type_key<>''
  AND EXISTS (SELECT 1 FROM public.provider_type_catalog c WHERE c.type_key=type_key)
GROUP BY pm.id, type_key
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
  'embassy_clinic_docs:' || source_record_id, name, NULLIF(formatted_address,''),
  lat, lng, capability_tags, primary_provider_type, NULLIF(phone,''), NULLIF(website,''),
  country_code, NULLIF(city,''), NULLIF(state_region,''), NULLIF(postal_code,''),
  'U.S. Embassy Medical Provider Lists', 'embassy_clinic_docs:' || source_record_id,
  'document_extraction', quality_score::double precision,
  NULL,
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
   WHERE r.source_key='embassy_clinic_docs') = :expected::bigint
  AND (SELECT COUNT(*) FROM public.provider_stage_records
       WHERE source_key='embassy_clinic_docs') = :expected::bigint
  AND (SELECT COUNT(DISTINCT master_provider_id)
       FROM public.provider_master_sources
       WHERE source_key='embassy_clinic_docs') = :expected_master::bigint
  AND (SELECT COUNT(*) FROM public.provider_master_sources
       WHERE source_key='embassy_clinic_docs') = :expected::bigint
  AND (SELECT COUNT(*) FROM public.medical_providers
       WHERE data_source='U.S. Embassy Medical Provider Lists') = :expected::bigint
  AND (SELECT COUNT(*) FROM public.provider_master_sources pms
       JOIN public.provider_master pm ON pm.id=pms.master_provider_id
       WHERE pms.source_key='embassy_clinic_docs'
         AND (pm.name IS NULL OR btrim(pm.name)='' OR pm.lat IS NULL OR pm.lng IS NULL
           OR pm.lat NOT BETWEEN -90 AND 90 OR pm.lng NOT BETWEEN -180 AND 180)) = 0
  AND (SELECT COUNT(*) FROM public.provider_master_types pmt
       LEFT JOIN public.provider_type_catalog c ON c.type_key=pmt.type_key
       WHERE pmt.source_key='embassy_clinic_docs' AND c.type_key IS NULL) = 0
) AS production_ok
\gset

\if :production_ok
\else
  \echo 'USA Embassy production reconciliation failed'
  ROLLBACK;
  \quit 3
\endif

TRUNCATE public.source5_import_staging;
COMMIT;
