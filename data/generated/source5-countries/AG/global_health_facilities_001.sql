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
('osm:way:347984242', 'https://www.openstreetmap.org/way/347984242', '{"provider":"openstreetmap","element":{"type":"way","id":347984242,"center":{"lat":17.1360248,"lon":-61.8464678},"tags":{"amenity":"hospital","building":"yes","emergency":"yes","healthcare":"hospital","name":"Adelin Medical Centre","source":"KG Ground Survey 2016"}}}'::jsonb, 'ec595c0b9a05b3f5ea6e14a3d37ec7d6369b532416586bebf9e591e28d5ae88c', 'Adelin Medical Centre', 'adelin medical centre', NULL, NULL, NULL, NULL, NULL, 'AG', 17.1360248, -61.8464678, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:2d16dc5e6369621ca4d2d1ac8736bfe83e75bea15bbafd4802b4641fc3fe4293'),
('osm:node:4579524989', 'https://www.openstreetmap.org/node/4579524989', '{"provider":"openstreetmap","element":{"type":"node","id":4579524989,"lat":17.1216942,"lon":-61.8421381,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Aids Secretariat","name:en":"Aids Secretariat"}}}'::jsonb, 'af3e79d2ab289b4c6ba9b15417b127f772657df4a97936d17673686f86c7f081', 'Aids Secretariat', 'aids secretariat', NULL, NULL, NULL, NULL, NULL, 'AG', 17.1216942, -61.8421381, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:eaf3fbf90c8ed1be8f4d8c30fd50a1d1a88dda5b778ba5f23e7245f28412020f'),
('osm:node:1578369238', 'https://www.openstreetmap.org/node/1578369238', '{"provider":"openstreetmap","element":{"type":"node","id":1578369238,"lat":17.1194598,"lon":-61.8441165,"tags":{"email":"info@biohealthlab.net","fax":"+1-268-462-2657","health_facility:type":"laboratory","healthcare":"laboratory","medical_system:western":"yes","name":"Biohealth Medical Laboratory","opening_hours":"Mo-Fr 07:30-16:00; Sa 08:00-12:00","operator":"Richard Hadeed & Maria Laura Martin-Hadeed","phone":"+1-268-562-3738","website":"http://www.biohealthlab.net/"}}}'::jsonb, '752f3429933a2ce01753fbda9c50537c12d7c2d8ba7ac30afcd1a7652ec8a80d', 'Biohealth Medical Laboratory', 'biohealth medical laboratory', NULL, NULL, NULL, NULL, NULL, 'AG', 17.1194598, -61.8441165, '+1-268-562-3738', 'http://www.biohealthlab.net/', 'info@biohealthlab.net', 'lab', ARRAY['lab']::text[], 0.78, 'loc:973691e30ce5b8aa399e5edd173cfdb05cbbf01c07a0171e776684ae3025ea05'),
('osm:way:53513149', 'https://www.openstreetmap.org/way/53513149', '{"provider":"openstreetmap","element":{"type":"way","id":53513149,"center":{"lat":17.1215581,"lon":-61.8421467},"tags":{"amenity":"pharmacy","building":"yes","healthcare":"pharmacy","name":"CeCo Pharmacy","opening_hours":"Mo-Su 08:15-24:00","phone":"+1-268-462-4706"}}}'::jsonb, '152e2a46c0e285b742a378bb20b64563e3289110aa1c80accdad55401ef2b0c6', 'CeCo Pharmacy', 'ceco pharmacy', NULL, NULL, NULL, NULL, NULL, 'AG', 17.1215581, -61.8421467, '+1-268-462-4706', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:cbefe774703ab042705d88239a400d3c5e1b748ab59813ea75e6850e124bed2f'),
('osm:node:13790139925', 'https://www.openstreetmap.org/node/13790139925', '{"provider":"openstreetmap","element":{"type":"node","id":13790139925,"lat":17.1313595,"lon":-61.8220036,"tags":{"amenity":"hospital","name":"Clare Hill Health Center","phone":"268-462-4127","website":"https://health.gov.ag/elementor-17827/"}}}'::jsonb, 'a85371a46bf2a03bb45f0aa91ee2992172416773d0edf9585f5de024520d3f7d', 'Clare Hill Health Center', 'clare hill health center', NULL, NULL, NULL, NULL, NULL, 'AG', 17.1313595, -61.8220036, '268-462-4127', 'https://health.gov.ag/elementor-17827/', NULL, 'hospital', ARRAY['hospital', 'general_practitioner']::text[], 0.78, 'loc:eaad3929c6ab2249bc75aa0a10cd2ceceb1151454737d90dbfa26fc27dad15cb'),
('osm:node:3639273611', 'https://www.openstreetmap.org/node/3639273611', '{"provider":"openstreetmap","element":{"type":"node","id":3639273611,"lat":17.1230999,"lon":-61.841642,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Cornerstone Pharmacy"}}}'::jsonb, 'ed28a5883eb1ece48eaa03b32d11af4d9eb5acbd53ea0f6417de3d424d0ae366', 'Cornerstone Pharmacy', 'cornerstone pharmacy', NULL, NULL, NULL, NULL, NULL, 'AG', 17.1230999, -61.841642, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:55590ef34d9fc12afa092956e5188541b9c9bc2cc3b3e7faa6722f91ed420ff9'),
('osm:way:880320366', 'https://www.openstreetmap.org/way/880320366', '{"provider":"openstreetmap","element":{"type":"way","id":880320366,"center":{"lat":17.0396152,"lon":-61.725837},"tags":{"healthcare":"rehabilitation","name":"Crossroads Centre Antigua","website":"https://crossroadsantigua.org","wikidata":"Q5188820","wikipedia":"en:Crossroads Centre"}}}'::jsonb, 'eb410f85dd6aaa936ce6a0d9028739aedb505583ae68e42083e469444ac0879c', 'Crossroads Centre Antigua', 'crossroads centre antigua', NULL, NULL, NULL, NULL, NULL, 'AG', 17.0396152, -61.725837, NULL, 'https://crossroadsantigua.org', NULL, 'unknown', ARRAY['unknown']::text[], 0.78, 'loc:f62780ff007dd383c7f90a043844f1b23934eec007dae76a3d8e2475c2250cac'),
('osm:node:7017166716', 'https://www.openstreetmap.org/node/7017166716', '{"provider":"openstreetmap","element":{"type":"node","id":7017166716,"lat":17.1255958,"lon":-61.8411616,"tags":{"amenity":"doctors","healthcare":"doctor","healthcare:speciality":"emergency","name":"Dr. A. Francis Medical Complex Antigua","operator":"Dr. Adma M. Francis","phone":"+1 268 562 9234, +1 268 785 9793"}}}'::jsonb, '62a60cb81f573d6a55fe6ce55b84d5517a9e09de81effd53b38e4d1771f28586', 'Dr. A. Francis Medical Complex Antigua', 'dr a francis medical complex antigua', NULL, NULL, NULL, NULL, NULL, 'AG', 17.1255958, -61.8411616, '+1 268 562 9234, +1 268 785 9793', NULL, NULL, 'hospital', ARRAY['hospital', 'general_practitioner']::text[], 0.78, 'loc:2aa05070a9e3c8c1553943cadf6111edac45a05d7adc497283fc6aab9b1b1b39'),
('osm:way:522258000', 'https://www.openstreetmap.org/way/522258000', '{"provider":"openstreetmap","element":{"type":"way","id":522258000,"center":{"lat":17.1270105,"lon":-61.8445963},"tags":{"amenity":"doctors","building":"yes","healthcare":"doctor","name":"Dr. Nagabis"}}}'::jsonb, '65b0d923c111e6c09b724b24e90675b9c201a976b4c57b3c64fbb8ba11e9a5d4', 'Dr. Nagabis', 'dr nagabis', NULL, NULL, NULL, NULL, NULL, 'AG', 17.1270105, -61.8445963, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:edc3ea873e5d022e7570d558b3a91428e654c9ffe4e3c2a10a87be9cce7d669c'),
('osm:node:7017180830', 'https://www.openstreetmap.org/node/7017180830', '{"provider":"openstreetmap","element":{"type":"node","id":7017180830,"lat":17.1249616,"lon":-61.8436438,"tags":{"amenity":"doctors","healthcare":"doctor","name":"Dr. Raymond Daoud","phone":"12684626149"}}}'::jsonb, '4a6e96df03b314f96fdf97a14b680d2623c49c83329c932b065d3a0306317152', 'Dr. Raymond Daoud', 'dr raymond daoud', NULL, NULL, NULL, NULL, NULL, 'AG', 17.1249616, -61.8436438, '12684626149', NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:9f5cc9c709085e007984a3b208d4b02ff72d4849530d1fd3545dd4e08ad350b4'),
('osm:node:413548995', 'https://www.openstreetmap.org/node/413548995', '{"provider":"openstreetmap","element":{"type":"node","id":413548995,"lat":17.1304686,"lon":-61.8351799,"tags":{"addr:city":"St. John''s","addr:postcode":"P.O. Box W672","addr:street":"Friars Hill Road","amenity":"dentist","email":"drsengupta@candw.ag","fax":"+1-268-462-9314","healthcare":"dentist","name":"Dr. SenGupta BDS & Associates","phone":"+1-268-462-9312"}}}'::jsonb, '9a2cfe9d6d0e76c5c9460c17c089364f4fba3a4ec7a8574a696ff3596bbd7f31', 'Dr. SenGupta BDS & Associates', 'dr sengupta bds associates', 'Friars Hill Road', 'Friars Hill Road, St. John''s, P.O. Box W672', 'St. John''s', NULL, 'P.O. Box W672', 'AG', 17.1304686, -61.8351799, '+1-268-462-9312', NULL, 'drsengupta@candw.ag', 'dental', ARRAY['dental']::text[], 0.86, 'loc:9deef018ab03f2490f6ebea1226da6d9c496ce1112586cb6463cacce1c17a9b4'),
('osm:way:397124918', 'https://www.openstreetmap.org/way/397124918', '{"provider":"openstreetmap","element":{"type":"way","id":397124918,"center":{"lat":17.1231372,"lon":-61.8410169},"tags":{"addr:city":"St. John''s","addr:street":"Cross Street","amenity":"dentist","building":"yes","healthcare":"dentist","name":"Family Dentistry","source":"KG Ground Survey 2015"}}}'::jsonb, '66b590861375068e01420b175a8d40133b077f94ebfbf5654305de1e568427ff', 'Family Dentistry', 'family dentistry', 'Cross Street', 'Cross Street, St. John''s', 'St. John''s', NULL, NULL, 'AG', 17.1231372, -61.8410169, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:3b5d9d3429bf89cf390121306a2a3d95a430950b2f379e8b9bb3787d4c3e0806'),
('osm:way:396320253', 'https://www.openstreetmap.org/way/396320253', '{"provider":"openstreetmap","element":{"type":"way","id":396320253,"center":{"lat":17.1213981,"lon":-61.842433},"tags":{"addr:city":"St. John''s","addr:street":"High Street","amenity":"dentist","building":"yes","healthcare":"dentist","name":"Gentle Dental","source":"KG Ground Survey 2015"}}}'::jsonb, '0570691874c353d5c51fad646ff6a8c00accc6e1ea0626c7d664a65933b6cbef', 'Gentle Dental', 'gentle dental', 'High Street', 'High Street, St. John''s', 'St. John''s', NULL, NULL, 'AG', 17.1213981, -61.842433, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:e54ea8327a3a43520f65c4e3d3bc7817cce5fdf72b16b4c9eac11daed10f9425'),
('osm:way:521832351', 'https://www.openstreetmap.org/way/521832351', '{"provider":"openstreetmap","element":{"type":"way","id":521832351,"center":{"lat":17.6293147,"lon":-61.8290626},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Hanna Thomas Hospital","source":"Hanna Thomas Hospital"}}}'::jsonb, '02f52f060dfd92fa95b6bf290bffed2e53de1c544bbbc8980d6829ce6a2011a2', 'Hanna Thomas Hospital', 'hanna thomas hospital', NULL, NULL, NULL, NULL, NULL, 'AG', 17.6293147, -61.8290626, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:a4f4ddcd626cac071da10af778d4bc399c9608fa17d769f068f7e7595026fe19'),
('osm:node:7017295785', 'https://www.openstreetmap.org/node/7017295785', '{"provider":"openstreetmap","element":{"type":"node","id":7017295785,"lat":17.1256138,"lon":-61.8448156,"tags":{"healthcare":"yes","name":"Harmony Remedies Weightloss"}}}'::jsonb, 'bf1d912bb48965b1e1b55b97e1f2d0fd020000545b146d8401ba86d3af3e50cf', 'Harmony Remedies Weightloss', 'harmony remedies weightloss', NULL, NULL, NULL, NULL, NULL, 'AG', 17.1256138, -61.8448156, NULL, NULL, NULL, 'unknown', ARRAY['unknown']::text[], 0.78, 'loc:6ea25acc0dd605ca975ebbfd5a9fae9fd30dfcad515d0a3dc234993b8dd09581'),
('osm:node:13461444099', 'https://www.openstreetmap.org/node/13461444099', '{"provider":"openstreetmap","element":{"type":"node","id":13461444099,"lat":17.1196552,"lon":-61.8432356,"tags":{"addr:city":"St. John''s","addr:street":"Nevis Street","amenity":"pharmacy","healthcare":"pharmacy","name":"Health First Pharmacy","phone":"+1-268-562-8389"}}}'::jsonb, '41daffd3c35808ccca175d2cdf74b35c60e7ffd7d6940c8316a7d657403a9938', 'Health First Pharmacy', 'health first pharmacy', 'Nevis Street', 'Nevis Street, St. John''s', 'St. John''s', NULL, NULL, 'AG', 17.1196552, -61.8432356, '+1-268-562-8389', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:64bc701518abcd5000d36d64a937c56127d54366beb30c7179af41735cacfbc1'),
('osm:way:19882318', 'https://www.openstreetmap.org/way/19882318', '{"provider":"openstreetmap","element":{"type":"way","id":19882318,"center":{"lat":17.1154722,"lon":-61.831274},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Holberton Hospital"}}}'::jsonb, '2870b351999d4b64a486e84cf28d1b9d9fad0b4a681de616fe1d260968c7dfc6', 'Holberton Hospital', 'holberton hospital', NULL, NULL, NULL, NULL, NULL, 'AG', 17.1154722, -61.831274, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:61782afa3cc84fb8b517bb5558bf1fae04aea0694bab8df892a84192b74a1b54'),
('osm:node:7017212187', 'https://www.openstreetmap.org/node/7017212187', '{"provider":"openstreetmap","element":{"type":"node","id":7017212187,"lat":17.1216474,"lon":-61.8411016,"tags":{"amenity":"clinic","healthcare":"clinic","name":"island diagnostic center"}}}'::jsonb, '74e621e313ef22607f04d7910cc13aabd39da22522c51946ce14a3a43dfa49b2', 'island diagnostic center', 'island diagnostic center', NULL, NULL, NULL, NULL, NULL, 'AG', 17.1216474, -61.8411016, NULL, NULL, NULL, 'lab', ARRAY['lab', 'general_practitioner']::text[], 0.78, 'loc:eaba7592cd8867cea9137434b4b6e586b85e76391cf7703e6595395fb79e3f08'),
('osm:way:396096948', 'https://www.openstreetmap.org/way/396096948', '{"provider":"openstreetmap","element":{"type":"way","id":396096948,"center":{"lat":17.0642687,"lon":-61.794736},"tags":{"addr:street":"All Saints Road","amenity":"clinic","building":"yes","healthcare":"clinic","name":"Mavis Cabral Medical Centre","source":"KG Ground Survey 2015"}}}'::jsonb, 'ab277ff6590efc89765ce56b356c982622c3cbe87f3de3ec45b7e02a82d5c235', 'Mavis Cabral Medical Centre', 'mavis cabral medical centre', 'All Saints Road', 'All Saints Road', NULL, NULL, NULL, 'AG', 17.0642687, -61.794736, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:71d334bb059a7481ae237231a90307bb2cc593ec352de1715eb83a7b38ae2e37'),
('osm:relation:6689838', 'https://www.openstreetmap.org/relation/6689838', '{"provider":"openstreetmap","element":{"type":"relation","id":6689838,"center":{"lat":17.0114866,"lon":-61.7699137},"tags":{"amenity":"clinic","building":"commercial","healthcare":"clinic","name":"Medic Station","source":"KG Ground Survey 2015","type":"multipolygon"}}}'::jsonb, 'e83ab31a6fbc0a183805ca2142025665d5b379e0d99b6ab7030d1cab442d3d11', 'Medic Station', 'medic station', NULL, NULL, NULL, NULL, NULL, 'AG', 17.0114866, -61.7699137, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:1071e25afb6986982ea46a3eb22e5bf392316c5df7b6c63d324e463dfb47ab66'),
('osm:node:7017180829', 'https://www.openstreetmap.org/node/7017180829', '{"provider":"openstreetmap","element":{"type":"node","id":7017180829,"lat":17.1250129,"lon":-61.8435982,"tags":{"healthcare":"laboratory","name":"Medical Laboratory Services","phone":"12684624098"}}}'::jsonb, '8c65517cbc3f686dde633f2a7518738ca9bea4b6becbb480c5f1f7e6cbdee4e6', 'Medical Laboratory Services', 'medical laboratory services', NULL, NULL, NULL, NULL, NULL, 'AG', 17.1250129, -61.8435982, '12684624098', NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:c5a9003076157f0b5b2813c47bd9989c8fd1faa9300581b1c2d9aab8a45470c2'),
('osm:way:396320251', 'https://www.openstreetmap.org/way/396320251', '{"provider":"openstreetmap","element":{"type":"way","id":396320251,"center":{"lat":17.1196208,"lon":-61.8406097},"tags":{"addr:city":"St. John''s","addr:street":"Nevis Street","amenity":"clinic","building":"yes","healthcare":"clinic","name":"Medical Specialist Clinic","source":"KG Ground Survey 2015"}}}'::jsonb, 'e6403c271f680b82d9fed56975676d08ca726e7870b4ee600c36e5f1c854a2c3', 'Medical Specialist Clinic', 'medical specialist clinic', 'Nevis Street', 'Nevis Street, St. John''s', 'St. John''s', NULL, NULL, 'AG', 17.1196208, -61.8406097, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner', 'specialist']::text[], 0.86, 'loc:9d356a00d27687e6a4637687b093b41c9e4a900f882695a30d45762756f30e4d'),
('osm:way:397174872', 'https://www.openstreetmap.org/way/397174872', '{"provider":"openstreetmap","element":{"type":"way","id":397174872,"center":{"lat":17.129228,"lon":-61.8350808},"tags":{"addr:street":"Mahogany Drive","amenity":"clinic","building":"yes","healthcare":"clinic","name":"Medical Surgical Associates","source":"KG Ground Survey 2016"}}}'::jsonb, '10bd717f9673b286cc8afaaec626aeac72a46822c0ac6c557de005026422bf59', 'Medical Surgical Associates', 'medical surgical associates', 'Mahogany Drive', 'Mahogany Drive', NULL, NULL, NULL, 'AG', 17.129228, -61.8350808, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:b32b4857943cffcfffbcbf9062ca9d737c7008a49ab3ed7d8428445b6af23a76'),
('osm:way:150145639', 'https://www.openstreetmap.org/way/150145639', '{"provider":"openstreetmap","element":{"type":"way","id":150145639,"center":{"lat":17.1169453,"lon":-61.8388583},"tags":{"amenity":"hospital","building":"hospital","email":"info@msjmc.org","fax":"+1-268-484-2955","healthcare":"hospital","name":"Mount St. John''s Medical Centre","phone":"+1-268-484-2700","website":"https://www.msjmc.org/"}}}'::jsonb, '8c53d4a58e33814949ca3436a99bbd82e713c09d969607fb528ef59b1e145cbd', 'Mount St. John''s Medical Centre', 'mount st john s medical centre', NULL, NULL, NULL, NULL, NULL, 'AG', 17.1169453, -61.8388583, '+1-268-484-2700', 'https://www.msjmc.org/', 'info@msjmc.org', 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:b400e7791eed28c0cb2d873f5356861842fdce2ee13c43b342229119678bb772'),
('osm:way:397515994', 'https://www.openstreetmap.org/way/397515994', '{"provider":"openstreetmap","element":{"type":"way","id":397515994,"center":{"lat":17.1273454,"lon":-61.8439374},"tags":{"addr:city":"St. John''s","addr:street":"Dr. Rosa Lee Drive","amenity":"clinic","building":"yes","healthcare":"clinic","name":"Natural Medicine Center in Antigua","source":"KG Ground Survey 2015"}}}'::jsonb, '852581b167e86877eaca95095efcf5b587ac8ab10859ca7f660cb2f7c01fd8db', 'Natural Medicine Center in Antigua', 'natural medicine center in antigua', 'Dr. Rosa Lee Drive', 'Dr. Rosa Lee Drive, St. John''s', 'St. John''s', NULL, NULL, 'AG', 17.1273454, -61.8439374, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:cc83dc38071c1c4ddcc7847d33ecc6adf3cd05ab8cf244c75544b1efccf50c69'),
('osm:node:3999956008', 'https://www.openstreetmap.org/node/3999956008', '{"provider":"openstreetmap","element":{"type":"node","id":3999956008,"lat":17.1309625,"lon":-61.8360705,"tags":{"amenity":"doctors","healthcare":"doctor","name":"Ortho Medical Associates","source":"KG Ground Survey 2016"}}}'::jsonb, '2ea73791e1dc15882902cf18a41171df82fb6ff37a40813406908acea262795f', 'Ortho Medical Associates', 'ortho medical associates', NULL, NULL, NULL, NULL, NULL, 'AG', 17.1309625, -61.8360705, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner', 'specialist']::text[], 0.78, 'loc:513308e53db485adb3ef87d1159d8b2032f0537af2b5f22a3dcfa5b2e41f00ed'),
('osm:way:396326675', 'https://www.openstreetmap.org/way/396326675', '{"provider":"openstreetmap","element":{"type":"way","id":396326675,"center":{"lat":17.1161695,"lon":-61.842954},"tags":{"addr:city":"St. John''s","addr:street":"All Saints Road","amenity":"pharmacy","building":"yes","healthcare":"pharmacy","name":"Piper''s Pharmacy LTD.","source":"KG Ground Survey 2015"}}}'::jsonb, 'fea3852ada9ba9f4681fbac476ab18019dff4a013ce1c3ff013d224231ed67a8', 'Piper''s Pharmacy LTD.', 'piper s pharmacy ltd', 'All Saints Road', 'All Saints Road, St. John''s', 'St. John''s', NULL, NULL, 'AG', 17.1161695, -61.842954, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:d944bc9cdcd0e7c2202b9a592852ab0b196e9e5da1b9d4026fa10ff96e0d6e15'),
('osm:way:522258729', 'https://www.openstreetmap.org/way/522258729', '{"provider":"openstreetmap","element":{"type":"way","id":522258729,"center":{"lat":17.1118671,"lon":-61.8168536},"tags":{"amenity":"clinic","building":"yes","healthcare":"clinic","name":"Potters Community Clinic","opening_hours":"Mo-Fr 08:00-16:30"}}}'::jsonb, '60f709c618db93039d0573a15a1ce782e4e87e6813a953824aa7fa79e6830097', 'Potters Community Clinic', 'potters community clinic', NULL, NULL, NULL, NULL, NULL, 'AG', 17.1118671, -61.8168536, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:2c7b5854186586d78c03632acf14272e8f9756e15aaafaa182838c09e1357781'),
('osm:way:396314065', 'https://www.openstreetmap.org/way/396314065', '{"provider":"openstreetmap","element":{"type":"way","id":396314065,"center":{"lat":17.1175839,"lon":-61.8400915},"tags":{"addr:city":"St. John''s","addr:street":"Camacho Avenue","amenity":"clinic","building":"yes","healthcare":"clinic","name":"Ramco Building","source":"KG Ground Survey 2016"}}}'::jsonb, '9202ab53f3a9b2452544aee1da20e8dfc8ced569b5f67b601c9670684182c4f3', 'Ramco Building', 'ramco building', 'Camacho Avenue', 'Camacho Avenue, St. John''s', 'St. John''s', NULL, NULL, 'AG', 17.1175839, -61.8400915, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:5ddeb31c513a83df7126afbee669c8fd01152c45fcd6889172cfcde437b86590'),
('osm:node:3991361739', 'https://www.openstreetmap.org/node/3991361739', '{"provider":"openstreetmap","element":{"type":"node","id":3991361739,"lat":17.1174721,"lon":-61.8401861,"tags":{"addr:city":"St. John''s","addr:street":"Camacho Avenue","amenity":"pharmacy","healthcare":"pharmacy","name":"Ramco Pharmacy","source":"KG Ground Survey 2016"}}}'::jsonb, '554e5a4b158580013f57978e281b20e4263a697e61f41a9beb7e151072fbf8e7', 'Ramco Pharmacy', 'ramco pharmacy', 'Camacho Avenue', 'Camacho Avenue, St. John''s', 'St. John''s', NULL, NULL, 'AG', 17.1174721, -61.8401861, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:3696dd01b04ebb9e831cc3c35dd853bfaecf571364472d3c3e5268c422d4568f'),
('osm:node:7017332285', 'https://www.openstreetmap.org/node/7017332285', '{"provider":"openstreetmap","element":{"type":"node","id":7017332285,"lat":17.121005,"lon":-61.844922,"tags":{"addr:street":"Thames Street","amenity":"pharmacy","healthcare":"pharmacy","name":"St John''s Pharmacy"}}}'::jsonb, '2ea525e28ca6615e3d1976e43ede0ae217a2c662db49bbad300c890911acdf8e', 'St John''s Pharmacy', 'st john s pharmacy', 'Thames Street', 'Thames Street', NULL, NULL, NULL, 'AG', 17.121005, -61.844922, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:c55cf6b19cd825d159f1edbe56525829f61de93d158f6059a542157beba94de6'),
('osm:node:13673244651', 'https://www.openstreetmap.org/node/13673244651', '{"provider":"openstreetmap","element":{"type":"node","id":13673244651,"lat":17.0648092,"lon":-61.8836482,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Sysco","opening_hours":"Mo-Sa 09:00-17:00; PH closed","wheelchair":"limited"}}}'::jsonb, '8cfd23c979e858ce1e2e7016f79b4741634ae189eee6462d307846f5494d79cd', 'Sysco', 'sysco', NULL, NULL, NULL, NULL, NULL, 'AG', 17.0648092, -61.8836482, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:a799d7aef95aede8b85cb90b7e934c3a4b6ff795053222248d8aa840323ce8e9'),
('osm:way:396326672', 'https://www.openstreetmap.org/way/396326672', '{"provider":"openstreetmap","element":{"type":"way","id":396326672,"center":{"lat":17.1180708,"lon":-61.83825},"tags":{"addr:city":"St. John''s","addr:street":"Queen Elisabeth Highway","amenity":"clinic","building":"yes","healthcare":"clinic","name":"The Medical Pavilion Antigua","source":"KG Ground Survey 2016"}}}'::jsonb, 'c854e12664966c0fbb6a900e2afdaaf6c829751f358b50ed9f4d7aa2e341710e', 'The Medical Pavilion Antigua', 'the medical pavilion antigua', 'Queen Elisabeth Highway', 'Queen Elisabeth Highway, St. John''s', 'St. John''s', NULL, NULL, 'AG', 17.1180708, -61.83825, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:89638fe10692ff333053c124e9a8d43ad61c7866841ce040b6db5071e75fbbdd'),
('osm:node:7017141421', 'https://www.openstreetmap.org/node/7017141421', '{"provider":"openstreetmap","element":{"type":"node","id":7017141421,"lat":17.1254561,"lon":-61.841513,"tags":{"amenity":"clinic","healthcare":"clinic","healthcare:speciality":"gynaecology;general_practice;obstetrics","name":"The Women''s Clinic","operator":"Dr. Dane Abbot & Dr. Gisel s. Issac Payne","operator:type":"public"}}}'::jsonb, '43acef3997c846d4e87ece8bacd478f75b3c42b20d8a52c09bde318fc7ae0b2d', 'The Women''s Clinic', 'the women s clinic', NULL, NULL, NULL, NULL, NULL, 'AG', 17.1254561, -61.841513, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:48f46d75cb445d0c2801d205aed6dcb55d88fc29c0188c37245fa204ec4b2df1'),
('osm:node:3999956005', 'https://www.openstreetmap.org/node/3999956005', '{"provider":"openstreetmap","element":{"type":"node","id":3999956005,"lat":17.1300474,"lon":-61.8353602,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Urgent Care","source":"KG Ground Survey 2016"}}}'::jsonb, '4ee92564d72b288a432d9a7cb79a676d763d779f6afd53317b4deba5664645d0', 'Urgent Care', 'urgent care', NULL, NULL, NULL, NULL, NULL, 'AG', 17.1300474, -61.8353602, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:b4e9102bf664854b40bf2249598ec4e2b5a79bdea923daaee2984dc59a0c720f'),
('osm:node:7017141420', 'https://www.openstreetmap.org/node/7017141420', '{"provider":"openstreetmap","element":{"type":"node","id":7017141420,"lat":17.125624,"lon":-61.8414849,"tags":{"addr:street":"Dickenson Bay Street & Deanery Place","amenity":"dentist","healthcare":"dentist","name":"Williams & Associates"}}}'::jsonb, '6f6eabd78bb393f5026c9343697ef1d4587079fdd449d027c3bde488e99d643b', 'Williams & Associates', 'williams associates', 'Dickenson Bay Street & Deanery Place', 'Dickenson Bay Street & Deanery Place', NULL, NULL, NULL, 'AG', 17.125624, -61.8414849, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:7ec0dd25250e46d10bdc0596ed898a708b68e0772a4af4b640e4bda053a4ad1c'),
('osm:node:13622043660', 'https://www.openstreetmap.org/node/13622043660', '{"provider":"openstreetmap","element":{"type":"node","id":13622043660,"lat":17.1608723,"lon":-61.8273707,"tags":{"amenity":"pharmacy","name":"Wood''s Pharmacy"}}}'::jsonb, '74ac1a0262b67319857631a1d2017e0abd267370d1a5eb8a65a1c368170b9603', 'Wood''s Pharmacy', 'wood s pharmacy', NULL, NULL, NULL, NULL, NULL, 'AG', 17.1608723, -61.8273707, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:8b948d8596f398fa537465441ca003f4b1236dcac73f0af2dd1d78976255601e'),
('osm:node:413548993', 'https://www.openstreetmap.org/node/413548993', '{"provider":"openstreetmap","element":{"type":"node","id":413548993,"lat":17.1306352,"lon":-61.8351745,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Woods Pharmacy"}}}'::jsonb, 'fcd05fccf55155651fa421ec55efac0c6538e5cb05427e376ea253c7a276a873', 'Woods Pharmacy', 'woods pharmacy', NULL, NULL, NULL, NULL, NULL, 'AG', 17.1306352, -61.8351745, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:52a95f7a2cbc09f23c4f99d4275b514db0fe625bb222a2620c748a60cab31fc3');

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
