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
('osm:way:322248109', 'https://www.openstreetmap.org/way/322248109', '{"provider":"openstreetmap","element":{"type":"way","id":322248109,"center":{"lat":42.0708366,"lon":19.4002115},"tags":{"addr:city":"Zogej","addr:country":"AL","addr:housenumber":"103","addr:street":"Rruga Zogej","amenity":"clinic","building":"yes","check_date":"2023-07-07","name":"Qendra Shëndetësore Zogaj","name:en":"Zogaj Health Centre","source":"bing;mapbox-satellite;digitalglobe;survey;knowledge;local-info","source_ref:url":"https://www.flickr.com/photos/openstreetmap-albania"}}}'::jsonb, 'ec6dd67dc3d409c96d4c8894733a5f02d014de8b96f6184aa7f4f459bb399625', 'Qendra Shëndetësore Zogaj', 'qendra sh ndet sore zogaj', '103 Rruga Zogej', '103 Rruga Zogej, Zogej', 'Zogej', NULL, NULL, 'AL', 42.0708366, 19.4002115, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:5b2b04f9a444238b42696fa66ecd7b6a9daac917df9dfbe1854ca77d9b1227d8'),
('osm:node:6416284310', 'https://www.openstreetmap.org/node/6416284310', '{"provider":"openstreetmap","element":{"type":"node","id":6416284310,"lat":40.6104331,"lon":20.7899099,"tags":{"amenity":"doctors","healthcare":"doctor","name":"Qendra Shëndetsësore Rajoni 2","wheelchair":"designated"}}}'::jsonb, 'b17dd1893e2dc2b6a629a1673b0a0553763f1fe71e0ec55c01d4a62dc0bc1b7a', 'Qendra Shëndetsësore Rajoni 2', 'qendra sh ndets sore rajoni 2', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6104331, 20.7899099, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:f2c7cb6cc173b761b8868ed12dc18e48df5eec101e8554a7716582fa81ed40e0'),
('osm:node:6389210219', 'https://www.openstreetmap.org/node/6389210219', '{"provider":"openstreetmap","element":{"type":"node","id":6389210219,"lat":40.7094902,"lon":20.6988728,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Qendra Shëndëtshore Maliq"}}}'::jsonb, '56759165ed7c9783771c4fd0fcb263769fa470aa81a577c15cbcac74b464fb68', 'Qendra Shëndëtshore Maliq', 'qendra sh nd tshore maliq', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7094902, 20.6988728, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:e1e0c47562e81b518f1caaf3039935be1d2a7c5fc2782d94fec45601c4faf766'),
('osm:node:6267547309', 'https://www.openstreetmap.org/node/6267547309', '{"provider":"openstreetmap","element":{"type":"node","id":6267547309,"lat":40.6842951,"lon":19.6185463,"tags":{"addr:postcode":"9307","addr:street":"Thoma Rrudha","amenity":"hospital","healthcare":"hospital","name":"Qëndra Shendetsore \"Thoma Rrudha\"","name:en":"Health Center \"Thoma Rrudha\"","opening_hours":"24/7"}}}'::jsonb, '19a1f7578cc9d0023f5f95112394cdaf9c253013270f880069a4670ca6d4192c', 'Qëndra Shendetsore "Thoma Rrudha"', 'q ndra shendetsore thoma rrudha', 'Thoma Rrudha', 'Thoma Rrudha, 9307', NULL, NULL, '9307', 'AL', 40.6842951, 19.6185463, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:37e9dca651a07effd7ecb1e4243c3fada10779f1a961672e286cbb8adad67b39'),
('osm:node:9860695339', 'https://www.openstreetmap.org/node/9860695339', '{"provider":"openstreetmap","element":{"type":"node","id":9860695339,"lat":40.6165221,"lon":20.7826193,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Qëndra Shëndetsore 2 Lagja 2-3"}}}'::jsonb, '09c2320548f9b27f33e4cda70b158ba0af0e1b75d31d4b4c97114f12677cd12e', 'Qëndra Shëndetsore 2 Lagja 2-3', 'q ndra sh ndetsore 2 lagja 2 3', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6165221, 20.7826193, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:f7be01b646bb41266fd4e8f531e263aa021d71956a95e1cb9585499e05e6b3f5'),
('osm:node:7078852986', 'https://www.openstreetmap.org/node/7078852986', '{"provider":"openstreetmap","element":{"type":"node","id":7078852986,"lat":42.2154933,"lon":20.279759,"tags":{"addr:postcode":"8660","addr:street":"Vas Pas","amenity":"hospital","name":"Qendra Shendetsore Helshan","opening_hours":"Mo-Sa 00:00-24:00"}}}'::jsonb, 'cc5469554c1372ccb9b881c6d3dc345288fe60fd24a7c712ba42ed80df8a099c', 'Qendra Shendetsore Helshan', 'qendra shendetsore helshan', 'Vas Pas', 'Vas Pas, 8660', NULL, NULL, '8660', 'AL', 42.2154933, 20.279759, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:4816e507babc24962b8e9d9d923fee8bd5f79fd8a91e3209f19a098ff5018e7e'),
('osm:way:387252693', 'https://www.openstreetmap.org/way/387252693', '{"provider":"openstreetmap","element":{"type":"way","id":387252693,"center":{"lat":41.7786212,"lon":19.6443788},"tags":{"amenity":"hospital","building":"yes","emergency":"no","healthcare":"hospital","name":"Qendra Shendetsore Lezhe"}}}'::jsonb, '79f5b0f32443072c6aff7995714e6885a58fb27db2d98b5913387ca4acfd9bb9', 'Qendra Shendetsore Lezhe', 'qendra shendetsore lezhe', NULL, NULL, NULL, NULL, NULL, 'AL', 41.7786212, 19.6443788, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:876b463d6295f6481b8860e8ed5f730c95a7ed8e36fce1a2e6385e5681430ebe'),
('osm:node:9856298725', 'https://www.openstreetmap.org/node/9856298725', '{"provider":"openstreetmap","element":{"type":"node","id":9856298725,"lat":40.5082065,"lon":20.9282347,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Qëndra Shëndetsore Miras"}}}'::jsonb, 'acc5e8ff13d348231afe29c568124e909855c2367cb2f0a1fbd1a5a38e564434', 'Qëndra Shëndetsore Miras', 'q ndra sh ndetsore miras', NULL, NULL, NULL, NULL, NULL, 'AL', 40.5082065, 20.9282347, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:3631c903e0e096d998edd34afa5400a424f87fa67f8d56fba8d1f6a915485b09'),
('osm:node:12967022988', 'https://www.openstreetmap.org/node/12967022988', '{"provider":"openstreetmap","element":{"type":"node","id":12967022988,"lat":40.6235744,"lon":20.7787159,"tags":{"alt_name":"Ambulanca e Lagjes 11-12","amenity":"clinic","healthcare":"clinic","name":"Qendra Shëndetsore Rajoni Nr. 1"}}}'::jsonb, '672a07e3ef6e2449f5e231fbfa3c7da60670e45ce474f3216351430ece659e9c', 'Qendra Shëndetsore Rajoni Nr. 1', 'qendra sh ndetsore rajoni nr 1', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6235744, 20.7787159, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:f9a324bc3f25c46fcb53f7baf283d1790b1ab27ea92e5452de6b4a5873e79b13'),
('osm:node:9826051453', 'https://www.openstreetmap.org/node/9826051453', '{"provider":"openstreetmap","element":{"type":"node","id":9826051453,"lat":40.6149488,"lon":20.7771779,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Qendra Shendëtsore Rajoni Nr. 4"}}}'::jsonb, '0a4964343edfd4fc88732452c1537cc1068b2a068c07a7c3e7ad89974e3cc99a', 'Qendra Shendëtsore Rajoni Nr. 4', 'qendra shend tsore rajoni nr 4', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6149488, 20.7771779, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:f33344bdff382c6c2bf45a168b794e0d06cac6d1e4e04c2da8a5289ebbf57873'),
('osm:node:9902343083', 'https://www.openstreetmap.org/node/9902343083', '{"provider":"openstreetmap","element":{"type":"node","id":9902343083,"lat":40.6167549,"lon":20.7712481,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Qendra Shëndetsore Rajoni Nr. 4"}}}'::jsonb, 'f4044ee34f61ba3c5595f2bfab715a56b7a362682796f494eaf027c06505e945', 'Qendra Shëndetsore Rajoni Nr. 4', 'qendra sh ndetsore rajoni nr 4', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6167549, 20.7712481, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:137afa49f1c7f2d36999c59865798f0c4c93db9adaa02934cbf21de461dffb06'),
('osm:way:318517481', 'https://www.openstreetmap.org/way/318517481', '{"provider":"openstreetmap","element":{"type":"way","id":318517481,"center":{"lat":42.0229273,"lon":19.5755517},"tags":{"addr:city":"Juban","addr:postcode":"4016","amenity":"hospital","healthcare":"hospital","name":"Qendra shendetsore Shen Scalabrini"}}}'::jsonb, '150a15cbb3a30f642308912dffd58b67a652271d05e31cba5a94e4800f2f053a', 'Qendra shendetsore Shen Scalabrini', 'qendra shendetsore shen scalabrini', NULL, 'Juban, 4016', 'Juban', NULL, '4016', 'AL', 42.0229273, 19.5755517, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:ecbe6839b492cd170b6017bad86bd7fd0c529c8fa8315c862b797830e9fe937e'),
('osm:node:12090501689', 'https://www.openstreetmap.org/node/12090501689', '{"provider":"openstreetmap","element":{"type":"node","id":12090501689,"lat":42.4483893,"lon":19.8869351,"tags":{"amenity":"doctors","name":"Qendra Shëndetsore Valbonë (Valbona Health Center - Free Medical Services)","opening_hours":"24/7"}}}'::jsonb, 'd87150dd3af20807ac61cd7a462973eec87197a76c66521c78d8b52265e6fdf8', 'Qendra Shëndetsore Valbonë (Valbona Health Center - Free Medical Services)', 'qendra sh ndetsore valbon valbona health center free medical services', NULL, NULL, NULL, NULL, NULL, 'AL', 42.4483893, 19.8869351, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:9dadb3e72d4f06abf781fdbf236a8feb3286e56fa4d626cbf0d0e009ee58da20'),
('osm:node:3508511635', 'https://www.openstreetmap.org/node/3508511635', '{"provider":"openstreetmap","element":{"type":"node","id":3508511635,"lat":41.4017561,"lon":19.6492485,"tags":{"amenity":"hospital","name":"Qendra Spitalore Marqinet"}}}'::jsonb, '2ed195e5cd1f7da45097239611527598385b4d2ac611a77599b66c7226bb7e2a', 'Qendra Spitalore Marqinet', 'qendra spitalore marqinet', NULL, NULL, NULL, NULL, NULL, 'AL', 41.4017561, 19.6492485, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:82b9dcf93355e58f09cab0507dc4fe1484c8cd2eee98fb270776c00c0c95d32f'),
('osm:way:356922410', 'https://www.openstreetmap.org/way/356922410', '{"provider":"openstreetmap","element":{"type":"way","id":356922410,"center":{"lat":41.3403651,"lon":19.8330444},"tags":{"addr:housenumber":"372","addr:street":"Rruga e Dibrës","amenity":"hospital","barrier":"fence","email":"info@qsut.gov.al","emergency":"yes","fence_type":"wire","healthcare":"hospital","name":"Qendra Spitalore Universitare \"Nënë Teresa\"","phone":"+35542349233;+35542222235;08002828;+35542349217","website":"https://www.qsut.gov.al/","wikidata":"Q6917439","wikipedia":"sq:Qendra Spitalore Universitare \"Nënë Tereza\""}}}'::jsonb, '03d53fb2c4f6a9dfd0aca47dd155f04b628dca7ec27a99a2b929908dead74caa', 'Qendra Spitalore Universitare "Nënë Teresa"', 'qendra spitalore universitare n n teresa', '372 Rruga e Dibrës', '372 Rruga e Dibrës', NULL, NULL, NULL, 'AL', 41.3403651, 19.8330444, '+35542349233;+35542222235;08002828;+35542349217', 'https://www.qsut.gov.al/', 'info@qsut.gov.al', 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:504ca3ea98a04ab8261cec8e413021f1e22b4ddb503b6b4189c34036adccc0ee'),
('osm:way:343988156', 'https://www.openstreetmap.org/way/343988156', '{"provider":"openstreetmap","element":{"type":"way","id":343988156,"center":{"lat":41.391747,"lon":19.6586778},"tags":{"addr:city":"Vorë","addr:street":"Rruga Shaqo Derja","amenity":"hospital","healthcare":"hospital","name":"Qendra Spitalore Vorë"}}}'::jsonb, 'f4acd03ddf2689c8433162ed313528d23de840caa1f72e55e016b8a1af1c226b', 'Qendra Spitalore Vorë', 'qendra spitalore vor', 'Rruga Shaqo Derja', 'Rruga Shaqo Derja, Vorë', 'Vorë', NULL, NULL, 'AL', 41.391747, 19.6586778, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:c48fd08ee2334b0dbfb4119260adb6a78a2e4964cbed5dd8271af6f49feb8932'),
('osm:node:13953776180', 'https://www.openstreetmap.org/node/13953776180', '{"provider":"openstreetmap","element":{"type":"node","id":13953776180,"lat":41.2498033,"lon":19.5208566,"tags":{"addr:floor":"G","amenity":"clinic","check_date":"2026-06-20","healthcare":"clinic","healthcare:speciality":"general","level":"0","name":"Qendre Shëndësore Verore Golem","operator:type":"public","phone":"+355 68 806 6406"}}}'::jsonb, '9a150033fa7344bcc6f5be36942eaa3e3dbe426fc86cfed9d2e47cad468cc68a', 'Qendre Shëndësore Verore Golem', 'qendre sh nd sore verore golem', NULL, NULL, NULL, NULL, NULL, 'AL', 41.2498033, 19.5208566, '+355 68 806 6406', NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:ded87f147819b7260f8afffc0a2c85b7a4e53294c81069fcdedc9d4113d4e873'),
('osm:node:4579869297', 'https://www.openstreetmap.org/node/4579869297', '{"provider":"openstreetmap","element":{"type":"node","id":4579869297,"lat":41.3409886,"lon":19.8317538,"tags":{"amenity":"clinic","healthcare":"clinic","name":"QFR - Qendra Radiologjike"}}}'::jsonb, 'dc2062c7bda51a1d831721a33ea78a822b7ed2b9b9b8c4a334b5fdea6070ccfb', 'QFR - Qendra Radiologjike', 'qfr qendra radiologjike', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3409886, 19.8317538, NULL, NULL, NULL, 'imaging', ARRAY['imaging', 'general_practitioner']::text[], 0.78, 'loc:eaef9e2c6c5d932707bcc3397a6d94eb454c18297952fbae1b625d8b9e658f40'),
('osm:node:10819294211', 'https://www.openstreetmap.org/node/10819294211', '{"provider":"openstreetmap","element":{"type":"node","id":10819294211,"lat":41.3394631,"lon":19.8301092,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Radioterapia"}}}'::jsonb, '617c366267a88745e141d3fa5e4e31d84acf9343f7dd3e029c5509c114dd6056', 'Radioterapia', 'radioterapia', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3394631, 19.8301092, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:0ed6f48d3da2d96647059246383f941dda51c9438f3aacc44853c9973e1d82a2'),
('osm:node:2423106576', 'https://www.openstreetmap.org/node/2423106576', '{"provider":"openstreetmap","element":{"type":"node","id":2423106576,"lat":40.2332353,"lon":20.3525657,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Randi","opening_hours":"Mo-Su 10:00-00:00"}}}'::jsonb, '91d752abde1356b40558e9c6da8f34c9330e02cd40ac4b096eba1c7ed029552f', 'Randi', 'randi', NULL, NULL, NULL, NULL, NULL, 'AL', 40.2332353, 20.3525657, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:4745e65ec700c94acdeebd56617cc73ad35696b3adcf222b5f2e7ae6055beaf7'),
('osm:node:6838696671', 'https://www.openstreetmap.org/node/6838696671', '{"provider":"openstreetmap","element":{"type":"node","id":6838696671,"lat":41.3368403,"lon":19.4484635,"tags":{"addr:street":"Rruga Petrit Llaftiu","amenity":"dentist","healthcare":"dentist","name":"Real Dent"}}}'::jsonb, 'ce56cb666fb61db23436aaf6c5aa589c134a94cc584931dd37a36395ab4b116d', 'Real Dent', 'real dent', 'Rruga Petrit Llaftiu', 'Rruga Petrit Llaftiu', NULL, NULL, NULL, 'AL', 41.3368403, 19.4484635, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:3b6ce10a0eccb03fe4c6fa5858a1a606d6a22cc792021b99c8777840c66f48dc'),
('osm:node:6813052891', 'https://www.openstreetmap.org/node/6813052891', '{"provider":"openstreetmap","element":{"type":"node","id":6813052891,"lat":41.3427644,"lon":19.8342685,"tags":{"addr:street":"Rruga e Dibrës","amenity":"pharmacy","healthcare":"pharmacy","name":"Redon"}}}'::jsonb, '6608ed20decee7612d801736f6908d62b641933c16d6b356f6fc262e0e19c868', 'Redon', 'redon', 'Rruga e Dibrës', 'Rruga e Dibrës', NULL, NULL, NULL, 'AL', 41.3427644, 19.8342685, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:ef1f3de5f713922994d7d5d983f7a22fc4533594b64ba3c81bc3667934132958'),
('osm:way:734905582', 'https://www.openstreetmap.org/way/734905582', '{"provider":"openstreetmap","element":{"type":"way","id":734905582,"center":{"lat":41.3213233,"lon":19.78347},"tags":{"addr:city":"Tirana","addr:street":"Rruga Tre Dëshmorët","amenity":"pharmacy","building":"residential","healthcare":"pharmacy","name":"Redon"}}}'::jsonb, '8f9cfa9905dc553103dc4af3ea88a6b02a696c5cb1f768627d158100a330251f', 'Redon', 'redon', 'Rruga Tre Dëshmorët', 'Rruga Tre Dëshmorët, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3213233, 19.78347, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:a63e77c0bc88fafb05a11f318d39c9c477e69f9d6e26c7221e047777c2263e8d'),
('osm:node:6887377307', 'https://www.openstreetmap.org/node/6887377307', '{"provider":"openstreetmap","element":{"type":"node","id":6887377307,"lat":41.3456212,"lon":19.8405601,"tags":{"addr:city":"Tirana","addr:street":"Rruga e Dibrës","amenity":"pharmacy","healthcare":"pharmacy","name":"Rei"}}}'::jsonb, '95f26e7d122f0a182d00129e3270dc7679f2d236eeb708f3c09e9871c39ec48c', 'Rei', 'rei', 'Rruga e Dibrës', 'Rruga e Dibrës, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3456212, 19.8405601, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:2c64de1cbd0291badd0a1f7c6c21be84ebd6dda028f01f3c1a14789e1fff0100'),
('osm:node:11488166011', 'https://www.openstreetmap.org/node/11488166011', '{"provider":"openstreetmap","element":{"type":"node","id":11488166011,"lat":41.3258349,"lon":19.80429,"tags":{"amenity":"pharmacy","check_date":"2024-01-04","healthcare":"pharmacy","name":"Rejsi Farmaci"}}}'::jsonb, '567f793b828a418a30af48eb33c3ec36ea2ef3ff0ec20564fcb873bbc8b2726a', 'Rejsi Farmaci', 'rejsi farmaci', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3258349, 19.80429, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:50977e2cf3c9fad3bb98f46bab07a27b29856fcaaf81a9f0f3756fb000850471'),
('osm:node:13830562888', 'https://www.openstreetmap.org/node/13830562888', '{"provider":"openstreetmap","element":{"type":"node","id":13830562888,"lat":40.9378727,"lon":19.7070693,"tags":{"amenity":"doctors","healthcare":"doctor","healthcare:speciality":"ophthalmology","name":"Retina Institute"}}}'::jsonb, '67f9a5467a54553de91e785f16dfd565c8c8bc3e026fa74093bf298cbfcbfe15', 'Retina Institute', 'retina institute', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9378727, 19.7070693, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:633c3d648a0b542e0a099ff034817ffec760ba37641ac1d6c5f84d4ad74633db'),
('osm:node:10118570764', 'https://www.openstreetmap.org/node/10118570764', '{"provider":"openstreetmap","element":{"type":"node","id":10118570764,"lat":40.6210314,"lon":20.7781434,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Ro-Denta","phone":"+355 69 749 6150","wheelchair":"no"}}}'::jsonb, '6b1b0451c7c41903966a16bbc77b6cfb7b9ece5707355c8187256a582b832a85', 'Ro-Denta', 'ro denta', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6210314, 20.7781434, '+355 69 749 6150', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:ded39a5ca5eaf82f2b5070826a49464ff319881c7ed0d9e4d63359ce47b23cc9'),
('osm:node:3613059771', 'https://www.openstreetmap.org/node/3613059771', '{"provider":"openstreetmap","element":{"type":"node","id":3613059771,"lat":41.1113608,"lon":20.0805283,"tags":{"addr:city":"Elbasan","amenity":"pharmacy","healthcare":"pharmacy","name":"Roma","opening_hours":"Mo-Su 08:30-21:30","phone":"0693637216","toilets:wheelchair":"no","wheelchair":"no"}}}'::jsonb, '0acceb4c168a227753e165d8c0547e420e6d302119c4ead08b045643f2ea5dff', 'Roma', 'roma', NULL, 'Elbasan', 'Elbasan', NULL, NULL, 'AL', 41.1113608, 20.0805283, '0693637216', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:9ecdba98fa66e6a6b5df73f53eedb391e1670a69d13384b860b026bdd190aded'),
('osm:node:5533008932', 'https://www.openstreetmap.org/node/5533008932', '{"provider":"openstreetmap","element":{"type":"node","id":5533008932,"lat":40.9935333,"lon":19.531303,"tags":{"amenity":"pharmacy","name":"Rrudho"}}}'::jsonb, '482b71b3fec570a44462db1c4483168f20fdfc2c090be85ff424b7698e5e429e', 'Rrudho', 'rrudho', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9935333, 19.531303, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:42fd80bb9aef1b5cef95a8c504942e514373d8ea7d8b817b3c5d837d750772ce'),
('osm:node:3975619549', 'https://www.openstreetmap.org/node/3975619549', '{"provider":"openstreetmap","element":{"type":"node","id":3975619549,"lat":42.0693733,"lon":19.5137046,"tags":{"addr:country":"AL","amenity":"pharmacy","dispensing":"yes","internet_access":"yes","internet_access:fee":"no","name":"Rudina","payment:coins":"yes","payment:credit_cards":"no","payment:cryptocurrencies":"no","payment:debit_cards":"no","payment:electronic_purses":"no","payment:notes":"yes","smoking":"outside","source":"bing;survey;gps","source_ref:url":"https://www.flickr.com/photos/134902422@N04/map?&fLat=41.9559&fLon=19.4337&zl=11&order_by=recent","wheelchair":"limited"}}}'::jsonb, '1f03e4d704c7f5a4b20917cd6aa9d4a49744cbe311d20a335675936a8ed69629', 'Rudina', 'rudina', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0693733, 19.5137046, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:12607431ae6d23be51818ab9d25d291093847e93532eaacc849beb648b8a7655'),
('osm:way:748648347', 'https://www.openstreetmap.org/way/748648347', '{"provider":"openstreetmap","element":{"type":"way","id":748648347,"center":{"lat":41.344375,"lon":19.7621716},"tags":{"addr:city":"Tirana","addr:housenumber":"16","addr:street":"Rruga Vidhëgjat","amenity":"hospital","barrier":"wall","healthcare":"hospital","name":"Salus","wall":"dry_stone","website":"https://www.salus.al/"}}}'::jsonb, '945fc20c2955fe040e5bd9b094d6f65ad7f9f87e8ae6c538a741909682c498f2', 'Salus', 'salus', '16 Rruga Vidhëgjat', '16 Rruga Vidhëgjat, Tirana', 'Tirana', NULL, NULL, 'AL', 41.344375, 19.7621716, NULL, 'https://www.salus.al/', NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:6aea3b31bc920753a0d3a74fa1355d666ab8b5ce7d70bbee8c24c2c99f789e50'),
('osm:node:6857510985', 'https://www.openstreetmap.org/node/6857510985', '{"provider":"openstreetmap","element":{"type":"node","id":6857510985,"lat":41.3007992,"lon":19.5008197,"tags":{"amenity":"pharmacy","name":"Salus plus"}}}'::jsonb, 'a859deba8b5d764833ebdd92d6b2bdb22acb443dfe67628f120aa38a910eee5e', 'Salus plus', 'salus plus', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3007992, 19.5008197, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:7e5bdc85bd1c45952c2e64b7ccd9130ccbff5e6c822362323741f0fd243405c5'),
('osm:node:11023510040', 'https://www.openstreetmap.org/node/11023510040', '{"provider":"openstreetmap","element":{"type":"node","id":11023510040,"lat":41.2649188,"lon":19.5217124,"tags":{"amenity":"doctors","healthcare":"doctor","healthcare:speciality":"general","name":"Salutem"}}}'::jsonb, 'ef1d6cbd338ee6b9d605a489a84a847d0d059d8a9dfbf6592a5e28d8f680fd56', 'Salutem', 'salutem', NULL, NULL, NULL, NULL, NULL, 'AL', 41.2649188, 19.5217124, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:2d70e894add6170cf254e956283d381c4a231c80a71ac73805a3c4381baa2c24'),
('osm:way:531933875', 'https://www.openstreetmap.org/way/531933875', '{"provider":"openstreetmap","element":{"type":"way","id":531933875,"center":{"lat":42.0752251,"lon":19.5213203},"tags":{"amenity":"hospital","barrier":"wall","height":"3","name":"Sanatoriumi Shkoder"}}}'::jsonb, 'cb047ecb6b780237e6832fb9bffd107fd8a81b80aa2219d740f292485a5d11d6', 'Sanatoriumi Shkoder', 'sanatoriumi shkoder', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0752251, 19.5213203, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:8c7124cc9e443474172dea3bc926c703255be32eea915422b31a7df2ecc1516d'),
('osm:node:6416284307', 'https://www.openstreetmap.org/node/6416284307', '{"provider":"openstreetmap","element":{"type":"node","id":6416284307,"lat":40.6101668,"lon":20.7881963,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Sandri 2","wheelchair":"no"}}}'::jsonb, 'b24198674a9fa16dc38fb1d2c6374b269ead4a0af775b34bff1eb52a4ff692ca', 'Sandri 2', 'sandri 2', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6101668, 20.7881963, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:2d2fb1e41e995d1dd208f750ee721fbf68c48f535b6105821e012e977136c2a2'),
('osm:node:6848890544', 'https://www.openstreetmap.org/node/6848890544', '{"provider":"openstreetmap","element":{"type":"node","id":6848890544,"lat":40.4744596,"lon":19.4952312,"tags":{"amenity":"pharmacy","name":"Second hand","shop":"variety_store"}}}'::jsonb, '1b4672a29972c3453e52b02acdfee51331e65a4407f8b0f5f674d8bd748e0df0', 'Second hand', 'second hand', NULL, NULL, NULL, NULL, NULL, 'AL', 40.4744596, 19.4952312, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:2b4fd51c9439b5d37554bc18107e0e456e8659caa81c36ce573fc3b9818e842b'),
('osm:node:3387400137', 'https://www.openstreetmap.org/node/3387400137', '{"provider":"openstreetmap","element":{"type":"node","id":3387400137,"lat":42.0747676,"lon":19.5249312,"tags":{"amenity":"doctors","healthcare":"doctor","healthcare:speciality":"dermatology","name":"Sëmundjet e lëkurës","wheelchair":"limited"}}}'::jsonb, 'b4d926d099c14b9675dc369e3c23944a9cabcb4e755d3a050c4b24209ea3c281', 'Sëmundjet e lëkurës', 's mundjet e l kur s', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0747676, 19.5249312, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:8874946095807e585697dfff09462509eb000030c5a2ebc26b96e3ff3b77277d'),
('osm:node:4579940266', 'https://www.openstreetmap.org/node/4579940266', '{"provider":"openstreetmap","element":{"type":"node","id":4579940266,"lat":41.3389381,"lon":19.8313712,"tags":{"addr:city":"Tirana","addr:street":"Rruga e Dibrës","amenity":"clinic","healthcare":"clinic","name":"Sëmundjet Infektive","phone":"+35542363636;+35542349223;+35542349496","website":"https://www.qsut.gov.al/sherbimet-mjekesore/sektori-i-aktivitetit-mjekesor/sherbimi-i-semundjeve-infektive/"}}}'::jsonb, '134e7a913f18c710bee207530cbca39764861ffd669882b26aae577c8dc0e636', 'Sëmundjet Infektive', 's mundjet infektive', 'Rruga e Dibrës', 'Rruga e Dibrës, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3389381, 19.8313712, '+35542363636;+35542349223;+35542349496', 'https://www.qsut.gov.al/sherbimet-mjekesore/sektori-i-aktivitetit-mjekesor/sherbimi-i-semundjeve-infektive/', NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:ba0dcbaabe158045f70e489a8eb640c0648e6d728e1ee54c8fdadc56e1198945'),
('osm:node:8892368037', 'https://www.openstreetmap.org/node/8892368037', '{"provider":"openstreetmap","element":{"type":"node","id":8892368037,"lat":40.0832498,"lon":20.1424368,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Shehu"}}}'::jsonb, 'e94ed8f9fe1a405f1a0071a9cec03e5541dab25d0fda5ad6485ed29a142a16b0', 'Shehu', 'shehu', NULL, NULL, NULL, NULL, NULL, 'AL', 40.0832498, 20.1424368, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:da2383c03e2fd22abe5790df0ccb379fe63dd4ebe0f3f1f751fbde414423ece6'),
('osm:way:365105155', 'https://www.openstreetmap.org/way/365105155', '{"provider":"openstreetmap","element":{"type":"way","id":365105155,"center":{"lat":42.0561264,"lon":19.5600887},"tags":{"amenity":"doctors","building":"yes","name":"Sherbime Infermjerie","opening_hours":"Mo-Su 08:00-12:30,14:30-18:00","phone":"+355673892213","source":"Bing Aerial Imagery;survey","wheelchair":"yes"}}}'::jsonb, 'c96018cfeba43c1580eb386a902d39cb633b4bcb275723987d4f66dfa6995283', 'Sherbime Infermjerie', 'sherbime infermjerie', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0561264, 19.5600887, '+355673892213', NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:bab40c8a1a7f28c122ae3dccbcaae8192b198ab7f1be9c5af1f09455fd1b041d'),
('osm:node:3361843082', 'https://www.openstreetmap.org/node/3361843082', '{"provider":"openstreetmap","element":{"type":"node","id":3361843082,"lat":41.8641067,"lon":19.4227709,"tags":{"amenity":"clinic","name":"Shërbime Shëndetësore"}}}'::jsonb, 'd17016492a891f07552ca2c3c118a5c69395bcdb64f82eda4620fb114f10ea94', 'Shërbime Shëndetësore', 'sh rbime sh ndet sore', NULL, NULL, NULL, NULL, NULL, 'AL', 41.8641067, 19.4227709, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:1b1238eba725621ae715705300e35649c11b81891481ca507585991c75368032'),
('osm:way:484682732', 'https://www.openstreetmap.org/way/484682732', '{"provider":"openstreetmap","element":{"type":"way","id":484682732,"center":{"lat":42.0733149,"lon":19.5260011},"tags":{"addr:country":"AL","amenity":"hospital","barrier":"fence","fence_type":"wire","healthcare":"hospital","healthcare:speciality":"psychiatry","name":"Shërbimi i Shëndetit Mendor me Shtretër","name:en":"Psychiatric Hospital","source":"bing;mapbox-satellite;survey;gps;knowledge;local-info","source_ref:url":"https://www.flickr.com/photos/openstreetmap-albania","wheelchair":"limited"}}}'::jsonb, '3c1d8c403f160c2f22376ca8b6c108ed53d3e0e3b25db28ed1fb320f39e3cffb', 'Shërbimi i Shëndetit Mendor me Shtretër', 'sh rbimi i sh ndetit mendor me shtret r', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0733149, 19.5260011, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:1b1b59d6de48319840b83ab89895c2b387c7ff3e14779e4c3b2dcac68b7c8b61'),
('osm:node:8528477776', 'https://www.openstreetmap.org/node/8528477776', '{"provider":"openstreetmap","element":{"type":"node","id":8528477776,"lat":42.0694636,"lon":19.5018321,"tags":{"amenity":"pharmacy","name":"Shkodra Biomedicine"}}}'::jsonb, 'de36cc28673e494671552d044b1a8c1c627cd14edb517296fc5836cb0cce503a', 'Shkodra Biomedicine', 'shkodra biomedicine', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0694636, 19.5018321, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:df2ae1c35e8bde9d1581ee1a8e0f2403ace292da983df1b8816f52992b4991de'),
('osm:node:7021803564', 'https://www.openstreetmap.org/node/7021803564', '{"provider":"openstreetmap","element":{"type":"node","id":7021803564,"lat":40.7267197,"lon":19.5549281,"tags":{"amenity":"dentist","name":"Shpresa","phone":"+355 69 312 4410"}}}'::jsonb, 'b96777b37727bff1216a7eb16f9b269eeabf2808082b0dbe68149e0c75277c93', 'Shpresa', 'shpresa', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7267197, 19.5549281, '+355 69 312 4410', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:6a1e717a9b895f8c274cf798ee4d836c4e29b3c7456c032f38cf4c684bcbc514'),
('osm:node:10101347164', 'https://www.openstreetmap.org/node/10101347164', '{"provider":"openstreetmap","element":{"type":"node","id":10101347164,"lat":41.3305937,"lon":19.8182268,"tags":{"amenity":"pharmacy","check_date":"2022-10-14","healthcare":"pharmacy","name":"Sidi"}}}'::jsonb, '2299b081278f3cffe0fd7ee3dc3037e5187412ede0ce10dbbdd0b74b5719437d', 'Sidi', 'sidi', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3305937, 19.8182268, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:bdd935f49f7233b16ead3b3b8c89367c53293f6c20a56121a17970241be6e72c'),
('osm:node:13006239453', 'https://www.openstreetmap.org/node/13006239453', '{"provider":"openstreetmap","element":{"type":"node","id":13006239453,"lat":39.8647308,"lon":20.0169137,"tags":{"amenity":"pharmacy","name":"Sidi"}}}'::jsonb, '0ca8a01807fb61c9ec2e232f77a341613d7ba1fc929ecf697f20e6129fc7d522', 'Sidi', 'sidi', NULL, NULL, NULL, NULL, NULL, 'AL', 39.8647308, 20.0169137, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:b32b7dc7a00ff99bf644badc5e045127a9b870b8c9f9047d7876639e6618c5e6'),
('osm:node:10118570779', 'https://www.openstreetmap.org/node/10118570779', '{"provider":"openstreetmap","element":{"type":"node","id":10118570779,"lat":40.6216042,"lon":20.779206,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"SiDrit","phone":"+355 69 360 7407","wheelchair":"no"}}}'::jsonb, 'ddc812b5db1c5fa70e50dacad7beeb47f3afbb18de0b7748226c2ea49c28603a', 'SiDrit', 'sidrit', NULL, NULL, NULL, NULL, NULL, 'AL', 40.6216042, 20.779206, '+355 69 360 7407', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:0d27dc80b4fb17ee0636f442167ef90a467a46ee1a1f907d17eb2ff26fddb1a1'),
('osm:node:11228707952', 'https://www.openstreetmap.org/node/11228707952', '{"provider":"openstreetmap","element":{"type":"node","id":11228707952,"lat":41.3116208,"lon":19.43592,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Simaku Dental"}}}'::jsonb, 'b3ea394038abe829507808e399cc6fa5103920f57d67de9635fabc0c9fb0f4fb', 'Simaku Dental', 'simaku dental', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3116208, 19.43592, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:67df184120561b12570626b41c0f0b1e88e139e241d25e636745b46bcb5be439'),
('osm:node:7021783228', 'https://www.openstreetmap.org/node/7021783228', '{"provider":"openstreetmap","element":{"type":"node","id":7021783228,"lat":40.7278779,"lon":19.5557134,"tags":{"amenity":"pharmacy","name":"Sino","opening_hours":"Mo-Su 08:00-14:00,17:00-20:00","phone":"+355 68 260 0533"}}}'::jsonb, '4eb98e95f6d94f5dbd6e40d68c014d6760309652c66e5322ee9c531555ee4aff', 'Sino', 'sino', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7278779, 19.5557134, '+355 68 260 0533', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:d465a4b35346ed14d22330e0893ed1fcb8f3fb04e72be3d98b6e8b42a4882322'),
('osm:node:12095675773', 'https://www.openstreetmap.org/node/12095675773', '{"provider":"openstreetmap","element":{"type":"node","id":12095675773,"lat":41.3326795,"lon":19.8035023,"tags":{"addr:city":"Tirana","addr:street":"Sheshi Karl Topia","amenity":"doctors","healthcare":"doctor","healthcare:speciality":"dermatology","level":"4","name":"Skin Tech Derma Center"}}}'::jsonb, '66c5965413277a9a08bf8006153d295b8463dbbd810aaed94304997bcb871175', 'Skin Tech Derma Center', 'skin tech derma center', 'Sheshi Karl Topia', 'Sheshi Karl Topia, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3326795, 19.8035023, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:41947b9fe185b1f41ddf5815046e4a4198bc5bc961e6a6125613a44801487bdf');

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
