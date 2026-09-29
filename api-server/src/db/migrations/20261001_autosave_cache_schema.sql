-- Autosave search cache and provider shard schema.
-- Applies to AUTO_SAVE_DATABASE (search/cache index) and
-- AUTO_SAVE_DATABASE_2 / AUTO_SAVE_DATABASE_3 (provider shards).
-- Safe/idempotent: never drops or rewrites existing rows.

-- ─────────────────────────────────────────────────────────────────────────────
-- AUTO_SAVE_DATABASE: search cache index
-- Run this SQL against the AUTO_SAVE_DATABASE connection.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS autosave_search_cache (
  search_key         text        PRIMARY KEY,
  source_mode        text        NOT NULL DEFAULT 'liveFinder',
  service_category   text        NOT NULL DEFAULT 'all',
  query_text         text        NOT NULL DEFAULT '',
  center_lat         double precision,
  center_lng         double precision,
  radius_miles       double precision,
  normalized_request jsonb       NOT NULL DEFAULT '{}'::jsonb,
  result_refs        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  result_count       integer     NOT NULL DEFAULT 0,
  first_seen_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at       timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz NOT NULL DEFAULT (now() + interval '168 hours'),
  cache_hits         bigint      NOT NULL DEFAULT 0,
  external_calls_avoided bigint  NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_autosave_cache_expires ON autosave_search_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_autosave_cache_source_mode ON autosave_search_cache (source_mode);
CREATE INDEX IF NOT EXISTS idx_autosave_cache_center ON autosave_search_cache (center_lat, center_lng);

-- ─────────────────────────────────────────────────────────────────────────────
-- AUTO_SAVE_DATABASE_2 / AUTO_SAVE_DATABASE_3: provider record shards
-- Run this SQL against EACH shard connection (both databases).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS autosave_providers (
  provider_key       text        PRIMARY KEY,
  source             text        NOT NULL,
  source_id          text,
  name               text        NOT NULL,
  normalized_name    text        NOT NULL,
  clinic_type        text        NOT NULL DEFAULT 'unknown',
  services           text[]      NOT NULL DEFAULT ARRAY[]::text[],
  categories         text[]      NOT NULL DEFAULT ARRAY[]::text[],
  address            text,
  city               text,
  admin_area         text,
  country            text,
  postal_code        text,
  lat                double precision,
  lng                double precision,
  phone              text,
  website            text,
  source_url         text,
  confidence_score   numeric,
  raw_source_data    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at       timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_autosave_providers_source ON autosave_providers (source);
CREATE INDEX IF NOT EXISTS idx_autosave_providers_normalized_name ON autosave_providers (normalized_name);
CREATE INDEX IF NOT EXISTS idx_autosave_providers_lat_lng ON autosave_providers (lat, lng);
CREATE INDEX IF NOT EXISTS idx_autosave_providers_source_id ON autosave_providers (source, source_id) WHERE source_id IS NOT NULL;

-- Schema version tracking (uses provider_master DB convention where available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migration_versions') THEN
    INSERT INTO public.schema_migration_versions(version, checksum)
    VALUES ('20261001_autosave_cache_schema', 'tracked-by-repository')
    ON CONFLICT (version) DO NOTHING;
  END IF;
END$$;
