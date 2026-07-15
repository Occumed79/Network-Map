INSERT INTO public.source5_import_staging (
  source_record_id, source_url, name, normalized_name, address_line1, formatted_address,
  city, state_region, postal_code, country_code, lat, lng, phone, website, email,
  primary_provider_type, capability_tags, quality_score, master_key
) VALUES
('osm:node:5954223632', 'https://www.openstreetmap.org/node/5954223632', 'Zana', 'zana', 'Rruga Rinia', 'Rruga Rinia, Pogradec', 'Pogradec', NULL, NULL, 'AL', 40.9018386, 20.658685, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:b4052d9f5cb1d6b8b21dc9ab6d58642c681eb25bf3a8da998c829ca5d702c790'),
('osm:node:3932079202', 'https://www.openstreetmap.org/node/3932079202', 'Zhabjaku', 'zhabjaku', NULL, 'Shkoder, 4001', 'Shkoder', NULL, '4001', 'AL', 42.068846, 19.5125402, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:bb0bdc7ae2a2b9c3e6321bb11ec717cae7cd032ce3335404c2a165a72e5f29aa'),
('osm:node:4394721616', 'https://www.openstreetmap.org/node/4394721616', 'Zheni', 'zheni', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9014633, 20.6557063, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:ec9807799eede2b051465b514f7996ff33eda9fc37b3a1dd4a492337397fc9e2'),
('osm:node:6377776312', 'https://www.openstreetmap.org/node/6377776312', 'Zhuli', 'zhuli', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6142876, 20.7783183, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:1102c877cc474a26caaa415255a858682e42b438fc0684c03aca08f2ba247b99'),
('osm:node:6806426377', 'https://www.openstreetmap.org/node/6806426377', 'Zirkon', 'zirkon', 'Rruga e Elbasanit', 'Rruga e Elbasanit', NULL, NULL, NULL, 'AL', 41.3002609, 19.8492627, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:5362cbab7c61eaac8af1381f3a6e6a311fb682aaf753242175a20c313b06082f')
ON CONFLICT (source_record_id) DO UPDATE SET
  source_url=EXCLUDED.source_url, name=EXCLUDED.name, normalized_name=EXCLUDED.normalized_name,
  address_line1=EXCLUDED.address_line1, formatted_address=EXCLUDED.formatted_address,
  city=EXCLUDED.city, state_region=EXCLUDED.state_region, postal_code=EXCLUDED.postal_code,
  country_code=EXCLUDED.country_code, lat=EXCLUDED.lat, lng=EXCLUDED.lng, phone=EXCLUDED.phone,
  website=EXCLUDED.website, email=EXCLUDED.email, primary_provider_type=EXCLUDED.primary_provider_type,
  capability_tags=EXCLUDED.capability_tags, quality_score=EXCLUDED.quality_score, master_key=EXCLUDED.master_key;
