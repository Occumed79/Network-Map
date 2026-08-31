#!/usr/bin/env python3
import csv, hashlib, json, math, os, re, sqlite3, subprocess, sys

SQLITE_PATH = sys.argv[1] if len(sys.argv) > 1 else "overture_cleaned_usa.sqlite"
DATABASE_URL = os.environ.get("DATABASE_URL", "")
BATCH_SIZE = int(os.environ.get("OVERTURE_BATCH_SIZE", "5000"))
TSV_PATH = "/tmp/overture_candidate_batch.tsv"
SQL_PATH = "/tmp/overture_candidate_batch.sql"

if not DATABASE_URL.startswith("postgres"):
    raise SystemExit("DATABASE_URL is missing")

VALID_TYPES = {
    "urgent_care", "occupational_health", "dentist", "cardiology", "public_health", "hospital",
    "hearing_aid", "imaging", "concierge_medicine", "lab", "audiology", "ent", "family_practice",
    "psychiatry", "pulmonology", "sports_medicine"
}
PLACEHOLDERS = {"nan", "null", "none", "n/a", "na", "unnamed", "unnamed clinic"}


def txt(v):
    return "" if v is None else str(v).strip()


def norm_name(v):
    return re.sub(r"[^a-z0-9]+", " ", txt(v).lower()).strip()


def js_hash_payload(name, address, city, state, postal, lat, lng):
    payload = {
        "name": name,
        "address": address.lower(),
        "city": city.lower(),
        "state": state.lower(),
        "postal": postal,
        "lat": lat,
        "lng": lng,
    }
    raw = json.dumps(payload, separators=(",", ":"), ensure_ascii=False, allow_nan=False)
    return "loc:" + hashlib.sha256(raw.encode("utf-8")).hexdigest()


def valid_coord(lat, lng):
    return (
        lat is not None and lng is not None
        and math.isfinite(float(lat)) and math.isfinite(float(lng))
        and -90 <= float(lat) <= 90 and -180 <= float(lng) <= 180
        and (float(lat) != 0 or float(lng) != 0)
    )


def psql_scalar(query):
    return subprocess.check_output(
        ["psql", DATABASE_URL, "-Atqc", query], text=True
    ).strip()


SETUP_SQL = r"""
\set ON_ERROR_STOP on
INSERT INTO public.provider_source_catalog
  (source_key, display_name, source_kind, trust_tier, active, notes)
VALUES
  ('overture','Overture Maps','external_directory','directory',true,
   'Overture Maps U.S. healthcare provider import from release 2026-08-19.0')
ON CONFLICT (source_key) DO UPDATE SET
  display_name=EXCLUDED.display_name,
  source_kind=EXCLUDED.source_kind,
  trust_tier=EXCLUDED.trust_tier,
  active=true,
  notes=EXCLUDED.notes,
  updated_at=now();

-- These secondary indexes are intentionally omitted during the constrained 512 MB bulk load.
-- Primary/unique indexes required for identity and idempotency remain in place.
DROP INDEX IF EXISTS public.provider_master_state_idx;
DROP INDEX IF EXISTS public.provider_master_name_idx;
DROP INDEX IF EXISTS public.provider_master_sources_master_idx;
DROP INDEX IF EXISTS public.provider_master_sources_source_idx;
DROP INDEX IF EXISTS public.provider_master_types_type_idx;
"""
subprocess.run(["psql", DATABASE_URL, "-v", "ON_ERROR_STOP=1"], input=SETUP_SQL, text=True, check=True)

