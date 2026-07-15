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
('osm:node:3983898880', 'https://www.openstreetmap.org/node/3983898880', '{"provider":"openstreetmap","element":{"type":"node","id":3983898880,"lat":42.0745193,"lon":19.5150474,"tags":{"amenity":"dentist","name":"Nord Dentist","payment:coins":"yes","payment:credit_cards":"no","payment:cryptocurrencies":"no","payment:debit_cards":"no","payment:electronic_purses":"no","payment:notes":"yes","smoking":"outside","source":"bing","source_ref:url":"https://www.flickr.com/photos/134902422@N04/map?&fLat=41.9559&fLon=19.4337&zl=11&order_by=recent","wheelchair":"limited"}}}'::jsonb, '9242c658aa4328a4a2c7e6635a117cdb355c216790ecd6a2c0bace57ea163ecc', 'Nord Dentist', 'nord dentist', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0745193, 19.5150474, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:ed3c1b27f7fe2e45f79b30ee82b51647c581f1c717ee9457b5251d474f80298b'),
('osm:node:6861407189', 'https://www.openstreetmap.org/node/6861407189', '{"provider":"openstreetmap","element":{"type":"node","id":6861407189,"lat":40.4541927,"lon":19.488267,"tags":{"amenity":"pharmacy","name":"Nr. 2"}}}'::jsonb, '091d76b05cd43008fc66e6c5ef4503bfe48577afbae9ea5ac29a2ca8342b49b2', 'Nr. 2', 'nr 2', NULL, NULL, NULL, NULL, NULL, 'AL', 40.4541927, 19.488267, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:fa11edde08edbbcb6831cf3c8ad49d2f5b5023a7194972ae45f7b2148d08199f'),
('osm:node:6855603888', 'https://www.openstreetmap.org/node/6855603888', '{"provider":"openstreetmap","element":{"type":"node","id":6855603888,"lat":41.3142802,"lon":19.4489451,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Nr5"}}}'::jsonb, '8ba0c1e2a8c94433f78b9ff8a4b68d1123153601b9898eec42e11f95bf9f6bfa', 'Nr5', 'nr5', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3142802, 19.4489451, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:f9d1f22bbdd63e0eef8b87021eb37fdf5e4ab74aa252ca63e2ab42ff4e7d7d86'),
('osm:node:12188491694', 'https://www.openstreetmap.org/node/12188491694', '{"provider":"openstreetmap","element":{"type":"node","id":12188491694,"lat":40.9411299,"lon":19.7034185,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Nuri"}}}'::jsonb, '3b3495b687dc50b353d4e52ddafb86a112c8671b4b022f8435d6f3d48f020282', 'Nuri', 'nuri', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9411299, 19.7034185, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:4f7225316fdec37ab942b4be66141b0089746c5cf171da862fba3fc2a3dac2b8'),
('osm:node:3387400132', 'https://www.openstreetmap.org/node/3387400132', '{"provider":"openstreetmap","element":{"type":"node","id":3387400132,"lat":42.0749012,"lon":19.5247902,"tags":{"amenity":"doctors","healthcare":"doctor","healthcare:speciality":"gynaecology","name":"Obsetri-Gjinekologji","wheelchair":"limited"}}}'::jsonb, 'ad88caa26065e356ac1e88bd512d8103d96dce19ee3e6a52377cf9642a5ac115', 'Obsetri-Gjinekologji', 'obsetri gjinekologji', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0749012, 19.5247902, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:645e10730c06201059aad47fbea7a47dd5647113908e52585c3f28307d10780b'),
('osm:node:9947842306', 'https://www.openstreetmap.org/node/9947842306', '{"provider":"openstreetmap","element":{"type":"node","id":9947842306,"lat":40.0832578,"lon":20.1422301,"tags":{"healthcare":"laboratory","name":"Odisea"}}}'::jsonb, '60b1e96fe04a2a3f9e06ce4ac073236e76d3933f54a0efed6e7283d215bc738f', 'Odisea', 'odisea', NULL, NULL, NULL, NULL, NULL, 'AL', 40.0832578, 20.1422301, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:dadb816ff78f4774063aac583d734d799a32bce9e336447091a1017fb416f629'),
('osm:node:4579869233', 'https://www.openstreetmap.org/node/4579869233', '{"provider":"openstreetmap","element":{"type":"node","id":4579869233,"lat":41.3413974,"lon":19.8344535,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Okulistika","website":"https://www.qsut.gov.al/index.php/sherbimet-mjekesore/sherbimi-okulistikes/sherbimet-e-ofruara/"}}}'::jsonb, '063c422c138531a157a63ef667a8926d14763885cb0fdd53860d2e46a766a54c', 'Okulistika', 'okulistika', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3413974, 19.8344535, NULL, 'https://www.qsut.gov.al/index.php/sherbimet-mjekesore/sherbimi-okulistikes/sherbimet-e-ofruara/', NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:48a4c01fcdd60376a9c56102c22a6e4f6e237cf760c401940b817ca8a6a72c9f'),
('osm:node:4579869232', 'https://www.openstreetmap.org/node/4579869232', '{"provider":"openstreetmap","element":{"type":"node","id":4579869232,"lat":41.3411849,"lon":19.8346184,"tags":{"amenity":"clinic","healthcare":"clinic","name":"OMF"}}}'::jsonb, 'f7071082e93522c3eb176b366ac83b677fea4c58624d503d5cc555c6d8de9c3f', 'OMF', 'omf', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3411849, 19.8346184, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:84b438b7d5bdddd141e3d622860006409a88704acfc347696166c9c51ed08682'),
('osm:node:5593796821', 'https://www.openstreetmap.org/node/5593796821', '{"provider":"openstreetmap","element":{"type":"node","id":5593796821,"lat":39.8759701,"lon":20.0039231,"tags":{"amenity":"pharmacy","name":"Optik"}}}'::jsonb, 'c100b42483ccaf4fda994471ce4e5c5611977de42c8b236ed02f33e2213c6dc8', 'Optik', 'optik', NULL, NULL, NULL, NULL, NULL, 'AL', 39.8759701, 20.0039231, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:5e47ea5d9d019dc1c11b9c50d83a0818ee32acaee9a3c0348ab1792c541a6cb9'),
('osm:node:11197333539', 'https://www.openstreetmap.org/node/11197333539', '{"provider":"openstreetmap","element":{"type":"node","id":11197333539,"lat":41.3293011,"lon":19.8156129,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Orange"}}}'::jsonb, 'bc17d7d5babf4fca7e502c9423eb0998e4745d0e4b4529c301c92415b392e6bd', 'Orange', 'orange', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3293011, 19.8156129, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:0037232bf6e9487bea1f3efd64ecd6b62acb50e881f7c1f923064acee03717f7'),
('osm:node:6853147286', 'https://www.openstreetmap.org/node/6853147286', '{"provider":"openstreetmap","element":{"type":"node","id":6853147286,"lat":41.3216971,"lon":19.4506475,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Orange"}}}'::jsonb, '78d882286494e237039178cdb69efa0be6397c483e4db5552c84aab5d0f80bde', 'Orange', 'orange', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3216971, 19.4506475, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:bdc0be1a2b5cd225a4a03a637fddc17ea0e349cef6c74bb5a759b0b0ed72c5fc'),
('osm:node:9124938920', 'https://www.openstreetmap.org/node/9124938920', '{"provider":"openstreetmap","element":{"type":"node","id":9124938920,"lat":41.3281614,"lon":19.8224208,"tags":{"amenity":"pharmacy","check_date":"2024-06-14","healthcare":"pharmacy","name":"Orange"}}}'::jsonb, '655fc51adfe5c2cd824cf6d76e7e1d6a58afa55d015860f2c55babcd3fdb850f', 'Orange', 'orange', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3281614, 19.8224208, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:4c366b569e2b3fcf2f5c50ff164f321194d2b0d182ad07ea17e447b5b5a780c5'),
('osm:node:9825988508', 'https://www.openstreetmap.org/node/9825988508', '{"provider":"openstreetmap","element":{"type":"node","id":9825988508,"lat":40.6139572,"lon":20.7799421,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Orange"}}}'::jsonb, 'de7899150929f0b358f9a9b1c823b41aadf942f00f7cabe40330ba2304e1db87', 'Orange', 'orange', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6139572, 20.7799421, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:10432fdd86a5a326b71bbd116faf2b5293b665dc9128dc98c94e571e33d59edd'),
('osm:node:2775994244', 'https://www.openstreetmap.org/node/2775994244', '{"provider":"openstreetmap","element":{"type":"node","id":2775994244,"lat":41.3186886,"lon":19.8083712,"tags":{"addr:street":"Rruga Sulejman Delvina","amenity":"pharmacy","healthcare":"pharmacy","name":"Orange Farmaci"}}}'::jsonb, '3ae02baf7d572ceb3d080922cb3279e1d0dc12e02897edf31c9d81490c7fec88', 'Orange Farmaci', 'orange farmaci', 'Rruga Sulejman Delvina', 'Rruga Sulejman Delvina', NULL, NULL, NULL, 'AL', 41.3186886, 19.8083712, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:253bd91422ed402bd8d32697f52d308c8b4ba2e284e0609590a997778b761cba'),
('osm:node:5922575589', 'https://www.openstreetmap.org/node/5922575589', '{"provider":"openstreetmap","element":{"type":"node","id":5922575589,"lat":41.3321652,"lon":19.817086,"tags":{"addr:street":"Bulevardi Zogu i Parë","amenity":"pharmacy","healthcare":"pharmacy","name":"Orange Farmaci"}}}'::jsonb, '630b91e9658de4909bf616ebe21e837507e66fa19cec2fef31a2267f057dca9b', 'Orange Farmaci', 'orange farmaci', 'Bulevardi Zogu i Parë', 'Bulevardi Zogu i Parë', NULL, NULL, NULL, 'AL', 41.3321652, 19.817086, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:e4c442b021e18197eec3296528b0d926ccabc6c4569a440a1064264cb38061bf'),
('osm:node:6531514759', 'https://www.openstreetmap.org/node/6531514759', '{"provider":"openstreetmap","element":{"type":"node","id":6531514759,"lat":41.3306673,"lon":19.827658,"tags":{"addr:city":"Tirane","addr:housenumber":"7","addr:street":"Rruga Hoxha Tahsim","amenity":"pharmacy","check_date":"2025-04-26","drive_through":"no","healthcare":"pharmacy","name":"Orange Farmaci","payment:cash":"yes","payment:credit_cards":"yes","phone":"+355 453 53 000"}}}'::jsonb, '008e3ce272287a92911593787334c004bcb9785e30fed37ec67e89e74ae34e6f', 'Orange Farmaci', 'orange farmaci', '7 Rruga Hoxha Tahsim', '7 Rruga Hoxha Tahsim, Tirane', 'Tirane', NULL, NULL, 'AL', 41.3306673, 19.827658, '+355 453 53 000', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:970905df2734d8049e2e79473ba78dc0b31182d30bb3dd048989349667d66b92'),
('osm:node:6841245597', 'https://www.openstreetmap.org/node/6841245597', '{"provider":"openstreetmap","element":{"type":"node","id":6841245597,"lat":41.3306315,"lon":19.8228286,"tags":{"amenity":"pharmacy","check_date":"2023-09-24","healthcare":"pharmacy","level":"0","name":"Orange Farmaci"}}}'::jsonb, 'b622dd9276d116c68a5d40d862e10faa5d6b3be4d619c54b6c12c8843921c29a', 'Orange Farmaci', 'orange farmaci', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3306315, 19.8228286, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:8ef7825f366929cd18c071cbf97df2dfd4c19dbfc99ee3d7cad15b922a8085e4'),
('osm:node:6845168363', 'https://www.openstreetmap.org/node/6845168363', '{"provider":"openstreetmap","element":{"type":"node","id":6845168363,"lat":41.3146859,"lon":19.4455909,"tags":{"addr:street":"Rruga Aleksander Goga","amenity":"pharmacy","healthcare":"pharmacy","name":"Orange Farmaci"}}}'::jsonb, 'f092d616e7bcba80e17d2b5b328a97b610a24a43b7b68d3ba371da0a996c7d99', 'Orange Farmaci', 'orange farmaci', 'Rruga Aleksander Goga', 'Rruga Aleksander Goga', NULL, NULL, NULL, 'AL', 41.3146859, 19.4455909, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:fc23e4f969428ed50c882d43d7c3443a4e152824ec143e3abce9daecd80b8617'),
('osm:node:6882332724', 'https://www.openstreetmap.org/node/6882332724', '{"provider":"openstreetmap","element":{"type":"node","id":6882332724,"lat":41.3237822,"lon":19.781675,"tags":{"amenity":"pharmacy","name":"Orange Farmaci"}}}'::jsonb, 'd394087ec5e56d8aedc527d18d4109040bb4e00a4d33cfff907e07aa48e0714a', 'Orange Farmaci', 'orange farmaci', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3237822, 19.781675, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:a96a75dd3516eb496a52b705ef7f90b0d4911d14c20dd746f14b4cba112f1cb0'),
('osm:node:9550894549', 'https://www.openstreetmap.org/node/9550894549', '{"provider":"openstreetmap","element":{"type":"node","id":9550894549,"lat":41.331064,"lon":19.8209549,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Orange Farmaci"}}}'::jsonb, '9363b5c7685122f7c79e8d62a56ef6c6256626c776fc29fa6152d0090dd2bb31', 'Orange Farmaci', 'orange farmaci', NULL, NULL, NULL, NULL, NULL, 'AL', 41.331064, 19.8209549, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:023912d9b4da3884b1e27508c01c5333d856e21a7e2a792958384dd66a074d8e'),
('osm:node:9128749460', 'https://www.openstreetmap.org/node/9128749460', '{"provider":"openstreetmap","element":{"type":"node","id":9128749460,"lat":41.3304043,"lon":19.8395737,"tags":{"amenity":"pharmacy","check_date":"2024-05-24","healthcare":"pharmacy","internet_access":"no","name":"Orange Pharmacy","name:sq":"Farmaci Orange","payment:cards":"no","payment:cash":"yes","payment:credit_cards":"no","payment:debit_cards":"no","wheelchair":"no"}}}'::jsonb, 'cacff5dffd58b828d18b558461b73f1d19a60d6a42e4251ad5162c6ddd74c365', 'Orange Pharmacy', 'orange pharmacy', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3304043, 19.8395737, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:9cd7cd345f7fda4a33eaeb89fc5b34708c99609ae5dbe58a8273a35e00bddc2e'),
('osm:node:4811627821', 'https://www.openstreetmap.org/node/4811627821', '{"provider":"openstreetmap","element":{"type":"node","id":4811627821,"lat":40.3245618,"lon":19.4725094,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Orikum Clinic","name:en":"Orikum Clinic"}}}'::jsonb, 'e967837b5d7e5bc1e32af91dfe3221696bade7833d686fae42a510a3bec76116', 'Orikum Clinic', 'orikum clinic', NULL, NULL, NULL, NULL, NULL, 'AL', 40.3245618, 19.4725094, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:4b865ef31c9afbd78423e6bffd9d46c6b9735150d62689d3ff014a9d3b0736af'),
('osm:node:9826051424', 'https://www.openstreetmap.org/node/9826051424', '{"provider":"openstreetmap","element":{"type":"node","id":9826051424,"lat":40.6144978,"lon":20.779961,"tags":{"addr:city":"Korçë","addr:housenumber":"13","addr:postcode":"7001","addr:street":"Bulevardi Fan Noli","addr:unit":"2","amenity":"doctors","healthcare":"doctor","healthcare:speciality":"dermatology","level":"1","name":"OrkiDerma","phone":"+355 82 248 844","wheelchair":"no"}}}'::jsonb, '6e8a40c456b71cbd4096cded1dfc7a53ece387f01d0e3a4c49d008c736126868', 'OrkiDerma', 'orkiderma', '13 Bulevardi Fan Noli', '13 Bulevardi Fan Noli, Korçë, 7001', 'Korçë', NULL, '7001', 'AL', 40.6144978, 20.779961, '+355 82 248 844', NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:59c2a986f5f8a24f062eee2dc074f6dff8e076c3bc7da46852a8d9fa8e89d047'),
('osm:node:2616676785', 'https://www.openstreetmap.org/node/2616676785', '{"provider":"openstreetmap","element":{"type":"node","id":2616676785,"lat":41.3415485,"lon":19.8343222,"tags":{"amenity":"clinic","healthcare":"clinic","name":"ORL","phone":"+35542349588","website":"https://www.qsut.gov.al/index.php/sherbimet-mjekesore/sherbimi-orl/sherbimet-e-ofruara/"}}}'::jsonb, '772bc7bdf006a7e57d9fa151c5d1f498443d2e05f56214f0c9659908b25befd9', 'ORL', 'orl', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3415485, 19.8343222, '+35542349588', 'https://www.qsut.gov.al/index.php/sherbimet-mjekesore/sherbimi-orl/sherbimet-e-ofruara/', NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:e28a5a07e08e46a2164f96f6acac727a7832d535964d97a17aba3718f3e8ccc3'),
('osm:node:11728068152', 'https://www.openstreetmap.org/node/11728068152', '{"provider":"openstreetmap","element":{"type":"node","id":11728068152,"lat":41.3323997,"lon":19.8193476,"tags":{"addr:city":"Tirana","addr:street":"Rruga e Barrikadave","amenity":"doctors","healthcare":"doctor","healthcare:speciality":"otolaryngology","level":"1","name":"ORL Clinic"}}}'::jsonb, '0b10b2f7c981845156aac50786fb37d511a586e65309949c0267516cb832518a', 'ORL Clinic', 'orl clinic', 'Rruga e Barrikadave', 'Rruga e Barrikadave, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3323997, 19.8193476, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:59dc19faa951f9fb9c6e720bc94492daa246971d117d74a499a6666e664db47b'),
('osm:node:3387400131', 'https://www.openstreetmap.org/node/3387400131', '{"provider":"openstreetmap","element":{"type":"node","id":3387400131,"lat":42.074847,"lon":19.5248427,"tags":{"amenity":"doctors","name":"ORL-Okulistika","wheelchair":"limited"}}}'::jsonb, '175e4fbac8946d315ca20a69a2e3403a65241b77bcd715f8b73669c57d689521', 'ORL-Okulistika', 'orl okulistika', NULL, NULL, NULL, NULL, NULL, 'AL', 42.074847, 19.5248427, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:9319a94f51f15927abe7b5247e6ba93010e58bf8d81542d0c6e89d5124e8d1e0'),
('osm:node:9949597337', 'https://www.openstreetmap.org/node/9949597337', '{"provider":"openstreetmap","element":{"type":"node","id":9949597337,"lat":40.0804604,"lon":20.1390232,"tags":{"amenity":"dentist","healthcare":"dentist","name":"P. Dhima"}}}'::jsonb, '5b28a48a7f4c131428554144b8715f3aad776e6736a2d2e022281bc49e2040c7', 'P. Dhima', 'p dhima', NULL, NULL, NULL, NULL, NULL, 'AL', 40.0804604, 20.1390232, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:937951c7b90b2257f38ad4ea96c15f613c929a60bcae7c8e29028059089c025d'),
('osm:node:6418133529', 'https://www.openstreetmap.org/node/6418133529', '{"provider":"openstreetmap","element":{"type":"node","id":6418133529,"lat":40.6107572,"lon":20.77694,"tags":{"amenity":"pharmacy","name":"Pandi","wheelchair":"no"}}}'::jsonb, '86f86a357d267445f3be9e7265bc6f991e073cbd86b85b5043bf0836c712e3a4', 'Pandi', 'pandi', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6107572, 20.77694, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:14b617f1545fbfd21e2c0236d749ce33da1a68ee08776950035c4152fd0c99f5'),
('osm:node:9825988516', 'https://www.openstreetmap.org/node/9825988516', '{"provider":"openstreetmap","element":{"type":"node","id":9825988516,"lat":40.6159656,"lon":20.7767385,"tags":{"amenity":"dentist","healthcare":"dentist","level":"1","name":"Pandi Visi","phone":"+355 69 220 1585"}}}'::jsonb, '7ef53df99c58a96daf448933aaae5aefe48874ee06d3f36f9d980f849245a7d5', 'Pandi Visi', 'pandi visi', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6159656, 20.7767385, '+355 69 220 1585', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:2a0d9cd9ed6e6c4a4251d5f0df24a47e4a4d6cdbd9880bc7034e91ad4ae9cb68'),
('osm:node:6806452477', 'https://www.openstreetmap.org/node/6806452477', '{"provider":"openstreetmap","element":{"type":"node","id":6806452477,"lat":41.3394175,"lon":19.8293513,"tags":{"addr:street":"Rruga Bardhyl","amenity":"pharmacy","healthcare":"pharmacy","name":"Parmacia"}}}'::jsonb, 'fbacfb8b185ccb9b6380ff508fbcb566360c77f53d3fec9ba4d4a5f62a61c2c8', 'Parmacia', 'parmacia', 'Rruga Bardhyl', 'Rruga Bardhyl', NULL, NULL, NULL, 'AL', 41.3394175, 19.8293513, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:59e282b9de0f8313c737b888f4cc75d06aa8d09dd2f82cd9de39e085a97949ce'),
('osm:node:3387400133', 'https://www.openstreetmap.org/node/3387400133', '{"provider":"openstreetmap","element":{"type":"node","id":3387400133,"lat":42.0738771,"lon":19.5240615,"tags":{"amenity":"doctors","name":"Patologjia","wheelchair":"limited"}}}'::jsonb, 'bed00f8dfdcb9d404940cfba9054b9ac8c26b04170d11e45bf5835cc6f298da6', 'Patologjia', 'patologjia', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0738771, 19.5240615, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:307108b283e4ab6968f6a947390c91e26c464f64bccb80b6c5496bf47b1424da'),
('osm:node:3387400134', 'https://www.openstreetmap.org/node/3387400134', '{"provider":"openstreetmap","element":{"type":"node","id":3387400134,"lat":42.0746433,"lon":19.524544,"tags":{"amenity":"doctors","name":"Pavioni Lehonave","wheelchair":"limited"}}}'::jsonb, 'b1e4de052580f401d69dc727c6ecd25635dda7835b60b3a4642a6029a1390d48', 'Pavioni Lehonave', 'pavioni lehonave', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0746433, 19.524544, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:6598ed1742ac6b6695f625acf7722af7e288b1d7c2ca41de7fb1dcadb54cdd7b'),
('osm:node:10819294213', 'https://www.openstreetmap.org/node/10819294213', '{"provider":"openstreetmap","element":{"type":"node","id":10819294213,"lat":41.3392348,"lon":19.8348831,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Pediatria","phone":"+35542349444","website":"https://www.qsut.gov.al/index.php/sherbimet-mjekesore/sherbimi-i-pediatrise-se-pergjithshme/sherbimet-e-ofruara/"}}}'::jsonb, 'f25cf8ec7845f5b205eac8062a45c633e7d59138cd547a6c6fac584bf075419a', 'Pediatria', 'pediatria', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3392348, 19.8348831, '+35542349444', 'https://www.qsut.gov.al/index.php/sherbimet-mjekesore/sherbimi-i-pediatrise-se-pergjithshme/sherbimet-e-ofruara/', NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:6326f4ffdcfd9b12023192f2f2a7bbd3bff405f042e27b80bd48bb40208eae8b'),
('osm:node:3387400135', 'https://www.openstreetmap.org/node/3387400135', '{"provider":"openstreetmap","element":{"type":"node","id":3387400135,"lat":42.0739724,"lon":19.5241977,"tags":{"amenity":"doctors","healthcare":"doctor","healthcare:speciality":"paediatrics","name":"Pediatria","wheelchair":"limited"}}}'::jsonb, 'f54835adcfe06d7ae772c1aab2bd63477f60c918aeb8b931847e818e72255858', 'Pediatria', 'pediatria', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0739724, 19.5241977, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:a2d3807e889fbb0f08ced129c1d9a1a4298718386137324cad737a2282201032'),
('osm:node:4579869210', 'https://www.openstreetmap.org/node/4579869210', '{"provider":"openstreetmap","element":{"type":"node","id":4579869210,"lat":41.3395583,"lon":19.8357577,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Pediatria e Përgjithshme","phone":"+35542349444","website":"https://www.qsut.gov.al/index.php/sherbimet-mjekesore/sherbimi-i-pediatrise-se-pergjithshme/sherbimet-e-ofruara/"}}}'::jsonb, 'e5159ccf01bb7607f0a122ae60c3ccfe0513eeeb1123739665713e4f1fd9a64a', 'Pediatria e Përgjithshme', 'pediatria e p rgjithshme', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3395583, 19.8357577, '+35542349444', 'https://www.qsut.gov.al/index.php/sherbimet-mjekesore/sherbimi-i-pediatrise-se-pergjithshme/sherbimet-e-ofruara/', NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:198ab198b28cfb46b161e281570b72bbe0d3f8470d84a20b2abbe871c54b8847'),
('osm:node:4579869209', 'https://www.openstreetmap.org/node/4579869209', '{"provider":"openstreetmap","element":{"type":"node","id":4579869209,"lat":41.339395,"lon":19.8344888,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Pediatria e Specialiteteve","phone":"+35542349444","website":"https://www.qsut.gov.al/index.php/sherbimet-mjekesore/sherbimi-i-pediatrise-se-pergjithshme/sherbimet-e-ofruara/"}}}'::jsonb, '44663a473114bb7de3dcd634b9a90f73d2eed909b83274fa9f469072b6136334', 'Pediatria e Specialiteteve', 'pediatria e specialiteteve', NULL, NULL, NULL, NULL, NULL, 'AL', 41.339395, 19.8344888, '+35542349444', 'https://www.qsut.gov.al/index.php/sherbimet-mjekesore/sherbimi-i-pediatrise-se-pergjithshme/sherbimet-e-ofruara/', NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:feceed83069ffeb59b7eb11acc9a144869e50d6259ef6dad91c62b1077669e14'),
('osm:node:12091143131', 'https://www.openstreetmap.org/node/12091143131', '{"provider":"openstreetmap","element":{"type":"node","id":12091143131,"lat":41.3393393,"lon":19.8355246,"tags":{"amenity":"doctors","healthcare":"doctor","name":"Pediatria Urgjenca"}}}'::jsonb, '977895508da1cfa39df2dedd27e31bd56f404ab946b9551ca29d5945a26e87e7', 'Pediatria Urgjenca', 'pediatria urgjenca', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3393393, 19.8355246, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:0e6157058491ce5b46f7a31f03755c0cf7148bb2380c69053a416f12abc37a71'),
('osm:node:12889382983', 'https://www.openstreetmap.org/node/12889382983', '{"provider":"openstreetmap","element":{"type":"node","id":12889382983,"lat":40.6223544,"lon":20.9863479,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Perla Dental","opening_hours":"Mo-Sa 08:30-15:00","phone":"+355 69 895 3017","wheelchair":"limited"}}}'::jsonb, '5a0e7acfcf5eec4149c0af81eb455c13e220eeb674948a214828424084ee11f3', 'Perla Dental', 'perla dental', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6223544, 20.9863479, '+355 69 895 3017', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:7526ae2ad5fc526466595a28aed5ed04e6253a7caee0c5f76138d0a387ae188b'),
('osm:node:6838230354', 'https://www.openstreetmap.org/node/6838230354', '{"provider":"openstreetmap","element":{"type":"node","id":6838230354,"lat":41.2928638,"lon":19.5139309,"tags":{"amenity":"pharmacy","name":"Pharmaci Veternari"}}}'::jsonb, 'beece5077bc75ab457e1c32e3348e635a9739feb9959f93a1b91bbcf8ee5ded9', 'Pharmaci Veternari', 'pharmaci veternari', NULL, NULL, NULL, NULL, NULL, 'AL', 41.2928638, 19.5139309, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:e4d52797c66b9f53d1a36911529913781417372fd673ac73bdbde23a375422a2'),
('osm:node:9741253125', 'https://www.openstreetmap.org/node/9741253125', '{"provider":"openstreetmap","element":{"type":"node","id":9741253125,"lat":41.3528476,"lon":19.8100541,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Pharmacy Arli"}}}'::jsonb, '1b17411c0596b4178bbf69071888ab1236fbd6ac75e1c8636da111017e62a030', 'Pharmacy Arli', 'pharmacy arli', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3528476, 19.8100541, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:4c9a3a41518a1c48915be572a1faed786c5e96f0ab3e95e183a11cc14bf797d4'),
('osm:node:11182936168', 'https://www.openstreetmap.org/node/11182936168', '{"provider":"openstreetmap","element":{"type":"node","id":11182936168,"lat":41.2351629,"lon":19.5160144,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Pharmacy Lola Anila 3"}}}'::jsonb, '84153617f7feadeaebe27ad3559190c2e6a6a0f08ed61b63ca14e0471b7378e6', 'Pharmacy Lola Anila 3', 'pharmacy lola anila 3', NULL, NULL, NULL, NULL, NULL, 'AL', 41.2351629, 19.5160144, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:a4934b27342ca6441e599232bc3cfb80c568a49232829510b8989091b8ffb104'),
('osm:node:9124938681', 'https://www.openstreetmap.org/node/9124938681', '{"provider":"openstreetmap","element":{"type":"node","id":9124938681,"lat":41.3199629,"lon":19.8161522,"tags":{"addr:floor":"G","amenity":"pharmacy","check_date":"2026-06-14","healthcare":"pharmacy","level":"0","name":"Pharmawest"}}}'::jsonb, '1455a5eeaa9535de2a418fbdf4e26dd85086ae7dca3a7538f97fc0895953e9f4', 'Pharmawest', 'pharmawest', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3199629, 19.8161522, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:dde2eec31ce8b56f86e59a923a8445aa655ca99cce9c1141dd6adfc07d1dcb21'),
('osm:node:5814629656', 'https://www.openstreetmap.org/node/5814629656', '{"provider":"openstreetmap","element":{"type":"node","id":5814629656,"lat":41.3221116,"lon":19.8180098,"tags":{"addr:city":"Tiranë","addr:housenumber":"3","addr:postcode":"1001","addr:street":"Rruga Ibrahim Rugova","ele":"1","healthcare":"physiotherapist","leisure":"fitness_centre","name":"PhysioHealth","opening_hours":"Mo-Fr 09:00-20:00; Sa 10:00-16:00","website":"https://physiohealth.al"}}}'::jsonb, '3238251845e97a9f247e2106e27538316b84932e35a85c4e1c7b21c619f32bcf', 'PhysioHealth', 'physiohealth', '3 Rruga Ibrahim Rugova', '3 Rruga Ibrahim Rugova, Tiranë, 1001', 'Tiranë', NULL, '1001', 'AL', 41.3221116, 19.8180098, NULL, 'https://physiohealth.al', NULL, 'unknown', ARRAY['unknown']::text[], 0.86, 'loc:78d956856b5b4ae5036a872a6096fa984a0f0ef3ee483dbcb526cbbaafd1db7e'),
('osm:node:11118580455', 'https://www.openstreetmap.org/node/11118580455', '{"provider":"openstreetmap","element":{"type":"node","id":11118580455,"lat":41.3214614,"lon":19.8126833,"tags":{"addr:city":"Tirana","addr:housenumber":"24","addr:street":"Rruga Andon Zako Çajupi","healthcare":"physiotherapist","name":"Physiolife Therapy","website":"https://physiolifetherapy.com"}}}'::jsonb, '9c39fb93e7f3343beab2f0e073808eb1aa008e995842c95809307aaec49e8d9e', 'Physiolife Therapy', 'physiolife therapy', '24 Rruga Andon Zako Çajupi', '24 Rruga Andon Zako Çajupi, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3214614, 19.8126833, NULL, 'https://physiolifetherapy.com', NULL, 'unknown', ARRAY['unknown']::text[], 0.86, 'loc:8fdb8e988a3f2aaaf4c7ef3ce58795f35a3c20d4b561d4a3b097c7f09c75fd9c'),
('osm:node:10064595081', 'https://www.openstreetmap.org/node/10064595081', '{"provider":"openstreetmap","element":{"type":"node","id":10064595081,"lat":41.3324234,"lon":19.8426458,"tags":{"addr:city":"Tirana","addr:street":"Bulevardi Bajram Curri","amenity":"pharmacy","check_date":"2026-01-10","healthcare":"pharmacy","internet_access":"no","name":"Pink Pharm 1","opening_hours":"Mo-Sa 09:00-22:00","payment:cards":"no","payment:credit_cards":"no","payment:debit_cards":"no","wheelchair":"no"}}}'::jsonb, 'd7edc313328d0dc8fb0569279f88b9c44b4a098e19042f00363b179c030332ec', 'Pink Pharm 1', 'pink pharm 1', 'Bulevardi Bajram Curri', 'Bulevardi Bajram Curri, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3324234, 19.8426458, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:98392779982f2fbda4c56fe090dccd9456e7e45c8f91bfb974e16d8f1dde496b'),
('osm:node:4518919093', 'https://www.openstreetmap.org/node/4518919093', '{"provider":"openstreetmap","element":{"type":"node","id":4518919093,"lat":41.3239838,"lon":19.8074672,"tags":{"addr:street":"Rruga Myslym Shyri","amenity":"pharmacy","healthcare":"pharmacy","name":"Pirro","name:sq":"Pirro"}}}'::jsonb, 'b980fdd86db1c7575a76cd90908a18aad052622db5b894d53294c2e7cc1f1e46', 'Pirro', 'pirro', 'Rruga Myslym Shyri', 'Rruga Myslym Shyri', NULL, NULL, NULL, 'AL', 41.3239838, 19.8074672, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:dca98042353e8a627dccd0408e098eebf4ea4177a31e6d9085cee1927b881898'),
('osm:node:3360291399', 'https://www.openstreetmap.org/node/3360291399', '{"provider":"openstreetmap","element":{"type":"node","id":3360291399,"lat":41.8628743,"lon":19.4282342,"tags":{"amenity":"pharmacy","dispensing":"no","name":"plazhi"}}}'::jsonb, '4e2e3ab2aead8f4a964dbad855621fbc244654a929aa22a9878de0cd3aa30fee', 'plazhi', 'plazhi', NULL, NULL, NULL, NULL, NULL, 'AL', 41.8628743, 19.4282342, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:e057c2c5d4da819a0fc2a7c95e27535144b588f5990cb005d0dcff07055d0407'),
('osm:way:417061791', 'https://www.openstreetmap.org/way/417061791', '{"provider":"openstreetmap","element":{"type":"way","id":417061791,"center":{"lat":41.3271511,"lon":19.807096},"tags":{"addr:city":"Tirana","addr:street":"Rruga e Kavajës","amenity":"clinic","building":"yes","healthcare":"clinic","name":"Poliambulanca \"Atë Luigji Monti\"","phone":"+35542223906;+3552232021","website":"https://unizkm.al/posts/slug/poliambulatorio/al"}}}'::jsonb, '88a60ac516ad46604341541fbe0918c9a88b7b1bf871b431bea59a86dd1f08d8', 'Poliambulanca "Atë Luigji Monti"', 'poliambulanca at luigji monti', 'Rruga e Kavajës', 'Rruga e Kavajës, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3271511, 19.807096, '+35542223906;+3552232021', 'https://unizkm.al/posts/slug/poliambulatorio/al', NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:d87d6b34c51a55f059362649bac91aa6ee96db004e1beec2c7dd2d9d4d0cdf31'),
('osm:node:5146771029', 'https://www.openstreetmap.org/node/5146771029', '{"provider":"openstreetmap","element":{"type":"node","id":5146771029,"lat":41.3145056,"lon":19.4483054,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Poliklinika"}}}'::jsonb, 'e5cee99391d9a6ee2fa84637996eb85723b66cb77b1f114751b679d4a63f6318', 'Poliklinika', 'poliklinika', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3145056, 19.4483054, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:cd9333bd27b77ad7d786e27ab4bdda4e9de37c48e1a4c353ecb808e60838250c'),
('osm:way:442242241', 'https://www.openstreetmap.org/way/442242241', '{"provider":"openstreetmap","element":{"type":"way","id":442242241,"center":{"lat":40.3372825,"lon":20.6813675},"tags":{"addr:postcode":"7401","addr:street":"Rruga Dhori Qirjazi","amenity":"clinic","building":"hospital","healthcare":"clinic","name":"Poliklinika"}}}'::jsonb, '561fe09af9a33cd30cf8bb6e4725e5b69c7d46020c2aa7969a022c26f077262c', 'Poliklinika', 'poliklinika', 'Rruga Dhori Qirjazi', 'Rruga Dhori Qirjazi, 7401', NULL, NULL, '7401', 'AL', 40.3372825, 20.6813675, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:161b98d0c8078cf12cc9ed7d8ba8ebae7bb4ae07123a7dffb2bc599c4a583f38');

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
