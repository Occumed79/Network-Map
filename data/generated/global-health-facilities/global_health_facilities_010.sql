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
('osm:node:6330450727', 'https://www.openstreetmap.org/node/6330450727', '{"provider":"openstreetmap","element":{"type":"node","id":6330450727,"lat":-9.067577,"lon":13.4161905,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia Ngaxi & Filhos"}}}'::jsonb, '1a9b78dec774d316e678f21e0d0e46d51fe83209fa7b9ebc5fadd26bba4c90fe', 'Farmácia Ngaxi & Filhos', 'farm cia ngaxi filhos', NULL, NULL, NULL, NULL, NULL, 'AO', -9.067577, 13.4161905, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:1c081527ccd3aa66c80fc136fee111bba55b53b12ae482c656d859d3245e1cca'),
('osm:way:1365280368', 'https://www.openstreetmap.org/way/1365280368', '{"provider":"openstreetmap","element":{"type":"way","id":1365280368,"center":{"lat":-14.89675,"lon":13.4721765},"tags":{"amenity":"pharmacy","building":"yes","healthcare":"pharmacy","name":"Farmacia Ngila"}}}'::jsonb, 'f0ac2854ea08ea21102cbdd314b42e4c7c7a8b383b256b0919d009475b8afbb8', 'Farmacia Ngila', 'farmacia ngila', NULL, NULL, NULL, NULL, NULL, 'AO', -14.89675, 13.4721765, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:2154730afd3fae4ac389ceb713712c2c951124ed1f3ca0e6afefd88ff97fd233'),
('osm:node:8544391473', 'https://www.openstreetmap.org/node/8544391473', '{"provider":"openstreetmap","element":{"type":"node","id":8544391473,"lat":-8.969354,"lon":13.1055586,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia Nilia"}}}'::jsonb, '486b11af2e044121c3867ac874f83c3c93245309ca2165c6e08cea9ff86a2f8d', 'Farmácia Nilia', 'farm cia nilia', NULL, NULL, NULL, NULL, NULL, 'AO', -8.969354, 13.1055586, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:a7453647003d1bc763274b8c5c8161513d57e59afc97aa85b5dd7b9f851f0ed6'),
('osm:node:9993195657', 'https://www.openstreetmap.org/node/9993195657', '{"provider":"openstreetmap","element":{"type":"node","id":9993195657,"lat":-8.8430052,"lon":13.233881,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmácia Ninafarma"}}}'::jsonb, '0034170dbccfa2b5d4cbe49c1e5c97997045398e9ea25f429f615174d699fa8b', 'Farmácia Ninafarma', 'farm cia ninafarma', NULL, NULL, NULL, NULL, NULL, 'AO', -8.8430052, 13.233881, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:42f96e57a007ea42cdd7f75ce8aa4ddd9c5f5fc3391689b3051cfe2dacae72a6'),
('osm:node:5151070625', 'https://www.openstreetmap.org/node/5151070625', '{"provider":"openstreetmap","element":{"type":"node","id":5151070625,"lat":-8.7729231,"lon":13.2492565,"tags":{"addr:city":"Luanda","addr:street":"Avenida Murtala Mohamed (Ex Avenida Marchal Gomes da Costa)","amenity":"pharmacy","name":"Farmácia Nkundikla","name:de":"Nkundikla Apotheke","name:en":"Nkundikla Pharmacy","name:es":"Farmacia Nkundikla","name:fr":"Pharmacie Nkundikla","name:it":"Farmacia Nkundikla","name:nl":"Nkundikla Apotheek","name:pl":"Apteka Nkundikla","name:pt":"Farmácia Nkundikla","name:ru":"Аптека Нкундикла"}}}'::jsonb, 'f211e3388b19fc41973dd195850da52d50a254f1f38afdccd1091827702e3b88', 'Farmácia Nkundikla', 'farm cia nkundikla', 'Avenida Murtala Mohamed (Ex Avenida Marchal Gomes da Costa)', 'Avenida Murtala Mohamed (Ex Avenida Marchal Gomes da Costa), Luanda', 'Luanda', NULL, NULL, 'AO', -8.7729231, 13.2492565, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:b6debedbcd39a0f5aa677c1ea57a49ce711d9d4b3ecb6f185594290047060d7d'),
('osm:node:5664434788', 'https://www.openstreetmap.org/node/5664434788', '{"provider":"openstreetmap","element":{"type":"node","id":5664434788,"lat":-8.9164044,"lon":13.2389071,"tags":{"addr:city":"Luanda","addr:street":"Rua do Mufulama","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia Nova-vida II","opening_hours":"Mo-Fr 07:00-22:00","phone":"+244 923 661 234"}}}'::jsonb, '7e9101d5cb0d2691e3cc16922dd5ef901a4f45072c578b11333c8599a4537fbc', 'Farmácia Nova-vida II', 'farm cia nova vida ii', 'Rua do Mufulama', 'Rua do Mufulama, Luanda', 'Luanda', NULL, NULL, 'AO', -8.9164044, 13.2389071, '+244 923 661 234', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:4cb7a23e9929813b20ca5eb7c50bf3f9973ce3d79a119bb3e27f71f4c85e44cb'),
('osm:node:4680082432', 'https://www.openstreetmap.org/node/4680082432', '{"provider":"openstreetmap","element":{"type":"node","id":4680082432,"lat":-8.8517852,"lon":13.2096501,"tags":{"addr:city":"Luanda","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmácia Nsumbu"}}}'::jsonb, 'c6a0cd18237ef076f80664dc307c86ac766a39fa004a24add4efbb58b2fd28fa', 'Farmácia Nsumbu', 'farm cia nsumbu', NULL, 'Luanda', 'Luanda', NULL, NULL, 'AO', -8.8517852, 13.2096501, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:17719b13b7da2ca9419ab0020ff210f98f97d3fa79430ad34ce4aeda9f73e480'),
('osm:node:5917055938', 'https://www.openstreetmap.org/node/5917055938', '{"provider":"openstreetmap","element":{"type":"node","id":5917055938,"lat":-8.8497763,"lon":13.2106629,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia Nsumbu I"}}}'::jsonb, '07805bab4eed1d451675f43d8a546c21f059eeca59ce13d1328d7b9f9752de2a', 'Farmácia Nsumbu I', 'farm cia nsumbu i', NULL, NULL, NULL, NULL, NULL, 'AO', -8.8497763, 13.2106629, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:5829ae6ba5915644161d5b6541a0185e4d7f379fa062cdc3387dfb4dba6762d5'),
('osm:node:8461568915', 'https://www.openstreetmap.org/node/8461568915', '{"provider":"openstreetmap","element":{"type":"node","id":8461568915,"lat":-17.0688425,"lon":15.7312224,"tags":{"addr:city":"Ondjiva","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia Ondjiva"}}}'::jsonb, 'b1a66d74815767a53b539b69971527097c27bd4941db3fda58ec8acbc2c2f5af', 'Farmácia Ondjiva', 'farm cia ondjiva', NULL, 'Ondjiva', 'Ondjiva', NULL, NULL, 'AO', -17.0688425, 15.7312224, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:9ac0ed39a657cfe4198fce08aec34dce3570fbf28bab5e7136a528a7a3babee1'),
('osm:node:5776228753', 'https://www.openstreetmap.org/node/5776228753', '{"provider":"openstreetmap","element":{"type":"node","id":5776228753,"lat":-8.9960896,"lon":13.2770077,"tags":{"amenity":"pharmacy","name":"Farmácia orquidea","opening_hours":"24/7"}}}'::jsonb, '0614b94f2674b80e51948658eeaa5e259ed86e830fd6c626982bdbe01cb60e06', 'Farmácia orquidea', 'farm cia orquidea', NULL, NULL, NULL, NULL, NULL, 'AO', -8.9960896, 13.2770077, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:e4cc752a07cc8ec9e2bafd41b4721f10e9f331f2e7b6c3b0abd39a1f14bc4cf3'),
('osm:node:3812871192', 'https://www.openstreetmap.org/node/3812871192', '{"provider":"openstreetmap","element":{"type":"node","id":3812871192,"lat":-8.9158352,"lon":13.2122313,"tags":{"addr:city":"Luanda","amenity":"pharmacy","name":"Farmácia Orquídea"}}}'::jsonb, '8b88f4871aab56d2cbdbd615eef86d44642387ca6da02c631c70a9d26bc7c4e7', 'Farmácia Orquídea', 'farm cia orqu dea', NULL, 'Luanda', 'Luanda', NULL, NULL, 'AO', -8.9158352, 13.2122313, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:9fc436d01ebe45dfdf9a4fd49a16bac324775e2d3cd7bd2f69fddb774789593e'),
('osm:node:9947394248', 'https://www.openstreetmap.org/node/9947394248', '{"provider":"openstreetmap","element":{"type":"node","id":9947394248,"lat":-8.8401201,"lon":13.2328478,"tags":{"addr:city":"Luanda","addr:street":"Avenida Ho Chi Minh","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia Orquihaza II - Avinida Ho Chi Minh"}}}'::jsonb, '5b3af113b7a7d453c2ab1ea909cd2a53606e6f659f09e44035368622e5c89e6d', 'Farmácia Orquihaza II - Avinida Ho Chi Minh', 'farm cia orquihaza ii avinida ho chi minh', 'Avenida Ho Chi Minh', 'Avenida Ho Chi Minh, Luanda', 'Luanda', NULL, NULL, 'AO', -8.8401201, 13.2328478, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:af29be51fdad9282137604e0fd02c08d1b05c17a8e1b8accb22365e990ae8163'),
('osm:node:6237222565', 'https://www.openstreetmap.org/node/6237222565', '{"provider":"openstreetmap","element":{"type":"node","id":6237222565,"lat":-8.9329281,"lon":13.2002076,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia Pak"}}}'::jsonb, 'a96bacd6093026b027d452b5708d4495b6c7f75466246de3ab73ca3a945b4478', 'Farmácia Pak', 'farm cia pak', NULL, NULL, NULL, NULL, NULL, 'AO', -8.9329281, 13.2002076, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:bd46ca76f119fcdcbb8a080fe41e6707c28e55b08b7de8115a0b298253e0adf4'),
('osm:node:6231371801', 'https://www.openstreetmap.org/node/6231371801', '{"provider":"openstreetmap","element":{"type":"node","id":6231371801,"lat":-8.9497769,"lon":13.1886828,"tags":{"addr:city":"Luanda","addr:street":"Avenida \"O Lar do Patriota\"","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmácia Patriota"}}}'::jsonb, '2dc0fcdcd715537e9b20cc492271bb9652b10ae7f42c1fa0885c646bcc5042c4', 'Farmácia Patriota', 'farm cia patriota', 'Avenida "O Lar do Patriota"', 'Avenida "O Lar do Patriota", Luanda', 'Luanda', NULL, NULL, 'AO', -8.9497769, 13.1886828, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:8a02c89c6316d7d5cd53d549cf0b220875618624d2c1430caa79baaa71f6e209'),
('osm:node:10307192849', 'https://www.openstreetmap.org/node/10307192849', '{"provider":"openstreetmap","element":{"type":"node","id":10307192849,"lat":-8.9817625,"lon":13.1476076,"tags":{"addr:city":"Luanda","addr:street":"Rua D","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmacia Paulina e Filhos"}}}'::jsonb, 'cb684808914b6f22d39c79858aa6a94c0e57132e1dd8fe2b01a176b3a415f845', 'Farmacia Paulina e Filhos', 'farmacia paulina e filhos', 'Rua D', 'Rua D, Luanda', 'Luanda', NULL, NULL, 'AO', -8.9817625, 13.1476076, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:532f0831641dc3049c1e7de7612d92d1cc26b50745f7817017763ce0f4d85cbd'),
('osm:node:5161925626', 'https://www.openstreetmap.org/node/5161925626', '{"provider":"openstreetmap","element":{"type":"node","id":5161925626,"lat":-8.9077034,"lon":13.1625863,"tags":{"addr:city":"Luanda","addr:street":"Rua das Construções","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmácia PEGOS+"}}}'::jsonb, 'a9d75b9f74e7820b5438e371cd2a230c43c9f406430307e65f226fecd63be28e', 'Farmácia PEGOS+', 'farm cia pegos', 'Rua das Construções', 'Rua das Construções, Luanda', 'Luanda', NULL, NULL, 'AO', -8.9077034, 13.1625863, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:184588bd5416112f7580a66788f98feede5248ef82ec43df9561e49f9f9bcfab'),
('osm:node:4635858773', 'https://www.openstreetmap.org/node/4635858773', '{"provider":"openstreetmap","element":{"type":"node","id":4635858773,"lat":-8.9501403,"lon":13.1886914,"tags":{"addr:city":"Luanda","addr:street":"Avenida do Patriota","amenity":"pharmacy","name":"Farmácia PEGOS+ II"}}}'::jsonb, '690c6e657cdff78f04c11f530f15ffa0191bcb42b8ca9ef8e49839efe083ca56', 'Farmácia PEGOS+ II', 'farm cia pegos ii', 'Avenida do Patriota', 'Avenida do Patriota, Luanda', 'Luanda', NULL, NULL, 'AO', -8.9501403, 13.1886914, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:751d485d5737291c7a7ddef6593bd0672843f551709158f684ccb2119e0e91b9'),
('osm:node:5172297564', 'https://www.openstreetmap.org/node/5172297564', '{"provider":"openstreetmap","element":{"type":"node","id":5172297564,"lat":-8.8435397,"lon":13.2303091,"tags":{"addr:city":"Luanda","addr:street":"Rua 8","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmácia Pereira - Bairro Cassenda"}}}'::jsonb, 'a66bbed0257b932c93442fbee3b84a0ca109f4d6aa1f6f432b100aad6db4db81', 'Farmácia Pereira - Bairro Cassenda', 'farm cia pereira bairro cassenda', 'Rua 8', 'Rua 8, Luanda', 'Luanda', NULL, NULL, 'AO', -8.8435397, 13.2303091, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:09d7d98809d38cc05b33b01390bfffcd83eb4ae0c9ac33a9c00d64d42310f2c0'),
('osm:node:13269815442', 'https://www.openstreetmap.org/node/13269815442', '{"provider":"openstreetmap","element":{"type":"node","id":13269815442,"lat":-14.9390981,"lon":13.4844504,"tags":{"addr:city":"Lubango","addr:street":"Avenida Presidente Samora Machel","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmácia Pitágoras","opening_hours":"Mo-Sa 08:00-18:00"}}}'::jsonb, 'd415aacab92c5d3204357bd0d5f3d273bab396992cf0ba71eef44976ffd851e1', 'Farmácia Pitágoras', 'farm cia pit goras', 'Avenida Presidente Samora Machel', 'Avenida Presidente Samora Machel, Lubango', 'Lubango', NULL, NULL, 'AO', -14.9390981, 13.4844504, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:36fcfddd7bc4f2282ec53cb4847e8c0f35acffde3a01e1a128f07c459d199e28'),
('osm:node:4781761105', 'https://www.openstreetmap.org/node/4781761105', '{"provider":"openstreetmap","element":{"type":"node","id":4781761105,"lat":-8.9033574,"lon":13.1911983,"tags":{"addr:city":"Luanda","addr:street":"Avenida Pedro de C. Vandunem-Loy","amenity":"pharmacy","name":"Farmácia Popular"}}}'::jsonb, '9098ff7aab8915bfdf8b850c7cf138315eb5c52166be38e92ac214fbccbf8bac', 'Farmácia Popular', 'farm cia popular', 'Avenida Pedro de C. Vandunem-Loy', 'Avenida Pedro de C. Vandunem-Loy, Luanda', 'Luanda', NULL, NULL, 'AO', -8.9033574, 13.1911983, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:0c066132e6b9430d7a8fab0c4843951f7ad5048256b3f4b86a27e405a1853e7c'),
('osm:node:8488874390', 'https://www.openstreetmap.org/node/8488874390', '{"provider":"openstreetmap","element":{"type":"node","id":8488874390,"lat":-14.8893101,"lon":13.5182504,"tags":{"addr:street":"EN105","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia Pôr-do-Sol"}}}'::jsonb, '4cb72893154fd50271352e3029281d1f0f2106ce3a824134d1bcd630b549b610', 'Farmácia Pôr-do-Sol', 'farm cia p r do sol', 'EN105', 'EN105', NULL, NULL, NULL, 'AO', -14.8893101, 13.5182504, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:180be30fdadd5e89372395dd1984c899078b6265af6b7ff56f03b9053ad826d1'),
('osm:node:10011239589', 'https://www.openstreetmap.org/node/10011239589', '{"provider":"openstreetmap","element":{"type":"node","id":10011239589,"lat":-12.7781077,"lon":15.7356185,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmácia Portugal"}}}'::jsonb, 'bc9befbf72800319e359355c14310f23d4ed7ae76a07686539198655fab28fc1', 'Farmácia Portugal', 'farm cia portugal', NULL, NULL, NULL, NULL, NULL, 'AO', -12.7781077, 15.7356185, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:b9514278f3a6b2b3ad287e7960cf882f72ab6a19eb40e63fc39ddaefd8f0319f'),
('osm:node:11090533542', 'https://www.openstreetmap.org/node/11090533542', '{"provider":"openstreetmap","element":{"type":"node","id":11090533542,"lat":-14.9083885,"lon":13.5092779,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmácia Quesson Seven"}}}'::jsonb, '001da486abd1201ee99a5249d1c74ada9659a1e1db6b55764c6f7dac3770c8fb', 'Farmácia Quesson Seven', 'farm cia quesson seven', NULL, NULL, NULL, NULL, NULL, 'AO', -14.9083885, 13.5092779, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:06a2bc80e7ab410b1c12ed1288adc103c6e5e251088a5d55e108e6a76eb016d4'),
('osm:node:6316579876', 'https://www.openstreetmap.org/node/6316579876', '{"provider":"openstreetmap","element":{"type":"node","id":6316579876,"lat":-9.0569528,"lon":13.4136456,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia Rayssana"}}}'::jsonb, '0318bc356ca83fc5c4e165cff9905200621c46b345bff3643d6b3ec64e626b92', 'Farmácia Rayssana', 'farm cia rayssana', NULL, NULL, NULL, NULL, NULL, 'AO', -9.0569528, 13.4136456, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:db2815aaa9fba626755c47897d9383faeb5115e2292409ba14cb093d35627fd0'),
('osm:node:6201975246', 'https://www.openstreetmap.org/node/6201975246', '{"provider":"openstreetmap","element":{"type":"node","id":6201975246,"lat":-8.8493358,"lon":13.2144113,"tags":{"addr:city":"Luanda","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia Rema","phone":"+244 931 999 879"}}}'::jsonb, '58531529c762c299ed09d5c258b3e2a657db77b8675f7d6599fe44199d92c8c2', 'Farmácia Rema', 'farm cia rema', NULL, 'Luanda', 'Luanda', NULL, NULL, 'AO', -8.8493358, 13.2144113, '+244 931 999 879', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:be7bccc65f60e470f77408ad9b469f38b217a1b48c2812d03e5ddbcf19a9d3ec'),
('osm:node:9890809884', 'https://www.openstreetmap.org/node/9890809884', '{"provider":"openstreetmap","element":{"type":"node","id":9890809884,"lat":-8.975642,"lon":13.1713841,"tags":{"amenity":"pharmacy","name":"Farmácia Remédio Santo"}}}'::jsonb, '1c9212e9f56a92d7e72fa7abe3acfdf1bd929452d64c89c7371267dce478a688', 'Farmácia Remédio Santo', 'farm cia rem dio santo', NULL, NULL, NULL, NULL, NULL, 'AO', -8.975642, 13.1713841, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:10cbf9484f1dddafb0f5dac60f2508289267329323d256d4ac4a367b8841bf6b'),
('osm:node:2871349358', 'https://www.openstreetmap.org/node/2871349358', '{"provider":"openstreetmap","element":{"type":"node","id":2871349358,"lat":-12.3547139,"lon":13.5345591,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmácia Restinga","phone":"+244 272 226754"}}}'::jsonb, 'f0d8667ea8f7d3a2476b2a5d9c87363cdd1d806d5dadcab24b4787fc2344c545', 'Farmácia Restinga', 'farm cia restinga', NULL, NULL, NULL, NULL, NULL, 'AO', -12.3547139, 13.5345591, '+244 272 226754', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:71a44564955a697be4850674048c782390980ad15a875c30fec187c89ab398c7'),
('osm:node:8500321412', 'https://www.openstreetmap.org/node/8500321412', '{"provider":"openstreetmap","element":{"type":"node","id":8500321412,"lat":-14.9208561,"lon":13.4932296,"tags":{"addr:city":"Lubango","addr:street":"Rua Anibal de Melo","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia Rodrigues"}}}'::jsonb, '2c5b4e92fe37424b63c60a742a31b2b35dd36e5ed97a36fb3a628021119905e8', 'Farmácia Rodrigues', 'farm cia rodrigues', 'Rua Anibal de Melo', 'Rua Anibal de Melo, Lubango', 'Lubango', NULL, NULL, 'AO', -14.9208561, 13.4932296, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:23c055720cea9ed90872206eae5c538348e2f53d9bb8072142f99c7a641d37bf'),
('osm:node:8488852395', 'https://www.openstreetmap.org/node/8488852395', '{"provider":"openstreetmap","element":{"type":"node","id":8488852395,"lat":-14.8867676,"lon":13.52566,"tags":{"addr:street":"Pequena rua sem nomeaçao","amenity":"hospital","healthcare":"hospital","name":"Farmácia Roguel"}}}'::jsonb, '67872461da8bfdd3e4ca9b3900be91f099f261f9f7570eaa408b4647b836bbd9', 'Farmácia Roguel', 'farm cia roguel', 'Pequena rua sem nomeaçao', 'Pequena rua sem nomeaçao', NULL, NULL, NULL, 'AO', -14.8867676, 13.52566, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:8aaa1888b5ed0fa8070cd3443ca6126d7190bb81924b957081286be0d1bba151'),
('osm:node:4855309458', 'https://www.openstreetmap.org/node/4855309458', '{"provider":"openstreetmap","element":{"type":"node","id":4855309458,"lat":-8.8907349,"lon":13.2008849,"tags":{"addr:city":"Luanda","addr:street":"Avenida 21 de Janeiro","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmácia Rosa"}}}'::jsonb, '8ff0ce271a8e193ffce588bcc5838e6bfea62656a40adaa49f41a1cea5a903c9', 'Farmácia Rosa', 'farm cia rosa', 'Avenida 21 de Janeiro', 'Avenida 21 de Janeiro, Luanda', 'Luanda', NULL, NULL, 'AO', -8.8907349, 13.2008849, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:fa801274db3a322b05d4e0a3577d128ec38a388ce23d24fb25762411391c9321'),
('osm:node:3805919944', 'https://www.openstreetmap.org/node/3805919944', '{"provider":"openstreetmap","element":{"type":"node","id":3805919944,"lat":-8.9137627,"lon":13.2083528,"tags":{"addr:city":"Luanda","addr:street":"Rua do Instituto de Formação da Administração Local (IFAL)","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmácia Sabedoria","opening_hours":"24/7","phone":"+244 916 800 032"}}}'::jsonb, '1bf578dbaf4a7933ecdefc17e78d6d8f54649fe568b65efcb1b4463d6a236212', 'Farmácia Sabedoria', 'farm cia sabedoria', 'Rua do Instituto de Formação da Administração Local (IFAL)', 'Rua do Instituto de Formação da Administração Local (IFAL), Luanda', 'Luanda', NULL, NULL, 'AO', -8.9137627, 13.2083528, '+244 916 800 032', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:85ae4c9f4ddde94d43e3b37d2b9d7908261c361e699adc9147c0c38ad554bc66'),
('osm:node:3777467164', 'https://www.openstreetmap.org/node/3777467164', '{"provider":"openstreetmap","element":{"type":"node","id":3777467164,"lat":-8.9241003,"lon":13.1860734,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmácia Sagrada Esperança"}}}'::jsonb, '019e02fdec09d60064a5d14dd84eb32672aae1545fd97426010656775c4da8f1', 'Farmácia Sagrada Esperança', 'farm cia sagrada esperan a', NULL, NULL, NULL, NULL, NULL, 'AO', -8.9241003, 13.1860734, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:2e2ec33af83d37397a06c250340e9bcd7a3df7af349b31dafcb487f631822715'),
('osm:node:3055242469', 'https://www.openstreetmap.org/node/3055242469', '{"provider":"openstreetmap","element":{"type":"node","id":3055242469,"lat":-12.3546515,"lon":13.5493268,"tags":{"amenity":"pharmacy","name":"Farmácia SAGRADA FAMÍLIA"}}}'::jsonb, '4f2c30eaa7178dfe3117ceab4d5b6480d537a7201b8666cb8ef55f9edfff1598', 'Farmácia SAGRADA FAMÍLIA', 'farm cia sagrada fam lia', NULL, NULL, NULL, NULL, NULL, 'AO', -12.3546515, 13.5493268, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:1f9629ad370954c6cc1ec2d32ef47f4fc756f1df70a5a5fd349333bcba694740'),
('osm:node:5771170741', 'https://www.openstreetmap.org/node/5771170741', '{"provider":"openstreetmap","element":{"type":"node","id":5771170741,"lat":-8.8946499,"lon":13.2290125,"tags":{"addr:city":"Luanda","addr:street":"Avenida Pedro de C. Vandunem-Loy","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia Salutar"}}}'::jsonb, '85591210b1fe971fbdb3e5d8c1cc3ace0c5672ddc92a08a13c0586e5e0ec2bf0', 'Farmácia Salutar', 'farm cia salutar', 'Avenida Pedro de C. Vandunem-Loy', 'Avenida Pedro de C. Vandunem-Loy, Luanda', 'Luanda', NULL, NULL, 'AO', -8.8946499, 13.2290125, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:3c75aa8277d544e7ced8f5cb5efa14ff8d47e4c99ad5217047dbe75f578c8418'),
('osm:node:6136077513', 'https://www.openstreetmap.org/node/6136077513', '{"provider":"openstreetmap","element":{"type":"node","id":6136077513,"lat":-8.9084308,"lon":13.2414467,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia Samuel M Luanika"}}}'::jsonb, '5519374ee51d2a9ee0867ff9b2f81212cd26e612babe886ccd842474005f241b', 'Farmácia Samuel M Luanika', 'farm cia samuel m luanika', NULL, NULL, NULL, NULL, NULL, 'AO', -8.9084308, 13.2414467, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:16646f1d66765ad0e76080086f8464f678bbd7b39e83dad63e51aa70787194bd'),
('osm:node:6228755352', 'https://www.openstreetmap.org/node/6228755352', '{"provider":"openstreetmap","element":{"type":"node","id":6228755352,"lat":-8.929677,"lon":13.2096833,"tags":{"addr:housenumber":"330","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia Sango Pai","phone":"+244 949 486 846"}}}'::jsonb, '7e0ee113084d3832cc7953ebe12d343395735a06e24ce214e6ce825aba71778a', 'Farmácia Sango Pai', 'farm cia sango pai', '330', '330', NULL, NULL, NULL, 'AO', -8.929677, 13.2096833, '+244 949 486 846', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:427f9372e6cc5a1319fc471ffc3a2e3f9015581e0cbd9291d0175da16843e018'),
('osm:node:4555913691', 'https://www.openstreetmap.org/node/4555913691', '{"provider":"openstreetmap","element":{"type":"node","id":4555913691,"lat":-8.9364431,"lon":13.1615976,"tags":{"amenity":"pharmacy","name":"Farmácia Santa Esperança","name:pt":"Farmácia Santa Esperança"}}}'::jsonb, '522e70dca3d9fdef4e68db32b14c3af6ef4343765d4daa1248619f45cb445cf4', 'Farmácia Santa Esperança', 'farm cia santa esperan a', NULL, NULL, NULL, NULL, NULL, 'AO', -8.9364431, 13.1615976, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:3335a6c37dcdf472edcc64945cfd51374ed8ddab722eb2ef75f57462abc5f93f'),
('osm:node:8461900266', 'https://www.openstreetmap.org/node/8461900266', '{"provider":"openstreetmap","element":{"type":"node","id":8461900266,"lat":-17.0672726,"lon":15.7228812,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia Saúde para Todos, Lda"}}}'::jsonb, '72daacd79e62fbc1832f7d23902152930eba93f7a803476db233d9819dc89c8d', 'Farmácia Saúde para Todos, Lda', 'farm cia sa de para todos lda', NULL, NULL, NULL, NULL, NULL, 'AO', -17.0672726, 15.7228812, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:9f76c08051b1a1be06f868a75f897415aeb9eceb46352f264e03ea13e1bdf912'),
('osm:node:6231160281', 'https://www.openstreetmap.org/node/6231160281', '{"provider":"openstreetmap","element":{"type":"node","id":6231160281,"lat":-8.9303324,"lon":13.2089658,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia Shadai"}}}'::jsonb, 'cb1e4130ecf0ec441b9864a4fd7af883e69b3fb5f4d654e1775f590e25301850', 'Farmácia Shadai', 'farm cia shadai', NULL, NULL, NULL, NULL, NULL, 'AO', -8.9303324, 13.2089658, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:984bdad74d3c5cb677223a6c68fa12b0ec18141444e477b112927ed95db84fd6'),
('osm:node:4464949694', 'https://www.openstreetmap.org/node/4464949694', '{"provider":"openstreetmap","element":{"type":"node","id":4464949694,"lat":-8.9201921,"lon":13.2612345,"tags":{"amenity":"pharmacy","name":"Farmácia Simana"}}}'::jsonb, '5f6b3ba49130e7a13007df0ae8edc47d4b865a9b3c82332277914ecc50eca023', 'Farmácia Simana', 'farm cia simana', NULL, NULL, NULL, NULL, NULL, 'AO', -8.9201921, 13.2612345, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:ef7009d3698b25035473ee09050d7f551f1fc4571bc48f5d4b4fbe63b82784e0'),
('osm:way:420817749', 'https://www.openstreetmap.org/way/420817749', '{"provider":"openstreetmap","element":{"type":"way","id":420817749,"center":{"lat":-8.9201751,"lon":13.2612586},"tags":{"amenity":"pharmacy","building":"yes","name":"Farmácia Simena"}}}'::jsonb, 'ffc2a6db8ea657403fc4870739b7f3b343a5efcfc83c93a78bd0d0ffbb4b1195', 'Farmácia Simena', 'farm cia simena', NULL, NULL, NULL, NULL, NULL, 'AO', -8.9201751, 13.2612586, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:e99b5ce0b580a7bacfa26333860f8cde96c713748ab03222aa82ef7fed2220b0'),
('osm:node:6832644788', 'https://www.openstreetmap.org/node/6832644788', '{"provider":"openstreetmap","element":{"type":"node","id":6832644788,"lat":-8.8668632,"lon":13.2050244,"tags":{"addr:city":"Luanda","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia Slo Antunes"}}}'::jsonb, 'bb4b508c6cc213a54b1b2400b82664a16276a22cb1d959349fb5c1f321ef4032', 'Farmácia Slo Antunes', 'farm cia slo antunes', NULL, 'Luanda', 'Luanda', NULL, NULL, 'AO', -8.8668632, 13.2050244, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:62ea3076416f4edb024fea1ecc88c2805c6596f346f68a9e35508b6135261751'),
('osm:way:913608240', 'https://www.openstreetmap.org/way/913608240', '{"provider":"openstreetmap","element":{"type":"way","id":913608240,"center":{"lat":-14.8970283,"lon":13.5020204},"tags":{"addr:city":"Lubango","addr:housenumber":"Mitcha","amenity":"pharmacy","building":"yes","dispensing":"yes","healthcare":"pharmacy","operator":"Farmácia Soma"}}}'::jsonb, 'df82bb9bc58640c1243db158009c42812b3a52970a8cde98bb5739a4d45944e9', 'Farmácia Soma', 'farm cia soma', 'Mitcha', 'Mitcha, Lubango', 'Lubango', NULL, NULL, 'AO', -14.8970283, 13.5020204, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:322dc3a5ea673ad73beb2631a343506862626cf143081a6ff68e46081d2eea7f'),
('osm:node:4738111183', 'https://www.openstreetmap.org/node/4738111183', '{"provider":"openstreetmap","element":{"type":"node","id":4738111183,"lat":-8.8329331,"lon":13.2185521,"tags":{"addr:city":"Luanda","addr:street":"Rua da Samba","amenity":"pharmacy","name":"Farmácia Sousa","phone":"+244 923 537 871"}}}'::jsonb, 'e814427439c3cc18baa3c1fcbedb52e80a8464e787f6bb8885cdd600be24b317', 'Farmácia Sousa', 'farm cia sousa', 'Rua da Samba', 'Rua da Samba, Luanda', 'Luanda', NULL, NULL, 'AO', -8.8329331, 13.2185521, '+244 923 537 871', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:d71310faca6b5ae1f5f6f2ebe64431063488f98c502fc519d981ca9a2287cd2d'),
('osm:way:976732476', 'https://www.openstreetmap.org/way/976732476', '{"provider":"openstreetmap","element":{"type":"way","id":976732476,"center":{"lat":-12.3844047,"lon":16.9444593},"tags":{"amenity":"pharmacy","building":"commercial","healthcare":"pharmacy","name":"Farmácia Squina"}}}'::jsonb, '3fe5c406f81e939632e6933a18084c8902ca0f2574e19cf72975bfa1e8233108', 'Farmácia Squina', 'farm cia squina', NULL, NULL, NULL, NULL, NULL, 'AO', -12.3844047, 16.9444593, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:cddac5ef3e2293aae6a99088a039681fc404c3c57084bf3b175d24637e532984'),
('osm:node:6320279206', 'https://www.openstreetmap.org/node/6320279206', '{"provider":"openstreetmap","element":{"type":"node","id":6320279206,"lat":-8.969526,"lon":13.3799846,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia Suku Akuetche Prisca & Filhos"}}}'::jsonb, 'bb28c030fafcf7542cd4f114a9875eec06db78a92bffa6e64b3c135314c2c480', 'Farmácia Suku Akuetche Prisca & Filhos', 'farm cia suku akuetche prisca filhos', NULL, NULL, NULL, NULL, NULL, 'AO', -8.969526, 13.3799846, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:0d732fffbbba267cf4e8657150355939a68fbc42a7efe66361ea6e554551ea3d'),
('osm:node:8541546889', 'https://www.openstreetmap.org/node/8541546889', '{"provider":"openstreetmap","element":{"type":"node","id":8541546889,"lat":-14.9251093,"lon":13.4741377,"tags":{"addr:city":"Lubango","addr:street":"Avenida Senhora do Monte","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmácia Tchimbanda"}}}'::jsonb, 'feea71a92bdfb18fdffc44b1090467e269657b31eef7677df308383c8124218a', 'Farmácia Tchimbanda', 'farm cia tchimbanda', 'Avenida Senhora do Monte', 'Avenida Senhora do Monte, Lubango', 'Lubango', NULL, NULL, 'AO', -14.9251093, 13.4741377, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:1b05c47f6ba5efea5c9c199211082ac7262e3316b1a35f8165a976dc344870b8'),
('osm:way:1365289599', 'https://www.openstreetmap.org/way/1365289599', '{"provider":"openstreetmap","element":{"type":"way","id":1365289599,"center":{"lat":-14.913119,"lon":13.5010326},"tags":{"amenity":"pharmacy","building":"yes","healthcare":"pharmacy","name":"farmácia tchimbimja"}}}'::jsonb, 'd22dfe609671db086bbe4c145782b278534d135f4ba2396426f9a7b6cbd177eb', 'farmácia tchimbimja', 'farm cia tchimbimja', NULL, NULL, NULL, NULL, NULL, 'AO', -14.913119, 13.5010326, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:b7ab9307db446436de635fb4502f8eaabb1e88110f07a2fcc614693cf88ace8f'),
('osm:node:8704593918', 'https://www.openstreetmap.org/node/8704593918', '{"provider":"openstreetmap","element":{"type":"node","id":8704593918,"lat":-8.9180518,"lon":13.3748659,"tags":{"addr:street":"Farmácia Tchipulia","amenity":"pharmacy","name":"Farmácia Tchipuila"}}}'::jsonb, 'd847eb51c77f93f476c165a35cd3bbf558e4d5e67667d0a9043e6dcecfefaf60', 'Farmácia Tchipuila', 'farm cia tchipuila', 'Farmácia Tchipulia', 'Farmácia Tchipulia', NULL, NULL, NULL, 'AO', -8.9180518, 13.3748659, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:4f81d3012b300eb34f81afb4d26a265c2b48d35d7bd41fa33ef51015a1f8517f'),
('osm:node:8467836123', 'https://www.openstreetmap.org/node/8467836123', '{"provider":"openstreetmap","element":{"type":"node","id":8467836123,"lat":-15.2106981,"lon":12.1866749,"tags":{"addr:city":"Moçâmedes","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmacia Tchitata"}}}'::jsonb, 'b27bf22b6577585baebfaa153fd7a20ab84e7ba5c6196d65d510f0437921bc35', 'Farmacia Tchitata', 'farmacia tchitata', NULL, 'Moçâmedes', 'Moçâmedes', NULL, NULL, 'AO', -15.2106981, 12.1866749, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:2fc93a4a1b4a153741309a92dda2ca77fa6dcbd8a4cad80a9f7e8b61c344ccca');

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
