#!/usr/bin/env python3
import csv, hashlib, json, math, os, re, sqlite3, subprocess, sys, tempfile

SQLITE_PATH = sys.argv[1] if len(sys.argv) > 1 else "overture_cleaned_usa.sqlite"
DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL.startswith("postgres"):
    raise SystemExit("DATABASE_URL is missing")

VALID_TYPES = {
    "urgent_care","occupational_health","dentist","cardiology","public_health","hospital",
    "hearing_aid","imaging","concierge_medicine","lab","audiology","ent","family_practice",
    "psychiatry","pulmonology","sports_medicine"
}
PLACEHOLDERS = {"nan","null","none","n/a","na","unnamed","unnamed clinic"}

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
        lat is not None and lng is not None and
        math.isfinite(float(lat)) and math.isfinite(float(lng)) and
        -90 <= float(lat) <= 90 and -180 <= float(lng) <= 180 and
        (float(lat) != 0 or float(lng) != 0)
    )

con = sqlite3.connect(SQLITE_PATH)
cur = con.execute("""
SELECT overture_id,name,address,city,state,postal_code,country_code,phone,website,email,
       latitude,longitude,confidence,operating_status,primary_provider_type,provider_types,taxonomy
FROM accepted ORDER BY overture_id
""")

fd, tsv_path = tempfile.mkstemp(prefix="overture_candidate_", suffix=".tsv")
os.close(fd)
exported = skipped = 0
with open(tsv_path, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f, delimiter="\t", quotechar='"', quoting=csv.QUOTE_MINIMAL, lineterminator="\n")
    for r in cur:
        oid,name,address,city,state,postal,country,phone,website,email,lat,lng,confidence,status,primary,types,tax = r
        name = txt(name)
        nn = norm_name(name)
        if not nn or nn in PLACEHOLDERS or not valid_coord(lat, lng):
            skipped += 1
            continue
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
        w.writerow([
            master_key, txt(oid), name, nn, address, city, state, postal, country,
            float(lat), float(lng), txt(phone), txt(website), txt(email).lower(),
            float(confidence) if confidence is not None else 0.5, txt(status), primary,
            "|".join(type_list), txt(tax)
        ])
        exported += 1
con.close()
print(f"Prepared {exported:,} Overture providers for direct Neon import; skipped {skipped:,}", flush=True)

