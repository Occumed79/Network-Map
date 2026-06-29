-- Service presence support for the Network Map.
-- These indexes keep global provider viewport searches usable when filtering by service type.

CREATE INDEX IF NOT EXISTS idx_medical_providers_bounds
  ON public.medical_providers (lat, lng);

CREATE INDEX IF NOT EXISTS idx_medical_providers_lower_category
  ON public.medical_providers (LOWER(category));

CREATE INDEX IF NOT EXISTS idx_medical_providers_lower_source_type
  ON public.medical_providers (LOWER(source_type));

CREATE INDEX IF NOT EXISTS idx_medical_providers_lower_data_source
  ON public.medical_providers (LOWER(data_source));

CREATE INDEX IF NOT EXISTS idx_medical_providers_country_region
  ON public.medical_providers (country_code, administrative_area_level_1, locality);