BATCH_SQL = r"""
\set ON_ERROR_STOP on
BEGIN;
CREATE TEMP TABLE overture_import (
  master_key text NOT NULL,
  source_record_id text NOT NULL,
  name text NOT NULL,
  normalized_name text NOT NULL,
  address_line1 text,
  city text,
  state_region text,
  postal_code text,
  country_code text,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  phone text,
  website text,
  email text,
  confidence numeric,
  primary_provider_type text NOT NULL,
  provider_types text NOT NULL
) ON COMMIT DROP;

\copy overture_import FROM '/tmp/overture_candidate_batch.tsv' WITH (FORMAT csv, DELIMITER E'\t', QUOTE '"', ENCODING 'UTF8')

WITH canonical AS (
  SELECT DISTINCT ON (i.master_key) i.*
  FROM overture_import i
  ORDER BY i.master_key, COALESCE(i.confidence,0.5) DESC, i.source_record_id
)
INSERT INTO public.provider_master (
  master_key,name,normalized_name,address_line1,formatted_address,city,state_region,postal_code,country_code,
  lat,lng,phone,website,email,primary_provider_type,capability_tags,primary_source_key,quality_score,
  active,last_seen_at,updated_at
)
SELECT
  i.master_key,i.name,i.normalized_name,NULLIF(i.address_line1,''),NULL,NULLIF(i.city,''),
  NULLIF(i.state_region,''),NULLIF(i.postal_code,''),COALESCE(NULLIF(i.country_code,''),'US'),i.lat,i.lng,
  NULLIF(i.phone,''),NULLIF(i.website,''),NULLIF(i.email,''),i.primary_provider_type,
  ARRAY[i.primary_provider_type]::text[],'overture',COALESCE(i.confidence,0.5),true,now(),now()
FROM canonical i
ON CONFLICT (master_key) DO UPDATE SET
  name=CASE WHEN NULLIF(btrim(provider_master.name),'') IS NULL THEN EXCLUDED.name ELSE provider_master.name END,
  normalized_name=CASE WHEN NULLIF(btrim(provider_master.normalized_name),'') IS NULL THEN EXCLUDED.normalized_name ELSE provider_master.normalized_name END,
  address_line1=COALESCE(NULLIF(provider_master.address_line1,''),EXCLUDED.address_line1),
  city=COALESCE(NULLIF(provider_master.city,''),EXCLUDED.city),
  state_region=COALESCE(NULLIF(provider_master.state_region,''),EXCLUDED.state_region),
  postal_code=COALESCE(NULLIF(provider_master.postal_code,''),EXCLUDED.postal_code),
  country_code=COALESCE(NULLIF(provider_master.country_code,''),EXCLUDED.country_code),
  lat=COALESCE(provider_master.lat,EXCLUDED.lat),
  lng=COALESCE(provider_master.lng,EXCLUDED.lng),
  phone=COALESCE(NULLIF(provider_master.phone,''),EXCLUDED.phone),
  website=COALESCE(NULLIF(provider_master.website,''),EXCLUDED.website),
  email=COALESCE(NULLIF(provider_master.email,''),EXCLUDED.email),
  primary_provider_type=CASE
    WHEN provider_master.primary_provider_type IS NULL OR provider_master.primary_provider_type IN ('','unknown')
    THEN EXCLUDED.primary_provider_type ELSE provider_master.primary_provider_type END,
  primary_source_key=COALESCE(NULLIF(provider_master.primary_source_key,''),'overture'),
  quality_score=GREATEST(COALESCE(provider_master.quality_score,0),COALESCE(EXCLUDED.quality_score,0)),
  active=true,last_seen_at=now(),updated_at=now();

INSERT INTO public.provider_master_types (master_provider_id,type_key,source_key,confidence_score)
SELECT pm.id,t.type_key,'overture',MAX(COALESCE(i.confidence,0.5))
FROM overture_import i
JOIN public.provider_master pm ON pm.master_key=i.master_key
CROSS JOIN LATERAL regexp_split_to_table(i.provider_types,'\|') AS t(type_key)
WHERE t.type_key <> ''
GROUP BY pm.id,t.type_key
ON CONFLICT (master_provider_id,type_key) DO UPDATE SET
  confidence_score=GREATEST(COALESCE(provider_master_types.confidence_score,0),COALESCE(EXCLUDED.confidence_score,0));

WITH source_dedup AS (
  SELECT DISTINCT ON (i.source_record_id) i.*
  FROM overture_import i
  ORDER BY i.source_record_id, COALESCE(i.confidence,0.5) DESC, i.master_key
)
INSERT INTO public.provider_master_sources (
  master_provider_id,source_key,source_record_id,source_url,source_confidence_score,raw_payload,updated_at
)
SELECT
  pm.id,'overture',i.source_record_id,NULL,COALESCE(i.confidence,0.5),'{}'::jsonb,now()
FROM source_dedup i
JOIN public.provider_master pm ON pm.master_key=i.master_key
ON CONFLICT (source_key,source_record_id) WHERE source_record_id IS NOT NULL DO UPDATE SET
  master_provider_id=EXCLUDED.master_provider_id,
  source_confidence_score=GREATEST(COALESCE(provider_master_sources.source_confidence_score,0),COALESCE(EXCLUDED.source_confidence_score,0)),
  updated_at=now();

COMMIT;
"""
with open(SQL_PATH, "w", encoding="utf-8") as f:
    f.write(BATCH_SQL)


