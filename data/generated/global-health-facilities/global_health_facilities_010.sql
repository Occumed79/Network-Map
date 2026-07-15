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
('osm:node:11922711916', 'https://www.openstreetmap.org/node/11922711916', '{"provider":"openstreetmap","element":{"type":"node","id":11922711916,"lat":41.3703974,"lon":19.7966795,"tags":{"addr:city":"Kamëz","addr:street":"Rruga Arjan Sala","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmacia Dajana"}}}'::jsonb, '375d9051a682d0f8e9c34b5243b9c9c95dca727f9c0b4973f02fcef1ffd47406', 'Farmacia Dajana', 'farmacia dajana', 'Rruga Arjan Sala', 'Rruga Arjan Sala, Kamëz', 'Kamëz', NULL, NULL, 'AL', 41.3703974, 19.7966795, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:c56fff39364f14e749fb8b1bc0ffa20e0f1f6ea061ebe4b570471184d1d4c478'),
('osm:node:6553860887', 'https://www.openstreetmap.org/node/6553860887', '{"provider":"openstreetmap","element":{"type":"node","id":6553860887,"lat":39.8745873,"lon":20.0022825,"tags":{"amenity":"pharmacy","name":"Farmacia Elona Cano","name:en":"Pharmacy Elona Cano","name:ru":"Аптека Elona Cano"}}}'::jsonb, '93f542bd69357ab3a13953db01d88c4def15571bdee749b8e028823722c56c9f', 'Farmacia Elona Cano', 'farmacia elona cano', NULL, NULL, NULL, NULL, NULL, 'AL', 39.8745873, 20.0022825, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:5facf7555e9faae0762e09d6529b4b626af3a6e46eff1b8611fe4d3bcd620023'),
('osm:node:5207005321', 'https://www.openstreetmap.org/node/5207005321', '{"provider":"openstreetmap","element":{"type":"node","id":5207005321,"lat":41.3069868,"lon":19.4905741,"tags":{"amenity":"pharmacy","name":"Farmacia Mishel"}}}'::jsonb, 'eff667c55079cb3352e19fe025ef2158ad81f12f42e32bd68825ebbaee92e0d3', 'Farmacia Mishel', 'farmacia mishel', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3069868, 19.4905741, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:74ccb85c9232a5491c8f2f3d78e8d9868beafbff1f73cbc74cfe26785eae01f7'),
('osm:node:6617479504', 'https://www.openstreetmap.org/node/6617479504', '{"provider":"openstreetmap","element":{"type":"node","id":6617479504,"lat":40.7284611,"lon":19.5595216,"tags":{"amenity":"pharmacy","name":"Farmacia Nr. 1","opening_hours":"Mo-Su 08:00-22:00","phone":"+355692151539","website":"https://farmacia-nr1.business.site/"}}}'::jsonb, 'da2151feea497bb303389105d48d21eb6d08006215f9d6205099a0742f5488b6', 'Farmacia Nr. 1', 'farmacia nr 1', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7284611, 19.5595216, '+355692151539', 'https://farmacia-nr1.business.site/', NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:72e5210818b5f508ededd8fefbd9c5ba8b703fac2618a5b0af7e949479a9975b'),
('osm:way:730026850', 'https://www.openstreetmap.org/way/730026850', '{"provider":"openstreetmap","element":{"type":"way","id":730026850,"center":{"lat":41.3317867,"lon":19.8299147},"tags":{"addr:street":"Rruga Hoxha Tahsin","amenity":"pharmacy","building":"yes","check_date":"2024-06-18","healthcare":"pharmacy","name":"Farmacia Panacea"}}}'::jsonb, '5250c95a140ccfb35914c5d316920403a6a933af2bd28ce1bf1a04d5aea74eb0', 'Farmacia Panacea', 'farmacia panacea', 'Rruga Hoxha Tahsin', 'Rruga Hoxha Tahsin', NULL, NULL, NULL, 'AL', 41.3317867, 19.8299147, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:be6f924c3db54207836f02116ec08544250dbd84083c0f792c6f7edbeba8b966'),
('osm:node:12468880519', 'https://www.openstreetmap.org/node/12468880519', '{"provider":"openstreetmap","element":{"type":"node","id":12468880519,"lat":41.1103556,"lon":20.0794603,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmacia qendrore"}}}'::jsonb, 'e48efa799d423dda5514a5bb4e9cdd5ad3628167a15a466c9681f3c70279bc5a', 'Farmacia qendrore', 'farmacia qendrore', NULL, NULL, NULL, NULL, NULL, 'AL', 41.1103556, 20.0794603, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:575009ff8719f86909eb904eecb87befbc0c8aefe12ead6deed593b3da9b849e'),
('osm:node:6864718461', 'https://www.openstreetmap.org/node/6864718461', '{"provider":"openstreetmap","element":{"type":"node","id":6864718461,"lat":41.3369641,"lon":19.8202425,"tags":{"addr:street":"Rruga Siri Kodra","amenity":"pharmacy","check_date":"2024-05-12","healthcare":"pharmacy","name":"Farmacia Qirko"}}}'::jsonb, '5479c1da7bfe9694216657c51ccb94f2cbc992e98506d2a00314bb8c7f6bcd10', 'Farmacia Qirko', 'farmacia qirko', 'Rruga Siri Kodra', 'Rruga Siri Kodra', NULL, NULL, NULL, 'AL', 41.3369641, 19.8202425, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:b6024282d341099499071b1490fd49607d88bdcb1756bf634809573250ba8933'),
('osm:node:10058780546', 'https://www.openstreetmap.org/node/10058780546', '{"provider":"openstreetmap","element":{"type":"node","id":10058780546,"lat":41.318633,"lon":19.8246814,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmacie Arena"}}}'::jsonb, '6180e94e041fbfee870d46b2359cdffe441480d5ad53aa6a61810b25baf504dd', 'Farmacie Arena', 'farmacie arena', NULL, NULL, NULL, NULL, NULL, 'AL', 41.318633, 19.8246814, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:c23dea25e522c110ab737d00313ddb3ed54251edced685e78f5fa7f8c285dcd3'),
('osm:node:13393253330', 'https://www.openstreetmap.org/node/13393253330', '{"provider":"openstreetmap","element":{"type":"node","id":13393253330,"lat":41.7804307,"lon":19.6407639,"tags":{"amenity":"pharmacy","name":"FarmaNet"}}}'::jsonb, '32b855b9760e7129b346f288e626bdd06e1232c60b1073252a6edcd664e405df', 'FarmaNet', 'farmanet', NULL, NULL, NULL, NULL, NULL, 'AL', 41.7804307, 19.6407639, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:8f77ccecd1271ff794ee0bf50794c95e79df967faed6abad02f5c8b26a7707fa'),
('osm:node:6841119530', 'https://www.openstreetmap.org/node/6841119530', '{"provider":"openstreetmap","element":{"type":"node","id":6841119530,"lat":41.31406,"lon":19.7681536,"tags":{"addr:city":"Tirana","addr:street":"Rruga Llazi Miho","amenity":"pharmacy","healthcare":"pharmacy","name":"FarmaNet"}}}'::jsonb, '26fff6af9da0a2c9c1cdf500a9889f31255cb5e23fa657b8f39d2c35cd6baf39', 'FarmaNet', 'farmanet', 'Rruga Llazi Miho', 'Rruga Llazi Miho, Tirana', 'Tirana', NULL, NULL, 'AL', 41.31406, 19.7681536, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:20ca4e85af404a667179ea98fb36c15560023061477c01522d242b46d2f1e7f5'),
('osm:node:6841226806', 'https://www.openstreetmap.org/node/6841226806', '{"provider":"openstreetmap","element":{"type":"node","id":6841226806,"lat":41.3277726,"lon":19.8105437,"tags":{"addr:street":"Rruga e Kavajës","amenity":"pharmacy","healthcare":"pharmacy","name":"FarmaNet"}}}'::jsonb, '770fd910c5e2ad1d3c07266139d61fb459a336fabb56923cabd5cefecbd537ec', 'FarmaNet', 'farmanet', 'Rruga e Kavajës', 'Rruga e Kavajës', NULL, NULL, NULL, 'AL', 41.3277726, 19.8105437, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:ff199318c5e4d0d3898036e59df4c5690574fb65a5e241ca870592bc3286e46d'),
('osm:node:7783418504', 'https://www.openstreetmap.org/node/7783418504', '{"provider":"openstreetmap","element":{"type":"node","id":7783418504,"lat":41.3361301,"lon":19.8179524,"tags":{"addr:city":"Tirana","addr:street":"Rruga Reshit Petrela","amenity":"pharmacy","check_date":"2024-05-12","dispensing":"yes","healthcare":"pharmacy","name":"FarmaNet"}}}'::jsonb, '2c683532f75b8e63cd7a16b8cee82df99c16bfc80d71963a9f58a8b6277f8509', 'FarmaNet', 'farmanet', 'Rruga Reshit Petrela', 'Rruga Reshit Petrela, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3361301, 19.8179524, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:c4666773f0e8b0a1e67e4a1d2c7e41d56fbe6007a116fc8d4a00325e54d92500'),
('osm:node:9124939918', 'https://www.openstreetmap.org/node/9124939918', '{"provider":"openstreetmap","element":{"type":"node","id":9124939918,"lat":41.3190831,"lon":19.816623,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"FarmaNet"}}}'::jsonb, '3aea2f51fdb2ed2a9124e9915059a2ca4c4328dea69e6af4c8230cfe41beee56', 'FarmaNet', 'farmanet', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3190831, 19.816623, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:7a90a0d1abb790bd5bd1fda982e2b0957b6a2a275d6bc0829e77aead51504405'),
('osm:node:9544032262', 'https://www.openstreetmap.org/node/9544032262', '{"provider":"openstreetmap","element":{"type":"node","id":9544032262,"lat":41.3348968,"lon":19.8240051,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"FarmaNet"}}}'::jsonb, '2c59a2fee8c41793e1047f3a99cc3a8c28edc75c96e8163b7f8dc6b5cb3b0216', 'FarmaNet', 'farmanet', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3348968, 19.8240051, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:b69123d23f06f72bbdf1b10fea267bff4935312a4d9ae6073943e8b2b2c918dc'),
('osm:node:13087616999', 'https://www.openstreetmap.org/node/13087616999', '{"provider":"openstreetmap","element":{"type":"node","id":13087616999,"lat":41.3397137,"lon":19.8425302,"tags":{"amenity":"pharmacy","name":"FarmaPlus"}}}'::jsonb, '69edd3442eb006724f1ffa748d016c5f5644fe27bdb7be9194a5e33f20f2dffd', 'FarmaPlus', 'farmaplus', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3397137, 19.8425302, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:0a327fea14f74551cc13f1fbf678fcc93564041ab8105a2964325c8ec7815908'),
('osm:node:6621087865', 'https://www.openstreetmap.org/node/6621087865', '{"provider":"openstreetmap","element":{"type":"node","id":6621087865,"lat":40.7225769,"lon":19.5566301,"tags":{"amenity":"pharmacy","name":"Farmavita"}}}'::jsonb, '068a96686f5f5aa887933c84452e624ef90f66aba94f041d82ffda3e3b7d6434', 'Farmavita', 'farmavita', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7225769, 19.5566301, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:97feba65f788124c08d6ee1037ff3896646e8a8a93bd853e8ac4e7419f16e2a6'),
('osm:node:6853606407', 'https://www.openstreetmap.org/node/6853606407', '{"provider":"openstreetmap","element":{"type":"node","id":6853606407,"lat":40.7274627,"lon":19.5583409,"tags":{"amenity":"pharmacy","name":"FarmaVita"}}}'::jsonb, '7d8533fed5c143de7bc27d8c79e2294d6593ef811d6e865de4e8c74743836c83', 'FarmaVita', 'farmavita', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7274627, 19.5583409, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:8400f81656688270bc4b3bc0801cd5d34ca36b25cfc89c879c8ffeb04b2b65e1'),
('osm:node:12954794831', 'https://www.openstreetmap.org/node/12954794831', '{"provider":"openstreetmap","element":{"type":"node","id":12954794831,"lat":40.6175905,"lon":20.7818599,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmavitta","wheelchair":"no"}}}'::jsonb, '30acae26778c12be9f9299d6eb6ec814c6ac726b59e645ccab76b528b99612ee', 'Farmavitta', 'farmavitta', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6175905, 20.7818599, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:f9473fdbbfde195895fa13914a33fb5f4f7f56307b61e3d1396805db8478f93b'),
('osm:node:6838686654', 'https://www.openstreetmap.org/node/6838686654', '{"provider":"openstreetmap","element":{"type":"node","id":6838686654,"lat":41.3334356,"lon":19.8334546,"tags":{"addr:street":"Rruga Arkitekt Kasemi","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmavitta","shop":"clothes"}}}'::jsonb, 'eef4b1eb46238af1f54a7d891991bf0428bbbce1ffbf9ca624f0ea72df9f9cba', 'Farmavitta', 'farmavitta', 'Rruga Arkitekt Kasemi', 'Rruga Arkitekt Kasemi', NULL, NULL, NULL, 'AL', 41.3334356, 19.8334546, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:8a785bc425a933b6fdbd7e93d4ac7abf4abf6887dae5a1ff860ed8b7c455d109'),
('osm:node:9865919172', 'https://www.openstreetmap.org/node/9865919172', '{"provider":"openstreetmap","element":{"type":"node","id":9865919172,"lat":40.6182802,"lon":20.7767691,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmavitta","wheelchair":"no"}}}'::jsonb, 'b03c5036052a708c00a66faf8d1cf2a7b53c60ab28b85a61f9b6839544851a7d', 'Farmavitta', 'farmavitta', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6182802, 20.7767691, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:e0f781c37b8b4e6521a5d146af7a5b71f13cfb9b372733dd64a376d7a47e7a04'),
('osm:node:6828026712', 'https://www.openstreetmap.org/node/6828026712', '{"provider":"openstreetmap","element":{"type":"node","id":6828026712,"lat":41.1875744,"lon":19.5581987,"tags":{"addr:street":"Shëtitorja Josif Budo","amenity":"pharmacy","name":"FarmaVitta"}}}'::jsonb, '931a6ee9542cb8bdfbb865626b783fa2b4122608a09e386970730f9dd0a849b5', 'FarmaVitta', 'farmavitta', 'Shëtitorja Josif Budo', 'Shëtitorja Josif Budo', NULL, NULL, NULL, 'AL', 41.1875744, 19.5581987, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:60f74c0247f53fd87c14ef0d402867cb196a9243859100d041ba11b2fd51eb2d'),
('osm:node:6845190794', 'https://www.openstreetmap.org/node/6845190794', '{"provider":"openstreetmap","element":{"type":"node","id":6845190794,"lat":41.1852929,"lon":19.5579875,"tags":{"addr:street":"Jurgen Trade","amenity":"pharmacy","name":"FarmaVitta"}}}'::jsonb, '4ecce31f274c75f7a42b714503f4015936e1a0d113c300ca6336a7265939c3c6', 'FarmaVitta', 'farmavitta', 'Jurgen Trade', 'Jurgen Trade', NULL, NULL, NULL, 'AL', 41.1852929, 19.5579875, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:e8d008a51d5b544fca575c731632cc835af53d1e417264186ce20607d615f8bf'),
('osm:node:9060921406', 'https://www.openstreetmap.org/node/9060921406', '{"provider":"openstreetmap","element":{"type":"node","id":9060921406,"lat":40.9435335,"lon":19.7047719,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"FarmaVitta"}}}'::jsonb, '80b2b6535eb5ba6fccc50374f607d67585be4dff61a1e030fc50a5c3473af847', 'FarmaVitta', 'farmavitta', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9435335, 19.7047719, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:903de9357ed7e622b8052606ff8079c11db24994ef10322d420f6d4d92b50d0e'),
('osm:node:5568374504', 'https://www.openstreetmap.org/node/5568374504', '{"provider":"openstreetmap","element":{"type":"node","id":5568374504,"lat":41.3090959,"lon":19.4866882,"tags":{"amenity":"pharmacy","name":"Farmci Elda"}}}'::jsonb, '2c27afc9aedaf129df6c2d53d0f3e90a4df89968299cbc9a5c84687e71f4d69f', 'Farmci Elda', 'farmci elda', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3090959, 19.4866882, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:5835f5514729312b155ccd82488ed2cbaaca2d35a3b88b63aca34b1e6332ffed'),
('osm:node:8777647019', 'https://www.openstreetmap.org/node/8777647019', '{"provider":"openstreetmap","element":{"type":"node","id":8777647019,"lat":41.3451341,"lon":19.8252667,"tags":{"amenity":"dentist","facebook":"https://m.facebook.com/finesadentalclinic/","healthcare":"dentist","name":"Finesa Dental Clinic","opening_hours":"Mo-Sa 09:00-19:00","phone":"+355 689030333","website":"https://finesa-dental-clinic.business.site"}}}'::jsonb, '1c8d38095c25cc32cb31722ce81da898376cae27a131a44465981050264e472c', 'Finesa Dental Clinic', 'finesa dental clinic', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3451341, 19.8252667, '+355 689030333', 'https://finesa-dental-clinic.business.site', NULL, 'dental', ARRAY['dental', 'general_practitioner']::text[], 0.78, 'loc:d4edf2a36402f390d837e392d858f0fdfd7292471c7038d4ce904c9d5341f2d5'),
('osm:node:11352535884', 'https://www.openstreetmap.org/node/11352535884', '{"provider":"openstreetmap","element":{"type":"node","id":11352535884,"lat":40.4607638,"lon":19.4874239,"tags":{"amenity":"dentist","contact:instagram":"https://www.instagram.com/firenze_dental_vlore/","healthcare":"dentist","name":"Firenze Dental","opening_hours":"Mo-Sa 09:00-19:00","phone":"+355 69 87 14 569","website":"https://firenzedental.al"}}}'::jsonb, 'a4287f7af2977861f3450006ff99021dd4e155d3211d0469748a7113528a9081', 'Firenze Dental', 'firenze dental', NULL, NULL, NULL, NULL, NULL, 'AL', 40.4607638, 19.4874239, '+355 69 87 14 569', 'https://firenzedental.al', NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:9cc1aa659569e516d482a39e94c3b3dacb296d8d6f7b294068e3920e5ee6f6e3'),
('osm:node:4525169889', 'https://www.openstreetmap.org/node/4525169889', '{"provider":"openstreetmap","element":{"type":"node","id":4525169889,"lat":41.3314017,"lon":19.8201747,"tags":{"addr:street":"Rruga e Barrikadave","amenity":"clinic","email":"info@fisiomedal.com","healthcare":"clinic","name":"Fisiomed","name:en":"Fisiomed","name:sq":"Fisiomed","opening_hours":"Mo-Fr 14:00-21:00; Sa 09:00-14:00","phone":"+355 69 205 3330","website":"http://www.fisiomedal.com/"}}}'::jsonb, 'ac9567ee97900e5241b7bde8fdbd4f2340d5944fe88b4aace56ca16c60832b00', 'Fisiomed', 'fisiomed', 'Rruga e Barrikadave', 'Rruga e Barrikadave', NULL, NULL, NULL, 'AL', 41.3314017, 19.8201747, '+355 69 205 3330', 'http://www.fisiomedal.com/', 'info@fisiomedal.com', 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:3b9c8906534a946e889399ee331124e44b43e0c2a0716cbc1f65bf1f5ef5bd4b'),
('osm:node:13113038564', 'https://www.openstreetmap.org/node/13113038564', '{"provider":"openstreetmap","element":{"type":"node","id":13113038564,"lat":41.33121,"lon":19.8297216,"tags":{"healthcare":"physiotherapist","name":"Fizio Run"}}}'::jsonb, '075c67b35e23065ea87f3c34989c4bcaa358100e2b877db320d2724ca3b3dcda', 'Fizio Run', 'fizio run', NULL, NULL, NULL, NULL, NULL, 'AL', 41.33121, 19.8297216, NULL, NULL, NULL, 'unknown', ARRAY['unknown']::text[], 0.78, 'loc:558f70614f072ddb65ce106624b9aa9fe08e8b76cba6fa928ff916f628d59a0d'),
('osm:node:3387400128', 'https://www.openstreetmap.org/node/3387400128', '{"provider":"openstreetmap","element":{"type":"node","id":3387400128,"lat":42.0737183,"lon":19.523797,"tags":{"healthcare":"physiotherapist","name":"Fizioterapia","wheelchair":"limited"}}}'::jsonb, 'daaf13a846b65955e355ccd8e40921ac72322f4e50f352b6b653f462f97cde43', 'Fizioterapia', 'fizioterapia', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0737183, 19.523797, NULL, NULL, NULL, 'unknown', ARRAY['unknown']::text[], 0.78, 'loc:bb1f96a456804927746e63ece1ed720b312df1c4f7d866e90ffc1710060464a8'),
('osm:way:352902865', 'https://www.openstreetmap.org/way/352902865', '{"provider":"openstreetmap","element":{"type":"way","id":352902865,"center":{"lat":41.8670924,"lon":19.6508686},"tags":{"addr:housenumber":"16","addr:street":"Blerimi","amenity":"clinic","building":"yes","healthcare":"clinic","name":"Fizioterapia"}}}'::jsonb, '63fa0df3e98fd9c71048bba047d4df06ebea85a109e35f391a39180e32d1301a', 'Fizioterapia', 'fizioterapia', '16 Blerimi', '16 Blerimi', NULL, NULL, NULL, 'AL', 41.8670924, 19.6508686, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:789e9b207770568ad4cfa3eea90782dc817d600c6a0e5b88fe71dbd3988fc7ba'),
('osm:node:11076187090', 'https://www.openstreetmap.org/node/11076187090', '{"provider":"openstreetmap","element":{"type":"node","id":11076187090,"lat":41.3319755,"lon":19.8048872,"tags":{"addr:city":"Tirana","addr:housenumber":"77","addr:street":"Rruga e Durrësit","amenity":"dentist","healthcare":"dentist","name":"Flavina Vata"}}}'::jsonb, '4c077ec885fca16bb476db9314e672b3b8dadd9560dda8502b1cd76bdda9e57b', 'Flavina Vata', 'flavina vata', '77 Rruga e Durrësit', '77 Rruga e Durrësit, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3319755, 19.8048872, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:d35cef2ed0ec0b65b7fafb5e305c5ebdf25764154bf6f3654c3395a431a69b2b'),
('osm:node:9035570368', 'https://www.openstreetmap.org/node/9035570368', '{"provider":"openstreetmap","element":{"type":"node","id":9035570368,"lat":42.3563092,"lon":20.0753464,"tags":{"healthcare":"physiotherapist","name":"Flori"}}}'::jsonb, 'c1c75846b99e40220ff31193a7e5d5f636f0a99255cd67d0539c8a257eed5fb4', 'Flori', 'flori', NULL, NULL, NULL, NULL, NULL, 'AL', 42.3563092, 20.0753464, NULL, NULL, NULL, 'unknown', ARRAY['unknown']::text[], 0.78, 'loc:c7dfe0c962cd996dda447b0bdc62495178e7b5e2350368098154a3679b76f6e0'),
('osm:node:11343259170', 'https://www.openstreetmap.org/node/11343259170', '{"provider":"openstreetmap","element":{"type":"node","id":11343259170,"lat":41.3351829,"lon":19.8167512,"tags":{"addr:city":"Tirana","addr:street":"Bulevardi Zogu i Parë","amenity":"pharmacy","drive_through":"no","healthcare":"pharmacy","name":"Flori Farma","opening_hours":"Mo-Su 08:00-21:00"}}}'::jsonb, '1a575251143accb4716b6c6adf7004259196631eedaf0a10a9b5c4bb53b634ed', 'Flori Farma', 'flori farma', 'Bulevardi Zogu i Parë', 'Bulevardi Zogu i Parë, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3351829, 19.8167512, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:91f5e32c42dc7c40a074b71f42db50a0db451205c749a695818fe47ca7a234bb'),
('osm:node:6442256745', 'https://www.openstreetmap.org/node/6442256745', '{"provider":"openstreetmap","element":{"type":"node","id":6442256745,"lat":41.3302258,"lon":19.821406,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","internet_access":"no","name":"Florifarma","toilets:wheelchair":"no"}}}'::jsonb, '90e99ca2aa075e6807f68ca149ddda5c6621796c6c2b4d0ee7279210f78b3a3d', 'Florifarma', 'florifarma', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3302258, 19.821406, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:56d393884aa3d9b2b7d497f6f886da80ab49d4aeb945bc9ee22eb44f4c657776'),
('osm:node:12959375662', 'https://www.openstreetmap.org/node/12959375662', '{"provider":"openstreetmap","element":{"type":"node","id":12959375662,"lat":41.6097564,"lon":20.0167924,"tags":{"healthcare":"centre","name":"Fondacioni Oaz"}}}'::jsonb, 'b3b7eb967f4e6b792362ba05f7eb9b90af668da24001eb958f73d9daef24b290', 'Fondacioni Oaz', 'fondacioni oaz', NULL, NULL, NULL, NULL, NULL, 'AL', 41.6097564, 20.0167924, NULL, NULL, NULL, 'unknown', ARRAY['unknown']::text[], 0.78, 'loc:437927965999a8db81f4f692658149bfbddfe5e35f0947bd74d74badc61328f7'),
('osm:node:6841113814', 'https://www.openstreetmap.org/node/6841113814', '{"provider":"openstreetmap","element":{"type":"node","id":6841113814,"lat":41.3338983,"lon":19.82337,"tags":{"addr:street":"Rruga e Dibrës","amenity":"pharmacy","healthcare":"pharmacy","name":"Framaci Lezha"}}}'::jsonb, 'a8f2619754d26e18404ec26e0f5025bbd4cdfde69b901906261ad3723d66bfde', 'Framaci Lezha', 'framaci lezha', 'Rruga e Dibrës', 'Rruga e Dibrës', NULL, NULL, NULL, 'AL', 41.3338983, 19.82337, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:9d16d76590046fc7e70175dd8d1791a830b5fcbea4647fd5b42c3d99ef1948a8'),
('osm:node:12453582708', 'https://www.openstreetmap.org/node/12453582708', '{"provider":"openstreetmap","element":{"type":"node","id":12453582708,"lat":41.1243652,"lon":20.0814146,"tags":{"healthcare":"laboratory","name":"Franc","opening_hours":"8.00 - 16.00","phone":"069 46 48 947"}}}'::jsonb, 'af9906355f7b9d14d111f5162db57d2ee57c32d280303473854b976f5cabcf9f', 'Franc', 'franc', NULL, NULL, NULL, NULL, NULL, 'AL', 41.1243652, 20.0814146, '069 46 48 947', NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:fcfe3da77d63b205ea65dcc8091ea83a7f30001b46a3a459f85f8c14db2389e2'),
('osm:node:9945148783', 'https://www.openstreetmap.org/node/9945148783', '{"provider":"openstreetmap","element":{"type":"node","id":9945148783,"lat":40.0799619,"lon":20.1381573,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"G.S.V"}}}'::jsonb, '041a381f1684db48c60516512a6e336933f130c5a1fa0539acd64d88e724feff', 'G.S.V', 'g s v', NULL, NULL, NULL, NULL, NULL, 'AL', 40.0799619, 20.1381573, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:c1cc6360079509035c435008a7eeb17a187d6380932f65ab26fa5b16b30e0cd9'),
('osm:node:6823736096', 'https://www.openstreetmap.org/node/6823736096', '{"provider":"openstreetmap","element":{"type":"node","id":6823736096,"lat":41.3223148,"lon":19.4667247,"tags":{"addr:street":"Rruga Adem Jashari","amenity":"dentist","healthcare":"dentist","name":"Gajo''s"}}}'::jsonb, 'cd6f5605a4359bb9dd1682d214ed3a1ae9aed67a6fd14987d6fe9c165c8127f7', 'Gajo''s', 'gajo s', 'Rruga Adem Jashari', 'Rruga Adem Jashari', NULL, NULL, NULL, 'AL', 41.3223148, 19.4667247, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:c4f37844b7e0792a8852b7be5e22c62047b6ab3989bce0a3bbe474f5f2f5e7dc'),
('osm:node:4579869249', 'https://www.openstreetmap.org/node/4579869249', '{"provider":"openstreetmap","element":{"type":"node","id":4579869249,"lat":41.3402535,"lon":19.8338753,"tags":{"amenity":"clinic","healthcare":"clinic","healthcare:speciality":"gastroenterology","name":"Gastroentero-Hepatologjia","website":"https://www.qsut.gov.al/index.php/sherbimet-mjekesore/sherbimi-i-pediatrise-nr-2/sherbimet-e-ofruara/"}}}'::jsonb, '0b2ae63cada5340a6c9c9d556b9367b17fa08954df833a7a211b8fa66afb7997', 'Gastroentero-Hepatologjia', 'gastroentero hepatologjia', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3402535, 19.8338753, NULL, 'https://www.qsut.gov.al/index.php/sherbimet-mjekesore/sherbimi-i-pediatrise-nr-2/sherbimet-e-ofruara/', NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:c79297c5f1e48686a65188e29da1ea9546c3441c9943c1493b846fc678f210f2'),
('osm:node:3923474977', 'https://www.openstreetmap.org/node/3923474977', '{"provider":"openstreetmap","element":{"type":"node","id":3923474977,"lat":42.0663264,"lon":19.5151029,"tags":{"addr:city":"Shkoder","addr:country":"AL","addr:postcode":"4001","amenity":"pharmacy","dispensing":"yes","name":"Geci","source":"bing;survey;gps","source_ref:url":"https://www.flickr.com/photos/134902422@N04/map?&fLat=41.9559&fLon=19.4337&zl=11&order_by=recent"}}}'::jsonb, 'c235f17b7967f8076de6662363177b0d266caf5bdc3316083be485fd7f389831', 'Geci', 'geci', NULL, 'Shkoder, 4001', 'Shkoder', NULL, '4001', 'AL', 42.0663264, 19.5151029, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:ac2b718b0ef605d834ba1bc4880a266bc86649ffd98afa70af270b041ef9ad70'),
('osm:node:3367268010', 'https://www.openstreetmap.org/node/3367268010', '{"provider":"openstreetmap","element":{"type":"node","id":3367268010,"lat":42.06598,"lon":19.5183283,"tags":{"amenity":"dentist","name":"Gera Dental","source":"bing;survey;gps","source_ref:url":"https://www.flickr.com/photos/134902422@N04/map?&fLat=41.9559&fLon=19.4337&zl=11&order_by=recent"}}}'::jsonb, 'e4eebbc851e96915d1109a45ed42d5b01fe870c843bf4ad1f0637d3f1702cc4c', 'Gera Dental', 'gera dental', NULL, NULL, NULL, NULL, NULL, 'AL', 42.06598, 19.5183283, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:51df142fbf84ebbdfd02e7bd4e6649c62ca1ef7d08f220f0e3f3f429da4ba808'),
('osm:node:3615628102', 'https://www.openstreetmap.org/node/3615628102', '{"provider":"openstreetmap","element":{"type":"node","id":3615628102,"lat":41.1213173,"lon":20.083761,"tags":{"addr:city":"Elbasan","amenity":"pharmacy","healthcare":"pharmacy","name":"German Farmacy","opening_hours":"Mo-Su 08:00-21:30","phone":"003550693556278"}}}'::jsonb, 'ea4e641f7e017c4637bf542cea2f5f16910552f7639331d40f6ab68a2e496dac', 'German Farmacy', 'german farmacy', NULL, 'Elbasan', 'Elbasan', NULL, NULL, 'AL', 41.1213173, 20.083761, '003550693556278', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:92db0bcea1b85a2c0ef8d8084ccfd8f39674d08f1d88237775298739577be106'),
('osm:node:9153949116', 'https://www.openstreetmap.org/node/9153949116', '{"provider":"openstreetmap","element":{"type":"node","id":9153949116,"lat":41.1112885,"lon":20.0825422,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"German Pharmacy"}}}'::jsonb, '20d32b97176ed9b22f06f160beea3ebd04da195410071b95dfa0cc927c8421c6', 'German Pharmacy', 'german pharmacy', NULL, NULL, NULL, NULL, NULL, 'AL', 41.1112885, 20.0825422, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:48d2495d8350cfe7e52271524010d6ce9b8d8ddc2b412bf14fbd526f21d82ffd'),
('osm:node:4394721601', 'https://www.openstreetmap.org/node/4394721601', '{"provider":"openstreetmap","element":{"type":"node","id":4394721601,"lat":40.9012616,"lon":20.6548279,"tags":{"amenity":"pharmacy","name":"Gj. Maçolli"}}}'::jsonb, 'ba0dec39724b5adb21cdae17c444071c80bc43c44302758d5e8c9ad363c1dd3a', 'Gj. Maçolli', 'gj ma olli', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9012616, 20.6548279, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:e20d71375d5a6f374e3569e34d927f40f79817c99ea61093db717f6ebde6e6ba'),
('osm:node:3997174620', 'https://www.openstreetmap.org/node/3997174620', '{"provider":"openstreetmap","element":{"type":"node","id":3997174620,"lat":42.0620729,"lon":19.520095,"tags":{"addr:country":"AL","amenity":"pharmacy","dispensing":"yes","name":"Gjonej","payment:coins":"yes","payment:credit_cards":"no","payment:cryptocurrencies":"no","payment:debit_cards":"no","payment:electronic_purses":"no","payment:notes":"yes","smoking":"outside","source":"bing;survey;gps","source_ref:url":"https://www.flickr.com/photos/134902422@N04/map?&fLat=41.9559&fLon=19.4337&zl=11&order_by=recent","wheelchair":"yes"}}}'::jsonb, 'a1731b9c009c06c6605aa31c594b615a235c44f60aceb002fc8cb63a1386b666', 'Gjonej', 'gjonej', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0620729, 19.520095, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:b7f7494b893514fa9a6ee76b2dcc6eb0eddb0165a6823ea02a907d2dbd2029e3'),
('osm:node:12124000701', 'https://www.openstreetmap.org/node/12124000701', '{"provider":"openstreetmap","element":{"type":"node","id":12124000701,"lat":41.3345272,"lon":19.8357782,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Gledis","outdoor_seating":"no"}}}'::jsonb, '861984cf80bbe2f1d7861931a73eb8a3491e76a85e15b129a2ab35cab8bc96a3', 'Gledis', 'gledis', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3345272, 19.8357782, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:b3fcea71f18b0a9889a7b40c9be3879bc767daf07d9b5279e34274af74b5e949'),
('osm:node:7794886536', 'https://www.openstreetmap.org/node/7794886536', '{"provider":"openstreetmap","element":{"type":"node","id":7794886536,"lat":41.335286,"lon":19.8196578,"tags":{"addr:city":"Tirana","addr:country":"AL","addr:street":"Rruga Mahmut Fortuzi","amenity":"dentist","healthcare":"dentist","name":"Globe"}}}'::jsonb, '86bdcb79bf59eb7cc57450d72b986d423129e3aa943beac31d6596407f063696', 'Globe', 'globe', 'Rruga Mahmut Fortuzi', 'Rruga Mahmut Fortuzi, Tirana', 'Tirana', NULL, NULL, 'AL', 41.335286, 19.8196578, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:ab4302e329659dbb59d33f71557579bfd28664c6e746d985fc069907d5f75e5d'),
('osm:node:6419399930', 'https://www.openstreetmap.org/node/6419399930', '{"provider":"openstreetmap","element":{"type":"node","id":6419399930,"lat":40.6268848,"lon":20.7781714,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Gloria","wheelchair":"no"}}}'::jsonb, 'f2c36573e95fff027028af2d61bc22102e0e771a6c6b473f36f3f10711361f57', 'Gloria', 'gloria', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6268848, 20.7781714, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:ebae6179644d6426864d593c36eb614a253bf9c42b81502e3ff3c02ca8c45545'),
('osm:node:11914272884', 'https://www.openstreetmap.org/node/11914272884', '{"provider":"openstreetmap","element":{"type":"node","id":11914272884,"lat":41.3369045,"lon":19.8319543,"tags":{"addr:city":"Tirana","addr:street":"Rruga Bardhyl","amenity":"dentist","healthcare":"dentist","name":"Goga Dental Clinic"}}}'::jsonb, '58904c989f4354032baa466ef4ce3ca3a901b3d7ca6f037ca83e5746339f238b', 'Goga Dental Clinic', 'goga dental clinic', 'Rruga Bardhyl', 'Rruga Bardhyl, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3369045, 19.8319543, NULL, NULL, NULL, 'dental', ARRAY['dental', 'general_practitioner']::text[], 0.86, 'loc:8b57d950f7d82a1c0f135fc5363b22f289f3f3bc66fcf0425067e5e100807f8a');

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
