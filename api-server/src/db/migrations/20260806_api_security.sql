-- Distributed API security/audit primitives (#174). No provider data changes.

CREATE TABLE IF NOT EXISTS public.api_rate_limit_buckets (
  bucket_key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  window_seconds integer NOT NULL CHECK (window_seconds > 0),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS api_rate_limit_updated_idx ON public.api_rate_limit_buckets(updated_at);

CREATE TABLE IF NOT EXISTS public.api_idempotency_keys (
  idempotency_key text PRIMARY KEY,
  route_key text NOT NULL,
  request_hash text NOT NULL,
  response_status integer,
  response_body jsonb,
  state text NOT NULL DEFAULT 'processing',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
CREATE INDEX IF NOT EXISTS api_idempotency_expiry_idx ON public.api_idempotency_keys(expires_at);

CREATE TABLE IF NOT EXISTS public.api_write_audit (
  id bigserial PRIMARY KEY,
  request_id text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  method text NOT NULL,
  path text NOT NULL,
  capability text NOT NULL,
  actor text,
  idempotency_key text,
  status_code integer,
  duration_ms integer,
  body_hash text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS api_write_audit_request_idx ON public.api_write_audit(request_id);
CREATE INDEX IF NOT EXISTS api_write_audit_occurred_idx ON public.api_write_audit(occurred_at DESC);
CREATE INDEX IF NOT EXISTS api_write_audit_path_idx ON public.api_write_audit(path,occurred_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='api_idempotency_state_check') THEN
    ALTER TABLE public.api_idempotency_keys ADD CONSTRAINT api_idempotency_state_check
      CHECK (state IN ('processing','completed','failed')) NOT VALID;
  END IF;
END $$;