sql = r"""
\set ON_ERROR_STOP on
BEGIN;

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
  operating_status text,
  primary_provider_type text NOT NULL,
  provider_types text NOT NULL,
  taxonomy text
) ON COMMIT DROP;

\copy overture_import FROM :'tsv_path' WITH (FORMAT csv, DELIMITER E'\t', QUOTE '"', ENCODING 'UTF8')

INSERT INTO public.provider_master (
  master_key,name,normalized_name,address_line1,formatted_address,city,state_region,postal_code,country_code,
  lat,lng,phone,website,email,primary_provider_type,capability_tags,primary_source_key,quality_score,
  active,last_seen_at,updated_at
)
SELECT
  i.master_key,i.name,i.normalized_name,NULLIF(i.address_line1,''),NULLIF(i.address_line1,''),NULLIF(i.city,''),
  NULLIF(i.state_region,''),NULLIF(i.postal_code,''),COALESCE(NULLIF(i.country_code,''),'US'),i.lat,i.lng,
  NULLIF(i.phone,''),NULLIF(i.website,''),NULLIF(i.email,''),i.primary_provider_type,
  string_to_array(i.provider_types,'|'),'overture',COALESCE(i.confidence,0.5),true,now(),now()
FROM overture_import i
ON CONFLICT (master_key) DO UPDATE SET
  name=CASE WHEN NULLIF(btrim(provider_master.name),'') IS NULL THEN EXCLUDED.name ELSE provider_master.name END,
  normalized_name=CASE WHEN NULLIF(btrim(provider_master.normalized_name),'') IS NULL THEN EXCLUDED.normalized_name ELSE provider_master.normalized_name END,
  address_line1=COALESCE(NULLIF(provider_master.address_line1,''),EXCLUDED.address_line1),
  formatted_address=COALESCE(NULLIF(provider_master.formatted_address,''),EXCLUDED.formatted_address),
  city=COALESCE(NULLIF(provider_master.city,''),EXCLUDED.city),
  state_region=COALESCE(NULLIF(provider_master.state_region,''),EXCLUDED.state_region),
  postal_code=COALESCE(NULLIF(provider_master.postal_code,''),EXCLUDED.postal_code),
  country_code=COALESCE(NULLIF(provider_master.country_code,''),EXCLUDED.country_code),
  lat=COALESCE(provider_master.lat,EXCLUDED.lat),
  lng=COALESCE(provider_master.lng,EXCLUDED.lng),
  phone=COALESCE(NULLIF(provider_master.phone,''),EXCLUDED.phone),
  website=COALESCE(NULLIF(provider_master.website,''),EXCLUDED.website),
  email=COALESCE(NULLIF(provider_master.email,''),EXCLUDED.email),
  primary_provider_type=CASE WHEN provider_master.primary_provider_type IS NULL OR provider_master.primary_provider_type IN ('','unknown') THEN EXCLUDED.primary_provider_type ELSE provider_master.primary_provider_type END,
  capability_tags=ARRAY(
    SELECT DISTINCT v FROM unnest(COALESCE(provider_master.capability_tags,ARRAY[]::text[]) || COALESCE(EXCLUDED.capability_tags,ARRAY[]::text[])) v
    WHERE v IS NOT NULL AND v <> ''
  ),
  primary_source_key=COALESCE(NULLIF(provider_master.primary_source_key,''),'overture'),
  quality_score=GREATEST(COALESCE(provider_master.quality_score,0),COALESCE(EXCLUDED.quality_score,0)),
  active=true,last_seen_at=now(),updated_at=now();

INSERT INTO public.provider_master_types (master_provider_id,type_key,source_key,confidence_score)
SELECT DISTINCT pm.id,t.type_key,'overture',COALESCE(i.confidence,0.5)
FROM overture_import i
JOIN public.provider_master pm ON pm.master_key=i.master_key
CROSS JOIN LATERAL regexp_split_to_table(i.provider_types,'\|') AS t(type_key)
WHERE t.type_key <> ''
ON CONFLICT (master_provider_id,type_key) DO UPDATE SET
  confidence_score=GREATEST(COALESCE(provider_master_types.confidence_score,0),COALESCE(EXCLUDED.confidence_score,0));

INSERT INTO public.provider_master_sources (
  master_provider_id,source_key,source_record_id,source_url,source_confidence_score,raw_payload,updated_at
)
SELECT
  pm.id,'overture',i.source_record_id,NULLIF(i.website,''),COALESCE(i.confidence,0.5),
  jsonb_build_object(
    'source','Overture Maps','source_key','overture','source_record_id',i.source_record_id,
    'name',i.name,'address',i.address_line1,'city',i.city,'state',i.state_region,'postal_code',i.postal_code,
    'country_code',i.country_code,'phone',i.phone,'website',i.website,'email',i.email,'latitude',i.lat,'longitude',i.lng,
    'confidence',i.confidence,'operating_status',i.operating_status,'primary_provider_type',i.primary_provider_type,
    'provider_types',i.provider_types,'taxonomy',i.taxonomy
  ),now()
FROM overture_import i
JOIN public.provider_master pm ON pm.master_key=i.master_key
ON CONFLICT (source_key,source_record_id) WHERE source_record_id IS NOT NULL DO UPDATE SET
  master_provider_id=EXCLUDED.master_provider_id,
  source_url=COALESCE(EXCLUDED.source_url,provider_master_sources.source_url),
  source_confidence_score=GREATEST(COALESCE(provider_master_sources.source_confidence_score,0),COALESCE(EXCLUDED.source_confidence_score,0)),
  raw_payload=EXCLUDED.raw_payload,
  updated_at=now();

COMMIT;
"""

sql_fd, sql_path = tempfile.mkstemp(prefix="overture_direct_", suffix=".sql")
os.close(sql_fd)
with open(sql_path, "w", encoding="utf-8") as f:
    f.write(sql)

subprocess.run([
    "psql", DATABASE_URL, "-v", "ON_ERROR_STOP=1", "-v", f"tsv_path={tsv_path}", "-f", sql_path
], check=True)

checks = {
    "overture_source_relationships": "SELECT count(*) FROM public.provider_master_sources WHERE source_key='overture'",
    "overture_distinct_providers": "SELECT count(DISTINCT master_provider_id) FROM public.provider_master_sources WHERE source_key='overture'",
    "overture_type_relationships": "SELECT count(*) FROM public.provider_master_types pmt JOIN (SELECT DISTINCT master_provider_id FROM public.provider_master_sources WHERE source_key='overture') s USING (master_provider_id)",
    "overture_map_visible": "SELECT count(DISTINCT v.id) FROM public.provider_master_map_view v JOIN public.provider_master_sources s ON s.master_provider_id=v.id WHERE s.source_key='overture'",
}
for label, query in checks.items():
    result = subprocess.check_output(["psql", DATABASE_URL, "-Atqc", query], text=True).strip()
    print(f"{label}={result}", flush=True)
