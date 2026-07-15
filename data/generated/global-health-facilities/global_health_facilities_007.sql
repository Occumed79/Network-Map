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
('osm:node:8008613066', 'https://www.openstreetmap.org/node/8008613066', '{"provider":"openstreetmap","element":{"type":"node","id":8008613066,"lat":34.5326898,"lon":69.1655419,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلینیک تخصصی اورتوپدی داکتر ظاهر عثمان"}}}'::jsonb, 'ed4ad0427b58f0bcc72a68e4cb04a106c9e8b5bd1beb5e5ee20627e4c794cc54', 'کلینیک تخصصی اورتوپدی داکتر ظاهر عثمان', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5326898, 69.1655419, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:f6cbac534f09cd8d01ee68e339881686a28082807be95286f4eb80e10eb7400f'),
('osm:node:7183733146', 'https://www.openstreetmap.org/node/7183733146', '{"provider":"openstreetmap","element":{"type":"node","id":7183733146,"lat":33.5997612,"lon":69.226394,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلینیک تشخصیه اکسری"}}}'::jsonb, 'd855c8af81d5178bb703430b6a687c900c818d82ad2553decba8f5ff65ddc4e9', 'کلینیک تشخصیه اکسری', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.5997612, 69.226394, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:2519e7ae5e43dc20d3d5e140c63dd8778dd55f3a9da79980182ab4b46df3d681'),
('osm:node:8838139301', 'https://www.openstreetmap.org/node/8838139301', '{"provider":"openstreetmap","element":{"type":"node","id":8838139301,"lat":36.2648165,"lon":68.0173927,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلینیک تشخصیه التراسوند فروتن رحیمی"}}}'::jsonb, '36cd55cf28cca7ef21afed8e3c932c29ce75d054df1d11911215246fc63250ff', 'کلینیک تشخصیه التراسوند فروتن رحیمی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2648165, 68.0173927, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:be9914d185f9ca64764cb405ae69951eec65fcc170c933b4e5f3cb8dc01f7033'),
('osm:node:7183733140', 'https://www.openstreetmap.org/node/7183733140', '{"provider":"openstreetmap","element":{"type":"node","id":7183733140,"lat":33.5977056,"lon":69.2291742,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلینیک تشخصیه همت"}}}'::jsonb, '97ed3df8d0f7bbbdc528c0f4f09a3a10b166ddfc1a4b9faa3393cc2df118d1df', 'کلینیک تشخصیه همت', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.5977056, 69.2291742, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:c842ca85889f731526afb54984893ae240c7ff49da7a8a9f4d3c59e38c3ecc6f'),
('osm:node:8507234874', 'https://www.openstreetmap.org/node/8507234874', '{"provider":"openstreetmap","element":{"type":"node","id":8507234874,"lat":31.448729,"lon":62.6345001,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلینیک جامعه غرغری"}}}'::jsonb, 'e3756326412253d595393cd1e3fe37858391e1f6c2bc42fcd58364346eb25367', 'کلینیک جامعه غرغری', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 31.448729, 62.6345001, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:82e3ad06fdd17521e5bcd90e2b1d50d50ae4cd52f9fb3caeb720678ea15f9048'),
('osm:node:8838139296', 'https://www.openstreetmap.org/node/8838139296', '{"provider":"openstreetmap","element":{"type":"node","id":8838139296,"lat":36.2648784,"lon":68.0171032,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلینیک داندان"}}}'::jsonb, 'b001a597b0f7a2de57fe56fdb82db3197a2d259ce88959f0f9b7d2014e1fe830', 'کلینیک داندان', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2648784, 68.0171032, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:e545dcddf3691a619bdbed4dcc227eb0ca741d4de3ff575b40a0219fb6edd2a7'),
('osm:node:8856550771', 'https://www.openstreetmap.org/node/8856550771', '{"provider":"openstreetmap","element":{"type":"node","id":8856550771,"lat":36.261452,"lon":68.0133917,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلینیک داندان"}}}'::jsonb, '58e5fa4209a7a0f2ca14eac900eb0da6dfde2a9fd8d2f9a6906454c40e142732', 'کلینیک داندان', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.261452, 68.0133917, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:d59221f38894e23df8d59ebac00ff49044cf0c06a80790d9bf7d7a8f51205a59'),
('osm:node:8612131578', 'https://www.openstreetmap.org/node/8612131578', '{"provider":"openstreetmap","element":{"type":"node","id":8612131578,"lat":34.5050359,"lon":69.1363865,"tags":{"amenity":"dentist","healthcare":"dentist","name":"کلینیک دندان آریانا"}}}'::jsonb, 'd7259613fff8421d43494581622b5d27b2161f0e6740ae78b7c988025f56ce85', 'کلینیک دندان آریانا', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5050359, 69.1363865, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:85151dfbbf7d8b4dd0b832954bcca96867874e79f2a59db3e6a1db1a3fb39a6c'),
('osm:node:8664638114', 'https://www.openstreetmap.org/node/8664638114', '{"provider":"openstreetmap","element":{"type":"node","id":8664638114,"lat":34.5434378,"lon":69.1612834,"tags":{"amenity":"dentist","healthcare":"dentist","name":"کلینیک دندان ابوذر"}}}'::jsonb, '30fe7c3992d4e3a6f4ce2d61e0fc6a3dedde0908af9ed3617c76ad04cfc82e4e', 'کلینیک دندان ابوذر', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5434378, 69.1612834, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:a907a8bfe5eef1bb87069e9fa2144b317421013644240bfd779f13e86a574483'),
('osm:node:8664649096', 'https://www.openstreetmap.org/node/8664649096', '{"provider":"openstreetmap","element":{"type":"node","id":8664649096,"lat":34.543072,"lon":69.1618996,"tags":{"amenity":"dentist","healthcare":"dentist","name":"کلینیک دندان اکبری"}}}'::jsonb, '2978d148c19ec9c5efcf4692c599e370d4ddd76b9798e71eed667f7811e7b483', 'کلینیک دندان اکبری', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.543072, 69.1618996, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:baec16b38a3daef2f286cc6e39d8f1f7f34abaf2cde83a8fe45f1fefeac20371'),
('osm:node:8838139293', 'https://www.openstreetmap.org/node/8838139293', '{"provider":"openstreetmap","element":{"type":"node","id":8838139293,"lat":36.2643833,"lon":68.0167921,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلینیک دندان المکه"}}}'::jsonb, '37ba5e5ecd6f630a998c0e90970f2359e897bb815c90304afa8d5add96167855', 'کلینیک دندان المکه', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2643833, 68.0167921, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:550173683b0461b8b5f5f8bacd77c99bfbc8377eed54671e3f6adfa7139c9eb0'),
('osm:node:7183733137', 'https://www.openstreetmap.org/node/7183733137', '{"provider":"openstreetmap","element":{"type":"node","id":7183733137,"lat":33.6325331,"lon":69.2308811,"tags":{"amenity":"dentist","healthcare":"dentist","name":"کلینیک دندان امید یاسیر"}}}'::jsonb, 'dcf47fe221cb96b003b8c9b1d0f6ed10ae09770a971ffe669e49f5aee3d40073', 'کلینیک دندان امید یاسیر', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.6325331, 69.2308811, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:03cd3192b9537d7a7cb9209a1e0510ee38479b79ab641dfbf11c06e3b97c54dd'),
('osm:node:8838139306', 'https://www.openstreetmap.org/node/8838139306', '{"provider":"openstreetmap","element":{"type":"node","id":8838139306,"lat":36.2664245,"lon":68.0112243,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلینیک دندان انصاف"}}}'::jsonb, '8a62d8faa441e88f9959c8bb8750d23a66cd9054dc2d1d4a6fa227cdc91595a6', 'کلینیک دندان انصاف', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2664245, 68.0112243, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:42bb16977570b6701826afa13ef7cd15d948a9cc9dfc38b07a6ccf26e796df2c'),
('osm:node:8180463951', 'https://www.openstreetmap.org/node/8180463951', '{"provider":"openstreetmap","element":{"type":"node","id":8180463951,"lat":34.5374551,"lon":69.1666858,"tags":{"amenity":"dentist","healthcare":"dentist","name":"کلینیک دندان تایمنی","name:en":"Taimani Dental Clinic"}}}'::jsonb, 'a06011b571997c2400454eff761bcc522e5f7da074284524375ad6e45be3ce16', 'کلینیک دندان تایمنی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5374551, 69.1666858, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:bd7211f766f99b570e0a1b42a559930f2df2804f60e3f2e52b54ac820605ef15'),
('osm:node:8838139295', 'https://www.openstreetmap.org/node/8838139295', '{"provider":"openstreetmap","element":{"type":"node","id":8838139295,"lat":36.2647454,"lon":68.0173758,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلینیک دندان جلال آباد"}}}'::jsonb, '13690934cd9f6fcef321b2eadfda1f9ac915bd5cb1ba60f14b3ef5d6f1c98e37', 'کلینیک دندان جلال آباد', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2647454, 68.0173758, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:37aa0357363e0a4652643e1c60979f0fc435171fc10d315a8877fe8377203a94'),
('osm:node:8004417201', 'https://www.openstreetmap.org/node/8004417201', '{"provider":"openstreetmap","element":{"type":"node","id":8004417201,"lat":36.6649791,"lon":65.7563854,"tags":{"amenity":"dentist","contact:facebook":"https://www.facebook.com/Hussam-dental-clinic-کلینیک-دندان-حسام-128048948750462/","name":"کلینیک دندان حسام","name:en":"Hussam Dental Clinic"}}}'::jsonb, 'b4573b4153b72d84b66a95e19d91220243adcfb2bfe4440040f2b84fd4c1ee64', 'کلینیک دندان حسام', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.6649791, 65.7563854, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:f384f5b7c041ef626f8f82acbbd10de977429e3f8585b4959e8161915b7b18e2'),
('osm:node:7183733175', 'https://www.openstreetmap.org/node/7183733175', '{"provider":"openstreetmap","element":{"type":"node","id":7183733175,"lat":33.5990155,"lon":69.226352,"tags":{"amenity":"dentist","healthcare":"dentist","name":"کلینیک دندان حیات"}}}'::jsonb, 'caec6d4db0eeac486b31fb77f5d417db6ee5b2104af6cb421333c84956c9977e', 'کلینیک دندان حیات', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.5990155, 69.226352, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:5347555a46e36b1fe3ce757ee6765a24f5d97b734f5858bab03745568a80a75a'),
('osm:node:8654623375', 'https://www.openstreetmap.org/node/8654623375', '{"provider":"openstreetmap","element":{"type":"node","id":8654623375,"lat":34.5455576,"lon":69.1660881,"tags":{"amenity":"dentist","healthcare":"dentist","name":"کلینیک دندان داکتر معمارزاده"}}}'::jsonb, 'ba39809ba9f61b09f1c081e5a57d5fd678f24813f6c1d1f2ccb7b6ca43a8b0b9', 'کلینیک دندان داکتر معمارزاده', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5455576, 69.1660881, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:9a155843ca1f10b23cf7f842cbbb19d177bd10d0718c048fbbdb8053d5cc56ae'),
('osm:node:7183733139', 'https://www.openstreetmap.org/node/7183733139', '{"provider":"openstreetmap","element":{"type":"node","id":7183733139,"lat":33.5948617,"lon":69.2291145,"tags":{"amenity":"dentist","healthcare":"dentist","name":"کلینیک دندان سیحان"}}}'::jsonb, 'edc3735a6c2917640be49969ddf81322c3a470c57bc0a2608e45301ab9df27d2', 'کلینیک دندان سیحان', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.5948617, 69.2291145, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:68dbb610ed9a08254df2cdf3396f74fd20a6e3602b6b42cccde396137aea3c75'),
('osm:node:8861927135', 'https://www.openstreetmap.org/node/8861927135', '{"provider":"openstreetmap","element":{"type":"node","id":8861927135,"lat":36.2691435,"lon":68.008742,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلینیک دندان لبخند زیبا"}}}'::jsonb, 'c6618a0174cdafdf70c8d42819e32881ae35264aea0f68b6d05926eafb14d3b7', 'کلینیک دندان لبخند زیبا', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2691435, 68.008742, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:4f54140a1a1ba4c9a4fb636a77261a3f9067f0adec3b48fd5115ca9f923016e9'),
('osm:node:7183733141', 'https://www.openstreetmap.org/node/7183733141', '{"provider":"openstreetmap","element":{"type":"node","id":7183733141,"lat":33.5973413,"lon":69.2292456,"tags":{"amenity":"dentist","healthcare":"dentist","name":"کلینیک دندان مسعودی"}}}'::jsonb, '810f03670a92b944d98a8983b62fce83c940baeed916b82a188f8fe6e936852f', 'کلینیک دندان مسعودی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.5973413, 69.2292456, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:c46d62c54d612cb5f1a610a21a945d8b651c710e8583a4ef997c24fafbde1d4c'),
('osm:node:8838139285', 'https://www.openstreetmap.org/node/8838139285', '{"provider":"openstreetmap","element":{"type":"node","id":8838139285,"lat":36.2659554,"lon":68.0109144,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلینیک دندان میوند"}}}'::jsonb, '841c609d1a8891be8e673c496eb32472bdb064b79e0b72cc4e779a76767f48f0', 'کلینیک دندان میوند', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2659554, 68.0109144, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:9d320f7a09f388d5aaebf6924f8a25631ffad5cf07a2e01501eac01a9bdf1ed0'),
('osm:node:8838139292', 'https://www.openstreetmap.org/node/8838139292', '{"provider":"openstreetmap","element":{"type":"node","id":8838139292,"lat":36.2643577,"lon":68.0195045,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلینیک دندان نوری"}}}'::jsonb, '5a7f980c0b847f1ac3cd889fd090e0b8f8f86881d582344400715448e58789fa', 'کلینیک دندان نوری', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2643577, 68.0195045, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:711551a8c8e4282d3313734aa8defc45267a6d9899bfd2fda168d2f3ad08d257'),
('osm:node:8639646045', 'https://www.openstreetmap.org/node/8639646045', '{"provider":"openstreetmap","element":{"type":"node","id":8639646045,"lat":34.5058316,"lon":69.1404218,"tags":{"amenity":"dentist","healthcare":"dentist","name":"کلینیک دندان هلال"}}}'::jsonb, '4c9c7b4f54342af4c09f28d4562efca5c49defe235b99b708ff1b41df29d0859', 'کلینیک دندان هلال', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5058316, 69.1404218, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:349a70f59d240bc14460a08a5a54fd1233ea0b9815c421381ef1695fb0ef4506'),
('osm:node:8664589442', 'https://www.openstreetmap.org/node/8664589442', '{"provider":"openstreetmap","element":{"type":"node","id":8664589442,"lat":34.5435095,"lon":69.1611808,"tags":{"amenity":"dentist","healthcare":"dentist","name":"کلینیک دندان همایون سعید"}}}'::jsonb, '89bbd0e9ff673b9c80867e67d4735971e9c9047260e43c8d723bd825b2aebc62', 'کلینیک دندان همایون سعید', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5435095, 69.1611808, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:3afc9acba564035e635741666fa715a3ff415bb61140c6dd63b9a82920ac0a77'),
('osm:node:8664649095', 'https://www.openstreetmap.org/node/8664649095', '{"provider":"openstreetmap","element":{"type":"node","id":8664649095,"lat":34.5493149,"lon":69.1531728,"tags":{"amenity":"dentist","healthcare":"dentist","name":"کلینیک دندان همدرد"}}}'::jsonb, '27474de77074c1dd553688d371a671f98cf38e4d26a2688bf9161cf19040fefd', 'کلینیک دندان همدرد', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5493149, 69.1531728, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:f6bb0da47384479418745e9ae533390b9243eb25dc7de3d22087b9611d159066'),
('osm:node:8612133971', 'https://www.openstreetmap.org/node/8612133971', '{"provider":"openstreetmap","element":{"type":"node","id":8612133971,"lat":34.5047649,"lon":69.1370292,"tags":{"amenity":"dentist","healthcare":"dentist","name":"کلینیک دهان و دندان شاین"}}}'::jsonb, 'dfd43c793d15ff2603ee9521107cdce3cdd5d11855b6218928716e434d9f6fb7', 'کلینیک دهان و دندان شاین', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5047649, 69.1370292, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:33170b1439f89bf2e5a16ba66b761d3227d98bc70ffe419c829cd3da520cb0ad'),
('osm:way:1518643336', 'https://www.openstreetmap.org/way/1518643336', '{"provider":"openstreetmap","element":{"type":"way","id":1518643336,"center":{"lat":30.1496969,"lon":62.5828609},"tags":{"amenity":"clinic","building":"yes","healthcare":"clinic","name":"کلینیک رودبار"}}}'::jsonb, 'f4f549d81d0ea8f2af7128b92032bfcf80325d2afb160dda0702585fac7cffdc', 'کلینیک رودبار', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 30.1496969, 62.5828609, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:467c0e89b61a48b8c596bc3f16290459b3c532b911420252cc3efd3e1e570bac'),
('osm:node:7183733159', 'https://www.openstreetmap.org/node/7183733159', '{"provider":"openstreetmap","element":{"type":"node","id":7183733159,"lat":33.597884,"lon":69.2292104,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلینیک سحرشفا"}}}'::jsonb, 'a448d5c0d3d5f39150b5396001076c312d088bb6273720c361eac6ffca3e47df', 'کلینیک سحرشفا', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.597884, 69.2292104, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:1dde32af63848aefc67347d140d1b4f04fc3f3df128ebdd1d0a30e12641d4916'),
('osm:node:8133091130', 'https://www.openstreetmap.org/node/8133091130', '{"provider":"openstreetmap","element":{"type":"node","id":8133091130,"lat":34.5029524,"lon":69.1341262,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلینیک سراپا کابل سیرت"}}}'::jsonb, '6a2fbf7fcce06e3a5a1345ddde755445164f1676db0f99b50fa1d7d8305e34ef', 'کلینیک سراپا کابل سیرت', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5029524, 69.1341262, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:7210171e86373e1eab6d1f3e3a82d794820c0625d6d55a9029c47a9d3fe97bfc'),
('osm:node:7183733147', 'https://www.openstreetmap.org/node/7183733147', '{"provider":"openstreetmap","element":{"type":"node","id":7183733147,"lat":33.6005273,"lon":69.2253996,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلینیک شخصی التراسوند داکتر خالددوست"}}}'::jsonb, '7d95b2f2e6651d1f29946b92890b3b8d9112946c397fd814d64b638c922221ce', 'کلینیک شخصی التراسوند داکتر خالددوست', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.6005273, 69.2253996, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:97a379bccbcdc6650a4455a066c72ab6df5f018462c4cad9e80807896c5636a8'),
('osm:node:7183733142', 'https://www.openstreetmap.org/node/7183733142', '{"provider":"openstreetmap","element":{"type":"node","id":7183733142,"lat":33.60133,"lon":69.2291633,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلینیک شخصی نبی شمس"}}}'::jsonb, '2128b9bde21cd2627761469ceff3bba0e2408a0d645eebad3f8d70bf4d0e955e', 'کلینیک شخصی نبی شمس', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.60133, 69.2291633, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:b2ee7d19955760a9127c08e2e280140e5c9b45ee3d5c8456ddbcbc7eab45b6e5'),
('osm:node:13306170849', 'https://www.openstreetmap.org/node/13306170849', '{"provider":"openstreetmap","element":{"type":"node","id":13306170849,"lat":31.5122246,"lon":62.6978845,"tags":{"addr:postcode":"شش آبه","amenity":"clinic","healthcare":"clinic","name":"کلینیک شش آبه"}}}'::jsonb, '8e4914372c14d2988e05a7179072b74f1ac54735447355dcaa2d66038555b03f', 'کلینیک شش آبه', NULL, NULL, 'شش آبه', NULL, NULL, 'شش آبه', 'AF', 31.5122246, 62.6978845, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:894df2d4090084e65903bfa5ca83ea660b84e0fb9d937ddf76ff65762334fe0c'),
('osm:node:7183733155', 'https://www.openstreetmap.org/node/7183733155', '{"provider":"openstreetmap","element":{"type":"node","id":7183733155,"lat":33.5967069,"lon":69.2160042,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلینیک صحت"}}}'::jsonb, '3b65ef0373581a709e4e715159f119ba41afa5fc8b4f25f45382d70c0bd82d4e', 'کلینیک صحت', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.5967069, 69.2160042, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:3200832f5462eb12895577bad600ce2bdf8945fa03f9c8ae3135c8b91f6e5177'),
('osm:way:1266635784', 'https://www.openstreetmap.org/way/1266635784', '{"provider":"openstreetmap","element":{"type":"way","id":1266635784,"center":{"lat":30.2787162,"lon":62.0578369},"tags":{"amenity":"clinic","barrier":"wall","building":"yes","healthcare":"clinic","name":"کلینیک صحی چاربرجک"}}}'::jsonb, '0d10af12b096da9a7c7e451ba239e1a21b68c5170c14e37e401ed87d74838066', 'کلینیک صحی چاربرجک', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 30.2787162, 62.0578369, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:e39384164f0ab3b42b0e4ef0d76ccb9733a6390c2fe069aa5a16a26fe22eba68'),
('osm:node:8507234875', 'https://www.openstreetmap.org/node/8507234875', '{"provider":"openstreetmap","element":{"type":"node","id":8507234875,"lat":31.4463545,"lon":62.6236658,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلینیک غرغری"}}}'::jsonb, '438086f042bda286e43d85de54f5e83a19cbc627e6ab1745ae0a43abb29cdf26', 'کلینیک غرغری', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 31.4463545, 62.6236658, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:3c937d96d9533c27cfccb33ed1ff43c99292cf51299413d1fdab93346e458997'),
('osm:node:8838139284', 'https://www.openstreetmap.org/node/8838139284', '{"provider":"openstreetmap","element":{"type":"node","id":8838139284,"lat":36.2627561,"lon":68.0213286,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلینیک فیض"}}}'::jsonb, '06baef27fb6b302237bdafbeb4107e56dcef3ef55d9e132df4f43298be53d091', 'کلینیک فیض', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2627561, 68.0213286, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:ce3f7750b022a45021f84fdfb15da1c0006a4233c53442d86159d8440c3041f7'),
('osm:node:7183733138', 'https://www.openstreetmap.org/node/7183733138', '{"provider":"openstreetmap","element":{"type":"node","id":7183733138,"lat":33.6136652,"lon":69.2304675,"tags":{"amenity":"clinic","name":"کلینیک کامران"}}}'::jsonb, '047d7752572863a66e6a6f6a352e116c5b2c5d5cbb9e64b71ffd2e1ee7f7952f', 'کلینیک کامران', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.6136652, 69.2304675, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:bbfcb64dcc5d2552f2ca20bd2f98261433b32de29d6b626cfc62eed95a2c46d3'),
('osm:way:828041367', 'https://www.openstreetmap.org/way/828041367', '{"provider":"openstreetmap","element":{"type":"way","id":828041367,"center":{"lat":34.8243959,"lon":67.8254163},"tags":{"amenity":"clinic","building":"yes","healthcare":"clinic","name":"کلینیک لقمان حکیم","name:en":"Loqman-i Hakim Clinic"}}}'::jsonb, 'd7b1f80a30e5013456c88c1d7c4bcbd93718e99bc3e7d0ec997701982b7eb50e', 'کلینیک لقمان حکیم', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.8243959, 67.8254163, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:2e62e5f61d54cb8d84a5101791c8c0bdd8b8429cc056e0ffc22e8366bdd1e709'),
('osm:node:8366715044', 'https://www.openstreetmap.org/node/8366715044', '{"provider":"openstreetmap","element":{"type":"node","id":8366715044,"lat":31.6296694,"lon":62.8816952,"tags":{"healthcare":"yes","name":"کلینیک لوخی"}}}'::jsonb, '5ff9dc092b3ef1c790723be89ced41c1eef82a5810dda8bbb536960031af2222', 'کلینیک لوخی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 31.6296694, 62.8816952, NULL, NULL, NULL, 'unknown', ARRAY['unknown']::text[], 0.78, 'loc:36dec7923786fc0985e030896f7cf1b8ee06a57d216faffa201d34fb81d3688c'),
('osm:node:7183733145', 'https://www.openstreetmap.org/node/7183733145', '{"provider":"openstreetmap","element":{"type":"node","id":7183733145,"lat":33.6255553,"lon":69.2298098,"tags":{"amenity":"clinic","name":"کلینیک محمدی"}}}'::jsonb, 'eadd80da0a17a5311962faa6c14cdca4b2246aa6617eff39a7a5039de6fef26e', 'کلینیک محمدی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.6255553, 69.2298098, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:d8b1c54282eb956823c601b1d62c04aad5e0270e89d00e52f33a7f8ae37d70f0'),
('osm:node:7183733144', 'https://www.openstreetmap.org/node/7183733144', '{"provider":"openstreetmap","element":{"type":"node","id":7183733144,"lat":33.6312604,"lon":69.2306769,"tags":{"amenity":"clinic","name":"کلینیک معالجوی اباسین"}}}'::jsonb, '173213aed7bf5f72bdd025e9c5f32e71c262f94955ae5cce60e6923434dca183', 'کلینیک معالجوی اباسین', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.6312604, 69.2306769, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:58a074a4443593f05ac21a55709dd1ab10b63fec094327d1019f32dda76e22f6'),
('osm:node:8838139291', 'https://www.openstreetmap.org/node/8838139291', '{"provider":"openstreetmap","element":{"type":"node","id":8838139291,"lat":36.2648571,"lon":68.018655,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلینیک معالجوی الشفا"}}}'::jsonb, '33eee9183869a70b398990eac9adec5b7697504198e604c0f7e6f37a5f17ca5d', 'کلینیک معالجوی الشفا', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2648571, 68.018655, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:29af6044c47e5b78544bc47a536c9b46ce4f0c0d76c72483fcb7d7d104bbd0dc'),
('osm:node:7183733174', 'https://www.openstreetmap.org/node/7183733174', '{"provider":"openstreetmap","element":{"type":"node","id":7183733174,"lat":33.5977954,"lon":69.2265553,"tags":{"amenity":"dentist","healthcare":"dentist","name":"کلینیک معالجوی دندان"}}}'::jsonb, '8c0db5dbd341884d3fc8b5503c5aa86fde67e855b6b1e6b45bcb071cfa4d84c0', 'کلینیک معالجوی دندان', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.5977954, 69.2265553, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:10824c4fe642ab38c2aa06609d70feaf37ba788b0902f015397b25619da8e3a9'),
('osm:node:7183733173', 'https://www.openstreetmap.org/node/7183733173', '{"provider":"openstreetmap","element":{"type":"node","id":7183733173,"lat":33.5988101,"lon":69.2262566,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلینیک معالجوی سیف"}}}'::jsonb, 'eef4c1179a37fcdd57fb535c8a5e95eb0d4f18a219bdac56cf712fd8f74a185a', 'کلینیک معالجوی سیف', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.5988101, 69.2262566, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:e408a585882aca356a84cfbeef1073e1e8a35e53cdafbb85e086283fcc916316'),
('osm:node:7183733143', 'https://www.openstreetmap.org/node/7183733143', '{"provider":"openstreetmap","element":{"type":"node","id":7183733143,"lat":33.6297366,"lon":69.2303209,"tags":{"amenity":"clinic","name":"کلینیک معالجوی غازی امان الله خان"}}}'::jsonb, '66488bbd1e26a2173ad75448b259e461e28ddbde21fd75250327f70e45f544c3', 'کلینیک معالجوی غازی امان الله خان', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.6297366, 69.2303209, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:271020d796fc43faad7868ead08194ec52ae84f24731684007afaf55adbdc117'),
('osm:node:8964560284', 'https://www.openstreetmap.org/node/8964560284', '{"provider":"openstreetmap","element":{"type":"node","id":8964560284,"lat":34.5550907,"lon":69.2093387,"tags":{"amenity":"clinic","name":"کلینیک معالجوی و زایشگاه مهر"}}}'::jsonb, 'a6819b8cd1ce4031e5cd35607c4395ae0a7d585d8f8921fa481d9429a14212b5', 'کلینیک معالجوی و زایشگاه مهر', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5550907, 69.2093387, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:3ec75e9e9defb89f1e210942f7313b6bd51e68b287e744707c1eac320d90cafe'),
('osm:node:8502345630', 'https://www.openstreetmap.org/node/8502345630', '{"provider":"openstreetmap","element":{"type":"node","id":8502345630,"lat":34.5105982,"lon":69.1425378,"tags":{"amenity":"clinic","healthcare":"clinic","name":"کلینیک نثار نیازی"}}}'::jsonb, '86bdd0d2de6a3bdc8e8cdaef0575705898369bec5fb21c358d4eed47a445843a', 'کلینیک نثار نیازی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5105982, 69.1425378, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:8265619aa1bcaf7fe4b57ee777b93e2ffb98aa817170cd10053642eaa68dc12e'),
('osm:node:7883103330', 'https://www.openstreetmap.org/node/7883103330', '{"provider":"openstreetmap","element":{"type":"node","id":7883103330,"lat":34.5270333,"lon":69.2082629,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"کنعان درملتون"}}}'::jsonb, 'f406eab663aae9a1e12dfd20d09dee589db5c63136f04db6fbacf51d00142887', 'کنعان درملتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5270333, 69.2082629, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:b580faa7adb983ece94295e57f0dea933ce48a3c1e3515d9e0f95d813d491da7'),
('osm:way:820174747', 'https://www.openstreetmap.org/way/820174747', '{"provider":"openstreetmap","element":{"type":"way","id":820174747,"center":{"lat":34.5371175,"lon":69.1423059},"tags":{"amenity":"hospital","building":"yes","healthcare":"hospital","name":"گلوبل میدیکال کامپلکس","name:en":"Global Medical Complex"}}}'::jsonb, 'dcb31cb7340f8f12af464ef5d14255d299ecc0265be413f85cef1335d301a7c8', 'گلوبل میدیکال کامپلکس', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5371175, 69.1423059, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:b50f4d47abec0890f23dce494037e0d9782d6d8309f1a9f59e4eafe203cfbe0a');

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
