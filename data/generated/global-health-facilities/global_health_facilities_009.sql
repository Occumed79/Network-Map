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
('osm:node:9128751948', 'https://www.openstreetmap.org/node/9128751948', '{"provider":"openstreetmap","element":{"type":"node","id":9128751948,"lat":41.3322147,"lon":19.8234013,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Rigers"}}}'::jsonb, '55c4c80faa901b64ce7680b960adca0008ae470ac5a2e7ea0bd8c07c6e1da67d', 'Farmaci Rigers', 'farmaci rigers', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3322147, 19.8234013, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:de298536bf61988dfd065835598d470277048b299b194c7ae244c362c6ac183e'),
('osm:node:6845643716', 'https://www.openstreetmap.org/node/6845643716', '{"provider":"openstreetmap","element":{"type":"node","id":6845643716,"lat":40.4659243,"lon":19.4908337,"tags":{"addr:street":"Rruga Reshat Osmani","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Rita"}}}'::jsonb, '1ad176cba1b123d11c9b77233d6a619abafd9a9533f2346ef90811d5bc68025e', 'Farmaci Rita', 'farmaci rita', 'Rruga Reshat Osmani', 'Rruga Reshat Osmani', NULL, NULL, NULL, 'AL', 40.4659243, 19.4908337, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:27148acb17cdc8d890b72a806e06502fe01d72a16a1a328ee7a954c5a44cfc07'),
('osm:way:732701690', 'https://www.openstreetmap.org/way/732701690', '{"provider":"openstreetmap","element":{"type":"way","id":732701690,"center":{"lat":41.3527064,"lon":19.8061901},"tags":{"addr:city":"Paskuqan","addr:street":"Rruga Azem Galica","amenity":"pharmacy","building":"retail","healthcare":"pharmacy","name":"Farmaci Roi"}}}'::jsonb, '98977dd27291fd5f92b69e38a0af0b69ba4d80b4ae76fb759e00115718a13dc9', 'Farmaci Roi', 'farmaci roi', 'Rruga Azem Galica', 'Rruga Azem Galica, Paskuqan', 'Paskuqan', NULL, NULL, 'AL', 41.3527064, 19.8061901, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:3bda177529e795eeef84300e999b8a6e77682c1c192392aa14d3583e30f0edb3'),
('osm:node:6617476657', 'https://www.openstreetmap.org/node/6617476657', '{"provider":"openstreetmap","element":{"type":"node","id":6617476657,"lat":40.731753,"lon":19.5620395,"tags":{"amenity":"pharmacy","name":"Farmaci Roza"}}}'::jsonb, 'd0343462eb21b5526943ad6b3fccd2d35899dbef59376ecfa5ff88526abc7540', 'Farmaci Roza', 'farmaci roza', NULL, NULL, NULL, NULL, NULL, 'AL', 40.731753, 19.5620395, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:36420f3530af6e0c9cc0819965eaff9cb6902ee55ba49ef22c5dec7f97f45d83'),
('osm:node:6879940872', 'https://www.openstreetmap.org/node/6879940872', '{"provider":"openstreetmap","element":{"type":"node","id":6879940872,"lat":41.3258086,"lon":19.4455942,"tags":{"addr:street":"Rruga Ahmet Ramzoti","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Sagel"}}}'::jsonb, '501a396285f59acc609c115b06714573881dd8a60e0d8d43b7575a58d097fc92', 'Farmaci Sagel', 'farmaci sagel', 'Rruga Ahmet Ramzoti', 'Rruga Ahmet Ramzoti', NULL, NULL, NULL, 'AL', 41.3258086, 19.4455942, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:afa7e5d22a05ea29152ab20635ec5baae46dc736df7cf1b820e023d3abfcdac7'),
('osm:node:6844718973', 'https://www.openstreetmap.org/node/6844718973', '{"provider":"openstreetmap","element":{"type":"node","id":6844718973,"lat":41.3350939,"lon":19.7826237,"tags":{"addr:city":"Tirana","addr:street":"Rruga Teodor Keko","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Sagema"}}}'::jsonb, 'd0de3e68376cafc78dbb22b85970562663fd3b1ccc50200a7c440ab476da1bbd', 'Farmaci Sagema', 'farmaci sagema', 'Rruga Teodor Keko', 'Rruga Teodor Keko, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3350939, 19.7826237, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:e3bee418a8a8f4c057e6144cd23ecda6ff5c4b008ec10f20b3d8525433391b3d'),
('osm:node:6813184589', 'https://www.openstreetmap.org/node/6813184589', '{"provider":"openstreetmap","element":{"type":"node","id":6813184589,"lat":41.3427234,"lon":19.8348641,"tags":{"addr:street":"Rruga e Dibrës","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Sagit"}}}'::jsonb, '148a58b00c2fe045f407e5754ca34070adafd239a71707c77f5032da4929e2b7', 'Farmaci Sagit', 'farmaci sagit', 'Rruga e Dibrës', 'Rruga e Dibrës', NULL, NULL, NULL, 'AL', 41.3427234, 19.8348641, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:492289b1bf273a2f240d8fa4a5aa3833c50883725f0f6573df3807f772f67dad'),
('osm:node:3911414066', 'https://www.openstreetmap.org/node/3911414066', '{"provider":"openstreetmap","element":{"type":"node","id":3911414066,"lat":40.7325635,"lon":19.5692215,"tags":{"amenity":"pharmacy","name":"Farmaci Sanxhaku","opening_hours":"Mo-Su 08:00-14:00,17:00-20:00"}}}'::jsonb, 'af97e4b2c55c44e2b59a79e68d10ff041f9e0c6c9ce0a575a916742bcbde8a0e', 'Farmaci Sanxhaku', 'farmaci sanxhaku', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7325635, 19.5692215, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:bebec831c6fe29564a6d8ec56ee8daf95e9c94cf8037a1f3fe17111656b5e7c2'),
('osm:node:6821429906', 'https://www.openstreetmap.org/node/6821429906', '{"provider":"openstreetmap","element":{"type":"node","id":6821429906,"lat":41.3002765,"lon":19.8492446,"tags":{"addr:street":"Rruga e Elbasanit","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Sauku"}}}'::jsonb, '3cd6f7b852ddce7ea80319b72b326b9f60a3e3265d5475adecc8f9c9d25052c5', 'Farmaci Sauku', 'farmaci sauku', 'Rruga e Elbasanit', 'Rruga e Elbasanit', NULL, NULL, NULL, 'AL', 41.3002765, 19.8492446, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:25a01d96b4431404b929117ef596196b4bd01e7881ca552c8b2a3d659be2348e'),
('osm:node:6813034779', 'https://www.openstreetmap.org/node/6813034779', '{"provider":"openstreetmap","element":{"type":"node","id":6813034779,"lat":41.3449079,"lon":19.837518,"tags":{"addr:street":"Rruga e Dibrës","amenity":"pharmacy","name":"Farmaci Selva"}}}'::jsonb, 'b8361404033666014a5fe3d762c2154615cb8d8046c416a31db151fd3310ca9a', 'Farmaci Selva', 'farmaci selva', 'Rruga e Dibrës', 'Rruga e Dibrës', NULL, NULL, NULL, 'AL', 41.3449079, 19.837518, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:13ae704962b9340634962b6e423854612b387897058f9fe715e5c8fa4bb48ea2'),
('osm:node:6827979380', 'https://www.openstreetmap.org/node/6827979380', '{"provider":"openstreetmap","element":{"type":"node","id":6827979380,"lat":41.3252799,"lon":19.8277473,"tags":{"addr:street":"Rruga Petro Nini Luarasi","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Sevi"}}}'::jsonb, '8ebfdbd9203d33a279cea2f37932eb026ed899861e1074e3a21f8537d3133071', 'Farmaci Sevi', 'farmaci sevi', 'Rruga Petro Nini Luarasi', 'Rruga Petro Nini Luarasi', NULL, NULL, NULL, 'AL', 41.3252799, 19.8277473, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:3b7dcbcb1e0a7cd5e01a5bca834c1aaba61acccb53fbd1b02a43ca846452226b'),
('osm:node:6845079604', 'https://www.openstreetmap.org/node/6845079604', '{"provider":"openstreetmap","element":{"type":"node","id":6845079604,"lat":41.3214708,"lon":19.4530709,"tags":{"addr:street":"Rruga Abaz Çelkupa","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Shaba"}}}'::jsonb, '1dda76b49f4c65dc395ef24640670c1cb48811a59e6021099fd367f0eb275350', 'Farmaci Shaba', 'farmaci shaba', 'Rruga Abaz Çelkupa', 'Rruga Abaz Çelkupa', NULL, NULL, NULL, 'AL', 41.3214708, 19.4530709, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:450f826225fc5e82e800fbd18fc3ca451997102bd27205fbe907b52f223cc951'),
('osm:node:6845292948', 'https://www.openstreetmap.org/node/6845292948', '{"provider":"openstreetmap","element":{"type":"node","id":6845292948,"lat":41.357934,"lon":19.4812019,"tags":{"amenity":"pharmacy","name":"Farmaci Shabani"}}}'::jsonb, '2d371449aedc9d60fd10604ff172523f0ac8306c7daabde3376ca904926df85e', 'Farmaci Shabani', 'farmaci shabani', NULL, NULL, NULL, NULL, NULL, 'AL', 41.357934, 19.4812019, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:457509a0abd9cd3728a8fa2aaa8d3559b1c8c48e1604cea7d5b005debd452bd4'),
('osm:node:6844882686', 'https://www.openstreetmap.org/node/6844882686', '{"provider":"openstreetmap","element":{"type":"node","id":6844882686,"lat":41.3577152,"lon":19.7738586,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Shehi"}}}'::jsonb, 'd5a9ddf81088c5df553377ae502c819dcfa4c8273d09819bcc9c3fd4fd57d130', 'Farmaci Shehi', 'farmaci shehi', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3577152, 19.7738586, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:687f0426d62469e3d844c119b5f6cd7f76dbe98558b2461803be10ed2ebf61c0'),
('osm:node:7021792311', 'https://www.openstreetmap.org/node/7021792311', '{"provider":"openstreetmap","element":{"type":"node","id":7021792311,"lat":40.7260456,"lon":19.5553945,"tags":{"amenity":"pharmacy","name":"Farmaci Shehu"}}}'::jsonb, '66e0ed9afe1f818666d5a5c58d68f0e0db34766879179c0d7ff7890b58729237', 'Farmaci Shehu', 'farmaci shehu', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7260456, 19.5553945, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:cdffccdc506bd040f9ddd4457d6e567dcb5ecd5ccce6c69bfa767c61cd2ed78a'),
('osm:node:6621146433', 'https://www.openstreetmap.org/node/6621146433', '{"provider":"openstreetmap","element":{"type":"node","id":6621146433,"lat":40.7221931,"lon":19.5558822,"tags":{"amenity":"pharmacy","name":"Farmaci Shendeti"}}}'::jsonb, '49868bb09093c93a8a2df673f0ff52115bd5344cda81b13f883237259e0d4b96', 'Farmaci Shendeti', 'farmaci shendeti', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7221931, 19.5558822, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:a403195b2adb6c3280a1e5f233303de56f8bebd3d132f5ce9ca9dbbf7bdb1ea6'),
('osm:way:171061752', 'https://www.openstreetmap.org/way/171061752', '{"provider":"openstreetmap","element":{"type":"way","id":171061752,"center":{"lat":41.3254471,"lon":19.4442444},"tags":{"amenity":"pharmacy","building":"yes","dispensing":"no","healthcare":"pharmacy","name":"FARMACI SHËNDETI"}}}'::jsonb, '8ad09dde7f591c00304b0d7485443d40f96118fb58ca8239b273384f7bf6a04a', 'FARMACI SHËNDETI', 'farmaci sh ndeti', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3254471, 19.4442444, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:3f8cc85a145d1887ca1faca63110dcbf9f96c9f4dedb766adbdb34e4b07c73f5'),
('osm:node:6872144789', 'https://www.openstreetmap.org/node/6872144789', '{"provider":"openstreetmap","element":{"type":"node","id":6872144789,"lat":41.3216299,"lon":19.4504678,"tags":{"addr:street":"Rruga Mujo Ulqinaku","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Shëngjergji"}}}'::jsonb, '027355dc3befbdfe6db2d9a3a5b76372b49c277e864b6d6d57a6317756bc2f0b', 'Farmaci Shëngjergji', 'farmaci sh ngjergji', 'Rruga Mujo Ulqinaku', 'Rruga Mujo Ulqinaku', NULL, NULL, NULL, 'AL', 41.3216299, 19.4504678, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:14b101d28daff707dde192fd341dc4cff86708464a5843dad4ec21218cee58a0'),
('osm:node:6861503386', 'https://www.openstreetmap.org/node/6861503386', '{"provider":"openstreetmap","element":{"type":"node","id":6861503386,"lat":41.327504,"lon":19.4439923,"tags":{"addr:street":"Rruga Kastrioti","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Shërbim","opening_hours":"24/7"}}}'::jsonb, '80d6c218acd4e956d5b3f95e5e79d426b3eaea1e24da031934070c7dd6a519a4', 'Farmaci Shërbim', 'farmaci sh rbim', 'Rruga Kastrioti', 'Rruga Kastrioti', NULL, NULL, NULL, 'AL', 41.327504, 19.4439923, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:6807c0425da1c27d0174ac6b2e24ca8fbc35457bd050ec8805d64747e8d8cd8f'),
('osm:node:6617261277', 'https://www.openstreetmap.org/node/6617261277', '{"provider":"openstreetmap","element":{"type":"node","id":6617261277,"lat":40.7313591,"lon":19.565428,"tags":{"amenity":"pharmacy","name":"Farmaci Sihana"}}}'::jsonb, 'b08b44d7ea1516be8add7254af3ad3083bc698d777da7da4437f03821d998d8f', 'Farmaci Sihana', 'farmaci sihana', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7313591, 19.565428, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:ad2d7aab93288e02cf081809a37af39c0640886cbbbe502623e914d80d5016d3'),
('osm:node:6812929853', 'https://www.openstreetmap.org/node/6812929853', '{"provider":"openstreetmap","element":{"type":"node","id":6812929853,"lat":41.3425525,"lon":19.833844,"tags":{"addr:street":"Rruga e Dibrës","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Skenderaj"}}}'::jsonb, '484e7dca7db0f19b41112290fad31302b69cb658c723010a63b7f61ce80526a0', 'Farmaci Skenderaj', 'farmaci skenderaj', 'Rruga e Dibrës', 'Rruga e Dibrës', NULL, NULL, NULL, 'AL', 41.3425525, 19.833844, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:a5749c3a9defc797cc4a0211dd65f95231a9672a6d3650542f6569e9a2166bb9'),
('osm:node:6818217521', 'https://www.openstreetmap.org/node/6818217521', '{"provider":"openstreetmap","element":{"type":"node","id":6818217521,"lat":41.3267464,"lon":19.8396808,"tags":{"addr:street":"Rruga Idriz Dollaru","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Smerald Farma"}}}'::jsonb, '6b9a38b82dbd5b6de03747f7184d542c5aebb5e06c2a7f79d2f844e4bad43f53', 'Farmaci Smerald Farma', 'farmaci smerald farma', 'Rruga Idriz Dollaru', 'Rruga Idriz Dollaru', NULL, NULL, NULL, 'AL', 41.3267464, 19.8396808, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:a3abb1ded42ef2be6a31e452c23552ef64efd19230b6a9e8f55ce3713024f11c'),
('osm:node:6806275976', 'https://www.openstreetmap.org/node/6806275976', '{"provider":"openstreetmap","element":{"type":"node","id":6806275976,"lat":41.3048082,"lon":19.8444877,"tags":{"addr:street":"Rruga e Elbasanit","amenity":"pharmacy","name":"Farmaci Snuku"}}}'::jsonb, '58fdc9061bd34cf6b9f050f04f095fa8dd54c1fa045db89f14911e670589e6ac', 'Farmaci Snuku', 'farmaci snuku', 'Rruga e Elbasanit', 'Rruga e Elbasanit', NULL, NULL, NULL, 'AL', 41.3048082, 19.8444877, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:7b38af17b9cd9a4313a707a32459b9df3652a3265d61d8639f5fc7f5ed1d2d61'),
('osm:node:7019592237', 'https://www.openstreetmap.org/node/7019592237', '{"provider":"openstreetmap","element":{"type":"node","id":7019592237,"lat":40.7341146,"lon":19.5674144,"tags":{"amenity":"pharmacy","name":"Farmaci Sonila"}}}'::jsonb, '8accb6fa44ad7f3163e830dcb1c5b07ba1864b621d8d91d08f0ab651c52ad2e8', 'Farmaci Sonila', 'farmaci sonila', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7341146, 19.5674144, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:7aad08d2ae83e3d3aea855cda2538b1112d5a0598f58e9d478a0f2701f2059c5'),
('osm:node:6838962495', 'https://www.openstreetmap.org/node/6838962495', '{"provider":"openstreetmap","element":{"type":"node","id":6838962495,"lat":41.3290985,"lon":19.8267498,"tags":{"addr:city":"Tirana","addr:full":"Njesla bashklake nr 2, Rruga Tefta Tashko, Pallati nr 12, Dyqani Nr.6","addr:street":"Rruga Tefta Tashko Koço","amenity":"pharmacy","check_date":"2024-06-15","healthcare":"pharmacy","name":"Farmaci Sota","payment:cash":"yes","ref:vatin":"AL-L42325028B"}}}'::jsonb, '58252b6c42d88b6537b1eaec7938a687e7bc303e04bb4fefc7cec1fe9698149d', 'Farmaci Sota', 'farmaci sota', 'Rruga Tefta Tashko Koço', 'Rruga Tefta Tashko Koço, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3290985, 19.8267498, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:e96adc9738ac809d9521d4b5b36c1e40d1a9649b12c3618c77fff3f30b79a653'),
('osm:node:7019598465', 'https://www.openstreetmap.org/node/7019598465', '{"provider":"openstreetmap","element":{"type":"node","id":7019598465,"lat":40.7344075,"lon":19.5599985,"tags":{"amenity":"pharmacy","name":"Farmaci Taulant Naçi"}}}'::jsonb, '54826dcfc36441011e3e34b144e51f09e8eff0f375a528507a9d03f388af0aa9', 'Farmaci Taulant Naçi', 'farmaci taulant na i', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7344075, 19.5599985, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:4e35b3ae07cbe09165db40f2852ba2efa3c67f5a83e2a95174a1e0640c384127'),
('osm:node:9138114436', 'https://www.openstreetmap.org/node/9138114436', '{"provider":"openstreetmap","element":{"type":"node","id":9138114436,"lat":41.3119793,"lon":19.4355819,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Tefa"}}}'::jsonb, 'cfac758fa489c7e43baafc10557b6aaacbdb464e9cc983ad4cb7185d04e08ba7', 'Farmaci Tefa', 'farmaci tefa', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3119793, 19.4355819, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:bb18065c0a15d2c9334169519220d1eadf308b76120588ca75876d057449c2d0'),
('osm:way:389191128', 'https://www.openstreetmap.org/way/389191128', '{"provider":"openstreetmap","element":{"type":"way","id":389191128,"center":{"lat":42.0660369,"lon":19.5145519},"tags":{"addr:city":"Shkodër","addr:country":"AL","addr:postcode":"4001","addr:street":"Bulevardi Skënderbeu","amenity":"pharmacy","building":"yes","name":"Farmaci Temali","payment:cash":"yes","payment:credit_cards":"no","payment:cryptocurrencies":"no","payment:debit_cards":"no","payment:electronic_purses":"no","source":"bing;mapbox-satellite;digitalglobe;survey;knowledge;local-info","source_ref:url":"https://www.flickr.com/photos/openstreetmap-albania","wheelchair":"limited"}}}'::jsonb, 'dead954c8dd6298da6d3ff2c96caf1b2f1e43a3ba7def4649c925a788905fa8e', 'Farmaci Temali', 'farmaci temali', 'Bulevardi Skënderbeu', 'Bulevardi Skënderbeu, Shkodër, 4001', 'Shkodër', NULL, '4001', 'AL', 42.0660369, 19.5145519, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:bf2f78f9fd02eebae63715bf4f7181d7dc8388c4625b0cb3d4028dfd3a04205f'),
('osm:node:6838917693', 'https://www.openstreetmap.org/node/6838917693', '{"provider":"openstreetmap","element":{"type":"node","id":6838917693,"lat":40.4729354,"lon":19.4921011,"tags":{"addr:street":"Rruga Perlat Rexhepi","amenity":"pharmacy","name":"Farmaci Valbona"}}}'::jsonb, '162584747f5646c12dd69a8f3ffba496848de5721b9255b7f0ccc3afee62ea17', 'Farmaci Valbona', 'farmaci valbona', 'Rruga Perlat Rexhepi', 'Rruga Perlat Rexhepi', NULL, NULL, NULL, 'AL', 40.4729354, 19.4921011, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:2f533f72e334cf639ed3b5b54bd974aa6ab4ed9acba4afe966725dcb6249befd'),
('osm:node:6864718449', 'https://www.openstreetmap.org/node/6864718449', '{"provider":"openstreetmap","element":{"type":"node","id":6864718449,"lat":41.3356228,"lon":19.8211994,"tags":{"addr:street":"Rruga Siri Kodra","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Vera"}}}'::jsonb, '2b032c50d16f229bc7e372a311d388cfb691cc855ee005a2f1b90092dbbf4161', 'Farmaci Vera', 'farmaci vera', 'Rruga Siri Kodra', 'Rruga Siri Kodra', NULL, NULL, NULL, 'AL', 41.3356228, 19.8211994, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:d1eade6aa619ce61353abcafee6843ef1d877e72b3ef6051a054a3ce2db1b276'),
('osm:node:11965377522', 'https://www.openstreetmap.org/node/11965377522', '{"provider":"openstreetmap","element":{"type":"node","id":11965377522,"lat":41.3026809,"lon":19.846165,"tags":{"addr:city":"Tirana","addr:street":"Rruga e Elbasanit","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Veterinare Behari"}}}'::jsonb, 'b14762c0aeedb176977fe1a1a1f6649aa5edc82ea7ab0b253abbf3b4bb0ca49c', 'Farmaci Veterinare Behari', 'farmaci veterinare behari', 'Rruga e Elbasanit', 'Rruga e Elbasanit, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3026809, 19.846165, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:3b66c4e33c2c785a1cecf1d7c8b7b46e4e4608a40d6e2caf2dfcf9b4d7a39e42'),
('osm:node:6853607331', 'https://www.openstreetmap.org/node/6853607331', '{"provider":"openstreetmap","element":{"type":"node","id":6853607331,"lat":40.7261206,"lon":19.5581748,"tags":{"amenity":"pharmacy","name":"Farmaci Veterinare Efran Bendo","phone":"+355697981606"}}}'::jsonb, '338a22d355fc2d9713288e8ee90296e6caf60638d851bb348d27f7bc8842c472', 'Farmaci Veterinare Efran Bendo', 'farmaci veterinare efran bendo', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7261206, 19.5581748, '+355697981606', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:ac354675daa1bbd2a6fa5a17b926dd97b44216ab2d7df47db8a26ee60e53fdb1'),
('osm:node:10101317215', 'https://www.openstreetmap.org/node/10101317215', '{"provider":"openstreetmap","element":{"type":"node","id":10101317215,"lat":41.3271366,"lon":19.8228411,"tags":{"amenity":"pharmacy","check_date":"2022-10-14","healthcare":"pharmacy","level":"-1","name":"Farmaci Vian"}}}'::jsonb, '34b6fea0bc57c5d1376a0cba2170d039a535bb2688bdf14d5a0ba15389aec74e', 'Farmaci Vian', 'farmaci vian', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3271366, 19.8228411, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:c4de6e8250eac30c1eb3c817dd5ae5b10681354de1550ba75a11fd20c13aa7f7'),
('osm:node:5416658627', 'https://www.openstreetmap.org/node/5416658627', '{"provider":"openstreetmap","element":{"type":"node","id":5416658627,"lat":41.1116323,"lon":20.0910892,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Viena"}}}'::jsonb, '746ec91cf5195b0bc610fc26016e8a41f16f3d45f54b16215098cb8aa78f6e86', 'Farmaci Viena', 'farmaci viena', NULL, NULL, NULL, NULL, NULL, 'AL', 41.1116323, 20.0910892, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:3f695a2aa33dc9eedc886c9b42b45f0eb89660b585e3310b4ebc819459f81f0d'),
('osm:node:6879940877', 'https://www.openstreetmap.org/node/6879940877', '{"provider":"openstreetmap","element":{"type":"node","id":6879940877,"lat":41.3258106,"lon":19.4457901,"tags":{"addr:street":"Rruga Ahmet Ramzoti","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Vital"}}}'::jsonb, '1c66e6c8c6b3fd280de2a2b1b0f61eb3b7c3fd35723989d176e08dab4255183d', 'Farmaci Vital', 'farmaci vital', 'Rruga Ahmet Ramzoti', 'Rruga Ahmet Ramzoti', NULL, NULL, NULL, 'AL', 41.3258106, 19.4457901, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:98f4ec636400280d2e2705c02ba3970deaff9d103737d78e2cad6915c9a27b46'),
('osm:way:462428126', 'https://www.openstreetmap.org/way/462428126', '{"provider":"openstreetmap","element":{"type":"way","id":462428126,"center":{"lat":41.3294836,"lon":19.8052724},"tags":{"addr:city":"Tirana","addr:postcode":"1001","addr:street":"Rruga Naim Frashëri","amenity":"pharmacy","building":"apartments","healthcare":"pharmacy","name":"Farmaci Vjosa","opening_hours":"8:00-21:00"}}}'::jsonb, 'de55f9a96bb9eb56ed6de531d69a3a6ceaff22952aa5fc35e73d877a23997856', 'Farmaci Vjosa', 'farmaci vjosa', 'Rruga Naim Frashëri', 'Rruga Naim Frashëri, Tirana, 1001', 'Tirana', NULL, '1001', 'AL', 41.3294836, 19.8052724, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:eee94cd2ccc1ee1f98086a22e3f7f05a2c8d9ad8d0e86c8f9d72e07e6e838eb8'),
('osm:node:11348933081', 'https://www.openstreetmap.org/node/11348933081', '{"provider":"openstreetmap","element":{"type":"node","id":11348933081,"lat":41.3319301,"lon":19.8343048,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci VPh 1"}}}'::jsonb, '9d9d165e5a397e3ccf19a37be2c69fcc938b8338ab324d926eae921793b7689d', 'Farmaci VPh 1', 'farmaci vph 1', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3319301, 19.8343048, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:9bfff5e6116589f2fa3e4ebe204bfe31138dcc02c5f2d616c3fbb5ca291dca6f'),
('osm:node:3987564920', 'https://www.openstreetmap.org/node/3987564920', '{"provider":"openstreetmap","element":{"type":"node","id":3987564920,"lat":42.0583849,"lon":19.5025593,"tags":{"addr:country":"AL","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmaci Xhabijej","payment:coins":"yes","payment:credit_cards":"no","payment:cryptocurrencies":"no","payment:debit_cards":"no","payment:electronic_purses":"no","payment:notes":"yes","smoking":"outside","source":"Bing Aerial Imagery;survey","source_ref:url":"https://www.flickr.com/photos/134902422@N04/map?&fLat=41.9559&fLon=19.4337&zl=11&order_by=recent","wheelchair":"yes"}}}'::jsonb, 'dda22ad12f9779904adf6000b96e9141320bea65f227818fb77c6d8232fa054a', 'Farmaci Xhabijej', 'farmaci xhabijej', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0583849, 19.5025593, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:a9da9843bfd58302f2aebe88dd41dcf48ff4575dffa9a7a112d840ddc849d1c4'),
('osm:node:6872343253', 'https://www.openstreetmap.org/node/6872343253', '{"provider":"openstreetmap","element":{"type":"node","id":6872343253,"lat":41.3264562,"lon":19.7721666,"tags":{"addr:street":"Rruga Manzurane","amenity":"pharmacy","name":"Farmaci Yzberishti"}}}'::jsonb, '136ee2ab025ec3843364cee6a194bcad84096836474e1a8f2d786762d7d3108a', 'Farmaci Yzberishti', 'farmaci yzberishti', 'Rruga Manzurane', 'Rruga Manzurane', NULL, NULL, NULL, 'AL', 41.3264562, 19.7721666, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:eda35c4b0228321f5f1205a84dda6b8693d6fb7a78cea1a561eac6d46a2b8855'),
('osm:way:725914312', 'https://www.openstreetmap.org/way/725914312', '{"provider":"openstreetmap","element":{"type":"way","id":725914312,"center":{"lat":41.3460573,"lon":19.8545226},"tags":{"addr:city":"Tirana","addr:street":"Rruga Artan Boriçi","amenity":"pharmacy","building":"commercial","check_date":"2024-05-12","healthcare":"pharmacy","name":"Farmaci Zaimi"}}}'::jsonb, 'a6bb2f221893e15dd5f79c0a930f3892e1decd308eb523cea2a2e617f5c00f60', 'Farmaci Zaimi', 'farmaci zaimi', 'Rruga Artan Boriçi', 'Rruga Artan Boriçi, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3460573, 19.8545226, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:e2a1e3a7de627b71c35e79de8d46b2f1ccbf8207b66624d6a856bd8adaa9f433'),
('osm:way:166692486', 'https://www.openstreetmap.org/way/166692486', '{"provider":"openstreetmap","element":{"type":"way","id":166692486,"center":{"lat":41.3254704,"lon":19.4451938},"tags":{"amenity":"pharmacy","dispensing":"no","healthcare":"pharmacy","name":"FARMACI\"BEBA\""}}}'::jsonb, 'b003e8aa17e8daf3e16ea1b2d5240b0ee727959414ac905b38e124217e236c88', 'FARMACI"BEBA"', 'farmaci beba', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3254704, 19.4451938, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:6c957d03d4e443b2857997b6f1227abf429bdf24b4ae0086adc2dd9cbfedb487'),
('osm:node:11488166022', 'https://www.openstreetmap.org/node/11488166022', '{"provider":"openstreetmap","element":{"type":"node","id":11488166022,"lat":41.326243,"lon":19.8055878,"tags":{"amenity":"pharmacy","check_date":"2024-01-04","healthcare":"pharmacy","name":"Farmaci9"}}}'::jsonb, 'bbc9882827225041c7452eccb3093ab8c177f729dbd9669c13b483b3322d0dc4', 'Farmaci9', 'farmaci9', NULL, NULL, NULL, NULL, NULL, 'AL', 41.326243, 19.8055878, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:30693c327d3545b8322d621afbfe8ac9a88fc7e38eea849857b1b87d305bcf6d'),
('osm:node:5598889422', 'https://www.openstreetmap.org/node/5598889422', '{"provider":"openstreetmap","element":{"type":"node","id":5598889422,"lat":40.6182686,"lon":20.7765566,"tags":{"amenity":"pharmacy","name":"Farmacia 1","opening_hours":"Mo-Sa 07:30-20:00","wheelchair":"no"}}}'::jsonb, 'be830466d689999e10f404473a37d9d8e11c9d8317e88eea9d90916c63e10d05', 'Farmacia 1', 'farmacia 1', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6182686, 20.7765566, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:0201b3b1b452eab3f54e0d0a5a22615f967372c771dd8fbac14c7a890539f9be'),
('osm:node:11751911926', 'https://www.openstreetmap.org/node/11751911926', '{"provider":"openstreetmap","element":{"type":"node","id":11751911926,"lat":41.3405244,"lon":19.8297085,"tags":{"addr:city":"Tirana","addr:street":"Rruga e Dibrës","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmacia 10"}}}'::jsonb, 'd17db23e749c6883369670338fb26f9ff81151b751837de0c4ae94a66feac24b', 'Farmacia 10', 'farmacia 10', 'Rruga e Dibrës', 'Rruga e Dibrës, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3405244, 19.8297085, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:56bd66e04007c77417d310180ffbb73dee2865b393204e32e96c3b3b82d9f1f5'),
('osm:way:459234794', 'https://www.openstreetmap.org/way/459234794', '{"provider":"openstreetmap","element":{"type":"way","id":459234794,"center":{"lat":41.3013083,"lon":19.8318542},"tags":{"addr:housenumber":"87","addr:street":"Rruga Selim Brahja","amenity":"pharmacy","building":"yes","email":"alansauk@hotmail.com","name":"Farmacia Alan","opening_hours":"Mo-Su 07:30-21:00","operator":"Andi Hallulli","phone":"+355698810838","source":"bing;mapbox;digitalglobe-satellite","source_ref:url":"https://www.flickr.com/photos/openstreetmap-albania/"}}}'::jsonb, '116fd72f811d414ccb3fdc467126f246bb62462fcd7712e0a73a1c1b35a1b984', 'Farmacia Alan', 'farmacia alan', '87 Rruga Selim Brahja', '87 Rruga Selim Brahja', NULL, NULL, NULL, 'AL', 41.3013083, 19.8318542, '+355698810838', NULL, 'alansauk@hotmail.com', 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:dfd48140976cf674b23f5a4787f6d61d744d348a96c19c0d4860d4942d078293'),
('osm:node:9536038479', 'https://www.openstreetmap.org/node/9536038479', '{"provider":"openstreetmap","element":{"type":"node","id":9536038479,"lat":41.3466776,"lon":19.8558294,"tags":{"addr:city":"Tiranë","amenity":"pharmacy","check_date":"2024-05-12","dispensing":"yes","healthcare":"pharmacy","name":"Farmacia Ana"}}}'::jsonb, 'd493a210e2715cf1740bf393757435eb38f5cc9fff04f78b631fe5d70f00dcf5', 'Farmacia Ana', 'farmacia ana', NULL, 'Tiranë', 'Tiranë', NULL, NULL, 'AL', 41.3466776, 19.8558294, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:f8cd33523122f99d89cc406dc6dc6c86ebbe45e7d9e543828f6c89471920bfd6'),
('osm:node:1952953813', 'https://www.openstreetmap.org/node/1952953813', '{"provider":"openstreetmap","element":{"type":"node","id":1952953813,"lat":41.3178303,"lon":19.4500909,"tags":{"addr:city":"Durres","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmacia Babamusta"}}}'::jsonb, '00c0f219d754f5bea0e4a3c3e389828f5d56f946e14e25d2cefcea1f7783bc40', 'Farmacia Babamusta', 'farmacia babamusta', NULL, 'Durres', 'Durres', NULL, NULL, 'AL', 41.3178303, 19.4500909, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:033ac0cde1043e9d86c1328c0d9dfa61600910e535d0cb7196dbb3b0ff59eb1d'),
('osm:node:6855604285', 'https://www.openstreetmap.org/node/6855604285', '{"provider":"openstreetmap","element":{"type":"node","id":6855604285,"lat":41.3144286,"lon":19.4480561,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmacia Babamusta"}}}'::jsonb, '499cef619e75c6915b5d29140696fd747028dd6f7b202a9028a65bbe7ad6c565', 'Farmacia Babamusta', 'farmacia babamusta', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3144286, 19.4480561, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:24fb39ce26193d5599767459af846c5ed0ceb153991f303da4fb41320cb92657'),
('osm:node:9124938556', 'https://www.openstreetmap.org/node/9124938556', '{"provider":"openstreetmap","element":{"type":"node","id":9124938556,"lat":41.3270181,"lon":19.8242807,"tags":{"amenity":"pharmacy","check_date":"2024-06-17","healthcare":"pharmacy","level":"-1","name":"Farmacia Butrinti"}}}'::jsonb, '7ea80011968e3e34550ecbf1211f8ac09746b1bf7b4df23dec55467906c51aa9', 'Farmacia Butrinti', 'farmacia butrinti', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3270181, 19.8242807, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:b364cdefea48f99cb45a932414c24a544ebafa9c48291e3570167f15d5fdba5b'),
('osm:node:6614653332', 'https://www.openstreetmap.org/node/6614653332', '{"provider":"openstreetmap","element":{"type":"node","id":6614653332,"lat":40.7294676,"lon":19.5652995,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmacia Bylis","opening_hours":"Mo-Su 08:30-13:30,17:00-20:00"}}}'::jsonb, '6f30967bad3c67b758e802f83941afe86fc7d006ef8f4956f60d5e3d00919868', 'Farmacia Bylis', 'farmacia bylis', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7294676, 19.5652995, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:20efcdd87b18bd329731c66d1501627fe70c3eefd62119112ece2be49eee6997');

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
