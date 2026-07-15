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
('osm:node:5527425689', 'https://www.openstreetmap.org/node/5527425689', '{"provider":"openstreetmap","element":{"type":"node","id":5527425689,"lat":40.9941549,"lon":19.5330758,"tags":{"amenity":"dentist","name":"Gorreja"}}}'::jsonb, '30ba36981368dcb6dcc80a8a95bcab23302a0fc886a910e9eef9690d38914b6b', 'Gorreja', 'gorreja', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9941549, 19.5330758, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:7ad15d29a60ee6a787446d4edb0b32837588c2b0504163827adaf6a48e0d2300'),
('osm:node:6806452482', 'https://www.openstreetmap.org/node/6806452482', '{"provider":"openstreetmap","element":{"type":"node","id":6806452482,"lat":41.3395861,"lon":19.8292628,"tags":{"addr:street":"Rruga Bardhyl","amenity":"dentist","healthcare":"dentist","name":"Grafi Dentare"}}}'::jsonb, 'be018d309c6872e1d915744a1e635b414be3c7f5b93400e1fda7c8f77d771c64', 'Grafi Dentare', 'grafi dentare', 'Rruga Bardhyl', 'Rruga Bardhyl', NULL, NULL, NULL, 'AL', 41.3395861, 19.8292628, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:b776127d622e4717db9736722d5ea2f749de5998a9fe67b5169d84f9f5c13bfa'),
('osm:node:6845643723', 'https://www.openstreetmap.org/node/6845643723', '{"provider":"openstreetmap","element":{"type":"node","id":6845643723,"lat":40.4642204,"lon":19.489964,"tags":{"addr:street":"Rruga Pavarësia","amenity":"dentist","healthcare":"dentist","name":"Grafi Dentare"}}}'::jsonb, 'cae4008554004240a07f6fe1de2ccabb5714a0f16405999f308b9184ee3c62a8', 'Grafi Dentare', 'grafi dentare', 'Rruga Pavarësia', 'Rruga Pavarësia', NULL, NULL, NULL, 'AL', 40.4642204, 19.489964, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:ebc2b1b1e25ddac5a4a47765ce1c14c5784886d8e6914509976d0cab88036c7a'),
('osm:node:10654126117', 'https://www.openstreetmap.org/node/10654126117', '{"provider":"openstreetmap","element":{"type":"node","id":10654126117,"lat":41.331059,"lon":19.8348736,"tags":{"addr:housenumber":"1","addr:street":"Rruga Bajram Curri","amenity":"dentist","check_date":"2024-07-14","contact:email":"grafibrryli@gmail.com","description":"3D grafi dentare brryli\n\nSherbimet:\n\nScaner 3D\nScaner 3D 1/2\nScaner sinusi\nPanoramex\nPanoramex 1/2\nCefalometri\nGrafi sinusi\nGrafi artikulacioni\nGrafi dore","healthcare":"dentist","healthcare:speciality":"stomatology","internet_access":"no","name":"Grafi Dentare Brryli","payment:cards":"no","payment:credit_cards":"no","payment:debit_cards":"no","phone":"0693793593","source":"local knowledge","wheelchair":"no"}}}'::jsonb, 'f176b75dcd0f2d5b581a6a123eab29611fd2e7b18a748695307009cbde86e000', 'Grafi Dentare Brryli', 'grafi dentare brryli', '1 Rruga Bajram Curri', '1 Rruga Bajram Curri', NULL, NULL, NULL, 'AL', 41.331059, 19.8348736, '0693793593', NULL, 'grafibrryli@gmail.com', 'dental', ARRAY['dental']::text[], 0.86, 'loc:51238f9abb157f8eaaf2d92dc70b5cc91f5e5eca8329888f9407b2840836413b'),
('osm:node:8746917941', 'https://www.openstreetmap.org/node/8746917941', '{"provider":"openstreetmap","element":{"type":"node","id":8746917941,"lat":42.0745964,"lon":19.5147322,"tags":{"amenity":"dentist","name":"Grafi Dentare Kurtaj","payment:coins":"yes","payment:credit_cards":"no","payment:cryptocurrencies":"no","payment:debit_cards":"no","payment:electronic_purses":"no","payment:notes":"yes","smoking":"outside","source":"bing","source_ref:url":"https://www.flickr.com/photos/134902422@N04/map?&fLat=41.9559&fLon=19.4337&zl=11&order_by=recent","wheelchair":"limited"}}}'::jsonb, 'a1b2f5fc51ddfe7a262bc4966cecc944b33987cb61c22f7177b010d62ed5f149', 'Grafi Dentare Kurtaj', 'grafi dentare kurtaj', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0745964, 19.5147322, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:26cbc6ff3ae8f8735a704e3946d5f0c1d147136fba6280bbc28cdc8a7913bd4b'),
('osm:node:6621162457', 'https://www.openstreetmap.org/node/6621162457', '{"provider":"openstreetmap","element":{"type":"node","id":6621162457,"lat":40.7228003,"lon":19.556427,"tags":{"amenity":"dentist","name":"Grafi Dentare Sirona"}}}'::jsonb, '41bb6a1ea644fc80d7630d746ad8851e58212589c2cd99739829928c2fda35fa', 'Grafi Dentare Sirona', 'grafi dentare sirona', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7228003, 19.556427, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:9c693be110718f9377a9791e943284f04ec2f77215111ed06268147bb474d8f9'),
('osm:node:13830568191', 'https://www.openstreetmap.org/node/13830568191', '{"provider":"openstreetmap","element":{"type":"node","id":13830568191,"lat":40.9379202,"lon":19.7070559,"tags":{"amenity":"doctors","healthcare":"doctor","healthcare:speciality":"radiology","name":"Grafi Digitale Ani"}}}'::jsonb, 'b23a354fff4d0eed0d79cf124aaa253a85e3761826b81bc332e3e879318c6a00', 'Grafi Digitale Ani', 'grafi digitale ani', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9379202, 19.7070559, NULL, NULL, NULL, 'imaging', ARRAY['imaging', 'general_practitioner']::text[], 0.78, 'loc:02f6083cfdc60475cf9498d27d1fdc147d1d9edd5fd70e503e374f251faaa969'),
('osm:node:4538201290', 'https://www.openstreetmap.org/node/4538201290', '{"provider":"openstreetmap","element":{"type":"node","id":4538201290,"lat":41.3235881,"lon":19.8058335,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Grand Farma"}}}'::jsonb, '10ee847562e0283d50a7be179c91cb1822dd013ed801e4c48671f4802cd39649', 'Grand Farma', 'grand farma', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3235881, 19.8058335, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:45bc169f573075dd184f400bd1cceaaf2b613980821a6605d0d3d2d46e147ca0'),
('osm:node:6861407289', 'https://www.openstreetmap.org/node/6861407289', '{"provider":"openstreetmap","element":{"type":"node","id":6861407289,"lat":40.465094,"lon":19.4848861,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Green"}}}'::jsonb, '75b2adb24fbfd3215ce451654d9cf1e1c9c9238664eb40f0e6b2ea69d5baa213', 'Green', 'green', NULL, NULL, NULL, NULL, NULL, 'AL', 40.465094, 19.4848861, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:46842cff00466fb690bbd9339f75cc6b0c9e14fda58c2cf76f86af2b5d1da3f8'),
('osm:node:9161308417', 'https://www.openstreetmap.org/node/9161308417', '{"provider":"openstreetmap","element":{"type":"node","id":9161308417,"lat":41.1156727,"lon":20.078201,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Gurabardhi"}}}'::jsonb, '14197993a4cbb78553bde1d26f3411fbf5745c693268f7990e14350eba0fb3f2', 'Gurabardhi', 'gurabardhi', NULL, NULL, NULL, NULL, NULL, 'AL', 41.1156727, 20.078201, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:f8f3cffdbf1f73551edd354556c71f3f1282c659718d4c1d99370a154c606e2b'),
('osm:way:533363338', 'https://www.openstreetmap.org/way/533363338', '{"provider":"openstreetmap","element":{"type":"way","id":533363338,"center":{"lat":41.3178203,"lon":19.8089586},"tags":{"addr:city":"Tiranë","addr:street":"Grigor Heba","building":"yes","building:levels":"4","healthcare":"clinic","healthcare:speciality":"gynaecology","name":"Gynäkologie","office":"physician","source":"bing;mapbox;digitalglobe-satellite","source_ref:url":"https://www.flickr.com/photos/openstreetmap-albania/"}}}'::jsonb, '8f7b55d448f479039fa393bcef4b4dfd23c6f01fb5fcefd84e17690256d7e006', 'Gynäkologie', 'gyn kologie', 'Grigor Heba', 'Grigor Heba, Tiranë', 'Tiranë', NULL, NULL, 'AL', 41.3178203, 19.8089586, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:74a9fb1d0a4ea40f448dc84509c400a5399d9fa35de8d01a6fe7a705d461fca8'),
('osm:node:6864253934', 'https://www.openstreetmap.org/node/6864253934', '{"provider":"openstreetmap","element":{"type":"node","id":6864253934,"lat":41.3266435,"lon":19.8263016,"tags":{"addr:street":"Bulevardi Zhan d''Ark","amenity":"pharmacy","healthcare":"pharmacy","name":"Halili"}}}'::jsonb, '4a5bd94edaafb8b254c1c58b14b28ce7c30d9d7d0043739dfefec262df283f04', 'Halili', 'halili', 'Bulevardi Zhan d''Ark', 'Bulevardi Zhan d''Ark', NULL, NULL, NULL, 'AL', 41.3266435, 19.8263016, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:f386398cf4f4d7ef896ee3d3c90c1d4619c62341812d52482bfcce900cb9fadb'),
('osm:way:1176245303', 'https://www.openstreetmap.org/way/1176245303', '{"provider":"openstreetmap","element":{"type":"way","id":1176245303,"center":{"lat":41.4490391,"lon":19.7625672},"tags":{"addr:city":"Nikël","addr:postcode":"1504","addr:street":"Distretto di croia","amenity":"pharmacy","building":"yes","healthcare":"pharmacy","name":"haxhi doku","opening_hours":"sunrise-sunset"}}}'::jsonb, '0fa1e79d2e648ad1e01ea481dee1d312c36bf1a3ca36682ee1790dc886d2bc8f', 'haxhi doku', 'haxhi doku', 'Distretto di croia', 'Distretto di croia, Nikël, 1504', 'Nikël', NULL, '1504', 'AL', 41.4490391, 19.7625672, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:b4bb48375ca9fd6f2344d417db1c155713580ff04434763ee3d13ff768929e76'),
('osm:node:9856281304', 'https://www.openstreetmap.org/node/9856281304', '{"provider":"openstreetmap","element":{"type":"node","id":9856281304,"lat":40.5088114,"lon":20.9285643,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Helptika"}}}'::jsonb, '0f72f4b0d4d53a6dc26340cf91f3c69260f68d91401f792b6098e7bbf64c6b47', 'Helptika', 'helptika', NULL, NULL, NULL, NULL, NULL, 'AL', 40.5088114, 20.9285643, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:12c461c12bb0a72fb69a3876b805a11f09986da1a5aae0e1c07a2ecc4fb2719e'),
('osm:node:4579869250', 'https://www.openstreetmap.org/node/4579869250', '{"provider":"openstreetmap","element":{"type":"node","id":4579869250,"lat":41.3403541,"lon":19.8337922,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Hematologjia","phone":"+35542349496","website":"https://www.qsut.gov.al/index.php/sherbimet-mjekesore/sherbimi-i-hematologjise/sherbimet-e-ofruara/"}}}'::jsonb, 'f63cab40dee50b7354d214645a1c4a86db41ad33bf6074d6b2170cd0636a7232', 'Hematologjia', 'hematologjia', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3403541, 19.8337922, '+35542349496', 'https://www.qsut.gov.al/index.php/sherbimet-mjekesore/sherbimi-i-hematologjise/sherbimet-e-ofruara/', NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:aa61832a1c3cdd99ed31d21c61243de0174cc358fca3abef63d193817a6d919c'),
('osm:node:4966516922', 'https://www.openstreetmap.org/node/4966516922', '{"provider":"openstreetmap","element":{"type":"node","id":4966516922,"lat":41.5158835,"lon":19.790498,"tags":{"healthcare":"yes","healthcare:speciality":"diagnostic_radiology","name":"Herri"}}}'::jsonb, '6a0d4cdaf60efd45c5ea09ff8767ebe9592a88d4f6c1db589a3bcf6cb873016d', 'Herri', 'herri', NULL, NULL, NULL, NULL, NULL, 'AL', 41.5158835, 19.790498, NULL, NULL, NULL, 'lab', ARRAY['lab', 'imaging']::text[], 0.78, 'loc:e164fafa46cdedd53e763ec69e70163432ea3884031963bc6a53b16d199c663d'),
('osm:node:6372228307', 'https://www.openstreetmap.org/node/6372228307', '{"provider":"openstreetmap","element":{"type":"node","id":6372228307,"lat":40.6129968,"lon":20.7775835,"tags":{"healthcare":"laboratory","name":"Hipokratio","opening_hours":"Mo-Fr 08:00-16:00; Sa 08:00-13:00; Su off","wheelchair":"no"}}}'::jsonb, '0ff1f3240a6a1a6077cec9a2da49e390afcc5bc3c18b09be78baffe88ee58c44', 'Hipokratio', 'hipokratio', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6129968, 20.7775835, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:481b4727d06ad8b6834027948d5f474b78a853bbfab4d54efc30c6d73afca75d'),
('osm:node:6841226985', 'https://www.openstreetmap.org/node/6841226985', '{"provider":"openstreetmap","element":{"type":"node","id":6841226985,"lat":41.3254981,"lon":19.81553,"tags":{"addr:street":"Rruga Myslym Shyri","amenity":"pharmacy","check_date":"2024-06-11","healthcare":"pharmacy","name":"Hobdari"}}}'::jsonb, 'ddf2e82b563aa3256880d8eab53ce669b11f81153cba48c7b73d28f2fd1add56', 'Hobdari', 'hobdari', 'Rruga Myslym Shyri', 'Rruga Myslym Shyri', NULL, NULL, NULL, 'AL', 41.3254981, 19.81553, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:6f5c91d04d9b020ecc4cb6b6307cc884742f4a1db9cffb1f95315ca1e35a8a2e'),
('osm:node:8741194874', 'https://www.openstreetmap.org/node/8741194874', '{"provider":"openstreetmap","element":{"type":"node","id":8741194874,"lat":42.0581821,"lon":19.5113486,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Home Dent","wheelchair":"limited"}}}'::jsonb, '1321349a3ac354e5b655aeebf9271ce10d10395486ff26ac894a260d891c8cbf', 'Home Dent', 'home dent', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0581821, 19.5113486, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:d27ba5209dc172978bdac139ec999c5a65bbf0c057ece31792916b63c14c313f'),
('osm:node:10860326972', 'https://www.openstreetmap.org/node/10860326972', '{"provider":"openstreetmap","element":{"type":"node","id":10860326972,"lat":41.3392645,"lon":19.7915279,"tags":{"addr:city":"Tirana","addr:street":"Rruga Gjergj Legisi","amenity":"dentist","healthcare":"dentist","name":"House of Implants"}}}'::jsonb, '4c8c0d7d4db917b59e39e2c0289e109c7a0837e8381e20f2f532fb87c2975854', 'House of Implants', 'house of implants', 'Rruga Gjergj Legisi', 'Rruga Gjergj Legisi, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3392645, 19.7915279, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:9e7147d158ad6004cdfc07e9ffa76d50f7465cc6cc59a6a78fadd3902ab0778f'),
('osm:way:1268266144', 'https://www.openstreetmap.org/way/1268266144', '{"provider":"openstreetmap","element":{"type":"way","id":1268266144,"center":{"lat":41.3444895,"lon":19.7743087},"tags":{"addr:city":"Tirana","addr:housenumber":"4","addr:street":"Rruga Prishtina","amenity":"hospital","emergency":"yes","healthcare":"hospital","name":"Hygeia Hospital","phone":"+35542390000","website":"https://hygeia.al/"}}}'::jsonb, 'f225ca59525f431026bfc67f9639c16ff7376926e07cfebdccb953daa6aa0661', 'Hygeia Hospital', 'hygeia hospital', '4 Rruga Prishtina', '4 Rruga Prishtina, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3444895, 19.7743087, '+35542390000', 'https://hygeia.al/', NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:e62cd2a012839cdc713f7c0bf65fa9d89e12052a3d1fa89025d6fa079cc8d889'),
('osm:node:6853928447', 'https://www.openstreetmap.org/node/6853928447', '{"provider":"openstreetmap","element":{"type":"node","id":6853928447,"lat":41.3168978,"lon":19.4517723,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Hyra"}}}'::jsonb, '2e5ee8e1156f4d779f887e0e262fe92527579c0437b9592ac14088ac7b1f271f', 'Hyra', 'hyra', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3168978, 19.4517723, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:9a9595f39f2740830d44077a2ae02c7c670ba0e982e23fc742dfc25d458ae82d'),
('osm:node:3835803357', 'https://www.openstreetmap.org/node/3835803357', '{"provider":"openstreetmap","element":{"type":"node","id":3835803357,"lat":41.3466311,"lon":19.8380625,"tags":{"addr:city":"Tiranë","addr:postcode":"1001","amenity":"dentist","name":"Hysko Dental","opening_hours":"Mo-Sa 08:00-12:00, 14:00-20:00"}}}'::jsonb, 'b0a3ae236aba471f958cc4a0e26a271c1023f974f39c6eea0a2da83eda7b2eb1', 'Hysko Dental', 'hysko dental', NULL, 'Tiranë, 1001', 'Tiranë', NULL, '1001', 'AL', 41.3466311, 19.8380625, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:cbc09d83b68f498d8511fdb7cd8856f208e353b9536d756cba0e0e8f0b604c5d'),
('osm:node:4539321602', 'https://www.openstreetmap.org/node/4539321602', '{"provider":"openstreetmap","element":{"type":"node","id":4539321602,"lat":42.0736417,"lon":19.5216704,"tags":{"healthcare":"laboratory","name":"Ida"}}}'::jsonb, '68bfef8b57a5b2137ce5d02825c3414db99209b48e866dc593ed663789c75ae7', 'Ida', 'ida', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0736417, 19.5216704, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:b9f665192445cf31480caeefcb4899073c87fd6e3a797e935c88d2c55187b1d6'),
('osm:node:11107198647', 'https://www.openstreetmap.org/node/11107198647', '{"provider":"openstreetmap","element":{"type":"node","id":11107198647,"lat":41.3306508,"lon":19.8132368,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Idea Farm"}}}'::jsonb, 'f27af2ce0597e3edbb04587bbd184fdc73e8a99b9b7f5c2c028cc1b797481ea3', 'Idea Farm', 'idea farm', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3306508, 19.8132368, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:847b54bc6a6f6e6407d3b17ac996c429b2f56dc716bbe552c247794146488dcc'),
('osm:node:9153939728', 'https://www.openstreetmap.org/node/9153939728', '{"provider":"openstreetmap","element":{"type":"node","id":9153939728,"lat":40.7043623,"lon":19.9541905,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Igli"}}}'::jsonb, 'dfe96789db805582d3a6ad23a9b5db5b7c0e9f50411a469a383c547be10e9a66', 'Igli', 'igli', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7043623, 19.9541905, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:a131d0ee4ee125d706e5bcc3de1f590de397a7c4ba9d77ab4f45ad8a9594d261'),
('osm:node:4639499129', 'https://www.openstreetmap.org/node/4639499129', '{"provider":"openstreetmap","element":{"type":"node","id":4639499129,"lat":41.3377159,"lon":19.832346,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Ikeda"}}}'::jsonb, 'ebc9b0b2808eb845d9b776aba7f737be3cd102fdd099ca3e1144b8b61cb17b1a', 'Ikeda', 'ikeda', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3377159, 19.832346, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:47c5319b56831aae1d7fc067632fc89f1601443a4a61062c13f75479e655c9b8'),
('osm:node:7021797564', 'https://www.openstreetmap.org/node/7021797564', '{"provider":"openstreetmap","element":{"type":"node","id":7021797564,"lat":40.7263774,"lon":19.5548969,"tags":{"amenity":"dentist","name":"Il Dent","phone":"+355686282605"}}}'::jsonb, 'a29907f68dfc5f2ce8a39d95ca154b200915227e55e8c6500f3ca8c915194eca', 'Il Dent', 'il dent', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7263774, 19.5548969, '+355686282605', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:26077a199c9a6a7a8f78f80c0ab62bb5b81d6c49c1fb87caccc7a0c183c3a4d6'),
('osm:node:6370673093', 'https://www.openstreetmap.org/node/6370673093', '{"provider":"openstreetmap","element":{"type":"node","id":6370673093,"lat":40.6142535,"lon":20.7793894,"tags":{"amenity":"doctors","healthcare":"doctor","healthcare:speciality":"otolaryngology","level":"1","name":"Il Medica","phone":"+355 82 244 641","wheelchair":"no"}}}'::jsonb, '22c97f0c1c1c6633a51d171b68900d3de0628e56eb62e5aa35e552c4114c92f0', 'Il Medica', 'il medica', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6142535, 20.7793894, '+355 82 244 641', NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:471e21ce288d531e6fcb9f37eb1f0bb7d08c5eacb864ccab0d5663fd91e187fe'),
('osm:node:9536060479', 'https://www.openstreetmap.org/node/9536060479', '{"provider":"openstreetmap","element":{"type":"node","id":9536060479,"lat":41.3302055,"lon":19.8199464,"tags":{"amenity":"pharmacy","check_date":"2024-06-17","dispensing":"yes","healthcare":"pharmacy","name":"Ilda","wheelchair":"limited"}}}'::jsonb, 'd2f8985289a5891c8f74754ab8226d0cb38643aee1612e9dd1c951d79288600e', 'Ilda', 'ilda', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3302055, 19.8199464, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:0e6a4a4fda6a929965a2ab910e26ef70331a74d9ec0b79dd2cffc266dc0c5c19'),
('osm:node:11228875775', 'https://www.openstreetmap.org/node/11228875775', '{"provider":"openstreetmap","element":{"type":"node","id":11228875775,"lat":41.3444163,"lon":19.8412424,"tags":{"amenity":"pharmacy","name":"Iluminapharma"}}}'::jsonb, 'ccddb8cc8cf9fb7d7c1079be74f07ffc0d694acee082fbe8ff9b5dada7b647f2', 'Iluminapharma', 'iluminapharma', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3444163, 19.8412424, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:b7e75066dd4be346c5c1beebfbe2bbee11ed32f951455aa82e2136f5e1211b02'),
('osm:node:10900343789', 'https://www.openstreetmap.org/node/10900343789', '{"provider":"openstreetmap","element":{"type":"node","id":10900343789,"lat":41.3428083,"lon":19.8007178,"tags":{"addr:city":"Tirana","addr:street":"Rruga Don Bosko","amenity":"pharmacy","healthcare":"pharmacy","name":"IluminaPharma"}}}'::jsonb, 'f0c5dc29916d1f5072827fc0f2b83104bdb8a288cc40379ec2f8a5d0d84de39d', 'IluminaPharma', 'iluminapharma', 'Rruga Don Bosko', 'Rruga Don Bosko, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3428083, 19.8007178, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:7c0c110c2f4056cdaf2ae4a087d8123d8914ea0af8ad16d96cb1c280b52908c3'),
('osm:node:3387400129', 'https://www.openstreetmap.org/node/3387400129', '{"provider":"openstreetmap","element":{"type":"node","id":3387400129,"lat":42.0745284,"lon":19.5244387,"tags":{"amenity":"doctors","name":"Imazheria","wheelchair":"limited"}}}'::jsonb, '097165bfb504244759c9482e62231f2dfc2138eb26bfe090d2790383068ddd1a', 'Imazheria', 'imazheria', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0745284, 19.5244387, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:5542ad5fce20a3a42c31c6870ced4f5b12af3df38f4669250bfbe65d408f3d82'),
('osm:node:6380808095', 'https://www.openstreetmap.org/node/6380808095', '{"provider":"openstreetmap","element":{"type":"node","id":6380808095,"lat":40.6132166,"lon":20.7837351,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Imena","opening_hours":"Mo-Su 08:30-21:00","wheelchair":"yes"}}}'::jsonb, '0b71057d3e59d03a6639c2c5f826c36bb663561ac02fc19a6071b47ff0b3744b', 'Imena', 'imena', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6132166, 20.7837351, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:fb08010cbcbb70f4399607be9f43668548596ee102e99cb3bfc7eaeb44a41f81'),
('osm:node:9822402414', 'https://www.openstreetmap.org/node/9822402414', '{"provider":"openstreetmap","element":{"type":"node","id":9822402414,"lat":40.6146467,"lon":20.77972,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Imena","wheelchair":"no"}}}'::jsonb, '83a635c4828485d9d0627b928e75e577c645ab002c802f1b7ab1374cef3d0ccb', 'Imena', 'imena', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6146467, 20.77972, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:e94414aa4a7b15538cee708dbacec01c746d318c99eec5080d4047e395891a78'),
('osm:node:4539916532', 'https://www.openstreetmap.org/node/4539916532', '{"provider":"openstreetmap","element":{"type":"node","id":4539916532,"lat":41.3239278,"lon":19.8061397,"tags":{"addr:city":"Tirana","addr:street":"Rruga Myslym Shyri","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Imi Farma"}}}'::jsonb, '5d280b53c5276847d2f4bdcdd97f8d9e074c1f7f937a3b8fe1411fce947ba46f', 'Imi Farma', 'imi farma', 'Rruga Myslym Shyri', 'Rruga Myslym Shyri, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3239278, 19.8061397, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:bb644f4bc9f936c73ed43f052a66db99dc1569e43cc7325f6340e1e3ae7a1275'),
('osm:node:13938507225', 'https://www.openstreetmap.org/node/13938507225', '{"provider":"openstreetmap","element":{"type":"node","id":13938507225,"lat":41.3195525,"lon":19.8167673,"tags":{"amenity":"dentist","check_date":"2026-06-14","healthcare":"dentist","name":"Indrizi Dental Clinic"}}}'::jsonb, '67d2d3cff03e24a1b800867f103091cfdaf48d0c161244a4ba85371a04216379', 'Indrizi Dental Clinic', 'indrizi dental clinic', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3195525, 19.8167673, NULL, NULL, NULL, 'dental', ARRAY['dental', 'general_practitioner']::text[], 0.78, 'loc:6a0ad0923d7c928dd6a1d37a7e5c9bf2a9ce8b7d3c25a511a6b994fc83e118c5'),
('osm:way:1322946997', 'https://www.openstreetmap.org/way/1322946997', '{"provider":"openstreetmap","element":{"type":"way","id":1322946997,"center":{"lat":40.4779199,"lon":19.4996475},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Infektivi"}}}'::jsonb, 'f49f3c76061ea5ae1370e7e6a09a701f8297f6ec6056c42a5c06c86d56f8c043', 'Infektivi', 'infektivi', NULL, NULL, NULL, NULL, NULL, 'AL', 40.4779199, 19.4996475, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:65cf44d6c950627e387762a23f5e017db1601c4d403bd7bf3f6c5ec1371136ef'),
('osm:node:12158284528', 'https://www.openstreetmap.org/node/12158284528', '{"provider":"openstreetmap","element":{"type":"node","id":12158284528,"lat":41.3393431,"lon":19.8340819,"tags":{"addr:city":"Tirana","amenity":"clinic","healthcare":"clinic","name":"Instituti i Mjekësisë Ligjore","website":"https://mjekesialigjore.gov.al/"}}}'::jsonb, '3ddcee66e1e14d0b20fb4698d162a12a9430fe426f82f07535c5d5a9c0092ec1', 'Instituti i Mjekësisë Ligjore', 'instituti i mjek sis ligjore', NULL, 'Tirana', 'Tirana', NULL, NULL, 'AL', 41.3393431, 19.8340819, NULL, 'https://mjekesialigjore.gov.al/', NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:5aa3bf959a91fbd00847a7e75fb078b754663ff3113d3eac50e548d1bac73a8f'),
('osm:node:4549925245', 'https://www.openstreetmap.org/node/4549925245', '{"provider":"openstreetmap","element":{"type":"node","id":4549925245,"lat":41.3218808,"lon":19.8237524,"tags":{"addr:street":"Rruga Ismail Qemali","amenity":"pharmacy","healthcare":"pharmacy","name":"intermed - Distributor Farmacie"}}}'::jsonb, '8bbcf659640056d06eb190fdd77b48bcd9fa9093332490717efd92e1e5e67b59', 'intermed - Distributor Farmacie', 'intermed distributor farmacie', 'Rruga Ismail Qemali', 'Rruga Ismail Qemali', NULL, NULL, NULL, 'AL', 41.3218808, 19.8237524, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:88189af7a3099701ba259c961717e197a78e92b8ca0d90a01cc4c0816c3d3165'),
('osm:node:11215357367', 'https://www.openstreetmap.org/node/11215357367', '{"provider":"openstreetmap","element":{"type":"node","id":11215357367,"lat":41.330519,"lon":19.8221099,"tags":{"check_date":"2023-09-24","healthcare":"laboratory","level":"0","name":"Intermedica"}}}'::jsonb, '1b001f9d3eedf800668006b4fa49ba29fec3a2d7087c7dc6384f17df5a762ed9', 'Intermedica', 'intermedica', NULL, NULL, NULL, NULL, NULL, 'AL', 41.330519, 19.8221099, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:06e850db5bdd7be2bc4c2e9a66e6a2dbbce8fa9e4a62e04fad9f40b638176864'),
('osm:node:11495576820', 'https://www.openstreetmap.org/node/11495576820', '{"provider":"openstreetmap","element":{"type":"node","id":11495576820,"lat":41.326045,"lon":19.8038442,"tags":{"check_date":"2024-01-05","healthcare":"laboratory","name":"Intermedica"}}}'::jsonb, '28c85e4a65c6a83643c2dd82deacedd5a49d1b07abca36c6f3d4c2e82593949a', 'Intermedica', 'intermedica', NULL, NULL, NULL, NULL, NULL, 'AL', 41.326045, 19.8038442, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:16a4b9f204518e7864831e60e2c4bb617918be970165778cbcda45cd11721859'),
('osm:node:13105987787', 'https://www.openstreetmap.org/node/13105987787', '{"provider":"openstreetmap","element":{"type":"node","id":13105987787,"lat":41.3389617,"lon":19.8379728,"tags":{"healthcare":"laboratory","name":"Intermedica"}}}'::jsonb, '6dd2d7e1233767d7ab2c4bafe7c7118649e78757fc81d771388e716b1b85791b', 'Intermedica', 'intermedica', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3389617, 19.8379728, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:c026be54451813b49462c7048cdac9ac8fb1f6dea6a501f4c4003cc04602394b'),
('osm:node:13448146078', 'https://www.openstreetmap.org/node/13448146078', '{"provider":"openstreetmap","element":{"type":"node","id":13448146078,"lat":41.3311536,"lon":19.837126,"tags":{"check_date":"2026-01-11","healthcare":"laboratory","name":"Intermedica","name:sq":"Intermedica"}}}'::jsonb, 'ae68cc991ca9e731125132681a1a300d0c0f9093e6caa59d1114a904f1dfe6d4', 'Intermedica', 'intermedica', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3311536, 19.837126, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:2a7cb8915c8fcf6d4ac05583f56c725f6e8c37c96d78220028b6cb07fb74eaa9'),
('osm:node:7783418506', 'https://www.openstreetmap.org/node/7783418506', '{"provider":"openstreetmap","element":{"type":"node","id":7783418506,"lat":41.3358472,"lon":19.8172417,"tags":{"addr:city":"Tirana","addr:street":"Rruga e Barrikadave","amenity":"clinic","healthcare":"clinic","healthcare:speciality":"general","name":"Intermedica"}}}'::jsonb, '81fe80fe1c0c13212aa1680a32a4c4389261956b965af04a1e57eae2ee42d23d', 'Intermedica', 'intermedica', 'Rruga e Barrikadave', 'Rruga e Barrikadave, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3358472, 19.8172417, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:cd0037d7579d3ec6afc40f74f97ce0c1b9c4f550117b67c3272e7405cb186a46'),
('osm:node:9826051464', 'https://www.openstreetmap.org/node/9826051464', '{"provider":"openstreetmap","element":{"type":"node","id":9826051464,"lat":40.613539,"lon":20.7763617,"tags":{"amenity":"clinic","healthcare":"clinic","healthcare:speciality":"cardiology;gynaecology;neurology;orthopaedics;paediatrics","name":"Intermedica","opening_hours":"Mo-Sa 08:00-18:00; Su off"}}}'::jsonb, '390cb571d0afd24d94113ca6a4dfade8c7b47b48d4c2602d3516da7bbc172ce6', 'Intermedica', 'intermedica', NULL, NULL, NULL, NULL, NULL, 'AL', 40.613539, 20.7763617, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner', 'specialist']::text[], 0.78, 'loc:716bca12168bcc4dcf776a89213e1d37fc0c8a28e49ca8136844175ef5bbfa68'),
('osm:node:9839269330', 'https://www.openstreetmap.org/node/9839269330', '{"provider":"openstreetmap","element":{"type":"node","id":9839269330,"lat":40.6237302,"lon":20.7815952,"tags":{"healthcare":"laboratory","name":"Intermedical-Lab"}}}'::jsonb, 'df8bfa14fbcfceab414c8cd07fd995263c1cdc2453517ac0a468e7103db61fe3', 'Intermedical-Lab', 'intermedical lab', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6237302, 20.7815952, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:d9d6f2ced21e08dafb7a21a741067fc54261dffbc86f7b9d46ce2c6d1861e538'),
('osm:node:6883651948', 'https://www.openstreetmap.org/node/6883651948', '{"provider":"openstreetmap","element":{"type":"node","id":6883651948,"lat":41.3215443,"lon":19.8190825,"tags":{"addr:street":"Rruga Donika Kastrioti","amenity":"clinic","healthcare":"clinic","name":"International Turkish Hospital"}}}'::jsonb, 'f66721e56eceb7d2742f22fe29907776fa3eac9c5d2c5c0b7528b757610d32c8', 'International Turkish Hospital', 'international turkish hospital', 'Rruga Donika Kastrioti', 'Rruga Donika Kastrioti', NULL, NULL, NULL, 'AL', 41.3215443, 19.8190825, NULL, NULL, NULL, 'hospital', ARRAY['hospital', 'general_practitioner']::text[], 0.86, 'loc:28cd64118ec5d61e11a9fe0aae31c4ba1a2d40b84afb48e127275c78db782b86'),
('osm:node:3820715681', 'https://www.openstreetmap.org/node/3820715681', '{"provider":"openstreetmap","element":{"type":"node","id":3820715681,"lat":42.072423,"lon":19.5149038,"tags":{"amenity":"dentist","name":"inxhi Dental","opening_hours":"Mo-Su 08:00-15:00","wheelchair":"limited"}}}'::jsonb, '27ef45ac89125a2d299e798cee1353fc5a4b49b5e336bacf052ea179b0df9ccc', 'inxhi Dental', 'inxhi dental', NULL, NULL, NULL, NULL, NULL, 'AL', 42.072423, 19.5149038, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:1081807e97c28245cdb843593c16254c0ee68c5088a4af430fe6e50081f8a87e'),
('osm:node:7021796950', 'https://www.openstreetmap.org/node/7021796950', '{"provider":"openstreetmap","element":{"type":"node","id":7021796950,"lat":40.7264541,"lon":19.5551736,"tags":{"amenity":"pharmacy","name":"Irda"}}}'::jsonb, 'a6acdb2622b4ed59c76c53b7a1253d8bf34bb45c97ce4465fa9a0a34cbcbebf2', 'Irda', 'irda', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7264541, 19.5551736, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:c7237e42c3f82c1bef62fcef07c3fddfc8e7a3270934fb919917d2b12c5f50ad');

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
