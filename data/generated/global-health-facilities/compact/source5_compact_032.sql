INSERT INTO public.source5_import_staging (
  source_record_id, source_url, name, normalized_name, address_line1, formatted_address,
  city, state_region, postal_code, country_code, lat, lng, phone, website, email,
  primary_provider_type, capability_tags, quality_score, master_key
) VALUES
('osm:node:13620947020', 'https://www.openstreetmap.org/node/13620947020', 'Zé Leite', 'z leite', NULL, NULL, NULL, NULL, NULL, 'AO', -15.217302, 12.0817011, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:c9ae7008d1d4aa9ce1909576cda3856b039d50bb98f3ac089b1ffb4355fc7ada')
ON CONFLICT (source_record_id) DO UPDATE SET
  source_url=EXCLUDED.source_url, name=EXCLUDED.name, normalized_name=EXCLUDED.normalized_name,
  address_line1=EXCLUDED.address_line1, formatted_address=EXCLUDED.formatted_address,
  city=EXCLUDED.city, state_region=EXCLUDED.state_region, postal_code=EXCLUDED.postal_code,
  country_code=EXCLUDED.country_code, lat=EXCLUDED.lat, lng=EXCLUDED.lng, phone=EXCLUDED.phone,
  website=EXCLUDED.website, email=EXCLUDED.email, primary_provider_type=EXCLUDED.primary_provider_type,
  capability_tags=EXCLUDED.capability_tags, quality_score=EXCLUDED.quality_score, master_key=EXCLUDED.master_key;
