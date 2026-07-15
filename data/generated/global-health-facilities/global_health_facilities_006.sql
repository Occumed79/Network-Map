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
('osm:node:6219110190', 'https://www.openstreetmap.org/node/6219110190', '{"provider":"openstreetmap","element":{"type":"node","id":6219110190,"lat":-8.9014146,"lon":13.2611029,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Dr. Dentista"}}}'::jsonb, '0ebc024a05e61d1cfcb8b4572f4ecd812fad7cf99cd423b472a27e60cbc637f2', 'Dr. Dentista', 'dr dentista', NULL, NULL, NULL, NULL, NULL, 'AO', -8.9014146, 13.2611029, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:4b9d45e9691f69222c7bea0206dec561096eda31cc1197b5f6d0e70678ee1cb8'),
('osm:way:420810162', 'https://www.openstreetmap.org/way/420810162', '{"provider":"openstreetmap","element":{"type":"way","id":420810162,"center":{"lat":-8.8192928,"lon":13.2315142},"tags":{"addr:city":"Luanda","addr:housenumber":"Nº3","addr:street":"Rua Amílcar Cabral (Largo Serpa Pinto)","amenity":"hospital","building":"commercial","building:levels":"15","healthcare":"hospital","name":"Edifício Luanda Medical Center","name:fr":"Luanda Médical Center"}}}'::jsonb, 'a64adc61835b636a367185e1fbdd300aa6fce83f3521b71098fd32e21980e585', 'Edifício Luanda Medical Center', 'edif cio luanda medical center', 'Nº3 Rua Amílcar Cabral (Largo Serpa Pinto)', 'Nº3 Rua Amílcar Cabral (Largo Serpa Pinto), Luanda', 'Luanda', NULL, NULL, 'AO', -8.8192928, 13.2315142, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:4a1ee8d2ea638584e8d3012c078105604163f94077546779a53cbf326835358c'),
('osm:node:7298011018', 'https://www.openstreetmap.org/node/7298011018', '{"provider":"openstreetmap","element":{"type":"node","id":7298011018,"lat":-14.9192879,"lon":13.4804769,"tags":{"amenity":"hospital","healthcare":"hospital","name":"Entrada - Hospital Doutor Agostinho Neto - Hospital Universitário do Lubango (HAG-HUL)","operator":"Direção Provincial da Saúde","operator:type":"public"}}}'::jsonb, 'e51bd0c1557e95c6a03bc473b00e5b5cfd3d97981eedd75c9b24cfaa791e0e66', 'Entrada - Hospital Doutor Agostinho Neto - Hospital Universitário do Lubango (HAG-HUL)', 'entrada hospital doutor agostinho neto hospital universit rio do lubango hag hul', NULL, NULL, NULL, NULL, NULL, 'AO', -14.9192879, 13.4804769, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:e4db0ddaf3e25d881bff843c97e288d03410ed5ea6520d67a7bb69691ad94f69'),
('osm:node:11459451740', 'https://www.openstreetmap.org/node/11459451740', '{"provider":"openstreetmap","element":{"type":"node","id":11459451740,"lat":-5.5447983,"lon":12.3012059,"tags":{"amenity":"hospital","healthcare":"hospital","name":"Entrada Principal"}}}'::jsonb, '3fc1731eac92216b3521ef0a1415097eb0eb3db7b33b0274dc08cd8883dcd068', 'Entrada Principal', 'entrada principal', NULL, NULL, NULL, NULL, NULL, 'AO', -5.5447983, 12.3012059, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:11db0e3b11fffb657d2d3e16bafa97165890219de2f54970c56395a45ef30ab5'),
('osm:node:8540726752', 'https://www.openstreetmap.org/node/8540726752', '{"provider":"openstreetmap","element":{"type":"node","id":8540726752,"lat":-14.9279059,"lon":13.5450509,"tags":{"addr:city":"Lubango","addr:street":"Avenida do Estádio Nacional da Tundavala","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Ervanária Global"}}}'::jsonb, '23a20a6af64b9d6a6926359342b56e4756b41c116b086886536b78e479d9e32b', 'Ervanária Global', 'ervan ria global', 'Avenida do Estádio Nacional da Tundavala', 'Avenida do Estádio Nacional da Tundavala, Lubango', 'Lubango', NULL, NULL, 'AO', -14.9279059, 13.5450509, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:d87511d85c9eff143a280c810fb2296c9fdbe47585722feb5ea5eb6808573363'),
('osm:way:918003188', 'https://www.openstreetmap.org/way/918003188', '{"provider":"openstreetmap","element":{"type":"way","id":918003188,"center":{"lat":-14.8855581,"lon":13.512701},"tags":{"addr:city":"Lubango","addr:housenumber":"Nambambi","healthcare":"alternative","name":"Ervanária Senhor Paulo"}}}'::jsonb, '33afbf03213721833087de757b068eed575cac5ea99050df31e8d5de7dc84590', 'Ervanária Senhor Paulo', 'ervan ria senhor paulo', 'Nambambi', 'Nambambi, Lubango', 'Lubango', NULL, NULL, 'AO', -14.8855581, 13.512701, NULL, NULL, NULL, 'unknown', ARRAY['unknown']::text[], 0.86, 'loc:c1edbb8594ae0c27e08ffec2e0530aeb21f374dfe07f83b9cc64d716c3e66592'),
('osm:way:918004841', 'https://www.openstreetmap.org/way/918004841', '{"provider":"openstreetmap","element":{"type":"way","id":918004841,"center":{"lat":-14.8913132,"lon":13.5059061},"tags":{"addr:city":"Lubango","addr:housenumber":"Bula Matadi","building":"yes","healthcare":"alternative","name":"Ervanária Tchiogolola"}}}'::jsonb, '8a76daf0e4ca59c142df5e2ad4d41b1e2014bba5c90232dde6621a28e38bd063', 'Ervanária Tchiogolola', 'ervan ria tchiogolola', 'Bula Matadi', 'Bula Matadi, Lubango', 'Lubango', NULL, NULL, 'AO', -14.8913132, 13.5059061, NULL, NULL, NULL, 'unknown', ARRAY['unknown']::text[], 0.86, 'loc:813158d9b93a6d93961c8108b6380452ef741527e8da165477fe6e14fe9c575c'),
('osm:node:8537378601', 'https://www.openstreetmap.org/node/8537378601', '{"provider":"openstreetmap","element":{"type":"node","id":8537378601,"lat":-14.9262354,"lon":13.5143885,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Esperança"}}}'::jsonb, '6123ca7bc0663c7c0867b6767d6507eae73e5cb0883265a6a2da76600b7fd5d1', 'Esperança', 'esperan a', NULL, NULL, NULL, NULL, NULL, 'AO', -14.9262354, 13.5143885, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:de35ca391bc68c68990dcc05ce2d5ce1c8d0b4ca9853a2c5a9ca8415d06aa260'),
('osm:way:420113227', 'https://www.openstreetmap.org/way/420113227', '{"provider":"openstreetmap","element":{"type":"way","id":420113227,"center":{"lat":-8.9159063,"lon":13.1789544},"tags":{"amenity":"pharmacy","building":"yes","healthcare":"pharmacy","name":"Farmacare"}}}'::jsonb, '4a7603b4395288581980384c73d665616b44cae79d10946949ca4722aa162d7b', 'Farmacare', 'farmacare', NULL, NULL, NULL, NULL, NULL, 'AO', -8.9159063, 13.1789544, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:ca9d63666d533656785611fa7853e161f30069a10d6cfed42e06b3d7ac5e8600'),
('osm:node:10284921247', 'https://www.openstreetmap.org/node/10284921247', '{"provider":"openstreetmap","element":{"type":"node","id":10284921247,"lat":-9.0430593,"lon":13.4036871,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmácia"}}}'::jsonb, 'a0dae7783e62f5e86e6a315b69d7a7be26701ecc07bd204fd6f835e2d3e290a3', 'Farmácia', 'farm cia', NULL, NULL, NULL, NULL, NULL, 'AO', -9.0430593, 13.4036871, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:89935f52e45d4e2b9d3942f3c98a13ef0283975051af3bdee51660a4a8723bde'),
('osm:node:11093013305', 'https://www.openstreetmap.org/node/11093013305', '{"provider":"openstreetmap","element":{"type":"node","id":11093013305,"lat":-8.987028,"lon":13.3949904,"tags":{"amenity":"pharmacy","name":"Farmácia","name:en":"Pharmacy","name:es":"Farmacia"}}}'::jsonb, '38bb71481d49eade70bb59f0e3376f095c3ee68bc9da26c086656793c0108844', 'Farmácia', 'farm cia', NULL, NULL, NULL, NULL, NULL, 'AO', -8.987028, 13.3949904, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:091f1137fa1ec6908f732665773078183648298dbf1f70ec0aee60ab0cab2dae'),
('osm:node:2345209663', 'https://www.openstreetmap.org/node/2345209663', '{"provider":"openstreetmap","element":{"type":"node","id":2345209663,"lat":-8.965643,"lon":13.1531614,"tags":{"amenity":"pharmacy","name":"Farmácia"}}}'::jsonb, '1d75d66877422624dfffc5073eff20e3bbbce24d1b77a4b52bd52cb10734b387', 'Farmácia', 'farm cia', NULL, NULL, NULL, NULL, NULL, 'AO', -8.965643, 13.1531614, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:dc0770ad6878c828d8481d7056ff19211f24f60a217716104d70a347155354b0'),
('osm:node:2872982684', 'https://www.openstreetmap.org/node/2872982684', '{"provider":"openstreetmap","element":{"type":"node","id":2872982684,"lat":-8.97054,"lon":13.1539753,"tags":{"amenity":"pharmacy","name":"Farmácia"}}}'::jsonb, '585240ece22ab1e000f40c9642504ce557365688c25a22e6b00f1883a465327e', 'Farmácia', 'farm cia', NULL, NULL, NULL, NULL, NULL, 'AO', -8.97054, 13.1539753, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:d97e3908f2b1763d7f32967ea435a2e02075bd4513ec076ca2b1dc87bc199e90'),
('osm:node:4347541247', 'https://www.openstreetmap.org/node/4347541247', '{"provider":"openstreetmap","element":{"type":"node","id":4347541247,"lat":-12.9534419,"lon":13.1008179,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmácia"}}}'::jsonb, 'ff9f40c5631da9e53bf6e1e511db224f4068539c2e2fbf16ac2b54edc1bc8095', 'Farmácia', 'farm cia', NULL, NULL, NULL, NULL, NULL, 'AO', -12.9534419, 13.1008179, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:546e9fb66bb2da2299541612e2f41caa63bc155c33f2ca0c7f49773b33891208'),
('osm:node:4464962789', 'https://www.openstreetmap.org/node/4464962789', '{"provider":"openstreetmap","element":{"type":"node","id":4464962789,"lat":-8.8493013,"lon":13.2877611,"tags":{"addr:street":"Rua dos Comandos","amenity":"pharmacy","name":"Farmácia","name:en":"Pharmacy"}}}'::jsonb, 'd5824be1c1d5b6dc4271ebc94974a123cf98ccc6d6c65fc5c6eb006fb2c2d75e', 'Farmácia', 'farm cia', 'Rua dos Comandos', 'Rua dos Comandos', NULL, NULL, NULL, 'AO', -8.8493013, 13.2877611, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:24a38a4a3eb0326596ebd100832d7f26fda1b26bc6a251798cfce428c56bc98c'),
('osm:node:4855544494', 'https://www.openstreetmap.org/node/4855544494', '{"provider":"openstreetmap","element":{"type":"node","id":4855544494,"lat":-8.8727548,"lon":13.2111141,"tags":{"addr:city":"Luanda","addr:street":"Avenida 21 de Janeiro","amenity":"pharmacy","name":"Farmácia"}}}'::jsonb, 'de4dfc3034924e7eb0703da7c7b85e49f69e25bd36880c56e82e8d6e34ad51e0', 'Farmácia', 'farm cia', 'Avenida 21 de Janeiro', 'Avenida 21 de Janeiro, Luanda', 'Luanda', NULL, NULL, 'AO', -8.8727548, 13.2111141, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:de299a274dd180ebe5830f3db4ccf457861eb17af5fb74e6de6a462348b6435b'),
('osm:node:5563186084', 'https://www.openstreetmap.org/node/5563186084', '{"provider":"openstreetmap","element":{"type":"node","id":5563186084,"lat":-8.876759,"lon":13.2110101,"tags":{"addr:city":"Luanda","addr:street":"Avenida 21 de Janeiro","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia"}}}'::jsonb, '3b427f42cedccd2bea4f1ff13eb4c136d0ab874b5187587e18d2a0bbe2b33d42', 'Farmácia', 'farm cia', 'Avenida 21 de Janeiro', 'Avenida 21 de Janeiro, Luanda', 'Luanda', NULL, NULL, 'AO', -8.876759, 13.2110101, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:faecbb2fd9a1e8118c50cdbed9684e42d6314b35ecbb7d874829f6b53228e8c0'),
('osm:node:5563186432', 'https://www.openstreetmap.org/node/5563186432', '{"provider":"openstreetmap","element":{"type":"node","id":5563186432,"lat":-8.9022864,"lon":13.1889812,"tags":{"addr:city":"Luanda","addr:street":"Avenida Pedro de C. Vandunem-Loy","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia"}}}'::jsonb, '1777835014ddc1305446ed147d67aacc2364287d35574d4ce373b64fc98c04ec', 'Farmácia', 'farm cia', 'Avenida Pedro de C. Vandunem-Loy', 'Avenida Pedro de C. Vandunem-Loy, Luanda', 'Luanda', NULL, NULL, 'AO', -8.9022864, 13.1889812, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:95643453f95e23355b00d97d096dcdf8ce1bd8127d3e8e030d3702b556d96534'),
('osm:node:5762135210', 'https://www.openstreetmap.org/node/5762135210', '{"provider":"openstreetmap","element":{"type":"node","id":5762135210,"lat":-8.9020589,"lon":13.2322983,"tags":{"addr:city":"Luanda","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia"}}}'::jsonb, '856d08fbbf25bc8f7d54fdc04340e452df15f7c1a776b8ca1d809b953523e042', 'Farmácia', 'farm cia', NULL, 'Luanda', 'Luanda', NULL, NULL, 'AO', -8.9020589, 13.2322983, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:32255e338b82db7b3eb192a83eb3b92f0ae8f9442346142d05e297b164a00ce0'),
('osm:node:6141186494', 'https://www.openstreetmap.org/node/6141186494', '{"provider":"openstreetmap","element":{"type":"node","id":6141186494,"lat":-8.9913415,"lon":13.3963787,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia","opening_hours":"24/7"}}}'::jsonb, '09c81bd0c5f9d114478860edd98a76a745f50562a6ee36ed9badbda45f2b8edb', 'Farmácia', 'farm cia', NULL, NULL, NULL, NULL, NULL, 'AO', -8.9913415, 13.3963787, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:c0fb764f28e517bfa4317a69a3cbb9cc53a9144765c6839dfd48efe9a657c252'),
('osm:node:6247987906', 'https://www.openstreetmap.org/node/6247987906', '{"provider":"openstreetmap","element":{"type":"node","id":6247987906,"lat":-9.0337229,"lon":13.4083389,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia"}}}'::jsonb, '8a29fc85851a86071578ebb5cdc3f957c0f60dcf7e3371fcd80005667f554807', 'Farmácia', 'farm cia', NULL, NULL, NULL, NULL, NULL, 'AO', -9.0337229, 13.4083389, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:80fa2013a4fff5779bb764c261d3962620e03fa20826affa8eeadfe42535eabe'),
('osm:node:6317031917', 'https://www.openstreetmap.org/node/6317031917', '{"provider":"openstreetmap","element":{"type":"node","id":6317031917,"lat":-9.0194409,"lon":13.4044765,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia"}}}'::jsonb, 'b2a85fcad18994899519b4ff5a4c2d18b1d63b36f7f7d805fe039fcc75d411f5', 'Farmácia', 'farm cia', NULL, NULL, NULL, NULL, NULL, 'AO', -9.0194409, 13.4044765, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:4b2c7d24655a94b35d9540f42a9af1ad5681715760341377c0653c9a4bc62db6'),
('osm:node:6317031941', 'https://www.openstreetmap.org/node/6317031941', '{"provider":"openstreetmap","element":{"type":"node","id":6317031941,"lat":-9.0179005,"lon":13.4040259,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia"}}}'::jsonb, 'a784e99d7a967dcf8c82d6a8348583fdf39b03f7e27aa09c28d0a389815b8f00', 'Farmácia', 'farm cia', NULL, NULL, NULL, NULL, NULL, 'AO', -9.0179005, 13.4040259, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:e5cccc7df1923919597e8e09174b5f2132b6ca0547328be31ef2e405b6b51cc8'),
('osm:node:6317032863', 'https://www.openstreetmap.org/node/6317032863', '{"provider":"openstreetmap","element":{"type":"node","id":6317032863,"lat":-9.0046497,"lon":13.4006282,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia"}}}'::jsonb, '5063ae3ac6f94d8f90edab45738eb16578f3d0e008062121b9148bd969a6df8f', 'Farmácia', 'farm cia', NULL, NULL, NULL, NULL, NULL, 'AO', -9.0046497, 13.4006282, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:7d8d1ca82bd40490b1d48c29e42feeaf39bdaf0c6923d3dcc355dbed12f55ed3'),
('osm:node:6317319787', 'https://www.openstreetmap.org/node/6317319787', '{"provider":"openstreetmap","element":{"type":"node","id":6317319787,"lat":-9.002597,"lon":13.3998039,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia"}}}'::jsonb, 'a21093a527b549478db3b7836dd085d5fd76482c0ca9855089ef977692c823fd', 'Farmácia', 'farm cia', NULL, NULL, NULL, NULL, NULL, 'AO', -9.002597, 13.3998039, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:f468d9c0ff25a4fd139a56ca606609ab392192db5fccc7132ad558d0d1ab5938'),
('osm:node:6330266477', 'https://www.openstreetmap.org/node/6330266477', '{"provider":"openstreetmap","element":{"type":"node","id":6330266477,"lat":-9.0328624,"lon":13.4072164,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia"}}}'::jsonb, 'f10c70c46bcd652d026ac47b347b5dff13e0f71a8a448c6cdbaa5169d885dac1', 'Farmácia', 'farm cia', NULL, NULL, NULL, NULL, NULL, 'AO', -9.0328624, 13.4072164, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:d561c7edf497ba4e840f985452ca13c21c20c255e59ff823bb0fbb71f2fa2c05'),
('osm:node:5771476067', 'https://www.openstreetmap.org/node/5771476067', '{"provider":"openstreetmap","element":{"type":"node","id":5771476067,"lat":-8.8968744,"lon":13.2204695,"tags":{"addr:city":"Luanda","addr:street":"Avenida Pedro de C. Vandunem-Loy","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia - TS"}}}'::jsonb, '197c94d13a36ad0371edfa77e5f0ba75576f1dc4df86d2dfdd23ec34359fce16', 'Farmácia - TS', 'farm cia ts', 'Avenida Pedro de C. Vandunem-Loy', 'Avenida Pedro de C. Vandunem-Loy, Luanda', 'Luanda', NULL, NULL, 'AO', -8.8968744, 13.2204695, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:a96d290305a60d756e3468ba088d5c4a221b7cbf3df6e91b95f5eed4c437574c'),
('osm:node:9966433908', 'https://www.openstreetmap.org/node/9966433908', '{"provider":"openstreetmap","element":{"type":"node","id":9966433908,"lat":-8.9017641,"lon":13.225283,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmácia 35","phone":"+244 947 569 660"}}}'::jsonb, 'bb61985bf60ef4e337e23980c5d006086c60a799b56e73bb6afedebc5b4594ed', 'Farmácia 35', 'farm cia 35', NULL, NULL, NULL, NULL, NULL, 'AO', -8.9017641, 13.225283, '+244 947 569 660', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:395f7957778206f228444101f16711688193917f0c55017d49eefce30e26a8f2'),
('osm:node:6201975798', 'https://www.openstreetmap.org/node/6201975798', '{"provider":"openstreetmap","element":{"type":"node","id":6201975798,"lat":-8.8513122,"lon":13.2177162,"tags":{"addr:city":"Luanda","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia A Daniel","phone":"+244 924 117 351"}}}'::jsonb, 'cf09554e6a8942ebe527f6dacac6962cac364724de493a8332d0178ddc72f250', 'Farmácia A Daniel', 'farm cia a daniel', NULL, 'Luanda', 'Luanda', NULL, NULL, 'AO', -8.8513122, 13.2177162, '+244 924 117 351', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:f3a7bc6d607ca27a216ce944360341d3494dd903fbf19e92d959a8c0c765cff5'),
('osm:node:6320599509', 'https://www.openstreetmap.org/node/6320599509', '{"provider":"openstreetmap","element":{"type":"node","id":6320599509,"lat":-8.9345499,"lon":13.2629322,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmacia a sua Saúde é a Nossa Preocupação"}}}'::jsonb, '659d85eee51dd10e02fb9c6953f4fa0cbeeeb0563d64d1933a17ed9334292526', 'Farmacia a sua Saúde é a Nossa Preocupação', 'farmacia a sua sa de a nossa preocupa o', NULL, NULL, NULL, NULL, NULL, 'AO', -8.9345499, 13.2629322, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:d7a884315fa93c7c4e4c9927b2447ad433d42d13d5f9d3ace4b8b2711d916554'),
('osm:node:6219109034', 'https://www.openstreetmap.org/node/6219109034', '{"provider":"openstreetmap","element":{"type":"node","id":6219109034,"lat":-8.9062584,"lon":13.2612525,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia A.V.M"}}}'::jsonb, '17857c02a75ff45f5bba4cf94701eee6848c1614c6cea18f77a06ae3f0c00025', 'Farmácia A.V.M', 'farm cia a v m', NULL, NULL, NULL, NULL, NULL, 'AO', -8.9062584, 13.2612525, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:3519f3589313d9f7de0450a3f2cdf9833c8da2d5332bd614022d3503ae9aaae3'),
('osm:node:11090570409', 'https://www.openstreetmap.org/node/11090570409', '{"provider":"openstreetmap","element":{"type":"node","id":11090570409,"lat":-14.9083071,"lon":13.5102583,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmácia A@S- Augusto Santos"}}}'::jsonb, 'b541ed54e3d435b2382fa186ee0af2d32575c16921d729df80d0503ba0219f7d', 'Farmácia A@S- Augusto Santos', 'farm cia a s augusto santos', NULL, NULL, NULL, NULL, NULL, 'AO', -14.9083071, 13.5102583, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:31098c82764951d994a2d4c479962d7006c9626077cf16f1636db3c1adb94818'),
('osm:node:4780449577', 'https://www.openstreetmap.org/node/4780449577', '{"provider":"openstreetmap","element":{"type":"node","id":4780449577,"lat":-8.8915847,"lon":13.2000028,"tags":{"addr:city":"Luanda","addr:street":"Avenida 21 de Janeiro","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmácia A&W"}}}'::jsonb, '244256dde439223d6028efcb83c50366b11779541c0f00df7b7a613d16e611d0', 'Farmácia A&W', 'farm cia a w', 'Avenida 21 de Janeiro', 'Avenida 21 de Janeiro, Luanda', 'Luanda', NULL, NULL, 'AO', -8.8915847, 13.2000028, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:7019ccbfbb473a58c0625b267b30c1b8f2330779ee9234fca171812e1f205e7c'),
('osm:node:5169888257', 'https://www.openstreetmap.org/node/5169888257', '{"provider":"openstreetmap","element":{"type":"node","id":5169888257,"lat":-8.9389269,"lon":13.160997,"tags":{"addr:city":"Luanda","addr:street":"Estrada da Samba","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmácia A&W"}}}'::jsonb, '17bc985e9fdfa56ab8e3339dec9e0ecc59c5cabddc8cadbb94f80dc37e15896c', 'Farmácia A&W', 'farm cia a w', 'Estrada da Samba', 'Estrada da Samba, Luanda', 'Luanda', NULL, NULL, 'AO', -8.9389269, 13.160997, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:1715821fcb7da9767dddab7291f16b6d735c1dea41a8cd5142254e539813f74a'),
('osm:node:4834685429', 'https://www.openstreetmap.org/node/4834685429', '{"provider":"openstreetmap","element":{"type":"node","id":4834685429,"lat":-8.8949517,"lon":13.192962,"tags":{"addr:city":"Luanda","addr:street":"Avenida 21 de Janeiro","amenity":"pharmacy","name":"Farmácia Abi"}}}'::jsonb, '733c50a64bb34e3859b7c36be6da1164a058c8016e473df6441ed9a359bd258e', 'Farmácia Abi', 'farm cia abi', 'Avenida 21 de Janeiro', 'Avenida 21 de Janeiro, Luanda', 'Luanda', NULL, NULL, 'AO', -8.8949517, 13.192962, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:93fb0fa129edf814974297de41f93ef069fb623fecc62cb020b4d3d053dad68a'),
('osm:node:5166833966', 'https://www.openstreetmap.org/node/5166833966', '{"provider":"openstreetmap","element":{"type":"node","id":5166833966,"lat":-8.9156776,"lon":13.1680083,"tags":{"addr:city":"Luanda","addr:street":"Avenida Pedro de Castro Vandunem-Loy","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmácia Adaldie"}}}'::jsonb, '6513c98a0f8cc380174833ef651daecf18da764a34eb550303a6e5726a5287ac', 'Farmácia Adaldie', 'farm cia adaldie', 'Avenida Pedro de Castro Vandunem-Loy', 'Avenida Pedro de Castro Vandunem-Loy, Luanda', 'Luanda', NULL, NULL, 'AO', -8.9156776, 13.1680083, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:31ad056abc466cef04d799d8e9c6814bef77f401385cabf86ae732453ef4c90a'),
('osm:node:6139526669', 'https://www.openstreetmap.org/node/6139526669', '{"provider":"openstreetmap","element":{"type":"node","id":6139526669,"lat":-8.9871254,"lon":13.3952807,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia Adelaide Mendes","operator":"万通修理厂 (Wantong Repair Shop)","phone":"+244 932 460 000, +244 927 131 692"}}}'::jsonb, 'e689c4b94ee11fc65c8c13a2aa71515936b7a39e0f6224bcd7a0d1333c5df1bd', 'Farmácia Adelaide Mendes', 'farm cia adelaide mendes', NULL, NULL, NULL, NULL, NULL, 'AO', -8.9871254, 13.3952807, '+244 932 460 000, +244 927 131 692', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:1505b3e895ad19709e19b7ccd9ab1df9cc2d79882ecaae42ea7f4126f2d6083d'),
('osm:node:8464490181', 'https://www.openstreetmap.org/node/8464490181', '{"provider":"openstreetmap","element":{"type":"node","id":8464490181,"lat":-14.922253,"lon":13.510178,"tags":{"addr:city":"Lubango","addr:street":"Rua da Maxiqueira","amenity":"pharmacy","building":"yes","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia Afomar"}}}'::jsonb, '5130134f74897fcb6199bb421c88c01bf66b8913f5f6531e35ff573318dc6ab2', 'Farmácia Afomar', 'farm cia afomar', 'Rua da Maxiqueira', 'Rua da Maxiqueira, Lubango', 'Lubango', NULL, NULL, 'AO', -14.922253, 13.510178, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:52914f8f19a0b197224cb5c56b4528bc9bdb7f80ff0c632e16e1273e16d73a0d'),
('osm:way:911612739', 'https://www.openstreetmap.org/way/911612739', '{"provider":"openstreetmap","element":{"type":"way","id":911612739,"center":{"lat":-14.9221447,"lon":13.510064},"tags":{"addr:city":"Lubango","addr:street":"Rua da Maxiqueira","amenity":"pharmacy","building":"yes","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia Afomar"}}}'::jsonb, '0de68c18d95d9c8419330e7904a0d67a07fca9e7b98461145372de2210eb37d6', 'Farmácia Afomar', 'farm cia afomar', 'Rua da Maxiqueira', 'Rua da Maxiqueira, Lubango', 'Lubango', NULL, NULL, 'AO', -14.9221447, 13.510064, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:208127ab0955da98d690a905f60462e7a3064f41b0f2d20dd7e68823bf6b6a12'),
('osm:node:3204243553', 'https://www.openstreetmap.org/node/3204243553', '{"provider":"openstreetmap","element":{"type":"node","id":3204243553,"lat":-8.8166764,"lon":13.2471563,"tags":{"addr:city":"Luanda","addr:street":"Alameda Ho Chi Minh","amenity":"pharmacy","name":"Farmácia Alameda"}}}'::jsonb, '7f7804f7cb03c4776f02614451aac1a6de1cc2e7c7edc9890fba4e535694d42e', 'Farmácia Alameda', 'farm cia alameda', 'Alameda Ho Chi Minh', 'Alameda Ho Chi Minh, Luanda', 'Luanda', NULL, NULL, 'AO', -8.8166764, 13.2471563, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:de27ac28f482591004f75b702a2a16dac2b0a9adbc8976f7a528522a83b02cc3'),
('osm:node:12314269632', 'https://www.openstreetmap.org/node/12314269632', '{"provider":"openstreetmap","element":{"type":"node","id":12314269632,"lat":-8.9519642,"lon":13.1936898,"tags":{"amenity":"pharmacy","dispensing":"yes","drive_through":"no","healthcare":"pharmacy","image":"https://avatars.mds.yandex.net/get-altay/11072941/2a0000018ae7610a57788b4e60566d4b1893/XXXL","name":"Farmácia Alana Day"}}}'::jsonb, 'daa7724e4998b6255b48e6d9ae0edffad14bd42d860827add045e6085cd8b9ad', 'Farmácia Alana Day', 'farm cia alana day', NULL, NULL, NULL, NULL, NULL, 'AO', -8.9519642, 13.1936898, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:452da9541471f374b4f91a21d65d967c0b7e6dac4b1d30e44f0aa834da9abb1d'),
('osm:node:5664434729', 'https://www.openstreetmap.org/node/5664434729', '{"provider":"openstreetmap","element":{"type":"node","id":5664434729,"lat":-8.9124109,"lon":13.2386406,"tags":{"addr:city":"Luanda","addr:street":"Rua do Mufulama","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia Alberta"}}}'::jsonb, 'd71d811579a34b439751a02b4314334cc4019a1ae047d64032b10a13a6ef981a', 'Farmácia Alberta', 'farm cia alberta', 'Rua do Mufulama', 'Rua do Mufulama, Luanda', 'Luanda', NULL, NULL, 'AO', -8.9124109, 13.2386406, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:feb2b9edef94fb8de1aacf1995c70a349767ce12b6c537d6174897a1de44dfdb'),
('osm:node:5168357086', 'https://www.openstreetmap.org/node/5168357086', '{"provider":"openstreetmap","element":{"type":"node","id":5168357086,"lat":-8.9326782,"lon":13.1616834,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmácia Alcifarma"}}}'::jsonb, '47c6ba359c5ddd3766026dc38dc1f556d051cf42880ff877f8246706e9e05149', 'Farmácia Alcifarma', 'farm cia alcifarma', NULL, NULL, NULL, NULL, NULL, 'AO', -8.9326782, 13.1616834, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:da1967ad6879e964ec63628f49ef573ceedfde40bb469af3845b309e8c7437f6'),
('osm:node:10269217458', 'https://www.openstreetmap.org/node/10269217458', '{"provider":"openstreetmap","element":{"type":"node","id":10269217458,"lat":-14.9043992,"lon":13.5160862,"tags":{"addr:city":"Lalula","addr:street":"Avenida Comandante Kwenha","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmacia Alkar","opening_hours":"Mo-Sa 08:00-21:00","operator":"Jandira Lopes e Alkar"}}}'::jsonb, '079092f696f5e4a92f155d778456e36287978d6c7449fae9643366c836eb903c', 'Farmacia Alkar', 'farmacia alkar', 'Avenida Comandante Kwenha', 'Avenida Comandante Kwenha, Lalula', 'Lalula', NULL, NULL, 'AO', -14.9043992, 13.5160862, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:c2c4d45e343155e44384835533757e7b87838cf2366c9476b2200af9bdb508fa'),
('osm:node:13252498821', 'https://www.openstreetmap.org/node/13252498821', '{"provider":"openstreetmap","element":{"type":"node","id":13252498821,"lat":-15.1998513,"lon":12.1711697,"tags":{"addr:city":"Moçâmedes","addr:street":"Estrada do Bairro 5 de Abril","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmácia Alkar","opening_hours":"24h"}}}'::jsonb, '215a36c3d895a8feacee6c443487da8c2f1c8135081390799470f0afeb8328e9', 'Farmácia Alkar', 'farm cia alkar', 'Estrada do Bairro 5 de Abril', 'Estrada do Bairro 5 de Abril, Moçâmedes', 'Moçâmedes', NULL, NULL, 'AO', -15.1998513, 12.1711697, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:af768c85f1dddb4802f5d5b8d9af3b6d91909eb1192b55a02d98f9ecc951df9b'),
('osm:way:1445761572', 'https://www.openstreetmap.org/way/1445761572', '{"provider":"openstreetmap","element":{"type":"way","id":1445761572,"center":{"lat":-15.1982868,"lon":12.153308},"tags":{"addr:city":"Moçâmedes","addr:street":"Rua Comandante Gika","amenity":"pharmacy","building":"yes","drive_through":"yes","healthcare":"pharmacy","layer":"-1","name":"Farmácia Ângel 2 Namibe","opening_hours":"24/7"}}}'::jsonb, '5d833aa4cd4800cda949a0a7f74e2f94a0ae232532d778b4164155237284855f', 'Farmácia Ângel 2 Namibe', 'farm cia ngel 2 namibe', 'Rua Comandante Gika', 'Rua Comandante Gika, Moçâmedes', 'Moçâmedes', NULL, NULL, 'AO', -15.1982868, 12.153308, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:03c870b762e6d4dd1132610338067bb2ff5de21ea3fe519e5495ad4773645579'),
('osm:node:9260268470', 'https://www.openstreetmap.org/node/9260268470', '{"provider":"openstreetmap","element":{"type":"node","id":9260268470,"lat":-15.2028773,"lon":12.1450763,"tags":{"addr:city":"Moçâmedes","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmacia Angela 2"}}}'::jsonb, '329550f318bbaa86c1edfd0ee8a54c5d33cb9b70df6d38972a90123f73f2989e', 'Farmacia Angela 2', 'farmacia angela 2', NULL, 'Moçâmedes', 'Moçâmedes', NULL, NULL, 'AO', -15.2028773, 12.1450763, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:c72e059b869d9f6dbce60b44944b6cb43d8e9c628ead61e3a680865d7cb3b11e'),
('osm:node:10931295884', 'https://www.openstreetmap.org/node/10931295884', '{"provider":"openstreetmap","element":{"type":"node","id":10931295884,"lat":-14.9124323,"lon":13.5042896,"tags":{"addr:street":"Rua 1 de Setembro","amenity":"pharmacy","dispensing":"yes","drive_through":"yes","healthcare":"pharmacy","name":"Farmacia ANGLIS","opening_hours":"PH,Mo-Su 08:00-23:00","wheelchair":"yes"}}}'::jsonb, '4ef8fb7867e62dd98333c638db9efe609f76c9508acb43239f53b3d783b79c6f', 'Farmacia ANGLIS', 'farmacia anglis', 'Rua 1 de Setembro', 'Rua 1 de Setembro', NULL, NULL, NULL, 'AO', -14.9124323, 13.5042896, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:3b2e3f2729fff9ad5f453a35d9d627469498187dbe77604f7468c063abbabc75'),
('osm:node:5694685400', 'https://www.openstreetmap.org/node/5694685400', '{"provider":"openstreetmap","element":{"type":"node","id":5694685400,"lat":-8.9196061,"lon":13.2622905,"tags":{"addr:city":"Luanda","addr:street":"Via Expressa Golfe-Camama","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia Anipluris"}}}'::jsonb, '6a1d98013f25e8d099b1a89c7734cad41d62c865b7c67bc7f1994b7d01940768', 'Farmácia Anipluris', 'farm cia anipluris', 'Via Expressa Golfe-Camama', 'Via Expressa Golfe-Camama, Luanda', 'Luanda', NULL, NULL, 'AO', -8.9196061, 13.2622905, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:09a44cc7daa237830f68ba92ef93cd886f48f9027820db319608c7c38fd67d6b'),
('osm:node:11377223831', 'https://www.openstreetmap.org/node/11377223831', '{"provider":"openstreetmap","element":{"type":"node","id":11377223831,"lat":-14.9334213,"lon":13.4744698,"tags":{"amenity":"pharmacy","dispensing":"yes","drive_through":"no","healthcare":"pharmacy","name":"Farmácia Anjesca","opening_hours":"De Segunda a Domingo das 08:00-21:00","operator":"ANJESCA","wheelchair":"yes"}}}'::jsonb, 'bccd2da0318c4f09088792cbc128db3449687ef352a6ded9bb958acedd176517', 'Farmácia Anjesca', 'farm cia anjesca', NULL, NULL, NULL, NULL, NULL, 'AO', -14.9334213, 13.4744698, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:a0deb060c6f380d8f62e95cb82ffe20ae7d3cca7aa6dbdfe762bbe8e992e191f');

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
