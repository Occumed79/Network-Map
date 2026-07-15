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
('osm:node:7883108815', 'https://www.openstreetmap.org/node/7883108815', '{"provider":"openstreetmap","element":{"type":"node","id":7883108815,"lat":34.5288825,"lon":69.1726272,"tags":{"healthcare":"laboratory","name":"لابراتوار پزشکی صبا","name:en":"Saba Medical Lab"}}}'::jsonb, 'b2908673c553a83fe0d375a5c6646201b914a73d672336bba5bf69218d4a1b48', 'لابراتوار پزشکی صبا', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5288825, 69.1726272, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:1b77d8e4816f37470fbf4fef6ac7bdea14ac553aa41cb4c26def338bb9852983'),
('osm:node:7183733178', 'https://www.openstreetmap.org/node/7183733178', '{"provider":"openstreetmap","element":{"type":"node","id":7183733178,"lat":33.6014025,"lon":69.2269583,"tags":{"healthcare":"laboratory","name":"لابراتوار طبی الشفا"}}}'::jsonb, '798d8eba5c71f25b480b5341f8ec8fdf22685474ad4a70133d9550ad1b63b09b', 'لابراتوار طبی الشفا', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.6014025, 69.2269583, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:a1ddcf369619e17a251f135e44972417cc5708fe5b20daffb819992f20f4cf39'),
('osm:node:8612109340', 'https://www.openstreetmap.org/node/8612109340', '{"provider":"openstreetmap","element":{"type":"node","id":8612109340,"lat":34.5048378,"lon":69.1351812,"tags":{"healthcare":"laboratory","name":"لابراتوار طبی سیتی"}}}'::jsonb, '23d58189e66a53163e2bb200872842df6644ef36aae9e00e9d34d858da6d8672', 'لابراتوار طبی سیتی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5048378, 69.1351812, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:045b2aea1f6afbc9191aafd830892a5178d7c26816fdec8d1918ba4043c68c97'),
('osm:node:7183733177', 'https://www.openstreetmap.org/node/7183733177', '{"provider":"openstreetmap","element":{"type":"node","id":7183733177,"lat":33.5979946,"lon":69.2285329,"tags":{"healthcare":"laboratory","name":"لابراتوار طبی سینا"}}}'::jsonb, '89f907bd5f5c84eed150c7df3cc1b5b0daba8a0ead22e19fa70ffc8694d95855', 'لابراتوار طبی سینا', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.5979946, 69.2285329, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:2bbcf44d5348e258275094924704f986d96bbe1d8a54b9ff2efa3a409d6e126d'),
('osm:node:7183733162', 'https://www.openstreetmap.org/node/7183733162', '{"provider":"openstreetmap","element":{"type":"node","id":7183733162,"lat":33.598468,"lon":69.226497,"tags":{"healthcare":"laboratory","name":"لابراتوار طبی صحت"}}}'::jsonb, 'dff1402bb96b399c804cc5c11f21cd8c66acaf27dd539d7f8947c5a037269f1e', 'لابراتوار طبی صحت', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.598468, 69.226497, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:e475c299d8a32b5bb539830cd6e16af59851dfb8e7b6cbf27f6223ba89aaf7ec'),
('osm:node:8955857412', 'https://www.openstreetmap.org/node/8955857412', '{"provider":"openstreetmap","element":{"type":"node","id":8955857412,"lat":34.5368677,"lon":69.1895458,"tags":{"healthcare":"laboratory","name":"لابراتوار طبی صداقت احمدی"}}}'::jsonb, '92d683121c81772b7faf39cc7059054b8927dcc7632b4f7ca58f3be2bb75524a', 'لابراتوار طبی صداقت احمدی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5368677, 69.1895458, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:16b46030338cc6deaaad63e5f55cc3988817271b587dd089b8ff6a28cbe9a3be'),
('osm:node:7183733171', 'https://www.openstreetmap.org/node/7183733171', '{"provider":"openstreetmap","element":{"type":"node","id":7183733171,"lat":33.5968517,"lon":69.2305293,"tags":{"healthcare":"laboratory","name":"لابراتوار طبی علیزی"}}}'::jsonb, 'fede7370591bcef831bc901f840dfddae1a1774386a74eed06b93ad993431ca8', 'لابراتوار طبی علیزی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.5968517, 69.2305293, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:a62ff26956eb85a64b723abafdec1a24c6cfcb4a8c527f45d91141c46a85b39c'),
('osm:node:7183733172', 'https://www.openstreetmap.org/node/7183733172', '{"provider":"openstreetmap","element":{"type":"node","id":7183733172,"lat":33.6305323,"lon":69.2306431,"tags":{"healthcare":"laboratory","name":"لابراتوار طبی قاسمی"}}}'::jsonb, '1a27bec22c66f2650c22693bf20e02d9a1f33beb14364f005c367f026f657297', 'لابراتوار طبی قاسمی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.6305323, 69.2306431, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:8dd3b2f754cd9be53a81104125165da5e3ee779629171467ac9750388ed6fbcf'),
('osm:node:7183733179', 'https://www.openstreetmap.org/node/7183733179', '{"provider":"openstreetmap","element":{"type":"node","id":7183733179,"lat":33.630435,"lon":69.2305496,"tags":{"healthcare":"laboratory","name":"لابراتوار طبی کمپلکس"}}}'::jsonb, '7f1da09dc0af04d666780fe7873bca434f1213924acd276cb50af6083fc9c84d', 'لابراتوار طبی کمپلکس', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.630435, 69.2305496, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:d59ebbec1aa411c5e21babeb9f13f56e02307236ca1ac73f372c1157bd66b2e7'),
('osm:node:7183733164', 'https://www.openstreetmap.org/node/7183733164', '{"provider":"openstreetmap","element":{"type":"node","id":7183733164,"lat":33.6000655,"lon":69.2267405,"tags":{"healthcare":"laboratory","name":"لابراتوار طبی لمر"}}}'::jsonb, 'f2743c9dfbd26a41a064673c8b90b9e796fad7c7b754bdb55a3602c1ed115512', 'لابراتوار طبی لمر', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.6000655, 69.2267405, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:40743cf094de598ec994598d0d2c036216752dbd68f620be575815313850f036'),
('osm:node:7183733181', 'https://www.openstreetmap.org/node/7183733181', '{"provider":"openstreetmap","element":{"type":"node","id":7183733181,"lat":33.630138,"lon":69.2308017,"tags":{"healthcare":"laboratory","name":"لابراتوار طبی نوی پکتیا"}}}'::jsonb, '0b088f72d8905493f846e41055c3117ea51259a49f4aa1185cf7511d5a40f9b4', 'لابراتوار طبی نوی پکتیا', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.630138, 69.2308017, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:dab9d85a8a32e9645b81cce9625a6e7db26725a635a8dbf3fd6ebd47cb87433d'),
('osm:node:7183733180', 'https://www.openstreetmap.org/node/7183733180', '{"provider":"openstreetmap","element":{"type":"node","id":7183733180,"lat":33.6297827,"lon":69.230786,"tags":{"healthcare":"laboratory","name":"لابراتوار طبی نویدالله"}}}'::jsonb, '7f331699d50c3247b1363dab4d1ccf2fcaef8440c63bb18f4c46bd8678ce8ba6', 'لابراتوار طبی نویدالله', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.6297827, 69.230786, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:bbd6e100a650faf222ce6d0013c48c6cc33418b0ed5936126f45f4294f3f5428'),
('osm:node:7183733163', 'https://www.openstreetmap.org/node/7183733163', '{"provider":"openstreetmap","element":{"type":"node","id":7183733163,"lat":33.602305,"lon":69.2237034,"tags":{"healthcare":"laboratory","name":"لابراتوار طبی هیواد"}}}'::jsonb, '38d0295db74523cd84dadc96bf5858fab4aad709450d523091bef7b7dab5b9b1', 'لابراتوار طبی هیواد', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.602305, 69.2237034, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:5fa83475e185cbe75973bc5f21b9dba608daf7227affeee8be60ba7b26d000f5'),
('osm:node:7183733176', 'https://www.openstreetmap.org/node/7183733176', '{"provider":"openstreetmap","element":{"type":"node","id":7183733176,"lat":33.6031819,"lon":69.2293775,"tags":{"healthcare":"laboratory","name":"لابراتوار طبی وطن"}}}'::jsonb, '5ac91bfa36af29b3dc70088c479c4b5d50f65729d5d45f2c224dd7a71dfd3f96', 'لابراتوار طبی وطن', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.6031819, 69.2293775, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:1c56f2a1659a98058260cca7820fb7b138d443606dfeb078269829c6552f1873'),
('osm:node:7676171336', 'https://www.openstreetmap.org/node/7676171336', '{"provider":"openstreetmap","element":{"type":"node","id":7676171336,"lat":34.5368859,"lon":69.1894591,"tags":{"addr:city":"كابل","addr:city:ar":"كابل","addr:city:fa":"کابل","addr:city:ps":"کابل","addr:city:ur":"کابل","amenity":"pharmacy","healthcare":"pharmacy","name":"محمد درملتون"}}}'::jsonb, 'c2f24ae6b9a6398f2cac11eb91a2e66fa88eb3296b712db9b864994667ad8bd8', 'محمد درملتون', NULL, NULL, 'كابل', 'كابل', NULL, NULL, 'AF', 34.5368859, 69.1894591, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:8daca9887500d96ee2252ac9a8bf69c1b08d1dec0d43fe4a2ef0e8ead64f2441'),
('osm:node:12369296040', 'https://www.openstreetmap.org/node/12369296040', '{"provider":"openstreetmap","element":{"type":"node","id":12369296040,"lat":34.5472472,"lon":69.2560208,"tags":{"amenity":"clinic","fixme":"position","healthcare":"rehabilitation","healthcare:speciality":"rehabilitation","name":"مركز ابن سينا لإعادة التأهيل","name:en":"Avicenna Rehabilitation Center","name:fa":"مركز ابن سينا لإعادة التأهيل"}}}'::jsonb, 'c4042769b1ad44a6d2fce9be7c7edfe73c7d0a0a57601f85fbd643792785d9fa', 'مركز ابن سينا لإعادة التأهيل', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5472472, 69.2560208, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:1565d2ed057568ea411335d6f1d1e39cc3916ff8c99f07b786e70abf3c6e77d4'),
('osm:node:8806268871', 'https://www.openstreetmap.org/node/8806268871', '{"provider":"openstreetmap","element":{"type":"node","id":8806268871,"lat":34.5350803,"lon":69.1394095,"tags":{"amenity":"clinic","healthcare":"clinic","name":"مرکز آلرژی (حساسیت) افغانستان"}}}'::jsonb, 'c6bd75d1dd768a29083a8f371f5555607e40a42f57b0767b7ae7ebf318bbd434', 'مرکز آلرژی (حساسیت) افغانستان', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5350803, 69.1394095, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:1b993a9486ea16859348dd3ca7b0f1779153e708b78c4728f1ef5929dbe27c62'),
('osm:node:8735515045', 'https://www.openstreetmap.org/node/8735515045', '{"provider":"openstreetmap","element":{"type":"node","id":8735515045,"lat":34.5349671,"lon":69.1391304,"tags":{"amenity":"clinic","healthcare":"clinic","name":"مرکز تشخیص الرژی (حساسیت) اظهر"}}}'::jsonb, 'd8c31c14f402ed8e50273e46c7c112068db525b7af468e09b4a484209bb0edac', 'مرکز تشخیص الرژی (حساسیت) اظهر', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5349671, 69.1391304, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:7a86daa17c8e351ba6e7bca21e0e32e51d7d592689e43ee338a348db80046158'),
('osm:way:820174740', 'https://www.openstreetmap.org/way/820174740', '{"provider":"openstreetmap","element":{"type":"way","id":820174740,"center":{"lat":34.5341151,"lon":69.1358455},"tags":{"amenity":"hospital","building":"yes","healthcare":"clinic","healthcare:speciality":"radiology","name":"مرکز رادیولوژی مکه","name:en":"Mecca Radiology Center"}}}'::jsonb, 'cae774d0bd25ef67f119ee61b69fb05235c5853f2c01b6718633bbbc7530f2bf', 'مرکز رادیولوژی مکه', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5341151, 69.1358455, NULL, NULL, NULL, 'hospital', ARRAY['hospital', 'imaging', 'general_practitioner']::text[], 0.78, 'loc:df8f6ff933bece96cbebdf9e4148bfecfad31e76ae215e7813bbba9620ebfc80'),
('osm:node:8664622706', 'https://www.openstreetmap.org/node/8664622706', '{"provider":"openstreetmap","element":{"type":"node","id":8664622706,"lat":34.5583098,"lon":69.1606865,"tags":{"amenity":"dentist","healthcare":"dentist","level":"2","name":"مرکز زیبایی و تداوی دندان مجیک"}}}'::jsonb, '9f35363d6be52d7fdc5c42266c78667fc50b47a4628cecd6e903d10e951c3e43', 'مرکز زیبایی و تداوی دندان مجیک', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5583098, 69.1606865, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:02440cf296442f9b5f4f12e19ad08e8a8406d539074f21106683dc4ab602902f'),
('osm:node:8855920855', 'https://www.openstreetmap.org/node/8855920855', '{"provider":"openstreetmap","element":{"type":"node","id":8855920855,"lat":36.2663065,"lon":68.0112027,"tags":{"amenity":"clinic","healthcare":"clinic","name":"مرکز صحی چشم الشفا"}}}'::jsonb, 'b4624cb873029f95395807bc65582be6f9311703680575c81baf0b4420a9e2b4', 'مرکز صحی چشم الشفا', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2663065, 68.0112027, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:64c3ca4c259e609730b9b2d307af4389ae02de2d62de2df0e87873f630293963'),
('osm:node:8855910850', 'https://www.openstreetmap.org/node/8855910850', '{"provider":"openstreetmap","element":{"type":"node","id":8855910850,"lat":36.266176,"lon":68.0113968,"tags":{"amenity":"clinic","healthcare":"clinic","name":"مرکز فزیوتراپی"}}}'::jsonb, '580afa0117e97985fc2649332648ad0023fb5c5187b1fb08438e687d5a9f6911', 'مرکز فزیوتراپی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.266176, 68.0113968, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:0e9469877d3c9a6f18dfc3ad92fafa745837c55ccf1697bddeb3ecbb5e8118ec'),
('osm:node:8879148481', 'https://www.openstreetmap.org/node/8879148481', '{"provider":"openstreetmap","element":{"type":"node","id":8879148481,"lat":32.86089,"lon":67.4109308,"tags":{"amenity":"clinic","healthcare":"clinic","name":"مرکزصحی اساسی دهمرده","name:en":"Dihmorda Clinic"}}}'::jsonb, 'a96fb3a4e43bd82d05dfe8ade71f14b358c27ea3ceec5890bc82e5e6adbd2ddc', 'مرکزصحی اساسی دهمرده', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 32.86089, 67.4109308, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:cbe3465c4cf5f380136f1007a680c34c1830067cec94fef988177beb74aa4741'),
('osm:node:8879218835', 'https://www.openstreetmap.org/node/8879218835', '{"provider":"openstreetmap","element":{"type":"node","id":8879218835,"lat":33.0258802,"lon":67.615015,"tags":{"amenity":"clinic","healthcare":"clinic","name":"مرکزصحی فرعی داود"}}}'::jsonb, '6ce36a7065a1671577618b32107d8e70477866f80c5591399f9af09b55dce14b', 'مرکزصحی فرعی داود', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.0258802, 67.615015, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:b01d33932501f3aa2193abf9687c9868228ba0d826c2647e924bdcd3b0b3ba27'),
('osm:way:613766019', 'https://www.openstreetmap.org/way/613766019', '{"provider":"openstreetmap","element":{"type":"way","id":613766019,"center":{"lat":34.5305829,"lon":69.1619453},"tags":{"addr:country":"AF","addr:county":"Shahr-e-naw","addr:district":"District 4","addr:province":"Kabul","amenity":"hospital","healthcare":"hospital","name":"ملالۍ زیږنتون","name:en":"Malalai Maternity Hospital","name:ps":"ملالۍ زیږنتون","opening_hours":"24/7","operational_status":"Operational","operator:type":"public/government"}}}'::jsonb, '09e10a90074b885d3ebd2540b645575904ed9159cd235c2e5c28b01add3b99d9', 'ملالۍ زیږنتون', NULL, NULL, 'Kabul', NULL, 'Kabul', NULL, 'AF', 34.5305829, 69.1619453, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:b64e69ca62c959154042f1225d422293f59a80b1210f5febb20364a830a026c3'),
('osm:node:10941539205', 'https://www.openstreetmap.org/node/10941539205', '{"provider":"openstreetmap","element":{"type":"node","id":10941539205,"lat":31.6853762,"lon":66.0954898,"tags":{"amenity":"hospital","name":"نانی اغا کور"}}}'::jsonb, 'e5c9d56edcbd234d6b333e4c19b029e46e5630cb9daae66c9847ac0a07a78d7e', 'نانی اغا کور', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 31.6853762, 66.0954898, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:ec049b58852ed8e4b3a747d01b307b5ebbe671bba73c8e3f9264cfd843868ea1'),
('osm:node:13310000801', 'https://www.openstreetmap.org/node/13310000801', '{"provider":"openstreetmap","element":{"type":"node","id":13310000801,"lat":34.5549061,"lon":69.3603773,"tags":{"addr:street":"بزرگراه کابل- جلال آباد","amenity":"pharmacy","name":"نصر فارمسی"}}}'::jsonb, 'f843542cdc577ff774c3be501aa303f6de6aaf75c5d83b6e355c24c641d3b916', 'نصر فارمسی', NULL, 'بزرگراه کابل- جلال آباد', 'بزرگراه کابل- جلال آباد', NULL, NULL, NULL, 'AF', 34.5549061, 69.3603773, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:57af54f8a0e7faf750ab4cb36842f60a72fce1d2c58b49f21468531622ded61f'),
('osm:node:11028595725', 'https://www.openstreetmap.org/node/11028595725', '{"provider":"openstreetmap","element":{"type":"node","id":11028595725,"lat":33.3376376,"lon":69.9152488,"tags":{"amenity":"pharmacy","contact:phone":"+93 764 72 44 61; +93 774 47 41 23","name":"نوی کوثر درملتون","name:en":"New Kawsar Pharmacy"}}}'::jsonb, '48abd80480e0aef0357586096b9a5aa417ea7767712fdfd035f553157e203e17', 'نوی کوثر درملتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.3376376, 69.9152488, '+93 764 72 44 61; +93 774 47 41 23', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:ee17758e49c26911b3c015f9fdf5e9b84f3b7f27a680d53d20eeb4937a9dd577'),
('osm:node:7883048338', 'https://www.openstreetmap.org/node/7883048338', '{"provider":"openstreetmap","element":{"type":"node","id":7883048338,"lat":34.5269485,"lon":69.208102,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"نوی مکرویان درملتون"}}}'::jsonb, '6d92ac187f3f33a376a0189ad42f648c8ad72b58bc2f4f601874a1fbc8b435fe', 'نوی مکرویان درملتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5269485, 69.208102, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:ecdabedb335f34717afea3f78f04de90f0b55286a8ccac0b61d5f04700266cfb'),
('osm:node:6609531888', 'https://www.openstreetmap.org/node/6609531888', '{"provider":"openstreetmap","element":{"type":"node","id":6609531888,"lat":34.5643933,"lon":69.1444469,"tags":{"addr:city":"كابل","amenity":"hospital","healthcare":"hospital","name":"یسرا روغتون"}}}'::jsonb, '197e24202f81e418c51ea3e7856fef8c1d6957e05c2c6b2c621fe49310f0684c', 'یسرا روغتون', NULL, NULL, 'كابل', 'كابل', NULL, NULL, 'AF', 34.5643933, 69.1444469, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:5ebf76c20dc65e5e486a545c6c9ca3850c083fe680219efb9f7a24de6f43008e');

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
