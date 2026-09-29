-- AUTO_SAVE_DATABASE only: search/cache index.
-- Apply with api-server/scripts/apply-autosave-cache-schema.ts.
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
