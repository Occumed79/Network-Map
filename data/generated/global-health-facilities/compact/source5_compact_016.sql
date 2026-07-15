INSERT INTO public.source5_import_staging (
  source_record_id, source_url, name, normalized_name, address_line1, formatted_address,
  city, state_region, postal_code, country_code, lat, lng, phone, website, email,
  primary_provider_type, capability_tags, quality_score, master_key
) VALUES
('osm:node:10941539205', 'https://www.openstreetmap.org/node/10941539205', 'نانی اغا کور', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 31.6853762, 66.0954898, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:ec049b58852ed8e4b3a747d01b307b5ebbe671bba73c8e3f9264cfd843868ea1'),
('osm:node:13310000801', 'https://www.openstreetmap.org/node/13310000801', 'نصر فارمسی', NULL, 'بزرگراه کابل- جلال آباد', 'بزرگراه کابل- جلال آباد', NULL, NULL, NULL, 'AF', 34.5549061, 69.3603773, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:57af54f8a0e7faf750ab4cb36842f60a72fce1d2c58b49f21468531622ded61f'),
('osm:node:11028595725', 'https://www.openstreetmap.org/node/11028595725', 'نوی کوثر درملتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.3376376, 69.9152488, '+93 764 72 44 61; +93 774 47 41 23', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:ee17758e49c26911b3c015f9fdf5e9b84f3b7f27a680d53d20eeb4937a9dd577'),
('osm:node:7883048338', 'https://www.openstreetmap.org/node/7883048338', 'نوی مکرویان درملتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5269485, 69.208102, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:ecdabedb335f34717afea3f78f04de90f0b55286a8ccac0b61d5f04700266cfb'),
('osm:node:6609531888', 'https://www.openstreetmap.org/node/6609531888', 'یسرا روغتون', NULL, NULL, 'كابل', 'كابل', NULL, NULL, 'AF', 34.5643933, 69.1444469, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:5ebf76c20dc65e5e486a545c6c9ca3850c083fe680219efb9f7a24de6f43008e')
ON CONFLICT (source_record_id) DO UPDATE SET
  source_url=EXCLUDED.source_url, name=EXCLUDED.name, normalized_name=EXCLUDED.normalized_name,
  address_line1=EXCLUDED.address_line1, formatted_address=EXCLUDED.formatted_address,
  city=EXCLUDED.city, state_region=EXCLUDED.state_region, postal_code=EXCLUDED.postal_code,
  country_code=EXCLUDED.country_code, lat=EXCLUDED.lat, lng=EXCLUDED.lng, phone=EXCLUDED.phone,
  website=EXCLUDED.website, email=EXCLUDED.email, primary_provider_type=EXCLUDED.primary_provider_type,
  capability_tags=EXCLUDED.capability_tags, quality_score=EXCLUDED.quality_score, master_key=EXCLUDED.master_key;
