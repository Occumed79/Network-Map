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
('osm:node:6430146348', 'https://www.openstreetmap.org/node/6430146348', '{"provider":"openstreetmap","element":{"type":"node","id":6430146348,"lat":40.60847,"lon":20.780494,"tags":{"amenity":"pharmacy","name":"Mapika"}}}'::jsonb, 'd3a3d0e012c8f4b62006c3a7101e380dca7c8e0b86bc2503b8c898bbf5d86c98', 'Mapika', 'mapika', NULL, NULL, NULL, NULL, NULL, 'AL', 40.60847, 20.780494, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:7687b2e894e3ce522ec58b4993a53ce15b6b11e1cf43e55445b2b8b753807e81'),
('osm:node:6376147327', 'https://www.openstreetmap.org/node/6376147327', '{"provider":"openstreetmap","element":{"type":"node","id":6376147327,"lat":40.6303577,"lon":20.7853742,"tags":{"amenity":"pharmacy","name":"Mara Pharm","wheelchair":"no"}}}'::jsonb, '1f0076663024d7e85746ae8906a4e6c0b8585d60f3c794e2a97d848c46975fd4', 'Mara Pharm', 'mara pharm', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6303577, 20.7853742, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:c893436582d4e590f302a98d246e4dbf132de91d0a649b78f226e303b966442b'),
('osm:node:3820715670', 'https://www.openstreetmap.org/node/3820715670', '{"provider":"openstreetmap","element":{"type":"node","id":3820715670,"lat":42.0705055,"lon":19.5185418,"tags":{"amenity":"dentist","name":"Margerita","opening_hours":"Mo-Su 07:00-15:00","payment:coins":"yes","payment:credit_cards":"no","payment:cryptocurrencies":"no","payment:debit_cards":"no","payment:electronic_purses":"no","payment:notes":"yes","smoking":"outside","source":"bing;survey;gps","source_ref:url":"https://www.flickr.com/photos/134902422@N04/map?&fLat=41.9559&fLon=19.4337&zl=11&order_by=recent","wheelchair":"limited"}}}'::jsonb, 'a01b4417dad3c551c1f4d475d8c29cc68d7211c13ba8561845a3be5d6f88d776', 'Margerita', 'margerita', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0705055, 19.5185418, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:6f7cabb7efe31f24ea5e146dcfb1fd8867b360a7e6e5e0ae1123f834b9cfb3b9'),
('osm:node:9200216324', 'https://www.openstreetmap.org/node/9200216324', '{"provider":"openstreetmap","element":{"type":"node","id":9200216324,"lat":40.6193645,"lon":20.7749966,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Marjana"}}}'::jsonb, '43ad1d84d6c70f8d1acbdfddba33b25eb6d59154a0f22adf7ff7471026f92342', 'Marjana', 'marjana', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6193645, 20.7749966, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:60b2045a3a9527c6fed5211b816ee2c235021b8ae43f0a2c07f6e47cc5db690e'),
('osm:way:283816130', 'https://www.openstreetmap.org/way/283816130', '{"provider":"openstreetmap","element":{"type":"way","id":283816130,"center":{"lat":40.7233211,"lon":19.5601338},"tags":{"amenity":"clinic","building":"yes","name":"Marteniteti i Fierit"}}}'::jsonb, 'c9231577e20251b409641008abbdc4294a64481d979f2417dfcf968093541d80', 'Marteniteti i Fierit', 'marteniteti i fierit', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7233211, 19.5601338, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:42a6a3522c3fec05667e6057c1175fc5cb4ce226d632964eb9d6054fd9b2bbed'),
('osm:node:9041579879', 'https://www.openstreetmap.org/node/9041579879', '{"provider":"openstreetmap","element":{"type":"node","id":9041579879,"lat":42.0075187,"lon":19.6392414,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Martini"}}}'::jsonb, '63f349b600ed4b2bc930719a53419f92cabd7dd033b996f5ef2470e8629cec52', 'Martini', 'martini', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0075187, 19.6392414, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:d2dddde22d75ad90f0f983f3f070bd4c967d57ee1c5ff3d8aa2791ea9078110b'),
('osm:way:1322881800', 'https://www.openstreetmap.org/way/1322881800', '{"provider":"openstreetmap","element":{"type":"way","id":1322881800,"center":{"lat":40.9020168,"lon":20.655853},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Materniteti"}}}'::jsonb, '66dd27c212e8319d518dab778c75371974393928dbf5ec487594820c4129ee57', 'Materniteti', 'materniteti', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9020168, 20.655853, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:aa29d97a20ee0fb2547f34d7de602c9e8b708b37e2b79cbddb4505ecb719d739'),
('osm:way:1323027415', 'https://www.openstreetmap.org/way/1323027415', '{"provider":"openstreetmap","element":{"type":"way","id":1323027415,"center":{"lat":39.8734269,"lon":20.0042912},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Materniteti"}}}'::jsonb, 'ff19e33862c6a22d645b3bb54d82e4358a12fe9ad0eed2f2a11f41d1eac34a5f', 'Materniteti', 'materniteti', NULL, NULL, NULL, NULL, NULL, 'AL', 39.8734269, 20.0042912, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:bb064b1ab9850600d8f2ac7db52c1801fb365214a9270021784b7749215371d0'),
('osm:node:9856298721', 'https://www.openstreetmap.org/node/9856298721', '{"provider":"openstreetmap","element":{"type":"node","id":9856298721,"lat":40.5071468,"lon":20.9274632,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Mea Dent","phone":"+355 696266669"}}}'::jsonb, '7a0004f50cbe41d9199ac093ff66d3ce9f6df3b8c8487d2fb5d4ad1bbbee2d44', 'Mea Dent', 'mea dent', NULL, NULL, NULL, NULL, NULL, 'AL', 40.5071468, 20.9274632, '+355 696266669', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:bcea8f040210023eeae5e1998cfaf6e21530d3a8d27dc627f58174b650410e0c'),
('osm:node:12889382975', 'https://www.openstreetmap.org/node/12889382975', '{"provider":"openstreetmap","element":{"type":"node","id":12889382975,"lat":40.6229752,"lon":20.9859875,"tags":{"amenity":"dentist","healthcare":"dentist","name":"MeaDent","office":"lawyer"}}}'::jsonb, '63e930c7a363e7e6cf3b30fc4d697d3f334734d75d0119acc6b11d27db941492', 'MeaDent', 'meadent', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6229752, 20.9859875, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:4f01112422ce078c2aca91e8267b25f6dec09e660ed59f06e17d8485207eb57f'),
('osm:node:11511437405', 'https://www.openstreetmap.org/node/11511437405', '{"provider":"openstreetmap","element":{"type":"node","id":11511437405,"lat":41.3158083,"lon":19.8151755,"tags":{"check_date":"2024-01-12","healthcare":"physiotherapist","level":"1","name":"Medal Physiotherapy","phone":"+355 68 900 3624"}}}'::jsonb, '540bf5a0fa708df61735b94116652ce205094e794522ab33e92cfbf2bc9d71d8', 'Medal Physiotherapy', 'medal physiotherapy', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3158083, 19.8151755, '+355 68 900 3624', NULL, NULL, 'unknown', ARRAY['unknown']::text[], 0.78, 'loc:e39995aa3d16b901e561c30927d9838ae9a9457c4bf0d38193428f22f7694021'),
('osm:node:6860174201', 'https://www.openstreetmap.org/node/6860174201', '{"provider":"openstreetmap","element":{"type":"node","id":6860174201,"lat":40.4581552,"lon":19.483074,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Media dent"}}}'::jsonb, '0cabb437b1cf8fbcf6f341a9c0a04d170a1403f9e229a03b238c1d5619d7b5b3', 'Media dent', 'media dent', NULL, NULL, NULL, NULL, NULL, 'AL', 40.4581552, 19.483074, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:974ca003c1966d1613e9c562e292312d6ce347d7964137ae58e4230441820b9a'),
('osm:node:6879940878', 'https://www.openstreetmap.org/node/6879940878', '{"provider":"openstreetmap","element":{"type":"node","id":6879940878,"lat":41.3257965,"lon":19.4462259,"tags":{"addr:street":"Rruga Ahmet Ramzoti","amenity":"clinic","name":"Medical Care Lami"}}}'::jsonb, 'b81e09733f36454834c0915410786c90b6c8699b2dfb5b2d9322d36bbe49b6a1', 'Medical Care Lami', 'medical care lami', 'Rruga Ahmet Ramzoti', 'Rruga Ahmet Ramzoti', NULL, NULL, NULL, 'AL', 41.3257965, 19.4462259, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:8cd034fc78ba62651fb89bcefda1bff0fe6ddc0e071dd55095b3238de8683267'),
('osm:way:223843661', 'https://www.openstreetmap.org/way/223843661', '{"provider":"openstreetmap","element":{"type":"way","id":223843661,"center":{"lat":42.293947,"lon":19.9322274},"tags":{"amenity":"clinic","building":"yes","name":"Medical center in Lekbibaj"}}}'::jsonb, '3a8da3e7d3f45702bffda76cba8cb581a73426bc5e5b2735d81866a1b9202716', 'Medical center in Lekbibaj', 'medical center in lekbibaj', NULL, NULL, NULL, NULL, NULL, 'AL', 42.293947, 19.9322274, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:a9c3717ecbe92d5fbffcda2519e54965a1e38390aa5dd77cb3c24fc2cd422524'),
('osm:node:13184680587', 'https://www.openstreetmap.org/node/13184680587', '{"provider":"openstreetmap","element":{"type":"node","id":13184680587,"lat":40.2330648,"lon":20.3523351,"tags":{"amenity":"doctors","name":"Medical Sole"}}}'::jsonb, '1301076d21a7f7526f298ac3d9dd72fb25eec06eb8e1174e454366f7fe7e2e4f', 'Medical Sole', 'medical sole', NULL, NULL, NULL, NULL, NULL, 'AL', 40.2330648, 20.3523351, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:e5fc185af0634763f466dad75cfadf11edbcf537a5fa62fea07bde8f3292315e'),
('osm:node:4539321601', 'https://www.openstreetmap.org/node/4539321601', '{"provider":"openstreetmap","element":{"type":"node","id":4539321601,"lat":42.0735854,"lon":19.5217662,"tags":{"amenity":"clinic","name":"MediCare"}}}'::jsonb, 'daa4516d9153d98abae2e1e5b80fa80a4bcf5fac0da06c5633dea72505136a35', 'MediCare', 'medicare', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0735854, 19.5217662, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:3cab9a926bb8e8d2c1850aaf9080ee415b31bbd891c15efa52ef461d944e2412'),
('osm:way:318665802', 'https://www.openstreetmap.org/way/318665802', '{"provider":"openstreetmap","element":{"type":"way","id":318665802,"center":{"lat":41.3337295,"lon":19.8040587},"tags":{"addr:city":"Tirana","addr:street":"Sheshi Karl Topia","amenity":"hospital","building":"yes","building:levels":"2","healthcare":"hospital","name":"MediCare Hospital"}}}'::jsonb, 'e76e39ef2158af4e0a7be0f3f082c91e577392053d9ac79847b963be0febe8bc', 'MediCare Hospital', 'medicare hospital', 'Sheshi Karl Topia', 'Sheshi Karl Topia, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3337295, 19.8040587, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:62c70419d14eceb1b2fcaed608b31192e1fc6b1cc13d77324b9011731abb4fc2'),
('osm:node:5741052521', 'https://www.openstreetmap.org/node/5741052521', '{"provider":"openstreetmap","element":{"type":"node","id":5741052521,"lat":42.0684943,"lon":19.5126795,"tags":{"addr:street":"Rruga Qemal Draçini","amenity":"clinic","internet_access":"wlan","name":"Medicus","opening_hours":"Mo-Sa 09:00-19:00","phone":"0675878677"}}}'::jsonb, 'c8c2740e962aa6bc64a27f3cb68edf625907226a220634ebc5243a599729c870', 'Medicus', 'medicus', 'Rruga Qemal Draçini', 'Rruga Qemal Draçini', NULL, NULL, NULL, 'AL', 42.0684943, 19.5126795, '0675878677', NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:d5666715a2a80172a16d5cccb45ce968d95f17d8f9a28baa1807794c065e8722'),
('osm:node:6840944237', 'https://www.openstreetmap.org/node/6840944237', '{"provider":"openstreetmap","element":{"type":"node","id":6840944237,"lat":41.3391869,"lon":19.8274121,"tags":{"addr:street":"Rruga e Dibrës","amenity":"pharmacy","healthcare":"pharmacy","name":"Mega Farma"}}}'::jsonb, '8334520876fc1ae583d0720b93da12604c56812b7aa72ad840d87edfa8099449', 'Mega Farma', 'mega farma', 'Rruga e Dibrës', 'Rruga e Dibrës', NULL, NULL, NULL, 'AL', 41.3391869, 19.8274121, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:32e27d9e49975af9c81a7e40f333e75353a4df90e3f522c0afec82b31ebb4fd2'),
('osm:node:6372228362', 'https://www.openstreetmap.org/node/6372228362', '{"provider":"openstreetmap","element":{"type":"node","id":6372228362,"lat":40.6125785,"lon":20.7767714,"tags":{"amenity":"pharmacy","name":"Megi","opening_hours":"Mo-Sa 09:00-21:00; Su off","wheelchair":"no"}}}'::jsonb, '5fe1d8c546f8d563b71e16cdaa0cc53378b5e85fd4b5103701f98f9671acd98a', 'Megi', 'megi', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6125785, 20.7767714, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:beafdc5716b539236ad5c9ee3ef4ca05c34138ec15b7535ae8d3ae8eb51b401f'),
('osm:node:6806186570', 'https://www.openstreetmap.org/node/6806186570', '{"provider":"openstreetmap","element":{"type":"node","id":6806186570,"lat":41.3003949,"lon":19.8487598,"tags":{"addr:street":"Rruga e Elbasanit","amenity":"dentist","healthcare":"dentist","name":"Mela Dent"}}}'::jsonb, '225d903dc680632bf72d6cdc2f8fe76463420573805b89c277d0927c4066097d', 'Mela Dent', 'mela dent', 'Rruga e Elbasanit', 'Rruga e Elbasanit', NULL, NULL, NULL, 'AL', 41.3003949, 19.8487598, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:ba862c69973b0d019ec71df82945e16fd5530a30356760b7246c8d34b3de33d7'),
('osm:node:6853585760', 'https://www.openstreetmap.org/node/6853585760', '{"provider":"openstreetmap","element":{"type":"node","id":6853585760,"lat":40.7281456,"lon":19.5591399,"tags":{"amenity":"dentist","name":"Memo Klinike Dentare Turke","phone":"+355695815883"}}}'::jsonb, '157fb2541868b0385a8b9b9cd69a032200b91a24f3636e4316b364eb6754c2a3', 'Memo Klinike Dentare Turke', 'memo klinike dentare turke', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7281456, 19.5591399, '+355695815883', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:c4d3e8f5444d4f30f6d6709dcaa90e0845905f4ce0e733c4cd54a617d74e7b42'),
('osm:node:9124938765', 'https://www.openstreetmap.org/node/9124938765', '{"provider":"openstreetmap","element":{"type":"node","id":9124938765,"lat":41.322622,"lon":19.8156374,"tags":{"amenity":"pharmacy","check_date":"2024-08-20","healthcare":"pharmacy","level":"1","name":"Memorial Hospitals Group"}}}'::jsonb, 'ded119ddd7a80f4d9f764fb540d5245fbfca1777289e073afda7bb6bf0431e3c', 'Memorial Hospitals Group', 'memorial hospitals group', NULL, NULL, NULL, NULL, NULL, 'AL', 41.322622, 19.8156374, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination', 'hospital']::text[], 0.78, 'loc:da99f0e79d0658e17511ee928f6f9d6f7e33b657cf0a6e92bad6c067ac65895d'),
('osm:node:5599677024', 'https://www.openstreetmap.org/node/5599677024', '{"provider":"openstreetmap","element":{"type":"node","id":5599677024,"lat":40.6192975,"lon":20.7803624,"tags":{"amenity":"dentist","name":"Menkshi"}}}'::jsonb, 'd12e2e94de56f7ce1ace36c02414bb61cbe6dd22b4a1598551c6230607f54740', 'Menkshi', 'menkshi', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6192975, 20.7803624, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:b6c5e83a4c5695c58280056d516bc3438eefa6e78f8eb3fb83cc11268b6fdee1'),
('osm:node:6416400538', 'https://www.openstreetmap.org/node/6416400538', '{"provider":"openstreetmap","element":{"type":"node","id":6416400538,"lat":40.6123958,"lon":20.7819994,"tags":{"amenity":"pharmacy","name":"Meri"}}}'::jsonb, '2301b772c0822f2e917947e379c24e9dcf756de4436036176525a8ebe11384d5', 'Meri', 'meri', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6123958, 20.7819994, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:4edb2547d6e7ca5035d7593793be8101eb594bda2f719fd681fcaac81b51d242'),
('osm:node:3985975757', 'https://www.openstreetmap.org/node/3985975757', '{"provider":"openstreetmap","element":{"type":"node","id":3985975757,"lat":42.0700041,"lon":19.5086235,"tags":{"addr:city":"Shkodër","addr:country":"AL","addr:postcode":"4001","amenity":"pharmacy","dispensing":"yes","name":"Meta","payment:coins":"yes","payment:credit_cards":"no","payment:cryptocurrencies":"no","payment:debit_cards":"no","payment:electronic_purses":"no","payment:notes":"yes","smoking":"outside","source":"bing;survey;gps","source_ref:url":"https://www.flickr.com/photos/134902422@N04/map?&fLat=41.9559&fLon=19.4337&zl=11&order_by=recent","wheelchair":"limited"}}}'::jsonb, 'e03cb3ca49b46f3d12173982637098a1d2f059a215209bf2299df2b0fae61265', 'Meta', 'meta', NULL, 'Shkodër, 4001', 'Shkodër', NULL, '4001', 'AL', 42.0700041, 19.5086235, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:ef04e58f080befce81f037d283f25108d76bdb9a1aa7e74734fb6b2883c4726e'),
('osm:node:9161308552', 'https://www.openstreetmap.org/node/9161308552', '{"provider":"openstreetmap","element":{"type":"node","id":9161308552,"lat":40.8999803,"lon":20.6624169,"tags":{"amenity":"dentist","name":"Mia"}}}'::jsonb, '3ae666548c94bcb27c49ac8ae31afbdd0d650e2572ab1a5c2d81755092cdf79e', 'Mia', 'mia', NULL, NULL, NULL, NULL, NULL, 'AL', 40.8999803, 20.6624169, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:8560ffcb5adaa87fcd3292a97d2cc776a1965016a30b68f5c8ec50f1910c5678'),
('osm:node:6434138717', 'https://www.openstreetmap.org/node/6434138717', '{"provider":"openstreetmap","element":{"type":"node","id":6434138717,"lat":40.6178105,"lon":20.7710557,"tags":{"amenity":"pharmacy","name":"Mikel Qaja","short_name":"Qaja","wheelchair":"yes"}}}'::jsonb, '92081e75083c651544b497d2450f7cf36d9ba55bd50239387b07f0f4a6d4372e', 'Mikel Qaja', 'mikel qaja', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6178105, 20.7710557, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:22bb4c9546e4b8a8078ae0ab87479757fd9860449a3bf4a3e7ccfc3d95f8152e'),
('osm:node:9844769329', 'https://www.openstreetmap.org/node/9844769329', '{"provider":"openstreetmap","element":{"type":"node","id":9844769329,"lat":40.6116337,"lon":20.7840278,"tags":{"healthcare":"laboratory","name":"Mio","phone":"+355 68 804 0641"}}}'::jsonb, '81672ce3f259d461317bb843cad0cce5f0e83606cdbe27cc3e3b18463496ccc7', 'Mio', 'mio', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6116337, 20.7840278, '+355 68 804 0641', NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:c22629e3042ee098c5a102b31b5035c5ce0bd9336475f6aa100b1894ee27aafc'),
('osm:node:9839187215', 'https://www.openstreetmap.org/node/9839187215', '{"provider":"openstreetmap","element":{"type":"node","id":9839187215,"lat":40.6227889,"lon":20.7803726,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Mira","phone":"+355 69 429 4377"}}}'::jsonb, '5b98badb9a10da4883ee7e6b65a3d4e574c4f4080cbbf0f2979697a79ae80899', 'Mira', 'mira', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6227889, 20.7803726, '+355 69 429 4377', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:6af068e762aced2163ff06f8a02bffbd7b679a312be724bcb53f4ffe10e1cb27'),
('osm:node:10894973478', 'https://www.openstreetmap.org/node/10894973478', '{"provider":"openstreetmap","element":{"type":"node","id":10894973478,"lat":41.3385318,"lon":19.790811,"tags":{"addr:city":"Tirana","addr:street":"Rruga Gjergj Legisi","amenity":"dentist","healthcare":"dentist","name":"Mirdita Dental","website":"https://mirditadental.com/"}}}'::jsonb, '4d7ab48ebb30dc3789b740cc28ddabe13b97a19075b25ea80544772e0a3f6930', 'Mirdita Dental', 'mirdita dental', 'Rruga Gjergj Legisi', 'Rruga Gjergj Legisi, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3385318, 19.790811, NULL, 'https://mirditadental.com/', NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:e69cd3dd6f427744bbd57b50af3b90b0f0a5b224d9ab258b1f680de5824724ea'),
('osm:node:12914892823', 'https://www.openstreetmap.org/node/12914892823', '{"provider":"openstreetmap","element":{"type":"node","id":12914892823,"lat":40.6141002,"lon":20.7768399,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Monda","phone":"+355 67 401 3622","wheelchair":"yes"}}}'::jsonb, 'b5c0f52ea02a864470baaafc4f1fd4fcbf07def6b04aab1836c72c66fb2cc2fa', 'Monda', 'monda', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6141002, 20.7768399, '+355 67 401 3622', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:93ac71858c5bd2655b4d5d146eca11385930e66a8276463a0be0f131b4baeec3'),
('osm:node:6395887511', 'https://www.openstreetmap.org/node/6395887511', '{"provider":"openstreetmap","element":{"type":"node","id":6395887511,"lat":40.6147052,"lon":20.7768487,"tags":{"amenity":"dentist","healthcare":"dentist","level":"1","name":"Monda Karanxha","wheelchair":"no"}}}'::jsonb, '1a7f260b47a430d2070910fb7ebf8c1dc3e5e8f934132764bde1fab67be4f277', 'Monda Karanxha', 'monda karanxha', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6147052, 20.7768487, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:49a3e2effd790fa243c9d70549372b14170d8b547a7a70be432ad7891c643f7a'),
('osm:node:4963381225', 'https://www.openstreetmap.org/node/4963381225', '{"provider":"openstreetmap","element":{"type":"node","id":4963381225,"lat":41.5136208,"lon":19.7897398,"tags":{"addr:housenumber":"32","addr:postcode":"1019","addr:street":"Gjergj Kastrioti Skënderbeu","amenity":"dentist","check_date":"2024-06-15","email":"el-edmond@live.com","internet_access":"wlan","name":"MonDent","name:en":"MonDent","opening_hours":"Mo-Sa 09:00-18:00","phone":"00355685000085"}}}'::jsonb, 'e2868f71da61058f2b924a08b23e338cba6daead66e79d0452fe4d1064549cea', 'MonDent', 'mondent', '32 Gjergj Kastrioti Skënderbeu', '32 Gjergj Kastrioti Skënderbeu, 1019', NULL, NULL, '1019', 'AL', 41.5136208, 19.7897398, '00355685000085', NULL, 'el-edmond@live.com', 'dental', ARRAY['dental']::text[], 0.86, 'loc:10ebce8c0ee3b60149cfe3b7dc16aac696b3ba6da5de505f1419224010af8a4e'),
('osm:node:13917475075', 'https://www.openstreetmap.org/node/13917475075', '{"provider":"openstreetmap","element":{"type":"node","id":13917475075,"lat":42.1964993,"lon":20.4134833,"tags":{"addr:floor":"G","amenity":"pharmacy","check_date":"2026-06-07","healthcare":"pharmacy","level":"0","name":"Morina","wheelchair":"no"}}}'::jsonb, 'fa058aa9440dfec46a4d3b4080b996a31305aa4bfa137f584b89f2888fcc51ff', 'Morina', 'morina', NULL, NULL, NULL, NULL, NULL, 'AL', 42.1964993, 20.4134833, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:bbeb60602ec62cb3efda0a34adedd3fece5e6d4e392a7100e06bef89fbd02857'),
('osm:node:12468633583', 'https://www.openstreetmap.org/node/12468633583', '{"provider":"openstreetmap","element":{"type":"node","id":12468633583,"lat":41.3307461,"lon":19.8430292,"tags":{"amenity":"pharmacy","check_date":"2025-01-02","healthcare":"pharmacy","internet_access":"no","level":"0","name":"My Clinic","name:sq":"Farmaci My Clinic","payment:cash":"yes","payment:credit_cards":"yes","payment:debit_cards":"yes","wheelchair":"no"}}}'::jsonb, 'f8ac050abd623edbeb565e90386add6662dc72f43fc9953a489ba27122eb6226', 'My Clinic', 'my clinic', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3307461, 19.8430292, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination', 'general_practitioner']::text[], 0.78, 'loc:1180713e81ccfc1c752d7ff1465261f9993831b8736a9cc1ce8531623f49c2e6'),
('osm:node:10118570775', 'https://www.openstreetmap.org/node/10118570775', '{"provider":"openstreetmap","element":{"type":"node","id":10118570775,"lat":40.621464,"lon":20.7784975,"tags":{"alt_name":"Mihail Mizaku","amenity":"dentist","healthcare":"dentist","name":"My Dentist","phone":"+355 69 299 4445","wheelchair":"no"}}}'::jsonb, 'de81b6fada2da362877c4ff3f14b65798de8a0eee4cb0ab261a782db21c4d03a', 'My Dentist', 'my dentist', NULL, NULL, NULL, NULL, NULL, 'AL', 40.621464, 20.7784975, '+355 69 299 4445', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:f8d4ed6eb475102eba3b0861d222d8dace23019f8471684883f2aa87da6f1a3f'),
('osm:node:9536038475', 'https://www.openstreetmap.org/node/9536038475', '{"provider":"openstreetmap","element":{"type":"node","id":9536038475,"lat":41.349092,"lon":19.8589859,"tags":{"addr:city":"Tirana","addr:street":"Rruga Fadil Deliu","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Nana Farma"}}}'::jsonb, '75caef377fd77eb9dc7516490458861e7b88e112175cea866d8addfdd98f2e70', 'Nana Farma', 'nana farma', 'Rruga Fadil Deliu', 'Rruga Fadil Deliu, Tirana', 'Tirana', NULL, NULL, 'AL', 41.349092, 19.8589859, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:8a40874db731bd2389a7bd1cc4b15d7c2c161d7928c64db08fd9d0171fb87fc4'),
('osm:node:4602199141', 'https://www.openstreetmap.org/node/4602199141', '{"provider":"openstreetmap","element":{"type":"node","id":4602199141,"lat":41.3312456,"lon":19.8329386,"tags":{"addr:city":"Tirana","addr:postcode":"1000","addr:street":"Vëllezërit Huta","amenity":"pharmacy","healthcare":"pharmacy","level":"1","name":"Nati"}}}'::jsonb, '585dc5c1001d02ea7c029fb537da853510b8826bf8555c7c51657e4ccef493a6', 'Nati', 'nati', 'Vëllezërit Huta', 'Vëllezërit Huta, Tirana, 1000', 'Tirana', NULL, '1000', 'AL', 41.3312456, 19.8329386, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:cb7e8a63ca86a7c29b447cc130fa77c30e2106cbb444a53a4f673822abaf93b4'),
('osm:node:11476087908', 'https://www.openstreetmap.org/node/11476087908', '{"provider":"openstreetmap","element":{"type":"node","id":11476087908,"lat":41.3244261,"lon":19.8044198,"tags":{"amenity":"dentist","check_date":"2023-12-30","healthcare":"dentist","name":"Natural Dent"}}}'::jsonb, '441c1b9d8604b598de534a0a24026cef84126c88d26b28e57abdeba18767e8e7', 'Natural Dent', 'natural dent', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3244261, 19.8044198, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:eb0505d6a0a653492f63a1ed8d6ab7c4485a6af446800a53892b7502f841ba60'),
('osm:way:730012772', 'https://www.openstreetmap.org/way/730012772', '{"provider":"openstreetmap","element":{"type":"way","id":730012772,"center":{"lat":41.3267488,"lon":19.4884251},"tags":{"addr:street":"Rruga Bajram Tusha","amenity":"pharmacy","building":"commercial","name":"Natural Pharmacy"}}}'::jsonb, 'cec779f4663251d006dcefaef0e67daac0ae2119f25718aac268bfb5b6c7bf59', 'Natural Pharmacy', 'natural pharmacy', 'Rruga Bajram Tusha', 'Rruga Bajram Tusha', NULL, NULL, NULL, 'AL', 41.3267488, 19.4884251, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:da751c330a9062d184f49dc12ce5a7f80c1c4feff40f2775a87e3f55b56f6eae'),
('osm:node:4579869247', 'https://www.openstreetmap.org/node/4579869247', '{"provider":"openstreetmap","element":{"type":"node","id":4579869247,"lat":41.3400044,"lon":19.8340668,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Nefrologjia","phone":"+35542349292","website":"https://www.qsut.gov.al/index.php/sherbimet-mjekesore/sherbimi-i-nefrologjise/sherbimet-e-ofruara/"}}}'::jsonb, 'b78e28f3b361851a72f8266447f5f02b9d1fcbf71473172a2a6b5388ba56d6f8', 'Nefrologjia', 'nefrologjia', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3400044, 19.8340668, '+35542349292', 'https://www.qsut.gov.al/index.php/sherbimet-mjekesore/sherbimi-i-nefrologjise/sherbimet-e-ofruara/', NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:019d8f71366928e95abeb0954392d9c756f511ac9575e5203e6cfa068f429394'),
('osm:node:6808385269', 'https://www.openstreetmap.org/node/6808385269', '{"provider":"openstreetmap","element":{"type":"node","id":6808385269,"lat":41.3406208,"lon":19.8471083,"tags":{"addr:street":"Rruga Marie Kraja","amenity":"pharmacy","healthcare":"pharmacy","name":"Nersi"}}}'::jsonb, 'd9b75a54bc7b3d618033e7ae0ba4d1bf2fe34c90cf24dfd434f874226054569d', 'Nersi', 'nersi', 'Rruga Marie Kraja', 'Rruga Marie Kraja', NULL, NULL, NULL, 'AL', 41.3406208, 19.8471083, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:4e9e8094cdfb2e17b7661663479cadf6c122cecfa8966a01fbbd34cdc9179d3d'),
('osm:node:6818445171', 'https://www.openstreetmap.org/node/6818445171', '{"provider":"openstreetmap","element":{"type":"node","id":6818445171,"lat":41.3347392,"lon":19.8362567,"tags":{"addr:street":"Rruga Xhanfize Keko","amenity":"pharmacy","healthcare":"pharmacy","name":"Nersi Pharma"}}}'::jsonb, '47c1ad771ec45a917128f01fa0e3d2792c61ab13169fd8e3896589b63fc0364e', 'Nersi Pharma', 'nersi pharma', 'Rruga Xhanfize Keko', 'Rruga Xhanfize Keko', NULL, NULL, NULL, 'AL', 41.3347392, 19.8362567, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:ef108925a0712097d5125ffc3d58ed432cd76e9c0768fc8227c35df90ac57561'),
('osm:node:13830500627', 'https://www.openstreetmap.org/node/13830500627', '{"provider":"openstreetmap","element":{"type":"node","id":13830500627,"lat":40.9395085,"lon":19.7076609,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Nertila"}}}'::jsonb, 'e60a6b8d53f6bef87a03b728d9e4e136eb4f7eabc1b668d6441453059d3a6b33', 'Nertila', 'nertila', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9395085, 19.7076609, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:40e65005d7fbe8b8bb5015b0a03b5a0035215aa7ae895d6d5617474d7ce2cc0d'),
('osm:node:12188498186', 'https://www.openstreetmap.org/node/12188498186', '{"provider":"openstreetmap","element":{"type":"node","id":12188498186,"lat":40.9413822,"lon":19.7037195,"tags":{"amenity":"dentist","contact:instagram":"nevila_ferrua_dent","healthcare":"dentist","name":"Nevila Dent","phone":"+355695587808","wheelchair":"no"}}}'::jsonb, 'a1a0a5c51b8db650a8000612ca764ca4844b4096d3813c62610e0fc3354f2c2c', 'Nevila Dent', 'nevila dent', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9413822, 19.7037195, '+355695587808', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:2eec38838393236c3106e15f754a853584047cedd211f6c6380bafdab2fa6eb6'),
('osm:node:6845189007', 'https://www.openstreetmap.org/node/6845189007', '{"provider":"openstreetmap","element":{"type":"node","id":6845189007,"lat":41.1856038,"lon":19.5586447,"tags":{"addr:street":"Jurgen Trade","amenity":"dentist","name":"New Dent"}}}'::jsonb, 'e91bc7cdcfd04bca14aefeb85083984656ab80b8a912d5d82ba5efe04d1e78af', 'New Dent', 'new dent', 'Jurgen Trade', 'Jurgen Trade', NULL, NULL, NULL, 'AL', 41.1856038, 19.5586447, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:12194ddb8a998c3d4a6c4e5622466b8ae5a79b0166c25c2a710c8580bca9b078'),
('osm:node:9034394052', 'https://www.openstreetmap.org/node/9034394052', '{"provider":"openstreetmap","element":{"type":"node","id":9034394052,"lat":42.3577326,"lon":20.0735221,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Nezaj"}}}'::jsonb, '64a7f350cf25324f2df5776e4d390f439d8a83ebd30b3d7975065ad51aee4bd3', 'Nezaj', 'nezaj', NULL, NULL, NULL, NULL, NULL, 'AL', 42.3577326, 20.0735221, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:a4b78f33874e3075f127e6966fce70559b873207cecdec93ce4c04418c501e0a'),
('osm:node:10199255470', 'https://www.openstreetmap.org/node/10199255470', '{"provider":"openstreetmap","element":{"type":"node","id":10199255470,"lat":40.6111122,"lon":20.7851972,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Nial","wheelchair":"no"}}}'::jsonb, 'be58a83c5066338e8ebf139cb9e2037daea4b095f0576109cbccff597f916f1e', 'Nial', 'nial', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6111122, 20.7851972, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:a811e8b7e2977ddebc91bad50259e5d6ca7f1bf9d8e7aa07fce55e6fa3b23359'),
('osm:node:5527425685', 'https://www.openstreetmap.org/node/5527425685', '{"provider":"openstreetmap","element":{"type":"node","id":5527425685,"lat":40.9961043,"lon":19.5329989,"tags":{"amenity":"dentist","name":"Nito"}}}'::jsonb, 'c90e45ee94ced07492a8e6e2631c236c273eac1d3770be63c65d4f3c500102bf', 'Nito', 'nito', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9961043, 19.5329989, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:fa937d2dab27face9c6ae393c7644257746e33e5cd29220cd4985ad31f62d719');

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
