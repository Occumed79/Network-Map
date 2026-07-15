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
('osm:node:6860174186', 'https://www.openstreetmap.org/node/6860174186', '{"provider":"openstreetmap","element":{"type":"node","id":6860174186,"lat":40.4552767,"lon":19.4828658,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Arjana"}}}'::jsonb, '6e5a500b40d4c92fc29dc830a88268f13a896577be4d547dc511f699aeb9b5e2', 'Arjana', 'arjana', NULL, NULL, NULL, NULL, NULL, 'AL', 40.4552767, 19.4828658, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:f3a1523e922b021b35285b8192f29bd772af0e8dc79ab9cf22ee8329429b195e'),
('osm:node:6905020944', 'https://www.openstreetmap.org/node/6905020944', '{"provider":"openstreetmap","element":{"type":"node","id":6905020944,"lat":41.3350685,"lon":19.8189712,"tags":{"addr:city":"Tirana","addr:country":"AL","addr:street":"Rruga Mahmut Fortuzi","amenity":"pharmacy","healthcare":"pharmacy","name":"Arjona"}}}'::jsonb, '99fe98f8bb846a56cc264293a38ffcf4d97c45a8b717b99009e9cd808c7987bd', 'Arjona', 'arjona', 'Rruga Mahmut Fortuzi', 'Rruga Mahmut Fortuzi, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3350685, 19.8189712, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:de075390d0f7b9578bb5f013ffa12f7eb52e2390fe1463e622ea99fdda9ee94e'),
('osm:node:13962189216', 'https://www.openstreetmap.org/node/13962189216', '{"provider":"openstreetmap","element":{"type":"node","id":13962189216,"lat":41.321718,"lon":19.8101978,"tags":{"addr:floor":"G","check_date":"2026-06-24","healthcare":"laboratory","level":"0","name":"ArliMed"}}}'::jsonb, 'b0993950666dfa135e002a36bb927ce15367591c60626ce5c4b7c4e252787387', 'ArliMed', 'arlimed', NULL, NULL, NULL, NULL, NULL, 'AL', 41.321718, 19.8101978, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:90b134e0698f972ef5ca5a81a5e81c1a27622b133a066f85b315876aa15e72a3'),
('osm:node:12998865933', 'https://www.openstreetmap.org/node/12998865933', '{"provider":"openstreetmap","element":{"type":"node","id":12998865933,"lat":41.3383571,"lon":19.8265126,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Armir","wheelchair":"limited"}}}'::jsonb, 'ea9a0159fef9c00521767f9554a8dc17688fc98ad2387a27eb15a6582c4592ec', 'Armir', 'armir', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3383571, 19.8265126, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:1b87a46d76e131209fd97d63384f8d5a88245577421c271b74ab301a2b6dfd43'),
('osm:node:5922575598', 'https://www.openstreetmap.org/node/5922575598', '{"provider":"openstreetmap","element":{"type":"node","id":5922575598,"lat":41.3299431,"lon":19.8214676,"tags":{"addr:street":"Rruga e Barrikadave","amenity":"pharmacy","check_date":"2023-09-24","healthcare":"pharmacy","level":"0","name":"Armir Farma"}}}'::jsonb, '7ef04be6a9cde00f55a03e9251ffc28d9b10ec19d22022b9049dd87f3f7b3b4a', 'Armir Farma', 'armir farma', 'Rruga e Barrikadave', 'Rruga e Barrikadave', NULL, NULL, NULL, 'AL', 41.3299431, 19.8214676, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:8691bcc2a6a70954613d5197946820d93739dbdc520a524b2e1ac7d9f375cf0f'),
('osm:node:11971909318', 'https://www.openstreetmap.org/node/11971909318', '{"provider":"openstreetmap","element":{"type":"node","id":11971909318,"lat":41.3191118,"lon":19.8275228,"tags":{"addr:housenumber":"60","addr:street":"Rruga e Elbasanit","amenity":"doctors","check_date":"2024-06-11","email":"artorlclinic@gmail.com","healthcare":"doctor","healthcare:speciality":"plastic_surgery","internet_access":"wlan","internet_access:fee":"customers","internet_access:ssid":"ART ORL","level":"2","name":"Art Clinic Orl & Aesthetics","phone":"+355 693737010"}}}'::jsonb, 'f772d68da65d686bab071f105cd023c13d4cd009cb34c3c36f8cc3bfacbd1bcf', 'Art Clinic Orl & Aesthetics', 'art clinic orl aesthetics', '60 Rruga e Elbasanit', '60 Rruga e Elbasanit', NULL, NULL, NULL, 'AL', 41.3191118, 19.8275228, '+355 693737010', NULL, 'artorlclinic@gmail.com', 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:028c8509d758bdbd8aba23f0fa5ddd601183dead07b9657749f97ec35c8b0bd3'),
('osm:node:9856408170', 'https://www.openstreetmap.org/node/9856408170', '{"provider":"openstreetmap","element":{"type":"node","id":9856408170,"lat":40.6262612,"lon":20.9845436,"tags":{"amenity":"dentist","healthcare":"dentist","level":"1","name":"Art Dental","phone":"+355 5437333","wheelchair":"no"}}}'::jsonb, 'c71a9862add769d595320ef1724ae0418e7d4ab86f85224320620b014eea2e5d', 'Art Dental', 'art dental', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6262612, 20.9845436, '+355 5437333', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:8ec8becd8b593720ef6812adc030bad1f97f71919071625c803f57e82721d04d'),
('osm:node:6430146344', 'https://www.openstreetmap.org/node/6430146344', '{"provider":"openstreetmap","element":{"type":"node","id":6430146344,"lat":40.6084572,"lon":20.7799614,"tags":{"amenity":"pharmacy","name":"Arta"}}}'::jsonb, '053baf46c93fe4225aea6e934231c9e80e7b53a5cbada0e450312beee824a307', 'Arta', 'arta', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6084572, 20.7799614, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:320654637da5dae3f1bc294b0fb17d824401e7c874eff0a221b43d7a7916831c'),
('osm:node:12097303959', 'https://www.openstreetmap.org/node/12097303959', '{"provider":"openstreetmap","element":{"type":"node","id":12097303959,"lat":40.9373646,"lon":19.7071417,"tags":{"addr:floor":"1","amenity":"dentist","check_date":"2024-08-07","healthcare":"dentist","internet_access":"no","level":"1","name":"ArtDent Dr.Aleksandra Qose","opening_hours":"Mo-Sa 08:00-12:00,14:00-18:00; Su off","payment:cash":"yes","payment:credit_cards":"yes","payment:debit_cards":"yes","phone":"+355 69 230 3545","wheelchair":"no"}}}'::jsonb, 'e9dbfed555bad0377be68a5ab1aec17d47c0c22abd698eb31373289fe856d5e8', 'ArtDent Dr.Aleksandra Qose', 'artdent dr aleksandra qose', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9373646, 19.7071417, '+355 69 230 3545', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:12612b20e1c6a5d5b32941a531dc9462abc4a478bac4c8f82a908335e7e8c25e'),
('osm:node:6389363057', 'https://www.openstreetmap.org/node/6389363057', '{"provider":"openstreetmap","element":{"type":"node","id":6389363057,"lat":40.627155,"lon":20.7700337,"tags":{"amenity":"doctors","healthcare":"doctor","name":"Asclepius"}}}'::jsonb, '77b5b1db654942f08ed6d922045a14836b4361300161cfb415fcc25b0a575311', 'Asclepius', 'asclepius', NULL, NULL, NULL, NULL, NULL, 'AL', 40.627155, 20.7700337, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:11be5b51d69b55b7ac1b6ea3cf3647d59c034d0b99ee66d33736ff4e1f7290cd'),
('osm:way:1131276181', 'https://www.openstreetmap.org/way/1131276181', '{"provider":"openstreetmap","element":{"type":"way","id":1131276181,"center":{"lat":41.3219049,"lon":19.826548},"tags":{"addr:city":"Tirana","addr:street":"Qamil Guranjaku","amenity":"hospital","healthcare":"hospital","name":"ASHR - Autoriteti Shendetësor Rajonal, Tiranë","name:en":"ASHR - Regional Health Authority, Tirana","note":"ASHR eshte institucion shendetesor kerkimor. Po keshtu edhe porta e pare e pritjes se pacienteve ne Tirane."}}}'::jsonb, 'ec2840af779ef9a0e1f673132e4234767abb6d7c8eeef0447cc8d68d2629b87c', 'ASHR - Autoriteti Shendetësor Rajonal, Tiranë', 'ashr autoriteti shendet sor rajonal tiran', 'Qamil Guranjaku', 'Qamil Guranjaku, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3219049, 19.826548, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:ab5bb7b1ef55ff91b9cb771db2241111b84d3dafb0a60e98f8afd8bbac7509b4'),
('osm:node:3923566946', 'https://www.openstreetmap.org/node/3923566946', '{"provider":"openstreetmap","element":{"type":"node","id":3923566946,"lat":42.0581599,"lon":19.5042045,"tags":{"addr:city":"Shkoder","addr:country":"AL","addr:postcode":"4001","amenity":"pharmacy","dispensing":"yes","name":"Avicena","wheelchair":"limited"}}}'::jsonb, '6a144b2fe097e7e7c5a13a7f31a13d25404f1d49753f1b2af20c6bbdb935f7d9', 'Avicena', 'avicena', NULL, 'Shkoder, 4001', 'Shkoder', NULL, '4001', 'AL', 42.0581599, 19.5042045, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:518fac4cc0e0718314a346b845382868a62e6f74348025bd7d3b9f02c788aef8'),
('osm:node:4535573049', 'https://www.openstreetmap.org/node/4535573049', '{"provider":"openstreetmap","element":{"type":"node","id":4535573049,"lat":42.062985,"lon":19.5108442,"tags":{"amenity":"pharmacy","dispensing":"yes","name":"B&M Pharma"}}}'::jsonb, '77bfbb0bc9ee10d711237e1882ff3500c95f0fb2c10ef038199cc736fcdab5f0', 'B&M Pharma', 'b m pharma', NULL, NULL, NULL, NULL, NULL, 'AL', 42.062985, 19.5108442, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:26ed84150f12e1bd4d6c658abbac86769447efcbc4f62caa2c186709dcea0368'),
('osm:node:3987628942', 'https://www.openstreetmap.org/node/3987628942', '{"provider":"openstreetmap","element":{"type":"node","id":3987628942,"lat":42.0613015,"lon":19.5054903,"tags":{"amenity":"pharmacy","internet":"yes","internet_access":"wlan","internet_access:fee":"no","name":"Bar Kafe","outdoor_seating":"yes","payment:coins":"yes","payment:credit_cards":"no","payment:cryptocurrencies":"no","payment:debit_cards":"no","payment:electronic_purses":"no","payment:notes":"yes","smoking":"outside","source":"bing;mapbox-satellite;survey;gps;knowledge;local-info","source_ref:url":"https://www.flickr.com/photos/openstreetmap-albania","takeaway":"yes","wheelchair":"yes"}}}'::jsonb, '29905fcb28b15960af0ffafb03b4399e3defb722b36eaaf276b9d708a87d3b3c', 'Bar Kafe', 'bar kafe', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0613015, 19.5054903, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:90634bc8944e52bd3b6ae5dc2fcdd23bbfd6ea317bdd095d372e747ae3a6d652'),
('osm:node:3360290634', 'https://www.openstreetmap.org/node/3360290634', '{"provider":"openstreetmap","element":{"type":"node","id":3360290634,"lat":41.8631398,"lon":19.4270168,"tags":{"amenity":"doctors","name":"Barnatore - Ambulancë","wheelchair":"limited"}}}'::jsonb, '7a0fe1c251a9091926c38b349fd59661815f67d91c599b28d6677577744a00a5', 'Barnatore - Ambulancë', 'barnatore ambulanc', NULL, NULL, NULL, NULL, NULL, 'AL', 41.8631398, 19.4270168, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:41a3544914aa869ea02da9b350dccd84acfcea275895894252e39e15aa668357'),
('osm:node:3361843079', 'https://www.openstreetmap.org/node/3361843079', '{"provider":"openstreetmap","element":{"type":"node","id":3361843079,"lat":41.8641271,"lon":19.4231192,"tags":{"amenity":"pharmacy","dispensing":"yes","name":"Barnatore - Ambulancë","opening_hours":"24/7","shop":"jewelry","wheelchair":"limited"}}}'::jsonb, '8a89f377141b5d5b18fffb83405eb43e4203e1e371214e56b4e76a538b6984e9', 'Barnatore - Ambulancë', 'barnatore ambulanc', NULL, NULL, NULL, NULL, NULL, 'AL', 41.8641271, 19.4231192, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:c852be1b945efc67a46e75df24d6e52ba04ff96a0fb7dda219e9e59037f0ac2b'),
('osm:node:2106048250', 'https://www.openstreetmap.org/node/2106048250', '{"provider":"openstreetmap","element":{"type":"node","id":2106048250,"lat":42.0647374,"lon":19.5081711,"tags":{"addr:city":"Shkodër","addr:country":"AL","addr:postcode":"4001","amenity":"pharmacy","internet_access":"yes","internet_access:fee":"no","name":"Barnatore Parruca","payment:coins":"yes","payment:credit_cards":"no","payment:cryptocurrencies":"no","payment:debit_cards":"no","payment:electronic_purses":"no","payment:notes":"yes","smoking":"outside","source":"bing;survey;gps","source_ref:url":"https://www.flickr.com/photos/134902422@N04/map?&fLat=41.9559&fLon=19.4337&zl=11&order_by=recent","wheelchair":"limited"}}}'::jsonb, 'f8fcc0e95f00d17a0ab562f60f5c7ca33f4e8f126e4fb9532f1b921f745a72f0', 'Barnatore Parruca', 'barnatore parruca', NULL, 'Shkodër, 4001', 'Shkodër', NULL, '4001', 'AL', 42.0647374, 19.5081711, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:43e889235c88527321ca1142e5513c7e2f834e217d7095da57160781fa78c497'),
('osm:way:1318824968', 'https://www.openstreetmap.org/way/1318824968', '{"provider":"openstreetmap","element":{"type":"way","id":1318824968,"center":{"lat":40.9794422,"lon":19.8888696},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Belsh Hospital"}}}'::jsonb, 'f48b6e892617a2327841677dd4faadfe6ef5d50dcdcd7f6b8a1690a4678adc5f', 'Belsh Hospital', 'belsh hospital', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9794422, 19.8888696, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:303e1166ecc54bd107b31e50d96f6630309aec3d931d1a5d474a053510535eda'),
('osm:node:9153942964', 'https://www.openstreetmap.org/node/9153942964', '{"provider":"openstreetmap","element":{"type":"node","id":9153942964,"lat":41.1150912,"lon":20.0833468,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Berlin"}}}'::jsonb, 'd27b474fbc9186c1e87e082e9b567c0458522cb1c1ccccf4abaeeda53146a291', 'Berlin', 'berlin', NULL, NULL, NULL, NULL, NULL, 'AL', 41.1150912, 20.0833468, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:1bafd4304f483c54bbef72cb26abfe5972a2a8ac8c6178893616abe7802fa107'),
('osm:node:6863520303', 'https://www.openstreetmap.org/node/6863520303', '{"provider":"openstreetmap","element":{"type":"node","id":6863520303,"lat":40.45779,"lon":19.4879693,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Bio Belkisa"}}}'::jsonb, 'eb6325afbae4021e3f072935a5f4578321ef33374b07b3e0d7de00726b248d49', 'Bio Belkisa', 'bio belkisa', NULL, NULL, NULL, NULL, NULL, 'AL', 40.45779, 19.4879693, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:fabd0bad45bff6d461357f3516fee703f985c07f438a42e96d9f34dfcbe904c9'),
('osm:node:9764883429', 'https://www.openstreetmap.org/node/9764883429', '{"provider":"openstreetmap","element":{"type":"node","id":9764883429,"lat":41.332172,"lon":19.8352785,"tags":{"addr:city":"Tirana","addr:street":"Rruga Stefan Prifti","amenity":"pharmacy","healthcare":"pharmacy","name":"Bio Plus"}}}'::jsonb, 'b568b6636de48454d7df7440b7451b1627a63a816e4f7329cd18ee22620dd222', 'Bio Plus', 'bio plus', 'Rruga Stefan Prifti', 'Rruga Stefan Prifti, Tirana', 'Tirana', NULL, NULL, 'AL', 41.332172, 19.8352785, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:572b06a8ba892168d6cc7e100ae12a759e457f1f87490ae6cddb4d439ac8cd52'),
('osm:node:6426186516', 'https://www.openstreetmap.org/node/6426186516', '{"provider":"openstreetmap","element":{"type":"node","id":6426186516,"lat":40.6141902,"lon":20.7764369,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"BioPlus","wheelchair":"no"}}}'::jsonb, '84210bf6bd16e5fabe3d831774156d26352e3d22ad066447326c1abbe8282a5e', 'BioPlus', 'bioplus', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6141902, 20.7764369, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:76f95be24144acf82d45b1f4ec48af81b6d01e85c98daa15d1a283a7de1a3131'),
('osm:node:9893596105', 'https://www.openstreetmap.org/node/9893596105', '{"provider":"openstreetmap","element":{"type":"node","id":9893596105,"lat":40.6140276,"lon":20.7813066,"tags":{"healthcare":"laboratory","name":"Biotest","phone":"+355 69 811 9830","wheelchair":"no"}}}'::jsonb, '9bfc1534f94b4a8a1515e9220172b536b4ecb79e7739faced8f4a3a4cdc43f53', 'Biotest', 'biotest', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6140276, 20.7813066, '+355 69 811 9830', NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:cf03c1cd343a48ad3f823e05c9a131f4ef556dfb17721fcf208c55fdd1edf6bd'),
('osm:node:9153942952', 'https://www.openstreetmap.org/node/9153942952', '{"provider":"openstreetmap","element":{"type":"node","id":9153942952,"lat":41.1120456,"lon":20.0806043,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Blend","opening_hours":"Mo-Su 08:00-21:00"}}}'::jsonb, 'fb1615f553c8f591b69e5f6c8ebb804827a1ddaea8cec25b0159df41a33b0dfc', 'Blend', 'blend', NULL, NULL, NULL, NULL, NULL, 'AL', 41.1120456, 20.0806043, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:73e65c76f800c960c727a817698d33bdfe32a9882186211c2132f0aed5922c68'),
('osm:node:3387400126', 'https://www.openstreetmap.org/node/3387400126', '{"provider":"openstreetmap","element":{"type":"node","id":3387400126,"lat":42.0747352,"lon":19.5246527,"tags":{"amenity":"doctors","name":"Blloku Lindjeve","wheelchair":"limited"}}}'::jsonb, 'fc01ab77369b53e98c0c2a45f520cb5c4c3b07fa3a48df0543f54888b7ac0ca2', 'Blloku Lindjeve', 'blloku lindjeve', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0747352, 19.5246527, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:284317b4450f99fa9e08c2bd6d6fb55ab7e181e3a996ead1b95922f04b588f33'),
('osm:node:6827992085', 'https://www.openstreetmap.org/node/6827992085', '{"provider":"openstreetmap","element":{"type":"node","id":6827992085,"lat":41.3252829,"lon":19.8279364,"tags":{"addr:street":"Rruga Petro Nini Luarasi","amenity":"dentist","healthcare":"dentist","name":"Bluetooth Klinika Dentare"}}}'::jsonb, 'd1a47951b407faf93b0c6e94d0647fc4ef8d149130c8a266c356fea79e5b4d76', 'Bluetooth Klinika Dentare', 'bluetooth klinika dentare', 'Rruga Petro Nini Luarasi', 'Rruga Petro Nini Luarasi', NULL, NULL, NULL, 'AL', 41.3252829, 19.8279364, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:5cbd5debe1f309093ff2bad9b9e7378c7c5f88c10154e1c6288178e5f62e6de7'),
('osm:node:6860174388', 'https://www.openstreetmap.org/node/6860174388', '{"provider":"openstreetmap","element":{"type":"node","id":6860174388,"lat":40.457239,"lon":19.4872503,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Bora"}}}'::jsonb, 'e519188bb2eed78c5955116b5757c9cb56f9666da45e0c11989412e3a5753641', 'Bora', 'bora', NULL, NULL, NULL, NULL, NULL, 'AL', 40.457239, 19.4872503, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:c40b48662622f5fe1e63130cba09948aefef68006048ce2d54bf9a692ba4179c'),
('osm:node:6372713989', 'https://www.openstreetmap.org/node/6372713989', '{"provider":"openstreetmap","element":{"type":"node","id":6372713989,"lat":40.6180301,"lon":20.7826117,"tags":{"amenity":"pharmacy","name":"Borova","wheelchair":"no"}}}'::jsonb, '0469676e23a96649b617fb64811e65888e11c0d9b177eaa019d411a69a012756', 'Borova', 'borova', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6180301, 20.7826117, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:e02bfb4dd0bc9b761f6b0ad4bb8b3f92bce59b6fd352cdf8de8d8fedcb06293b'),
('osm:node:13424407542', 'https://www.openstreetmap.org/node/13424407542', '{"provider":"openstreetmap","element":{"type":"node","id":13424407542,"lat":41.3265296,"lon":19.8320688,"tags":{"addr:city":"Tirane","addr:street":"Rruga Zonja Çurre","alt_name":"DRV Clinic","amenity":"dentist","contact:phone":"0684513795","healthcare":"dentist","healthcare:speciality":"general","name":"Bright Smile","website":"drvclinicalbania.com"}}}'::jsonb, '043c556a72cb9f6c33105fb4d574764306ffee62386e6568023740fca0eb2331', 'Bright Smile', 'bright smile', 'Rruga Zonja Çurre', 'Rruga Zonja Çurre, Tirane', 'Tirane', NULL, NULL, 'AL', 41.3265296, 19.8320688, '0684513795', 'drvclinicalbania.com', NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:79e689b48c7fa82229e276baaf5c6f38b2381c32a5e4c0d35895ba49cf372cf2'),
('osm:node:6373859656', 'https://www.openstreetmap.org/node/6373859656', '{"provider":"openstreetmap","element":{"type":"node","id":6373859656,"lat":40.6210175,"lon":20.7757113,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Brilant Dent","phone":"+355 69 242 5762","wheelchair":"no"}}}'::jsonb, '72c23fc73717f76856e2b8e497a4811fc50892c2a3ec0b2189fa84c79a67bf3d', 'Brilant Dent', 'brilant dent', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6210175, 20.7757113, '+355 69 242 5762', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:af0f2c03a1f06c64c9592191a1a1eeddb5aa2da9af6aba4f160b262b60f92ce5'),
('osm:node:4531763311', 'https://www.openstreetmap.org/node/4531763311', '{"provider":"openstreetmap","element":{"type":"node","id":4531763311,"lat":42.0688767,"lon":19.513278,"tags":{"amenity":"doctors","name":"Broci Fizioterapi"}}}'::jsonb, '57e9eb8e56c08802fd754a00a3b3dbfc55ad173aaca02fedeb0e2c385e857828', 'Broci Fizioterapi', 'broci fizioterapi', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0688767, 19.513278, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:1eedab10893736f20d8651ead039d46b79823af196518d2bace78e5d7661e41e'),
('osm:node:4347535790', 'https://www.openstreetmap.org/node/4347535790', '{"provider":"openstreetmap","element":{"type":"node","id":4347535790,"lat":40.0741539,"lon":20.1380751,"tags":{"amenity":"pharmacy","name":"Bujar Shehu"}}}'::jsonb, 'a4fe966561a1d1d7f7e91785bb88f8cb6662f35b95b15bd0055daeb3b077eb8f', 'Bujar Shehu', 'bujar shehu', NULL, NULL, NULL, NULL, NULL, 'AL', 40.0741539, 20.1380751, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:1b5d375732c1636d3198897505b60a012cc2e4b4b17f7e18a148ddafe6e7e7d2'),
('osm:node:6861224002', 'https://www.openstreetmap.org/node/6861224002', '{"provider":"openstreetmap","element":{"type":"node","id":6861224002,"lat":41.3488304,"lon":19.4401199,"tags":{"addr:street":"Rruga Aleksander Goga","amenity":"pharmacy","name":"Bujqesore"}}}'::jsonb, '23ae65d5753fb547bdd00160f10f7248507aa313fbc0ccecb77b0e169f81ccca', 'Bujqesore', 'bujqesore', 'Rruga Aleksander Goga', 'Rruga Aleksander Goga', NULL, NULL, NULL, 'AL', 41.3488304, 19.4401199, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:311e81b24ee936d2c82c7c720aaa1580f0ec5463cd12d3f98f505e662a946d53'),
('osm:node:4518971240', 'https://www.openstreetmap.org/node/4518971240', '{"provider":"openstreetmap","element":{"type":"node","id":4518971240,"lat":42.0673637,"lon":19.5108688,"tags":{"amenity":"dentist","name":"Bushati Dental","wheelchair":"limited"}}}'::jsonb, 'bb17ad4e0f9db64623b3a7589cdbde3796e12263d3cc83b94d03e303a344ea8e', 'Bushati Dental', 'bushati dental', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0673637, 19.5108688, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:4177d72f788bfc7ccb6022c8c6d3c763284d4630dffbee1fd286bf98973034ca'),
('osm:node:6877456187', 'https://www.openstreetmap.org/node/6877456187', '{"provider":"openstreetmap","element":{"type":"node","id":6877456187,"lat":40.0822797,"lon":20.1418372,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Çabeli","wheelchair":"limited"}}}'::jsonb, '5ec8be631d05cab8f5930ed11f7d4faf9735f00d6adfb7b4f62543b4b267948e', 'Çabeli', 'abeli', NULL, NULL, NULL, NULL, NULL, 'AL', 40.0822797, 20.1418372, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:0a83beb73d25da112c5152910d94b706d73df1f2cd0cabc935d95d8e809a2c76'),
('osm:node:9388181384', 'https://www.openstreetmap.org/node/9388181384', '{"provider":"openstreetmap","element":{"type":"node","id":9388181384,"lat":41.3334911,"lon":19.8167594,"tags":{"healthcare":"laboratory","name":"Cambridge Clinical Laboratories"}}}'::jsonb, '735e7f93b17e5510419835b7098fd521329071dcc20e1806979f38bee52e94ac', 'Cambridge Clinical Laboratories', 'cambridge clinical laboratories', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3334911, 19.8167594, NULL, NULL, NULL, 'lab', ARRAY['lab', 'general_practitioner']::text[], 0.78, 'loc:72c52d27da5695d07a7610a25449a6c1f88d60af5b621b0a5ad330962439c7f7'),
('osm:node:4344534094', 'https://www.openstreetmap.org/node/4344534094', '{"provider":"openstreetmap","element":{"type":"node","id":4344534094,"lat":40.7017855,"lon":19.9597358,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Ceca"}}}'::jsonb, '4312b69488b466cc3138cbce6b6a5558a5efdba4740f43af8bebeb4227205a9f', 'Ceca', 'ceca', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7017855, 19.9597358, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:fb8f6de8b693c188d7fcc1c1111a0bba9c5c03f53f3fdc02034c17b6fe7e3164'),
('osm:node:6806537473', 'https://www.openstreetmap.org/node/6806537473', '{"provider":"openstreetmap","element":{"type":"node","id":6806537473,"lat":41.33674,"lon":19.8400439,"tags":{"addr:street":"Rruga Xhanfize Keko","amenity":"pharmacy","healthcare":"pharmacy","name":"Cema Farmaci"}}}'::jsonb, '48d96a3bcc3de939fc16319a2dfe19ef10d4c76cd02f4d60a8805954a19327c7', 'Cema Farmaci', 'cema farmaci', 'Rruga Xhanfize Keko', 'Rruga Xhanfize Keko', NULL, NULL, NULL, 'AL', 41.33674, 19.8400439, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:80848b336a933e33addbfee6a550f002b3b27629b107c5a95548866a06bbb705'),
('osm:node:10860326957', 'https://www.openstreetmap.org/node/10860326957', '{"provider":"openstreetmap","element":{"type":"node","id":10860326957,"lat":41.3395705,"lon":19.7905507,"tags":{"addr:city":"Tirana","addr:housenumber":"23","addr:postcode":"1025","addr:street":"Rruga Gjergj Legisi","amenity":"dentist","healthcare":"dentist","name":"Cenaj"}}}'::jsonb, '85b199a6f05f725a84661f744e6589ad3078e6cb55d2c0426e9040531a8c7a2c', 'Cenaj', 'cenaj', '23 Rruga Gjergj Legisi', '23 Rruga Gjergj Legisi, Tirana, 1025', 'Tirana', NULL, '1025', 'AL', 41.3395705, 19.7905507, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:7613115bb4d1de806edfb568dc9ebf643b3a23f3af5c9c22a315d28665d19228'),
('osm:node:4191510485', 'https://www.openstreetmap.org/node/4191510485', '{"provider":"openstreetmap","element":{"type":"node","id":4191510485,"lat":41.3287477,"lon":19.8154529,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Cimili"}}}'::jsonb, 'c380071ce31759ef8e4b215206de300e0e771b9db3f57e6b14736d65f0e5342f', 'Cimili', 'cimili', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3287477, 19.8154529, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:40352e5fed61505da8ec6c8057cef4ede97f59ae4956cbfa44f5b4b432ba82df'),
('osm:node:6844882886', 'https://www.openstreetmap.org/node/6844882886', '{"provider":"openstreetmap","element":{"type":"node","id":6844882886,"lat":41.4790201,"lon":19.7170944,"tags":{"amenity":"dentist","healthcare":"dentist","name":"City dental"}}}'::jsonb, '5d45c7a97af33611e70e09ad76b3d5d50280fac8cc90b1105a103ec01331daa2', 'City dental', 'city dental', NULL, NULL, NULL, NULL, NULL, 'AL', 41.4790201, 19.7170944, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:e238a27c18c6a7f08b8feb9ede2bf9cc245112bc964d55446234b14018a2ac09'),
('osm:node:6614688245', 'https://www.openstreetmap.org/node/6614688245', '{"provider":"openstreetmap","element":{"type":"node","id":6614688245,"lat":40.7291208,"lon":19.5645574,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Class Dental","phone":"+355695244250"}}}'::jsonb, '3be40a303d74cd4e1e11bfbf62978b7e010a55de2de166600f4ad97309727ad4', 'Class Dental', 'class dental', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7291208, 19.5645574, '+355695244250', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:6f3e9e625509bf8c6d9ea1de6c287bec549a4533ecc8bd9476540558eb92a3b0'),
('osm:node:2405791969', 'https://www.openstreetmap.org/node/2405791969', '{"provider":"openstreetmap","element":{"type":"node","id":2405791969,"lat":40.5014775,"lon":20.2281256,"tags":{"amenity":"hospital","check_date":"2025-08-03","emergency":"yes","healthcare":"hospital","healthcare:speciality":"general","internet_access":"no","name":"Çorovoda''s Hospital","name:sq":"Spitali i Çorovodës","operator:type":"public","payment:cards":"no","payment:cash":"yes","payment:credit_cards":"no","payment:debit_cards":"no","source":"local knowledge","wheelchair":"limited"}}}'::jsonb, 'd7a776f7decb2e73bbcd61a1fdae101e071516f5232acb21cac6c8f20fcab439', 'Çorovoda''s Hospital', 'orovoda s hospital', NULL, NULL, NULL, NULL, NULL, 'AL', 40.5014775, 20.2281256, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:6c0abebe9d546cb0a3c475e543dd8645c1544ead69e8669dd83c0324850e60fb'),
('osm:node:9839187210', 'https://www.openstreetmap.org/node/9839187210', '{"provider":"openstreetmap","element":{"type":"node","id":9839187210,"lat":40.6240563,"lon":20.7821611,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Curaprox","wheelchair":"no"}}}'::jsonb, '47d3b1d1b9e84ea3ea550eede2523e327a63d02fef8ca00ec678e944f3934a0a', 'Curaprox', 'curaprox', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6240563, 20.7821611, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:11a2d6a95556207571cba9755747bf7988617dc2c51726e314c43d5c0887d9c8'),
('osm:node:4592190193', 'https://www.openstreetmap.org/node/4592190193', '{"provider":"openstreetmap","element":{"type":"node","id":4592190193,"lat":41.3570789,"lon":19.7633845,"tags":{"addr:city":"Tirana","addr:street":"Rruga Princ Vidi","amenity":"pharmacy","healthcare":"pharmacy","name":"Dafina","name:sq":"Dafina"}}}'::jsonb, 'f5087c9f7d7bd7e0b621f633c94aede4fc96e32ee5406b0c5b70f994b7ebb27f', 'Dafina', 'dafina', 'Rruga Princ Vidi', 'Rruga Princ Vidi, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3570789, 19.7633845, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:b15bb88b6b619e5d5955b99690be3d3057e7466982590464d394cdac8d677897'),
('osm:node:5419157098', 'https://www.openstreetmap.org/node/5419157098', '{"provider":"openstreetmap","element":{"type":"node","id":5419157098,"lat":41.3234568,"lon":19.8250707,"tags":{"addr:city":"Tirana","addr:country":"AL","addr:postcode":"1000","addr:street":"Rruga e Elbasanit","amenity":"pharmacy","healthcare":"pharmacy","name":"Daja","wheelchair":"limited"}}}'::jsonb, '5690b0123782d72cc30e61f2470f3cff87002b4d5a0fc1696ff6ef732caaf3d6', 'Daja', 'daja', 'Rruga e Elbasanit', 'Rruga e Elbasanit, Tirana, 1000', 'Tirana', NULL, '1000', 'AL', 41.3234568, 19.8250707, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:fa7680f30f52879633fe677a23dd82c023a3d7a141750562351296572f5c55ce'),
('osm:node:6861564899', 'https://www.openstreetmap.org/node/6861564899', '{"provider":"openstreetmap","element":{"type":"node","id":6861564899,"lat":41.3338611,"lon":19.5219567,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Daja"}}}'::jsonb, '17bc6eb285f1394e8f258098fd4d7b252c69ae32ad3a271a6654d7336c396f4e', 'Daja', 'daja', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3338611, 19.5219567, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:6661476413fc7b1a8d97c80d8e15fb8ed01d6e0e6724174d864e4a545d93a162'),
('osm:node:12374347107', 'https://www.openstreetmap.org/node/12374347107', '{"provider":"openstreetmap","element":{"type":"node","id":12374347107,"lat":41.3584288,"lon":19.7906741,"tags":{"addr:city":"Paskuqan","addr:street":"Rruga Korabi","amenity":"dentist","healthcare":"dentist","name":"Dalipi Dental Clinic"}}}'::jsonb, '12caadf773ded03f4a3d4b57eccf1a9056a59cd372623d55ae36a2a101af7b0f', 'Dalipi Dental Clinic', 'dalipi dental clinic', 'Rruga Korabi', 'Rruga Korabi, Paskuqan', 'Paskuqan', NULL, NULL, 'AL', 41.3584288, 19.7906741, NULL, NULL, NULL, 'dental', ARRAY['dental', 'general_practitioner']::text[], 0.86, 'loc:9abdd125c51139dabc316c98b124cf68bb69caf6aeba0c3e0b529813930228ec'),
('osm:node:6418133508', 'https://www.openstreetmap.org/node/6418133508', '{"provider":"openstreetmap","element":{"type":"node","id":6418133508,"lat":40.6127316,"lon":20.777416,"tags":{"amenity":"pharmacy","name":"Dallto"}}}'::jsonb, 'c4e2e3cfaa0a6cca71596645d753058764549685e8a5b0a020d3b83462412d7f', 'Dallto', 'dallto', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6127316, 20.777416, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:4ccbd303fd9a48a0e060bc4de5b6e41975f212bfceb1128c2704e16d9587ba7d'),
('osm:node:10082424895', 'https://www.openstreetmap.org/node/10082424895', '{"provider":"openstreetmap","element":{"type":"node","id":10082424895,"lat":40.6196918,"lon":20.7827623,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Dea","wheelchair":"no"}}}'::jsonb, '2759cd01adf9606289ba194b9b0e0f0e300bc15f61a2d6ecc0f786291b548a0e', 'Dea', 'dea', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6196918, 20.7827623, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:d3b359c1202795ed32acff619ad3959176610b597854a71aab63be54b31303b9');

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
