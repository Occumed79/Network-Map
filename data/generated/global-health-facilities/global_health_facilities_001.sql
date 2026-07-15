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
('osm:node:6869496886', 'https://www.openstreetmap.org/node/6869496886', '{"provider":"openstreetmap","element":{"type":"node","id":6869496886,"lat":40.7318048,"lon":19.556511,"tags":{"addr:housenumber":"1","addr:postcode":"9301","addr:street":"Rruga Miço Papuçiu","amenity":"pharmacy","email":"fiorisefaa@hotmail.com","name":"-FARMACI SEFA-","name:en":"FARMACI SEFA","name:sq":"FARMACI SEFA","opening_hours":"Mo-Su 08:00-14:00, 15:00-21:00"}}}'::jsonb, '68eb0c52c0dab6292c84cb2252f20093fcf5ca9e68a3d5ee6e35cb883d679f76', '-FARMACI SEFA-', 'farmaci sefa', '1 Rruga Miço Papuçiu', '1 Rruga Miço Papuçiu, 9301', NULL, NULL, '9301', 'AL', 40.7318048, 19.556511, NULL, NULL, 'fiorisefaa@hotmail.com', 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:7c033a2f5f7dc71f5b67fcfde02385918f590b97f65cb7fce6aa1000ca2f17be'),
('osm:node:6863519895', 'https://www.openstreetmap.org/node/6863519895', '{"provider":"openstreetmap","element":{"type":"node","id":6863519895,"lat":40.4711766,"lon":19.4883161,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"11"}}}'::jsonb, '118933899487c97c66f454814732420f76ad89e99fc4c1def0389619ea09f7eb', '11', '11', NULL, NULL, NULL, NULL, NULL, 'AL', 40.4711766, 19.4883161, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:722550afaa29ab07d4485c10a174352be7fbc483200d8d5c4e8f6e7a5d2e3118'),
('osm:way:464601829', 'https://www.openstreetmap.org/way/464601829', '{"provider":"openstreetmap","element":{"type":"way","id":464601829,"center":{"lat":41.3009498,"lon":19.8487204},"tags":{"addr:city":"Tirana","addr:street":"Rruga e Elbasanit","amenity":"clinic","building":"yes","healthcare":"clinic","name":"3 Yjet","phone":"+355 4 2467837","source":"bing;mapbox;digitalglobe-satellite","source_ref:url":"https://www.flickr.com/photos/openstreetmap-albania/","website":"http://www.klinika3yjet.al/"}}}'::jsonb, 'e47b44988a8fe13656aceca2f960157aeb620bca19db0c34010a61efeaddf60c', '3 Yjet', '3 yjet', 'Rruga e Elbasanit', 'Rruga e Elbasanit, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3009498, 19.8487204, '+355 4 2467837', 'http://www.klinika3yjet.al/', NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:8a763c84ee43e2d46a11b7d301524b56053f719a5bb4ef3088f1a30334cb4299'),
('osm:node:3986083277', 'https://www.openstreetmap.org/node/3986083277', '{"provider":"openstreetmap","element":{"type":"node","id":3986083277,"lat":42.0682435,"lon":19.5066456,"tags":{"addr:postcode":"4001","addr:street":"Rruga Isuf Sokoli","amenity":"dentist","email":"32perlat@gmail.com","internet_access":"wlan","name":"32 Perla","name:en":"Dental Clinic \"32 Perla\"","name:sq":"Klinika Dentare \"32 Perla\"","opening_hours":"Mo-Sa 09:00-17:00","payment:coins":"yes","payment:credit_cards":"no","payment:cryptocurrencies":"no","payment:debit_cards":"no","payment:electronic_purses":"no","payment:notes":"yes","phone":"+355694422015","smoking":"outside","source":"bing;survey;gps","source_ref:url":"https://www.flickr.com/photos/134902422@N04/map?&fLat=41.9559&fLon=19.4337&zl=11&order_by=recent","wheelchair":"limited"}}}'::jsonb, '8f36b683bba6d84f615fd8a776d587f7dd3b13e44eeab5436f6412dc297135f5', '32 Perla', '32 perla', 'Rruga Isuf Sokoli', 'Rruga Isuf Sokoli, 4001', NULL, NULL, '4001', 'AL', 42.0682435, 19.5066456, '+355694422015', NULL, '32perlat@gmail.com', 'dental', ARRAY['dental']::text[], 0.86, 'loc:4aa51bfba6d35da6d6a536e4bedb8f05696b6a6366c7277d8c9e522607167953'),
('osm:node:6853141391', 'https://www.openstreetmap.org/node/6853141391', '{"provider":"openstreetmap","element":{"type":"node","id":6853141391,"lat":41.3221305,"lon":19.4508577,"tags":{"amenity":"clinic","name":"Ad-Ar"}}}'::jsonb, 'c312e631a4f643f327b362ad11419c7ac2bfd63ca6d162ac7de024d5d27063da', 'Ad-Ar', 'ad ar', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3221305, 19.4508577, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:191c3dbc4f904a1841762dbd1522c51a1776008870587a832e4559a1e1fcd006'),
('osm:node:3158230548', 'https://www.openstreetmap.org/node/3158230548', '{"provider":"openstreetmap","element":{"type":"node","id":3158230548,"lat":41.1106926,"lon":20.0790625,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Ada","opening_hours":"Mo-Su 08:00-20:00"}}}'::jsonb, 'fcef0fdf2053e240de28c2b90da8ddc03f0cd5f57688f815ad1d9d53f91c43d6', 'Ada', 'ada', NULL, NULL, NULL, NULL, NULL, 'AL', 41.1106926, 20.0790625, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:d6e704f1d22683e0594edec956d6ac9e3b7fa0e2f67a18a4d4049695625ef074'),
('osm:node:5448899524', 'https://www.openstreetmap.org/node/5448899524', '{"provider":"openstreetmap","element":{"type":"node","id":5448899524,"lat":42.0617293,"lon":19.5059297,"tags":{"addr:postcode":"4001","amenity":"dentist","email":"adriadent@gmail.com","internet_access":"wlan","name":"Adriadent klinika dentare","name:en":"Adriadent Dental Clinic","opening_hours":"Mo-Fr 09:00-14:00, 16:00-19:00; Sa 09:00-13:00","phone":"00355692082491","website":"http://www.adriadent.al"}}}'::jsonb, 'cadd9430f316f0894c0523af4deafa626b52570075935449eb1954a9931085d4', 'Adriadent klinika dentare', 'adriadent klinika dentare', NULL, '4001', NULL, NULL, '4001', 'AL', 42.0617293, 19.5059297, '00355692082491', 'http://www.adriadent.al', 'adriadent@gmail.com', 'dental', ARRAY['dental']::text[], 0.86, 'loc:26338ece741c488b526e5c09aa9a726a8299d453df34b31a3ad5ccfd6a03e25b'),
('osm:node:11101240158', 'https://www.openstreetmap.org/node/11101240158', '{"provider":"openstreetmap","element":{"type":"node","id":11101240158,"lat":41.3332654,"lon":19.8418132,"tags":{"addr:floor":"1","amenity":"dentist","check_date":"2024-08-24","healthcare":"dentist","healthcare:speciality":"stomatology","internet_access":"no","level":"2","name":"Advanced Tirana Dental Studio","opening_hours":"Mo-Fr 09:00-20:00; Sa 09:00-13:00; Su off","payment:mastercard":"yes","payment:visa":"yes","source":"local knowledge","wheelchair":"yes"}}}'::jsonb, '159258d515dac5fe3c391af9d7c88170b744f248123faf22b26523533b596775', 'Advanced Tirana Dental Studio', 'advanced tirana dental studio', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3332654, 19.8418132, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:c4977c1558e9608018dae1a917dd349c50b5cc0f04090e6bfca2976c40707300'),
('osm:node:11479181785', 'https://www.openstreetmap.org/node/11479181785', '{"provider":"openstreetmap","element":{"type":"node","id":11479181785,"lat":41.3232625,"lon":19.8000604,"tags":{"amenity":"dentist","check_date":"2024-01-02","healthcare":"dentist","name":"Aesthetic & Dental Surgery \"Better Me\""}}}'::jsonb, '2e61420c158770fc882ef65dd029cf6c4e873f50e6da1edc563f7d0fdc3adb7e', 'Aesthetic & Dental Surgery "Better Me"', 'aesthetic dental surgery better me', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3232625, 19.8000604, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:cbe27c75308b6a303ea62a814f1a4f2715cabe01061851022bd9a8e12b45e4f2'),
('osm:way:730036393', 'https://www.openstreetmap.org/way/730036393', '{"provider":"openstreetmap","element":{"type":"way","id":730036393,"center":{"lat":41.3321986,"lon":19.4991788},"tags":{"addr:street":"Rruga e Durrësit","amenity":"pharmacy","building":"yes","name":"Agjensi Farmaceutike Rrashbull"}}}'::jsonb, '34da24e1c1fee8efa4c20f9dced240464be5aa6a2d838a2637d4afcdf1692e22', 'Agjensi Farmaceutike Rrashbull', 'agjensi farmaceutike rrashbull', 'Rruga e Durrësit', 'Rruga e Durrësit', NULL, NULL, NULL, 'AL', 41.3321986, 19.4991788, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:ab8defbd0c8e754fd084d3ab1ceae64d1745bb2b2da79aa0677610fb2cf76e2b'),
('osm:node:6694460923', 'https://www.openstreetmap.org/node/6694460923', '{"provider":"openstreetmap","element":{"type":"node","id":6694460923,"lat":41.3264744,"lon":19.8277215,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Aiden Dental"}}}'::jsonb, '49663f1fc0f882050df9653bc029bc0288e22f01f278026581c7bb3f1b1543d7', 'Aiden Dental', 'aiden dental', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3264744, 19.8277215, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:99eed60ea8836061ef34503774a02fb4b4de01a6d69eb3e012098a7b9c1c4def'),
('osm:node:11097024193', 'https://www.openstreetmap.org/node/11097024193', '{"provider":"openstreetmap","element":{"type":"node","id":11097024193,"lat":42.0671523,"lon":19.5114049,"tags":{"addr:city":"Shkodër","addr:postcode":"4001","addr:street":"Rruga Studenti","amenity":"dentist","healthcare":"dentist","name":"Ak Turk Dental"}}}'::jsonb, 'd1eca15755a88c95e702d621f5d38fdbd631ec2a0149e2493f48d5859342b26e', 'Ak Turk Dental', 'ak turk dental', 'Rruga Studenti', 'Rruga Studenti, Shkodër, 4001', 'Shkodër', NULL, '4001', 'AL', 42.0671523, 19.5114049, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:4196eba8d217af139552063c92dc7d3f90852a8b81af00ac997dc3903a0d598b'),
('osm:node:7017490494', 'https://www.openstreetmap.org/node/7017490494', '{"provider":"openstreetmap","element":{"type":"node","id":7017490494,"lat":40.7338577,"lon":19.5710526,"tags":{"amenity":"pharmacy","name":"Albi"}}}'::jsonb, '20086a2b55f918ce3a170cf35968df7bc382b61162d55ea56001dbe2aa6c196b', 'Albi', 'albi', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7338577, 19.5710526, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:c582910cfad560e4f910adce1e0d59c623fe2679be592f516e7acdf63ed3ac42'),
('osm:node:7021804239', 'https://www.openstreetmap.org/node/7021804239', '{"provider":"openstreetmap","element":{"type":"node","id":7021804239,"lat":40.7318341,"lon":19.5582014,"tags":{"amenity":"pharmacy","description":"Shperndares Farmaceutik","name":"Alçe SHPK"}}}'::jsonb, 'd9dd57abef6a41c2c63fc1aa5cc29509caaea01325ee29e412a868d15b8b4553', 'Alçe SHPK', 'al e shpk', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7318341, 19.5582014, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:21e5719caac0a6150739fa81b2b4d09e7b218c654026223ef177a75444bd8028'),
('osm:node:4539319987', 'https://www.openstreetmap.org/node/4539319987', '{"provider":"openstreetmap","element":{"type":"node","id":4539319987,"lat":42.0739742,"lon":19.5223625,"tags":{"amenity":"pharmacy","dispensing":"yes","name":"Alda"}}}'::jsonb, '3ab35b67c7e76eea9eafcdf1643351f20c12a829bbc00fe7720a5f58d7d9f3d8', 'Alda', 'alda', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0739742, 19.5223625, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:1788760305a31d63c50f82713d5a0c338e80e081b726b5a2bfe1eb78034ea2f5'),
('osm:node:9956381301', 'https://www.openstreetmap.org/node/9956381301', '{"provider":"openstreetmap","element":{"type":"node","id":9956381301,"lat":39.8741064,"lon":20.0112461,"tags":{"amenity":"doctors","healthcare":"doctor","healthcare:speciality":"gynaecology","name":"Aleks Pando"}}}'::jsonb, '19f0916e84cbfbbbc5c504d4480962b55188a7784240a9f8ec9aeaff2842c8dc', 'Aleks Pando', 'aleks pando', NULL, NULL, NULL, NULL, NULL, 'AL', 39.8741064, 20.0112461, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:1adddd6b0ecbae4abecdd9ec68ba3295222f96ca6e288c8868f7b58f06a1b7f3'),
('osm:node:12470982384', 'https://www.openstreetmap.org/node/12470982384', '{"provider":"openstreetmap","element":{"type":"node","id":12470982384,"lat":41.1158804,"lon":20.0840459,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Alla"}}}'::jsonb, '0202349c7ca4566c87ce9697a54ef4e21307d01f8dc4743fef7224f6b204325c', 'Alla', 'alla', NULL, NULL, NULL, NULL, NULL, 'AL', 41.1158804, 20.0840459, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:dee6942b432069da163cc9afdc92a5a4b3da31ca893413b8c3b42d69fb08f9ec'),
('osm:node:10885292770', 'https://www.openstreetmap.org/node/10885292770', '{"provider":"openstreetmap","element":{"type":"node","id":10885292770,"lat":41.3495213,"lon":19.7681865,"tags":{"addr:city":"Tirana","addr:street":"Rruga Ibrahim Uk Murataj","amenity":"dentist","healthcare":"dentist","name":"Allushi Dental Center"}}}'::jsonb, 'b7691228c6a8431fbf563cf230c9aa02ed1a15528a5a600da1b77c439858f7b4', 'Allushi Dental Center', 'allushi dental center', 'Rruga Ibrahim Uk Murataj', 'Rruga Ibrahim Uk Murataj, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3495213, 19.7681865, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:184869831ff550257eb7176173c38c668c31d5f5475993ab80099e2470066f35'),
('osm:node:3883777896', 'https://www.openstreetmap.org/node/3883777896', '{"provider":"openstreetmap","element":{"type":"node","id":3883777896,"lat":41.3357198,"lon":19.8158714,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Alma"}}}'::jsonb, '30e659f4cdd811ba1056b8d5f44b1f3d6960311c8c647279a526d44b9654a4eb', 'Alma', 'alma', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3357198, 19.8158714, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:305d6ff5e2109dbdc69eab48672523188a38a8578c173572591919a6ae4a5971'),
('osm:node:9200216323', 'https://www.openstreetmap.org/node/9200216323', '{"provider":"openstreetmap","element":{"type":"node","id":9200216323,"lat":40.6194757,"lon":20.7749793,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Alma"}}}'::jsonb, '54568c5203f4f5043603831d93df41efebdb8b5276b2e6bc48a05049ed7b3fe0', 'Alma', 'alma', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6194757, 20.7749793, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:ce0c0f80bb688abba7a6bd07e969aa1e9a40ad94eff3452bc081d2adcb277d80'),
('osm:way:325151856', 'https://www.openstreetmap.org/way/325151856', '{"provider":"openstreetmap","element":{"type":"way","id":325151856,"center":{"lat":42.0744595,"lon":19.5229826},"tags":{"addr:city":"Shkodër","addr:country":"AL","addr:housenumber":"18","addr:postcode":"4001","amenity":"clinic","building":"yes","building:levels":"1","name":"ALMED Laboratori Mjekësor","source":"bing;mapbox-satellite;digitalglobe;survey;knowledge;local-info","source_ref:url":"https://www.flickr.com/photos/openstreetmap-albania"}}}'::jsonb, '3b4af6b8c15d242806529a1d129b4a2615e8e912d8940cf109a9ffb44b1483c2', 'ALMED Laboratori Mjekësor', 'almed laboratori mjek sor', '18', '18, Shkodër, 4001', 'Shkodër', NULL, '4001', 'AL', 42.0744595, 19.5229826, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:99fc1330f39e251eaf7e6451c47199ebfd36bfd3048a582c74c335eb7812615c'),
('osm:node:11548230969', 'https://www.openstreetmap.org/node/11548230969', '{"provider":"openstreetmap","element":{"type":"node","id":11548230969,"lat":41.3217921,"lon":19.7958968,"tags":{"addr:city":"Tirana","amenity":"pharmacy","healthcare":"pharmacy","name":"Alpha Pharmacy"}}}'::jsonb, '4ad09d7e9252d4ec70a22320096a9e37b9c21e8c2cf82669439cedf1deb7f452', 'Alpha Pharmacy', 'alpha pharmacy', NULL, 'Tirana', 'Tirana', NULL, NULL, 'AL', 41.3217921, 19.7958968, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:8a4951838145f8daa22ce7e7e3e82914d9989cb7969b618701e12b655c7ddfc8'),
('osm:node:11335425272', 'https://www.openstreetmap.org/node/11335425272', '{"provider":"openstreetmap","element":{"type":"node","id":11335425272,"lat":41.3290865,"lon":19.8291111,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"AltaFarma"}}}'::jsonb, '6f447d1bd2127951df95d4c0e72a08f9b6ca17fb0ec8dcb5ae8308c81d53d9e6', 'AltaFarma', 'altafarma', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3290865, 19.8291111, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:c671d688181f999dc99d62b94c36245cd31b00d733e1c498baa17433149c8de5'),
('osm:node:6905101626', 'https://www.openstreetmap.org/node/6905101626', '{"provider":"openstreetmap","element":{"type":"node","id":6905101626,"lat":41.3359445,"lon":19.8175107,"tags":{"addr:city":"Tirana","addr:country":"AL","addr:street":"Rruga Reshit Petrela","amenity":"dentist","healthcare":"dentist","name":"Ama Dental"}}}'::jsonb, '6a50e9a05091851651af3a857516c34299734cd5a702b220e9a0a3099094c582', 'Ama Dental', 'ama dental', 'Rruga Reshit Petrela', 'Rruga Reshit Petrela, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3359445, 19.8175107, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:373423385a82bf9c06ace5a6c6843fcbc0b44cc5ef41e507ac223e88e3bd3328'),
('osm:node:6879852663', 'https://www.openstreetmap.org/node/6879852663', '{"provider":"openstreetmap","element":{"type":"node","id":6879852663,"lat":41.3538419,"lon":19.8303933,"tags":{"amenity":"dentist","name":"Amaris Dental Clinic"}}}'::jsonb, '4a31306acc3dfecc3329ebebdb466a9437049c1a3f05f0686ebfd46e9929c09f', 'Amaris Dental Clinic', 'amaris dental clinic', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3538419, 19.8303933, NULL, NULL, NULL, 'dental', ARRAY['dental', 'general_practitioner']::text[], 0.78, 'loc:02baad6e59a505070cb55a6d21e144da7d8c959711f50a57b2285a149a460007'),
('osm:node:5294672072', 'https://www.openstreetmap.org/node/5294672072', '{"provider":"openstreetmap","element":{"type":"node","id":5294672072,"lat":41.3208695,"lon":19.8303555,"tags":{"addr:city":"Tirana","addr:country":"AL","addr:postcode":"1000","addr:street":"Rruga Pjetër Budi","amenity":"pharmacy","healthcare":"pharmacy","name":"Amavita","payment:coins":"yes","payment:notes":"yes"}}}'::jsonb, '3f63a97080fd006e28209b1734f6e61c8543830332ca0e529ffa126a94d57620', 'Amavita', 'amavita', 'Rruga Pjetër Budi', 'Rruga Pjetër Budi, Tirana, 1000', 'Tirana', NULL, '1000', 'AL', 41.3208695, 19.8303555, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:18dcecf3910168acf542d54e1a571be7e927eeef1b75fbba40c1b3391d00dd64'),
('osm:node:4308134984', 'https://www.openstreetmap.org/node/4308134984', '{"provider":"openstreetmap","element":{"type":"node","id":4308134984,"lat":41.8628537,"lon":19.4301338,"tags":{"amenity":"doctors","name":"Ambulanca 24/7","phone":"+355672122650"}}}'::jsonb, '98539f297c33a6ac5be52bd8f2999305c65d3901ddddc4caf4b09665e0e2be97', 'Ambulanca 24/7', 'ambulanca 24 7', NULL, NULL, NULL, NULL, NULL, 'AL', 41.8628537, 19.4301338, '+355672122650', NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:b0729a2198f58597598df5f120848f025b0cd6cbf5d23b48fd572b66bfbb7a68'),
('osm:way:1312669997', 'https://www.openstreetmap.org/way/1312669997', '{"provider":"openstreetmap","element":{"type":"way","id":1312669997,"center":{"lat":41.2666408,"lon":19.7943573},"tags":{"addr:city":"Arbanë","amenity":"clinic","building":"yes","healthcare":"clinic","name":"Ambulanca Arbanë"}}}'::jsonb, 'b86788a7a2f839d6805fe87fd0d8240c65785dae9cee8eba142b8d84bf4d2979', 'Ambulanca Arbanë', 'ambulanca arban', NULL, 'Arbanë', 'Arbanë', NULL, NULL, 'AL', 41.2666408, 19.7943573, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:64e7732e988dd1a1146e9c7434e7b68b1cc69b31f6455bc05cc767ca42073ab9'),
('osm:way:233133163', 'https://www.openstreetmap.org/way/233133163', '{"provider":"openstreetmap","element":{"type":"way","id":233133163,"center":{"lat":40.0810216,"lon":20.1973116},"tags":{"amenity":"doctors","building":"yes","name":"Ambulanca Asim Zeneli","source:outline":"Bing Aerial Imagery"}}}'::jsonb, '3cce690b4e6a5ea4833c3332eaa3ffd9a6dc9447ca9af48688aaab593fdd4cf5', 'Ambulanca Asim Zeneli', 'ambulanca asim zeneli', NULL, NULL, NULL, NULL, NULL, 'AL', 40.0810216, 20.1973116, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:76ed9565130d33bfcbfc0f1a5c2ef03200bc6d035351ecd1fe567c4421164377'),
('osm:way:501031353', 'https://www.openstreetmap.org/way/501031353', '{"provider":"openstreetmap","element":{"type":"way","id":501031353,"center":{"lat":40.3610214,"lon":20.6710972},"tags":{"addr:city":"Bejkovë","addr:street":"Rruga e Bejkovës","amenity":"clinic","building":"school","name":"Ambulanca Bejkovë","opening_hours":"Mo-Sa 08:00-20:00"}}}'::jsonb, 'f1bca35ea698760257b1ad88a0db027907b92cf5c78572efc789b6a6ff5c9777', 'Ambulanca Bejkovë', 'ambulanca bejkov', 'Rruga e Bejkovës', 'Rruga e Bejkovës, Bejkovë', 'Bejkovë', NULL, NULL, 'AL', 40.3610214, 20.6710972, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:59db13eb2d9ecaecefbea6c2bf3f8ec17b51f6234893c98ba17e60c213689f7d'),
('osm:node:9149594881', 'https://www.openstreetmap.org/node/9149594881', '{"provider":"openstreetmap","element":{"type":"node","id":9149594881,"lat":40.6338263,"lon":19.8180878,"tags":{"addr:city":"Cfir","addr:street":"Rruga Cfir - Aranitas.","amenity":"hospital","healthcare":"hospital","name":"Ambulanca Cfir"}}}'::jsonb, 'd5c908e713f67873bee78df95a5c6c3ec4580d295dd163173541fdb84f0fc4f1', 'Ambulanca Cfir', 'ambulanca cfir', 'Rruga Cfir - Aranitas.', 'Rruga Cfir - Aranitas., Cfir', 'Cfir', NULL, NULL, 'AL', 40.6338263, 19.8180878, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:2a0acd75b50ca1d14311733dca88cc3243255be58440491fde9fb607b293d6f6'),
('osm:way:727877127', 'https://www.openstreetmap.org/way/727877127', '{"provider":"openstreetmap","element":{"type":"way","id":727877127,"center":{"lat":41.313873,"lon":19.8549624},"tags":{"addr:street":"Panorama e Liqenit","amenity":"clinic","building":"yes","healthcare":"clinic","name":"Ambulanca Çollak"}}}'::jsonb, '56a3d49fea23a2a6882fe3a0e5c116379d0ba66a3f5e28758e50ffb695ff827f', 'Ambulanca Çollak', 'ambulanca ollak', 'Panorama e Liqenit', 'Panorama e Liqenit', NULL, NULL, NULL, 'AL', 41.313873, 19.8549624, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:277f11bef1ad0fffa67f71561d35b3b63a6bdecea5a0340b2e2a5dfd6bce2147'),
('osm:way:1343727816', 'https://www.openstreetmap.org/way/1343727816', '{"provider":"openstreetmap","element":{"type":"way","id":1343727816,"center":{"lat":41.3711811,"lon":19.7563435},"tags":{"addr:city":"Kamëz","amenity":"clinic","building":"yes","healthcare":"clinic","name":"Ambulanca Frutikulturë","operator":"Qarku Tirana","operator:type":"public"}}}'::jsonb, 'b53afc49a6a06830b352cc610ad3e013c3269f97e7576181a85d5880a2a812ef', 'Ambulanca Frutikulturë', 'ambulanca frutikultur', NULL, 'Kamëz', 'Kamëz', NULL, NULL, 'AL', 41.3711811, 19.7563435, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:e0aa965a7dcbce37fa23a40880c12ac1519cc9db59426c673d6335190aca5f2f'),
('osm:way:233133164', 'https://www.openstreetmap.org/way/233133164', '{"provider":"openstreetmap","element":{"type":"way","id":233133164,"center":{"lat":40.10087,"lon":20.2044565},"tags":{"amenity":"doctors","building":"yes","name":"Ambulanca Krinë","source:outline":"Bing Aerial Imagery"}}}'::jsonb, 'aa36645d225ac3497c39e38363a96ccc273a6f3c3fa56db46176aea3ed32d462', 'Ambulanca Krinë', 'ambulanca krin', NULL, NULL, NULL, NULL, NULL, 'AL', 40.10087, 20.2044565, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:eacc66c86b30c2e947feeea09678130e3ad6f850f7515bd4ede6ec98b2837f3e'),
('osm:way:684824049', 'https://www.openstreetmap.org/way/684824049', '{"provider":"openstreetmap","element":{"type":"way","id":684824049,"center":{"lat":40.6106932,"lon":20.7771932},"tags":{"amenity":"clinic","building":"yes","healthcare":"clinic","name":"Ambulanca Lagija 5, 16"}}}'::jsonb, 'af013389bed4d4fac78e257504494c27a025c2a3f6f9399dcca22fbb26c92cfb', 'Ambulanca Lagija 5, 16', 'ambulanca lagija 5 16', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6106932, 20.7771932, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:976e294e131073109834dd695199c27de7d663ff7c91e0176ef4856779f7110c'),
('osm:way:1238643381', 'https://www.openstreetmap.org/way/1238643381', '{"provider":"openstreetmap","element":{"type":"way","id":1238643381,"center":{"lat":41.3383571,"lon":19.7629435},"tags":{"addr:city":"Mëzez","addr:street":"Rruga Kasem Shima","amenity":"clinic","building":"yes","healthcare":"clinic","name":"Ambulanca Mëzez Kodër"}}}'::jsonb, 'dd84d10dd84a2c06147427e93394cb8ff430814756f17d6cbf25f7163e88c206', 'Ambulanca Mëzez Kodër', 'ambulanca m zez kod r', 'Rruga Kasem Shima', 'Rruga Kasem Shima, Mëzez', 'Mëzez', NULL, NULL, 'AL', 41.3383571, 19.7629435, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:7220be09a62c9d8cef54cd459322b73a84b1437e8d68cee4042ce746d48d04e5'),
('osm:node:3983915840', 'https://www.openstreetmap.org/node/3983915840', '{"provider":"openstreetmap","element":{"type":"node","id":3983915840,"lat":42.0730792,"lon":19.515046,"tags":{"amenity":"doctors","name":"Ambulanca për Fëmijë","source":"bing;survey;gps","source_ref:url":"https://www.flickr.com/photos/134902422@N04/map?&fLat=41.9559&fLon=19.4337&zl=11&order_by=recent","wheelchair":"limited"}}}'::jsonb, '769c12e51badbcd22710ff7e371ea357dbc5f9e1891fc4b3b71496dab0903068', 'Ambulanca për Fëmijë', 'ambulanca p r f mij', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0730792, 19.515046, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:e58b8b45fdb0ebda7ee8d78d3046cf5234a26877a0fa7d450b7f5dc7fb80bd2c'),
('osm:node:4742117923', 'https://www.openstreetmap.org/node/4742117923', '{"provider":"openstreetmap","element":{"type":"node","id":4742117923,"lat":40.7725529,"lon":19.8778813,"tags":{"addr:street":"Rruga \"Trifon Goga\"","amenity":"hospital","healthcare":"hospital","name":"Ambulanca Qendrore \"Dimal\"","name:en":"Central Ambulance of Dimal","name:sq":"Ambulanca Qendrore \"Dimal\""}}}'::jsonb, 'b6df1bd18a053ff13e8a5f4199156c1d430c08f9db1bcd3606d893c3dac9e3e0', 'Ambulanca Qendrore "Dimal"', 'ambulanca qendrore dimal', 'Rruga "Trifon Goga"', 'Rruga "Trifon Goga"', NULL, NULL, NULL, 'AL', 40.7725529, 19.8778813, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:328b0c344c7a3e7926571fec3c407d8401f9d0565dc673f86038def2065de2f2'),
('osm:way:1176659269', 'https://www.openstreetmap.org/way/1176659269', '{"provider":"openstreetmap","element":{"type":"way","id":1176659269,"center":{"lat":41.3264147,"lon":19.771914},"tags":{"addr:city":"Tirana","addr:street":"Rruga Manzurane","amenity":"clinic","building":"yes","healthcare":"clinic","name":"Ambulanca Yzberisht"}}}'::jsonb, '0ab8978a9536cf2678cb2c5b1cec94dfb33094c36d99ae201db50ac51640d358', 'Ambulanca Yzberisht', 'ambulanca yzberisht', 'Rruga Manzurane', 'Rruga Manzurane, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3264147, 19.771914, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:05cb334eccd843be08ba3179e191ffa2f051f439f9efbffbef7d20773cba5239'),
('osm:node:4876347124', 'https://www.openstreetmap.org/node/4876347124', '{"provider":"openstreetmap","element":{"type":"node","id":4876347124,"lat":41.4810323,"lon":19.7218373,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Ambulance","name:en":"Hospital","name:sq":"Ambulance","opening_hours":"24/7"}}}'::jsonb, '93ee706d73dd9f71ed2884c9a1c12d07c3215470e0af66c3dcd7f2a219dd209b', 'Ambulance', 'ambulance', NULL, NULL, NULL, NULL, NULL, 'AL', 41.4810323, 19.7218373, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:dd74497a744359bb59f7178cb5c0dfeef36c21dce7c4b8ef956ff4050fe510c5'),
('osm:node:3387400124', 'https://www.openstreetmap.org/node/3387400124', '{"provider":"openstreetmap","element":{"type":"node","id":3387400124,"lat":42.0747285,"lon":19.524986,"tags":{"amenity":"doctors","name":"Ambulatori","wheelchair":"limited"}}}'::jsonb, '1b5c17ff1c814c6fc5cb45f230bbca834f58bbbb4acc6fd6ca9d1f1aee0206a2', 'Ambulatori', 'ambulatori', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0747285, 19.524986, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:ff739781246b1054ef6552b1edce21c7073bf323caa3c72107d2b6a81b25d424'),
('osm:node:3387400125', 'https://www.openstreetmap.org/node/3387400125', '{"provider":"openstreetmap","element":{"type":"node","id":3387400125,"lat":42.0749333,"lon":19.5247146,"tags":{"amenity":"doctors","name":"Ambulatori","wheelchair":"limited"}}}'::jsonb, 'a75f25b043425ee4bb22902dd23501356ce96c00eec07f92dfc77dde2c955b1e', 'Ambulatori', 'ambulatori', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0749333, 19.5247146, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:3c877ddc1f1416c0ecada9533ee2a5def7e99697091d2df35015e7bdf08ed603'),
('osm:node:9844769354', 'https://www.openstreetmap.org/node/9844769354', '{"provider":"openstreetmap","element":{"type":"node","id":9844769354,"lat":40.6125403,"lon":20.7838836,"tags":{"addr:street":"Rruga Partizani","amenity":"clinic","healthcare":"clinic","healthcare:speciality":"allergology;dermatology;paediatrics;gynaecology","name":"American Medical Center Korçë","phone":"+355 68 600 6999"}}}'::jsonb, '14e3ca3bd9970b409374ec8bb22443c9f66dfad1939698e576ba066aaca9e0b2', 'American Medical Center Korçë', 'american medical center kor', 'Rruga Partizani', 'Rruga Partizani', NULL, NULL, NULL, 'AL', 40.6125403, 20.7838836, '+355 68 600 6999', NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:9c0f1b017ea251282018ee800481e3bcbcd2a8a357af8683bbc024c0d191e96e'),
('osm:node:6365010157', 'https://www.openstreetmap.org/node/6365010157', '{"provider":"openstreetmap","element":{"type":"node","id":6365010157,"lat":41.3528105,"lon":19.7698891,"tags":{"addr:city":"Tirana","addr:street":"Rruga Princ Vidi","amenity":"pharmacy","healthcare":"pharmacy","name":"Ami"}}}'::jsonb, '60026920726a622eec6efa476b556d52fced48aecdab0553b47e99a939e1564e', 'Ami', 'ami', 'Rruga Princ Vidi', 'Rruga Princ Vidi, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3528105, 19.7698891, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:b9e8b210bbf4fd42972f677c5cfec2a7289d789bd61de73ce742120390d9f833'),
('osm:node:10049605763', 'https://www.openstreetmap.org/node/10049605763', '{"provider":"openstreetmap","element":{"type":"node","id":10049605763,"lat":41.0097897,"lon":20.0102545,"tags":{"amenity":"pharmacy","name":"Ana2"}}}'::jsonb, 'a3dfcf6d6da2aabd950ecccca98f314c8605928c523447b348238cd3eca07359', 'Ana2', 'ana2', NULL, NULL, NULL, NULL, NULL, 'AL', 41.0097897, 20.0102545, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:5e3c2ad639d7d382d34b9c0dc346bffc3db8e5e1ef0cbecc151a5500cc26d13a'),
('osm:node:12912379399', 'https://www.openstreetmap.org/node/12912379399', '{"provider":"openstreetmap","element":{"type":"node","id":12912379399,"lat":40.6137636,"lon":20.7814551,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Andi","wheelchair":"no"}}}'::jsonb, '9ad195635f15aa7ffbe0b8c5405853faaa5ae762706cf97f142bd9b748ec73f5', 'Andi', 'andi', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6137636, 20.7814551, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:da0170252a34b6ba32624961be5a32866b7cf694ab0c8e5a9aed2eceb00b52bb'),
('osm:node:6377776306', 'https://www.openstreetmap.org/node/6377776306', '{"provider":"openstreetmap","element":{"type":"node","id":6377776306,"lat":40.6144168,"lon":20.7784859,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Andi Kacidhja"}}}'::jsonb, '422679007c5ac38e289d5087d51afe0fc787ec3521820e074ce40612701a87fe', 'Andi Kacidhja', 'andi kacidhja', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6144168, 20.7784859, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:2af801ef9623957207765916ee30c91746213f26b5f9404a98bc7ffbee390e6e'),
('osm:node:6855093993', 'https://www.openstreetmap.org/node/6855093993', '{"provider":"openstreetmap","element":{"type":"node","id":6855093993,"lat":41.3144636,"lon":19.4748795,"tags":{"amenity":"pharmacy","check_date":"2024-04-24","healthcare":"pharmacy","name":"Ansi Farma"}}}'::jsonb, '804f17ca3c36c757ff71ee0de71d39dd8d1329ba5a1552497b87dee0633cefab', 'Ansi Farma', 'ansi farma', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3144636, 19.4748795, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:2751e4c51e1750f3367b266efaa41ab9929ebc8bdae8613deb96943ff739e58a'),
('osm:node:11843449186', 'https://www.openstreetmap.org/node/11843449186', '{"provider":"openstreetmap","element":{"type":"node","id":11843449186,"lat":41.3143907,"lon":19.4749639,"tags":{"check_date":"2024-04-24","healthcare":"laboratory","name":"Ansi-lab"}}}'::jsonb, 'ec3375242a9dd7abfac88816555e434b519d4d480cb7d54f5eaeaf0969a9386e', 'Ansi-lab', 'ansi lab', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3143907, 19.4749639, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:2db318e7acdab1575ccd309f14fa148ca15300ebe849c0ddf4756be14fadf725'),
('osm:node:6804088703', 'https://www.openstreetmap.org/node/6804088703', '{"provider":"openstreetmap","element":{"type":"node","id":6804088703,"lat":41.3429145,"lon":19.8459734,"tags":{"addr:city":"Tirana","amenity":"dentist","healthcare":"dentist","level":"1","name":"Arbes Dental"}}}'::jsonb, '52e36057ab8b1555d504022041da918f6b5c21d9bdb72335a9159c345cfa2ada', 'Arbes Dental', 'arbes dental', NULL, 'Tirana', 'Tirana', NULL, NULL, 'AL', 41.3429145, 19.8459734, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:ea1b4d887e4d5216447258ec1703f8a022f8806fa5068912b28c2172862abb34');

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
