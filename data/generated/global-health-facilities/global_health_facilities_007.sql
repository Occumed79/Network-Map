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
('osm:node:6808309332', 'https://www.openstreetmap.org/node/6808309332', '{"provider":"openstreetmap","element":{"type":"node","id":6808309332,"lat":41.3275398,"lon":19.8341719,"tags":{"addr:street":"Rruga Ali Demi","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Bora"}}}'::jsonb, 'd02bd693ba1a0ee69740675e86f4239d64589783ff4a8cd1d72bd8b4f81ec7a7', 'Farmaci Bora', 'farmaci bora', 'Rruga Ali Demi', 'Rruga Ali Demi', NULL, NULL, NULL, 'AL', 41.3275398, 19.8341719, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:3baa31e4b3e11bae2e35cb19006a04da1015f530101ea4b9fc7ee512eceff503'),
('osm:node:4602203090', 'https://www.openstreetmap.org/node/4602203090', '{"provider":"openstreetmap","element":{"type":"node","id":4602203090,"lat":41.3312306,"lon":19.8326343,"tags":{"addr:city":"Tirana","addr:postcode":"1000","addr:street":"Vëllezërit Huta","amenity":"pharmacy","healthcare":"pharmacy","level":"1","name":"Farmaci Brisi","phone":"+355692475787"}}}'::jsonb, '8b7a6647fd2b38408c07199ee800111efbe1a2d79515c39d000f5418058bc571', 'Farmaci Brisi', 'farmaci brisi', 'Vëllezërit Huta', 'Vëllezërit Huta, Tirana, 1000', 'Tirana', NULL, '1000', 'AL', 41.3312306, 19.8326343, '+355692475787', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:33a0dd4faf1cfb5beccf67c195462a1383dc0b4d59cd71fe061125f4bd1bf897'),
('osm:node:6864369468', 'https://www.openstreetmap.org/node/6864369468', '{"provider":"openstreetmap","element":{"type":"node","id":6864369468,"lat":41.3443632,"lon":19.5637523,"tags":{"amenity":"pharmacy","name":"Farmaci Bujoesore Farera"}}}'::jsonb, 'b56be998f5054fb15954deceab78a7ae8a3179cbb62400715b7ed3108efbd112', 'Farmaci Bujoesore Farera', 'farmaci bujoesore farera', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3443632, 19.5637523, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:05d124e199067afec0f5fa1fb147f9c71b2a5bd63bc97bfa6063730d5afe5820'),
('osm:node:2423106431', 'https://www.openstreetmap.org/node/2423106431', '{"provider":"openstreetmap","element":{"type":"node","id":2423106431,"lat":40.2324798,"lon":20.3521487,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Bujqesore"}}}'::jsonb, '6efb1ef853029d7ef24e6c041930941eb6f7500a08ab866d303746fd87795c29', 'Farmaci Bujqesore', 'farmaci bujqesore', NULL, NULL, NULL, NULL, NULL, 'AL', 40.2324798, 20.3521487, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:e32761990f837547fdc14e42d286902f867567805e28d689f307fe10aced75b7'),
('osm:node:6808467603', 'https://www.openstreetmap.org/node/6808467603', '{"provider":"openstreetmap","element":{"type":"node","id":6808467603,"lat":41.344573,"lon":19.8498024,"tags":{"addr:city":"Tirana","addr:street":"Rruga Xhanfize Keko","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Bujqesore","shop":"hairdresser"}}}'::jsonb, 'db712ffeb64fb33cbe4df2f30ba66e582512a8ff09a06d08168a0ec6e9c68d74', 'Farmaci Bujqesore', 'farmaci bujqesore', 'Rruga Xhanfize Keko', 'Rruga Xhanfize Keko, Tirana', 'Tirana', NULL, NULL, 'AL', 41.344573, 19.8498024, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:3dd6c52bbf0b7f257918e6962be51ac0f57e97f408861498014f8e905093d08c'),
('osm:node:6844791151', 'https://www.openstreetmap.org/node/6844791151', '{"provider":"openstreetmap","element":{"type":"node","id":6844791151,"lat":41.3245215,"lon":19.4564059,"tags":{"addr:street":"Rruga Glaukia","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Bujqesore"}}}'::jsonb, '70a4a036502b03ee3c8cca7a2c01bd9384839348849ff65be6d81c386d9a9369', 'Farmaci Bujqesore', 'farmaci bujqesore', 'Rruga Glaukia', 'Rruga Glaukia', NULL, NULL, NULL, 'AL', 41.3245215, 19.4564059, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:ef3d5a44925978ea2f47b7d22b5e3cee6eb886bea8ea91b36b7562586b87f2c3'),
('osm:node:8557162717', 'https://www.openstreetmap.org/node/8557162717', '{"provider":"openstreetmap","element":{"type":"node","id":8557162717,"lat":41.3018557,"lon":19.5024013,"tags":{"amenity":"pharmacy","name":"Farmaci bujqësore"}}}'::jsonb, '76eeaaa284d73b128fa989b7d4feb8016bacc6c0ed00b60d9fdf86ccafdfe674', 'Farmaci bujqësore', 'farmaci bujq sore', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3018557, 19.5024013, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:d1f6660c0cd2e4c12de3fde16244beaf5b39d4996181768eefd3b18261faa131'),
('osm:node:8656561917', 'https://www.openstreetmap.org/node/8656561917', '{"provider":"openstreetmap","element":{"type":"node","id":8656561917,"lat":41.3018846,"lon":19.5024111,"tags":{"amenity":"pharmacy","name":"Farmaci bujqësore","phone":"0694223332"}}}'::jsonb, 'caedf5b3a9125a29d62b0d5eeac6e5adeb30fd8525b4a2f934f8f23547b56689', 'Farmaci bujqësore', 'farmaci bujq sore', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3018846, 19.5024111, '0694223332', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:ac4ab73f4ff566830ec4d0b39722b6bbfb41745815ad74c6a4c55e5074b161f0'),
('osm:node:8656562017', 'https://www.openstreetmap.org/node/8656562017', '{"provider":"openstreetmap","element":{"type":"node","id":8656562017,"lat":41.3245299,"lon":19.4564139,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci bujqësore"}}}'::jsonb, '24e4ec835120eb645aca824f98861e9c566387a63cf7cef55a024ea9465607a4', 'Farmaci bujqësore', 'farmaci bujq sore', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3245299, 19.4564139, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:b1d6c20d35e4cbcd03a17f29f9597b4d3ff73f8ad6ffbc8b6d28eaabd99a4fb4'),
('osm:node:6867714660', 'https://www.openstreetmap.org/node/6867714660', '{"provider":"openstreetmap","element":{"type":"node","id":6867714660,"lat":41.3484947,"lon":19.843092,"tags":{"addr:city":"Tirana","addr:street":"Rruga Myslym Keta","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Bujqesore Agrinas"}}}'::jsonb, '77d70dc7804e6d341d17e6e7d94576ededf4a2af1febd2de83e61b840d18e686', 'Farmaci Bujqesore Agrinas', 'farmaci bujqesore agrinas', 'Rruga Myslym Keta', 'Rruga Myslym Keta, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3484947, 19.843092, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:a67a10dbb4250e115342f335dcba0c427fea47bf9d1f3fd6c106260b57a345fa'),
('osm:node:6865023233', 'https://www.openstreetmap.org/node/6865023233', '{"provider":"openstreetmap","element":{"type":"node","id":6865023233,"lat":41.3711667,"lon":19.6912128,"tags":{"addr:city":"Vorë","addr:street":"Rruga Limuthit","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Bujqesore Allmeta"}}}'::jsonb, '920f59576263d1ad2ba0f6e6ea35eb896bcdc0556fb44d4a78ce367e3b80b5d3', 'Farmaci Bujqesore Allmeta', 'farmaci bujqesore allmeta', 'Rruga Limuthit', 'Rruga Limuthit, Vorë', 'Vorë', NULL, NULL, 'AL', 41.3711667, 19.6912128, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:31031666b350d6da63192d2c67aac8682856accdc81f28985ed7833cad770a43'),
('osm:node:11762127669', 'https://www.openstreetmap.org/node/11762127669', '{"provider":"openstreetmap","element":{"type":"node","id":11762127669,"lat":40.7001137,"lon":19.9653808,"tags":{"addr:street":"Rruga Thoma Bello","amenity":"pharmacy","name":"Farmaci Bukqesore","name:de":"Apotheke Bukqesore","name:en":"Pharmacy Bukqesore"}}}'::jsonb, '668c0c8ee82a28114e4721d9d4164b6eaa0a4e3a8f056b154372e33552806ab7', 'Farmaci Bukqesore', 'farmaci bukqesore', 'Rruga Thoma Bello', 'Rruga Thoma Bello', NULL, NULL, NULL, 'AL', 40.7001137, 19.9653808, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:590ffc0b5dd5b98f8e982351409203b7819efe9ce0a82d483850d0f7341a391b'),
('osm:node:6845190788', 'https://www.openstreetmap.org/node/6845190788', '{"provider":"openstreetmap","element":{"type":"node","id":6845190788,"lat":41.1853343,"lon":19.5580734,"tags":{"addr:street":"Jurgen Trade","amenity":"pharmacy","name":"Farmaci D. Beu"}}}'::jsonb, 'bd83a38b29b27a85666676f7db1e866fb0cda3c34277b39b18814948c02bff85', 'Farmaci D. Beu', 'farmaci d beu', 'Jurgen Trade', 'Jurgen Trade', NULL, NULL, NULL, 'AL', 41.1853343, 19.5580734, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:733d3ff528b54fd177bc28b07c33b8dbd261a3810b43ea4b4fc8481dde2edd16'),
('osm:node:5111970638', 'https://www.openstreetmap.org/node/5111970638', '{"provider":"openstreetmap","element":{"type":"node","id":5111970638,"lat":41.3213521,"lon":19.8125212,"tags":{"addr:street":"Rruga Andon Zako Çajupi","amenity":"pharmacy","dispensing":"yes","drive_through":"no","healthcare":"pharmacy","mobile":"+355675013331","name":"Farmaci Daja","opening_hours":"Mo-Fr 08:00-21:30; Sa 08:00-20:30","website":"https://farmacidaja.com/","wheelchair":"yes"}}}'::jsonb, '3a1439ef4d7b2c011f83e9e47e1d38d9c3cc8caebd9079be07c374959fc37d61', 'Farmaci Daja', 'farmaci daja', 'Rruga Andon Zako Çajupi', 'Rruga Andon Zako Çajupi', NULL, NULL, NULL, 'AL', 41.3213521, 19.8125212, NULL, 'https://farmacidaja.com/', NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:a0f4066d3c3d378321fee8aee41b5168beaeee1a9e7d5046823a90a007e90547'),
('osm:node:6806581237', 'https://www.openstreetmap.org/node/6806581237', '{"provider":"openstreetmap","element":{"type":"node","id":6806581237,"lat":41.3459304,"lon":19.8559403,"tags":{"addr:city":"Tirana","addr:street":"Rruga Sotir Caci","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Dajti"}}}'::jsonb, 'fded29ec940584dac5fdb1db0cdfea1709c24341bc6f2f14bdef7b180a08d519', 'Farmaci Dajti', 'farmaci dajti', 'Rruga Sotir Caci', 'Rruga Sotir Caci, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3459304, 19.8559403, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:ef224a8f9b4fa52aeb8e342e78ddd839274ec538e4f35344b84183b443fdb578'),
('osm:node:4357753789', 'https://www.openstreetmap.org/node/4357753789', '{"provider":"openstreetmap","element":{"type":"node","id":4357753789,"lat":41.3203868,"lon":19.812918,"tags":{"addr:city":"Tirana","addr:street":"Rruga Andon Zako Çajupi","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Dani","opening_hours":"Mo-Sa 09:00-07:00","wheelchair":"no"}}}'::jsonb, '54701e00b2a04e201c0f5e363ac0a33620bff32c9d513306c65255d1ebd614d7', 'Farmaci Dani', 'farmaci dani', 'Rruga Andon Zako Çajupi', 'Rruga Andon Zako Çajupi, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3203868, 19.812918, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:d04d0d60a92084740b99c9c398f588194864d680f2edc3bb9a9230309d8484ad'),
('osm:node:6810036381', 'https://www.openstreetmap.org/node/6810036381', '{"provider":"openstreetmap","element":{"type":"node","id":6810036381,"lat":41.3391013,"lon":19.8423319,"tags":{"addr:street":"Rruga Xhanfize Keko","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Darvin"}}}'::jsonb, 'f615e7de4d23fee470a749c1b3e988b4a416d38ced15043b8513eb632ef6d0ff', 'Farmaci Darvin', 'farmaci darvin', 'Rruga Xhanfize Keko', 'Rruga Xhanfize Keko', NULL, NULL, NULL, 'AL', 41.3391013, 19.8423319, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:b46a1e0eac419d3fa440256465b5f403c24e5d6fac5eb76ec308dbb27991e464'),
('osm:node:6659875006', 'https://www.openstreetmap.org/node/6659875006', '{"provider":"openstreetmap","element":{"type":"node","id":6659875006,"lat":40.7249173,"lon":19.5597066,"tags":{"amenity":"pharmacy","name":"Farmaci Dea"}}}'::jsonb, '7061bed9f50ffa176ed60671f19d6701bb6a6a58ed6ea64c6f3f2af891856bb6', 'Farmaci Dea', 'farmaci dea', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7249173, 19.5597066, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:d47a53616cd9741ef6535a58adee096871a7ec769df3b0448064c8fedb53d52c'),
('osm:node:2142536467', 'https://www.openstreetmap.org/node/2142536467', '{"provider":"openstreetmap","element":{"type":"node","id":2142536467,"lat":41.1855402,"lon":19.558574,"tags":{"addr:street":"Jurgen Trade","amenity":"pharmacy","name":"Farmaci Deda"}}}'::jsonb, 'a16772738a7a03f435bae0d99eb96fc789edba5b0d4bdcbe958d1c9cc2ce8eec', 'Farmaci Deda', 'farmaci deda', 'Jurgen Trade', 'Jurgen Trade', NULL, NULL, NULL, 'AL', 41.1855402, 19.558574, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:96b7ffa3c0a1616eef80a7579376ea62898a533958ab7c39c7e468f441ff6b56'),
('osm:node:13830559930', 'https://www.openstreetmap.org/node/13830559930', '{"provider":"openstreetmap","element":{"type":"node","id":13830559930,"lat":40.9384219,"lon":19.7068992,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Denada Kashari"}}}'::jsonb, '4715dc94ca2be72caa52d8806c95ae8b620024955958b2d9de1c564b422dfd66', 'Farmaci Denada Kashari', 'farmaci denada kashari', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9384219, 19.7068992, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:55a089a9979118f036ad377321fb97acfecc003b2baa9bf5db5caaff3e16f255'),
('osm:node:4481472792', 'https://www.openstreetmap.org/node/4481472792', '{"provider":"openstreetmap","element":{"type":"node","id":4481472792,"lat":41.3335894,"lon":19.8055266,"tags":{"addr:city":"Tirana","addr:street":"Rruga Asim Vokshi","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Dite & Nate","name:en":"Night & day Drugstore","name:sq":"Farmaci Dite & Nate","opening_hours":"24/7","wheelchair":"no"}}}'::jsonb, '7f775839038a067cb45468966f4326df2327319a012fef9b599f5de33a968f7d', 'Farmaci Dite & Nate', 'farmaci dite nate', 'Rruga Asim Vokshi', 'Rruga Asim Vokshi, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3335894, 19.8055266, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:ab62f4e8b75fb34cd86a7fa8f73ffaf27bfbf544518f4593e6e02346a9973521'),
('osm:node:6822888751', 'https://www.openstreetmap.org/node/6822888751', '{"provider":"openstreetmap","element":{"type":"node","id":6822888751,"lat":41.3122714,"lon":19.8435415,"tags":{"addr:city":"Tirana","addr:street":"Rruga Dr. Shefqet Ndroqi","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Dori & Klara"}}}'::jsonb, '2c31b816c2162abb48fe05fdb730abeac1f3a4e9d507a3ff1785ea9ac2e7d4a2', 'Farmaci Dori & Klara', 'farmaci dori klara', 'Rruga Dr. Shefqet Ndroqi', 'Rruga Dr. Shefqet Ndroqi, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3122714, 19.8435415, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:3791386a2fef908160c6aafc5a42412835e59728bf6ff346878faecc2d11057c'),
('osm:node:13830534321', 'https://www.openstreetmap.org/node/13830534321', '{"provider":"openstreetmap","element":{"type":"node","id":13830534321,"lat":40.9389551,"lon":19.7068059,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Dr Genc Dani"}}}'::jsonb, '0f53f7821b499bb19794841c2a985dd1d9bb8246e0d06a0bdae1c499702d3f1a', 'Farmaci Dr Genc Dani', 'farmaci dr genc dani', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9389551, 19.7068059, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:de815be465a2e2a0646bd9a0e972b08f866255f589ee5a36991be087a14380c8'),
('osm:node:13448122402', 'https://www.openstreetmap.org/node/13448122402', '{"provider":"openstreetmap","element":{"type":"node","id":13448122402,"lat":41.332284,"lon":19.8374537,"tags":{"amenity":"pharmacy","check_date":"2026-01-11","healthcare":"pharmacy","name":"Farmaci Drita.J","name:sq":"Farmaci Drita.J","wheelchair":"no"}}}'::jsonb, '7fffdb48dbeeee3d790001304267570239a0598602facf7a9d9ee15afd3fcff0', 'Farmaci Drita.J', 'farmaci drita j', NULL, NULL, NULL, NULL, NULL, 'AL', 41.332284, 19.8374537, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:9eff6008f5c26476a2392a4728e31891e5ecaee4b07ca3322b7cab44ccf72131'),
('osm:node:6806575194', 'https://www.openstreetmap.org/node/6806575194', '{"provider":"openstreetmap","element":{"type":"node","id":6806575194,"lat":41.3363903,"lon":19.8436952,"tags":{"addr:street":"Rruga Sadik Petrela","amenity":"pharmacy","check_date":"2024-02-10","healthcare":"pharmacy","internet_access":"no","name":"Farmaci E. JAHO","name:sq":"Farmaci E. JAHO","payment:cards":"no","payment:cash":"yes","payment:credit_cards":"no","payment:debit_cards":"no","wheelchair":"limited"}}}'::jsonb, '8a1b2bcb4a17ca60e90862f0e8450d327d6c16be4272c4686ed4b5480c4452b7', 'Farmaci E. JAHO', 'farmaci e jaho', 'Rruga Sadik Petrela', 'Rruga Sadik Petrela', NULL, NULL, NULL, 'AL', 41.3363903, 19.8436952, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:b49a826c470b27436b79bd0bfe5d435796371f733daa7bb3d6b9246a03c5f577'),
('osm:node:6845079592', 'https://www.openstreetmap.org/node/6845079592', '{"provider":"openstreetmap","element":{"type":"node","id":6845079592,"lat":41.3202762,"lon":19.4526927,"tags":{"addr:street":"Rruga Abaz Çelkupa","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Egnatia 2014"}}}'::jsonb, '22a1514811afc3f53fe366b76ac9601434c18963cd4aea3a43ab4b2822c87dcc', 'Farmaci Egnatia 2014', 'farmaci egnatia 2014', 'Rruga Abaz Çelkupa', 'Rruga Abaz Çelkupa', NULL, NULL, NULL, 'AL', 41.3202762, 19.4526927, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:235ca2c133e8913606de10fd0d7bf6446cd8ff78535c0e7e4789d48f280d4f6d'),
('osm:node:6617483749', 'https://www.openstreetmap.org/node/6617483749', '{"provider":"openstreetmap","element":{"type":"node","id":6617483749,"lat":40.7308628,"lon":19.5597302,"tags":{"amenity":"pharmacy","name":"Farmaci Elsona Taçi"}}}'::jsonb, '611e22ee80ef9c90366acaeefc4ed5f42c1b1f93aaa12aae581f832356dc26e2', 'Farmaci Elsona Taçi', 'farmaci elsona ta i', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7308628, 19.5597302, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:24930e26a020689baaea8dad68b62fccc7c1a53461394a536bb050ee1a10d633'),
('osm:node:12141005258', 'https://www.openstreetmap.org/node/12141005258', '{"provider":"openstreetmap","element":{"type":"node","id":12141005258,"lat":41.3329006,"lon":19.8657389,"tags":{"addr:city":"Tirana","addr:street":"Rruga Ali Shefqeti","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Enchi"}}}'::jsonb, '52405a18d7ce8896f6a236924fe6b34f72c59f8ff607e0fc606802166a8bdbec', 'Farmaci Enchi', 'farmaci enchi', 'Rruga Ali Shefqeti', 'Rruga Ali Shefqeti, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3329006, 19.8657389, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:21b21e5ab515ab6f64eb516b3f51108b79d4878fce58071d119b2c1cfbca63c8'),
('osm:node:6821142105', 'https://www.openstreetmap.org/node/6821142105', '{"provider":"openstreetmap","element":{"type":"node","id":6821142105,"lat":41.3311096,"lon":19.8437005,"tags":{"addr:city":"Tirana","addr:floor":"G","addr:street":"Rruga Fatos Xhani","amenity":"pharmacy","check_date":"2025-06-24","healthcare":"pharmacy","internet_access":"no","name":"Farmaci Endni","name:sq":"Farmaci Endni","payment:cash":"yes","payment:credit_cards":"yes","payment:debit_cards":"yes","wheelchair":"limited"}}}'::jsonb, '2173746b93b5f3093e5e4331e6cf7d1407aca2474d03b8666f5c4ada5678d948', 'Farmaci Endni', 'farmaci endni', 'Rruga Fatos Xhani', 'Rruga Fatos Xhani, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3311096, 19.8437005, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:c6467efc0a60cd808ac466cc4c19179541dce8a776a7d905945805e0eb6b502b'),
('osm:node:6851510717', 'https://www.openstreetmap.org/node/6851510717', '{"provider":"openstreetmap","element":{"type":"node","id":6851510717,"lat":41.3200373,"lon":19.4465326,"tags":{"addr:street":"Rruga Shoqeria Bashkimi","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Enika"}}}'::jsonb, 'cfe95c16d49f3b670e0356762eeaf62358c69866809a2b429fe9c6f9e3786438', 'Farmaci Enika', 'farmaci enika', 'Rruga Shoqeria Bashkimi', 'Rruga Shoqeria Bashkimi', NULL, NULL, NULL, 'AL', 41.3200373, 19.4465326, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:c34464d4b253b667493ab648873afb058a3eb70ee1a12687f93db1371e494ba8'),
('osm:node:6861215262', 'https://www.openstreetmap.org/node/6861215262', '{"provider":"openstreetmap","element":{"type":"node","id":6861215262,"lat":41.3318778,"lon":19.7782291,"tags":{"amenity":"pharmacy","name":"Farmaci Enio"}}}'::jsonb, 'e4d13d689fdfba31705a25d84bf6d6232073c039f47c025d0c04f91db3ff4531', 'Farmaci Enio', 'farmaci enio', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3318778, 19.7782291, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:3fc82f3460ecd2676dd9c37d7c6904c53cf53b41c4173730dd4bf9126d160556'),
('osm:node:6863520302', 'https://www.openstreetmap.org/node/6863520302', '{"provider":"openstreetmap","element":{"type":"node","id":6863520302,"lat":40.457873,"lon":19.4876756,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Era"}}}'::jsonb, '7e04e6b80c1edb87921802a20d5a7ea41cd6d71b6d06358396218c6d929bfa43', 'Farmaci Era', 'farmaci era', NULL, NULL, NULL, NULL, NULL, 'AL', 40.457873, 19.4876756, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:a53aa628121f445a18eaa3295116a8bae4240e6a54e552b6fcfcd9ee01bb7652'),
('osm:node:6621087866', 'https://www.openstreetmap.org/node/6621087866', '{"provider":"openstreetmap","element":{"type":"node","id":6621087866,"lat":40.7236817,"lon":19.5570665,"tags":{"amenity":"pharmacy","name":"Farmaci Eri"}}}'::jsonb, '0c1fdc074f2c10481374ceb6555dfefb9e9e3e2debc75190011b7a6da2ce78d2', 'Farmaci Eri', 'farmaci eri', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7236817, 19.5570665, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:b4ffc944e9906368a3d60bcd3b3bd3bb5f5dd1744bbbfce54ad18702dbca1cc6'),
('osm:node:6810294065', 'https://www.openstreetmap.org/node/6810294065', '{"provider":"openstreetmap","element":{"type":"node","id":6810294065,"lat":41.3429939,"lon":19.8403095,"tags":{"addr:street":"Rruga Imer Ndregjoni","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Erida"}}}'::jsonb, 'eedcc92dd30d0193f3666ecde1ec3126cdf10534421e2bb944e00f5bd30ac2c7', 'Farmaci Erida', 'farmaci erida', 'Rruga Imer Ndregjoni', 'Rruga Imer Ndregjoni', NULL, NULL, NULL, 'AL', 41.3429939, 19.8403095, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:32a0b8cc75f652e0a2a9b53641a86c0449be0bc67c5dcdd4423c805431c20b72'),
('osm:node:6838850516', 'https://www.openstreetmap.org/node/6838850516', '{"provider":"openstreetmap","element":{"type":"node","id":6838850516,"lat":40.4735774,"lon":19.4928205,"tags":{"addr:street":"Rruga Perlat Rexhepi","amenity":"pharmacy","name":"Farmaci Evi"}}}'::jsonb, '9b398318fbaebef1edeae813beb71a46483a763dd9dcc835f8308662643e1813', 'Farmaci Evi', 'farmaci evi', 'Rruga Perlat Rexhepi', 'Rruga Perlat Rexhepi', NULL, NULL, NULL, 'AL', 40.4735774, 19.4928205, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:5ab890a3b3ad1f1086cf284a638cb21b20b9ecfe07e91da5d9449b1e41292593'),
('osm:node:6841245202', 'https://www.openstreetmap.org/node/6841245202', '{"provider":"openstreetmap","element":{"type":"node","id":6841245202,"lat":41.3322467,"lon":19.827648,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Evi","opening_hours":"Mo-Sa 08:30-21:00; Su 10:00-14:00","shop":"toys"}}}'::jsonb, '61761847d04053e1dad257a60e888e748284d3788a3da4bf87d1d5f1c503c2fe', 'Farmaci Evi', 'farmaci evi', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3322467, 19.827648, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:1ea540adb35ce5eeb649dff7912f5f769097e84066da61bcd60e86fdfb1b2c6f'),
('osm:node:5877983485', 'https://www.openstreetmap.org/node/5877983485', '{"provider":"openstreetmap","element":{"type":"node","id":5877983485,"lat":40.441988,"lon":19.4956159,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Farma Vlora 3"}}}'::jsonb, 'ff2e4b0ae846090493399c2b4e63eee737fae1ee69ebe5bcda5120e7dd281aa6', 'Farmaci Farma Vlora 3', 'farmaci farma vlora 3', NULL, NULL, NULL, NULL, NULL, 'AL', 40.441988, 19.4956159, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:e8ef26e8ece1a23c4c9d9f4bb7a75e405d7199a04ce51115499490b2a26b1c43'),
('osm:node:6879933277', 'https://www.openstreetmap.org/node/6879933277', '{"provider":"openstreetmap","element":{"type":"node","id":6879933277,"lat":41.3352699,"lon":19.8243745,"tags":{"addr:street":"Rruga Skënder Sallaku","amenity":"pharmacy","healthcare":"pharmacy","level":"1","name":"Farmaci Fejza"}}}'::jsonb, 'e9935ccb097c52519f43ac8ba64803c81944d42eec871c55fc86451a3b10769d', 'Farmaci Fejza', 'farmaci fejza', 'Rruga Skënder Sallaku', 'Rruga Skënder Sallaku', NULL, NULL, NULL, 'AL', 41.3352699, 19.8243745, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:99245eae5685f1468126c5baef922bf17499012e5069fbb6511d13d05f68eb6b'),
('osm:node:12634580630', 'https://www.openstreetmap.org/node/12634580630', '{"provider":"openstreetmap","element":{"type":"node","id":12634580630,"lat":41.1120201,"lon":20.0758456,"tags":{"addr:city":"Elbasan","addr:street":"Rruga Kadri Hoxha","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Flora"}}}'::jsonb, '1ee87bb38b13523bec6848b365a429db1eb2dae881d9a852ffc4b502564a5d39', 'Farmaci Flora', 'farmaci flora', 'Rruga Kadri Hoxha', 'Rruga Kadri Hoxha, Elbasan', 'Elbasan', NULL, NULL, 'AL', 41.1120201, 20.0758456, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:d53f82fdfbc7fc8a41dc3f98f1acdafd0393d63214d9971f2a09c2e208386a8b'),
('osm:way:734531771', 'https://www.openstreetmap.org/way/734531771', '{"provider":"openstreetmap","element":{"type":"way","id":734531771,"center":{"lat":41.343104,"lon":19.567049},"tags":{"addr:street":"Rruga e Stadiumit","amenity":"pharmacy","building":"yes","name":"Farmaci Gema"}}}'::jsonb, 'f8ec74e4a1d189c3b4f65c190c7ce68da18900354963e54e3f1112919f07aa34', 'Farmaci Gema', 'farmaci gema', 'Rruga e Stadiumit', 'Rruga e Stadiumit', NULL, NULL, NULL, 'AL', 41.343104, 19.567049, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:de9d26fee9b67b6b1a93b66e8dc60fcdf42b7677de379cf203f98b5e0e6a95ae'),
('osm:node:12610224081', 'https://www.openstreetmap.org/node/12610224081', '{"provider":"openstreetmap","element":{"type":"node","id":12610224081,"lat":41.1119742,"lon":20.0761953,"tags":{"addr:city":"Elbasan","addr:street":"Rruga Kadri Hoxha","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmaci Gent","opening_hours":"Mo-Sa 08:00-20:30","phone":"+355696125060","wheelchair":"yes"}}}'::jsonb, 'a6de1f8f00ec21782e4dcf3487ebabf1d21ef958c2641dc252d704c743088564', 'Farmaci Gent', 'farmaci gent', 'Rruga Kadri Hoxha', 'Rruga Kadri Hoxha, Elbasan', 'Elbasan', NULL, NULL, 'AL', 41.1119742, 20.0761953, '+355696125060', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:eff18d41c0d73f8d519404143a032c5d7a0b8a58ab6df4cef0e39ecf8aa19481'),
('osm:node:4663240125', 'https://www.openstreetmap.org/node/4663240125', '{"provider":"openstreetmap","element":{"type":"node","id":4663240125,"lat":41.3342038,"lon":19.8103865,"tags":{"addr:city":"Tirana","addr:street":"Rruga Petro Marko","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Gerta"}}}'::jsonb, '41cbfbf39cf3fa8239ee4ab4b751a605ccd4ce87fa8493e3fcd8869bc22e6b6d', 'Farmaci Gerta', 'farmaci gerta', 'Rruga Petro Marko', 'Rruga Petro Marko, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3342038, 19.8103865, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:f7d296521de4521d33ebc986cf816ba0a8f9e169e82e9f507cc72cbc7f242953'),
('osm:node:6868022270', 'https://www.openstreetmap.org/node/6868022270', '{"provider":"openstreetmap","element":{"type":"node","id":6868022270,"lat":41.3115059,"lon":19.4990064,"tags":{"addr:street":"Rruga Bajram Curri","amenity":"pharmacy","name":"Farmaci Gerti"}}}'::jsonb, '07860e61506f57846eaf85c8e29012354edaffa0cd7fc05817ba80c2d1f33771', 'Farmaci Gerti', 'farmaci gerti', 'Rruga Bajram Curri', 'Rruga Bajram Curri', NULL, NULL, NULL, 'AL', 41.3115059, 19.4990064, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:57eaa2ba3c62558dfedd01308ee4b6c854a033c7f59dd11cbf6adef22774acfe'),
('osm:node:10863322529', 'https://www.openstreetmap.org/node/10863322529', '{"provider":"openstreetmap","element":{"type":"node","id":10863322529,"lat":41.3386448,"lon":19.7901614,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Gjermane"}}}'::jsonb, '60cb4ff6ea1e663cc985a2be72b649fd17361e3f83265e28ac5efea9c80b802d', 'Farmaci Gjermane', 'farmaci gjermane', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3386448, 19.7901614, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:cb2b23b201b9ed2921d985202ae77499ba8944e585fbf342c711e9ce0c83b58d'),
('osm:node:6864718441', 'https://www.openstreetmap.org/node/6864718441', '{"provider":"openstreetmap","element":{"type":"node","id":6864718441,"lat":41.3339255,"lon":19.8222039,"tags":{"addr:street":"Rruga Siri Kodra","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Goldi"}}}'::jsonb, '75c90f193a6740444d27f76b2371799c823403eec6f73109f770a217bb83ca0f', 'Farmaci Goldi', 'farmaci goldi', 'Rruga Siri Kodra', 'Rruga Siri Kodra', NULL, NULL, NULL, 'AL', 41.3339255, 19.8222039, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:dd39fbdb7906dc50e8115622f59271968964b8becaca3ff4fb7cc95b7e7a5afb'),
('osm:node:7699528590', 'https://www.openstreetmap.org/node/7699528590', '{"provider":"openstreetmap","element":{"type":"node","id":7699528590,"lat":41.3236121,"lon":19.836294,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmaci Grandi"}}}'::jsonb, '761b28ae6eb511bcdeca5b049e859eecda0f06d8f33f5bb45cd7598e6bcff981', 'Farmaci Grandi', 'farmaci grandi', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3236121, 19.836294, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:712ef621b329ededfbabcd292b11d8570860db8bc43da75a9d03e618cfa2bf47'),
('osm:node:6841161474', 'https://www.openstreetmap.org/node/6841161474', '{"provider":"openstreetmap","element":{"type":"node","id":6841161474,"lat":41.3396924,"lon":19.8291984,"tags":{"addr:street":"Rruga Bardhyl","amenity":"pharmacy","check_date":"2024-03-21","healthcare":"pharmacy","name":"Farmaci Greke"}}}'::jsonb, 'a38e44e977ee2da0623867d755a6358cfaef5453eadfc5d7187e0fc795671088', 'Farmaci Greke', 'farmaci greke', 'Rruga Bardhyl', 'Rruga Bardhyl', NULL, NULL, NULL, 'AL', 41.3396924, 19.8291984, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:8c4af549c391bbb94762fcd4b0f2318acc980725dbabea95dabd435f3bd76db7'),
('osm:node:6842012698', 'https://www.openstreetmap.org/node/6842012698', '{"provider":"openstreetmap","element":{"type":"node","id":6842012698,"lat":41.1818729,"lon":19.5488459,"tags":{"addr:street":"Rruga Qazim Kariqi","amenity":"pharmacy","name":"Farmaci Hasa"}}}'::jsonb, '97631b33764afbec719d68099cc5888213eac8ca213b1c638c5773ab160e7afc', 'Farmaci Hasa', 'farmaci hasa', 'Rruga Qazim Kariqi', 'Rruga Qazim Kariqi', NULL, NULL, NULL, 'AL', 41.1818729, 19.5488459, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:17bbd8aa4efb3355340d3538b4e2f1a6fd8d4ba1f6c6afc46a820851331ca698'),
('osm:node:4370817204', 'https://www.openstreetmap.org/node/4370817204', '{"provider":"openstreetmap","element":{"type":"node","id":4370817204,"lat":41.3270251,"lon":19.8069943,"tags":{"addr:street":"Rruga e Kavajës","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Idi"}}}'::jsonb, '020d86e11faff3cbac4903e398e5ecc2bdad353c86df9d925ac9321940ffd7c0', 'Farmaci Idi', 'farmaci idi', 'Rruga e Kavajës', 'Rruga e Kavajës', NULL, NULL, NULL, 'AL', 41.3270251, 19.8069943, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:ef8202c03a2548c6a136cc2dd6f86b365f17db3b75d80a6bd059bf951cf11ef3'),
('osm:node:6840877553', 'https://www.openstreetmap.org/node/6840877553', '{"provider":"openstreetmap","element":{"type":"node","id":6840877553,"lat":41.1833096,"lon":19.5609527,"tags":{"addr:street":"Rruga Zguraj","amenity":"pharmacy","name":"Farmaci Igea"}}}'::jsonb, '5f3c4912d722fdc59085980464abba2d47b273d332405ffac6c1dfd4e421f3a5', 'Farmaci Igea', 'farmaci igea', 'Rruga Zguraj', 'Rruga Zguraj', NULL, NULL, NULL, 'AL', 41.1833096, 19.5609527, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:8cf4036ea3bab54fea929087851236e380fff14358f3526326493fbde8457915');

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
