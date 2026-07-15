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
('osm:node:8505115175', 'https://www.openstreetmap.org/node/8505115175', '{"provider":"openstreetmap","element":{"type":"node","id":8505115175,"lat":34.5239242,"lon":69.1675774,"tags":{"healthcare":"laboratory","name":"الفلاح","opening_hours":"24/7"}}}'::jsonb, '86134c0a770a731cd040e7bc7010bbe56d28b7ecc53490ae20c3f3a6c3b0f764', 'الفلاح', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5239242, 69.1675774, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:ab94b5310b0b6c880f3b111e87b41d0b20f4196b6e2734fe16e1adf7c3358952'),
('osm:node:7138279104', 'https://www.openstreetmap.org/node/7138279104', '{"provider":"openstreetmap","element":{"type":"node","id":7138279104,"lat":34.5332376,"lon":69.199529,"tags":{"healthcare":"laboratory","name":"الفلاح طبی لابراتوار","name:en":"Alfalah Medical Lab"}}}'::jsonb, '1e6661fd8d282a8c4c1872655b52bc3fd6fce671ebfe0309f19a675525a69680', 'الفلاح طبی لابراتوار', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5332376, 69.199529, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:7db069e50893148ae47bca9c76430e7f42fb620ad47abb4d288a1eed69323acb'),
('osm:node:6133148915', 'https://www.openstreetmap.org/node/6133148915', '{"provider":"openstreetmap","element":{"type":"node","id":6133148915,"lat":34.5324293,"lon":69.1508364,"tags":{"email":"lab.alfalah@mail.com","healthcare":"laboratory","name":"الفلاح مختبر طب","name:en":"Alfalah Medical Laboratory","phone":"+93 70 072 1000","website":"https://alfalahmedical.weebly.com"}}}'::jsonb, '57afbca3eacc492f9f76120d9c9ac9a119ff4066cb667ed0efb2c68665825ee0', 'الفلاح مختبر طب', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5324293, 69.1508364, '+93 70 072 1000', 'https://alfalahmedical.weebly.com', 'lab.alfalah@mail.com', 'lab', ARRAY['lab']::text[], 0.78, 'loc:0790a1112a77cb7b9ecaecf1397aadc4f916fd354d704dda51a631031515b0ab'),
('osm:way:611222192', 'https://www.openstreetmap.org/way/611222192', '{"provider":"openstreetmap","element":{"type":"way","id":611222192,"center":{"lat":34.5342842,"lon":69.1036688},"tags":{"addr:country":"AF","addr:district":"District 5","addr:province":"Kabul","addr:state":"Kabul","addr:street":"Qargha Road","amenity":"hospital","healthcare":"hospital","level":"3","name":"امیری روغتون","name:en":"Amiri Medical Complex","opening_hours":"24/7","phone":"+93 20 256 3555","source":"OSM","website":"https://www.amc.com.af/"}}}'::jsonb, '27beaeb4fc86145a7bf3c827fda6cb5c571a2a39094be765255ac9f7c24cdf2f', 'امیری روغتون', NULL, 'Qargha Road', 'Qargha Road, Kabul', NULL, 'Kabul', NULL, 'AF', 34.5342842, 69.1036688, '+93 20 256 3555', 'https://www.amc.com.af/', NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:ac53668cb0c2f0202454dff0e08bebe140eb3839d6148da366eacb6723e3a8ee'),
('osm:node:8806169269', 'https://www.openstreetmap.org/node/8806169269', '{"provider":"openstreetmap","element":{"type":"node","id":8806169269,"lat":34.5339406,"lon":69.1389639,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"انور"}}}'::jsonb, '412b8d82ac3296f0465de9241ce6c898d5e62b5fdafee3e12402b6ab274ea775', 'انور', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5339406, 69.1389639, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:52f7c42f41762d368e3bd7a8fabac63256220a2efa775b3d7775526ccfb0ed0d'),
('osm:node:9024716956', 'https://www.openstreetmap.org/node/9024716956', '{"provider":"openstreetmap","element":{"type":"node","id":9024716956,"lat":31.5809432,"lon":64.3555121,"tags":{"addr:city":"لشکر گاہ","amenity":"clinic","healthcare":"clinic","name":"ایم ایس ایف لشکر گاہ","name:en":"MSF Lashkar Gah","name:ur":"ایم ایس ایف لشکر گاہ","operator":"Médecins sans frontières","operator:ar":"أطباء بلا حدود","operator:ps":"میڈیسن سانس فرنٹیرس","operator:short":"MSF","operator:type":"ngo","operator:ur":"میڈیسن سانس فرنٹیرس","operator:wikidata":"Q49330","operator:wikipedia":"ur:میڈیسن سانس فرنٹیرس","operator:wikipedia:ar":"أطباء بلا حدود","operator:wikipedia:ur":"میڈیسن سانس فرنٹیرس"}}}'::jsonb, 'f4cbc9fb194aeda260fc5f791330a161a819a4ba18dc127cb421a7af4ee1c36e', 'ایم ایس ایف لشکر گاہ', NULL, NULL, 'لشکر گاہ', 'لشکر گاہ', NULL, NULL, 'AF', 31.5809432, 64.3555121, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:8af3573f1f511f80379d1f7988af3d4638cc432df8fbef9d3f934b50bbd6bb85'),
('osm:way:1356103098', 'https://www.openstreetmap.org/way/1356103098', '{"provider":"openstreetmap","element":{"type":"way","id":1356103098,"center":{"lat":33.7269876,"lon":66.1493938},"tags":{"amenity":"hospital","name":"بخش اطفال"}}}'::jsonb, '4ddaaf7c3982510c7bc3f44552de4b7eab09f1a08d43feb4baeed2953c6a561f', 'بخش اطفال', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.7269876, 66.1493938, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:418af1c784a387569789969ecf667ac67e843a02fb9571380098f8f47334dcd2'),
('osm:way:973102628', 'https://www.openstreetmap.org/way/973102628', '{"provider":"openstreetmap","element":{"type":"way","id":973102628,"center":{"lat":31.581385,"lon":64.3555442},"tags":{"addr:city":"لشکر گاہ","amenity":"hospital","healthcare":"hospital","name":"بست ہسپتال","name:en":"Bust Hospital","name:ps":"بُست روغتون","name:ur":"بست ہسپتال","operator":"Médecins sans frontières","operator:ar":"أطباء بلا حدود","operator:short":"MSF","operator:type":"ngo","operator:ur":"میڈیسن سانس فرنٹیرس","operator:wikidata":"Q49330","operator:wikipedia":"ur:میڈیسن سانس فرنٹیرس","operator:wikipedia:ar":"أطباء بلا حدود","operator:wikipedia:ur":"میڈیسن سانس فرنٹیرس"}}}'::jsonb, '41afbb3f3ccd7fafbe7637c95491cb445ce3e4da24b1cc07f23cb30493da1d70', 'بست ہسپتال', NULL, NULL, 'لشکر گاہ', 'لشکر گاہ', NULL, NULL, 'AF', 31.581385, 64.3555442, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:cbff0cf07dc9259b315fe3ec933196189660712ab187fae15ff700187463ea21'),
('osm:node:9400453023', 'https://www.openstreetmap.org/node/9400453023', '{"provider":"openstreetmap","element":{"type":"node","id":9400453023,"lat":34.6304879,"lon":70.1952474,"tags":{"amenity":"clinic","healthcare":"clinic","name":"بشیر صافی کلینیک","name:en":"Bashir Safi Clinic"}}}'::jsonb, 'c83a7200639b3d3fa7366fc76a3dbc4b16e36fa6f3731be0e6d4090624c53e20', 'بشیر صافی کلینیک', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.6304879, 70.1952474, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:a924d0ebce1ae042bf362b31bb3d2dcecf3920acddd2aae465bcbc6c06c467ce'),
('osm:way:1344785799', 'https://www.openstreetmap.org/way/1344785799', '{"provider":"openstreetmap","element":{"type":"way","id":1344785799,"center":{"lat":31.6213306,"lon":65.7156557},"tags":{"amenity":"hospital","name":"بلال روغتون","name:en":"Bilal Hospital"}}}'::jsonb, '62e243d1a642ad798c75ce0c6b99561b6464f3513abc288546de7d34a48e2e4e', 'بلال روغتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 31.6213306, 65.7156557, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:eb79515e5f30f3645225c1a86cfe54626dac7ffe26e38ffb39454003503189ec'),
('osm:node:8664638131', 'https://www.openstreetmap.org/node/8664638131', '{"provider":"openstreetmap","element":{"type":"node","id":8664638131,"lat":34.5463894,"lon":69.1567864,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"بهزاد درملتون"}}}'::jsonb, '85754449f5b145cfeacfa28eee14490b22a10e5e2eab5db0bf0c4295289f8503', 'بهزاد درملتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5463894, 69.1567864, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:1ca37dbd5215697ca51513c27836a1142b4da3131a0b00c083c73b5e6fe4b392'),
('osm:node:13919845201', 'https://www.openstreetmap.org/node/13919845201', '{"provider":"openstreetmap","element":{"type":"node","id":13919845201,"lat":34.3537927,"lon":62.1957638,"tags":{"amenity":"hospital","name":"بیمارستان تخصصی حکیم فاریابی"}}}'::jsonb, 'ee049ad26bb04ddfb03a1beeab1dee0b161d2d2fa7bbca928f3422422105fa8c', 'بیمارستان تخصصی حکیم فاریابی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.3537927, 62.1957638, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:4aee7ac107b53fe21d52d36d60621e02862a03b89bf32f8db74f8f2e173d71f1'),
('osm:node:13919213201', 'https://www.openstreetmap.org/node/13919213201', '{"provider":"openstreetmap","element":{"type":"node","id":13919213201,"lat":34.3491304,"lon":62.2068701,"tags":{"amenity":"hospital","name":"بیمارستان کمپلکس ماهان"}}}'::jsonb, 'b76e07ece692c18f12dd80fe89b9d647920c40189623a936a35f579a39deac62', 'بیمارستان کمپلکس ماهان', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.3491304, 62.2068701, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:a10d643e99493fcf571724768c4000c4909fb31366c2e827199bcc2a90235856'),
('osm:node:13919238602', 'https://www.openstreetmap.org/node/13919238602', '{"provider":"openstreetmap","element":{"type":"node","id":13919238602,"lat":34.3506896,"lon":62.1993291,"tags":{"amenity":"hospital","name":"بیمارستان لقمان حکیم"}}}'::jsonb, '1456f239359611693399aaf0b9d55e6ef0853a00c094af838977f9f5a742dfdb', 'بیمارستان لقمان حکیم', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.3506896, 62.1993291, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:3c0a188e41984f3561eda7390e47bcf11cea238db0343d25e9ee06d05338cb87'),
('osm:way:1343549487', 'https://www.openstreetmap.org/way/1343549487', '{"provider":"openstreetmap","element":{"type":"way","id":1343549487,"center":{"lat":36.715521,"lon":67.1079959},"tags":{"amenity":"hospital","healthcare":"hospital","name":"بیمارستان منطقه ای مزارشریف","name:en":"Mazar-e-Sharif Regional Hospital","name:ru":"Региональный Госпиталь Мазари Шарифа"}}}'::jsonb, 'deca75f3117f1cab68d6ffe9bb233cb3e9d8a3192ccaa91ad9becfccbad52d9c', 'بیمارستان منطقه ای مزارشریف', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.715521, 67.1079959, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:dfa3b4d1612b7849fd5a0456fc41fb2d6b285713f48837cc8431f5cf1ede7de4'),
('osm:node:8489144457', 'https://www.openstreetmap.org/node/8489144457', '{"provider":"openstreetmap","element":{"type":"node","id":8489144457,"lat":34.8290059,"lon":69.0746756,"tags":{"amenity":"pharmacy","name":"جان محمد خیراندیش"}}}'::jsonb, '650f268d8489a649cf24de78474a2d161b080384000443fc23b7a9cdd7a1209c', 'جان محمد خیراندیش', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.8290059, 69.0746756, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:de8572b8586dde7f00597ae00d17dcf3a8c41a25fc8ac1615b71646aa7ef74ee'),
('osm:way:1245935169', 'https://www.openstreetmap.org/way/1245935169', '{"provider":"openstreetmap","element":{"type":"way","id":1245935169,"center":{"lat":31.6207053,"lon":65.6797165},"tags":{"amenity":"hospital","emergency":"yes","healthcare":"hospital","healthcare:speciality":"general","name":"چينايي شفاخانه","name:ru":"Региональная больница Мирвайс","name_1":"Mirwais Regional Hospital","operator":"د افغانستان د عامې روغتیا وزارت","operator:type":"government"}}}'::jsonb, '27d272d21e0b5608a16a9c0f446b5cbf7300c9bf4673862e89ef662265eaf462', 'چينايي شفاخانه', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 31.6207053, 65.6797165, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:879e40c44364fb6e7f1f69293af88a4648804d538e3ad1a69af066a8ff59c557'),
('osm:node:8664620946', 'https://www.openstreetmap.org/node/8664620946', '{"provider":"openstreetmap","element":{"type":"node","id":8664620946,"lat":34.5431118,"lon":69.1618197,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"حجاز درملتون"}}}'::jsonb, '2ca52f0079b9f6d6d48e4febc25af8f874c955388177329843d1487a3613c74c', 'حجاز درملتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5431118, 69.1618197, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:1c81dc93b7fe2a540f837cd59308acf22646bc4479c710e4c6a343914381444a'),
('osm:node:12388601054', 'https://www.openstreetmap.org/node/12388601054', '{"provider":"openstreetmap","element":{"type":"node","id":12388601054,"lat":34.5113573,"lon":69.1978464,"tags":{"amenity":"hospital","name":"خان روغتون","name:en":"Khan Hospital"}}}'::jsonb, '20619f73089aa0df0bfef980ecd790a7734bea395925a7651aeffb2a59ec8d4b', 'خان روغتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5113573, 69.1978464, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:81bf09c6af16a7fe96807950bbf99971c5d33065640b873c9b9fe5da248b68b8'),
('osm:way:388628508', 'https://www.openstreetmap.org/way/388628508', '{"provider":"openstreetmap","element":{"type":"way","id":388628508,"center":{"lat":31.6128857,"lon":65.6995527},"tags":{"amenity":"hospital","building":"hospital","building:levels":"4","healthcare":"hospital","name":"د الهادي فرهاد روغتون","name:en":"Allahi Farhad Hospital","name:ru":"Больница Аллахи Фархад"}}}'::jsonb, '7aecf70b0d1eecbd8c9506f178ab0e4562b58103f9386de49b4bffbe1848d8c3', 'د الهادي فرهاد روغتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 31.6128857, 65.6995527, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:a014c467e34fe8a2283e24b72cb33031855a6d46b172463de04f3fb3992cbb85'),
('osm:way:990675535', 'https://www.openstreetmap.org/way/990675535', '{"provider":"openstreetmap","element":{"type":"way","id":990675535,"center":{"lat":34.5384101,"lon":69.186085},"tags":{"addr:country":"AF","addr:county":"Wazir Akbar Khan","addr:district":"district 10","addr:province":"Kabul","amenity":"hospital","emergency":"yes","healthcare":"hospital","level":"2","name":"د اندرا ګاندي ماشومانو روغتون","name:en":"Indira Gandhi Childrens Hospital","name:fa":"ایندیرا گاندی","name:ru":"Детский госпиталь имени Индиры Ганди","opening_hours":"24/7","operational_status":"Operational","operator:type":"public/government","phone":"+93 79 935 9466","wikidata":"Q14565639","wikipedia":"en:Indira Gandhi Children''s Hospital"}}}'::jsonb, '190154eb80d169db74a4c80d2cb07e461482bd9bae6d64b5eb248d8552e0db5a', 'د اندرا ګاندي ماشومانو روغتون', NULL, NULL, 'Kabul', NULL, 'Kabul', NULL, 'AF', 34.5384101, 69.186085, '+93 79 935 9466', NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:d68816c3091fdb52da78a7d847c04f3cc50d3a1903f9a85570aaa21cad451a95'),
('osm:way:1237645423', 'https://www.openstreetmap.org/way/1237645423', '{"provider":"openstreetmap","element":{"type":"way","id":1237645423,"center":{"lat":31.6452383,"lon":65.6139007},"tags":{"amenity":"clinic","building":"yes","healthcare":"clinic","healthcare:speciality":"intensive","name":"د ټيټي دواخانه"}}}'::jsonb, 'ae786f1ec29cd4c613d6c4c2c742e87482d672a39bcb6a19c8f880f3b7a1d640', 'د ټيټي دواخانه', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 31.6452383, 65.6139007, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:54b302328a5f6d577888e6ad897751013fe0239236e879699adba51368bf4f8c'),
('osm:way:200364379', 'https://www.openstreetmap.org/way/200364379', '{"provider":"openstreetmap","element":{"type":"way","id":200364379,"center":{"lat":34.5410709,"lon":69.188832},"tags":{"amenity":"hospital","description":"Chahrsad Bester","healthcare":"hospital","name":"د داود خان نظامي روغتون","name:ru":"Военный госпиталь Дауд Хан","wikidata":"Q29586796","wikipedia":"en:Daoud Khan Military Hospital"}}}'::jsonb, '436d6fb01c368a55a287e5a52957d8b834f48ff01969db6d082b287414ab10ad', 'د داود خان نظامي روغتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5410709, 69.188832, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:2158a83ab9af9adef942406a67b9177ef5d8795846f4d387ba5e1c205878d69d'),
('osm:way:386909113', 'https://www.openstreetmap.org/way/386909113', '{"provider":"openstreetmap","element":{"type":"way","id":386909113,"center":{"lat":31.618287,"lon":65.6814379},"tags":{"amenity":"clinic","healthcare":"clinic","name":"د سرې مياشتي ټولنه"}}}'::jsonb, '40b596124e946bd53fa984e160ffc21eebf53c390455a3aaac477b9765a0170d', 'د سرې مياشتي ټولنه', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 31.618287, 65.6814379, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:13371727098740e5a6c82a10f3e14a0a85a339bd61882eaaf936ecc4b0a39d7e'),
('osm:way:1040095230', 'https://www.openstreetmap.org/way/1040095230', '{"provider":"openstreetmap","element":{"type":"way","id":1040095230,"center":{"lat":33.1688313,"lon":68.7848012},"tags":{"addr:city":"Sharana","addr:housenumber":"Hospital","addr:postcode":"2401","addr:street":"Hospital Raod","amenity":"hospital","emergency":"yes","healthcare":"hospital","healthcare:speciality":"general;vaccination;orthopaedics;emergency;surgery;internal;maternity","name":"د ښرنې ملکي روغتون","name:en":"Sharana Public Hospital","operator":"د عامې روغتیا ریاست","operator:type":"public"}}}'::jsonb, '48f7fe325689070aac86cdf63be9e80976ee448a8eb07285606bae52bbedd009', 'د ښرنې ملکي روغتون', NULL, 'Hospital Hospital Raod', 'Hospital Hospital Raod, Sharana, 2401', 'Sharana', NULL, '2401', 'AF', 33.1688313, 68.7848012, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination', 'hospital', 'specialist']::text[], 0.86, 'loc:2affe3275b6066130690645b0977de7064b84110b24b860089815054aadd8747'),
('osm:way:386898669', 'https://www.openstreetmap.org/way/386898669', '{"provider":"openstreetmap","element":{"type":"way","id":386898669,"center":{"lat":31.6124581,"lon":65.6969382},"tags":{"amenity":"clinic","healthcare":"clinic","name":"د عامې روغتیا ریاست","operator":"Afghan Government","operator:type":"government"}}}'::jsonb, '8bb086ab71e37591fc3c82b4ba87bdf156a5891ca2d36cfb60e2ff96cb6beb23', 'د عامې روغتیا ریاست', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 31.6124581, 65.6969382, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:dd809ce6d21d9a93d1fb16e929d67bcad6ee544743606ec5e1cca8cfeeffda9d'),
('osm:way:386898668', 'https://www.openstreetmap.org/way/386898668', '{"provider":"openstreetmap","element":{"type":"way","id":386898668,"center":{"lat":31.6134913,"lon":65.6989408},"tags":{"amenity":"clinic","healthcare":"clinic","name":"د عینو زیږون کلینیک"}}}'::jsonb, '125de6427031342f3412adf5147f9f1d6c5c5041de9dbd706894272a972af6c3', 'د عینو زیږون کلینیک', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 31.6134913, 65.6989408, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:c77eba2fe0535664a6c9d5ffe4844194f47015a24fbfd454b32bf6872f834d5c'),
('osm:relation:18234112', 'https://www.openstreetmap.org/relation/18234112', '{"provider":"openstreetmap","element":{"type":"relation","id":18234112,"center":{"lat":36.7094631,"lon":68.8635522},"tags":{"amenity":"hospital","healthcare":"hospital","name":"د کندوز ولایتي روغتون","name:dar":"د کندوز ولایتي روغتون","name:en":"Kunduz regional hospital","name:fa":"شفاخانه ولایتي قندوز","name:ru":"Кундузская Региональная Больница","type":"multipolygon"}}}'::jsonb, '8ed296b1eac0cfb68fab94c595519d7956ba5e8aad77a455f8c4ec8b50a70df8', 'د کندوز ولایتي روغتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.7094631, 68.8635522, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:dad04e1bb4f5426d877f9bed315bf26e0afe3076e5c33bcc7c285f9c403777de'),
('osm:way:904399310', 'https://www.openstreetmap.org/way/904399310', '{"provider":"openstreetmap","element":{"type":"way","id":904399310,"center":{"lat":33.7587476,"lon":69.3802863},"tags":{"amenity":"clinic","building":"yes","healthcare":"clinic","healthcare:speciality":"general","name":"د مچلغو روغتون","name:en":"Machal Gho Clinic","opening_hours":"sunrise-sunset"}}}'::jsonb, '67882e522197f7a9d28d7a255ca9bcc6408ceb2b7fe1b4bcb79b53e520a2dc6e', 'د مچلغو روغتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.7587476, 69.3802863, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:9d76ae117fbaf97d3b8474c2572843486aff5f807c0331140adaf7c03bbd3b5d'),
('osm:way:1454581345', 'https://www.openstreetmap.org/way/1454581345', '{"provider":"openstreetmap","element":{"type":"way","id":1454581345,"center":{"lat":35.0209179,"lon":69.3585586},"tags":{"addr:city":"Mahmud-i-Raqi","addr:city:ps":"محمود راقي","addr:country":"AF","addr:province":"Kapisa","addr:province:ps":"کاپيسا","alt_name":"د کاپيسا ولايتي روغتون","alt_name:en":"Kapisa Provincial Hospital","alt_name:ps":"د کاپيسا ولايتي روغتون","amenity":"hospital","check_date":"2026-05-17","emergency":"yes","health_facility:type":"provincial_hospital","healthcare":"hospital","name":"د محمود راقي ولايتي روغتون","name:dr":"شفاخانه ولایتی محمودراقی","name:en":"Mahmud-i-Raqi Provincial Hospital","name:ps":"د محمود راقي ولايتي روغتون","opening_hours":"24/7","operator":"Ministry of Public Health","operator:ps":"د عامې روغتیا وزارت"}}}'::jsonb, 'c4fded92be421228c01ad311ca222be4701df35dec2428c25020ad08c73eb9c9', 'د محمود راقي ولايتي روغتون', NULL, NULL, 'Mahmud-i-Raqi, Kapisa', 'Mahmud-i-Raqi', 'Kapisa', NULL, 'AF', 35.0209179, 69.3585586, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:95d59efb84f401bf2333e5dc3026df4d62027ae02de63202764a5332d99ddf93'),
('osm:way:1245933323', 'https://www.openstreetmap.org/way/1245933323', '{"provider":"openstreetmap","element":{"type":"way","id":1245933323,"center":{"lat":31.6151443,"lon":65.6853163},"tags":{"amenity":"hospital","healthcare":"hospital","name":"د مهمند روغتون","operator":"مهمن","operator:type":"private"}}}'::jsonb, '0edf5f8a3eaedfe01b9a8f6359ba5c7f0c9e27bbc288f12a61ae4111550eece6', 'د مهمند روغتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 31.6151443, 65.6853163, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:91d4f12d484c87b72e03a832f1c5141cb4753b9e600c6fb58e890ea8283d6e2e'),
('osm:way:904394229', 'https://www.openstreetmap.org/way/904394229', '{"provider":"openstreetmap","element":{"type":"way","id":904394229,"center":{"lat":33.7683133,"lon":69.4871881},"tags":{"amenity":"clinic","building":"yes","healthcare":"clinic","healthcare:speciality":"general","name":"د میرزکی ولسوالۍ روغتون","name:en":"Mirzaka Clinic","opening_hours":"sunrise-sunset"}}}'::jsonb, '74e9013a95f80cbdc9ade28cf4a88f027b590c32474eb92f59e63ae2d53c0293', 'د میرزکی ولسوالۍ روغتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.7683133, 69.4871881, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:853b362384a6af54d11469bae0dcdaf084b463148b92c7894f69c7638b3bcba5'),
('osm:way:928106729', 'https://www.openstreetmap.org/way/928106729', '{"provider":"openstreetmap","element":{"type":"way","id":928106729,"center":{"lat":34.5139773,"lon":69.1741102},"tags":{"amenity":"hospital","building":"yes","healthcare":"hospital","name":"د میوند تدریسي روغتون","wikipedia":"en:Maiwand Teaching Hospital"}}}'::jsonb, '57992898267febeeeaa1311ab6fd47c0afd5db1c982c35fa5999ee1ce99b9561', 'د میوند تدریسي روغتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5139773, 69.1741102, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:505718bed92a6a30b36eceefdb4c75b244f5cf28efe553dc63123b2310347258'),
('osm:node:6564731591', 'https://www.openstreetmap.org/node/6564731591', '{"provider":"openstreetmap","element":{"type":"node","id":6564731591,"lat":34.3479121,"lon":62.1842221,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"داروخانه"}}}'::jsonb, '0631d0d81365a8e1dc781272fca843c3b6fd3f7196a273fae55656581ad3a8fc', 'داروخانه', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.3479121, 62.1842221, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:2bf60476c4224e230a939a8c974ed269cbbc1967380f665482bd66f0de069ff2'),
('osm:node:8838139288', 'https://www.openstreetmap.org/node/8838139288', '{"provider":"openstreetmap","element":{"type":"node","id":8838139288,"lat":36.2731166,"lon":68.0230139,"tags":{"amenity":"clinic","healthcare":"clinic","name":"داکتر بازگل جهان گیر"}}}'::jsonb, '9e83f8cac6e8caaa96c7f43a6d8d025a3ec73fbb07a61328aa093b736c3d2f13', 'داکتر بازگل جهان گیر', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2731166, 68.0230139, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:f8db9b0dc283d0b073e045294188d4370f1f72c3e6e0104bd8fd4e12eb74217d'),
('osm:node:8838139299', 'https://www.openstreetmap.org/node/8838139299', '{"provider":"openstreetmap","element":{"type":"node","id":8838139299,"lat":36.2637656,"lon":68.0163567,"tags":{"amenity":"clinic","healthcare":"clinic","name":"داکتر محمد اعظم سهاک"}}}'::jsonb, '1bfcef471da5818f5e3459795c7c55ae7cb6c581975dfc2748e35876876d7af2', 'داکتر محمد اعظم سهاک', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2637656, 68.0163567, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:dffe804e15c24f842c0f4ccbb49fb3f3b2b236432e6be7e83da8ea06be5c63a8'),
('osm:node:9319490042', 'https://www.openstreetmap.org/node/9319490042', '{"provider":"openstreetmap","element":{"type":"node","id":9319490042,"lat":34.507776,"lon":69.2372361,"tags":{"amenity":"clinic","contact:email":"darman_ngo@yahoo.com","contact:website":"www.darmanafghanistan.org","healthcare":"clinic","name":"درمان پولی کلینک","name:en":"Darman Polyclinic"}}}'::jsonb, 'fd1129988ee6c5aa31acbaf937160615cadc5e2e5fb34ca9f338627c9d3fef76', 'درمان پولی کلینک', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.507776, 69.2372361, NULL, 'www.darmanafghanistan.org', 'darman_ngo@yahoo.com', 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:6a1fa259b85755778e00973777e14ad996e79f59e248cb4f3ea9bbb8ac666cd1'),
('osm:node:5628111837', 'https://www.openstreetmap.org/node/5628111837', '{"provider":"openstreetmap","element":{"type":"node","id":5628111837,"lat":34.588703,"lon":69.0853171,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"دواخانه","name:en":"دواخانه"}}}'::jsonb, 'f9b1d696e9cbe1b686668fa822b1f70a97ce76a5e0acc3ad5c77f48a656dce40', 'دواخانه', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.588703, 69.0853171, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:cf7c8955f0b308ceb1c87e2cd324e56121cb5afd59f1810acb48147f64b1f2b1'),
('osm:node:7638299149', 'https://www.openstreetmap.org/node/7638299149', '{"provider":"openstreetmap","element":{"type":"node","id":7638299149,"lat":34.5411971,"lon":69.1650242,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"دواخانه ۲۴ ساعته","opening_hours":"24/7","wheelchair":"no"}}}'::jsonb, '69c708e0bbc438db7e1f5938354aa797dcbddf81460af00140c0e4df2e1ab5bb', 'دواخانه ۲۴ ساعته', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5411971, 69.1650242, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:ff8478b878d0cce968937181eac2e2929d7436e1cf23b62b701b1621ae56fd56'),
('osm:node:8953108656', 'https://www.openstreetmap.org/node/8953108656', '{"provider":"openstreetmap","element":{"type":"node","id":8953108656,"lat":34.5411813,"lon":69.1957997,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"دواخانه بلوچ"}}}'::jsonb, 'e254265595740af1ec6c355e716614b5bfa6bc123eeb644debabf96bce3d54b9', 'دواخانه بلوچ', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5411813, 69.1957997, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:5c91e1b8195746f92f645aea445e9127f9794bc00fe428eab5ff7e2a72a5cacb'),
('osm:node:8684947173', 'https://www.openstreetmap.org/node/8684947173', '{"provider":"openstreetmap","element":{"type":"node","id":8684947173,"lat":34.5718747,"lon":69.145035,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"دواخانه حامد ظاهر","name:en":"Hamed Zaher Pharmacy"}}}'::jsonb, '74d7e1168c32435e276720f69f271191f36547385e31942ad421781c45fbb95d', 'دواخانه حامد ظاهر', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5718747, 69.145035, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:29133711791b282d19d0d1ff671394e317d8b04e5f8f62e88473a0f77bb4861e'),
('osm:node:6557359966', 'https://www.openstreetmap.org/node/6557359966', '{"provider":"openstreetmap","element":{"type":"node","id":6557359966,"lat":34.3448705,"lon":62.1993074,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"دواخانه شبانه روزی مهر"}}}'::jsonb, '3136ba1629c4de70f661c4ce1955b91c19ea60726aa610b7396f2940f2a423e1', 'دواخانه شبانه روزی مهر', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.3448705, 62.1993074, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:80a7d941952b29f0c683da7e7576128e6341a06cbbea5b1b1da3e08ad625977f'),
('osm:node:8664648897', 'https://www.openstreetmap.org/node/8664648897', '{"provider":"openstreetmap","element":{"type":"node","id":8664648897,"lat":34.5437307,"lon":69.1607625,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"دواخانه نوی تایمنی"}}}'::jsonb, '3249f972ab65df8acc65afa7e5ee9e0783feb96008894be4ef94298e35bd993e', 'دواخانه نوی تایمنی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5437307, 69.1607625, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:2ba9bdef636dd5e732079148e0401bafc1b1a97dd380552ddaaf82a7d25ca21e'),
('osm:node:7851483133', 'https://www.openstreetmap.org/node/7851483133', '{"provider":"openstreetmap","element":{"type":"node","id":7851483133,"lat":34.5497764,"lon":69.1292398,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"دواخانه نوید امید","name:en":"Nawid omid pharmacy"}}}'::jsonb, '115d4ff8dd6178469249c9ca7006484552f6cc8528a75d82612e49c18291c7e6', 'دواخانه نوید امید', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5497764, 69.1292398, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:ea47508d0442af7b6efddc873dc7b89fe9c10d03e9969d8c2a3efed0d445caa7'),
('osm:node:8838139294', 'https://www.openstreetmap.org/node/8838139294', '{"provider":"openstreetmap","element":{"type":"node","id":8838139294,"lat":36.2627473,"lon":68.0197128,"tags":{"amenity":"clinic","healthcare":"clinic","name":"دوکتور احمدشاه سامع"}}}'::jsonb, 'b53687bd70a77481962ebb33beffbf0bdcf520cb27a86d5af360404a73e68b93', 'دوکتور احمدشاه سامع', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2627473, 68.0197128, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:f94bc16343ad0959d0c5f0d5b8e33177a63007cfdbb0cad555d048f0fb512bbd'),
('osm:node:8838139303', 'https://www.openstreetmap.org/node/8838139303', '{"provider":"openstreetmap","element":{"type":"node","id":8838139303,"lat":36.2662912,"lon":68.0114577,"tags":{"amenity":"clinic","healthcare":"clinic","name":"دوکتور سراج الدین نظری"}}}'::jsonb, '1d2c4a04eafd7626e968b9bc8b651aeebcabd27188afd98e91e56fdc8b0b2e05', 'دوکتور سراج الدین نظری', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2662912, 68.0114577, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:5872d6a7f93ecb11f99e831f0ccd06ba776403e90f13a14a8d92e319d6b1040e'),
('osm:node:8838139297', 'https://www.openstreetmap.org/node/8838139297', '{"provider":"openstreetmap","element":{"type":"node","id":8838139297,"lat":36.265994,"lon":68.0112173,"tags":{"amenity":"clinic","healthcare":"clinic","name":"دوکتور فتح محمد"}}}'::jsonb, 'f8883f72eb60b9879739b2a3a7753c05983c21334d42d0c628cfdaa65d4aab2e', 'دوکتور فتح محمد', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.265994, 68.0112173, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:20051a07f6b5995041b892f20d6cb76c88e7a6f8e5b39adc3da968a6a7d351e0'),
('osm:node:8838139305', 'https://www.openstreetmap.org/node/8838139305', '{"provider":"openstreetmap","element":{"type":"node","id":8838139305,"lat":36.2672487,"lon":68.0118929,"tags":{"amenity":"clinic","healthcare":"clinic","name":"دوکتور محمد الله مرادی"}}}'::jsonb, '3c31fef1db3bb4c8eb0c7ac94c85659ca6f015a20c66500abc16f0ce7f69c8c0', 'دوکتور محمد الله مرادی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2672487, 68.0118929, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:31f34e684ba8fc50062348756b84bf14ca55fe2ffc32037fc94027276c995b74'),
('osm:node:8838139302', 'https://www.openstreetmap.org/node/8838139302', '{"provider":"openstreetmap","element":{"type":"node","id":8838139302,"lat":36.2664946,"lon":68.0113274,"tags":{"amenity":"clinic","healthcare":"clinic","name":"دیپلومه قابله پروین"}}}'::jsonb, 'fe9190f231c7b10eb76f45e22697a5c5e81a42e20ae16c6ef0b42537d1a092ea', 'دیپلومه قابله پروین', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2664946, 68.0113274, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:1ca9a4dbbdd3173fb2663185c950c8c19acd0a4d4ea769f2140f9764a3e49565'),
('osm:way:26132528', 'https://www.openstreetmap.org/way/26132528', '{"provider":"openstreetmap","element":{"type":"way","id":26132528,"center":{"lat":34.5190116,"lon":69.177226},"tags":{"amenity":"hospital","healthcare":"hospital","name":"رابعه بلخی روغتون","name:en":"Rabia Balkhi Hospital","operator":"Government"}}}'::jsonb, '59b3d0ef4a988abc67fe3502980432994c8269d2c82694ca689b9bb88e739e2a', 'رابعه بلخی روغتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5190116, 69.177226, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:eac16c18ab9678643545cb1a6284d43bb88acf1b5cff3d29f5d787f62679ef28');

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
