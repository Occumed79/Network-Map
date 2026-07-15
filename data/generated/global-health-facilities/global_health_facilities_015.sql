BEGIN;
CREATE TEMP TABLE tmp_global_health_facilities (
  source_record_id text NOT NULL,
  source_url text,
  raw_payload jsonb NOT NULL,
  content_hash text,
  name text NOT NULL,
  normalized_name text,
  address_line1 text,
  formatted_address text,
  city text,
  state_region text,
  postal_code text,
  country_code text,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  phone text,
  website text,
  email text,
  primary_provider_type text,
  capability_tags text[] NOT NULL,
  quality_score numeric,
  master_key text NOT NULL
) ON COMMIT DROP;
INSERT INTO tmp_global_health_facilities VALUES
('osm:node:6400580098', 'https://www.openstreetmap.org/node/6400580098', '{"provider":"openstreetmap","element":{"type":"node","id":6400580098,"lat":40.6237531,"lon":20.7793112,"tags":{"amenity":"pharmacy","name":"Kosta","opening_hours":"Mo-Sa 09:00-14:00, 17:00-20:00","wheelchair":"no"}}}'::jsonb, '57079190a392d21a8ccef8216f0d95056c64a6ea4a89c21277d7847fff5704f9', 'Kosta', 'kosta', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6237531, 20.7793112, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:da53d1c781a5161fdd386387a45bdddfa3526b2cb9efae2cea29fe3d368c55c7'),
('osm:node:9825988492', 'https://www.openstreetmap.org/node/9825988492', '{"provider":"openstreetmap","element":{"type":"node","id":9825988492,"lat":40.614525,"lon":20.7799078,"tags":{"healthcare":"laboratory","healthcare:speciality":"blood_check","name":"Krasis","opening_hours":"Mo-Fr 08:00-16:00; Sa 08:0-15:00; Su off","wheelchair":"no"}}}'::jsonb, '62f0123392b7443a1e36df2f182f6f3cd9b0b4e72b6cfedb254fe5df0f094aa4', 'Krasis', 'krasis', NULL, NULL, NULL, NULL, NULL, 'AL', 40.614525, 20.7799078, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:bc225c107ce8824033e1e1ea6911e517609e95bbef32d765e5c73df326280672'),
('osm:node:9161047218', 'https://www.openstreetmap.org/node/9161047218', '{"provider":"openstreetmap","element":{"type":"node","id":9161047218,"lat":41.1061147,"lon":20.0816931,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Kristaq Plumbi"}}}'::jsonb, 'd35045043039109b1f2533cef3f8ba11303516fccad81f81922c141d22d952cf', 'Kristaq Plumbi', 'kristaq plumbi', NULL, NULL, NULL, NULL, NULL, 'AL', 41.1061147, 20.0816931, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:9e7d248aca78634f51ac98660082611676dcfc2b66f375d720c74abe4175ca68'),
('osm:node:9844769341', 'https://www.openstreetmap.org/node/9844769341', '{"provider":"openstreetmap","element":{"type":"node","id":9844769341,"lat":40.6121859,"lon":20.7840426,"tags":{"amenity":"dentist","healthcare":"dentist","level":"1","name":"Kristart"}}}'::jsonb, 'efbdd1f0131e445fac0b235a6770575c6af732ac37d2e92419513ba6832b8a60', 'Kristart', 'kristart', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6121859, 20.7840426, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:71a38e123b42233fe12797abdef6b47aaa50909047dff0b069fd366e39c2622c'),
('osm:node:6418193660', 'https://www.openstreetmap.org/node/6418193660', '{"provider":"openstreetmap","element":{"type":"node","id":6418193660,"lat":40.6111039,"lon":20.7796235,"tags":{"amenity":"pharmacy","name":"Kristi","opening_hours":"Mo-Su 08:00-20:00","wheelchair":"no"}}}'::jsonb, '2fb52e956dc1128baaf5fdc5d7c10a03039de296f02ca0601fd7c403b8fcea01', 'Kristi', 'kristi', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6111039, 20.7796235, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:5ca1dd85c0e0075415885c1262a5ddf8451ce200a555770d549d29f98a57e991'),
('osm:node:9819780778', 'https://www.openstreetmap.org/node/9819780778', '{"provider":"openstreetmap","element":{"type":"node","id":9819780778,"lat":40.3385235,"lon":20.6803956,"tags":{"amenity":"clinic","healthcare":"clinic","healthcare:speciality":"allergology;cardiology;dermatology;internal","name":"Kristi 4","phone":"+355 812 23191"}}}'::jsonb, 'fd5c59d5c5bc790b157bced5a8bf54e18c207d4d74f5066a4f022b70967db8e8', 'Kristi 4', 'kristi 4', NULL, NULL, NULL, NULL, NULL, 'AL', 40.3385235, 20.6803956, '+355 812 23191', NULL, NULL, 'general_practitioner', ARRAY['general_practitioner', 'specialist']::text[], 0.78, 'loc:fc6c22db276b6f698c056fbbcf93d9ff64c401c0f47807c460efec6b18b8026f'),
('osm:node:10079210317', 'https://www.openstreetmap.org/node/10079210317', '{"provider":"openstreetmap","element":{"type":"node","id":10079210317,"lat":41.3276164,"lon":19.4534554,"tags":{"amenity":"hospital","healthcare":"hospital","name":"Kryqi i Kuq"}}}'::jsonb, 'bd20597b25b56b5340474559d1ae67c1aee0c819e9b15a3bcc670cd5c754be51', 'Kryqi i Kuq', 'kryqi i kuq', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3276164, 19.4534554, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:8182819bcc5633ce79a3817d7b915f2bbc44549b1bc3fa826a02279e668b2dad'),
('osm:node:12505612993', 'https://www.openstreetmap.org/node/12505612993', '{"provider":"openstreetmap","element":{"type":"node","id":12505612993,"lat":41.3487082,"lon":19.7453047,"tags":{"addr:city":"Tirana","addr:street":"Rruga Nozllaku","amenity":"pharmacy","healthcare":"pharmacy","name":"L. Elezi"}}}'::jsonb, 'a00819669527ae85f943751e8254ba668aa9b509ddd57aa39729710c95beb41c', 'L. Elezi', 'l elezi', 'Rruga Nozllaku', 'Rruga Nozllaku, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3487082, 19.7453047, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:89ebb00cdf25a581ff4d29bc5cedccaea876967d373de7b3254d3e0087e035e6'),
('osm:node:13938507207', 'https://www.openstreetmap.org/node/13938507207', '{"provider":"openstreetmap","element":{"type":"node","id":13938507207,"lat":41.3199923,"lon":19.8186312,"tags":{"amenity":"clinic","check_date":"2026-06-14","description":"Anti-aging clinic since 1978","healthcare":"clinic","name":"La Clinique De Paris"}}}'::jsonb, 'eea095cb4bce2dcc8854d0aea805fb1a9f2e424901a6cc20929a8612e79be534', 'La Clinique De Paris', 'la clinique de paris', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3199923, 19.8186312, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:84dedf670fbdce41f5fcf0cb3d0d3031885209405f5d2c7ac630832b87357273'),
('osm:node:6845107357', 'https://www.openstreetmap.org/node/6845107357', '{"provider":"openstreetmap","element":{"type":"node","id":6845107357,"lat":41.1853969,"lon":19.5582329,"tags":{"addr:street":"Jurgen Trade","healthcare":"laboratory","name":"Laborator"}}}'::jsonb, 'e7e4e1b8b17ec2c3cc8413d5f2c7dd2e60fcfa46636c9d89e0da52c867bd7b59', 'Laborator', 'laborator', 'Jurgen Trade', 'Jurgen Trade', NULL, NULL, NULL, 'AL', 41.1853969, 19.5582329, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.86, 'loc:83e6fcccebbab15df73af61a6b15fc98af74627c7b423f66675c6342f0f5e499'),
('osm:node:6870927388', 'https://www.openstreetmap.org/node/6870927388', '{"provider":"openstreetmap","element":{"type":"node","id":6870927388,"lat":39.8739752,"lon":20.0012798,"tags":{"amenity":"clinic","name":"Laborator"}}}'::jsonb, '4e8f067426779482e5aff3eeac910a9781ec680d843b1e06d747765dc44d1743', 'Laborator', 'laborator', NULL, NULL, NULL, NULL, NULL, 'AL', 39.8739752, 20.0012798, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:3be0090bf4beb644241c727071c8ae5695a98720fc5c74947768c5291dd6544a'),
('osm:node:6442256748', 'https://www.openstreetmap.org/node/6442256748', '{"provider":"openstreetmap","element":{"type":"node","id":6442256748,"lat":41.3302554,"lon":19.8213436,"tags":{"healthcare":"laboratory","name":"Laborator Analiza Mjeksore"}}}'::jsonb, '9dd5d9d78cb413a60c247eeb5e4eb7efec935f8822c901a1cb42aeb7c783beaf', 'Laborator Analiza Mjeksore', 'laborator analiza mjeksore', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3302554, 19.8213436, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:31b82ca51dff058ee1b94c2f41e8579a8948c8df632e21e4c014500541288c2e'),
('osm:node:12645809407', 'https://www.openstreetmap.org/node/12645809407', '{"provider":"openstreetmap","element":{"type":"node","id":12645809407,"lat":41.1120616,"lon":20.080618,"tags":{"email":"biocare.laborator@gmail.com","healthcare":"laboratory","healthcare:speciality":"vaccination;internal","name":"Laborator Biocare","opening_hours":"Mo-Sa 07:30-21:00; Sa 08:00-16:00","phone":"069 609 9111","wheelchair":"yes"}}}'::jsonb, '87991dd3c888ae37873ed458bb939c30d1f563a656b4c6cdfa12cf818264d3bd', 'Laborator Biocare', 'laborator biocare', NULL, NULL, NULL, NULL, NULL, 'AL', 41.1120616, 20.080618, '069 609 9111', NULL, 'biocare.laborator@gmail.com', 'pharmacy_vaccination', ARRAY['pharmacy_vaccination', 'lab']::text[], 0.78, 'loc:80a9b16dabf776f7b0f813d18e498095057e4ca2a0556cb073268bebbd9decda'),
('osm:node:6659875007', 'https://www.openstreetmap.org/node/6659875007', '{"provider":"openstreetmap","element":{"type":"node","id":6659875007,"lat":40.7248981,"lon":19.559706,"tags":{"healthcare":"laboratory","name":"Laborator Dea+"}}}'::jsonb, 'e7226e29ffc975d7258ecdb4df723a3c7a51cbddef737b274f4258de49f84154', 'Laborator Dea+', 'laborator dea', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7248981, 19.559706, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:be4c7db7acb726a2977c3e3e5528b8f7ca8ca28e4200390c1d2b07701471b843'),
('osm:node:6617478570', 'https://www.openstreetmap.org/node/6617478570', '{"provider":"openstreetmap","element":{"type":"node","id":6617478570,"lat":40.7308415,"lon":19.559735,"tags":{"amenity":"dentist","name":"Laborator Dental Diamant"}}}'::jsonb, 'b9999975bf9a10baa44b51d934b85f7f89c724e52a86db55c18c0832c8f09d63', 'Laborator Dental Diamant', 'laborator dental diamant', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7308415, 19.559735, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:661b6d0778dbedd43ef8f4566780d9e955e98f51cf446cdb41e788547b6655c9'),
('osm:node:6614834733', 'https://www.openstreetmap.org/node/6614834733', '{"provider":"openstreetmap","element":{"type":"node","id":6614834733,"lat":40.728617,"lon":19.5626496,"tags":{"amenity":"dentist","healthcare":"laboratory","name":"Laborator Dentar Arberia"}}}'::jsonb, '6a8b47d8209b66d063640e5ad80425afe3f854aed3ed740180ea2a614b53ea8a', 'Laborator Dentar Arberia', 'laborator dentar arberia', NULL, NULL, NULL, NULL, NULL, 'AL', 40.728617, 19.5626496, NULL, NULL, NULL, 'dental', ARRAY['dental', 'lab']::text[], 0.78, 'loc:a6bd5295604bffa51e560dddcf08dbe05e91452e4144738f6da34b780aee01df'),
('osm:node:13448182504', 'https://www.openstreetmap.org/node/13448182504', '{"provider":"openstreetmap","element":{"type":"node","id":13448182504,"lat":41.3320412,"lon":19.8392514,"tags":{"check_date":"2026-01-11","healthcare":"laboratory","name":"Laborator Lab","name:sq":"Laborator Lab","phone":"+355 69 619 1044"}}}'::jsonb, '5c0be65dbc3839e981b020dd340f412f01f4c61e1eaef14bc39e6fff617ae6cb', 'Laborator Lab', 'laborator lab', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3320412, 19.8392514, '+355 69 619 1044', NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:ff916c8f8292380d613ea4da46e40b8f1b1f23c10888d96bd1518d6d79d6c2e3'),
('osm:node:13962427014', 'https://www.openstreetmap.org/node/13962427014', '{"provider":"openstreetmap","element":{"type":"node","id":13962427014,"lat":41.3113682,"lon":19.8030136,"tags":{"addr:floor":"G","check_date":"2026-06-24","healthcare":"laboratory","level":"0","name":"Laborator Mjekesor Infermieri 24h"}}}'::jsonb, 'cf5292a3f115a610cbbad4d4b3caad7895094edf1f4c94319781ce12cb8d4a9a', 'Laborator Mjekesor Infermieri 24h', 'laborator mjekesor infermieri 24h', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3113682, 19.8030136, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:957d695579c030f4230dc3a61392181c61430a24541f7e3cd1237a6684ab5f2c'),
('osm:node:4539319978', 'https://www.openstreetmap.org/node/4539319978', '{"provider":"openstreetmap","element":{"type":"node","id":4539319978,"lat":42.0740212,"lon":19.522441,"tags":{"amenity":"clinic","name":"Laboratori Biokimik Klinik","operator":"Dr. Meri Cungeli"}}}'::jsonb, '0942f60c3d6e466b85b667bbe399107cf2056c1059c4841c224cfae297ce2880', 'Laboratori Biokimik Klinik', 'laboratori biokimik klinik', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0740212, 19.522441, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:1b5b627dc13b924581a66ebe3b2386b7e5d7fc9f4b292b44c92cc37995d6a1ab'),
('osm:node:4579940282', 'https://www.openstreetmap.org/node/4579940282', '{"provider":"openstreetmap","element":{"type":"node","id":4579940282,"lat":41.3390766,"lon":19.8304855,"tags":{"addr:city":"Tirana","addr:street":"Rruga e Dibrës","healthcare":"laboratory","name":"Laboratori i Anatomisë Patologjike","phone":"+ 35542349232","website":"https://www.qsut.gov.al/sherbimet-mjekesore/sektori-i-aktivitetit-diagnostik/sherbimi-i-laboratorit-te-anatomise-patologjike//sherbimi-i-laboratorit-te-anatomise-patologjike/sherbimet-e-ofruara/"}}}'::jsonb, 'f26f8c3d8969ce87a0353c30b5ebf9f98472b1a0a5d5480d9158bfe4ef3ac4c3', 'Laboratori i Anatomisë Patologjike', 'laboratori i anatomis patologjike', 'Rruga e Dibrës', 'Rruga e Dibrës, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3390766, 19.8304855, '+ 35542349232', 'https://www.qsut.gov.al/sherbimet-mjekesore/sektori-i-aktivitetit-diagnostik/sherbimi-i-laboratorit-te-anatomise-patologjike//sherbimi-i-laboratorit-te-anatomise-patologjike/sherbimet-e-ofruara/', NULL, 'lab', ARRAY['lab']::text[], 0.86, 'loc:ab6b894a5bd2d7c1a0bff0fa2d84e47267648991fed8c1b454288bf8a32a51b5'),
('osm:node:6416400576', 'https://www.openstreetmap.org/node/6416400576', '{"provider":"openstreetmap","element":{"type":"node","id":6416400576,"lat":40.6122469,"lon":20.7814516,"tags":{"healthcare":"laboratory","name":"Laboratori i Shëndetit Publik"}}}'::jsonb, '55907fb014e0c1537a0d5a695d540f7171127dc451b66bb1aa9d3842ec06579c', 'Laboratori i Shëndetit Publik', 'laboratori i sh ndetit publik', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6122469, 20.7814516, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:6157ba7726ee7ef642e9697569fed293a178cc2e5a3b1e659f1a55e9e19e3468'),
('osm:node:4579869253', 'https://www.openstreetmap.org/node/4579869253', '{"provider":"openstreetmap","element":{"type":"node","id":4579869253,"lat":41.3408033,"lon":19.8343193,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Laboratori Imunologjik","website":"https://www.qsut.gov.al/index.php/sherbimet-mjekesore/sherbimi-i-laboratorit-imunologjik/sherbimet-e-ofruara/"}}}'::jsonb, 'e4cbea9515a7431d856871a6d03262cf52a490509ce8dbd36763764d12493f55', 'Laboratori Imunologjik', 'laboratori imunologjik', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3408033, 19.8343193, NULL, 'https://www.qsut.gov.al/index.php/sherbimet-mjekesore/sherbimi-i-laboratorit-imunologjik/sherbimet-e-ofruara/', NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:c5f6c51e75a2075a59af42da8865048e76aa98c4367ebd0610fa7cbfcbb61403'),
('osm:node:7019584070', 'https://www.openstreetmap.org/node/7019584070', '{"provider":"openstreetmap","element":{"type":"node","id":7019584070,"lat":40.7339195,"lon":19.5696957,"tags":{"healthcare":"laboratory","name":"Laboratori Sh. Kapllanaj"}}}'::jsonb, 'f563800b5c74e1d66991f1ba6ee85e2f4c4e4162ab1d4c53e6f94f7a1c39c7d7', 'Laboratori Sh. Kapllanaj', 'laboratori sh kapllanaj', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7339195, 19.5696957, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:014dec339385280bd5d19a74ae7b4169c321c5df8daf47862ab1a9116b2c8413'),
('osm:node:5587702423', 'https://www.openstreetmap.org/node/5587702423', '{"provider":"openstreetmap","element":{"type":"node","id":5587702423,"lat":41.3225295,"lon":19.4804609,"tags":{"addr:street":"Rruga Bajram Tusha","amenity":"pharmacy","name":"Laerti"}}}'::jsonb, 'e92ab0473549a8ffc44425a0d8c1bdb28368f3d989d2a39b1769904f36103014', 'Laerti', 'laerti', 'Rruga Bajram Tusha', 'Rruga Bajram Tusha', NULL, NULL, NULL, 'AL', 41.3225295, 19.4804609, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:9bbe1d933c19d982fbb5cd267218bab975dc4a6f3ab84af8b505427c50e44b03'),
('osm:node:5590922922', 'https://www.openstreetmap.org/node/5590922922', '{"provider":"openstreetmap","element":{"type":"node","id":5590922922,"lat":41.3238271,"lon":19.8126225,"tags":{"addr:housenumber":"nr 8","addr:postcode":"1001","addr:street":"Rruga Sami Frashëri","amenity":"dentist","email":"info@klinikadentarelajo.al","healthcare":"dentist","internet_access":"wlan","name":"Lako","opening_hours":"Mo-Su 09:00-18:00","phone":"+355 69 513 1451","website":"http://klinikadentarelajo.al"}}}'::jsonb, '20d261995f205ee86096fb3bef66ae5e370a2b83fec65c46c868ddf6b77a0b35', 'Lako', 'lako', 'nr 8 Rruga Sami Frashëri', 'nr 8 Rruga Sami Frashëri, 1001', NULL, NULL, '1001', 'AL', 41.3238271, 19.8126225, '+355 69 513 1451', 'http://klinikadentarelajo.al', 'info@klinikadentarelajo.al', 'dental', ARRAY['dental']::text[], 0.86, 'loc:1dc4fd1651465329de3ff1d175ff8c3e3751ea5ae9ca021738662cbb6ae31341'),
('osm:node:6370673112', 'https://www.openstreetmap.org/node/6370673112', '{"provider":"openstreetmap","element":{"type":"node","id":6370673112,"lat":40.6202701,"lon":20.7830342,"tags":{"amenity":"clinic","healthcare":"clinic","healthcare:speciality":"gynaecology;plastic_surgery","name":"Laser Medical Center"}}}'::jsonb, '8e5cb8f2643c9cda8bdb297c19d4c60c56b97c08a83e0c3b5ab057db292d8f25', 'Laser Medical Center', 'laser medical center', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6202701, 20.7830342, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:1d72e474c06b018a4b689c640182fdc5ec443e62b7927c61ab6486e614810ff0'),
('osm:node:6838870556', 'https://www.openstreetmap.org/node/6838870556', '{"provider":"openstreetmap","element":{"type":"node","id":6838870556,"lat":41.3327033,"lon":19.8312741,"tags":{"addr:city":"Tirana","addr:street":"Rruga Hoxha Tahsin","amenity":"dentist","healthcare":"dentist","name":"Laska Dental"}}}'::jsonb, '79d2775834762c402eeef48bce1cd0248a1c10a4d87e02f185c6205a919cc661', 'Laska Dental', 'laska dental', 'Rruga Hoxha Tahsin', 'Rruga Hoxha Tahsin, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3327033, 19.8312741, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:ea0fa849a9c0090b39c80c2e84c20c7f031b99d64d137f47c1c1e2c39145cb71'),
('osm:node:11635484310', 'https://www.openstreetmap.org/node/11635484310', '{"provider":"openstreetmap","element":{"type":"node","id":11635484310,"lat":41.3385889,"lon":19.7943528,"tags":{"addr:city":"Tirana","addr:street":"Rruga Pandi Dardha","amenity":"pharmacy","healthcare":"pharmacy","name":"Lejdi"}}}'::jsonb, '8e6e4d3a3d1f52dee7b44c20dfb99a03fde1245ab1e21ed09e19d3434422e1b9', 'Lejdi', 'lejdi', 'Rruga Pandi Dardha', 'Rruga Pandi Dardha, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3385889, 19.7943528, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:b4bea8a123b062fd35f6c9b03090ca27f81c99959901f7c3bcf4d07858ceea08'),
('osm:way:852720402', 'https://www.openstreetmap.org/way/852720402', '{"provider":"openstreetmap","element":{"type":"way","id":852720402,"center":{"lat":41.3182214,"lon":19.8290899},"tags":{"addr:city":"Tirana","addr:postcode":"1001","addr:street":"Rruga Dritan Mezini","amenity":"dentist","building":"yes","building:levels":"6","contact:facebook":"https://web.facebook.com/profile.php?id=61551331913566","email":"lekandetalclinic@gmail.com","fixme":"remove from bus route relations","healthcare":"dentist","healthcare:speciality":"dentistry;dental_oral_maxillo_facial_surgery","image":"https://web.facebook.com/photo?fbid=122095030838044397&set=a.122095028342044397","mobile":"+355697869525","name":"Leka Dental Clinic","opening_hours":"Mo-Sa 09:00-19:00","operator":"Dr. Klean Leka"}}}'::jsonb, 'e819456f66d664e532fb5ab2d7cd15419b5fe8e09e3286e58f68626e5c4994e0', 'Leka Dental Clinic', 'leka dental clinic', 'Rruga Dritan Mezini', 'Rruga Dritan Mezini, Tirana, 1001', 'Tirana', NULL, '1001', 'AL', 41.3182214, 19.8290899, NULL, NULL, 'lekandetalclinic@gmail.com', 'dental', ARRAY['dental', 'general_practitioner']::text[], 0.86, 'loc:4f8b9e27dd53595d8cc08a785d235a56e55d2009e398800534f17696893644dc'),
('osm:node:5848464559', 'https://www.openstreetmap.org/node/5848464559', '{"provider":"openstreetmap","element":{"type":"node","id":5848464559,"lat":41.3357359,"lon":19.8140198,"tags":{"addr:city":"Tirana","addr:street":"Rruga Asim Vokshi","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","level":"1","name":"Lekli","shop":"chemist"}}}'::jsonb, '0cdfc050763957c39becb7d0559ce60cfcc3b4c5bd639a90b39eb7abdcdc65bd', 'Lekli', 'lekli', 'Rruga Asim Vokshi', 'Rruga Asim Vokshi, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3357359, 19.8140198, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:28282b71fb194b1c8d86b87e3cf220f3e0fc0f010762f688b5520a3accc8e389'),
('osm:node:6838979893', 'https://www.openstreetmap.org/node/6838979893', '{"provider":"openstreetmap","element":{"type":"node","id":6838979893,"lat":41.3257552,"lon":19.4582811,"tags":{"addr:street":"Rruga Vëllazërimi","amenity":"pharmacy","healthcare":"pharmacy","name":"Liel","shop":"garden_centre"}}}'::jsonb, '9f18ad46bd4d5c8a7e1361b046c88330423b22bb5286d413d38583a4cea44659', 'Liel', 'liel', 'Rruga Vëllazërimi', 'Rruga Vëllazërimi', NULL, NULL, NULL, 'AL', 41.3257552, 19.4582811, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:0b9041908d8c9de97fa5cdbb505d3239acac27347ac104a00a5519cd3e8177d5'),
('osm:node:11666054164', 'https://www.openstreetmap.org/node/11666054164', '{"provider":"openstreetmap","element":{"type":"node","id":11666054164,"lat":41.339003,"lon":19.7900186,"tags":{"addr:city":"Tirana","addr:street":"Rruga Gjergj Legisi","amenity":"pharmacy","healthcare":"pharmacy","name":"Life Plus"}}}'::jsonb, '44d01ac6284c45035d7931319d6de418c2e943533ad81fe37d0c2e5b1f8e0d83', 'Life Plus', 'life plus', 'Rruga Gjergj Legisi', 'Rruga Gjergj Legisi, Tirana', 'Tirana', NULL, NULL, 'AL', 41.339003, 19.7900186, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:f7aa79c10db81ff362bfb2f865e337d24c543b97b6dc763a626d93478e3adfff'),
('osm:node:6820884647', 'https://www.openstreetmap.org/node/6820884647', '{"provider":"openstreetmap","element":{"type":"node","id":6820884647,"lat":40.9443843,"lon":19.7060072,"tags":{"addr:street":"Rruga Fan Noli","amenity":"pharmacy","check_date":"2024-09-23","name":"Linda Farmaci"}}}'::jsonb, '2dd7cfec2e9572ed37a61694f78df5a3f77377e4c4b1448847b55de1a5abdd7d', 'Linda Farmaci', 'linda farmaci', 'Rruga Fan Noli', 'Rruga Fan Noli', NULL, NULL, NULL, 'AL', 40.9443843, 19.7060072, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:1bfe104ffa0087b1a6c6938539612ac4c14164a12ec4ecaef72801aa24e503c6'),
('osm:node:9200216128', 'https://www.openstreetmap.org/node/9200216128', '{"provider":"openstreetmap","element":{"type":"node","id":9200216128,"lat":40.6219223,"lon":20.7743025,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Lizeta","wheelchair":"no"}}}'::jsonb, 'bb8aa96ed78abe148771cb414a34abfa51934729357b239b262d17796fec8887', 'Lizeta', 'lizeta', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6219223, 20.7743025, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:81727d5249129df53066262637bcffdf8ee0e65b628d18e9fb3642bf9674286b'),
('osm:node:9826051434', 'https://www.openstreetmap.org/node/9826051434', '{"provider":"openstreetmap","element":{"type":"node","id":9826051434,"lat":40.6145393,"lon":20.7798575,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Lizeta","opening_hours":"Mo-Sa 08:00-21:00; Su 9:00-20:00","wheelchair":"no"}}}'::jsonb, '4b2d0a57cf2befe27ea2e2610fe28547edc299da179113ee2bb84a69a8430af2', 'Lizeta', 'lizeta', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6145393, 20.7798575, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:61eb3948604933319939292f5090e0011196506eb082fa7204117fd7a5b77aec'),
('osm:node:9041579851', 'https://www.openstreetmap.org/node/9041579851', '{"provider":"openstreetmap","element":{"type":"node","id":9041579851,"lat":42.0072293,"lon":19.6375669,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Lleshi"}}}'::jsonb, 'c4bc5cdbfe6dd2d5185ede849bd59a75e510ddb2d861a72871edcf56515ce7ae', 'Lleshi', 'lleshi', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0072293, 19.6375669, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:d787ebb7ed83c3e9cfd67ac7ed5a1a19f29aa26087207f0bc09de684164749e6'),
('osm:way:519668657', 'https://www.openstreetmap.org/way/519668657', '{"provider":"openstreetmap","element":{"type":"way","id":519668657,"center":{"lat":41.4898429,"lon":19.6759799},"tags":{"amenity":"public_bath","healthcare":"yes","name":"Llixha Bilaj \"Ibrahim Kupi\"","name:en":"Thermal Bath - \"Ibrahim Kupi\"","website":"http://llixhabilaj.com/"}}}'::jsonb, '35f01dd5d00fc39fe627ab6201cee70b7c307a299f061a0e006a0c915a935166', 'Llixha Bilaj "Ibrahim Kupi"', 'llixha bilaj ibrahim kupi', NULL, NULL, NULL, NULL, NULL, 'AL', 41.4898429, 19.6759799, NULL, 'http://llixhabilaj.com/', NULL, 'unknown', ARRAY['unknown']::text[], 0.78, 'loc:35b6b930da276d101bea5dab860797b9216295a2c06840103e77035bc77c8281'),
('osm:node:10807312487', 'https://www.openstreetmap.org/node/10807312487', '{"provider":"openstreetmap","element":{"type":"node","id":10807312487,"lat":41.3431491,"lon":19.8406299,"tags":{"addr:city":"Tirana","amenity":"dentist","healthcare":"dentist","healthcare:speciality":"dentist;dental_oral_maxillo_facial_surgery","name":"Loka Dental Clinic","operator":"Dr.Fatjon Loke"}}}'::jsonb, '1123a86528934bd3f0d97656057fd3f7de55dd36004991c0b1a2f08b139568bd', 'Loka Dental Clinic', 'loka dental clinic', NULL, 'Tirana', 'Tirana', NULL, NULL, 'AL', 41.3431491, 19.8406299, NULL, NULL, NULL, 'dental', ARRAY['dental', 'general_practitioner']::text[], 0.86, 'loc:258391cbad16f46878a7561f81c003e25c84dff1c64b1444534cb5bd52f65b6b'),
('osm:node:8647651758', 'https://www.openstreetmap.org/node/8647651758', '{"provider":"openstreetmap","element":{"type":"node","id":8647651758,"lat":41.375877,"lon":19.7678117,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Loka Dental Clinic"}}}'::jsonb, '74c0b693253d1617c98e9574d2ba857638c252ce56e9ef3ccbc97a5ef2d98fba', 'Loka Dental Clinic', 'loka dental clinic', NULL, NULL, NULL, NULL, NULL, 'AL', 41.375877, 19.7678117, NULL, NULL, NULL, 'dental', ARRAY['dental', 'general_practitioner']::text[], 0.78, 'loc:c4160b53cad761fc035847cac0e7678154a6dfc517504009385c961d43623822'),
('osm:node:5527425693', 'https://www.openstreetmap.org/node/5527425693', '{"provider":"openstreetmap","element":{"type":"node","id":5527425693,"lat":40.9944407,"lon":19.529787,"tags":{"amenity":"dentist","name":"Londo"}}}'::jsonb, '3b5f7b4d0812969750edff74435c9d1e2c988c9e9f66adea93a93281bb44ee65', 'Londo', 'londo', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9944407, 19.529787, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:78e605b24fc905050812e99414aab2c770152a1c724d4e19f023d2ddc5f635c1'),
('osm:node:10058055984', 'https://www.openstreetmap.org/node/10058055984', '{"provider":"openstreetmap","element":{"type":"node","id":10058055984,"lat":40.7048481,"lon":19.9529201,"tags":{"healthcare":"optometrist","name":"Luani"}}}'::jsonb, 'dac55e67e6ea67982d4b2f546594f2e120366964c0e20c7c4b33610289b96f2d', 'Luani', 'luani', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7048481, 19.9529201, NULL, NULL, NULL, 'unknown', ARRAY['unknown']::text[], 0.78, 'loc:a7d2f56b91bf0e9bf137241282a7da944b9a55c858189d6e0b742a16bf3ca357'),
('osm:node:7968410804', 'https://www.openstreetmap.org/node/7968410804', '{"provider":"openstreetmap","element":{"type":"node","id":7968410804,"lat":42.076849,"lon":20.4200869,"tags":{"amenity":"pharmacy","name":"Ludri"}}}'::jsonb, '8750457523037867eacfba388fde6a8f031139e06f076efb24b14956a4c3af09', 'Ludri', 'ludri', NULL, NULL, NULL, NULL, NULL, 'AL', 42.076849, 20.4200869, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:3fa957f62b84c1b9db3e808e741fec96f44f53c660c72a699713c7b8cf0a947c'),
('osm:node:9945653714', 'https://www.openstreetmap.org/node/9945653714', '{"provider":"openstreetmap","element":{"type":"node","id":9945653714,"lat":40.0810721,"lon":20.1472188,"tags":{"healthcare":"speech_therapist","name":"Luka Telo Todhri","phone":"+355 69 394 0291"}}}'::jsonb, '9fdbcbcaa4e84040ef0936ce620fb27d0ae902f98f1ee8d1ee03c95085ce9e8c', 'Luka Telo Todhri', 'luka telo todhri', NULL, NULL, NULL, NULL, NULL, 'AL', 40.0810721, 20.1472188, '+355 69 394 0291', NULL, NULL, 'unknown', ARRAY['unknown']::text[], 0.78, 'loc:53575af26dcddd9478b7988d31ebf2d5d1a2b60e39a46d23230e51d00c41df8c'),
('osm:node:6861410586', 'https://www.openstreetmap.org/node/6861410586', '{"provider":"openstreetmap","element":{"type":"node","id":6861410586,"lat":40.4653791,"lon":19.4900715,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Lule"}}}'::jsonb, 'f721ee904f1d1ff0db417fcb9836c2041189e9158b81f60d51b8481d16f263d0', 'Lule', 'lule', NULL, NULL, NULL, NULL, NULL, 'AL', 40.4653791, 19.4900715, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:c755a95d75edfbdd6f79d0105eae7da9cd9387a318d38f9ce46b8dbbc1551cf9'),
('osm:node:6818285056', 'https://www.openstreetmap.org/node/6818285056', '{"provider":"openstreetmap","element":{"type":"node","id":6818285056,"lat":41.3383592,"lon":19.8343255,"tags":{"addr:street":"Rruga Kongresi i Manastirit","amenity":"pharmacy","healthcare":"pharmacy","name":"Luna"}}}'::jsonb, '6a573838b52adbda37fd87f09ed025f626343bfb3a1c0157aafcc2db66547acb', 'Luna', 'luna', 'Rruga Kongresi i Manastirit', 'Rruga Kongresi i Manastirit', NULL, NULL, NULL, 'AL', 41.3383592, 19.8343255, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:81cd9c6950ed641c23d1a995e79c399d4e322031e9bd459aa929d7a09d52c937'),
('osm:node:6861410290', 'https://www.openstreetmap.org/node/6861410290', '{"provider":"openstreetmap","element":{"type":"node","id":6861410290,"lat":40.4623131,"lon":19.4890448,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Luna"}}}'::jsonb, '59da51e16c55f9c0d51d1a7bd32e90180880c2982053035d89ac0aa06f421d93', 'Luna', 'luna', NULL, NULL, NULL, NULL, NULL, 'AL', 40.4623131, 19.4890448, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:366b08999e87d44815d2a09131ca82a83a8d9ce8663cf4e68685529a82a4f972'),
('osm:node:10863416124', 'https://www.openstreetmap.org/node/10863416124', '{"provider":"openstreetmap","element":{"type":"node","id":10863416124,"lat":41.3303056,"lon":19.8132335,"tags":{"addr:city":"Tirana","addr:street":"Rruga e Durrësit","amenity":"dentist","healthcare":"dentist","name":"Luna Dental Clinic","website":"https://dentistialbaniatourism.com/"}}}'::jsonb, '1962ba478d7f7bdcde58b63ceb966e47e4aa8a8c6ef31a2eb6642fc8be313808', 'Luna Dental Clinic', 'luna dental clinic', 'Rruga e Durrësit', 'Rruga e Durrësit, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3303056, 19.8132335, NULL, 'https://dentistialbaniatourism.com/', NULL, 'dental', ARRAY['dental', 'general_practitioner']::text[], 0.86, 'loc:ab735efadda30eb9c41f625ff246b6033ccf2e665136e1a58a85131e7fbc6ebe'),
('osm:node:6617256246', 'https://www.openstreetmap.org/node/6617256246', '{"provider":"openstreetmap","element":{"type":"node","id":6617256246,"lat":40.7293251,"lon":19.5620165,"tags":{"amenity":"dentist","name":"Mali Dental Clinic"}}}'::jsonb, 'e8ed2f9fbd635c62ca4f70687116bedbbfcfde53898b2d6f2da0a813155b644b', 'Mali Dental Clinic', 'mali dental clinic', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7293251, 19.5620165, NULL, NULL, NULL, 'dental', ARRAY['dental', 'general_practitioner']::text[], 0.78, 'loc:6d7d4ea15079e3bf88372361d6769f691e839700f882956d5c798e803ce68186'),
('osm:node:12947258769', 'https://www.openstreetmap.org/node/12947258769', '{"provider":"openstreetmap","element":{"type":"node","id":12947258769,"lat":41.3361109,"lon":19.7731834,"tags":{"amenity":"dentist","contact:facebook":"https://www.facebook.com/manjanidental.al","healthcare":"dentist","healthcare:speciality":"dental_oral_maxillo_facial_surgery","mobile":"+355682000679","name":"Manjani Dental","opening_hours":"Mo-Su 09:00-21:00","operator":"Fatjon Manjani"}}}'::jsonb, '8c1bdeaf4d52f53cb142856afd2a625947d89570e6af9b5e988b84d4dcf6b808', 'Manjani Dental', 'manjani dental', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3361109, 19.7731834, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:d0c4c199beb2bc3be0b6c154f8ba69316688c6e0e0efb55e0c340bc3d3924b2e'),
('osm:node:8032252886', 'https://www.openstreetmap.org/node/8032252886', '{"provider":"openstreetmap","element":{"type":"node","id":8032252886,"lat":41.3343363,"lon":19.7738205,"tags":{"addr:postcode":"1052","addr:street":"Sokrat Miho","amenity":"clinic","email":"manjanidental@gmail.com","internet_access":"wlan","name":"Manjani Dental","opening_hours":"Mo-Su 09:00-20:00","phone":"0682000679","website":"https://manjanidental.al/"}}}'::jsonb, 'fb013a2244653145087f65252e2d6d930643de84131258eb0fed1a37d9bd7379', 'Manjani Dental', 'manjani dental', 'Sokrat Miho', 'Sokrat Miho, 1052', NULL, NULL, '1052', 'AL', 41.3343363, 19.7738205, '0682000679', 'https://manjanidental.al/', 'manjanidental@gmail.com', 'dental', ARRAY['dental', 'general_practitioner']::text[], 0.86, 'loc:06889557032b5d06a59aff7d5a3ee436b46ea26774b7d762feacc16fddaa4fa3');

INSERT INTO public.provider_source_catalog (source_key, display_name, source_kind, trust_tier, active, notes)
VALUES ('healthsites_osm', 'Healthsites / OpenStreetMap health facilities', 'open_data', 'directory', true, 'International health-facility locations; backend ingestion only')
ON CONFLICT (source_key) DO UPDATE SET display_name=EXCLUDED.display_name, source_kind=EXCLUDED.source_kind, trust_tier=EXCLUDED.trust_tier, active=true, notes=EXCLUDED.notes, updated_at=now();

INSERT INTO public.provider_raw_records (source_key, source_record_id, content_hash, raw_payload, raw_text, status)
SELECT 'healthsites_osm', t.source_record_id, t.content_hash, t.raw_payload, t.raw_payload::text, 'raw_loaded'
FROM tmp_global_health_facilities t
WHERE NOT EXISTS (
  SELECT 1 FROM public.provider_raw_records r
  WHERE r.source_key='healthsites_osm' AND r.source_record_id=t.source_record_id
);

INSERT INTO public.provider_stage_records (
  raw_record_id, source_key, source_record_id, name, normalized_name, address_line1,
  formatted_address, city, state_region, postal_code, country_code, lat, lng, phone,
  website, email, primary_provider_type, capability_tags, confidence_score,
  normalization_status, normalized_payload
)
SELECT r.id, 'healthsites_osm', t.source_record_id, t.name, t.normalized_name, t.address_line1,
       t.formatted_address, t.city, t.state_region, t.postal_code, t.country_code,
       t.lat, t.lng, t.phone, t.website, t.email, t.primary_provider_type,
       t.capability_tags, t.quality_score, 'staged', t.raw_payload
FROM tmp_global_health_facilities t
JOIN LATERAL (
  SELECT id FROM public.provider_raw_records r
  WHERE r.source_key='healthsites_osm' AND r.source_record_id=t.source_record_id
  ORDER BY r.created_at ASC LIMIT 1
) r ON true
WHERE NOT EXISTS (
  SELECT 1 FROM public.provider_stage_records s
  WHERE s.source_key='healthsites_osm' AND s.source_record_id=t.source_record_id
);

INSERT INTO public.provider_master (
  master_key, name, normalized_name, address_line1, formatted_address, city,
  state_region, postal_code, country_code, lat, lng, phone, website, email,
  primary_provider_type, capability_tags, primary_source_key, quality_score,
  active, last_seen_at, updated_at
)
SELECT master_key, name, normalized_name, address_line1, formatted_address, city,
       state_region, postal_code, country_code, lat, lng, phone, website, email,
       primary_provider_type, capability_tags, 'healthsites_osm', quality_score,
       true, now(), now()
FROM tmp_global_health_facilities
ON CONFLICT (master_key) DO UPDATE SET
  name=EXCLUDED.name,
  normalized_name=EXCLUDED.normalized_name,
  address_line1=COALESCE(NULLIF(EXCLUDED.address_line1,''), provider_master.address_line1),
  formatted_address=COALESCE(NULLIF(EXCLUDED.formatted_address,''), provider_master.formatted_address),
  city=COALESCE(NULLIF(EXCLUDED.city,''), provider_master.city),
  state_region=COALESCE(NULLIF(EXCLUDED.state_region,''), provider_master.state_region),
  postal_code=COALESCE(NULLIF(EXCLUDED.postal_code,''), provider_master.postal_code),
  country_code=EXCLUDED.country_code,
  lat=EXCLUDED.lat,
  lng=EXCLUDED.lng,
  phone=COALESCE(NULLIF(EXCLUDED.phone,''), provider_master.phone),
  website=COALESCE(NULLIF(EXCLUDED.website,''), provider_master.website),
  email=COALESCE(NULLIF(EXCLUDED.email,''), provider_master.email),
  primary_provider_type=CASE WHEN provider_master.primary_provider_type IS NULL OR provider_master.primary_provider_type='unknown' THEN EXCLUDED.primary_provider_type ELSE provider_master.primary_provider_type END,
  capability_tags=ARRAY(SELECT DISTINCT value FROM unnest(provider_master.capability_tags || EXCLUDED.capability_tags) value WHERE value IS NOT NULL AND value<>''),
  primary_source_key=COALESCE(provider_master.primary_source_key, EXCLUDED.primary_source_key),
  quality_score=GREATEST(COALESCE(provider_master.quality_score,0), COALESCE(EXCLUDED.quality_score,0)),
  active=true,
  last_seen_at=now(),
  updated_at=now();

INSERT INTO public.provider_master_sources (
  master_provider_id, stage_record_id, raw_record_id, source_key, source_record_id,
  source_url, source_confidence_score, raw_payload
)
SELECT pm.id, s.id, r.id, 'healthsites_osm', t.source_record_id, t.source_url,
       t.quality_score, t.raw_payload
FROM tmp_global_health_facilities t
JOIN public.provider_master pm ON pm.master_key=t.master_key
LEFT JOIN LATERAL (
  SELECT id FROM public.provider_raw_records r
  WHERE r.source_key='healthsites_osm' AND r.source_record_id=t.source_record_id
  ORDER BY r.created_at ASC LIMIT 1
) r ON true
LEFT JOIN LATERAL (
  SELECT id FROM public.provider_stage_records s
  WHERE s.source_key='healthsites_osm' AND s.source_record_id=t.source_record_id
  ORDER BY s.created_at ASC LIMIT 1
) s ON true
ON CONFLICT (master_provider_id, source_key, (COALESCE(source_record_id, ''))) DO UPDATE SET
  stage_record_id=EXCLUDED.stage_record_id,
  raw_record_id=EXCLUDED.raw_record_id,
  source_url=EXCLUDED.source_url,
  source_confidence_score=GREATEST(COALESCE(provider_master_sources.source_confidence_score,0), COALESCE(EXCLUDED.source_confidence_score,0)),
  raw_payload=EXCLUDED.raw_payload,
  updated_at=now();

INSERT INTO public.provider_master_types (master_provider_id, type_key, source_key, confidence_score)
SELECT DISTINCT pm.id, type_key, 'healthsites_osm', t.quality_score
FROM tmp_global_health_facilities t
JOIN public.provider_master pm ON pm.master_key=t.master_key
CROSS JOIN LATERAL unnest(ARRAY[t.primary_provider_type] || t.capability_tags) type_key
WHERE type_key IS NOT NULL AND type_key<>''
  AND EXISTS (SELECT 1 FROM public.provider_type_catalog c WHERE c.type_key=type_key)
ON CONFLICT (master_provider_id, type_key) DO UPDATE SET
  source_key=EXCLUDED.source_key,
  confidence_score=GREATEST(COALESCE(provider_master_types.confidence_score,0), COALESCE(EXCLUDED.confidence_score,0));

INSERT INTO public.medical_providers (
  place_id, name, formatted_address, lat, lng, types, category, phone, website,
  country_code, locality, administrative_area_level_1, postal_code, data_source,
  source_id, source_type, confidence_score, raw_data, scraped_at, updated_at
)
SELECT 'healthsites_osm:' || source_record_id, name, formatted_address, lat, lng,
       capability_tags, primary_provider_type, phone, website, country_code, city,
       state_region, postal_code, 'Healthsites / OpenStreetMap',
       'healthsites_osm:' || source_record_id, 'open_data', quality_score::double precision,
       raw_payload || jsonb_build_object('provider_master_key', master_key, 'source_key', 'healthsites_osm'),
       now(), now()
FROM tmp_global_health_facilities
ON CONFLICT (source_id) DO UPDATE SET
  name=EXCLUDED.name,
  formatted_address=EXCLUDED.formatted_address,
  lat=EXCLUDED.lat,
  lng=EXCLUDED.lng,
  types=EXCLUDED.types,
  category=EXCLUDED.category,
  phone=COALESCE(EXCLUDED.phone, medical_providers.phone),
  website=COALESCE(EXCLUDED.website, medical_providers.website),
  country_code=EXCLUDED.country_code,
  locality=EXCLUDED.locality,
  administrative_area_level_1=EXCLUDED.administrative_area_level_1,
  postal_code=EXCLUDED.postal_code,
  confidence_score=GREATEST(COALESCE(medical_providers.confidence_score,0), COALESCE(EXCLUDED.confidence_score,0)),
  raw_data=EXCLUDED.raw_data,
  updated_at=now();
COMMIT;
