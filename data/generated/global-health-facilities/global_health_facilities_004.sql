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
('osm:node:6848842889', 'https://www.openstreetmap.org/node/6848842889', '{"provider":"openstreetmap","element":{"type":"node","id":6848842889,"lat":40.455245,"lon":19.4866133,"tags":{"addr:street":"Rruga Pavarësia","amenity":"pharmacy","healthcare":"pharmacy","name":"Dr. Eniga Gega Likaj"}}}'::jsonb, '4a3e58e0f8e3dd03f35cd6c580199afcf51b8584063a6bee6660ed849cd9450f', 'Dr. Eniga Gega Likaj', 'dr eniga gega likaj', 'Rruga Pavarësia', 'Rruga Pavarësia', NULL, NULL, NULL, 'AL', 40.455245, 19.4866133, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:34782141ac5f8616ae4443bee6b9f40c62fc44ba2a17feef24bad42b81f86ec1'),
('osm:node:9832809092', 'https://www.openstreetmap.org/node/9832809092', '{"provider":"openstreetmap","element":{"type":"node","id":9832809092,"lat":40.6231885,"lon":20.7743317,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Dr. Eriola Xhengo","phone":"+355 69 736 8861"}}}'::jsonb, '7dbaaa5b58c08ace413498daaf60a99bc8cc98d5ff3a6243b4bbf28085bb550f', 'Dr. Eriola Xhengo', 'dr eriola xhengo', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6231885, 20.7743317, '+355 69 736 8861', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:6be24519cf6482f00eb5e6c2a690740cc14515c4e46f9fde495f439349556426'),
('osm:node:10050624079', 'https://www.openstreetmap.org/node/10050624079', '{"provider":"openstreetmap","element":{"type":"node","id":10050624079,"lat":40.7095968,"lon":19.9391387,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Dr. Fatjon-Agalliu","phone":"692429944"}}}'::jsonb, '50db896c1bd3ed4d5797521e6856210e6bb5ca7e36857c1acee410bc1cb8842d', 'Dr. Fatjon-Agalliu', 'dr fatjon agalliu', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7095968, 19.9391387, '692429944', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:dbf6480bb2a811286e7ea56da5116720bee56f38a25af7e0b807f7b07d99639c'),
('osm:node:10049613473', 'https://www.openstreetmap.org/node/10049613473', '{"provider":"openstreetmap","element":{"type":"node","id":10049613473,"lat":41.1165921,"lon":20.0821346,"tags":{"amenity":"dentist","email":"gestión.karina@yahoo.com","healthcare":"dentist","name":"Dr. Gereicht Karina","phone":"672021141"}}}'::jsonb, 'd04f6ee5501245b03ca62318912dafcf990b260efa277669071a658555abb3f7', 'Dr. Gereicht Karina', 'dr gereicht karina', NULL, NULL, NULL, NULL, NULL, 'AL', 41.1165921, 20.0821346, '672021141', NULL, 'gestión.karina@yahoo.com', 'dental', ARRAY['dental']::text[], 0.78, 'loc:8ff9355497dc17b419d84a0ff6f3b779d3fbd91574c7d2ee0bc2dab795ea15c1'),
('osm:node:6402237042', 'https://www.openstreetmap.org/node/6402237042', '{"provider":"openstreetmap","element":{"type":"node","id":6402237042,"lat":40.6133589,"lon":20.7823849,"tags":{"amenity":"doctors","healthcare":"doctor","healthcare:speciality":"cardiology","name":"Dr. Ilia Skendi","phone":"+355 69 895 8551"}}}'::jsonb, '51ed30d396a509b1554d8aa74319b297bf6f62f1738ec86e57a2e9d2b1db5f13', 'Dr. Ilia Skendi', 'dr ilia skendi', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6133589, 20.7823849, '+355 69 895 8551', NULL, NULL, 'general_practitioner', ARRAY['general_practitioner', 'specialist']::text[], 0.78, 'loc:b97e2b6ba84a5a4a65b76a231ba1370940dedf0bf1a578189c35f354630a61ff'),
('osm:node:6882311786', 'https://www.openstreetmap.org/node/6882311786', '{"provider":"openstreetmap","element":{"type":"node","id":6882311786,"lat":40.0809854,"lon":20.1420817,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Dr. Jani. N. Laro"}}}'::jsonb, '4b4cc568e06ecb35b72636ab976fe341341a9cd6dd5340ba7aedb47534f1700b', 'Dr. Jani. N. Laro', 'dr jani n laro', NULL, NULL, NULL, NULL, NULL, 'AL', 40.0809854, 20.1420817, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:f652c07aa57181d925811da98246cb14bc81ba0e8506cb173a01e2052865a746'),
('osm:node:6820289754', 'https://www.openstreetmap.org/node/6820289754', '{"provider":"openstreetmap","element":{"type":"node","id":6820289754,"lat":40.9435688,"lon":19.7064082,"tags":{"addr:street":"Rruga Vojo Kushi","amenity":"dentist","name":"Dr. Jorgen Biti"}}}'::jsonb, '6409c2aa6426906b80ad84d434e527839bb1830a7721d059bea7765b6f34e88b', 'Dr. Jorgen Biti', 'dr jorgen biti', 'Rruga Vojo Kushi', 'Rruga Vojo Kushi', NULL, NULL, NULL, 'AL', 40.9435688, 19.7064082, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:f20a5f5c8387de4a258bcc1579fe4751fc93fc9e1a4ef2beb428f7a2fe666a77'),
('osm:node:5419155709', 'https://www.openstreetmap.org/node/5419155709', '{"provider":"openstreetmap","element":{"type":"node","id":5419155709,"lat":41.3232002,"lon":19.8250237,"tags":{"addr:city":"Tirana","addr:country":"AL","addr:postcode":"1000","addr:street":"Rruga e Elbasanit","amenity":"dentist","healthcare":"dentist","name":"Dr. Lumturi Brahimllari"}}}'::jsonb, 'f0eb7e3adf94583a469feac2fa03743e8c785164e94490bc7f9a36d31f7ee9f0', 'Dr. Lumturi Brahimllari', 'dr lumturi brahimllari', 'Rruga e Elbasanit', 'Rruga e Elbasanit, Tirana, 1000', 'Tirana', NULL, '1000', 'AL', 41.3232002, 19.8250237, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:a3c6f8a61464250e8e03a358aa90479ac000a07c6fcbac3eaddbd7fdbb5cea1e'),
('osm:node:11923686417', 'https://www.openstreetmap.org/node/11923686417', '{"provider":"openstreetmap","element":{"type":"node","id":11923686417,"lat":41.3770228,"lon":19.7944302,"tags":{"addr:city":"Kamëz","amenity":"dentist","healthcare":"dentist","level":"1","name":"Dr. Majlinda Kola"}}}'::jsonb, '9f583871765cb29c1b55f4f583c7621b60e0d336ef6cfd95f2d138a21f2e0598', 'Dr. Majlinda Kola', 'dr majlinda kola', NULL, 'Kamëz', 'Kamëz', NULL, NULL, 'AL', 41.3770228, 19.7944302, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:ea86b16e0da8afbb950cd7bc7c34af64e6072155ee16037210d199d8af06510c'),
('osm:node:6419399909', 'https://www.openstreetmap.org/node/6419399909', '{"provider":"openstreetmap","element":{"type":"node","id":6419399909,"lat":40.6227712,"lon":20.7780997,"tags":{"amenity":"dentist","healthcare":"dentist","level":"1","name":"Dr. Marinela Sadiku"}}}'::jsonb, '0520282514b4ebcf5d35725c6872ae8c490aeb63e9c1e754b3a5179cd9060ad6', 'Dr. Marinela Sadiku', 'dr marinela sadiku', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6227712, 20.7780997, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:2f61a08529d0e9ea987acd485da2ff6d205230ed3984108ee52a54a85be6367a'),
('osm:node:13960636369', 'https://www.openstreetmap.org/node/13960636369', '{"provider":"openstreetmap","element":{"type":"node","id":13960636369,"lat":41.3096771,"lon":19.8098486,"tags":{"addr:floor":"G","amenity":"clinic","check_date":"2026-06-20","healthcare":"clinic","level":"0","name":"Dr. Medical"}}}'::jsonb, 'a23c4e5ea7efe2274a19d5b61fa7fa5d2aff849fa49041c92e40859b91cfc934', 'Dr. Medical', 'dr medical', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3096771, 19.8098486, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:5415983212898a3d849184ce1caf095a15c63719b9d6113a72e44cdda6865a52'),
('osm:node:9826051459', 'https://www.openstreetmap.org/node/9826051459', '{"provider":"openstreetmap","element":{"type":"node","id":9826051459,"lat":40.6127434,"lon":20.7773833,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Dr. Megi Gurra","phone":"+355 69 452 2999"}}}'::jsonb, '00d76877b3cf4d78c7cb27385ef0760a09b2ebe3e4163db1776ce506c506694f', 'Dr. Megi Gurra', 'dr megi gurra', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6127434, 20.7773833, '+355 69 452 2999', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:be620bdba34b20490a5a3fa5299cc0452894007128fca81ec7629d8c1976282c'),
('osm:node:9826051470', 'https://www.openstreetmap.org/node/9826051470', '{"provider":"openstreetmap","element":{"type":"node","id":9826051470,"lat":40.6183164,"lon":20.7752569,"tags":{"amenity":"dentist","contact:phone":"+355 69 305 0510","healthcare":"dentist","level":"1","name":"Dr. Natasha","wheelchair":"no"}}}'::jsonb, 'b1b7b79e8eb35ad11cf5915de580ce605cd1f3b54273b29028614bbcf33bdcfb', 'Dr. Natasha', 'dr natasha', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6183164, 20.7752569, '+355 69 305 0510', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:702a46b96fdc9ae28fef3b7e88514b82ff1da9e93d65864aa33ff2b214397c6e'),
('osm:node:6416400530', 'https://www.openstreetmap.org/node/6416400530', '{"provider":"openstreetmap","element":{"type":"node","id":6416400530,"lat":40.6126963,"lon":20.7817025,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Dr. Petrina Kaçori"}}}'::jsonb, '2e46cc43d3262a96505c2af84f5ceafa35d8986087ff09fd396a315daccf0d90', 'Dr. Petrina Kaçori', 'dr petrina ka ori', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6126963, 20.7817025, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:a558bd187d80cebf3ed54f644f389d5420dc6e2abba10254b90f4f348ec057ea'),
('osm:node:10861398244', 'https://www.openstreetmap.org/node/10861398244', '{"provider":"openstreetmap","element":{"type":"node","id":10861398244,"lat":41.3394951,"lon":19.7894602,"tags":{"addr:city":"Tirana","addr:housenumber":"Godina K","addr:postcode":"1025","addr:street":"Rruga Gjergj Legisi","amenity":"dentist","healthcare":"dentist","name":"Dr. Petriti"}}}'::jsonb, '4f0450248630c9ce9b0ac61662a9b7aebb4275cbf40b325fe860501d91fa93b6', 'Dr. Petriti', 'dr petriti', 'Godina K Rruga Gjergj Legisi', 'Godina K Rruga Gjergj Legisi, Tirana, 1025', 'Tirana', NULL, '1025', 'AL', 41.3394951, 19.7894602, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:7ffb0f353c605aed34cb682122089aae5977084b74a7a6442c39dfe8475bcac3'),
('osm:node:6372228333', 'https://www.openstreetmap.org/node/6372228333', '{"provider":"openstreetmap","element":{"type":"node","id":6372228333,"lat":40.6126331,"lon":20.7767811,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Dr. Raqi Keçi","opening_hours":"Mo-Sa 09:00-13:00, 16:00-19:00; Su off","phone":"+355 69 235 1542"}}}'::jsonb, '43d3739cec71a5e2ebf8c61d0fa6c472565e523d0f09389a2b7533e5be4490a8', 'Dr. Raqi Keçi', 'dr raqi ke i', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6126331, 20.7767811, '+355 69 235 1542', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:6fa2e22d55c6555d8071a525ac81a9507f7fd19463a1d352dfd254d38a530e82'),
('osm:node:6379102842', 'https://www.openstreetmap.org/node/6379102842', '{"provider":"openstreetmap","element":{"type":"node","id":6379102842,"lat":40.6167891,"lon":20.7784603,"tags":{"amenity":"doctors","healthcare":"doctor","healthcare:speciality":"paediatrics","name":"Dr. Robert Rado"}}}'::jsonb, '6adcf2a4690772901ae83802541e11a84e9cd24da9dad47f97b25a4eb3ad4ac8', 'Dr. Robert Rado', 'dr robert rado', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6167891, 20.7784603, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:b5b29f62d97d937fce7ba42009f38e211015d1c3bf48079723885e0053f90c4d'),
('osm:node:6377776317', 'https://www.openstreetmap.org/node/6377776317', '{"provider":"openstreetmap","element":{"type":"node","id":6377776317,"lat":40.6143926,"lon":20.7780071,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Dr. Samir Saliçe"}}}'::jsonb, 'c587e9b3a0949ed8d4ff533d4f6c9cbb5d124f01312502263fbde456e05ba944', 'Dr. Samir Saliçe', 'dr samir sali e', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6143926, 20.7780071, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:13fbdeeb52eec8487cfa8fc5c38c2e6fd1f98c308d6bb0305c8d60c9b8736467'),
('osm:node:10035625686', 'https://www.openstreetmap.org/node/10035625686', '{"provider":"openstreetmap","element":{"type":"node","id":10035625686,"lat":40.0801788,"lon":20.1396334,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Dr. Spiro Hashoti"}}}'::jsonb, '4f393a295bb07626cdf19cf44daf77ad10ed5ba0ef40edc118ff265316b85b2c', 'Dr. Spiro Hashoti', 'dr spiro hashoti', NULL, NULL, NULL, NULL, NULL, 'AL', 40.0801788, 20.1396334, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:fa57d9d0ecdeb2f32275d077b0dfe38c27fa7744eedae3b1d7767ee700598cd4'),
('osm:node:9832809076', 'https://www.openstreetmap.org/node/9832809076', '{"provider":"openstreetmap","element":{"type":"node","id":9832809076,"lat":40.6194425,"lon":20.7760459,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Dr. Tani","phone":"082356480"}}}'::jsonb, 'a35d8544d17febf8b5e1fd224558c599e33800d81a4417525460eae76fd72872', 'Dr. Tani', 'dr tani', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6194425, 20.7760459, '082356480', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:c700c4c8dcfe5b68ac540d6151517f18667864fe3b71b305509eda81a3dbbb90'),
('osm:node:9832809057', 'https://www.openstreetmap.org/node/9832809057', '{"provider":"openstreetmap","element":{"type":"node","id":9832809057,"lat":40.6217586,"lon":20.7743736,"tags":{"amenity":"doctors","healthcare":"doctor","healthcare:speciality":"paediatrics","name":"Dr. Theodhor Disho","phone":"+355 69 632 0226","short_name":"Disho"}}}'::jsonb, 'ab1d23c5e462c4a0d96fd26935a97a9fedf341eb7838f946e42a091935106db7', 'Dr. Theodhor Disho', 'dr theodhor disho', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6217586, 20.7743736, '+355 69 632 0226', NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:973670cd7e097762e255d92510b6312d9b769920dcafcf9da9e483680d9162e0'),
('osm:node:6372283504', 'https://www.openstreetmap.org/node/6372283504', '{"provider":"openstreetmap","element":{"type":"node","id":6372283504,"lat":40.6169937,"lon":20.7776209,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Dr. V. Shkoza","phone":"+355 68 226 8470","wheelchair":"no"}}}'::jsonb, 'f06e2198430df70854a713d68b9ab7dee2d8341d6ef2596f1ab2448fb0a56693', 'Dr. V. Shkoza', 'dr v shkoza', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6169937, 20.7776209, '+355 68 226 8470', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:779fe3c8f4b8c6d04481f24a5f20e44b76834edac94fb286f6b8403cfbaadf14'),
('osm:node:6395887510', 'https://www.openstreetmap.org/node/6395887510', '{"provider":"openstreetmap","element":{"type":"node","id":6395887510,"lat":40.6137177,"lon":20.7764132,"tags":{"amenity":"dentist","healthcare":"dentist","level":"1","name":"Dr. Venera Habip"}}}'::jsonb, 'b0b5d31c3948639f697b0ddef3daa6febe7e971f355bdbc0a6cdee2d65df0953', 'Dr. Venera Habip', 'dr venera habip', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6137177, 20.7764132, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:4a49b69faedf9fc321f9caf66828e9ff02feb4b621ba8c54e8e61cc57abb0e24'),
('osm:node:6861489477', 'https://www.openstreetmap.org/node/6861489477', '{"provider":"openstreetmap","element":{"type":"node","id":6861489477,"lat":41.3275851,"lon":19.445318,"tags":{"addr:street":"Rruga Aleksander Goga","amenity":"dentist","healthcare":"dentist","name":"Dr. Xhafa"}}}'::jsonb, 'a20a1639cd31941cfad45386f7705cdc164237ab64bdf52e222466b4ce28d35f', 'Dr. Xhafa', 'dr xhafa', 'Rruga Aleksander Goga', 'Rruga Aleksander Goga', NULL, NULL, NULL, 'AL', 41.3275851, 19.445318, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:1ba88f46266a257eb26f5c2c53e61db6f053a070e86b3dcbff66e54c114b551b'),
('osm:node:4539319982', 'https://www.openstreetmap.org/node/4539319982', '{"provider":"openstreetmap","element":{"type":"node","id":4539319982,"lat":42.07391,"lon":19.5222692,"tags":{"amenity":"doctors","name":"Dr. Zana Uruçi"}}}'::jsonb, 'f903659800c61f2b875afc7782ff287a30def4ebc124c7452d193401afdd614f', 'Dr. Zana Uruçi', 'dr zana uru i', NULL, NULL, NULL, NULL, NULL, 'AL', 42.07391, 19.5222692, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:f8742d20fdc68c43c921418c5cf3aab9d5003bb30a8a04785461fdd40ab1b55b'),
('osm:node:7690634385', 'https://www.openstreetmap.org/node/7690634385', '{"provider":"openstreetmap","element":{"type":"node","id":7690634385,"lat":40.3389518,"lon":20.6817776,"tags":{"amenity":"dentist","name":"Dr.Lorenc Gjergo"}}}'::jsonb, 'a53bc6157f64fb393646ad389407c01b6c3b328268f1f8f8308b51137dfc9eea', 'Dr.Lorenc Gjergo', 'dr lorenc gjergo', NULL, NULL, NULL, NULL, NULL, 'AL', 40.3389518, 20.6817776, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:33ec3aced4034435a508fe7de507c2e9a65c41415013971f70f99d8c6299008a'),
('osm:node:7093518287', 'https://www.openstreetmap.org/node/7093518287', '{"provider":"openstreetmap","element":{"type":"node","id":7093518287,"lat":42.3572684,"lon":20.0747018,"tags":{"addr:postcode":"8702","addr:street":"Agim Ramadani","amenity":"pharmacy","check_date":"2026-05-26","name":"Drifarma","opening_hours":"Mo-Su 08:00-20:00"}}}'::jsonb, '77c8dfc26e954ce1dfc79eb70ca4a879fa50221185099182baf0fd74694b7529', 'Drifarma', 'drifarma', 'Agim Ramadani', 'Agim Ramadani, 8702', NULL, NULL, '8702', 'AL', 42.3572684, 20.0747018, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:30292fcd262a201531b98d11d9db06f9acda37d17ced87e55198f05d4991059c'),
('osm:node:6376209874', 'https://www.openstreetmap.org/node/6376209874', '{"provider":"openstreetmap","element":{"type":"node","id":6376209874,"lat":40.6235414,"lon":20.7801308,"tags":{"alt_name":"Dr. Elton Çoçi","amenity":"dentist","healthcare":"dentist","name":"Dynamic Dental"}}}'::jsonb, 'c73befbf1e048037792b51c27d07b40dcff151e63fbd5b880f79bfdf5dd991bd', 'Dynamic Dental', 'dynamic dental', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6235414, 20.7801308, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:24e00e5fc605dd5b67ed18df8beb4813b73b885bc0c602caf82c0c7bb0ddd778'),
('osm:node:6375617689', 'https://www.openstreetmap.org/node/6375617689', '{"provider":"openstreetmap","element":{"type":"node","id":6375617689,"lat":40.6217595,"lon":20.7844868,"tags":{"amenity":"pharmacy","name":"E Terove"}}}'::jsonb, '9ff6da6e9c8bed41bc509ef3cfd83c16d72a1d17611c909cd6754f4bf892130b', 'E Terove', 'e terove', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6217595, 20.7844868, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:08f20872ff869ddf7694430c9881a4a080141bcb5a99bda8f094396d3b6a9339'),
('osm:node:9063960328', 'https://www.openstreetmap.org/node/9063960328', '{"provider":"openstreetmap","element":{"type":"node","id":9063960328,"lat":42.164807,"lon":19.46868,"tags":{"amenity":"dentist","name":"E.M Dental"}}}'::jsonb, '5784baae252280630fe5d1f4ac655a6adfb0a721de2c3ec1fec5f64f49d10307', 'E.M Dental', 'e m dental', NULL, NULL, NULL, NULL, NULL, 'AL', 42.164807, 19.46868, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:d590e3e40812f87c49fb90e64e440408edce56f447ae2d1e0e4958e68b1ee7ec'),
('osm:node:3820715667', 'https://www.openstreetmap.org/node/3820715667', '{"provider":"openstreetmap","element":{"type":"node","id":3820715667,"lat":42.0709211,"lon":19.5187996,"tags":{"amenity":"dentist","name":"E.S.M Dental","payment:coins":"yes","payment:credit_cards":"no","payment:cryptocurrencies":"no","payment:debit_cards":"no","payment:electronic_purses":"no","payment:notes":"yes","smoking":"outside","source":"bing;survey;gps","source_ref:url":"https://www.flickr.com/photos/134902422@N04/map?&fLat=41.9559&fLon=19.4337&zl=11&order_by=recent","wheelchair":"limited"}}}'::jsonb, '2e88f7b3a6cdd6003a456e552e3f32a4d5d70b03002db39a7261515b0b5edb87', 'E.S.M Dental', 'e s m dental', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0709211, 19.5187996, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:639521925b62f886129181e70094b5aff82b955117d6d8be9f319e6ea4765f88'),
('osm:node:6872128433', 'https://www.openstreetmap.org/node/6872128433', '{"provider":"openstreetmap","element":{"type":"node","id":6872128433,"lat":41.3244903,"lon":19.446474,"tags":{"addr:street":"Rruga Kristaq Boshnjaku","amenity":"pharmacy","healthcare":"pharmacy","name":"Eda Farma Farmaci"}}}'::jsonb, '187a2764edd00c17e1a6be0c3cadcfa6ae8611ff26806e9382b5849b0f9a0f33', 'Eda Farma Farmaci', 'eda farma farmaci', 'Rruga Kristaq Boshnjaku', 'Rruga Kristaq Boshnjaku', NULL, NULL, NULL, 'AL', 41.3244903, 19.446474, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:f6a041e793d8d9e6c4c552179816c2b505aa7ccb20d2dee3333723b67f7f453d'),
('osm:node:6402237049', 'https://www.openstreetmap.org/node/6402237049', '{"provider":"openstreetmap","element":{"type":"node","id":6402237049,"lat":40.6149064,"lon":20.7805111,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Edlira Tollkuçi","phone":"+355 69 233 9609"}}}'::jsonb, '32cf26d17f2ffa9782f0c7893963fd61496df5d3a5671ba1f3df34a08c915868', 'Edlira Tollkuçi', 'edlira tollku i', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6149064, 20.7805111, '+355 69 233 9609', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:f48289b2749564de02270e17f3a6629efeedd6f2abcc1cf40eb4b0c9442979d0'),
('osm:node:6806485495', 'https://www.openstreetmap.org/node/6806485495', '{"provider":"openstreetmap","element":{"type":"node","id":6806485495,"lat":41.3373578,"lon":19.8307629,"tags":{"addr:street":"Rruga Bardhyl","amenity":"pharmacy","healthcare":"pharmacy","name":"efarma.al"}}}'::jsonb, '4d1215e8dde7f5c7c8db97d6bd437966bf7382ecf619224cdb0c916dca2d5af1', 'efarma.al', 'efarma al', 'Rruga Bardhyl', 'Rruga Bardhyl', NULL, NULL, NULL, 'AL', 41.3373578, 19.8307629, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:41946cba0c02964d671efc21f64c2343c10d5c8c51f635d31e2bc7e3ca19b875'),
('osm:node:6841232587', 'https://www.openstreetmap.org/node/6841232587', '{"provider":"openstreetmap","element":{"type":"node","id":6841232587,"lat":41.3288319,"lon":19.8239289,"tags":{"addr:city":"Tirana","addr:postcode":"1001","addr:street":"Rruga Luigj Gurakuqi","amenity":"pharmacy","dispensing":"yes","drive_through":"yes","healthcare":"pharmacy","name":"eFarma.AL","opening_hours":"24/7","opening_hours:covid19":"Mo-Su 07:30-20:00","website":"https://efarma.al/"}}}'::jsonb, '106334b7f1b5126d383fac08f67556b90a90a84fd1456a504287826c0b71ce12', 'eFarma.AL', 'efarma al', 'Rruga Luigj Gurakuqi', 'Rruga Luigj Gurakuqi, Tirana, 1001', 'Tirana', NULL, '1001', 'AL', 41.3288319, 19.8239289, NULL, 'https://efarma.al/', NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:36b2fb42694430cbbc0053bf809fef5cf4f76ea0a6cb021cd2089f7f120f0494'),
('osm:node:3530842523', 'https://www.openstreetmap.org/node/3530842523', '{"provider":"openstreetmap","element":{"type":"node","id":3530842523,"lat":41.3191791,"lon":19.813398,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Egnatia"}}}'::jsonb, 'f04f6080a8e732d04c6c75e34338503f0e2c5234135df7fad2c4affc2c913d50', 'Egnatia', 'egnatia', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3191791, 19.813398, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:6f609ce77aba64f6c042da3f127c3fc03cbc739ae2b5d6c2741d290c59ebb381'),
('osm:node:10266327270', 'https://www.openstreetmap.org/node/10266327270', '{"provider":"openstreetmap","element":{"type":"node","id":10266327270,"lat":40.9011771,"lon":20.6558117,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Eleni-Dent"}}}'::jsonb, '85d5edbce3b426df9a16f98370a40f37c673ba2bd44191122f44181bc8f9e59f', 'Eleni-Dent', 'eleni dent', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9011771, 20.6558117, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:c19659fb2d34aed3396b3b29722af71d3f978d8e5f36c65259c751796a5a16da'),
('osm:node:6814813062', 'https://www.openstreetmap.org/node/6814813062', '{"provider":"openstreetmap","element":{"type":"node","id":6814813062,"lat":41.3267175,"lon":19.8263969,"tags":{"addr:street":"Bulevardi Zhan d''Ark","amenity":"pharmacy","check_date":"2024-06-11","healthcare":"pharmacy","name":"Elezi"}}}'::jsonb, 'c5407bbd4b4b4d7b412b46b7159b56a1da6e3edca694ad936e3515de38bc7558', 'Elezi', 'elezi', 'Bulevardi Zhan d''Ark', 'Bulevardi Zhan d''Ark', NULL, NULL, NULL, 'AL', 41.3267175, 19.8263969, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:0452d9a0f2cd82e8bc055036b363e3e027d569f57452173ca4472f62bcd1ed1f'),
('osm:node:9041579849', 'https://www.openstreetmap.org/node/9041579849', '{"provider":"openstreetmap","element":{"type":"node","id":9041579849,"lat":42.0075178,"lon":19.6393589,"tags":{"amenity":"dentist","healthcare":"dentist","level":"1","name":"Elif Dent"}}}'::jsonb, '79f03e85a311572a71a0f92977212f4391342a89f07e06de6950a036a9fd1507', 'Elif Dent', 'elif dent', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0075178, 19.6393589, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:abe1121b15f543a09c3446ea0f5ead319eab131882b35d4bbbcdc75e358ac49f'),
('osm:node:11197280647', 'https://www.openstreetmap.org/node/11197280647', '{"provider":"openstreetmap","element":{"type":"node","id":11197280647,"lat":41.3251191,"lon":19.8162008,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Elio"}}}'::jsonb, '732d375e297f590742ab24bcf23ded94b7d66d57569fe6833ca9fb0e821e10d7', 'Elio', 'elio', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3251191, 19.8162008, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:3174594250d9aee4a493fb8137d7be7e13c3b8917f617673b8492c952f522f82'),
('osm:node:6804070941', 'https://www.openstreetmap.org/node/6804070941', '{"provider":"openstreetmap","element":{"type":"node","id":6804070941,"lat":41.3386673,"lon":19.8351409,"tags":{"addr:street":"Rruga Kongresi i Manastirit","amenity":"pharmacy","healthcare":"pharmacy","name":"Elit"}}}'::jsonb, '5d75a5a106f1f0af7e1ddb8d720de83e678b587aab419843a9a3041fc0a41833', 'Elit', 'elit', 'Rruga Kongresi i Manastirit', 'Rruga Kongresi i Manastirit', NULL, NULL, NULL, 'AL', 41.3386673, 19.8351409, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:99628154685eda2ba8cb33c69c2c59b1d0e4dcfff1f41ada4f358649d0b6c36b'),
('osm:node:6873603886', 'https://www.openstreetmap.org/node/6873603886', '{"provider":"openstreetmap","element":{"type":"node","id":6873603886,"lat":39.8747194,"lon":20.0036646,"tags":{"amenity":"pharmacy","name":"Elpe"}}}'::jsonb, 'f1ff4ca0da2c7aefb3b348abc871007f8181813dedb5b9816db3c9d107b30916', 'Elpe', 'elpe', NULL, NULL, NULL, NULL, NULL, 'AL', 39.8747194, 20.0036646, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:e1f871ceb847b92fb1392a6bccf422fceb09c35e250c6f83b518a0774db71a36'),
('osm:node:9802563884', 'https://www.openstreetmap.org/node/9802563884', '{"provider":"openstreetmap","element":{"type":"node","id":9802563884,"lat":40.0617961,"lon":19.857204,"tags":{"amenity":"pharmacy","check_date":"2024-09-02","name":"Ema''s Pharmacy","payment:cash":"yes","payment:mastercard":"yes","payment:visa_debit":"yes"}}}'::jsonb, '8dcb1db3e8100aca76f4c2f770ff7db16a11f480ec776ea8ce7a041068f9360a', 'Ema''s Pharmacy', 'ema s pharmacy', NULL, NULL, NULL, NULL, NULL, 'AL', 40.0617961, 19.857204, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:fb9109333e8232cc92e02dd170a72b11193ad5a86c011e594f3a6498ba47517c'),
('osm:node:5359738224', 'https://www.openstreetmap.org/node/5359738224', '{"provider":"openstreetmap","element":{"type":"node","id":5359738224,"lat":41.1176656,"lon":20.092837,"tags":{"addr:city":"Elbasan","addr:street":"Rruga Kozma Naska","amenity":"pharmacy","healthcare":"pharmacy","name":"Embi Pharma","phone":"003550692540210"}}}'::jsonb, '4aa82d6459011d08f5196d8584c4e2b90a65922a4caa18a9d090ed73594c7c05', 'Embi Pharma', 'embi pharma', 'Rruga Kozma Naska', 'Rruga Kozma Naska, Elbasan', 'Elbasan', NULL, NULL, 'AL', 41.1176656, 20.092837, '003550692540210', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:b7b662211f857dccc5f3d6479708805627e6cfa9ddaf9582cfff7d9e1484107c'),
('osm:node:4603494388', 'https://www.openstreetmap.org/node/4603494388', '{"provider":"openstreetmap","element":{"type":"node","id":4603494388,"lat":41.4257951,"lon":19.7570548,"tags":{"amenity":"hospital","name":"emergency 1","note":"check this"}}}'::jsonb, '16a4557ffe49d87bdbe38759b60709e8a1293deea2a6e5d7d78982c1830bff63', 'emergency 1', 'emergency 1', NULL, NULL, NULL, NULL, NULL, 'AL', 41.4257951, 19.7570548, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:e88900abd867c25028c38a0f51ef0104974ddfd90e4f20448d997ed1f6df749f'),
('osm:node:4603494489', 'https://www.openstreetmap.org/node/4603494489', '{"provider":"openstreetmap","element":{"type":"node","id":4603494489,"lat":41.4305744,"lon":19.7748887,"tags":{"amenity":"hospital","name":"emergency 2"}}}'::jsonb, '616a19365ceda45e702eaed48098c0a1dcd85f024c65e8bfd82526d2c039fddf', 'emergency 2', 'emergency 2', NULL, NULL, NULL, NULL, NULL, 'AL', 41.4305744, 19.7748887, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:72a5251a124b19f1f95bcb2db51a8c7002b5a9366f73af8172aaa481ae03add3'),
('osm:node:13938507219', 'https://www.openstreetmap.org/node/13938507219', '{"provider":"openstreetmap","element":{"type":"node","id":13938507219,"lat":41.3199732,"lon":19.8177387,"tags":{"amenity":"dentist","check_date":"2026-06-14","healthcare":"dentist","level":"1","name":"Empire Dental Clinic"}}}'::jsonb, 'a8d04bc616662846b1e061d005358b3cd8c90303a78f0ac42abf80dd367c1b91', 'Empire Dental Clinic', 'empire dental clinic', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3199732, 19.8177387, NULL, NULL, NULL, 'dental', ARRAY['dental', 'general_practitioner']::text[], 0.78, 'loc:71ee1821473aa2c8ce93fc6412cc1cc688e1966563cffaad278b8b6af0d694f2'),
('osm:node:12439891005', 'https://www.openstreetmap.org/node/12439891005', '{"provider":"openstreetmap","element":{"type":"node","id":12439891005,"lat":41.3674494,"lon":19.7821578,"tags":{"addr:city":"Kamëz","addr:street":"Rruga Arjan Sala","amenity":"dentist","healthcare":"dentist","name":"Endeta Dental Clinic"}}}'::jsonb, 'c194a243b06fa6593650704756ca1d48a5b737fab619033edddb7b4a05169eff', 'Endeta Dental Clinic', 'endeta dental clinic', 'Rruga Arjan Sala', 'Rruga Arjan Sala, Kamëz', 'Kamëz', NULL, NULL, 'AL', 41.3674494, 19.7821578, NULL, NULL, NULL, 'dental', ARRAY['dental', 'general_practitioner']::text[], 0.86, 'loc:b71e2e97bc8b8f260e8ef364642a97df33e7c610cfb10ca0fe412354030ec8d9'),
('osm:node:4579869248', 'https://www.openstreetmap.org/node/4579869248', '{"provider":"openstreetmap","element":{"type":"node","id":4579869248,"lat":41.3401149,"lon":19.8339915,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Endokrinologjia","phone":"+35542349229","website":"https://www.qsut.gov.al/index.php/sherbimet-mjekesore/sherbimi-i-endokrinologjise/sherbimet-e-ofruara/"}}}'::jsonb, 'dab0f527dfd6735899bbd3158a0e7e73c297c6fc46592710e1df5427f4bf8c9b', 'Endokrinologjia', 'endokrinologjia', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3401149, 19.8339915, '+35542349229', 'https://www.qsut.gov.al/index.php/sherbimet-mjekesore/sherbimi-i-endokrinologjise/sherbimet-e-ofruara/', NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:af0bca41aef9d7d9b3139da9fd755fa0bae2f871f4ca0b7c7317e1cf5c0f878b'),
('osm:node:6364938818', 'https://www.openstreetmap.org/node/6364938818', '{"provider":"openstreetmap","element":{"type":"node","id":6364938818,"lat":41.3574795,"lon":19.763141,"tags":{"addr:city":"Tirana","addr:street":"Rruga Princ Vidi","amenity":"dentist","healthcare":"dentist","name":"Eni Dental - Dr. Emri Torba"}}}'::jsonb, '829d32186a1778fa3d53e33a281bd0272785f69613ea6f1a748aae5adbdcb2ae', 'Eni Dental - Dr. Emri Torba', 'eni dental dr emri torba', 'Rruga Princ Vidi', 'Rruga Princ Vidi, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3574795, 19.763141, NULL, NULL, NULL, 'dental', ARRAY['dental', 'imaging']::text[], 0.86, 'loc:0920e154ed75e51b8438b2ab772c5dfd141984d5e87b2ef3c7fbf267b769990e');

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
