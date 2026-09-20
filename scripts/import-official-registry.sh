#!/usr/bin/env bash
set -euo pipefail

: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL is required}"
: "${REGISTRY_TSV:?REGISTRY_TSV is required}"
: "${REGISTRY_EXPECTED:?REGISTRY_EXPECTED is required}"
: "${REGISTRY_SOURCE_KEY:?REGISTRY_SOURCE_KEY is required}"
: "${REGISTRY_COUNTRY_CODE:?REGISTRY_COUNTRY_CODE is required}"

columns="source_record_id,source_url,name,normalized_name,address_line1,formatted_address,city,state_region,postal_code,country_code,lat,lng,phone,website,email,primary_provider_type,capability_tags,quality_score,master_key"

psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/official-registry-schema.sql

# Each country owns its database. Replacing this one compact table avoids the
# several-fold storage duplication of the shared canonical provider schema.
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -c "TRUNCATE public.official_registry_providers"
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -c "\\copy public.official_registry_providers (${columns}) FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER E'\\t', NULL '\\N', QUOTE '\"', ESCAPE '\"')" \
  < "$REGISTRY_TSV"

actual="$(psql "$TARGET_DATABASE_URL" -Atqc "
  SELECT count(*)
  FROM public.official_registry_providers
  WHERE country_code = '${REGISTRY_COUNTRY_CODE}'
    AND name IS NOT NULL AND btrim(name) <> ''
    AND lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180
")"
[[ "$actual" == "$REGISTRY_EXPECTED" ]] || {
  echo "Registry import mismatch ${actual} vs ${REGISTRY_EXPECTED}" >&2
  exit 1
}

psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -v source_key="$REGISTRY_SOURCE_KEY" \
  -v country_code="$REGISTRY_COUNTRY_CODE" \
  -v record_count="$actual" \
  -c "
    INSERT INTO public.official_registry_metadata
      (source_key, country_code, record_count, synchronized_at)
    VALUES (:'source_key', :'country_code', :'record_count'::bigint, now())
    ON CONFLICT (source_key) DO UPDATE SET
      country_code = EXCLUDED.country_code,
      record_count = EXCLUDED.record_count,
      synchronized_at = EXCLUDED.synchronized_at
  "

echo "Imported ${actual} ${REGISTRY_SOURCE_KEY} providers"
