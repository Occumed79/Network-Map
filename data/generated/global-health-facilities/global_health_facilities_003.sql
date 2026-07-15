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
('osm:node:10188951233', 'https://www.openstreetmap.org/node/10188951233', '{"provider":"openstreetmap","element":{"type":"node","id":10188951233,"lat":40.6189659,"lon":20.7780574,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Dea Dent","phone":"+355 68 424 6874"}}}'::jsonb, 'd09a6ee4c28a572b2101f29e7a2c5e03671ce30679743cc73782d30938fc1146', 'Dea Dent', 'dea dent', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6189659, 20.7780574, '+355 68 424 6874', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:4080f8ba2cd01879e7d725bb39b199fd4efcad67efc10689e35ab5ad29176388'),
('osm:node:6804135602', 'https://www.openstreetmap.org/node/6804135602', '{"provider":"openstreetmap","element":{"type":"node","id":6804135602,"lat":41.3453821,"lon":19.8590825,"tags":{"addr:city":"Tirana","addr:street":"Rruga Sotir Caci","amenity":"pharmacy","healthcare":"pharmacy","name":"DEA-Farm"}}}'::jsonb, '747b1c131dfa605d74e3fd18ef508873422f0dd40e4c5953af85b12ca32d267a', 'DEA-Farm', 'dea farm', 'Rruga Sotir Caci', 'Rruga Sotir Caci, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3453821, 19.8590825, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:a7bf5fe2e711f365a651f401291d7d533f93b6082dcf9f24f445355372c62e13'),
('osm:node:4539321059', 'https://www.openstreetmap.org/node/4539321059', '{"provider":"openstreetmap","element":{"type":"node","id":4539321059,"lat":42.074611,"lon":19.5232708,"tags":{"amenity":"clinic","name":"Delta Diagnostics"}}}'::jsonb, '80ea38c2ccd8014a8b5576c5b6ddd9a0ca94a1aba1f3146fd2641ae7b6bb0e90', 'Delta Diagnostics', 'delta diagnostics', NULL, NULL, NULL, NULL, NULL, 'AL', 42.074611, 19.5232708, NULL, NULL, NULL, 'lab', ARRAY['lab', 'general_practitioner']::text[], 0.78, 'loc:0b0473bfaab039fd066d98a5dcde55315dba44c70c221933acf07e510e9c97ef'),
('osm:node:3820715666', 'https://www.openstreetmap.org/node/3820715666', '{"provider":"openstreetmap","element":{"type":"node","id":3820715666,"lat":42.0732316,"lon":19.5207908,"tags":{"amenity":"dentist","name":"Deni Dent","opening_hours":"Mo-Su 07:00-15:00","payment:coins":"yes","payment:credit_cards":"no","payment:cryptocurrencies":"no","payment:debit_cards":"no","payment:electronic_purses":"no","payment:notes":"yes","source":"bing;survey;gps","source_ref:url":"https://www.flickr.com/photos/134902422@N04/map?&fLat=41.9559&fLon=19.4337&zl=11&order_by=recent","wheelchair":"limited"}}}'::jsonb, '93b591817d155f96beed2ad9ac1d30875cdeb2321718efc05cee330f3f2115c5', 'Deni Dent', 'deni dent', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0732316, 19.5207908, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:848af3d60799b3f245d041701b08173caf33b856ec539e39703f58743734cd64'),
('osm:node:3869797964', 'https://www.openstreetmap.org/node/3869797964', '{"provider":"openstreetmap","element":{"type":"node","id":3869797964,"lat":41.1188196,"lon":20.0827374,"tags":{"addr:city":"Elbasan","addr:housenumber":"500/2","addr:street":"Rruga 28 Nëntori","amenity":"dentist","healthcare":"dentist","name":"Dental Art","opening_hours":"9:00 - 19:00","phone":"+355 692515024"}}}'::jsonb, '79fc21b963fefa479e2a20ebdeb7563dc2f94b1df15f37be17f79cd8ababcbe5', 'Dental Art', 'dental art', '500/2 Rruga 28 Nëntori', '500/2 Rruga 28 Nëntori, Elbasan', 'Elbasan', NULL, NULL, 'AL', 41.1188196, 20.0827374, '+355 692515024', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:2b64d8c1e7728d51393b2fdb7a3f9174cd256fdebe2a3cf86d2ff76988403633'),
('osm:node:13011361444', 'https://www.openstreetmap.org/node/13011361444', '{"provider":"openstreetmap","element":{"type":"node","id":13011361444,"lat":40.5012964,"lon":20.2285181,"tags":{"addr:housenumber":"51","addr:street":"Rruga Lace Backa","amenity":"dentist","check_date":"2025-07-27","healthcare":"dentist","internet_access":"no","name":"Dental Clinic","name:sq":"Klinike Dentare Kleant Dervishi","payment:cards":"no","payment:cash":"yes","payment:credit_cards":"no","payment:debit_cards":"no","wheelchair":"limited"}}}'::jsonb, 'b73c76e491df8007bd0ecf5366566a6e8cd1202f1307fb8e14a2d8f6f4c7983b', 'Dental Clinic', 'dental clinic', '51 Rruga Lace Backa', '51 Rruga Lace Backa', NULL, NULL, NULL, 'AL', 40.5012964, 20.2285181, NULL, NULL, NULL, 'dental', ARRAY['dental', 'general_practitioner']::text[], 0.86, 'loc:1f29b113bdb2c5cc8a395e1c7b6b70217b463869b12e85680d1c54841bec9d3b'),
('osm:node:13881451485', 'https://www.openstreetmap.org/node/13881451485', '{"provider":"openstreetmap","element":{"type":"node","id":13881451485,"lat":42.3597365,"lon":20.0741613,"tags":{"addr:floor":"G","amenity":"dentist","check_date":"2026-05-26","healthcare":"dentist","level":"0","name":"Dental Medic"}}}'::jsonb, 'ffa248d2d379633abbb2e30ca441f9ffc6413053a89a21355cb7196ab9db879a', 'Dental Medic', 'dental medic', NULL, NULL, NULL, NULL, NULL, 'AL', 42.3597365, 20.0741613, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:6d3424b63d16d35bc46941e265a11c0c4b999c577b2e1e84e43cc451703468cb'),
('osm:node:6864464608', 'https://www.openstreetmap.org/node/6864464608', '{"provider":"openstreetmap","element":{"type":"node","id":6864464608,"lat":41.3313615,"lon":19.820484,"tags":{"addr:street":"Rruga e Barrikadave","amenity":"dentist","healthcare":"dentist","name":"Dental Pro"}}}'::jsonb, 'bf49cf8b1d8c50ab89490e92e0e05fee78a90734194b8892d3dafb131a3b85dd', 'Dental Pro', 'dental pro', 'Rruga e Barrikadave', 'Rruga e Barrikadave', NULL, NULL, NULL, 'AL', 41.3313615, 19.820484, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:fa7ccde86e3d20c21b787a407dbacb4185ed1c2d392d279c12f4e3d500068fcf'),
('osm:node:4539679884', 'https://www.openstreetmap.org/node/4539679884', '{"provider":"openstreetmap","element":{"type":"node","id":4539679884,"lat":41.3200058,"lon":19.8236337,"tags":{"addr:city":"Tirana","addr:street":"Asim Zeneli","amenity":"dentist","healthcare":"dentist","name":"Dentalux"}}}'::jsonb, '99eccf1fd8f53a089813fc4fe74e29f2a8efc82c9c2420f9d2bb658f702896d9', 'Dentalux', 'dentalux', 'Asim Zeneli', 'Asim Zeneli, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3200058, 19.8236337, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:be1d550ff7ad1e61da2f8df35405436ce674f8f6dad9c0b824e4fb9a0c1207b4'),
('osm:node:13830567210', 'https://www.openstreetmap.org/node/13830567210', '{"provider":"openstreetmap","element":{"type":"node","id":13830567210,"lat":40.937729,"lon":19.7069844,"tags":{"amenity":"dentist","healthcare":"dentist","name":"DentalVita"}}}'::jsonb, '9bf96522ebb2a582b4cf3ccf2cf6b07be19e7e92d669c06d50644c1b1c60685f', 'DentalVita', 'dentalvita', NULL, NULL, NULL, NULL, NULL, 'AL', 40.937729, 19.7069844, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:137b3658dc6645336e701bc494cab836416136ea5d03620f4e053f2a8ca2a04f'),
('osm:node:6862221188', 'https://www.openstreetmap.org/node/6862221188', '{"provider":"openstreetmap","element":{"type":"node","id":6862221188,"lat":42.1975053,"lon":20.4130165,"tags":{"amenity":"dentist","name":"Dentist"}}}'::jsonb, '08eaf60b31b5bfefe94f196f7689652273e5dcdab2513751db5ff6402d2101e9', 'Dentist', 'dentist', NULL, NULL, NULL, NULL, NULL, 'AL', 42.1975053, 20.4130165, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:505fe2d3f1b2f33d69d49e1803ae684b29b6216aaf7bd7e5bdb444e1f39c6f9e'),
('osm:node:3983898883', 'https://www.openstreetmap.org/node/3983898883', '{"provider":"openstreetmap","element":{"type":"node","id":3983898883,"lat":42.0745926,"lon":19.5150194,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Dentist Besnik Llukaçej","payment:coins":"yes","payment:credit_cards":"no","payment:cryptocurrencies":"no","payment:debit_cards":"no","payment:electronic_purses":"no","payment:notes":"yes","smoking":"outside","source":"bing","source_ref:url":"https://www.flickr.com/photos/134902422@N04/map?&fLat=41.9559&fLon=19.4337&zl=11&order_by=recent","wheelchair":"limited"}}}'::jsonb, 'a3662643152aacde4fc4fd7486c19d59afa5b7eae521cdf93075ab45d6b12143', 'Dentist Besnik Llukaçej', 'dentist besnik lluka ej', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0745926, 19.5150194, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:8229a1ba30cc4ccddf13a1acfd66a802700c3bd48e2c298073c789e17980f95c'),
('osm:node:7835963274', 'https://www.openstreetmap.org/node/7835963274', '{"provider":"openstreetmap","element":{"type":"node","id":7835963274,"lat":41.3279302,"lon":19.8151047,"tags":{"addr:city":"Tirana","addr:housenumber":"19","addr:postcode":"1001","addr:street":"Rruga e Kavajës","amenity":"dentist","description":"Rezervoni dentist ne tirane konsultën tuaj në internet për të mësuar më shumë rreth opsioneve të zëvendësimit të dhëmbëve. Atmosfera klinike dentare ne tirane jonë e lehtë dhe në modë i ndihmon pacientët tanë të ndjehen të qetë kur kujdesemi për nevojat e","email":"dentistnetirane@gmail.com","healthcare":"dentist","healthcare:speciality":"dentist;dental;dental_oral_maxillo_facial_surgery;dentistry;denturist;paediatric_dentistry;clinic;orthodontics","image":"http://dentistnetirane.epizy.com/images/dental-clinic.jpg","name":"Dentist ne Tirane","opening_hours":"Mo-Fr 09:00-17:00","operator":"Dentist Tirane","phone":"+355 69 411 8665","website":"http://dentistnetirane.epizy.com/"}}}'::jsonb, 'e12cf380e4a56df8e00792dbfff77716cafb1e8c9551fa5a5385071b11fc0ae2', 'Dentist ne Tirane', 'dentist ne tirane', '19 Rruga e Kavajës', '19 Rruga e Kavajës, Tirana, 1001', 'Tirana', NULL, '1001', 'AL', 41.3279302, 19.8151047, '+355 69 411 8665', 'http://dentistnetirane.epizy.com/', 'dentistnetirane@gmail.com', 'dental', ARRAY['dental', 'general_practitioner', 'specialist']::text[], 0.86, 'loc:b2a451f6011907015478838f6eef8d7088cce024655c6c253d401bfc39f0f4c0'),
('osm:node:2423185876', 'https://www.openstreetmap.org/node/2423185876', '{"provider":"openstreetmap","element":{"type":"node","id":2423185876,"lat":40.2317269,"lon":20.3543202,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Dentist Piro Dede"}}}'::jsonb, '5d3a3ff5682d80626a8085ab6c6fc26cea85398d4d05759edf2ade2b0ccfbcd1', 'Dentist Piro Dede', 'dentist piro dede', NULL, NULL, NULL, NULL, NULL, 'AL', 40.2317269, 20.3543202, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:abbddbdb355cb9cb2342a4d5b1f86cd0f9a328d2b5fdd303caf1800b505509ec'),
('osm:node:9153949111', 'https://www.openstreetmap.org/node/9153949111', '{"provider":"openstreetmap","element":{"type":"node","id":9153949111,"lat":41.1103091,"lon":20.079365,"tags":{"addr:city":"Elbasan","amenity":"dentist","healthcare":"dentist","name":"DentIstanbul"}}}'::jsonb, '68eefb157fb934e831b5a28cd6aacd9b557e43d6edba2f1721c79a39b55be8ea', 'DentIstanbul', 'dentistanbul', NULL, 'Elbasan', 'Elbasan', NULL, NULL, 'AL', 41.1103091, 20.079365, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:5ae9fd989ea227c46048017485ff2a2232611ec3cbd203fba2e998b11fe1dd8c'),
('osm:node:12859626813', 'https://www.openstreetmap.org/node/12859626813', '{"provider":"openstreetmap","element":{"type":"node","id":12859626813,"lat":41.3215154,"lon":19.8139183,"tags":{"addr:city":"Tiranë","addr:housenumber":"30","addr:postcode":"1019","addr:street":"Rruga Sami Frashëri","amenity":"hospital","healthcare":"hospital","healthcare:speciality":"general;dental_oral_maxillo_facial_surgery;dentist","name":"Dentisti a Tirana"}}}'::jsonb, '272f30763b4fb379038b2918a2d9a14aac19e326ede81680e1b6e7e241b09077', 'Dentisti a Tirana', 'dentisti a tirana', '30 Rruga Sami Frashëri', '30 Rruga Sami Frashëri, Tiranë, 1019', 'Tiranë', NULL, '1019', 'AL', 41.3215154, 19.8139183, NULL, NULL, NULL, 'dental', ARRAY['dental', 'hospital']::text[], 0.86, 'loc:edf60f6ff1db435fdc144667c3dddd7a9515c089b3bcb6c1ea4ca56e41fe0af0'),
('osm:node:13938507216', 'https://www.openstreetmap.org/node/13938507216', '{"provider":"openstreetmap","element":{"type":"node","id":13938507216,"lat":41.3197465,"lon":19.8175999,"tags":{"addr:floor":"G","amenity":"doctors","check_date":"2026-06-14","healthcare":"doctor","healthcare:speciality":"dermatology","level":"0","name":"Derma Center by Healtcare Project"}}}'::jsonb, '687ffe9c0c90841949e19bcb0c13f18912deef1d8edaf3eef8830a0ccf63be00', 'Derma Center by Healtcare Project', 'derma center by healtcare project', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3197465, 19.8175999, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:baf4bcc88da00ff28ea6c65892ae92765e0b740462b9fb46248b982b7cd1bb41'),
('osm:way:1210635429', 'https://www.openstreetmap.org/way/1210635429', '{"provider":"openstreetmap","element":{"type":"way","id":1210635429,"center":{"lat":41.3327488,"lon":19.8308653},"tags":{"addr:city":"Tirana","addr:street":"Rruga Derhemi","amenity":"doctors","building":"yes","healthcare":"doctor","healthcare:speciality":"plastic_surgery","name":"Dermolife","website":"https://dermolife.al/"}}}'::jsonb, 'd91d418115c8b57c053d49ebf7acffeb4a0c10faaa8ee408fe533d1a66405e00', 'Dermolife', 'dermolife', 'Rruga Derhemi', 'Rruga Derhemi, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3327488, 19.8308653, NULL, 'https://dermolife.al/', NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:2a0127428485edcd3800b15be40507c71f999861f3782d8df4e98da4e95c7bda'),
('osm:node:6438906295', 'https://www.openstreetmap.org/node/6438906295', '{"provider":"openstreetmap","element":{"type":"node","id":6438906295,"lat":40.6237248,"lon":20.9867278,"tags":{"amenity":"pharmacy","name":"Devolli","opening_hours":"Mo-Sa 09:00-17:00","wheelchair":"limited"}}}'::jsonb, '6db8fe19be11539f7cbf363979905437aafe0a306bf9e644e80960e597481301', 'Devolli', 'devolli', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6237248, 20.9867278, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:e8cbfe29ff3b55de321357e90e96ce82c1eab4e84096f140fe402651377c214c'),
('osm:node:3883792399', 'https://www.openstreetmap.org/node/3883792399', '{"provider":"openstreetmap","element":{"type":"node","id":3883792399,"lat":41.326121,"lon":19.8036474,"tags":{"addr:street":"Rruga e Kavajës","amenity":"hospital","emergency":"no","healthcare":"hospital","name":"Diamond Dental"}}}'::jsonb, 'c046909275f7de161c27e95edb4e6acf0dbf894d7e1b539341d289457c747343', 'Diamond Dental', 'diamond dental', 'Rruga e Kavajës', 'Rruga e Kavajës', NULL, NULL, NULL, 'AL', 41.326121, 19.8036474, NULL, NULL, NULL, 'dental', ARRAY['dental', 'hospital']::text[], 0.86, 'loc:c4693e3ca23980faf51f16760eef6ea1d54748214962778b88d94cda7ce4a2e9'),
('osm:node:9153958628', 'https://www.openstreetmap.org/node/9153958628', '{"provider":"openstreetmap","element":{"type":"node","id":9153958628,"lat":41.1146424,"lon":20.086586,"tags":{"amenity":"pharmacy","contact:facebook":"https://www.facebook.com/farmaci.dite.e.nate/","dispensing":"yes","drive_through":"no","email":"info@ditenate.al","healthcare":"pharmacy","name":"Dite e Nate","opening_hours":"Mo-Sa 09:00-19:00","phone":"067 733 3777","website":"https://www.ditenate.al/","wheelchair":"yes"}}}'::jsonb, '8505340dc9a1b9fd92b8f4a8eb3948ed555a69f0593374c2fabdea78aeb18ae6', 'Dite e Nate', 'dite e nate', NULL, NULL, NULL, NULL, NULL, 'AL', 41.1146424, 20.086586, '067 733 3777', 'https://www.ditenate.al/', 'info@ditenate.al', 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:f9cd9144697932f4bbbfa2b9e675ddf5c1b6f19f6f6709861589d1dd93700ed5'),
('osm:node:11479181777', 'https://www.openstreetmap.org/node/11479181777', '{"provider":"openstreetmap","element":{"type":"node","id":11479181777,"lat":41.3257722,"lon":19.804069,"tags":{"amenity":"pharmacy","check_date":"2024-01-04","healthcare":"pharmacy","name":"Ditë e Natë"}}}'::jsonb, 'd84f57537e7e1b113a55e1ad19dd4777738d6ebe84537ce4668fb59a41ab2425', 'Ditë e Natë', 'dit e nat', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3257722, 19.804069, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:6ef394a4ede5ce0368efabfb67ca9a1a940acbd3a8e940186b818917c2bc1fe8'),
('osm:node:12463321413', 'https://www.openstreetmap.org/node/12463321413', '{"provider":"openstreetmap","element":{"type":"node","id":12463321413,"lat":41.3406414,"lon":19.844515,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Ditë e Natë"}}}'::jsonb, '4d6b60f56c9afc96a01bc53a0d2c14f5684d0e4d3beebb985bfd227cde503515', 'Ditë e Natë', 'dit e nat', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3406414, 19.844515, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:c042cb69c78e29ac20d7d0eaabe8f327fc885322fbfd8d0e01ce9cadf88b0838'),
('osm:node:9124938830', 'https://www.openstreetmap.org/node/9124938830', '{"provider":"openstreetmap","element":{"type":"node","id":9124938830,"lat":41.3331397,"lon":19.8229965,"tags":{"addr:city":"Tirana","amenity":"pharmacy","healthcare":"pharmacy","name":"Ditë e Natë"}}}'::jsonb, 'e35161a9f77708b529f8dd3e9962fc987ba84567ffbc694d54c942427aeb2256', 'Ditë e Natë', 'dit e nat', NULL, 'Tirana', 'Tirana', NULL, NULL, 'AL', 41.3331397, 19.8229965, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:dc95f98917343fa00387108d4b67db30fcbb8de6fd4d69c3bdcb946106f4e036'),
('osm:node:9128749319', 'https://www.openstreetmap.org/node/9128749319', '{"provider":"openstreetmap","element":{"type":"node","id":9128749319,"lat":41.3217766,"lon":19.8109979,"tags":{"addr:floor":"G","check_date":"2026-06-24","healthcare":"pharmacy","level":"0","name":"Ditë e Natë","shop":"chemist"}}}'::jsonb, '23b3dbcf8300b92cecf72bcaffe96c299649b4ab725e4ed876034d4e516eef79', 'Ditë e Natë', 'dit e nat', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3217766, 19.8109979, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:7efaf8978d12f30b59c66fcec72a58b1a7ebfd3c884abc0d2e3f9557c9c76832'),
('osm:node:9826047310', 'https://www.openstreetmap.org/node/9826047310', '{"provider":"openstreetmap","element":{"type":"node","id":9826047310,"lat":40.6191942,"lon":20.7777994,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Ditë e Natë","opening_hours":"Mo-Su 07:00-22:00","website":"http://www.ditenate.al","wheelchair":"yes"}}}'::jsonb, '108a3fa1177894d88b2903cc239efa3d607b5f3efe290b570ffb038d0caabc34', 'Ditë e Natë', 'dit e nat', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6191942, 20.7777994, NULL, 'http://www.ditenate.al', NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:355e110d90d80488275677c769ba192bb91de8f5cc600d481000f3b9e30ee3fa'),
('osm:node:2616682892', 'https://www.openstreetmap.org/node/2616682892', '{"provider":"openstreetmap","element":{"type":"node","id":2616682892,"lat":41.3397214,"lon":19.8323563,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Djegia - Plastika, Mjekësia Interne & HTA","phone":"+35542349308;+35542349515","wheelchair":"yes"}}}'::jsonb, '8a6d0320d797fed3303353474a8b75fca2265cd0a5fc874a78d792f8c3d42e5f', 'Djegia - Plastika, Mjekësia Interne & HTA', 'djegia plastika mjek sia interne hta', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3397214, 19.8323563, '+35542349308;+35542349515', NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:4d354155ea356e714500eadd9483b435c67edb6cfd190c537dafe49b0a53888e'),
('osm:node:12421796268', 'https://www.openstreetmap.org/node/12421796268', '{"provider":"openstreetmap","element":{"type":"node","id":12421796268,"lat":41.3210716,"lon":19.8144824,"tags":{"addr:city":"Tirana","addr:housenumber":"14","addr:street":"Rruga Pjetër Bogdani","amenity":"clinic","healthcare":"clinic","name":"Doctor''s General Clinic","website":"https://doctorshospital.al/"}}}'::jsonb, '2b87f075894282948d2982dd0efcb56d71ee541f802264288a371c75d632c9c2', 'Doctor''s General Clinic', 'doctor s general clinic', '14 Rruga Pjetër Bogdani', '14 Rruga Pjetër Bogdani, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3210716, 19.8144824, NULL, 'https://doctorshospital.al/', NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:97bf9b2cf066cce158232dee605b8d2692a653f4204f5a9764a6f94c90e06584'),
('osm:node:6853143479', 'https://www.openstreetmap.org/node/6853143479', '{"provider":"openstreetmap","element":{"type":"node","id":6853143479,"lat":41.3189208,"lon":19.4551903,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Domi"}}}'::jsonb, '429075e78c2de4ccfc2ba9893a6bfa139ed068021a8ec54509c714a90768770d', 'Domi', 'domi', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3189208, 19.4551903, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:17c75584c34fb64562966556c6f4ce9596d456790aaec99f55f6d6c46fa2cdee'),
('osm:node:6813229274', 'https://www.openstreetmap.org/node/6813229274', '{"provider":"openstreetmap","element":{"type":"node","id":6813229274,"lat":41.3299991,"lon":19.825845,"tags":{"addr:street":"Rruga Hoxha Tahsin","amenity":"dentist","healthcare":"dentist","name":"Doobiba Dental Clinic"}}}'::jsonb, '8b435b1a449022f1db8257a2b586de99e76548ea09f4d5efe1add6800291cd8b', 'Doobiba Dental Clinic', 'doobiba dental clinic', 'Rruga Hoxha Tahsin', 'Rruga Hoxha Tahsin', NULL, NULL, NULL, 'AL', 41.3299991, 19.825845, NULL, NULL, NULL, 'dental', ARRAY['dental', 'general_practitioner']::text[], 0.86, 'loc:ab459897f722af46250f0a975f8d51b801c33806787d311fca08ead28c33fbc3'),
('osm:node:6365010159', 'https://www.openstreetmap.org/node/6365010159', '{"provider":"openstreetmap","element":{"type":"node","id":6365010159,"lat":41.3459655,"lon":19.780503,"tags":{"amenity":"pharmacy","name":"Dorarta","wheelchair":"yes"}}}'::jsonb, 'eb83a2d975ab2992bf8c7cd2f4c0d1e97183427a722bd6fcb4f0f7d793846845', 'Dorarta', 'dorarta', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3459655, 19.780503, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:e60e36e05e2b026d7d9a6eca2cb273c23fd089a388c54543bb06e057e483384e'),
('osm:node:9844769342', 'https://www.openstreetmap.org/node/9844769342', '{"provider":"openstreetmap","element":{"type":"node","id":9844769342,"lat":40.6115464,"lon":20.7843016,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Dori","wheelchair":"no"}}}'::jsonb, '35643e5b38aa4d5db99939c47cd74f3e63d35b6b052f9da24b2d3684f66f3c71', 'Dori', 'dori', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6115464, 20.7843016, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:f73b318e2d69f48d1a7bfa5cab2f56a17eaeab6ab759a2de43f784afd361799f'),
('osm:node:11479181797', 'https://www.openstreetmap.org/node/11479181797', '{"provider":"openstreetmap","element":{"type":"node","id":11479181797,"lat":41.3231367,"lon":19.7984789,"tags":{"amenity":"dentist","check_date":"2024-01-02","healthcare":"dentist","name":"Dr Anxhela Buzo"}}}'::jsonb, 'bd8a41038a77f0124a17a0a7d3a4b824ed04f1387ecf8741d48896fbd25f1da5', 'Dr Anxhela Buzo', 'dr anxhela buzo', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3231367, 19.7984789, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:00ed4d6ef520b42b89a34c39caf2b61eb80f2cb723ce8a6597c2c552bff60093'),
('osm:node:13830534542', 'https://www.openstreetmap.org/node/13830534542', '{"provider":"openstreetmap","element":{"type":"node","id":13830534542,"lat":40.9392455,"lon":19.7078199,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Dr Enea BITRI & Olgreta ALLAMANI"}}}'::jsonb, '79c2b035261c886d713c4a03d231e5610197fe8a7f0304e56c64488d229567a6', 'Dr Enea BITRI & Olgreta ALLAMANI', 'dr enea bitri olgreta allamani', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9392455, 19.7078199, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:f04561370d964f3f78509a2927474b477316a33571453d87a7809ebd19c432d9'),
('osm:way:400645210', 'https://www.openstreetmap.org/way/400645210', '{"provider":"openstreetmap","element":{"type":"way","id":400645210,"center":{"lat":41.3210294,"lon":19.8151043},"tags":{"addr:city":"Tiranë","addr:housenumber":"5/1","addr:postcode":"1010","addr:street":"Rruga Pjetër Bogdani","amenity":"dentist","building":"yes","building:levels":"2","healthcare":"dentist","healthcare:speciality":"dentistry","name":"Dr Eno Gace","opening_hours":"Mo-Sa 08:00-20:00","operator":"lbakiu@gmail.com","source":"local knowledge"}}}'::jsonb, 'dcc206b94ec08119ca0500d293f50ac8e9cb2b10c8e4b66b9f071873671cde0b', 'Dr Eno Gace', 'dr eno gace', '5/1 Rruga Pjetër Bogdani', '5/1 Rruga Pjetër Bogdani, Tiranë, 1010', 'Tiranë', NULL, '1010', 'AL', 41.3210294, 19.8151043, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:11958e32cb984eed9fb53f91735dbb8dfb28d6c9a7f50e2329284ef218cd4cc8'),
('osm:node:11479181773', 'https://www.openstreetmap.org/node/11479181773', '{"provider":"openstreetmap","element":{"type":"node","id":11479181773,"lat":41.3249439,"lon":19.8017905,"tags":{"amenity":"dentist","check_date":"2024-01-02","healthcare":"dentist","name":"Dr Fjona Hamzai"}}}'::jsonb, 'b8ad5039c9faeabb0ac643535785d7a9bdc0d7923ee582e827f3f818623fc262', 'Dr Fjona Hamzai', 'dr fjona hamzai', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3249439, 19.8017905, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:96811113b45135a0ba99288e96c5f90b6f5fd07e5342709836950d2a8c76565b'),
('osm:node:9057207745', 'https://www.openstreetmap.org/node/9057207745', '{"provider":"openstreetmap","element":{"type":"node","id":9057207745,"lat":40.9390741,"lon":19.7064729,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Dr G. Saveta"}}}'::jsonb, 'd9b7600bace2b7d7abd59aec6e83de34c579172069a2211771b1a7fe3cbb19ce', 'Dr G. Saveta', 'dr g saveta', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9390741, 19.7064729, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:a381a385e081e403dc2af01f20fef21f256fd3005c9b5fbc90b9897778d0dea7'),
('osm:node:9057207743', 'https://www.openstreetmap.org/node/9057207743', '{"provider":"openstreetmap","element":{"type":"node","id":9057207743,"lat":40.9390832,"lon":19.7065287,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Dr Iva Prifti"}}}'::jsonb, '17e89526e6863b366b26e917cd754062f81422b7b483efb8d8c89069b7fd3a95', 'Dr Iva Prifti', 'dr iva prifti', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9390832, 19.7065287, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:0ebd2f16336ac63ce1f6472220410384f8d07dcc2f4432a811733448ea63fa99'),
('osm:node:11459823252', 'https://www.openstreetmap.org/node/11459823252', '{"provider":"openstreetmap","element":{"type":"node","id":11459823252,"lat":41.3248731,"lon":19.8053866,"tags":{"amenity":"dentist","check_date":"2023-12-27","healthcare":"dentist","name":"Dr Maldi Xhelili"}}}'::jsonb, 'bf0cdb906243751eaa9cbd96779b32e75b21737946761681368961f91bac03e5', 'Dr Maldi Xhelili', 'dr maldi xhelili', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3248731, 19.8053866, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:51dd52e0cc6dc3605663f423c4b6423fc258ee19b01b195f6e4ff345336065fc'),
('osm:node:8892353775', 'https://www.openstreetmap.org/node/8892353775', '{"provider":"openstreetmap","element":{"type":"node","id":8892353775,"lat":40.0834462,"lon":20.142258,"tags":{"healthcare":"laboratory","name":"Dr. Altini Goxharaj","opening_hours":"Mo-Su 08:00-14:00,17:00-20:00"}}}'::jsonb, 'e4d74ee77b27cf44c57fb73443c04a36f89af5a28b423c3f14ab0cf75672e475', 'Dr. Altini Goxharaj', 'dr altini goxharaj', NULL, NULL, NULL, NULL, NULL, 'AL', 40.0834462, 20.142258, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:9f88282b462f99c63397cbd447ec00ccd4a85779b89895f52add04b87be6730b'),
('osm:node:10041075855', 'https://www.openstreetmap.org/node/10041075855', '{"provider":"openstreetmap","element":{"type":"node","id":10041075855,"lat":40.619069,"lon":20.7756521,"tags":{"amenity":"dentist","healthcare":"dentist","level":"2","name":"Dr. Ania","wheelchair":"no"}}}'::jsonb, '851b78d74f16822c417eda91fc6dd07e79316ba5a0ce1fc77be22765fd2b1834', 'Dr. Ania', 'dr ania', NULL, NULL, NULL, NULL, NULL, 'AL', 40.619069, 20.7756521, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:e1595385248f586a5d3233471fbdadb005f51d8175776d895a36005aa59fb6a0'),
('osm:node:6388411029', 'https://www.openstreetmap.org/node/6388411029', '{"provider":"openstreetmap","element":{"type":"node","id":6388411029,"lat":41.3234473,"lon":19.7945388,"tags":{"addr:street":"Rruga e Kavajës","amenity":"dentist","email":"arjana.shehu@gmail.com","healthcare":"dentist","name":"Dr. Arjana Shehu","phone":"+355 692350919"}}}'::jsonb, 'b0f19edb5ce76bc806624d0634a5b588d76a9c087e26020e273e000b540a7c8d', 'Dr. Arjana Shehu', 'dr arjana shehu', 'Rruga e Kavajës', 'Rruga e Kavajës', NULL, NULL, NULL, 'AL', 41.3234473, 19.7945388, '+355 692350919', NULL, 'arjana.shehu@gmail.com', 'dental', ARRAY['dental']::text[], 0.86, 'loc:02271fb6ab96e601bd8991dbd66e0e830f3d5738c179280f3c672f1aae3bffd6'),
('osm:node:12890463667', 'https://www.openstreetmap.org/node/12890463667', '{"provider":"openstreetmap","element":{"type":"node","id":12890463667,"lat":40.6219266,"lon":20.986356,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Dr. Blerand Limka","phone":"+355695141684"}}}'::jsonb, '6a2163ed84b41f10856436a79bec5a2dce0595cad993d926b5f04e6e99707056', 'Dr. Blerand Limka', 'dr blerand limka', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6219266, 20.986356, '+355695141684', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:2bc63f51e05d1cea0ced3363311fda5268ad5ac871dd69a0b50409c8483056f8'),
('osm:node:6416423271', 'https://www.openstreetmap.org/node/6416423271', '{"provider":"openstreetmap","element":{"type":"node","id":6416423271,"lat":40.6124783,"lon":20.7839017,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Dr. Doriana Riza","phone":"+355 82 256 896","wheelchair":"no"}}}'::jsonb, 'cc57818dd421077148f33e33c3845e0c75a85a5c535ff5825d927787c9201b32', 'Dr. Doriana Riza', 'dr doriana riza', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6124783, 20.7839017, '+355 82 256 896', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:c74bbea734d040a676c22f533d900d917f42f7a8d6d549e7fc307ed361e2c363'),
('osm:node:6848120683', 'https://www.openstreetmap.org/node/6848120683', '{"provider":"openstreetmap","element":{"type":"node","id":6848120683,"lat":41.1815085,"lon":19.5637509,"tags":{"addr:street":"Shëtitorja Indrit Cara","healthcare":"doctor","healthcare:speciality":"cardiology","name":"Dr. Drin Bardhi"}}}'::jsonb, '163f2f44cca53b1580351f09ae7e61a4925e6b91c11ce118107fdb3b692463ef', 'Dr. Drin Bardhi', 'dr drin bardhi', 'Shëtitorja Indrit Cara', 'Shëtitorja Indrit Cara', NULL, NULL, NULL, 'AL', 41.1815085, 19.5637509, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner', 'specialist']::text[], 0.86, 'loc:dde224d698f9f1347657546604a9c947f6b35a85667774ea4e786642c76bff85'),
('osm:node:4510516393', 'https://www.openstreetmap.org/node/4510516393', '{"provider":"openstreetmap","element":{"type":"node","id":4510516393,"lat":41.3320218,"lon":19.7833038,"tags":{"amenity":"doctors","name":"Dr. Dritan Cela","name:sq":"Dr. Dritan Cela"}}}'::jsonb, '7d9079fde65220362a88e1a5a567c6901bcb420f139566c9bda0fe53e355e33b', 'Dr. Dritan Cela', 'dr dritan cela', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3320218, 19.7833038, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:fa19109fc7df2dbdcad53153dfc08e552dc8cd87e8ce13e2fd5a88c9c44c2725'),
('osm:node:9954734760', 'https://www.openstreetmap.org/node/9954734760', '{"provider":"openstreetmap","element":{"type":"node","id":9954734760,"lat":39.8750127,"lon":20.0085832,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Dr. Eda Jorgi","phone":"+355 69 224 9820"}}}'::jsonb, '0309bfc0d6018babda6e17d08f338cf963a9e97cb5073821cd8bbf9c85cf0d2f', 'Dr. Eda Jorgi', 'dr eda jorgi', NULL, NULL, NULL, NULL, NULL, 'AL', 39.8750127, 20.0085832, '+355 69 224 9820', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:a5500d60a091a18ed108b96e767f2528979cbc105227301230db824caaf43fbf'),
('osm:node:13889315708', 'https://www.openstreetmap.org/node/13889315708', '{"provider":"openstreetmap","element":{"type":"node","id":13889315708,"lat":42.3566501,"lon":20.0751425,"tags":{"addr:floor":"G","amenity":"doctors","check_date":"2026-05-27","healthcare":"doctor","level":"0","name":"Dr. Elisa Metaliaj (Doçi)","phone":"+355 69 799 6136"}}}'::jsonb, '36f16aa86b5d8132956bc4a45d1d2938d59f315cd8a33b5a695dc8643cd8e9fd', 'Dr. Elisa Metaliaj (Doçi)', 'dr elisa metaliaj do i', NULL, NULL, NULL, NULL, NULL, 'AL', 42.3566501, 20.0751425, '+355 69 799 6136', NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:fe725ee03979900b5d88a1d2f629a6a7ecbc15a239b18c7eecdf564db270ca09'),
('osm:node:6426450982', 'https://www.openstreetmap.org/node/6426450982', '{"provider":"openstreetmap","element":{"type":"node","id":6426450982,"lat":40.6170556,"lon":20.7778536,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Dr. Emil Kuvarati"}}}'::jsonb, '6866bd691a015cda8976b519f6bfbcf356fa2f19139c0b0346b76ce484c19c87', 'Dr. Emil Kuvarati', 'dr emil kuvarati', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6170556, 20.7778536, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:6212cb9d13decf28f8e9f0ccd3f8a3eaa267f8055e754dfa9a77c77d2da89616'),
('osm:node:10050624055', 'https://www.openstreetmap.org/node/10050624055', '{"provider":"openstreetmap","element":{"type":"node","id":10050624055,"lat":40.7108637,"lon":19.9389167,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Dr. Eni Cipi","phone":"692529262"}}}'::jsonb, '8a053074af75c500872377a10ea2b145a15dd6b55499f14ba6778d37d3291885', 'Dr. Eni Cipi', 'dr eni cipi', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7108637, 19.9389167, '692529262', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:eaca8a3e1711be83aa5b931c31a921d4a00ad84acc6dda414e1697c2ab4f4169');

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
