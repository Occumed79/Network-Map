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
('osm:node:7183733161', 'https://www.openstreetmap.org/node/7183733161', '{"provider":"openstreetmap","element":{"type":"node","id":7183733161,"lat":33.5950769,"lon":69.2270182,"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه عسکری"}}}'::jsonb, '5d694788f6f1ff29bf185ef7d5ba9efcf9785e4079a10500bb82725ccd63564e', 'شفاخانه عسکری', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.5950769, 69.2270182, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:74454dfaa239585418720294b9f1b8a0c6c2ae6b976ab61a945db96c4ef8691f'),
('osm:way:1360073109', 'https://www.openstreetmap.org/way/1360073109', '{"provider":"openstreetmap","element":{"type":"way","id":1360073109,"center":{"lat":34.5332628,"lon":69.1599189},"tags":{"addr:country":"AF","addr:county":"Shar Ara","addr:district":"district 7","addr:province":"Kabul","amenity":"hospital","healthcare":"hospital","level":"3","name":"شفاخانه علی آباد","name:en":"Ali Abad Hospital (Shahre Ara)","name:fa":"شفاخانه علی آباد","opening_hours":"24/7","operational_status":"Operational","operator:type":"public/government","source":"OSM"}}}'::jsonb, '08fde48eb49859da7c08d7dc5fb454b999806ca8f61fd5669443078026d347b1', 'شفاخانه علی آباد', NULL, NULL, 'Kabul', NULL, 'Kabul', NULL, 'AF', 34.5332628, 69.1599189, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:289ea33900ec3db9724e7f8e3c9ccb5ef3def8f06eab15aa7b2a49187742d831'),
('osm:node:8612132002', 'https://www.openstreetmap.org/node/8612132002', '{"provider":"openstreetmap","element":{"type":"node","id":8612132002,"lat":34.5048167,"lon":69.1334667,"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه علی سینا"}}}'::jsonb, 'aca843b7dfb7048d623c617f1ca7bfb6bca141ff5cf1e735559e619f0e2baf8d', 'شفاخانه علی سینا', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5048167, 69.1334667, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:454ed10574c5d1b32de134c3e5ba1c74a46f6ad9262689c86dcba372f3460db6'),
('osm:way:929491018', 'https://www.openstreetmap.org/way/929491018', '{"provider":"openstreetmap","element":{"type":"way","id":929491018,"center":{"lat":34.4792277,"lon":69.0662292},"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه غظنفر","name:en":"Ghazanfar Hospital","name:ru":"Газанфарская больница"}}}'::jsonb, 'e790d4fdc690700da2285b5428bf3236b4406205527f358eb5dadbcdb02a4952', 'شفاخانه غظنفر', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.4792277, 69.0662292, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:5bdd6121683a169f47dc5b534303929722e55df35509598969a540947def520c'),
('osm:way:991171093', 'https://www.openstreetmap.org/way/991171093', '{"provider":"openstreetmap","element":{"type":"way","id":991171093,"center":{"lat":34.5202531,"lon":69.1334499},"tags":{"addr:country":"AF","addr:county":"Kart-e-Sakhi","addr:district":"District 3","addr:province":"Kabul","amenity":"hospital","healthcare":"hospital","level":"2","name":"شفاخانه فرانسوی برای اطفال","name:en":"French Medical Institute for Children","opening_hours":"Sa-Th 08:00-04:00","operational_status":"Licensed","operator:type":"private/for-profit","phone":"+93 (0) 79 1070 000","website":"https://fmic.org.af","wikidata":"Q5501844","wikipedia":"en:French Medical Institute for Children"}}}'::jsonb, 'e44e40eb680b4bbcecdc0bca165faaa950ed008ad1431c926bb57b634ccec2b2', 'شفاخانه فرانسوی برای اطفال', NULL, NULL, 'Kabul', NULL, 'Kabul', NULL, 'AF', 34.5202531, 69.1334499, '+93 (0) 79 1070 000', 'https://fmic.org.af', NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:1d593af890ee48bca9857d3e6ad43e72fe1aead7e5273949eb7772c4c7b4e918'),
('osm:node:8489154319', 'https://www.openstreetmap.org/node/8489154319', '{"provider":"openstreetmap","element":{"type":"node","id":8489154319,"lat":34.5728698,"lon":69.122414,"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه فیضی"}}}'::jsonb, 'd367d895a5968b3f5180283544cbfde85955e50c106aced1fde42d525b439dc0', 'شفاخانه فیضی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5728698, 69.122414, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:4ddd70e97f7a98add6b207c9ed2e1c242ffc7afbb072cb202b0dfdd2aa9cd863'),
('osm:node:13917991103', 'https://www.openstreetmap.org/node/13917991103', '{"provider":"openstreetmap","element":{"type":"node","id":13917991103,"lat":34.9378669,"lon":61.7759817,"tags":{"amenity":"hospital","name":"شفاخانه قره باغ"}}}'::jsonb, 'c0c6b486254a57a16f5336f0ecc2f37807f8420011a56b46acc328702c8049a0', 'شفاخانه قره باغ', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.9378669, 61.7759817, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:b406154d6e9fcc41b3816c2fb8ac2a49ea9316c7075361abc803a4a71ad82b64'),
('osm:node:5700163285', 'https://www.openstreetmap.org/node/5700163285', '{"provider":"openstreetmap","element":{"type":"node","id":5700163285,"lat":36.7160949,"lon":67.1037101,"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه كيشا فارابي","name:en":"kesha HealthCare"}}}'::jsonb, '539094dab5e056cfb903b63916f65f8e8143c366911853fa6997b926825ed3d4', 'شفاخانه كيشا فارابي', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.7160949, 67.1037101, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:48b8ae4011ed6fbd42d82e08b127f4d0f59d2842210ef0fc7ef95d15c4eabbe3'),
('osm:node:13919206202', 'https://www.openstreetmap.org/node/13919206202', '{"provider":"openstreetmap","element":{"type":"node","id":13919206202,"lat":34.3482114,"lon":62.2017659,"tags":{"amenity":"hospital","name":"شفاخانه کمپلکس مفید"}}}'::jsonb, '7d6ac8794f1522795367990f4b7dee03d869ca413899f6197617b5ea1b239f0e', 'شفاخانه کمپلکس مفید', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.3482114, 62.2017659, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:1e3727660e9fa3d4ca27e5403987e144dafa5cd03f4c40315bd85a209c6f992f'),
('osm:node:13919213501', 'https://www.openstreetmap.org/node/13919213501', '{"provider":"openstreetmap","element":{"type":"node","id":13919213501,"lat":34.3483374,"lon":62.2025008,"tags":{"amenity":"hospital","name":"شفاخانه کمپلکس مفید"}}}'::jsonb, 'dab1c3e1e16b478e9b95f097c4567730f1c34e2065bb72e378e1a5e3cf0c3b61', 'شفاخانه کمپلکس مفید', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.3483374, 62.2025008, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:c0b9cc6e91c31d37815ef991946bc77088033c1fe714f834d21f5b32cc1e3cfc'),
('osm:way:820182567', 'https://www.openstreetmap.org/way/820182567', '{"provider":"openstreetmap","element":{"type":"way","id":820182567,"center":{"lat":34.5099551,"lon":69.1265537},"tags":{"amenity":"hospital","building":"yes","healthcare":"hospital","name":"شفاخانه لقمان حکیم"}}}'::jsonb, 'b6a834769e9c55b54c566c6a88a0eb9df8a6885c6b7dfa7f6f24bc14a61400e2', 'شفاخانه لقمان حکیم', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5099551, 69.1265537, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:dc7c55642d090cedef97d95a005b4a5119457c089a690efe9092d13411d86cba'),
('osm:way:366017288', 'https://www.openstreetmap.org/way/366017288', '{"provider":"openstreetmap","element":{"type":"way","id":366017288,"center":{"lat":34.5241074,"lon":69.2036791},"tags":{"addr:country":"AF","addr:county":"Macroryan","addr:district":"district 16","addr:province":"Kabul","amenity":"hospital","building":"yes","healthcare":"hospital","level":"1","name":"شفاخانه مدرن امید","name:en":"Modern Omed Hospital","opening_hours":"24/7","operational_status":"Licensed","source":"OSM"}}}'::jsonb, '8c7b28544b016a2f37e95caaac62049ad16ef35129204f7cb10689df44dfbcbc', 'شفاخانه مدرن امید', NULL, NULL, 'Kabul', NULL, 'Kabul', NULL, 'AF', 34.5241074, 69.2036791, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:54b5ddcf2dae72c2e5a5172a24033c66693ed2e7ad3c594e1625eac566155209'),
('osm:node:8133079048', 'https://www.openstreetmap.org/node/8133079048', '{"provider":"openstreetmap","element":{"type":"node","id":8133079048,"lat":34.5050643,"lon":69.133442,"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه مدرن کریمی مدیکل کامپلکس"}}}'::jsonb, '257de4fdbcb126546d439e83fdaf7a9cf76b8b67d42397f870af3ddc045bac20', 'شفاخانه مدرن کریمی مدیکل کامپلکس', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5050643, 69.133442, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:8ab73900f63b0b53e8b54594e7762953989e72c5eb9a270b3910d3668033adbd'),
('osm:way:831155979', 'https://www.openstreetmap.org/way/831155979', '{"provider":"openstreetmap","element":{"type":"way","id":831155979,"center":{"lat":34.5570517,"lon":69.1400045},"tags":{"addr:city":"كابل","amenity":"hospital","building":"yes","emergency":"no","healthcare":"hospital","name":"شفاخانه مرکزی کیشا"}}}'::jsonb, '855db3de9a90b0695986a1f3959bc096e6fde4cdc263a0d2643a1f6172d7c2c1', 'شفاخانه مرکزی کیشا', NULL, NULL, 'كابل', 'كابل', NULL, NULL, 'AF', 34.5570517, 69.1400045, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:757bf8819ac20eea592f50da7f890196432b81b8d343c3b62b895f68f943af59'),
('osm:way:713802110', 'https://www.openstreetmap.org/way/713802110', '{"provider":"openstreetmap","element":{"type":"way","id":713802110,"center":{"lat":34.3502492,"lon":62.2023991},"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه مرکزی هرات","name:en":"Herat Central Hospital","name:ru":"Центральная Больница Герата"}}}'::jsonb, '6787497cbe3fdc527cd333b97da7c96bd0d4511ca98956eb0590ea52dfbaa129', 'شفاخانه مرکزی هرات', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.3502492, 62.2023991, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:fe0ef1b329332edd861c9f1c211b5860610f8851a7d0d8cfa770c153a772bfff'),
('osm:node:7418934986', 'https://www.openstreetmap.org/node/7418934986', '{"provider":"openstreetmap","element":{"type":"node","id":7418934986,"lat":34.5569677,"lon":69.1399508,"tags":{"addr:city":"كابل","amenity":"hospital","healthcare":"hospital","name":"شفاخانه معالجوی آریانا دانشمل"}}}'::jsonb, 'eedbc7ff6dc78f171251b2f92e793367784b9d698b011703d4dd1028393c278d', 'شفاخانه معالجوی آریانا دانشمل', NULL, NULL, 'كابل', 'كابل', NULL, NULL, 'AF', 34.5569677, 69.1399508, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:c7cf3b007692e98be3ad29edfbe6ca72bd3ce51d41b55f96dce66aa3084db86d'),
('osm:node:8027544381', 'https://www.openstreetmap.org/node/8027544381', '{"provider":"openstreetmap","element":{"type":"node","id":8027544381,"lat":34.5120168,"lon":69.1683483,"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه معالجوی بستردار نوی لقمان حکیم"}}}'::jsonb, '63c3905003b37963bd3355428e023ad83571de7094537953321c9cd350c620ac', 'شفاخانه معالجوی بستردار نوی لقمان حکیم', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5120168, 69.1683483, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:69fd6abc99f5eee850ea254290e52ecacb0a3a37dfebce1b377c8b48d7923bfa'),
('osm:node:8439930429', 'https://www.openstreetmap.org/node/8439930429', '{"provider":"openstreetmap","element":{"type":"node","id":8439930429,"lat":34.500724,"lon":69.1387726,"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه معالجوی تاج","name:en":"Taj Medical Hospital"}}}'::jsonb, 'b6807533700ed3c5a3819bccab5be7ca7e7b1e9758062ec3e72176b32c6267a5', 'شفاخانه معالجوی تاج', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.500724, 69.1387726, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:8c913779c308ce1ea67cca9c2f1bf27c567191a53f4eedb23fb5f2d13f748054'),
('osm:node:7183733166', 'https://www.openstreetmap.org/node/7183733166', '{"provider":"openstreetmap","element":{"type":"node","id":7183733166,"lat":33.6302278,"lon":69.2303706,"tags":{"amenity":"hospital","name":"شفاخانه معالجوی رحمن"}}}'::jsonb, 'ba198ae2ce3a33f56af1a213f0aaebb29ffb591109d6bef8c47824001eec43db', 'شفاخانه معالجوی رحمن', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.6302278, 69.2303706, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:76fc087a902bff81225420f6b69a34d40688e4cc29fe5d8b4d026a70c216d7f2'),
('osm:way:820174743', 'https://www.openstreetmap.org/way/820174743', '{"provider":"openstreetmap","element":{"type":"way","id":820174743,"center":{"lat":34.5340524,"lon":69.1381957},"tags":{"amenity":"hospital","building":"hospital","building:levels":"7","healthcare":"hospital","name":"شفاخانه معالجوی سیتی","name:en":"City Medical Center"}}}'::jsonb, '42064f9ed468ded948c35e31198a13a78b5993fba17c0451cdb5413ab58fb5f7', 'شفاخانه معالجوی سیتی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5340524, 69.1381957, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:d5d4ab223c94534b9e667035cf9b7a73a67b3815a87059089c9029df8efdbe86'),
('osm:node:7183733169', 'https://www.openstreetmap.org/node/7183733169', '{"provider":"openstreetmap","element":{"type":"node","id":7183733169,"lat":33.6228978,"lon":69.2294759,"tags":{"amenity":"hospital","name":"شفاخانه معالجوی کیمزشفا"}}}'::jsonb, 'c268f81beed535dfb767f58deb3c461635010b6a4cd32e737f3801f25f1b0f53', 'شفاخانه معالجوی کیمزشفا', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.6228978, 69.2294759, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:f383f211b6b7495f95edd66e7c4876c17d1fe3e894260ab772dd8da6b9527f2c'),
('osm:way:577639525', 'https://www.openstreetmap.org/way/577639525', '{"provider":"openstreetmap","element":{"type":"way","id":577639525,"center":{"lat":34.5015384,"lon":69.0816968},"tags":{"addr:city":"کابل","addr:housenumber":"123","addr:street":"سرک بابه مزاری","amenity":"hospital","email":"yahya.mohaqeq@gmail.com","healthcare":"hospital","name":"شفاخانه معالجوی وطن","name:en":"Watan Hospital"}}}'::jsonb, '3489025ae1cdff3d670f68943ec3a67693474bbd23c1880a16708ae7b23b4450', 'شفاخانه معالجوی وطن', NULL, '123 سرک بابه مزاری', '123 سرک بابه مزاری, کابل', 'کابل', NULL, NULL, 'AF', 34.5015384, 69.0816968, NULL, NULL, 'yahya.mohaqeq@gmail.com', 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:d980b4a0a3cc54e4755fa6b1b2ec06e0f846be6c5c0bdd6f628ba00ae462d0a8'),
('osm:node:7183733168', 'https://www.openstreetmap.org/node/7183733168', '{"provider":"openstreetmap","element":{"type":"node","id":7183733168,"lat":33.6249604,"lon":69.2276852,"tags":{"amenity":"hospital","name":"شفاخانه معتادین"}}}'::jsonb, 'ad86d4ff53384c4e00c67a458fe3ef7523713496ad982a9f76999bf42966ec76', 'شفاخانه معتادین', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.6249604, 69.2276852, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:2e8950bd403b9388fd5c0882307273b8d279c757e2e08930122da9d16083af42'),
('osm:node:7183733160', 'https://www.openstreetmap.org/node/7183733160', '{"provider":"openstreetmap","element":{"type":"node","id":7183733160,"lat":33.5985331,"lon":69.225555,"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه ملکی"}}}'::jsonb, 'fbd0e79de116e6e52702daa437c3706d49064724accbd4a2c22cb86877328c63', 'شفاخانه ملکی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.5985331, 69.225555, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:aae83cf303cf91822842276f192c46535cf3abd36d05bc4bddb35a7ea3dc2da2'),
('osm:node:13919825002', 'https://www.openstreetmap.org/node/13919825002', '{"provider":"openstreetmap","element":{"type":"node","id":13919825002,"lat":34.3641792,"lon":62.1918642,"tags":{"amenity":"hospital","name":"شفاخانه مهربان"}}}'::jsonb, '9fff3b923841dcaa47ca4a51542735f662c3c2b4647f94d9b78e19f4580ee1a7', 'شفاخانه مهربان', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.3641792, 62.1918642, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:a3e4ddecbf2a63f56bc294ffa683c9883d7acfa7c2910ed32e7f1ff0cb6aed2b'),
('osm:node:11221694623', 'https://www.openstreetmap.org/node/11221694623', '{"provider":"openstreetmap","element":{"type":"node","id":11221694623,"lat":35.9485117,"lon":68.7124287,"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه نساجی و پوهنتون حکیم سنایی"}}}'::jsonb, '3227183804b0d4c9f171c7667ee2278515b70745cab8be986b7770fc45fefc74', 'شفاخانه نساجی و پوهنتون حکیم سنایی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 35.9485117, 68.7124287, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:0ac06f6f16c0f159186ccaa5f51c461a33723df5b977e43737ce28130c6f914f'),
('osm:way:1344507406', 'https://www.openstreetmap.org/way/1344507406', '{"provider":"openstreetmap","element":{"type":"way","id":1344507406,"center":{"lat":34.3261214,"lon":62.217922},"tags":{"amenity":"hospital","name":"شفاخانه نور","name:fa":"بیمارستان نور"}}}'::jsonb, '9b47810dd90fb4b13993c604c8a1d3ee6dd9d7c101a2e33d727e6d569aca3cce', 'شفاخانه نور', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.3261214, 62.217922, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:81585e35cf553c6d5a186762bc49d33ccbcd2f6fdb7a704045fc6b70ea860c63'),
('osm:node:7183733165', 'https://www.openstreetmap.org/node/7183733165', '{"provider":"openstreetmap","element":{"type":"node","id":7183733165,"lat":33.5945039,"lon":69.2285349,"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه هیواد فیضی"}}}'::jsonb, '5013b9f070b6972e67ab5af6ea0d62db3422e8f4b6b7cd1571cdfa29ea60a206', 'شفاخانه هیواد فیضی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.5945039, 69.2285349, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:c91572dc3a0383f319659f694350ba707afd81be3b7343376b626908a8fd3030'),
('osm:node:8838139281', 'https://www.openstreetmap.org/node/8838139281', '{"provider":"openstreetmap","element":{"type":"node","id":8838139281,"lat":36.2670062,"lon":68.0133425,"tags":{"amenity":"clinic","healthcare":"clinic","name":"طبابت یونانی"}}}'::jsonb, '3ad9a583960aa137d6fc9d49c9053799d72025f032d4859971e00aca2e9de64f', 'طبابت یونانی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2670062, 68.0133425, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:d152ab836553454dc2357ef5c0ee1aef182b8c12ff82b1e7c54e89165cc92607'),
('osm:node:8838139283', 'https://www.openstreetmap.org/node/8838139283', '{"provider":"openstreetmap","element":{"type":"node","id":8838139283,"lat":36.2684887,"lon":68.0185146,"tags":{"amenity":"clinic","healthcare":"clinic","name":"طبابت یونایی سید محمدمخدوم سادات"}}}'::jsonb, '99dcbf2146bcd742eb709194bec0b93074999c69559300d187cdab628684f1e9', 'طبابت یونایی سید محمدمخدوم سادات', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2684887, 68.0185146, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:a7beea2cd546aa451b7e5e032ae22a714ee9a8c00d5f8b2198139bbbc9618aee'),
('osm:node:8838139308', 'https://www.openstreetmap.org/node/8838139308', '{"provider":"openstreetmap","element":{"type":"node","id":8838139308,"lat":36.266708,"lon":68.011462,"tags":{"amenity":"clinic","healthcare":"clinic","name":"طبی لابراتوار"}}}'::jsonb, 'a6f40f9b5a8de740e114ca84d5eda98e9a90cb3835fd4d4d1bee3d139bd05517', 'طبی لابراتوار', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.266708, 68.011462, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:beed1cdedb89f42922dcaa7b39ba8d77bd68aa1ebaa59781e6de5fea46199c1e'),
('osm:node:1524295334', 'https://www.openstreetmap.org/node/1524295334', '{"provider":"openstreetmap","element":{"type":"node","id":1524295334,"lat":34.2147872,"lon":70.8067767,"tags":{"amenity":"hospital","name":"غني خېل روغتون","name:en":"Ghani kheel Health Hospital","name:ps":"غني خېل روغتون"}}}'::jsonb, '245862c11b216b79b0d56db348e0818fcdbf8f1cbce8cc74598f9f146aa4fc4a', 'غني خېل روغتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.2147872, 70.8067767, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:23f73fc162e8b07a590b6a58e7e4823ab756ae4b01cf46165969228db09e1025'),
('osm:node:8838139304', 'https://www.openstreetmap.org/node/8838139304', '{"provider":"openstreetmap","element":{"type":"node","id":8838139304,"lat":36.2660322,"lon":68.0109699,"tags":{"amenity":"clinic","healthcare":"clinic","name":"فواد دیجیتال اکسری"}}}'::jsonb, 'a179ada1fd51ffb4f64055e05db1c1142811fa5eb8a8588672c1ff41cd5c5f73', 'فواد دیجیتال اکسری', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2660322, 68.0109699, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:e118d56ba8de8f1c4c16ab8e4ba2ed92a37a67bbc8fe47457ca4bb80ce919ebb'),
('osm:node:8838139287', 'https://www.openstreetmap.org/node/8838139287', '{"provider":"openstreetmap","element":{"type":"node","id":8838139287,"lat":36.2653464,"lon":68.0119646,"tags":{"amenity":"clinic","healthcare":"clinic","name":"قابله دیپلومه"}}}'::jsonb, '498df68a8a0ef7fcf9a7d71dca6d0aa4bd381c276632b0e193712ba87c0080db', 'قابله دیپلومه', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2653464, 68.0119646, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:f2c4d1b2ae716a76828a19244185ab433537a1c31dce7601617d7ddaac045303'),
('osm:node:6363455859', 'https://www.openstreetmap.org/node/6363455859', '{"provider":"openstreetmap","element":{"type":"node","id":6363455859,"lat":36.703622,"lon":67.1098036,"tags":{"addr:street":"كوچه ١٨ چمن","amenity":"dentist","healthcare":"dentist","name":"كلينيك دندان غفوري","name:en":"Ghafoory Dental Clinic","opening_hours":"Mo - Th 08:00 - 19:00, Sa - Su 08:00 - 19:00","phone":"+93 050 204 7845","website":"https://dtghafoory.business.site/"}}}'::jsonb, '6f0c8f6318ccba9aacc851b88af771bc8437cc8384380aabbab52cbc2b8b37af', 'كلينيك دندان غفوري', NULL, 'كوچه ١٨ چمن', 'كوچه ١٨ چمن', NULL, NULL, NULL, 'AF', 36.703622, 67.1098036, '+93 050 204 7845', 'https://dtghafoory.business.site/', NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:8596d0460e02583ada4371744803dd75f2c848583612bf6b7f4e9574a935d113'),
('osm:node:8442131363', 'https://www.openstreetmap.org/node/8442131363', '{"provider":"openstreetmap","element":{"type":"node","id":8442131363,"lat":36.7101352,"lon":67.130548,"tags":{"addr:street":"آدرس: سرك دوم تخنيكم، مقابل ليسه افغان- ترك، مزار شريف، افغانستان","amenity":"dentist","description":"https://www.facebook.com/Refahdental/","email":"refahdental@Gmail.com","healthcare":"clinic","healthcare:speciality":"dentist","name":"كلينيك دندانپزشکی رفاه","name:en":"Refah Dental Clinic","name:ru":"Рефах","opening_hours":"Sa-Th 09:00-19:00","phone":"شماره هاى تماس: ٠٧٨٦٧٣٤٠٧٣ - ٠٥٠٢٠٤٧٦٦٧"}}}'::jsonb, '086ca925d9f973404a5eb48fb3f07a5f9cafa25aea88f07a442626383a7b5b18', 'كلينيك دندانپزشکی رفاه', NULL, 'آدرس: سرك دوم تخنيكم، مقابل ليسه افغان- ترك، مزار شريف، افغانستان', 'آدرس: سرك دوم تخنيكم، مقابل ليسه افغان- ترك، مزار شريف، افغانستان', NULL, NULL, NULL, 'AF', 36.7101352, 67.130548, 'شماره هاى تماس: ٠٧٨٦٧٣٤٠٧٣ - ٠٥٠٢٠٤٧٦٦٧', NULL, 'refahdental@Gmail.com', 'dental', ARRAY['dental', 'general_practitioner']::text[], 0.86, 'loc:fd66a81b94f024bac9d0f5d1bbf2e44f3e0ff1c69055b75611768a7445ac5fe2'),
('osm:node:8654648615', 'https://www.openstreetmap.org/node/8654648615', '{"provider":"openstreetmap","element":{"type":"node","id":8654648615,"lat":34.5530852,"lon":69.1629074,"tags":{"amenity":"dentist","healthcare":"dentist","level":"2","name":"کلبنیک دندان داکتر فریده ذبیح حبیبی"}}}'::jsonb, '3d898cbd1f12a648bb2a103b6cc27aa238e8a4b6bb7d41f3347d245a1ad03353', 'کلبنیک دندان داکتر فریده ذبیح حبیبی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5530852, 69.1629074, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:de31222bb6dcc23ce9dd4c7e43768f745790b49429dc7c853db64df71bf40aa0'),
('osm:way:526295957', 'https://www.openstreetmap.org/way/526295957', '{"provider":"openstreetmap","element":{"type":"way","id":526295957,"center":{"lat":34.2900432,"lon":69.1471512},"tags":{"addr:postcode":"1451","amenity":"hospital","name":"کلنیک سقیدسنګ"}}}'::jsonb, '8f93d2d6669a6eaa2b31b41bbd034498798cc34d1ace0bf1e2d9f9bc693242df', 'کلنیک سقیدسنګ', NULL, NULL, '1451', NULL, NULL, '1451', 'AF', 34.2900432, 69.1471512, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:ee3e689ef546cd6b5330b2434929fbb513e1dcc2d90dc27eb020364f4ed344aa'),
('osm:node:5973860643', 'https://www.openstreetmap.org/node/5973860643', '{"provider":"openstreetmap","element":{"type":"node","id":5973860643,"lat":34.4995883,"lon":69.0637156,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلنیک عالمی","name:en":"Alime Clinic"}}}'::jsonb, '2cb78464c1143625234e68157ed6f7177fdc7b90282b9462a5d3020572faed97', 'کلنیک عالمی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.4995883, 69.0637156, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:8e5e2920947450e769c97b324222877847e41e2b99aed2c0d2a7304482986791'),
('osm:node:13306163142', 'https://www.openstreetmap.org/node/13306163142', '{"provider":"openstreetmap","element":{"type":"node","id":13306163142,"lat":31.5404064,"lon":62.7316659,"tags":{"addr:street":"Mazat","amenity":"clinic","healthcare":"clinic","name":"کلنیک مازات"}}}'::jsonb, 'b57ac19ef93e7de45c7a212ea09608cd39ea2b23b8ab94ae0014a73e69c39a1d', 'کلنیک مازات', NULL, 'Mazat', 'Mazat', NULL, NULL, NULL, 'AF', 31.5404064, 62.7316659, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:657a257b6506e6da0272f4e1e0933f017ff5718454647e1dcd78952431c6e319'),
('osm:way:530370234', 'https://www.openstreetmap.org/way/530370234', '{"provider":"openstreetmap","element":{"type":"way","id":530370234,"center":{"lat":34.2042069,"lon":69.085572},"tags":{"amenity":"hospital","healthcare":"hospital","name":"کلنیک محمدآغه"}}}'::jsonb, '41473fb1c757a33621610f7a33464acb35870ccfbcddae42be3b4b3c8d0b8df1', 'کلنیک محمدآغه', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.2042069, 69.085572, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:903a39c108f3b81a78f8f36292df9ccae65cfaa6db469063261b1de6962e4aae'),
('osm:way:526307259', 'https://www.openstreetmap.org/way/526307259', '{"provider":"openstreetmap","element":{"type":"way","id":526307259,"center":{"lat":34.2338892,"lon":69.1119939},"tags":{"amenity":"hospital","emergency":"yes","name":"کلنیګ شفیق الله لودین"}}}'::jsonb, 'd851f02fe1b5410702fad5ad3c1ecfd58ece9be707fd6b5f92d1599808e0efb2', 'کلنیګ شفیق الله لودین', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.2338892, 69.1119939, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:ea673847d22f795d996315ddeb60370a518f923bcaf706207a7ef77782653aa9'),
('osm:way:1011967172', 'https://www.openstreetmap.org/way/1011967172', '{"provider":"openstreetmap","element":{"type":"way","id":1011967172,"center":{"lat":31.6169249,"lon":65.6263228},"tags":{"amenity":"hospital","healthcare":"hospital","name":"کلينيک"}}}'::jsonb, '95f11813556abe9a092c755e53ef5d227ac84b497bf44e8c18a4ee92962804e8', 'کلينيک', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 31.6169249, 65.6263228, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:9fc83b00458804a47248731eaf4da01cb06265e6a0dd287eb8acdd6179da37e8'),
('osm:node:8415150483', 'https://www.openstreetmap.org/node/8415150483', '{"provider":"openstreetmap","element":{"type":"node","id":8415150483,"lat":34.5440191,"lon":69.1670606,"tags":{"amenity":"dentist","healthcare":"dentist","name":"کلینبک دندان هلال"}}}'::jsonb, '5bf7c9ba8f2b0242c97f54c7b63c660d13154a2edba68bc3fe45d134a0d1d9ca', 'کلینبک دندان هلال', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5440191, 69.1670606, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:4d11d165f7623618e7921eeca8f4356b898ee941af3654d8530fae9472fc4874'),
('osm:node:6557777927', 'https://www.openstreetmap.org/node/6557777927', '{"provider":"openstreetmap","element":{"type":"node","id":6557777927,"lat":34.3478612,"lon":62.1854202,"tags":{"amenity":"hospital","healthcare":"hospital","name":"کلینک عبیدی","name:en":"Clinic Obaidi"}}}'::jsonb, '9cb1606dfea14d7516bc30da3c2d7211a82230e8b941eabaa9f54566714669d1', 'کلینک عبیدی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.3478612, 62.1854202, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:1c9348c23818065053f56012a0d26c85de03a3a4b6141f04628e97b487ba3ddc'),
('osm:way:892961348', 'https://www.openstreetmap.org/way/892961348', '{"provider":"openstreetmap","element":{"type":"way","id":892961348,"center":{"lat":34.3728336,"lon":69.3962198},"tags":{"amenity":"clinic","building":"yes","healthcare":"clinic","healthcare:speciality":"general","name":"کلینک ولسوالی خاکجبار","name:en":"Clinic Khaki Jabbar","opening_hours":"sunrise-sunset"}}}'::jsonb, '0565605b9292e8da25824f52af19474134416e4eeaf5221e022a61d498c16e66', 'کلینک ولسوالی خاکجبار', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.3728336, 69.3962198, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:db9eef41d39aef1681f9a274dea434fc7a901af702ff93621d59198295261832'),
('osm:node:7049643089', 'https://www.openstreetmap.org/node/7049643089', '{"provider":"openstreetmap","element":{"type":"node","id":7049643089,"lat":34.5440099,"lon":69.1408561,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلینیک آینه صحت"}}}'::jsonb, 'c47ac29cec6aaf1f0f6c3f3c636f70c89e56e713d7b88e002d5ce8d481effa88', 'کلینیک آینه صحت', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5440099, 69.1408561, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:63f113191bced208eb1a3ecd8024e5099b0102c0cfd382d71adc6114f414977b'),
('osm:node:10081953715', 'https://www.openstreetmap.org/node/10081953715', '{"provider":"openstreetmap","element":{"type":"node","id":10081953715,"lat":34.4355029,"lon":70.4372772,"tags":{"amenity":"clinic","healthcare:speciality":"orthopaedics","name":"کلینیک ارتوپدی فیضی","name:en":"Faizi Orthopedic Clinic"}}}'::jsonb, '586c8a4fd1eb497246ffcbd366820428eac4388dfd1db2bf977469a00aecfddc', 'کلینیک ارتوپدی فیضی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.4355029, 70.4372772, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner', 'specialist']::text[], 0.78, 'loc:9c07eba535a8c4f42942d291150938b0442ee09765196a79d2eb33b929d095de'),
('osm:way:1213996633', 'https://www.openstreetmap.org/way/1213996633', '{"provider":"openstreetmap","element":{"type":"way","id":1213996633,"center":{"lat":33.2244805,"lon":67.3605862},"tags":{"amenity":"clinic","building":"yes","healthcare":"clinic","name":"کلینیک المیتو","name:en":"Almito"}}}'::jsonb, '310ff591ce237f8a476b0b986edde646b6597711d4e5ac3f128fa273f48fc7bb', 'کلینیک المیتو', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.2244805, 67.3605862, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:8bfa05f9d351d1f3424fe0c218422f2018e6b70673aab2270e7b1b6c6993b039'),
('osm:way:779265879', 'https://www.openstreetmap.org/way/779265879', '{"provider":"openstreetmap","element":{"type":"way","id":779265879,"center":{"lat":32.941638,"lon":67.5301199},"tags":{"amenity":"clinic","building":"yes","healthcare":"clinic","name":"کلینیک انگوری"}}}'::jsonb, '37bffb46e9dfff9ab4dae56634d22b32b25ddfbd167fb83a8899b09b359cd6c6', 'کلینیک انگوری', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 32.941638, 67.5301199, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:227d5fd4914ef4e81b29421388674bd043c9f7e93bd518681fbc680c691f0fff');

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
