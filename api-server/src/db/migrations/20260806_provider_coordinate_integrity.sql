-- Provider coordinate/data integrity hardening (#172)
-- Safe installation only: adds metadata/constraints/indexes and conservatively maps
-- legacy coordinate labels. It does not fabricate precision or delete providers.

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS quarantine_status text NOT NULL DEFAULT 'accepted',
  ADD COLUMN IF NOT EXISTS integrity_findings jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS providers_quarantine_status_idx
  ON providers (quarantine_status);

ALTER TABLE provider_locations
  ALTER COLUMN state TYPE varchar(64),
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS coordinate_source text;

UPDATE provider_locations
SET coordinate_status = CASE
  WHEN coordinate_status = 'imported' AND lat IS NOT NULL AND lng IS NOT NULL THEN 'verified_exact'
  WHEN coordinate_status = 'geocoded' AND lat IS NOT NULL AND lng IS NOT NULL THEN 'verified_address'
  WHEN coordinate_status IN ('verified_exact','verified_address','city_centroid','unverified','invalid') THEN coordinate_status
  WHEN lat IS NOT NULL AND lng IS NOT NULL THEN 'verified_address'
  ELSE 'unverified'
END;

UPDATE provider_locations
SET coordinate_status = 'invalid'
WHERE (lat IS NULL) <> (lng IS NULL)
   OR lat < -90 OR lat > 90
   OR lng < -180 OR lng > 180;

CREATE INDEX IF NOT EXISTS provider_locations_country_idx
  ON provider_locations (country);
CREATE INDEX IF NOT EXISTS provider_locations_coordinate_status_idx
  ON provider_locations (coordinate_status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'provider_locations_coordinate_status_check'
  ) THEN
    ALTER TABLE provider_locations
      ADD CONSTRAINT provider_locations_coordinate_status_check
      CHECK (coordinate_status IN ('verified_exact','verified_address','city_centroid','unverified','invalid')) NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'provider_locations_coordinate_pair_check'
  ) THEN
    ALTER TABLE provider_locations
      ADD CONSTRAINT provider_locations_coordinate_pair_check
      CHECK (
        (lat IS NULL AND lng IS NULL)
        OR (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
      ) NOT VALID;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS provider_sources_provider_source_external_unique
  ON provider_sources (provider_id, source_id, external_id)
  WHERE external_id IS NOT NULL;

-- Do not validate pre-existing rows automatically. Validation is an explicit
-- post-audit operation after integrity findings/quarantine reconciliation.
