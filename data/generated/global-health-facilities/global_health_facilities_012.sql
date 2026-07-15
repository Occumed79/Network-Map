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
('osm:node:8892314246', 'https://www.openstreetmap.org/node/8892314246', '{"provider":"openstreetmap","element":{"type":"node","id":8892314246,"lat":40.0831332,"lon":20.1424064,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Iren"}}}'::jsonb, '107c591eb75bb591681db214dd1e7f1132591074ea49dc7036e0588a3539057d', 'Iren', 'iren', NULL, NULL, NULL, NULL, NULL, 'AL', 40.0831332, 20.1424064, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:642d34ab859019fe6bcb7917eeb63d9844e51149b6b57c0858041a37b4cfae3b'),
('osm:node:4533935330', 'https://www.openstreetmap.org/node/4533935330', '{"provider":"openstreetmap","element":{"type":"node","id":4533935330,"lat":41.3398426,"lon":19.8290029,"tags":{"amenity":"pharmacy","check_date":"2024-05-12","healthcare":"pharmacy","name":"Irena"}}}'::jsonb, '35b8d1d41c14ddae0b63b353a3f3af9fe813c0965ccec8e6a1f8c90a3e2cb2f9', 'Irena', 'irena', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3398426, 19.8290029, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:76a2d5209598d26ca960e255ff6ac596e09b6716ba928c9af3ca74fbd8b6979e'),
('osm:node:6857511086', 'https://www.openstreetmap.org/node/6857511086', '{"provider":"openstreetmap","element":{"type":"node","id":6857511086,"lat":41.3019187,"lon":19.4982979,"tags":{"amenity":"pharmacy","name":"Isaku"}}}'::jsonb, 'ba5bdbd7191cd604c2dbe540fb072924588da0f9eeddd704a5b4c1c9b08e5773', 'Isaku', 'isaku', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3019187, 19.4982979, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:876d627812167df640f8df3e61168609030837312e073bc5565d1373f870c3d7'),
('osm:way:506268260', 'https://www.openstreetmap.org/way/506268260', '{"provider":"openstreetmap","element":{"type":"way","id":506268260,"center":{"lat":40.4940292,"lon":19.2814521},"tags":{"addr:city":"Sazan","amenity":"hospital","building":"yes","name":"Ish Spitali","name:en":"Old Hospital","name:mk":"Стара болница"}}}'::jsonb, 'fa11dca7cdddba2ea4b9b2b2afecb375801d527cda440d3fc84165031e64118b', 'Ish Spitali', 'ish spitali', NULL, 'Sazan', 'Sazan', NULL, NULL, 'AL', 40.4940292, 19.2814521, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:eda9c5feacfcaccca404231be38a99d6665b103cb5bd4ce7f3589f4df60d3d23'),
('osm:node:8741103355', 'https://www.openstreetmap.org/node/8741103355', '{"provider":"openstreetmap","element":{"type":"node","id":8741103355,"lat":42.0576295,"lon":19.501183,"tags":{"amenity":"dentist","healthcare":"dentist","name":"ISHMAKU Dental","wheelchair":"limited"}}}'::jsonb, '849c2da45a2bb2168684d57741f9604f744e9ce4294009c7ce93066654d10727', 'ISHMAKU Dental', 'ishmaku dental', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0576295, 19.501183, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:854bade0677389b74bb2ef131b42e26f6a5ce85f24cf2046710fdc7ce1511b05'),
('osm:node:6858171688', 'https://www.openstreetmap.org/node/6858171688', '{"provider":"openstreetmap","element":{"type":"node","id":6858171688,"lat":41.3174829,"lon":19.449356,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Italfarma"}}}'::jsonb, '8c75e99c11b95103b3e869d9369fdf1b1fef017cfa13cf0bc8704d893119af11', 'Italfarma', 'italfarma', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3174829, 19.449356, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:4fae7fe4eee3462f5a150a291ac9ece40eae5cb093fd7cca4702e19d4f6bc09a'),
('osm:node:11463134827', 'https://www.openstreetmap.org/node/11463134827', '{"provider":"openstreetmap","element":{"type":"node","id":11463134827,"lat":41.325629,"lon":19.802147,"tags":{"amenity":"dentist","check_date":"2023-12-28","healthcare":"dentist","name":"Italia Dent"}}}'::jsonb, '0f685cbefae545a16b5cd1566ee6f34934a0d8528b2b4e43809b07b9fb43b795', 'Italia Dent', 'italia dent', NULL, NULL, NULL, NULL, NULL, 'AL', 41.325629, 19.802147, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:91f748f8f5f80bcd9d28fab2c681fbf4ddb296ea0a77f16f2acb99eb8305518c'),
('osm:node:12453469602', 'https://www.openstreetmap.org/node/12453469602', '{"provider":"openstreetmap","element":{"type":"node","id":12453469602,"lat":41.110415,"lon":20.0778431,"tags":{"addr:city":"Elbasan","addr:street":"Rruga Qemal Stafa","amenity":"pharmacy","contact:facebook":"https://www.facebook.com/italpharmaalbania#","dispensing":"yes","drive_through":"no","healthcare":"pharmacy","name":"Italpharma","opening_hours":"Mo-Su 08:00-20:00","phone":"+355695125967"}}}'::jsonb, '9ff1efb60f7c39c419954182ff2bdf195eca9638fdc180249bcba7ef58ab0835', 'Italpharma', 'italpharma', 'Rruga Qemal Stafa', 'Rruga Qemal Stafa, Elbasan', 'Elbasan', NULL, NULL, 'AL', 41.110415, 20.0778431, '+355695125967', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:37826a48c55f14a3afbd794c6942c97058ce7f6d4ca66b8d333767d5f6910746'),
('osm:node:11832245731', 'https://www.openstreetmap.org/node/11832245731', '{"provider":"openstreetmap","element":{"type":"node","id":11832245731,"lat":41.3204468,"lon":19.8039308,"tags":{"addr:housenumber":"38","addr:street":"Rruga 23","amenity":"dentist","healthcare":"dentist","name":"Jaku Dent"}}}'::jsonb, '1334ec21b5ad07c3739b0b675140383ba91c4e787fdb94709278772f6bbb02f0', 'Jaku Dent', 'jaku dent', '38 Rruga 23', '38 Rruga 23', NULL, NULL, NULL, 'AL', 41.3204468, 19.8039308, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:66b045a8a80ed1a17ecdf6095a5c6e08dc6f631578b0594b0106fe0af1b037fd'),
('osm:node:5508659912', 'https://www.openstreetmap.org/node/5508659912', '{"provider":"openstreetmap","element":{"type":"node","id":5508659912,"lat":40.9936466,"lon":19.53177,"tags":{"amenity":"pharmacy","name":"Jani Vodo"}}}'::jsonb, '399d6cec22815396df4f58bc113e4a61a0928d944a93776b8b1f116b0a389f10', 'Jani Vodo', 'jani vodo', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9936466, 19.53177, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:db108ff0063fac90b8e2371bf975f15c52101e9a00db087c677d0ee9680e09f6'),
('osm:node:6416400534', 'https://www.openstreetmap.org/node/6416400534', '{"provider":"openstreetmap","element":{"type":"node","id":6416400534,"lat":40.611106,"lon":20.7811734,"tags":{"amenity":"pharmacy","name":"Jatagani"}}}'::jsonb, 'a436040dfb14152c1cb4ee5f8a322c273c3da17a5a184182d7d75c675eb372b8', 'Jatagani', 'jatagani', NULL, NULL, NULL, NULL, NULL, 'AL', 40.611106, 20.7811734, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:f446d9f53bbdcfd227f939f929f141474872437bff535e4b570c35ca1770f150'),
('osm:node:6376221807', 'https://www.openstreetmap.org/node/6376221807', '{"provider":"openstreetmap","element":{"type":"node","id":6376221807,"lat":40.6213102,"lon":20.778924,"tags":{"alt_name":"Dr. Martini","amenity":"dentist","healthcare":"dentist","name":"Joana Dent","opening_hours":"Mo-Sa 08:00-13:00, 16:00-19:00; Su off","wheelchair":"no"}}}'::jsonb, '30b37ebe46565ec138010dfdbb8d896cab4fefa7fd659dd9bfb4e76197604a86', 'Joana Dent', 'joana dent', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6213102, 20.778924, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:15cb852e7b068a88f4c1bffc232a5543d9325b79790ff52f2c9b9d9238df2ddc'),
('osm:node:12921302572', 'https://www.openstreetmap.org/node/12921302572', '{"provider":"openstreetmap","element":{"type":"node","id":12921302572,"lat":40.6112557,"lon":20.7847878,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Jolié Clinic"}}}'::jsonb, 'c789acb6382c9eef71fb7c01755178e0a0d59dbd219dd94745b4d57bb5333139', 'Jolié Clinic', 'joli clinic', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6112557, 20.7847878, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:18f0af8d4574769d21108ff44e7bdb9b4b07c5102d39275c8b02b644f100c522'),
('osm:node:10707470780', 'https://www.openstreetmap.org/node/10707470780', '{"provider":"openstreetmap","element":{"type":"node","id":10707470780,"lat":41.3159976,"lon":19.7691719,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Jona Dent Clinic"}}}'::jsonb, '2098797baf54c57b9a7e4c24ad2e252900359550d5752802491516ad4324df3f', 'Jona Dent Clinic', 'jona dent clinic', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3159976, 19.7691719, NULL, NULL, NULL, 'dental', ARRAY['dental', 'general_practitioner']::text[], 0.78, 'loc:2fdd88750d03970545ea86b728a8c8136cb73d3eb3dcc8a62c4a397979fb676e'),
('osm:node:6419399912', 'https://www.openstreetmap.org/node/6419399912', '{"provider":"openstreetmap","element":{"type":"node","id":6419399912,"lat":40.6227264,"lon":20.7784396,"tags":{"amenity":"pharmacy","name":"Juli Farma","opening_hours":"Mo-Sa 09:00-14:00, 16:00-19:00; Su off","wheelchair":"no"}}}'::jsonb, '0b2e757bbb45b6353e794772fb6ce3541d89c520dcaf6ffcb8cf17841095fadd', 'Juli Farma', 'juli farma', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6227264, 20.7784396, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:41f16066f3bdde8a9650ed99d6be7ea789e6803f89cc4a18905f1cdaf9494741'),
('osm:node:9057207744', 'https://www.openstreetmap.org/node/9057207744', '{"provider":"openstreetmap","element":{"type":"node","id":9057207744,"lat":40.9390788,"lon":19.7065017,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Julian Tusha11"}}}'::jsonb, '067cb5d824b8363b101a20cb750d9d1ec714189de95024bc49e485be65e36029', 'Julian Tusha11', 'julian tusha11', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9390788, 19.7065017, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:9730461bf2af7fcd689f13df0487867615db850d8363b1607f1b9ab90d314784'),
('osm:node:6844863573', 'https://www.openstreetmap.org/node/6844863573', '{"provider":"openstreetmap","element":{"type":"node","id":6844863573,"lat":41.1884948,"lon":19.5584737,"tags":{"addr:street":"Rilindja","amenity":"dentist","name":"Kabineti Dental"}}}'::jsonb, 'a83973c1264bbe504a7f1427cefc60519261bcb0a1fd1ba70aa20104d09b4e3d', 'Kabineti Dental', 'kabineti dental', 'Rilindja', 'Rilindja', NULL, NULL, NULL, 'AL', 41.1884948, 19.5584737, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:78791f784652e3fcbd4f281cb1231705883bd2f2e8a4d51e393a9331e2b34df5'),
('osm:node:5922575600', 'https://www.openstreetmap.org/node/5922575600', '{"provider":"openstreetmap","element":{"type":"node","id":5922575600,"lat":41.3304632,"lon":19.822195,"tags":{"addr:housenumber":"26","addr:street":"Rruga Qemal Stafa","amenity":"pharmacy","check_date":"2022-10-14","healthcare":"pharmacy","name":"Kamel Farma"}}}'::jsonb, 'de973cb6a28306f8ee99ec80449551da8c18070a963f9b9c52100109fe1a5f34', 'Kamel Farma', 'kamel farma', '26 Rruga Qemal Stafa', '26 Rruga Qemal Stafa', NULL, NULL, NULL, 'AL', 41.3304632, 19.822195, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:291d1d664190c3f3af491d4ab0c2e656605007dce9e16864639b00ef6214f9b5'),
('osm:node:6762020886', 'https://www.openstreetmap.org/node/6762020886', '{"provider":"openstreetmap","element":{"type":"node","id":6762020886,"lat":41.3412642,"lon":19.8312196,"tags":{"addr:city":"Tirana","addr:street":"Rruga e Dibrës","amenity":"pharmacy","check_date":"2024-05-12","healthcare":"pharmacy","name":"Kamel Farma"}}}'::jsonb, 'd542ea807338c51e53e91460b7a39e1c5f64b4fa02b1d25a549b5e49b2c9a499', 'Kamel Farma', 'kamel farma', 'Rruga e Dibrës', 'Rruga e Dibrës, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3412642, 19.8312196, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:e815355a3bcee2bd0fec5af81452bc2ec4a0a41a5918598fa746c655775ba2bc'),
('osm:node:12997341996', 'https://www.openstreetmap.org/node/12997341996', '{"provider":"openstreetmap","element":{"type":"node","id":12997341996,"lat":41.3272215,"lon":19.8281167,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Kapsula","phone":"+355 69 611 1307"}}}'::jsonb, '5458d5ed176bf7f070a00839dedcf9813488a0827fd26916d1b7fa3b57b2c6c5', 'Kapsula', 'kapsula', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3272215, 19.8281167, '+355 69 611 1307', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:eab25fa0d3bf2a4f77dd27b045014c515fe223fc3cd1edcaa8f36c6e915402f5'),
('osm:node:12026476483', 'https://www.openstreetmap.org/node/12026476483', '{"provider":"openstreetmap","element":{"type":"node","id":12026476483,"lat":41.3302071,"lon":19.8051215,"tags":{"addr:city":"Tirana","addr:street":"Rruga Naim Frashëri","amenity":"dentist","healthcare":"dentist","healthcare:speciality":"orthodontics;stomatology","name":"Karcini Dent"}}}'::jsonb, 'f5eb7dd77d2672eeecfe5b0a6b3b7b4e3a204fd01f5d531d4cb2d6d7ce573886', 'Karcini Dent', 'karcini dent', 'Rruga Naim Frashëri', 'Rruga Naim Frashëri, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3302071, 19.8051215, NULL, NULL, NULL, 'dental', ARRAY['dental', 'specialist']::text[], 0.86, 'loc:89bf1c2504dcd9f4e704d325fd995779da85cd8d6d183fdc26bc45444bc92299'),
('osm:node:7021778348', 'https://www.openstreetmap.org/node/7021778348', '{"provider":"openstreetmap","element":{"type":"node","id":7021778348,"lat":40.7318858,"lon":19.5588416,"tags":{"amenity":"dentist","name":"Karçini Dent","phone":"+355692178916"}}}'::jsonb, 'a0e2e6bf791bbf0e3dec12929c631c051ddd3d67f7bb115e56da438d978b6316', 'Karçini Dent', 'kar ini dent', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7318858, 19.5588416, '+355692178916', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:64237298c428e843d472041a8231e3e0a8c37a8eb1c468ea4a46febe0064fe5a'),
('osm:node:4579869276', 'https://www.openstreetmap.org/node/4579869276', '{"provider":"openstreetmap","element":{"type":"node","id":4579869276,"lat":41.3408939,"lon":19.8336676,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Kardiokirurgjia - Kirurgjia Vaskulare","phone":"+35542349384;+35542349301"}}}'::jsonb, '6bd127e925e1a24d842596cb52784f2d5e986dfafbcefb8a602369301372f627', 'Kardiokirurgjia - Kirurgjia Vaskulare', 'kardiokirurgjia kirurgjia vaskulare', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3408939, 19.8336676, '+35542349384;+35542349301', NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:10974339f8a180845c0cfbd0952ca5044c813550dcc6eb3f6482b482f77c6b59'),
('osm:node:4579869251', 'https://www.openstreetmap.org/node/4579869251', '{"provider":"openstreetmap","element":{"type":"node","id":4579869251,"lat":41.34047,"lon":19.8337105,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Kardiologjia","phone":"+35542349346","website":"https://www.qsut.gov.al/index.php/sherbimet-mjekesore/sherbimi-i-kardiologjise-i/sherbimet-e-ofruara/"}}}'::jsonb, '2e867b7aa162a9b406ed905d8abb57b3af2724559c1152d3257a170c6048cb75', 'Kardiologjia', 'kardiologjia', NULL, NULL, NULL, NULL, NULL, 'AL', 41.34047, 19.8337105, '+35542349346', 'https://www.qsut.gov.al/index.php/sherbimet-mjekesore/sherbimi-i-kardiologjise-i/sherbimet-e-ofruara/', NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:16795f899bce19fef5c44f3285737023efbd497aae3d59bf87f7c47bf39c7d13'),
('osm:node:6838978111', 'https://www.openstreetmap.org/node/6838978111', '{"provider":"openstreetmap","element":{"type":"node","id":6838978111,"lat":41.3253533,"lon":19.4572994,"tags":{"addr:street":"Rruga Vëllazërimi","amenity":"pharmacy","healthcare":"pharmacy","name":"Kasa"}}}'::jsonb, 'a8d7e53ecf164cfe71f36e8ec498ef49ddb6fc1dda85f316c71eee329b7aff3e', 'Kasa', 'kasa', 'Rruga Vëllazërimi', 'Rruga Vëllazërimi', NULL, NULL, NULL, 'AL', 41.3253533, 19.4572994, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:edd6dd9bc695e0bc1638a564dcbfc2afdb908d4cdf71dfb20815b31fa0f9a1db'),
('osm:node:12095675771', 'https://www.openstreetmap.org/node/12095675771', '{"provider":"openstreetmap","element":{"type":"node","id":12095675771,"lat":41.3332487,"lon":19.8027811,"tags":{"addr:city":"Tirana","addr:housenumber":"1","addr:street":"Rruga Dritan Hoxha","amenity":"doctors","healthcare":"doctor","healthcare:speciality":"plastic_surgery","level":"2","name":"KEIT","website":"https://www.keit.al/"}}}'::jsonb, '5c4bf6fb7bf70f6294c5b2f45baa781803293c344588d4f1a3f2dea793a0d779', 'KEIT', 'keit', '1 Rruga Dritan Hoxha', '1 Rruga Dritan Hoxha, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3332487, 19.8027811, NULL, 'https://www.keit.al/', NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:ddab99591918de13a8bccac578b3415450c33012779b9f9b0ee915fb4d6d56e0'),
('osm:node:11335405678', 'https://www.openstreetmap.org/node/11335405678', '{"provider":"openstreetmap","element":{"type":"node","id":11335405678,"lat":41.3290462,"lon":19.829348,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Kejdi"}}}'::jsonb, '31ba95765b0d9492274b5874c649a47a63aa3f8d7f9a5f824abab591ac9d4739', 'Kejdi', 'kejdi', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3290462, 19.829348, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:01387a5dc2ac05e86e15a604b938011d5320fd87f5d7b5cea75902a2705aaa04'),
('osm:node:6858770415', 'https://www.openstreetmap.org/node/6858770415', '{"provider":"openstreetmap","element":{"type":"node","id":6858770415,"lat":41.2498574,"lon":19.5208745,"tags":{"addr:street":"Bulevardi i Pishave","amenity":"pharmacy","check_date":"2026-06-20","name":"Kela 2","payment:cash":"yes","payment:credit_cards":"yes","payment:debit_cards":"yes","wheelchair":"yes"}}}'::jsonb, '3498b24d06e9a870441b37cf76dd9de9111809ab934af3ddb7cdd4889868987b', 'Kela 2', 'kela 2', 'Bulevardi i Pishave', 'Bulevardi i Pishave', NULL, NULL, NULL, 'AL', 41.2498574, 19.5208745, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:254448d29259cbf9a47365aa5f86f6967f31f4e1b0dc04aee02185da8ddc8da5'),
('osm:node:3387400130', 'https://www.openstreetmap.org/node/3387400130', '{"provider":"openstreetmap","element":{"type":"node","id":3387400130,"lat":42.0738064,"lon":19.5239312,"tags":{"amenity":"doctors","name":"Kirurgjia","wheelchair":"limited"}}}'::jsonb, '33b4dc1276e5bafc96a3cd6c1029707617257eb75a22ff72b76b48b30d503d32', 'Kirurgjia', 'kirurgjia', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0738064, 19.5239312, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:450f9f9bbacea7346bd134c028c7dbcce00a9bffb9076d16f96639f6c18964c3'),
('osm:node:4579869298', 'https://www.openstreetmap.org/node/4579869298', '{"provider":"openstreetmap","element":{"type":"node","id":4579869298,"lat":41.3402052,"lon":19.8322447,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Kirurgjia","phone":"+35542349241","website":"https://www.qsut.gov.al/index.php/sherbimet-mjekesore/sherbimi-i-kirurgjise-se-pergjithshme/sherbimet-e-ofruara/"}}}'::jsonb, 'c9c01e4599ce50e515e804bfcb37955c2ac6df9e82aea2aa08cdf7f67cd528c2', 'Kirurgjia', 'kirurgjia', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3402052, 19.8322447, '+35542349241', 'https://www.qsut.gov.al/index.php/sherbimet-mjekesore/sherbimi-i-kirurgjise-se-pergjithshme/sherbimet-e-ofruara/', NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:8c9020e7cc68e29ab0e6ac4378e1591e9bc7c383fcd28eaab6a07ed73a0928e2'),
('osm:node:11479181771', 'https://www.openstreetmap.org/node/11479181771', '{"provider":"openstreetmap","element":{"type":"node","id":11479181771,"lat":41.3251185,"lon":19.8023539,"tags":{"amenity":"pharmacy","check_date":"2024-01-02","healthcare":"pharmacy","name":"Klaudia"}}}'::jsonb, '43e1dd5b48ede2e2bacb81768411ef1856b6149518574884b3f12f0dad77eb28', 'Klaudia', 'klaudia', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3251185, 19.8023539, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:2237353140d34488e2ddf60d1d3a2ece17e22edbc44089d78778d4a9eb8cd324'),
('osm:node:6810294066', 'https://www.openstreetmap.org/node/6810294066', '{"provider":"openstreetmap","element":{"type":"node","id":6810294066,"lat":41.3430488,"lon":19.8402679,"tags":{"addr:street":"Rruga Imer Ndregjoni","amenity":"dentist","healthcare":"dentist","name":"Klea Dent"}}}'::jsonb, '9637c6d380393ac86566a404e19462e8af08798b3f335a352b3f6df99a78e4de', 'Klea Dent', 'klea dent', 'Rruga Imer Ndregjoni', 'Rruga Imer Ndregjoni', NULL, NULL, NULL, 'AL', 41.3430488, 19.8402679, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:3ad487bc1661fef4a4ff56447f302731c73b48d80c23b053347d4dff33763b5c'),
('osm:node:6860174291', 'https://www.openstreetmap.org/node/6860174291', '{"provider":"openstreetmap","element":{"type":"node","id":6860174291,"lat":40.4566972,"lon":19.481873,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Klinik Dentare"}}}'::jsonb, '85045384a60fef85548bf8480c44866bee359cddb683ce9eab918d8ac6407fbe', 'Klinik Dentare', 'klinik dentare', NULL, NULL, NULL, NULL, NULL, 'AL', 40.4566972, 19.481873, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:493b478be0f63b47c14d55d27a6a4314ea1c2086056bf2038994b3fa70503c58'),
('osm:node:13448147523', 'https://www.openstreetmap.org/node/13448147523', '{"provider":"openstreetmap","element":{"type":"node","id":13448147523,"lat":41.3312208,"lon":19.8372974,"tags":{"check_date":"2026-01-11","healthcare":"optometrist","name":"Klinik e Syrit Art","name:sq":"Klinik e Syrit Art"}}}'::jsonb, '9d3842e6c7f5bcf2038bc1721e70c34df0af12bfb631b95238487968e338872b', 'Klinik e Syrit Art', 'klinik e syrit art', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3312208, 19.8372974, NULL, NULL, NULL, 'unknown', ARRAY['unknown']::text[], 0.78, 'loc:91d50c31b8cd098f843268d5ce123bcc0e12b5430428aa44ef6f9c7855ac55f9'),
('osm:way:684036309', 'https://www.openstreetmap.org/way/684036309', '{"provider":"openstreetmap","element":{"type":"way","id":684036309,"center":{"lat":40.6110018,"lon":20.7795042},"tags":{"amenity":"clinic","building":"yes","healthcare":"clinic","healthcare:speciality":"gynaecology;ophthalmology","name":"Klinika \"Kristi\""}}}'::jsonb, 'a1f500488d1fe163c82b9e5397280e026c9324bc98cbdca81da9ce7b78415fc0', 'Klinika "Kristi"', 'klinika kristi', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6110018, 20.7795042, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:0f4b39def581966d3b398159587dcabcca8e39768c2924cc81273cf2a9d198cf'),
('osm:node:4875940621', 'https://www.openstreetmap.org/node/4875940621', '{"provider":"openstreetmap","element":{"type":"node","id":4875940621,"lat":41.3307424,"lon":19.8032344,"tags":{"addr:postcode":"1001","addr:street":"Rruga Muhamet Gjollesha","amenity":"clinic","email":"klinikacanaj@gmail.com","healthcare":"clinic","name":"Klinika Canaj","name:en":"Canaj''s clinic","opening_hours":"Mo-Fr 08:00-20:00","operator":"Profit Canaj","phone":"+355692848082","website":"https://m.facebook.com/canajclinic/"}}}'::jsonb, 'c297c21956fe801dc1cd431359f6fdfcdbd7c4569192a5fd8d19b56fa0504090', 'Klinika Canaj', 'klinika canaj', 'Rruga Muhamet Gjollesha', 'Rruga Muhamet Gjollesha, 1001', NULL, NULL, '1001', 'AL', 41.3307424, 19.8032344, '+355692848082', 'https://m.facebook.com/canajclinic/', 'klinikacanaj@gmail.com', 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:dcc1738ba6ef4b0e2f8f5222c28c68247593d919fc5fc5ea48a06e791a259422'),
('osm:node:4524762155', 'https://www.openstreetmap.org/node/4524762155', '{"provider":"openstreetmap","element":{"type":"node","id":4524762155,"lat":42.0692527,"lon":19.5112523,"tags":{"amenity":"dentist","name":"Klinika Dentare"}}}'::jsonb, '5a24058abaf2097a6629856c246e40d5951c1b5efaaec212d43088b22bb0df8b', 'Klinika Dentare', 'klinika dentare', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0692527, 19.5112523, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:7a9bab1efd24c933bde8d81ad94a68cf0ded0b34860126f9dceb65a7c45cadbf'),
('osm:node:6848890552', 'https://www.openstreetmap.org/node/6848890552', '{"provider":"openstreetmap","element":{"type":"node","id":6848890552,"lat":40.4736804,"lon":19.4928567,"tags":{"addr:street":"Rruga Perlat Rexhepi","amenity":"dentist","name":"Klinika Dentare"}}}'::jsonb, '1c27bacfd05b656ad4e57af05888235b49665a0067bab7b317aeb60fe23a5ac4', 'Klinika Dentare', 'klinika dentare', 'Rruga Perlat Rexhepi', 'Rruga Perlat Rexhepi', NULL, NULL, NULL, 'AL', 40.4736804, 19.4928567, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:a8d2ec54a03a8b4c76182e27452a2c3c2bd7b473177737e2ecc3a9b87c4d1a32'),
('osm:node:6841497208', 'https://www.openstreetmap.org/node/6841497208', '{"provider":"openstreetmap","element":{"type":"node","id":6841497208,"lat":41.1830548,"lon":19.5606114,"tags":{"addr:street":"Rruga Zguraj","amenity":"dentist","name":"Klinika Dentare - Ralf Dent"}}}'::jsonb, '2b6990adf8cdea7c26d27ab1fd4008d3e51105bb25a05effde9be3ea9909ea59', 'Klinika Dentare - Ralf Dent', 'klinika dentare ralf dent', 'Rruga Zguraj', 'Rruga Zguraj', NULL, NULL, NULL, 'AL', 41.1830548, 19.5606114, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:c57753a2660026a6ab191a6253b24a7d701d14c0b37ddd911621e288e7d18f8c'),
('osm:node:6841991600', 'https://www.openstreetmap.org/node/6841991600', '{"provider":"openstreetmap","element":{"type":"node","id":6841991600,"lat":41.1847772,"lon":19.5618808,"tags":{"amenity":"dentist","name":"Klinika Dentare 23"}}}'::jsonb, '1889a53629a3e01ff9b94843b6292083e8755e90121b1b94700a0b6879203c20', 'Klinika Dentare 23', 'klinika dentare 23', NULL, NULL, NULL, NULL, NULL, 'AL', 41.1847772, 19.5618808, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:a6647f0508f01963589df20ac2ad4a573fe077cae4df2383993f85e201aa8005'),
('osm:node:9161047220', 'https://www.openstreetmap.org/node/9161047220', '{"provider":"openstreetmap","element":{"type":"node","id":9161047220,"lat":41.1059472,"lon":20.0821448,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Klinika Dentare Derstila","opening_hours":"8.00 - 18.30"}}}'::jsonb, 'e5967247731f884fc20b23cb92ddbf9a428c4d0fe25c0ae17a10371e7c650a36', 'Klinika Dentare Derstila', 'klinika dentare derstila', NULL, NULL, NULL, NULL, NULL, 'AL', 41.1059472, 20.0821448, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:832d585d946d5c906dae2c5b2106d4fc12f8a27b211f2e5207ecd2f41762471b'),
('osm:node:6659868662', 'https://www.openstreetmap.org/node/6659868662', '{"provider":"openstreetmap","element":{"type":"node","id":6659868662,"lat":40.7248797,"lon":19.5596621,"tags":{"amenity":"dentist","name":"Klinika Dentare Dr. Arsi"}}}'::jsonb, '69b6f029711c3e4949e304a55bf1495f0575a9588bbebb0684aa9f0a084dd6fd', 'Klinika Dentare Dr. Arsi', 'klinika dentare dr arsi', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7248797, 19.5596621, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:e939b698007bdf96783c71b50a9a3561c08d6466eb6260392bd7118011f1a565'),
('osm:node:13909451911', 'https://www.openstreetmap.org/node/13909451911', '{"provider":"openstreetmap","element":{"type":"node","id":13909451911,"lat":42.3570414,"lon":20.0767125,"tags":{"addr:floor":"G","amenity":"dentist","check_date":"2026-06-04","healthcare":"dentist","level":"0","name":"Klinika Dentare Dr. Bajram Çelaj","phone":"+355 69 862 1181"}}}'::jsonb, 'b855edb37e95cb4d38f040e9cc16532b13dafc5033e2b340d7887a5e63fb9da1', 'Klinika Dentare Dr. Bajram Çelaj', 'klinika dentare dr bajram elaj', NULL, NULL, NULL, NULL, NULL, 'AL', 42.3570414, 20.0767125, '+355 69 862 1181', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:ad9279816a682233256837aafe36ae168129ee624318ff7002185736d93f3b34'),
('osm:node:7019562270', 'https://www.openstreetmap.org/node/7019562270', '{"provider":"openstreetmap","element":{"type":"node","id":7019562270,"lat":40.7344518,"lon":19.5675332,"tags":{"amenity":"dentist","name":"Klinika Dentare Eri Dent","phone":"+355692764154"}}}'::jsonb, '5f7a75b5130eeaf442d743ba0753f5f7c2eec6ecfbdf118e1c9750bad5469a82', 'Klinika Dentare Eri Dent', 'klinika dentare eri dent', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7344518, 19.5675332, '+355692764154', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:57f308017d4de06c6192cbf6c5316e95ea1488837a9b17893029983fea2d5e0c'),
('osm:node:13889165396', 'https://www.openstreetmap.org/node/13889165396', '{"provider":"openstreetmap","element":{"type":"node","id":13889165396,"lat":42.3563503,"lon":20.075411,"tags":{"addr:floor":"G","amenity":"dentist","check_date":"2026-05-27","healthcare":"dentist","level":"0","name":"Klinika Dentare Eugerta Gjongecaj","phone":"+355 69 312 8969"}}}'::jsonb, '972950ac7268ba48017bee97ec03f2bb1e0e32dfd98a9e5fd8572ffe540e5b4d', 'Klinika Dentare Eugerta Gjongecaj', 'klinika dentare eugerta gjongecaj', NULL, NULL, NULL, NULL, NULL, 'AL', 42.3563503, 20.075411, '+355 69 312 8969', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:9247062641ea624137b51cd76337dcb63c3a6086abc6da6c6b30fdae3b7f8dc5'),
('osm:node:6621041497', 'https://www.openstreetmap.org/node/6621041497', '{"provider":"openstreetmap","element":{"type":"node","id":6621041497,"lat":40.7280224,"lon":19.5619733,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Klinika Dentare Extra Dent"}}}'::jsonb, '06090c4e0ba75d2385dd70825caad244dadfc0cc2c0fcbdb386c881ca2c77e95', 'Klinika Dentare Extra Dent', 'klinika dentare extra dent', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7280224, 19.5619733, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:dc0550413ef0567a72c4c70123ae8c6c3de02d5646c9a4aab7e00511d245a633'),
('osm:node:7272816287', 'https://www.openstreetmap.org/node/7272816287', '{"provider":"openstreetmap","element":{"type":"node","id":7272816287,"lat":41.3325343,"lon":19.7808174,"tags":{"addr:city":"Tirana","addr:street":"Rruga Mikel Maruli","amenity":"dentist","healthcare":"dentist","name":"Klinika Dentare Gashi"}}}'::jsonb, 'c1f93766189909674cf182c87e79546c0313fb28a6a24a7658639a2a2ae85b86', 'Klinika Dentare Gashi', 'klinika dentare gashi', 'Rruga Mikel Maruli', 'Rruga Mikel Maruli, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3325343, 19.7808174, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:1619055350f466fc77b06f16f7b5c66c5d03d026ce466f438fcb4649d5896822'),
('osm:node:6841975285', 'https://www.openstreetmap.org/node/6841975285', '{"provider":"openstreetmap","element":{"type":"node","id":6841975285,"lat":41.1863562,"lon":19.5576248,"tags":{"addr:street":"Hafiz Ali Korça","amenity":"dentist","name":"Klinika Dentare Gazioni"}}}'::jsonb, 'b26689aa6d9116bc7e973bf3f71ac37340e2658192baaea3425296880fc465c6', 'Klinika Dentare Gazioni', 'klinika dentare gazioni', 'Hafiz Ali Korça', 'Hafiz Ali Korça', NULL, NULL, NULL, 'AL', 41.1863562, 19.5576248, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:21ebfb4353c50d303248e8c9961e8861fd778e2a7b2a5ef36b1ba15d022d1e20'),
('osm:node:6621164785', 'https://www.openstreetmap.org/node/6621164785', '{"provider":"openstreetmap","element":{"type":"node","id":6621164785,"lat":40.7229964,"lon":19.5565803,"tags":{"amenity":"dentist","name":"Klinika Dentare ident"}}}'::jsonb, '1dc2b44fd35fbdb97e4907769cb0427ebac9120c2e1d6e30f3de78afa3127c3f', 'Klinika Dentare ident', 'klinika dentare ident', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7229964, 19.5565803, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:76f5d19759efaafd32a3437aeacefe66393f67886177de1cce0d6b6822a6a896'),
('osm:way:733068030', 'https://www.openstreetmap.org/way/733068030', '{"provider":"openstreetmap","element":{"type":"way","id":733068030,"center":{"lat":41.3342897,"lon":19.8218021},"tags":{"addr:street":"Rruga Siri Kodra","amenity":"dentist","building":"residential","healthcare":"dentist","name":"Klinika Dentare Kristi"}}}'::jsonb, 'cad406ac79aaf73d45852535e9f0b0f0568e67ce96e70789b8b347738e472e96', 'Klinika Dentare Kristi', 'klinika dentare kristi', 'Rruga Siri Kodra', 'Rruga Siri Kodra', NULL, NULL, NULL, 'AL', 41.3342897, 19.8218021, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:885aacf800aec9152d26a8c202a1e11ffe0c44f1d21786a432a6745ff2b73bf8');

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
