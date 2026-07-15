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
('osm:way:134725678', 'https://www.openstreetmap.org/way/134725678', '{"provider":"openstreetmap","element":{"type":"way","id":134725678,"center":{"lat":34.4376745,"lon":70.4465834},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Fatima-Tuh-Zohra Hospital"}}}'::jsonb, 'c089837c325eead7c4e80ce36faee0247e7064727ca8b0a39387d07a772ea741', 'Fatima-Tuh-Zohra Hospital', 'fatima tuh zohra hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.4376745, 70.4465834, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:a625b57f2a33b8d54a3a11b756e0f3cc517854cfb548f92522251d3cce25b43b'),
('osm:node:4628631282', 'https://www.openstreetmap.org/node/4628631282', '{"provider":"openstreetmap","element":{"type":"node","id":4628631282,"lat":34.4555866,"lon":65.9525382,"tags":{"amenity":"hospital","healthcare":"hospital","name":"Garam Ab Health Facility"}}}'::jsonb, '3b41f930f2b83b095335050a45e787ebf85764ccbc0fb91161aad1247bf6b136', 'Garam Ab Health Facility', 'garam ab health facility', NULL, NULL, NULL, NULL, NULL, 'AF', 34.4555866, 65.9525382, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:a5049d11e4e28e163a833d8b8702f6bebcbc2473026ecc8097d8040c3baa6527'),
('osm:relation:18506025', 'https://www.openstreetmap.org/relation/18506025', '{"provider":"openstreetmap","element":{"type":"relation","id":18506025,"center":{"lat":34.4273473,"lon":70.465915},"tags":{"amenity":"hospital","name":"General Police Hospital","type":"multipolygon"}}}'::jsonb, '0812092ab8f93866f0b3ec1340ed0298216e173df6d9ee10efedd07d588ef0d9', 'General Police Hospital', 'general police hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.4273473, 70.465915, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:12397a1737de0dcfe9285bb3f412b8363641f63215e6c363b137c8c55439ca98'),
('osm:way:560688405', 'https://www.openstreetmap.org/way/560688405', '{"provider":"openstreetmap","element":{"type":"way","id":560688405,"center":{"lat":34.8993436,"lon":69.3211876},"tags":{"amenity":"clinic","healthcare":"clinic","opening_hours":"24/7","operator":"Government"}}}'::jsonb, '5f1ffacd40d0df1b570889ede379e5512ccd923981364601fb0f1f33a974e773', 'Government', 'government', NULL, NULL, NULL, NULL, NULL, 'AF', 34.8993436, 69.3211876, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:a40b07506bd1912a42c83940281c22c56fb255c9ba1c2b80dd4d0b373db1862e'),
('osm:way:945178872', 'https://www.openstreetmap.org/way/945178872', '{"provider":"openstreetmap","element":{"type":"way","id":945178872,"center":{"lat":34.5093916,"lon":69.2348746},"tags":{"addr:city":"kabul","addr:housenumber":"3","addr:postcode":"1005","addr:street":"سرک کارته نو، ایستگاه سابقه","amenity":"hospital","emergency":"yes","healthcare":"hospital","healthcare:speciality":"dentistry;dental_oral_maxillo_facial_surgery;orthodontics;implant;endodontics;dental_clinic","name":"Habib Dental Clinic & Academy","operator":"Dental Clinic","operator:type":"private"}}}'::jsonb, '03b7c0625d6f9f7416b61122061631020ac20ba8c05984f6de085c1af00fa4c8', 'Habib Dental Clinic & Academy', 'habib dental clinic academy', '3 سرک کارته نو، ایستگاه سابقه', '3 سرک کارته نو، ایستگاه سابقه, kabul, 1005', 'kabul', NULL, '1005', 'AF', 34.5093916, 69.2348746, NULL, NULL, NULL, 'dental', ARRAY['dental', 'hospital', 'general_practitioner', 'specialist']::text[], 0.86, 'loc:eeb50ba9095e927628ec8228acaa2fb84619c848b4bcae030d5795efa0c0278b'),
('osm:node:13473421541', 'https://www.openstreetmap.org/node/13473421541', '{"provider":"openstreetmap","element":{"type":"node","id":13473421541,"lat":34.53906,"lon":69.1743298,"tags":{"amenity":"clinic","name":"Habib Rohani Medical Center"}}}'::jsonb, 'c483a1998b43fa0f573ba97f24afd34ef0f8c4e2ed3e9d5cf55ea47ca45c89c3', 'Habib Rohani Medical Center', 'habib rohani medical center', NULL, NULL, NULL, NULL, NULL, 'AF', 34.53906, 69.1743298, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:5801ce0a3fb0e2410c56af32da085aab952c4e735bdc388a10f3e4d7d0c45ebd'),
('osm:node:13518763157', 'https://www.openstreetmap.org/node/13518763157', '{"provider":"openstreetmap","element":{"type":"node","id":13518763157,"lat":34.5469448,"lon":69.1680619,"tags":{"amenity":"pharmacy","name":"Hamed Masoud Pharmacy"}}}'::jsonb, '7d6ba049802964d7a62f7f6a894ff62fa950c9badeedb050ee1c8b23a8d9d564', 'Hamed Masoud Pharmacy', 'hamed masoud pharmacy', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5469448, 69.1680619, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:b7258408cc6567f0a99d60ed6a0e51415fa005f33557e1cbe857194619d05b94'),
('osm:node:13597390826', 'https://www.openstreetmap.org/node/13597390826', '{"provider":"openstreetmap","element":{"type":"node","id":13597390826,"lat":33.3821681,"lon":70.0874998,"tags":{"addr:city":"khost","addr:housenumber":"1","addr:postcode":"2500","addr:street":"Lakan Tang tang madrassa","amenity":"clinic","contact:facebook":"https://www.facebook.com/HamidCurativeClinic100","email":"abdullah.hamid1571@gmail.com","healthcare":"clinic","healthcare:speciality":"general;paediatrics","mobile":"+93770812750","name":"Hamid Curative Clinic","name:ps":"حامد معالجوي کلینیک","opening_hours":"24/7","operator":"Dr Abdullah Hamid","operator:type":"private"}}}'::jsonb, 'c24fe231e2d7fb1a4cf434d66bf08a3601fd5e53ed40cb71a1b8ee8de0f58b08', 'Hamid Curative Clinic', 'hamid curative clinic', '1 Lakan Tang tang madrassa', '1 Lakan Tang tang madrassa, khost, 2500', 'khost', NULL, '2500', 'AF', 33.3821681, 70.0874998, NULL, NULL, 'abdullah.hamid1571@gmail.com', 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:3aea37b5be27a34973336c2276a08374a9c76d74baf8dd662b637e8b0108465e'),
('osm:node:7098057300', 'https://www.openstreetmap.org/node/7098057300', '{"provider":"openstreetmap","element":{"type":"node","id":7098057300,"lat":34.5449477,"lon":69.1667109,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Hareer Dental"}}}'::jsonb, '43b0233447587174474994e3ea3835e6a3662b4e77cc2e8f0935d47e6d64d9a8', 'Hareer Dental', 'hareer dental', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5449477, 69.1667109, NULL, NULL, NULL, 'dental', ARRAY['dental', 'general_practitioner']::text[], 0.78, 'loc:c2f41b0e78a12a6b720198c53e7332965e003d0d3891e76845e1629c016bbed5'),
('osm:node:13624663050', 'https://www.openstreetmap.org/node/13624663050', '{"provider":"openstreetmap","element":{"type":"node","id":13624663050,"lat":34.5437941,"lon":69.255681,"tags":{"amenity":"hospital","name":"Hayat Medical Hospital"}}}'::jsonb, '9e64b945c1dd4b84643942a82aef195456153f6a8accb4dc8e3579d12385f95e', 'Hayat Medical Hospital', 'hayat medical hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5437941, 69.255681, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:0565598661484a2bf9d3938687bc1fcdab0d8c11ef543a23ccbe9b1e9ddb061b'),
('osm:way:393630751', 'https://www.openstreetmap.org/way/393630751', '{"provider":"openstreetmap","element":{"type":"way","id":393630751,"center":{"lat":37.2198672,"lon":71.4383787},"tags":{"amenity":"doctors","building":"yes","name":"Health Post"}}}'::jsonb, 'a1eec3d5b6f986520d6cb93047ab5a1be94f123d5173f38be6559f80ce82d3ba', 'Health Post', 'health post', NULL, NULL, NULL, NULL, NULL, 'AF', 37.2198672, 71.4383787, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:cda247a2c14a00b91fe6450250c3cec3de898f0d0eabd34a18c7eeddd43aef83'),
('osm:way:395574472', 'https://www.openstreetmap.org/way/395574472', '{"provider":"openstreetmap","element":{"type":"way","id":395574472,"center":{"lat":36.5549323,"lon":71.3306768},"tags":{"amenity":"doctors","name":"Health Post"}}}'::jsonb, 'a106b0ebf5ea78be39ffcd669b1df92a124cbb596fad997ffe97e534cf71ea8a', 'Health Post', 'health post', NULL, NULL, NULL, NULL, NULL, 'AF', 36.5549323, 71.3306768, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:aa6c65327b138f13e83c7709b448e5fee40ae2a8f24a1b7b21904f90088d114d'),
('osm:node:1732053101', 'https://www.openstreetmap.org/node/1732053101', '{"provider":"openstreetmap","element":{"type":"node","id":1732053101,"lat":34.2929644,"lon":69.7971735,"tags":{"amenity":"hospital","emergency":"yes","fixme":"Is there anything here at all? there is nothing visible on satellite imageries!","name":"Hesarak Darmaltoon(Hesarak Hospital"}}}'::jsonb, '5d8846722271708da827cae95f3f70fc5388bf0a42a364298dec63e6cd39b620', 'Hesarak Darmaltoon(Hesarak Hospital', 'hesarak darmaltoon hesarak hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.2929644, 69.7971735, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:936a8fa7cc190d478a2d25e7dea623a7beedeeacfac193be809d1bd637524575'),
('osm:node:7222197913', 'https://www.openstreetmap.org/node/7222197913', '{"provider":"openstreetmap","element":{"type":"node","id":7222197913,"lat":34.5412862,"lon":69.1724305,"tags":{"amenity":"pharmacy","drive_through":"no","healthcare":"pharmacy","name":"Hosseini","name:fa":"حسینی"}}}'::jsonb, '8252f3bb26c19d79ffc2072e8fe9e3f58ac1aeb98bf23dd77a7b6e3995b8ec24', 'Hosseini', 'hosseini', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5412862, 69.1724305, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:a4099c8f2729737ab9447919cbddad8720fa5658120aecabe5e976b659a16145'),
('osm:node:13461819610', 'https://www.openstreetmap.org/node/13461819610', '{"provider":"openstreetmap","element":{"type":"node","id":13461819610,"lat":34.5410976,"lon":69.1726349,"tags":{"amenity":"pharmacy","name":"Hussaini Pharmacy"}}}'::jsonb, '67844ca95c0b7225f68865773be8158910a2087ac2c56a59564383a17eb18ac2', 'Hussaini Pharmacy', 'hussaini pharmacy', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5410976, 69.1726349, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:9aa5b30ac49e326cf919883e8fe12a5c6b917f4b683b7607745dee3d72254bca'),
('osm:node:5356128482', 'https://www.openstreetmap.org/node/5356128482', '{"provider":"openstreetmap","element":{"type":"node","id":5356128482,"lat":34.4362732,"lon":70.4356671,"tags":{"addr:city":"Police Station Zone # 3","addr:street":"Sehat Ama to Kabul Hada Road","amenity":"hospital","healthcare":"hospital","name":"Jalalabad medical complex"}}}'::jsonb, '259f87459b36851078e6cd1e465c44686b4052175a0e5521c6af57ea43690366', 'Jalalabad medical complex', 'jalalabad medical complex', 'Sehat Ama to Kabul Hada Road', 'Sehat Ama to Kabul Hada Road, Police Station Zone # 3', 'Police Station Zone # 3', NULL, NULL, 'AF', 34.4362732, 70.4356671, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:2639ade9797c4534e9b9302140df822a10c0e81dbd9c12127a81e03c1f35fcaa'),
('osm:way:123074497', 'https://www.openstreetmap.org/way/123074497', '{"provider":"openstreetmap","element":{"type":"way","id":123074497,"center":{"lat":34.4274686,"lon":70.4675804},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Jalalabad Medical Faculty"}}}'::jsonb, '390de12aa8ff47627e4c5e5c906cf9be077bd217918c62b47383cdd3acc9827c', 'Jalalabad Medical Faculty', 'jalalabad medical faculty', NULL, NULL, NULL, NULL, NULL, 'AF', 34.4274686, 70.4675804, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:f61b1062b465f9ec4c9084ee231ca0a9b3a6b89fa88b6d275530304e5bd499dd'),
('osm:way:122898375', 'https://www.openstreetmap.org/way/122898375', '{"provider":"openstreetmap","element":{"type":"way","id":122898375,"center":{"lat":34.4366341,"lon":70.4461739},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Jalalabad University Hospital"}}}'::jsonb, 'e11cecb0e052951c2054c9e1aa7e29da5e0860eecc7f7b0d94ae823d87ea0d4e', 'Jalalabad University Hospital', 'jalalabad university hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.4366341, 70.4461739, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:6a8be60b8f64598903d926c189f72c182a85ec7dc6e846cd24eff1274dfac4f0'),
('osm:node:13597205430', 'https://www.openstreetmap.org/node/13597205430', '{"provider":"openstreetmap","element":{"type":"node","id":13597205430,"lat":34.5347952,"lon":69.1378593,"tags":{"healthcare":"laboratory","name":"Kabul Atlas Radiology Center"}}}'::jsonb, '5398d1bff7bfbfbb4b1161ea76540dc7645c708e049b056107f33017fc0ec0fe', 'Kabul Atlas Radiology Center', 'kabul atlas radiology center', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5347952, 69.1378593, NULL, NULL, NULL, 'lab', ARRAY['lab', 'imaging']::text[], 0.78, 'loc:32fdecb75acb178a8c05a1f3cae01e8ee024f64d652bd84790feb85d76f42e87'),
('osm:way:1094686381', 'https://www.openstreetmap.org/way/1094686381', '{"provider":"openstreetmap","element":{"type":"way","id":1094686381,"center":{"lat":34.534724,"lon":69.1295548},"tags":{"addr:city":"Kabul","addr:postcode":"1011","addr:street":"Badam Bagh Road","amenity":"hospital","healthcare":"hospital","name":"Kaim Hospital","name:fa":"شفاخانه کیم"}}}'::jsonb, 'a6f48ec9deca392b8c8b06fbd55eaf1392a0494c7750647f473d8289873262d1', 'Kaim Hospital', 'kaim hospital', 'Badam Bagh Road', 'Badam Bagh Road, Kabul, 1011', 'Kabul', NULL, '1011', 'AF', 34.534724, 69.1295548, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:8138335fbd7c87d73745ffb9eb0fc0f6a69a89fa42c8e00d9948b0edefd42441'),
('osm:way:124019838', 'https://www.openstreetmap.org/way/124019838', '{"provider":"openstreetmap","element":{"type":"way","id":124019838,"center":{"lat":34.4465073,"lon":70.5548809},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Kama District Hospital"}}}'::jsonb, '8f70ba2683a2f2f64a76a88b2565dafcf0e45ddce8a324828d739122b5c37105', 'Kama District Hospital', 'kama district hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.4465073, 70.5548809, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:23e663edeeed724ac5c4515cb1ebaf406ba419225c268a0fb4ecd55fd4daf2d3'),
('osm:node:1472171934', 'https://www.openstreetmap.org/node/1472171934', '{"provider":"openstreetmap","element":{"type":"node","id":1472171934,"lat":34.8323299,"lon":67.7876911,"tags":{"amenity":"hospital","name":"Kart-e-Sulh Health Clinic (Shuhada.Org)"}}}'::jsonb, 'f227968d0210018dd72cb61a2386b4c7051813581e1d4cecaaeb23e0b4e18b44', 'Kart-e-Sulh Health Clinic (Shuhada.Org)', 'kart e sulh health clinic shuhada org', NULL, NULL, NULL, NULL, NULL, 'AF', 34.8323299, 67.7876911, NULL, NULL, NULL, 'hospital', ARRAY['hospital', 'general_practitioner']::text[], 0.78, 'loc:5c5fee5d90bd272a5e11cae162d6afbbc6342f9d5db487db7c62b50b33333030'),
('osm:node:11573258307', 'https://www.openstreetmap.org/node/11573258307', '{"provider":"openstreetmap","element":{"type":"node","id":11573258307,"lat":31.5948982,"lon":64.3751757,"tags":{"addr:city":"Lashkargah","addr:postcode":"3901","amenity":"clinic","healthcare":"clinic","healthcare:speciality":"general","name":"Karta E Lagan Clinic","opening_hours":"24/7","operator":"Government","operator:type":"government"}}}'::jsonb, '4567e2a69c2a807e9f2ff7f98b411eec95733375708b1735002c883ea26dceba', 'Karta E Lagan Clinic', 'karta e lagan clinic', NULL, 'Lashkargah, 3901', 'Lashkargah', NULL, '3901', 'AF', 31.5948982, 64.3751757, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:7f95b2d2537d46e3aac1b0b0b91a62ac58fed7a8073ea53dee4d65f8b096d695'),
('osm:node:4628588406', 'https://www.openstreetmap.org/node/4628588406', '{"provider":"openstreetmap","element":{"type":"node","id":4628588406,"lat":34.4630446,"lon":66.5182695,"tags":{"amenity":"hospital","healthcare":"hospital","name":"Kerman HF"}}}'::jsonb, '5c82efdfd07abab967577d9d4a7649d3e6c7d3bd70c4983cf75371d1ef7f3afb', 'Kerman HF', 'kerman hf', NULL, NULL, NULL, NULL, NULL, 'AF', 34.4630446, 66.5182695, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:8ce4d16efda30cd3b7f8d82abd02d050f90e16b8b45b0c876d1ef582e12d68d4'),
('osm:node:10762340306', 'https://www.openstreetmap.org/node/10762340306', '{"provider":"openstreetmap","element":{"type":"node","id":10762340306,"lat":34.5046281,"lon":69.1495179,"tags":{"addr:city":"Kabul","addr:street":"سرک دارالامان","amenity":"hospital","healthcare":"hospital","name":"Khataman nabiyin"}}}'::jsonb, 'ffe5f509115c31df1c28cc492cdce5da2d16e8a5e378c33aee83444747ba4b5c', 'Khataman nabiyin', 'khataman nabiyin', 'سرک دارالامان', 'سرک دارالامان, Kabul', 'Kabul', NULL, NULL, 'AF', 34.5046281, 69.1495179, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:d968ce40593bf7610e1a7748fa0aa09c22984bcfc0d45386fd985cd9cdd12ac5'),
('osm:way:558704281', 'https://www.openstreetmap.org/way/558704281', '{"provider":"openstreetmap","element":{"type":"way","id":558704281,"center":{"lat":33.3440692,"lon":69.858299},"tags":{"amenity":"pharmacy","name":"Khost Civil Hospital"}}}'::jsonb, 'fb7ead3f68d6ee6086310bb6972afce2c447e84379a48e3abf01a87fafe3025d', 'Khost Civil Hospital', 'khost civil hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 33.3440692, 69.858299, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination', 'hospital']::text[], 0.78, 'loc:3fad148a5a163de6840908a8a9ba9d00f4af66b48afbb847ab150cbbfa191436'),
('osm:way:1330352234', 'https://www.openstreetmap.org/way/1330352234', '{"provider":"openstreetmap","element":{"type":"way","id":1330352234,"center":{"lat":36.7177059,"lon":68.8622509},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Kunduz MSF Trauma Centre","name:de":"MSF-Traumazentrum Kundus","name:en":"Kunduz MSF Trauma Centre","name:es":"Centro de Trauma de MSF Kunduz"}}}'::jsonb, '0af6d826daa2454ab6114f7550c2902a958c2dab931de00a2a41f3198adffd0b', 'Kunduz MSF Trauma Centre', 'kunduz msf trauma centre', NULL, NULL, NULL, NULL, NULL, 'AF', 36.7177059, 68.8622509, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:4a15c96273a4714e31b388f119490597fcc5140ed371de493dc81e0e096e902c'),
('osm:way:784917719', 'https://www.openstreetmap.org/way/784917719', '{"provider":"openstreetmap","element":{"type":"way","id":784917719,"center":{"lat":34.5017022,"lon":66.2826372},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Lal District Hospital"}}}'::jsonb, '076102b01de2a1bac47637368a063743e59cb267d83c916b008ae1a74a3c45c2', 'Lal District Hospital', 'lal district hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5017022, 66.2826372, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:f972b643bfd7e7df9a2945f13aae31583eab00e16298aeee208db983a989d07f'),
('osm:way:395492307', 'https://www.openstreetmap.org/way/395492307', '{"provider":"openstreetmap","element":{"type":"way","id":395492307,"center":{"lat":36.5306888,"lon":71.3450883},"tags":{"amenity":"doctors","building":"yes","name":"Livestock Clinic"}}}'::jsonb, '2ac8a6d21daf63beff170235dca3340754c89fc959067dcff5f01ade9b228800', 'Livestock Clinic', 'livestock clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 36.5306888, 71.3450883, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:178e49682f6d3e7540455f1b579f9e6aee5982368d01ebaf941b5a38f0724926'),
('osm:node:13597177286', 'https://www.openstreetmap.org/node/13597177286', '{"provider":"openstreetmap","element":{"type":"node","id":13597177286,"lat":34.5449844,"lon":69.1587956,"tags":{"amenity":"pharmacy","name":"M. S. Hashimi Pharmacy"}}}'::jsonb, '6c9ccf51494f5748bde014425fb0537c786e67847727564d622290bd394778c1', 'M. S. Hashimi Pharmacy', 'm s hashimi pharmacy', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5449844, 69.1587956, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:82a7b2cf6443d9be739f6ae25f685f7ac8a78315c9033e5e41f5a3e8565e939d'),
('osm:node:12360986400', 'https://www.openstreetmap.org/node/12360986400', '{"provider":"openstreetmap","element":{"type":"node","id":12360986400,"lat":34.5539674,"lon":69.1494378,"tags":{"amenity":"hospital","fixme":"resurvey","name":"Mahtab hospital"}}}'::jsonb, 'bfd943624ea2d157f19b51535f1e80a3ddb8aec045a5e0e4cfdc488a04de9257', 'Mahtab hospital', 'mahtab hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5539674, 69.1494378, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:e36b1f983db6beea19eff9a42f23dae0eccf91a0942da5cef39c955e0e1b362b'),
('osm:node:11576349800', 'https://www.openstreetmap.org/node/11576349800', '{"provider":"openstreetmap","element":{"type":"node","id":11576349800,"lat":31.6020715,"lon":64.3718922,"tags":{"addr:city":"Lashkargah","addr:postcode":"3901","amenity":"hospital","emergency":"yes","healthcare":"hospital","healthcare:speciality":"general","name":"Malika Suraya Hospital","operator":"Government","operator:type":"government"}}}'::jsonb, '5576878c42eb1257664e82ade875dedf4a8fc1e29d36f2cad7f1bd5d4207b116', 'Malika Suraya Hospital', 'malika suraya hospital', NULL, 'Lashkargah, 3901', 'Lashkargah', NULL, '3901', 'AF', 31.6020715, 64.3718922, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:597273fc8d73191d7d778fa8e8abb4611c9c59fc5b304cd0996c92830e2c9c9a'),
('osm:way:904401225', 'https://www.openstreetmap.org/way/904401225', '{"provider":"openstreetmap","element":{"type":"way","id":904401225,"center":{"lat":33.6090064,"lon":69.3046087},"tags":{"amenity":"clinic","healthcare":"clinic","healthcare:speciality":"general","name":"Melon Clinic","name:ps":"د میلن روغتون"}}}'::jsonb, '37deff390582ad27be3cb09c47f7a22d66ef77fa2b8d808b201561b52fdded9f', 'Melon Clinic', 'melon clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 33.6090064, 69.3046087, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:6c83dcefaed787808acc076d1c016f4aeebdb8a50802fd64a934f93c1aa959d8'),
('osm:node:1670191607', 'https://www.openstreetmap.org/node/1670191607', '{"provider":"openstreetmap","element":{"type":"node","id":1670191607,"lat":34.4215028,"lon":70.4367583,"tags":{"amenity":"hospital","healthcare":"hospital","name":"Mental Hospital"}}}'::jsonb, '93332a606dba34f4feb92481a5fb251b477b0a687509de0c12c94e738c0ebbdc', 'Mental Hospital', 'mental hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.4215028, 70.4367583, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:d01648ab3c71fc16ae8ed2c3f7941ec8de0dff2b5f56e678474073aad58700bd'),
('osm:way:131362645', 'https://www.openstreetmap.org/way/131362645', '{"provider":"openstreetmap","element":{"type":"way","id":131362645,"center":{"lat":34.2109015,"lon":70.486803},"tags":{"amenity":"hospital","building":"yes","health_facility:type":"hospital","health_specialty:psychiatry":"main","healthcare":"hospital","name":"Mental Hospital"}}}'::jsonb, 'e0bd9ce0f31a5763f40db7fff580de85854e294519ea96dda30630f88e78de04', 'Mental Hospital', 'mental hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.2109015, 70.486803, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:f887bcaa7155bed107c3232b3e93cff40e4c1e8ded4d2d927d7c79e8ccc44cbd'),
('osm:way:121880018', 'https://www.openstreetmap.org/way/121880018', '{"provider":"openstreetmap","element":{"type":"way","id":121880018,"center":{"lat":34.4363219,"lon":70.4372681},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Mental Hospital-JAA"}}}'::jsonb, '62e1379908313ae190ef6d1f3facf3b0d38c1f173e4b389cc7f04698f22ada30', 'Mental Hospital-JAA', 'mental hospital jaa', NULL, NULL, NULL, NULL, NULL, 'AF', 34.4363219, 70.4372681, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:e1061d8f518fed16d77aeff137a87cc024c0d1df206ba5272f0a5204c35f1353'),
('osm:way:1039681818', 'https://www.openstreetmap.org/way/1039681818', '{"provider":"openstreetmap","element":{"type":"way","id":1039681818,"center":{"lat":33.1763233,"lon":68.7309422},"tags":{"amenity":"clinic","healthcare":"clinic","name":"Mohammad Khill Clinic","operator":"Ministry of Public Health","operator:type":"public"}}}'::jsonb, '8aa100276925cbffd9df0d8a31e45058e02f757dfc81c5e897787fe7a0a1df2b', 'Mohammad Khill Clinic', 'mohammad khill clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 33.1763233, 68.7309422, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:743e05ffef0086654d38a2bb894d4d0d5c9729db9ad830cc0a4c919e34add09e'),
('osm:way:1212686468', 'https://www.openstreetmap.org/way/1212686468', '{"provider":"openstreetmap","element":{"type":"way","id":1212686468,"center":{"lat":33.1521817,"lon":67.5466382},"tags":{"amenity":"hospital","name":"Mohammd Rasolulah","name:fa":"(ص)شفاخانه محمد رسول الله"}}}'::jsonb, 'bb0533f77ca3bbf2e84f39827756b3e1a1d39c61d953c64847331ee631d0d7f0', 'Mohammd Rasolulah', 'mohammd rasolulah', NULL, NULL, NULL, NULL, NULL, 'AF', 33.1521817, 67.5466382, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:2f27c535fcf4fbd9f9e22ac4d3585b9331b7b8153c5e821cdc8ccf0a27c22813'),
('osm:way:388657576', 'https://www.openstreetmap.org/way/388657576', '{"provider":"openstreetmap","element":{"type":"way","id":388657576,"center":{"lat":31.6116891,"lon":65.6852724},"tags":{"amenity":"hospital","emergency":"yes","healthcare":"hospital","name":"Momand Hospital"}}}'::jsonb, '09ad21ecd8b6bba1e9ac8f5d855ad5ee7cbac67a389a79d4b98537325b4269cc', 'Momand Hospital', 'momand hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 31.6116891, 65.6852724, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:a84567bec04f339b29f2351b81f1b5eb0e214046b62b4ebf7801e87f3fe393c8'),
('osm:node:13518415800', 'https://www.openstreetmap.org/node/13518415800', '{"provider":"openstreetmap","element":{"type":"node","id":13518415800,"lat":34.5258046,"lon":69.1704605,"tags":{"amenity":"pharmacy","name":"Mustafa Noori Pharmacy"}}}'::jsonb, 'c978b4c732ec74087bdc1ca5f71b915e9528eaaaa1da320805cdad43e0a548be', 'Mustafa Noori Pharmacy', 'mustafa noori pharmacy', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5258046, 69.1704605, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:112b8321b29504dec72c10fdf11fb010f2b755f976f973f61a4ae3d6cc80a0ec'),
('osm:way:122372219', 'https://www.openstreetmap.org/way/122372219', '{"provider":"openstreetmap","element":{"type":"way","id":122372219,"center":{"lat":34.4170744,"lon":70.4305575},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Nangarhar Nishtar Kidny Hospital"}}}'::jsonb, 'd80acdd6e709562ec03e12f8efd8fcba7d2f08bd7457942b5fbce9114d029406', 'Nangarhar Nishtar Kidny Hospital', 'nangarhar nishtar kidny hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.4170744, 70.4305575, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:2911364d5c2f950c912b8e1fecd008a16c70ea14d44f1081cf972c42115a0d88'),
('osm:way:461340476', 'https://www.openstreetmap.org/way/461340476', '{"provider":"openstreetmap","element":{"type":"way","id":461340476,"center":{"lat":33.8290957,"lon":69.8771522},"tags":{"addr:city":"Chamkani","addr:postcode":"02258","addr:street":"Nargasi Road","amenity":"hospital","name":"Nargasi First AIED Houspital"}}}'::jsonb, 'd97f36fff030e6f0f9bbb60f30ac9b247300c60bb6525488091ac2cd046bfaba', 'Nargasi First AIED Houspital', 'nargasi first aied houspital', 'Nargasi Road', 'Nargasi Road, Chamkani, 02258', 'Chamkani', NULL, '02258', 'AF', 33.8290957, 69.8771522, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:eb13ff6151c81cbbd05a987946093ecb4e8ffd0f2102dd3b6ee09caf145c48d2'),
('osm:way:795878947', 'https://www.openstreetmap.org/way/795878947', '{"provider":"openstreetmap","element":{"type":"way","id":795878947,"center":{"lat":34.5411528,"lon":69.1690247},"tags":{"addr:housenumber":"287","addr:street":"سرک 3","amenity":"hospital","building":"yes","healthcare":"hospital","name":"Nazo Ana OBGY Clinic","name:fa":"شفاخانه نسایی ولادی نازو انا","wheelchair":"yes"}}}'::jsonb, '8b2ee6f2a733bc2609eff233290d941f7948d3a09123ad9cbbc0226541c72030', 'Nazo Ana OBGY Clinic', 'nazo ana obgy clinic', '287 سرک 3', '287 سرک 3', NULL, NULL, NULL, 'AF', 34.5411528, 69.1690247, NULL, NULL, NULL, 'hospital', ARRAY['hospital', 'general_practitioner']::text[], 0.86, 'loc:a97564877555af3c3847fa7f4447656f1ed94a408d8169b2d9267cc4e76e75a2'),
('osm:node:13536544504', 'https://www.openstreetmap.org/node/13536544504', '{"provider":"openstreetmap","element":{"type":"node","id":13536544504,"lat":34.5301121,"lon":69.1571955,"tags":{"amenity":"hospital","name":"Nesa Maternity Hospital"}}}'::jsonb, '8bdbb36fb776b6a6ddcab6d09141ee50c7c9e62143a4343d5b8c148154072d40', 'Nesa Maternity Hospital', 'nesa maternity hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5301121, 69.1571955, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:5ddf715e826e077bce9da200d9e9c51a68d99dd2c733b49899effe301b43ef96'),
('osm:node:13597223060', 'https://www.openstreetmap.org/node/13597223060', '{"provider":"openstreetmap","element":{"type":"node","id":13597223060,"lat":34.5343488,"lon":69.133874,"tags":{"healthcare":"laboratory","name":"Noor Rahman Medical Laboratory"}}}'::jsonb, '25f6542e5ad9a2fe97c9d6c30558123336ad0c2be77f60569670bd1d0214cad0', 'Noor Rahman Medical Laboratory', 'noor rahman medical laboratory', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5343488, 69.133874, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:8bc880930b924b00ddc706280608407243edf5f9268e27770701708debf65e28'),
('osm:way:669475976', 'https://www.openstreetmap.org/way/669475976', '{"provider":"openstreetmap","element":{"type":"way","id":669475976,"center":{"lat":34.829569,"lon":67.8346876},"tags":{"addr:street":"Bayan herat road","amenity":"hospital","emergency":"yes","healthcare":"hospital","healthcare:speciality":"surgery;general","name":"Old Bamyan Hospital"}}}'::jsonb, '5388f47c6b2768782fadbd8b0fbc9bf9ce7920af7f1bee788bbf2d18fa021759', 'Old Bamyan Hospital', 'old bamyan hospital', 'Bayan herat road', 'Bayan herat road', NULL, NULL, NULL, 'AF', 34.829569, 67.8346876, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:79d0cc80a95f78ff670a0d3f96a8cefa398c92639ccfd6412cbf186a54f83aec'),
('osm:way:127503551', 'https://www.openstreetmap.org/way/127503551', '{"provider":"openstreetmap","element":{"type":"way","id":127503551,"center":{"lat":34.5145615,"lon":69.17234},"tags":{"amenity":"hospital","building":"hospital","healthcare":"hospital","name":"Ploeclinic Markazai & Eye Center"}}}'::jsonb, '9915499dde987dcc06a153905a0d6ae07b91d2654875dfafe9c6e46958b1bb1d', 'Ploeclinic Markazai & Eye Center', 'ploeclinic markazai eye center', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5145615, 69.17234, NULL, NULL, NULL, 'hospital', ARRAY['hospital', 'general_practitioner']::text[], 0.78, 'loc:1c1f283d6cdd82396b62f32170a3b40f064965c04f322952417c3b79b5b5c2d8'),
('osm:way:968572467', 'https://www.openstreetmap.org/way/968572467', '{"provider":"openstreetmap","element":{"type":"way","id":968572467,"center":{"lat":35.9381269,"lon":68.7159261},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Pul e khumery Hospital","operator":"Hospital"}}}'::jsonb, '9173ad2f560384de425dc2489a92b07512114611ac26beba3987b99fe61890a7', 'Pul e khumery Hospital', 'pul e khumery hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 35.9381269, 68.7159261, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:6d3f6be56bc9170ffc819ed93e7c2f3c6931c5d73a762955e4ce79f02b0f1569'),
('osm:node:13597179758', 'https://www.openstreetmap.org/node/13597179758', '{"provider":"openstreetmap","element":{"type":"node","id":13597179758,"lat":34.5300654,"lon":69.1055547,"tags":{"amenity":"dentist","name":"Q-Dent"}}}'::jsonb, '5b07d0b16dd082903da582f21de7dbea9ba726fd1d9b1f50e474deba040a274f', 'Q-Dent', 'q dent', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5300654, 69.1055547, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:ceb7ec9f304a5eaf41883a786a30ca185c5cad320cbce20e72a8be5d21ac882d'),
('osm:node:13536567291', 'https://www.openstreetmap.org/node/13536567291', '{"provider":"openstreetmap","element":{"type":"node","id":13536567291,"lat":34.5328574,"lon":69.1424844,"tags":{"amenity":"pharmacy","name":"R Sharf Pharmacy"}}}'::jsonb, '9887567811ad2e0aba813d95164529ca10d8b9ed8b79f889deb9028e989a7d44', 'R Sharf Pharmacy', 'r sharf pharmacy', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5328574, 69.1424844, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:3b54772c2e3aa573f393a2d1d01d16afc0328a44b892485fbf9d719b85d2f6a1');

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
