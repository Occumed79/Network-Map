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
('osm:node:8955848356', 'https://www.openstreetmap.org/node/8955848356', '{"provider":"openstreetmap","element":{"type":"node","id":8955848356,"lat":34.5331436,"lon":69.1778186,"tags":{"healthcare":"laboratory","name":"Adei Maternity hospital and laboratory"}}}'::jsonb, '733ddaf86b0e6ed847eccb203be3d3fae3766baf790e3c50884d192d533c40df', 'Adei Maternity hospital and laboratory', 'adei maternity hospital and laboratory', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5331436, 69.1778186, NULL, NULL, NULL, 'lab', ARRAY['lab', 'hospital']::text[], 0.78, 'loc:530a7311eb5358b3d10a9ca5d704e833a9b5cc20472c3e755cf76b1d5e1dc232'),
('osm:node:1524299009', 'https://www.openstreetmap.org/node/1524299009', '{"provider":"openstreetmap","element":{"type":"node","id":1524299009,"lat":34.2073485,"lon":70.2774307,"tags":{"amenity":"hospital","healthcare":"hospital","name":"Agam hospital"}}}'::jsonb, '074604470689049cf43c25e0e37b7c2667636f8a757685646f9f8ecdb8031378', 'Agam hospital', 'agam hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.2073485, 70.2774307, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:192f766a797f1747f473ef75b771e078c77a08e726146ff09333902e44009703'),
('osm:node:13518785934', 'https://www.openstreetmap.org/node/13518785934', '{"provider":"openstreetmap","element":{"type":"node","id":13518785934,"lat":34.5569211,"lon":69.1642198,"tags":{"amenity":"pharmacy","name":"Ail Baba Pharmacy"}}}'::jsonb, 'e5f9bbb110cc8b76c53fcb9d3f275ef48bcb24453fc33af0b63f8c5e3284a6b0', 'Ail Baba Pharmacy', 'ail baba pharmacy', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5569211, 69.1642198, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:989c2f9ea50dfcd95ba00caaa97f1fe29b766eb3926907000057bcb66914d154'),
('osm:way:1263368403', 'https://www.openstreetmap.org/way/1263368403', '{"provider":"openstreetmap","element":{"type":"way","id":1263368403,"center":{"lat":37.2314795,"lon":74.1306113},"tags":{"amenity":"clinic","building":"yes","operator":"AKF"}}}'::jsonb, '9bbd94816ff0a059b276a89cf3b8e0cddbea3925674883f87c8141b406f4903b', 'AKF', 'akf', NULL, NULL, NULL, NULL, NULL, 'AF', 37.2314795, 74.1306113, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:0330a547ef29f8756497e60cb99faadf409760ec76243829f1909ed2a54cb120'),
('osm:node:13536635555', 'https://www.openstreetmap.org/node/13536635555', '{"provider":"openstreetmap","element":{"type":"node","id":13536635555,"lat":34.533191,"lon":69.1503223,"tags":{"healthcare":"laboratory","name":"Al Falah Medical Lab"}}}'::jsonb, '1e6ad029400c85f4255f4c0a179379b5576c0959c5b03791e4e999c6db859bf6', 'Al Falah Medical Lab', 'al falah medical lab', NULL, NULL, NULL, NULL, NULL, 'AF', 34.533191, 69.1503223, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:47eebe43041e83278d1be095e4459130b59614e5f67dc3eb07f66b37ae11590f'),
('osm:node:13597183552', 'https://www.openstreetmap.org/node/13597183552', '{"provider":"openstreetmap","element":{"type":"node","id":13597183552,"lat":34.5420423,"lon":69.1480999,"tags":{"healthcare":"laboratory","name":"Al Madina Radiology Center"}}}'::jsonb, '85d7099c32587b07b9050945ca89cf5b9ee7e2955b2cefc970db98ef259da545', 'Al Madina Radiology Center', 'al madina radiology center', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5420423, 69.1480999, NULL, NULL, NULL, 'lab', ARRAY['lab', 'imaging']::text[], 0.78, 'loc:74b804c67d096437cc27504e2940a10e95b7a0f59ada99b57af96adc6968457e'),
('osm:way:1128226846', 'https://www.openstreetmap.org/way/1128226846', '{"provider":"openstreetmap","element":{"type":"way","id":1128226846,"center":{"lat":33.199528,"lon":67.783293},"tags":{"amenity":"clinic","building":"yes","healthcare":"clinic","name":"Ali Abad Clinic","name:fa":"کلینیک علی آباد","operator":"Government","operator:type":"government"}}}'::jsonb, 'd4fa68d31033e69bc5e4ac1413cb25eb95e8732e17df28c37b7bdafe976d8560', 'Ali Abad Clinic', 'ali abad clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 33.199528, 67.783293, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:0bf4cbe449efe260a2ed42ef753e480625535e7e62ec7cea326c6b9ebd9f677a'),
('osm:way:996350117', 'https://www.openstreetmap.org/way/996350117', '{"provider":"openstreetmap","element":{"type":"way","id":996350117,"center":{"lat":34.5200405,"lon":69.1299365},"tags":{"addr:city":"Kabul","amenity":"hospital","healthcare":"hospital","name":"Ali Abad Hospital","name:fa":"شفاخانه علی آباد","name:ps":"د علی آباد روغتون"}}}'::jsonb, 'a891565e4a55d669b585d9348d076c683a8fde13aeacf24bd8964079d4606988', 'Ali Abad Hospital', 'ali abad hospital', NULL, 'Kabul', 'Kabul', NULL, NULL, 'AF', 34.5200405, 69.1299365, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:0736bdbd37592e9ea1b4aca61f6df2b6730474c4dfc579fd88a112263c5a4922'),
('osm:node:13461841921', 'https://www.openstreetmap.org/node/13461841921', '{"provider":"openstreetmap","element":{"type":"node","id":13461841921,"lat":34.5427813,"lon":69.1698122,"tags":{"amenity":"dentist","name":"Amir Dental"}}}'::jsonb, '6769fe989a588e2809923100048de4fb8273f214f62fcd3c47163a6921cd9b32', 'Amir Dental', 'amir dental', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5427813, 69.1698122, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:7ad489032b739f1f414cc34f97c6cba6784a9bb72878dc4d6789c0a8fe0ab2b5'),
('osm:node:10559580418', 'https://www.openstreetmap.org/node/10559580418', '{"provider":"openstreetmap","element":{"type":"node","id":10559580418,"lat":34.5013045,"lon":69.0771982,"tags":{"amenity":"hospital","healthcare":"hospital","name":"Amiri Gharb"}}}'::jsonb, '6c122852207f2419e72477755840a4d17d815266c79abe83861164e0b3371cdc', 'Amiri Gharb', 'amiri gharb', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5013045, 69.0771982, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:b5e65500ed1db2dd9b19381c2eda2408b3ede009e4ff69fe66016267d7a198f5'),
('osm:node:13473429594', 'https://www.openstreetmap.org/node/13473429594', '{"provider":"openstreetmap","element":{"type":"node","id":13473429594,"lat":34.5446798,"lon":69.1592554,"tags":{"amenity":"dentist","name":"Apple Dental Clinic"}}}'::jsonb, '32ffff01f3f6150ae64255e5b051ad763c7ba969f3fb1fe6f3cab4a8f878cc72', 'Apple Dental Clinic', 'apple dental clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5446798, 69.1592554, NULL, NULL, NULL, 'dental', ARRAY['dental', 'general_practitioner']::text[], 0.78, 'loc:b46247646e7f90c461766f216f9d519a43ad82e94195613087e8f9818440c09e'),
('osm:node:11097297290', 'https://www.openstreetmap.org/node/11097297290', '{"provider":"openstreetmap","element":{"type":"node","id":11097297290,"lat":34.3444543,"lon":62.1924303,"tags":{"amenity":"dentist","contact:facebook":"https://www.facebook.com/people/Arian-Dental-Clinic/100054554915512/?locale=ms_MY","name":"Arian Dental Clinic"}}}'::jsonb, '23ff245bd328f6ac1f4353be92bde87d395fc710e43bbe6dbc634953ea2a2bd0', 'Arian Dental Clinic', 'arian dental clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 34.3444543, 62.1924303, NULL, NULL, NULL, 'dental', ARRAY['dental', 'general_practitioner']::text[], 0.78, 'loc:e3d58dbf69216e8311e4868394cffd65db2ae0b96c8a18e203da7f218b5b0d8f'),
('osm:node:10559574133', 'https://www.openstreetmap.org/node/10559574133', '{"provider":"openstreetmap","element":{"type":"node","id":10559574133,"lat":34.500847,"lon":69.0742254,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Arman Gharb"}}}'::jsonb, '979496d1a66c7b4fd5aaf568a1869d4f0e1524757edd98c99a733ec1d1a2ab2e', 'Arman Gharb', 'arman gharb', NULL, NULL, NULL, NULL, NULL, 'AF', 34.500847, 69.0742254, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:bba3c8a43bcacaab6fbbc0faaf5fd950a53842f0279d0e75d6d13737b0476883'),
('osm:node:6004367487', 'https://www.openstreetmap.org/node/6004367487', '{"provider":"openstreetmap","element":{"type":"node","id":6004367487,"lat":36.708792,"lon":67.1035568,"tags":{"addr:street":"Darwaza ee Balkh, Ghazanfar Square","amenity":"pharmacy","email":"m.admin@asiapharma.af","healthcare":"pharmacy","name:en":"AsiaPharma Medical Equipment Co.,ltd","opening_hours":"Sa-Th 08:00-18:00","operator":"AsiaPharma Company","phone":"0093793151601","website":"https://www.asiapharma.af/"}}}'::jsonb, '4bd0734c6c3057a4c676cb5843c70d2a29e7d7c1e59edfd9a5661569c8408419', 'AsiaPharma Company', 'asiapharma company', 'Darwaza ee Balkh, Ghazanfar Square', 'Darwaza ee Balkh, Ghazanfar Square', NULL, NULL, NULL, 'AF', 36.708792, 67.1035568, '0093793151601', 'https://www.asiapharma.af/', 'm.admin@asiapharma.af', 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:6062bd79a3dd90ab47a233ef32a1e8f9bd6cccaa9732fdd4515f708252b19c63'),
('osm:way:1213232173', 'https://www.openstreetmap.org/way/1213232173', '{"provider":"openstreetmap","element":{"type":"way","id":1213232173,"center":{"lat":33.0388739,"lon":67.2826162},"tags":{"amenity":"clinic","healthcare":"clinic","name":"Baba Clinic","name:fa":"کلینیک بابه"}}}'::jsonb, 'bb7deb50be8a6a837fa48ab63e27b8e1a308913ef7c2db0bba55888c69a0e13b', 'Baba Clinic', 'baba clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 33.0388739, 67.2826162, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:3f5ec8dc74ad8cb7f420922fffdf0b593ea25b26a4521d524f08cdf192c40bc4'),
('osm:node:13505744804', 'https://www.openstreetmap.org/node/13505744804', '{"provider":"openstreetmap","element":{"type":"node","id":13505744804,"lat":34.5318116,"lon":69.1200571,"tags":{"amenity":"dentist","name":"Bahar Dental Clinic"}}}'::jsonb, 'a2fd5df9cce8e740c3554e45b176de0eb56caca08b4e23180860cb8a1ce94a5c', 'Bahar Dental Clinic', 'bahar dental clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5318116, 69.1200571, NULL, NULL, NULL, 'dental', ARRAY['dental', 'general_practitioner']::text[], 0.78, 'loc:b8bf4bdfda8eb3977f3d7ee77db4f593454678ad6452f6bce1980964d613477f'),
('osm:way:1332673310', 'https://www.openstreetmap.org/way/1332673310', '{"provider":"openstreetmap","element":{"type":"way","id":1332673310,"center":{"lat":36.7510892,"lon":66.8980057},"tags":{"amenity":"hospital","barrier":"wall","name":"Balkh district hospital","name:en":"Balkh district hospital"}}}'::jsonb, 'ca70f0bdba15732d1870836bb60998c65f2f7a28cab8f59041dd1aadbd764c0b', 'Balkh district hospital', 'balkh district hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 36.7510892, 66.8980057, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:9c49e36ecea1a0b9832ed1039d9ff714f614c8b6c3275023377789aa5c539611'),
('osm:way:1337690668', 'https://www.openstreetmap.org/way/1337690668', '{"provider":"openstreetmap","element":{"type":"way","id":1337690668,"center":{"lat":34.8346617,"lon":67.7806331},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Bamyan Hospital","name:en":"Bamyan Hospital"}}}'::jsonb, '5db48fec6fd92b68faf260bbf4d08750ec167786a1f20b5f0dfa2c65a585632c', 'Bamyan Hospital', 'bamyan hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.8346617, 67.7806331, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:2ab24228f4609075632676e349971ad0023c45079900e02d58580014abf4d502'),
('osm:node:6565866840', 'https://www.openstreetmap.org/node/6565866840', '{"provider":"openstreetmap","element":{"type":"node","id":6565866840,"lat":34.3503604,"lon":62.1957663,"tags":{"amenity":"hospital","healthcare":"hospital","name":"Banki Khun","name:fa":"بانک خون"}}}'::jsonb, 'e7683da338cdc2ffbbc776719e3e1afb09687bc3e6bd0ef7de54d1ed7085c74c', 'Banki Khun', 'banki khun', NULL, NULL, NULL, NULL, NULL, 'AF', 34.3503604, 62.1957663, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:7ac3892caf9c82bf661983fe0e82fae851f804ecc5e10b5df90a8b8837917037'),
('osm:node:13597201060', 'https://www.openstreetmap.org/node/13597201060', '{"provider":"openstreetmap","element":{"type":"node","id":13597201060,"lat":34.5428642,"lon":69.1259563,"tags":{"amenity":"clinic","name":"Barin Clinic"}}}'::jsonb, 'f6533223bb4b834e74c1ba324322896b13735578d767a2750b797f5607d22e32', 'Barin Clinic', 'barin clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5428642, 69.1259563, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:ce8f6a226df3270e766bce3c4fcb6572dd85a43ebe7c8c7d3b2b4981475fbe1b'),
('osm:node:13578416225', 'https://www.openstreetmap.org/node/13578416225', '{"provider":"openstreetmap","element":{"type":"node","id":13578416225,"lat":34.5339633,"lon":69.1784339,"tags":{"amenity":"dentist","name":"Barnaa Dental Clinic"}}}'::jsonb, '3b0ca63245f3ba02e9bcca5c17770e618fb20ba748b5d869f62fe7823bf0622b', 'Barnaa Dental Clinic', 'barnaa dental clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5339633, 69.1784339, NULL, NULL, NULL, 'dental', ARRAY['dental', 'general_practitioner']::text[], 0.78, 'loc:3fbbbca7c9757d9f04115221ca8235a5cd9cfca14077f44dd123a056857f5cdd'),
('osm:node:13624594751', 'https://www.openstreetmap.org/node/13624594751', '{"provider":"openstreetmap","element":{"type":"node","id":13624594751,"lat":34.5373999,"lon":69.1901373,"tags":{"amenity":"hospital","name":"Bayat Matter & Maternity Hospital"}}}'::jsonb, '137484fa315088299d09cbda11e43c068e6a56c1ad66e6a069362dbbc6f5a408', 'Bayat Matter & Maternity Hospital', 'bayat matter maternity hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5373999, 69.1901373, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:032cdd6d3a650d9e89b0456c79503bb16e5f787d3097dd3c7f7b81f75a063356'),
('osm:node:8881993787', 'https://www.openstreetmap.org/node/8881993787', '{"provider":"openstreetmap","element":{"type":"node","id":8881993787,"lat":34.7051143,"lon":69.0393489,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Behzadi Clinic(مرکز صحی بهزادی)"}}}'::jsonb, '08c4776db2c073335c3df720f57989a908eb54e8b15b192995f492604afeb4d8', 'Behzadi Clinic(مرکز صحی بهزادی)', 'behzadi clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 34.7051143, 69.0393489, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:62cac72f121173076c92eb582b5660bff4692d227f756b2f4379310f83453b58'),
('osm:node:13523510556', 'https://www.openstreetmap.org/node/13523510556', '{"provider":"openstreetmap","element":{"type":"node","id":13523510556,"lat":34.5367272,"lon":69.1619014,"tags":{"amenity":"clinic","name":"Blossom Health Care Center (BHCC)"}}}'::jsonb, 'e8e499ad0662976d44e4a1590cd6b8bdaf42535838f5a708c7ddb9bd539e8e7b', 'Blossom Health Care Center (BHCC)', 'blossom health care center bhcc', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5367272, 69.1619014, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:1b15e2ed352307ef234f84a685f270c681aba4b74dc6f6017a24c54edf798039'),
('osm:way:1330342233', 'https://www.openstreetmap.org/way/1330342233', '{"provider":"openstreetmap","element":{"type":"way","id":1330342233,"center":{"lat":36.1838302,"lon":68.7522416},"tags":{"amenity":"hospital","name":"Central destrict hospital"}}}'::jsonb, '24a61a0e3cc0350f778eef40dc6fa167dd7dd8e3b6f985e9b22f3aee82d8bf0f', 'Central destrict hospital', 'central destrict hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 36.1838302, 68.7522416, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:c1b7d2e5a12e93fa3139e36bb5261f82cc131758e4c28cfa94a4967c9dbd9b3b'),
('osm:node:8762298644', 'https://www.openstreetmap.org/node/8762298644', '{"provider":"openstreetmap","element":{"type":"node","id":8762298644,"lat":34.5475649,"lon":69.1396383,"tags":{"healthcare":"laboratory","name":"City Medical Laboratory"}}}'::jsonb, '92a823ff79cbb2c86f75aab84351ad6da7e8e0116589a5bbfd9158f8dfdb1e2b', 'City Medical Laboratory', 'city medical laboratory', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5475649, 69.1396383, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:b8b8f9a36dbe34aa2621ea325d0a8e9a8973b7a5513f9f3b2a12766b596468c5'),
('osm:node:3970847840', 'https://www.openstreetmap.org/node/3970847840', '{"provider":"openstreetmap","element":{"type":"node","id":3970847840,"lat":37.4722439,"lon":71.4926598,"tags":{"amenity":"doctors","name":"Clinic"}}}'::jsonb, '655faa4344010bdf73839d9f251a93f3cfd6379f61c3d30932a378ef49caa21d', 'Clinic', 'clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 37.4722439, 71.4926598, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:a238f6578bb790e6f8fd9668ac59f9b88a7959ed10f31175e916eef890511344'),
('osm:node:3975513702', 'https://www.openstreetmap.org/node/3975513702', '{"provider":"openstreetmap","element":{"type":"node","id":3975513702,"lat":36.5556632,"lon":70.9199934,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Clinic"}}}'::jsonb, '8095c677421f61a42f0cd4b2fe4a5cc9d45668fb88bbecd739bafce6e59e2c2c', 'Clinic', 'clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 36.5556632, 70.9199934, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:1c456ff8f9493b746b8c9ec4e8280e28393ad990c29c6db039062dedc79df66c'),
('osm:way:395776989', 'https://www.openstreetmap.org/way/395776989', '{"provider":"openstreetmap","element":{"type":"way","id":395776989,"center":{"lat":36.6351563,"lon":71.156318},"tags":{"amenity":"clinic","building":"yes","name":"Clinic"}}}'::jsonb, '8e822f138b57f5e0eae79102f0b9e03664201251d09746823b6a9d0316820412', 'Clinic', 'clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 36.6351563, 71.156318, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:40729ecb622814bed6eba63961ebf5e2b248571965607206655bac127ce49575'),
('osm:way:894548666', 'https://www.openstreetmap.org/way/894548666', '{"provider":"openstreetmap","element":{"type":"way","id":894548666,"center":{"lat":33.6722512,"lon":69.4501171},"tags":{"amenity":"hospital","healthcare":"hospital","healthcare:speciality":"general","name":"Clinic","name:ps":"کلینک"}}}'::jsonb, 'e9839c3486f0b600246f8c06c2015d432381c42241a3bafaea3226cfa4c37bec', 'Clinic', 'clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 33.6722512, 69.4501171, NULL, NULL, NULL, 'hospital', ARRAY['hospital', 'general_practitioner']::text[], 0.78, 'loc:0519ebcd9df2ac99d7c686a56d4bb99ff441f495ca9474f11b7ac22c8e918e3c'),
('osm:node:10552730831', 'https://www.openstreetmap.org/node/10552730831', '{"provider":"openstreetmap","element":{"type":"node","id":10552730831,"lat":34.5013123,"lon":69.0736191,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Clinic 50 bestar Dashte Barchi","operator":"government","operator:type":"community"}}}'::jsonb, '7c1aa6e193e7769fc659b5990a5770f58d5b217129778bcf03f094f461584cfe', 'Clinic 50 bestar Dashte Barchi', 'clinic 50 bestar dashte barchi', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5013123, 69.0736191, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:ad579d35752ec2f3afdfc964f4ada71f99ed5696c986947f7de0e0f28312603f'),
('osm:way:1125514811', 'https://www.openstreetmap.org/way/1125514811', '{"provider":"openstreetmap","element":{"type":"way","id":1125514811,"center":{"lat":34.5037274,"lon":69.0360406},"tags":{"addr:city":"kabul Afghanistan","amenity":"clinic","healthcare":"clinic","name":"Clinic jame polekhoshk","name:fa":"کلینیک جامع پلخشک(کلینیک چهل دختران)"}}}'::jsonb, '9b4c777c3a71fc99e1609338860c1da6670eab38fa3e6995ca45a0a13e42ff7f', 'Clinic jame polekhoshk', 'clinic jame polekhoshk', NULL, 'kabul Afghanistan', 'kabul Afghanistan', NULL, NULL, 'AF', 34.5037274, 69.0360406, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:d540ec12f10a7cfb2557aeee3613931a3bd79c7e54a39671de3c22e6e61cab17'),
('osm:node:1512483958', 'https://www.openstreetmap.org/node/1512483958', '{"provider":"openstreetmap","element":{"type":"node","id":1512483958,"lat":34.6809618,"lon":70.6060578,"tags":{"amenity":"hospital","name":"Dara I Nur hospital"}}}'::jsonb, 'bc23b83941c37ee9a4844f5b23731f779c6718cd6d76192d71d9e4a8d9e980b2', 'Dara I Nur hospital', 'dara i nur hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.6809618, 70.6060578, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:b9f62851de4f099b716f5dbbdb5d6a729ed4c5123ae0a1d7f5a585abe451ba24'),
('osm:node:12329201842', 'https://www.openstreetmap.org/node/12329201842', '{"provider":"openstreetmap","element":{"type":"node","id":12329201842,"lat":36.708285,"lon":67.1043996,"tags":{"amenity":"dentist","name":"Darab Ahaddi Dental Clinic"}}}'::jsonb, '595034dec75b71eb92309175df72c75d2abd4d9554cc2c2d4cb4283ce8ad51e7', 'Darab Ahaddi Dental Clinic', 'darab ahaddi dental clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 36.708285, 67.1043996, NULL, NULL, NULL, 'dental', ARRAY['dental', 'general_practitioner']::text[], 0.78, 'loc:d47141396617eacd29e37782ccc735e3c31030a4c26213bc0efc85d1c99e3235'),
('osm:way:1094670809', 'https://www.openstreetmap.org/way/1094670809', '{"provider":"openstreetmap","element":{"type":"way","id":1094670809,"center":{"lat":34.5092703,"lon":69.1176934},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Darman"}}}'::jsonb, 'cd4792463ec4de0cb7e74340f5d54575dfe17dfdc686c2ede41d180ae6259380', 'Darman', 'darman', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5092703, 69.1176934, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:7f29a8ff39c66dbec69b66cf0eda2629ee23ab35243095b24f1249343f32a6ae'),
('osm:node:6041393995', 'https://www.openstreetmap.org/node/6041393995', '{"provider":"openstreetmap","element":{"type":"node","id":6041393995,"lat":34.5350271,"lon":69.1635342,"tags":{"amenity":"hospital","email":"info@medical-kabul.com","healthcare":"hospital","name":"DK - German Medical Diagnostic Centre","phone":"+93 (0)706 060141","website":"https://www.medical-kabul.com/"}}}'::jsonb, '276fb3f97614cecb7c21b8041da1fcc8912bdb5216c1ec2d615e05325da31cc4', 'DK - German Medical Diagnostic Centre', 'dk german medical diagnostic centre', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5350271, 69.1635342, '+93 (0)706 060141', 'https://www.medical-kabul.com/', 'info@medical-kabul.com', 'lab', ARRAY['lab', 'hospital']::text[], 0.78, 'loc:8038292213f8a42955d1760e5ffeeee94938ea84adb43be854d6ddd0fab5b098'),
('osm:node:7207833590', 'https://www.openstreetmap.org/node/7207833590', '{"provider":"openstreetmap","element":{"type":"node","id":7207833590,"lat":34.5372209,"lon":69.1579668,"tags":{"addr:city":"كابل","amenity":"hospital","healthcare":"hospital","name":"DK-German Medical Centre","name:de":"DK-Deutsches Medizinisches Zentrum","name:en":"DK-German Medical Centre"}}}'::jsonb, '66d01ebae12339abf2e1f3b689baa9fe280949e3e7da7fbb50e1f43321278dd6', 'DK-German Medical Centre', 'dk german medical centre', NULL, 'كابل', 'كابل', NULL, NULL, 'AF', 34.5372209, 69.1579668, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:add5c8378adbf68d36dfc7f57ff75ee45d39d158cfc82b0d22f62dbeb45a7232'),
('osm:node:9948100453', 'https://www.openstreetmap.org/node/9948100453', '{"provider":"openstreetmap","element":{"type":"node","id":9948100453,"lat":34.5333861,"lon":69.1414346,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Doctor Najib Dabiri Clinic"}}}'::jsonb, '551e38ac8fade0be86238075d8abc5254f699f90f678754a3fbb147372b2b99b', 'Doctor Najib Dabiri Clinic', 'doctor najib dabiri clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5333861, 69.1414346, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:8453c2f0a09b196a64149788e65e2ea5fa1e70da7329afac14acdc1936fe60f9'),
('osm:node:3966387072', 'https://www.openstreetmap.org/node/3966387072', '{"provider":"openstreetmap","element":{"type":"node","id":3966387072,"lat":37.6247671,"lon":71.5123651,"tags":{"amenity":"doctors","name":"Doctor''s Surgery"}}}'::jsonb, '8d405027207fbe1693a95fc524d8b3a2f219a1001a37d50a176b8f3ac83482a2', 'Doctor''s Surgery', 'doctor s surgery', NULL, NULL, NULL, NULL, NULL, 'AF', 37.6247671, 71.5123651, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:d5037a880f2df57446ddbf336399f7e46f404ad4ea9ac1ff6929bc5f5dc787a3'),
('osm:node:3968083191', 'https://www.openstreetmap.org/node/3968083191', '{"provider":"openstreetmap","element":{"type":"node","id":3968083191,"lat":37.5552016,"lon":71.4920864,"tags":{"amenity":"doctors","name":"Doctor''s Surgery"}}}'::jsonb, 'b0984acc779dd4d848e4462c5cbb5446adb4c7e66d3c818b41d633e52ba86626', 'Doctor''s Surgery', 'doctor s surgery', NULL, NULL, NULL, NULL, NULL, 'AF', 37.5552016, 71.4920864, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:514e81eb33c869f978b35bb71bddd655b208132310aa39d6fd595c067f3d109d'),
('osm:node:3973541448', 'https://www.openstreetmap.org/node/3973541448', '{"provider":"openstreetmap","element":{"type":"node","id":3973541448,"lat":37.3092048,"lon":70.9282287,"tags":{"amenity":"doctors","name":"Doctor''s Surgery"}}}'::jsonb, '913d0dc8f9ffaf2122c6e9449783e5ffaf342cf311b8b7052a681f424139c354', 'Doctor''s Surgery', 'doctor s surgery', NULL, NULL, NULL, NULL, NULL, 'AF', 37.3092048, 70.9282287, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:ead840c89183120d88e00cb20715e0f82b4326081849bbf0c90f53e1ad53d348'),
('osm:way:393598123', 'https://www.openstreetmap.org/way/393598123', '{"provider":"openstreetmap","element":{"type":"way","id":393598123,"center":{"lat":37.5551643,"lon":71.4920816},"tags":{"amenity":"doctors","building":"residential","name":"Doctor''s Surgery"}}}'::jsonb, 'fc78194666e53d38f8ab195d5fb48ffa11162bdde7473f83524a52db88b6f78b', 'Doctor''s Surgery', 'doctor s surgery', NULL, NULL, NULL, NULL, NULL, 'AF', 37.5551643, 71.4920816, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:c24658122eb8b95147f6aa9694d072e0a50c3258abc4511d25560f242ac9b45e'),
('osm:way:394282091', 'https://www.openstreetmap.org/way/394282091', '{"provider":"openstreetmap","element":{"type":"way","id":394282091,"center":{"lat":37.3385239,"lon":71.4656016},"tags":{"amenity":"doctors","name":"Doctor''s Surgery"}}}'::jsonb, 'ecc6abc4cf22e1fc29f5e47d95e9b9af1bccf5074989c677a7d333533a04584d', 'Doctor''s Surgery', 'doctor s surgery', NULL, NULL, NULL, NULL, NULL, 'AF', 37.3385239, 71.4656016, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:9af9d2437e7ad42b9a5cb61799e2155b382a8107c6dc3006f37ae3d1834e7d1a'),
('osm:way:393305722', 'https://www.openstreetmap.org/way/393305722', '{"provider":"openstreetmap","element":{"type":"way","id":393305722,"center":{"lat":37.9013807,"lon":71.378346},"tags":{"amenity":"doctors","building":"residential","name":"Doctors Surgery"}}}'::jsonb, 'c46a42d2e555f83fb55949c4aed49f647d78cef2229887f924ff7741afdbbc8b', 'Doctors Surgery', 'doctors surgery', NULL, NULL, NULL, NULL, NULL, 'AF', 37.9013807, 71.378346, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:3f0c76d7a82fe68f02178031a3a874e96c879767b6645d653847e920528e98b6'),
('osm:node:1732052421', 'https://www.openstreetmap.org/node/1732052421', '{"provider":"openstreetmap","element":{"type":"node","id":1732052421,"lat":34.2984754,"lon":69.8058287,"tags":{"amenity":"pharmacy","dispensing":"yes","name":"Dr Nazir Darmalton"}}}'::jsonb, '9436f3ab67a03a7b3e454a04216f6541b16ca70b482a9dfc796c809d5dba1545', 'Dr Nazir Darmalton', 'dr nazir darmalton', NULL, NULL, NULL, NULL, NULL, 'AF', 34.2984754, 69.8058287, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:b1666ccb093aed40d058c12c440ddd23f1461cc75cbcb578b548ad6e65051eff'),
('osm:node:13536542136', 'https://www.openstreetmap.org/node/13536542136', '{"provider":"openstreetmap","element":{"type":"node","id":13536542136,"lat":34.5322081,"lon":69.1440148,"tags":{"amenity":"pharmacy","name":"Dunya Behtrain Pharmacy"}}}'::jsonb, '578f96e1f482880e381c15adfc3a4689a22956e48f8ded5b14262f6a04ffbe49', 'Dunya Behtrain Pharmacy', 'dunya behtrain pharmacy', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5322081, 69.1440148, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:26008e3cce08bc66a67e156c9d0a7d2554a654aca7b089b5e5d189e9b89682da'),
('osm:node:7955058985', 'https://www.openstreetmap.org/node/7955058985', '{"provider":"openstreetmap","element":{"type":"node","id":7955058985,"lat":34.5314995,"lon":69.1644744,"tags":{"addr:city":"كابل","amenity":"hospital","healthcare":"hospital","name":"Enayat Doctors Complex"}}}'::jsonb, 'f94e279445a08defc9372f3e15c47cc0a883ee7f9c83ee05dbdf16fdff49a072', 'Enayat Doctors Complex', 'enayat doctors complex', NULL, 'كابل', 'كابل', NULL, NULL, 'AF', 34.5314995, 69.1644744, NULL, NULL, NULL, 'hospital', ARRAY['hospital', 'general_practitioner']::text[], 0.86, 'loc:9691d848075b1295a15eda6151e908a89c6c7c9e721b4844220fd21b1cbf7eeb'),
('osm:node:13463908499', 'https://www.openstreetmap.org/node/13463908499', '{"provider":"openstreetmap","element":{"type":"node","id":13463908499,"lat":34.5327079,"lon":69.1433839,"tags":{"amenity":"pharmacy","name":"Erfan Sadat Pharmacy"}}}'::jsonb, '6d0cb8d8046fa779f609a6ca51af1c0e70b00fc93e73d571c8112210c6a7fbf5', 'Erfan Sadat Pharmacy', 'erfan sadat pharmacy', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5327079, 69.1433839, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:3af3ab6822e2805c88dee6407ca7d585d0eb99aaca5a9570472fa8973b3679b5'),
('osm:node:11455452069', 'https://www.openstreetmap.org/node/11455452069', '{"provider":"openstreetmap","element":{"type":"node","id":11455452069,"lat":34.4871366,"lon":69.1382363,"tags":{"addr:postcode":"1004","addr:street":"سرک دارالامان","amenity":"clinic","email":"zafar_fazli@yahoo.com","healthcare":"laboratory","internet_access":"wlan","name":"Estiqlal Medcal Laboratory","phone":"0789286528"}}}'::jsonb, 'a9b6a13100c4cf54eeefd94d5c1da52d16e2dfa41bae3a661be7a4db71eceb30', 'Estiqlal Medcal Laboratory', 'estiqlal medcal laboratory', 'سرک دارالامان', 'سرک دارالامان, 1004', NULL, NULL, '1004', 'AF', 34.4871366, 69.1382363, '0789286528', NULL, 'zafar_fazli@yahoo.com', 'lab', ARRAY['lab', 'general_practitioner']::text[], 0.86, 'loc:bb6b5a0892a3ce594d562d2066384a1df185b8a6fb80b4485aff700a44f5a5d7'),
('osm:way:473032503', 'https://www.openstreetmap.org/way/473032503', '{"provider":"openstreetmap","element":{"type":"way","id":473032503,"center":{"lat":31.6158896,"lon":65.7594122},"tags":{"addr:city":"قندهار","amenity":"university","faculty":"stomatology","healthcare":"hospital","name":"Faculty of Medicine, Faculty of Stomatology, Teaching Hospital","operator":"Kandahar University"}}}'::jsonb, 'aae15e9ac466c2abe32bc977b2e27a264476d9f9793b0fde651c16fa7a3a566b', 'Faculty of Medicine, Faculty of Stomatology, Teaching Hospital', 'faculty of medicine faculty of stomatology teaching hospital', NULL, 'قندهار', 'قندهار', NULL, NULL, 'AF', 31.6158896, 65.7594122, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:3a14743525d49b027d784dc297508bb6ed9d838f26bb848dac79a2ca15ddedd1');

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