def transformed(row):
    oid,name,address,city,state,postal,country,phone,website,email,lat,lng,confidence,primary,types = row
    name = txt(name)
    nn = norm_name(name)
    if not nn or nn in PLACEHOLDERS or not valid_coord(lat, lng):
        return None
    address, city, state, postal = txt(address), txt(city), txt(state).upper(), txt(postal)
    country = txt(country).upper() or "US"
    primary = txt(primary)
    type_list = []
    for t in txt(types).split("|"):
        t = t.strip()
        if t in VALID_TYPES and t not in type_list:
            type_list.append(t)
    if primary not in VALID_TYPES:
        primary = type_list[0] if type_list else "hospital"
    if primary not in type_list:
        type_list.insert(0, primary)
    master_key = js_hash_payload(nn, address, city, state, postal, float(lat), float(lng))
    return [
        master_key, txt(oid), name, nn, address, city, state, postal, country,
        float(lat), float(lng), txt(phone), txt(website), txt(email).lower(),
        float(confidence) if confidence is not None else 0.5, primary, "|".join(type_list)
    ]


def flush_batch(batch, batch_no, processed, skipped):
    with open(TSV_PATH, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, delimiter="\t", quotechar='"', quoting=csv.QUOTE_MINIMAL, lineterminator="\n")
        w.writerows(batch)
    subprocess.run(["psql", DATABASE_URL, "-v", "ON_ERROR_STOP=1", "-f", SQL_PATH], check=True)
    size = psql_scalar("SELECT pg_size_pretty(pg_database_size(current_database()))")
    master_rows = psql_scalar("SELECT count(*) FROM public.provider_master WHERE primary_source_key='overture'")
    print(
        f"batch={batch_no} processed={processed:,} skipped={skipped:,} "
        f"overture_master_rows={master_rows} db_size={size}",
        flush=True,
    )

con = sqlite3.connect(SQLITE_PATH)
cur = con.execute("""
SELECT overture_id,name,address,city,state,postal_code,country_code,phone,website,email,
       latitude,longitude,confidence,primary_provider_type,provider_types
FROM accepted ORDER BY overture_id
""")

batch = []
processed = skipped = batch_no = 0
for row in cur:
    out = transformed(row)
    if out is None:
        skipped += 1
        continue
    batch.append(out)
    processed += 1
    if len(batch) >= BATCH_SIZE:
        batch_no += 1
        flush_batch(batch, batch_no, processed, skipped)
        batch.clear()
if batch:
    batch_no += 1
    flush_batch(batch, batch_no, processed, skipped)
con.close()

print(f"Prepared/imported {processed:,} Overture providers; skipped {skipped:,}", flush=True)

checks = {
    "overture_source_relationships": "SELECT count(*) FROM public.provider_master_sources WHERE source_key='overture'",
    "overture_distinct_providers": "SELECT count(DISTINCT master_provider_id) FROM public.provider_master_sources WHERE source_key='overture'",
    "overture_type_relationships": "SELECT count(*) FROM public.provider_master_types pmt JOIN (SELECT DISTINCT master_provider_id FROM public.provider_master_sources WHERE source_key='overture') s USING (master_provider_id)",
    "overture_map_visible": "SELECT count(DISTINCT v.id) FROM public.provider_master_map_view v JOIN public.provider_master_sources s ON s.master_provider_id=v.id WHERE s.source_key='overture'",
    "database_size": "SELECT pg_size_pretty(pg_database_size(current_database()))",
}
for label, query in checks.items():
    print(f"{label}={psql_scalar(query)}", flush=True)
