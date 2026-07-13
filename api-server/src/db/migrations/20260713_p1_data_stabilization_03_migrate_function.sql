-- P1 data stabilization, step 3 of 4.
-- One top-level function statement so migration tooling does not split a dollar-quoted body.

CREATE OR REPLACE FUNCTION public.network_map_migrate_legacy_batch(
  p_limit integer DEFAULT 1000
)
RETURNS jsonb
LANGUAGE plpgsql
AS $network_map_migrate_legacy_batch$
DECLARE
  cursor_id bigint := 0;
  processed integer := 0;
  last_id bigint := 0;
  eligible_count bigint := 0;
  canonical_count bigint := 0;
  lineage_count bigint := 0;
  migration_done boolean := false;
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

  IF processed > 0 THEN
    WITH batch AS MATERIALIZED (
      SELECT *
      FROM public.provider_legacy_normalized
      WHERE legacy_id > cursor_id
      ORDER BY legacy_id
      LIMIT GREATEST(COALESCE(p_limit, 1000), 1)
    ), deduped AS (
      SELECT DISTINCT ON (master_key) *
      FROM batch
      ORDER BY master_key, quality_score DESC, legacy_id ASC
    )
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
      master_key,
      name,
      normalized_name,
      formatted_address,
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
      CASE
        WHEN cardinality(capability_tags) > 0 THEN capability_tags
        ELSE ARRAY[primary_provider_type]
      END,
      source_key,
      quality_score,
      true,
      last_seen_at,
      now()
    FROM deduped
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
          WHEN provider_master.primary_provider_type IS NULL
            OR provider_master.primary_provider_type = 'unknown'
          THEN EXCLUDED.primary_provider_type
          ELSE provider_master.primary_provider_type
        END,
        capability_tags = ARRAY(
          SELECT DISTINCT value
          FROM unnest(
            provider_master.capability_tags || EXCLUDED.capability_tags
          ) value
          WHERE value IS NOT NULL AND value <> ''
        ),
        primary_source_key = COALESCE(
          provider_master.primary_source_key,
          EXCLUDED.primary_source_key
        ),
        quality_score = GREATEST(
          COALESCE(provider_master.quality_score, 0),
          COALESCE(EXCLUDED.quality_score, 0)
        ),
        active = true,
        last_seen_at = GREATEST(
          provider_master.last_seen_at,
          EXCLUDED.last_seen_at
        ),
        updated_at = now();

    WITH batch AS MATERIALIZED (
      SELECT *
      FROM public.provider_legacy_normalized
      WHERE legacy_id > cursor_id
      ORDER BY legacy_id
      LIMIT GREATEST(COALESCE(p_limit, 1000), 1)
    ), deduped AS (
      SELECT DISTINCT ON (source_key, source_record_id) *
      FROM batch
      ORDER BY source_key, source_record_id, quality_score DESC, legacy_id ASC
    )
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
      d.source_key,
      d.source_record_id,
      COALESCE(
        d.website,
        d.raw_payload->>'source_url',
        d.raw_payload->>'url'
      ),
      d.quality_score,
      d.raw_payload || jsonb_build_object(
        '_legacy_medical_provider_id',
        d.legacy_id
      ),
      now()
    FROM deduped d
    JOIN public.provider_master pm ON pm.master_key = d.master_key
    ON CONFLICT (source_key, source_record_id)
      WHERE source_record_id IS NOT NULL
    DO UPDATE
    SET master_provider_id = EXCLUDED.master_provider_id,
        source_url = COALESCE(
          EXCLUDED.source_url,
          provider_master_sources.source_url
        ),
        source_confidence_score = GREATEST(
          COALESCE(provider_master_sources.source_confidence_score, 0),
          COALESCE(EXCLUDED.source_confidence_score, 0)
        ),
        raw_payload = EXCLUDED.raw_payload,
        updated_at = now();

    WITH batch AS MATERIALIZED (
      SELECT *
      FROM public.provider_legacy_normalized
      WHERE legacy_id > cursor_id
      ORDER BY legacy_id
      LIMIT GREATEST(COALESCE(p_limit, 1000), 1)
    )
    INSERT INTO public.provider_master_types (
      master_provider_id,
      type_key,
      source_key,
      confidence_score
    )
    SELECT DISTINCT
      pm.id,
      b.primary_provider_type,
      b.source_key,
      b.quality_score
    FROM batch b
    JOIN public.provider_master pm ON pm.master_key = b.master_key
    ON CONFLICT (master_provider_id, type_key) DO UPDATE
    SET source_key = EXCLUDED.source_key,
        confidence_score = GREATEST(
          COALESCE(provider_master_types.confidence_score, 0),
          COALESCE(EXCLUDED.confidence_score, 0)
        );

    UPDATE public.provider_schema_state
       SET migration_after_legacy_id = last_id,
           updated_at = now()
     WHERE id = 1;
  END IF;

  SELECT count(*) INTO eligible_count
  FROM public.provider_map_eligible;

  SELECT count(*) INTO canonical_count
  FROM public.provider_master_map_view;

  SELECT count(*) INTO lineage_count
  FROM public.provider_master_sources
  WHERE raw_payload ? '_legacy_medical_provider_id';

  SELECT NOT EXISTS (
    SELECT 1
    FROM public.provider_legacy_normalized
    WHERE legacy_id > last_id
  ) INTO migration_done;

  UPDATE public.provider_schema_state
     SET expected_eligible_rows = eligible_count,
         migrated_eligible_rows = lineage_count,
         migration_completed_at = CASE
           WHEN migration_done THEN COALESCE(migration_completed_at, now())
           ELSE NULL
         END,
         updated_at = now()
   WHERE id = 1;

  RETURN jsonb_build_object(
    'processed', processed,
    'afterLegacyId', last_id,
    'eligibleLegacyRows', eligible_count,
    'canonicalMapRows', canonical_count,
    'sourceLineageRows', lineage_count,
    'complete', migration_done
  );
END
$network_map_migrate_legacy_batch$;

COMMENT ON FUNCTION public.network_map_migrate_legacy_batch(integer) IS
  'Idempotently migrates one map-eligible legacy batch into provider_master with source and type lineage.';
