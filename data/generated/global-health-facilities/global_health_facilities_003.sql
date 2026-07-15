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
('osm:way:1093349306', 'https://www.openstreetmap.org/way/1093349306', '{"provider":"openstreetmap","element":{"type":"way","id":1093349306,"center":{"lat":34.5019639,"lon":69.0833091},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Ramoz Eys Hospital"}}}'::jsonb, '5fcf7eed00e540032d5c39d9fee6744d3bcbfc27ca48a7c0d395d9f35de54155', 'Ramoz Eys Hospital', 'ramoz eys hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5019639, 69.0833091, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:9746312e9532a453ddb57590faa66865a2dd8edb310e187ab08b500b28151062'),
('osm:node:13463928157', 'https://www.openstreetmap.org/node/13463928157', '{"provider":"openstreetmap","element":{"type":"node","id":13463928157,"lat":34.5329867,"lon":69.1427268,"tags":{"healthcare":"laboratory","name":"Rana Medical Lab"}}}'::jsonb, 'c4d00afaf2f9d6cc06435ebf335ef7167b8736b8387433adedf95c7ad9f121c2', 'Rana Medical Lab', 'rana medical lab', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5329867, 69.1427268, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:a515b1b591410e06d5a5af22eaf72e5ddec16f0b30953939f2018d6e5576d220'),
('osm:node:13523518133', 'https://www.openstreetmap.org/node/13523518133', '{"provider":"openstreetmap","element":{"type":"node","id":13523518133,"lat":34.5362903,"lon":69.1595518,"tags":{"amenity":"dentist","name":"Rasooli Dental Center"}}}'::jsonb, 'a7b94e37ce87ee222942a497e8f3423ee8584e85fff15034ba57ec26c4b237a2', 'Rasooli Dental Center', 'rasooli dental center', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5362903, 69.1595518, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:8a60ff0bd62a28a9cf4308a69b3695b2399611df86796607c014cb18b2a7a5cd'),
('osm:node:1447844112', 'https://www.openstreetmap.org/node/1447844112', '{"provider":"openstreetmap","element":{"type":"node","id":1447844112,"lat":34.2570657,"lon":70.5678939,"tags":{"amenity":"hospital","name":"Rdat Hospital"}}}'::jsonb, '67285222e7840de5fc1aa77c953321c27289945d4f754046e24c559c34930f12', 'Rdat Hospital', 'rdat hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.2570657, 70.5678939, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:a27aae8e1f230e90f17ed0a75acb6ffd1f3acf8015ab455883926cf895f16956'),
('osm:way:134726351', 'https://www.openstreetmap.org/way/134726351', '{"provider":"openstreetmap","element":{"type":"way","id":134726351,"center":{"lat":34.4371657,"lon":70.4357901},"tags":{"addr:city":"jalalabad","addr:street":"Jalalabad Kabul Road","amenity":"hospital","emergency":"yes","healthcare":"hospital","healthcare:speciality":"general","name":"Red Cross Hospital","operator":"Red Cross","phone":"+93799672625"}}}'::jsonb, 'fee910b92b6b5b6a09b5d2dc36ae21de33c733ceae1b4f065dfcbe10250e4b20', 'Red Cross Hospital', 'red cross hospital', 'Jalalabad Kabul Road', 'Jalalabad Kabul Road, jalalabad', 'jalalabad', NULL, NULL, 'AF', 34.4371657, 70.4357901, '+93799672625', NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:3d7f561e0b797f3abe9ac17ea01fd9ef009896a11e0d6f0890a39002a624a286'),
('osm:node:8609467923', 'https://www.openstreetmap.org/node/8609467923', '{"provider":"openstreetmap","element":{"type":"node","id":8609467923,"lat":33.8898278,"lon":66.8773401,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Robat Miramoor Clinic","name:en":"Robat Health Center","name:fa":"کلینیک رباط میرامور"}}}'::jsonb, 'cff5a6cbfbf835bc78e9b1219bceb8b236b458f1ad3042c149994b372871c3eb', 'Robat Miramoor Clinic', 'robat miramoor clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 33.8898278, 66.8773401, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:593d8603b04181a865aaebbf5038691d0e7e66e4b60763cdef6b2367b20fc4ad'),
('osm:node:5356117636', 'https://www.openstreetmap.org/node/5356117636', '{"provider":"openstreetmap","element":{"type":"node","id":5356117636,"lat":34.4387154,"lon":70.439272,"tags":{"addr:street":"Kabul-Jalalabad Road","amenity":"hospital","description":"its a medical university and hospital","healthcare":"hospital","name":"Rokhan University and hospital"}}}'::jsonb, '26284f6f8607add531d67d68eee8124d9eaa02c296a0b6801b9b91511b3de957', 'Rokhan University and hospital', 'rokhan university and hospital', 'Kabul-Jalalabad Road', 'Kabul-Jalalabad Road', NULL, NULL, NULL, 'AF', 34.4387154, 70.439272, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:eabc4554d5b10eb8cf1245129ff963c5cd1c9a82b63a00bae162805c07b41f73'),
('osm:node:4628636911', 'https://www.openstreetmap.org/node/4628636911', '{"provider":"openstreetmap","element":{"type":"node","id":4628636911,"lat":34.6598646,"lon":66.3340308,"tags":{"amenity":"hospital","healthcare":"hospital","name":"Safed Ab HF"}}}'::jsonb, '7377f3f8efb048c248273bb3aa3813ae8afb65c5cdd1685912d4b216bb03bdfb', 'Safed Ab HF', 'safed ab hf', NULL, NULL, NULL, NULL, NULL, 'AF', 34.6598646, 66.3340308, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:932fc3a43f74d4766dea370bbe2d0eb83f96a3b12eff406f7382cbcf9d2fece3'),
('osm:node:13597226506', 'https://www.openstreetmap.org/node/13597226506', '{"provider":"openstreetmap","element":{"type":"node","id":13597226506,"lat":34.5321722,"lon":69.121451,"tags":{"amenity":"dentist","name":"Safi Dental Complex"}}}'::jsonb, '56a5ef9dfbe6db4487a79045a337377e6997cb49f020157ea2a49ab324357db6', 'Safi Dental Complex', 'safi dental complex', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5321722, 69.121451, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:c699c047f00e0ab6c71d6c60b232fd728f45430155c031dc7411555a79e9d205'),
('osm:way:130518714', 'https://www.openstreetmap.org/way/130518714', '{"provider":"openstreetmap","element":{"type":"way","id":130518714,"center":{"lat":34.2713291,"lon":70.3530114},"tags":{"healthcare":"clinic","name":"Sajad Health Clinic"}}}'::jsonb, '44cd1cb83a2427e493b8b83dda27e634884a1965fea4da73a92926d36f8fdce3', 'Sajad Health Clinic', 'sajad health clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 34.2713291, 70.3530114, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:9a8b6c7fee7f69b262c9ba0aacc7749f295e579edf44a1b19817709596a6ad86'),
('osm:node:13463915784', 'https://www.openstreetmap.org/node/13463915784', '{"provider":"openstreetmap","element":{"type":"node","id":13463915784,"lat":34.5265847,"lon":69.169203,"tags":{"amenity":"hospital","name":"Sajed Barakzai Speciality Hospital"}}}'::jsonb, 'a63b425d7ac412b9f36e71e4d9b16d58c18b976e11a0c0434a88e9e70ef69359', 'Sajed Barakzai Speciality Hospital', 'sajed barakzai speciality hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5265847, 69.169203, NULL, NULL, NULL, 'hospital', ARRAY['hospital', 'specialist']::text[], 0.78, 'loc:5f3d27a2cedd517e2e1160e74af9dc32e43e8e25eb5110422c844aecaec3c20f'),
('osm:node:13463900037', 'https://www.openstreetmap.org/node/13463900037', '{"provider":"openstreetmap","element":{"type":"node","id":13463900037,"lat":34.5333449,"lon":69.1414571,"tags":{"amenity":"dentist","name":"Salem Dental Care"}}}'::jsonb, 'dd6c9a715b2cb963bbf07940b8cb931fc86db988664e3185444c1957922c6733', 'Salem Dental Care', 'salem dental care', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5333449, 69.1414571, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:6e7ff55cc11ca87e195cc8afa58adfc03147fd3406f8cf32495b152a2830d6a7'),
('osm:node:13597152439', 'https://www.openstreetmap.org/node/13597152439', '{"provider":"openstreetmap","element":{"type":"node","id":13597152439,"lat":34.5313155,"lon":69.1162666,"tags":{"amenity":"hospital","name":"Sami Hospital"}}}'::jsonb, 'fea761cc3fe0b94e63b9c0d0e8bc51f25162cb6b5e9ac836633058933df08d9b', 'Sami Hospital', 'sami hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5313155, 69.1162666, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:6a44804f2462af55091d09c12edbbb5851ff8a56dddbf797f42c0288fde73914'),
('osm:node:13596746668', 'https://www.openstreetmap.org/node/13596746668', '{"provider":"openstreetmap","element":{"type":"node","id":13596746668,"lat":33.6088909,"lon":66.3142057,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Sarf Clinic"}}}'::jsonb, 'ca7de5f7ecacf15ce1cc9d3fe4c0d37a84c950e8e7858ce537e1629995eea414', 'Sarf Clinic', 'sarf clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 33.6088909, 66.3142057, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:bea8120f3f796d286d0998153177d349c7f66aabc01ea6faf9b61d430a3b1b6c'),
('osm:way:121878839', 'https://www.openstreetmap.org/way/121878839', '{"provider":"openstreetmap","element":{"type":"way","id":121878839,"center":{"lat":34.4377261,"lon":70.4379976},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Sehat-Ama Hospital"}}}'::jsonb, 'fc03baa8cb96b990bafba12c0d33b5961452701d659742acc706361be607b1c0', 'Sehat-Ama Hospital', 'sehat ama hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.4377261, 70.4379976, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:0308503a6953dadf014c346babce2f523a200928fc042b8ee54e6e2de336e009'),
('osm:node:1513950686', 'https://www.openstreetmap.org/node/1513950686', '{"provider":"openstreetmap","element":{"type":"node","id":1513950686,"lat":34.0905971,"lon":70.6646664,"tags":{"amenity":"hospital","name":"Shadal Health Clinic"}}}'::jsonb, 'de21cfd42b57f51ef6bd65320f029c45774c96c107110dec2ac91cb5a17d7114', 'Shadal Health Clinic', 'shadal health clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 34.0905971, 70.6646664, NULL, NULL, NULL, 'hospital', ARRAY['hospital', 'general_practitioner']::text[], 0.78, 'loc:2fe4e8f59c915afecf93e5c5d344d2b4103b4addbf909a1efbc03dc6247cde05'),
('osm:node:13578454234', 'https://www.openstreetmap.org/node/13578454234', '{"provider":"openstreetmap","element":{"type":"node","id":13578454234,"lat":34.5315712,"lon":69.1181738,"tags":{"amenity":"pharmacy","name":"Shafaq Pharmacy"}}}'::jsonb, '31208dc164200dac360930285958ab98e7363d2db071db035d205fdc747ee034', 'Shafaq Pharmacy', 'shafaq pharmacy', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5315712, 69.1181738, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:46e369eebdea61385718060154d3f34aa77daa45d6003c137ba93f01b5592f3a'),
('osm:way:386824159', 'https://www.openstreetmap.org/way/386824159', '{"provider":"openstreetmap","element":{"type":"way","id":386824159,"center":{"lat":33.8033382,"lon":69.8182308},"tags":{"addr:city":"څمکنی","addr:postcode":"02258","addr:street":"R-C","amenity":"hospital","healthcare":"hospital","healthcare:speciality":"general","name":"Shahid Fazal Rahman Chamkani Houspital","name:ps":"شهید فضل الرحمان څمکنی روغتون"}}}'::jsonb, 'c9dc57e32c9c324e0282cf36017f0a69ec33de519449a3fa225b002d34c38553', 'Shahid Fazal Rahman Chamkani Houspital', 'shahid fazal rahman chamkani houspital', 'R-C', 'R-C, څمکنی, 02258', 'څمکنی', NULL, '02258', 'AF', 33.8033382, 69.8182308, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:74fbac7a624fa8eea165f739aef0f4ece143563ac8516e1559caa8144d0e54bf'),
('osm:way:828078647', 'https://www.openstreetmap.org/way/828078647', '{"provider":"openstreetmap","element":{"type":"way","id":828078647,"center":{"lat":34.8061066,"lon":67.5860812},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Shahidan Clinic"}}}'::jsonb, 'fe3fe6bad298340caed8f3efb50946a246ba513da33392fa125c1864bd649ef5', 'Shahidan Clinic', 'shahidan clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 34.8061066, 67.5860812, NULL, NULL, NULL, 'hospital', ARRAY['hospital', 'general_practitioner']::text[], 0.78, 'loc:eb6b10b33741d48bfb4091b8f71c28033daadc5295d89fa82879eb59d6750d2d'),
('osm:way:1446964743', 'https://www.openstreetmap.org/way/1446964743', '{"provider":"openstreetmap","element":{"type":"way","id":1446964743,"center":{"lat":34.80598,"lon":67.5859483},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Shahidan Clinic Grounds"}}}'::jsonb, '7b428fd36141f37f63fa80b6966f3c358c29fbd63603d51af3dc3aab155369e8', 'Shahidan Clinic Grounds', 'shahidan clinic grounds', NULL, NULL, NULL, NULL, NULL, 'AF', 34.80598, 67.5859483, NULL, NULL, NULL, 'hospital', ARRAY['hospital', 'general_practitioner']::text[], 0.78, 'loc:7b3852b82eea7da8c75d103592d73271cf069f2d4d10ab20a83be6b6177369cb'),
('osm:way:1360073114', 'https://www.openstreetmap.org/way/1360073114', '{"provider":"openstreetmap","element":{"type":"way","id":1360073114,"center":{"lat":34.3770218,"lon":70.3257102},"tags":{"amenity":"hospital","name":"Shekh Mesri Hospital"}}}'::jsonb, '38bb7f568dbe0bd78c0099ef4e8ddd02de354285613138fc377e75902ee9ed3e', 'Shekh Mesri Hospital', 'shekh mesri hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.3770218, 70.3257102, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:879c20c5b6ca3ccf2b756241d10ffc29244cedacde65bb3013df9abfc6894c99'),
('osm:way:1211995221', 'https://www.openstreetmap.org/way/1211995221', '{"provider":"openstreetmap","element":{"type":"way","id":1211995221,"center":{"lat":33.1348771,"lon":67.4507852},"tags":{"addr:city":"Sangmasha","addr:street":"Bad khana Road to Sang masha","amenity":"hospital","healthcare":"hospital","name":"Shuhada Hospital","name:fa":"شفاخانه شهدا","operator:type":"government"}}}'::jsonb, 'a767b365658b4a8332745a9dc2e9570071c63bbba502bae394b2b988cc23232e', 'Shuhada Hospital', 'shuhada hospital', 'Bad khana Road to Sang masha', 'Bad khana Road to Sang masha, Sangmasha', 'Sangmasha', NULL, NULL, 'AF', 33.1348771, 67.4507852, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:8d393b215e345a7b37b6f6a35785e576781c3bc4016d4914a001ed341ad27def'),
('osm:node:13578426194', 'https://www.openstreetmap.org/node/13578426194', '{"provider":"openstreetmap","element":{"type":"node","id":13578426194,"lat":34.5346465,"lon":69.1486694,"tags":{"healthcare":"laboratory","name":"Sigal Medical Laboratory"}}}'::jsonb, 'faac8eec09b3c8342748b8fc69760217cf35fc0b6856d5fc4b35ec71ebfe9f0f', 'Sigal Medical Laboratory', 'sigal medical laboratory', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5346465, 69.1486694, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:7024a4abb13e6ce583a734813f460cf193ee342b934c6a6f2341df6d4815f74e'),
('osm:way:790941495', 'https://www.openstreetmap.org/way/790941495', '{"provider":"openstreetmap","element":{"type":"way","id":790941495,"center":{"lat":34.5321906,"lon":69.1742843},"tags":{"addr:housenumber":"5","addr:street":"جاده انقره","building":"yes","healthcare":"laboratory","name":"SLR Diagnostics","name:fa":"لابراتوار طبی SLR"}}}'::jsonb, 'c9f42ae6040219d040e432335f1a84c98ac248ed5afe5ce1faab1f6507a60230', 'SLR Diagnostics', 'slr diagnostics', '5 جاده انقره', '5 جاده انقره', NULL, NULL, NULL, 'AF', 34.5321906, 69.1742843, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.86, 'loc:f50bf9c6d29c6f1e4615b3159653ee6b1ffcd8afd63d595097c8ad86a8bade4a'),
('osm:node:1378433259', 'https://www.openstreetmap.org/node/1378433259', '{"provider":"openstreetmap","element":{"type":"node","id":1378433259,"lat":34.4162796,"lon":70.3229101,"tags":{"amenity":"hospital","name":"Sultani Jami Hospital"}}}'::jsonb, 'c48e7a6d81d615cede8ab9fe302fe337243f585dcea68864a7f5f6b538cde51f', 'Sultani Jami Hospital', 'sultani jami hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.4162796, 70.3229101, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:706e3ee8b9066339381358e1b7279864709a3f36607e3027bfcd08d760b1b385'),
('osm:node:12357489239', 'https://www.openstreetmap.org/node/12357489239', '{"provider":"openstreetmap","element":{"type":"node","id":12357489239,"lat":31.5938393,"lon":64.3716511,"tags":{"amenity":"clinic","fixme":"resurvey","healthcare":"clinic","name":"Surgical Centre for War Victims"}}}'::jsonb, 'cbdc35959a7a4fdb6b83489bc6c95a8edddf0217db551f6d9c166aa36649a9e0', 'Surgical Centre for War Victims', 'surgical centre for war victims', NULL, NULL, NULL, NULL, NULL, 'AF', 31.5938393, 64.3716511, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:3b2530e716498a0c482d17e0aefb75a06624c736a8e5ddb2366b71a73935ad62'),
('osm:way:1093343658', 'https://www.openstreetmap.org/way/1093343658', '{"provider":"openstreetmap","element":{"type":"way","id":1093343658,"center":{"lat":34.4990702,"lon":69.0561703},"tags":{"addr:postcode":"1006","addr:street":"سرک معرفت","amenity":"hospital","building":"hospital","name":"Syeed u Shuhada Hospital"}}}'::jsonb, 'a1899d1beb2b912db1ec761373134c791bb594337bb4877abdc5d4b6f37a4550', 'Syeed u Shuhada Hospital', 'syeed u shuhada hospital', 'سرک معرفت', 'سرک معرفت, 1006', NULL, NULL, '1006', 'AF', 34.4990702, 69.0561703, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:fc6ef63a8c13c508fe45c13c92857f1162f24942e7d7b0c18e365c3506d8099a'),
('osm:node:13463940619', 'https://www.openstreetmap.org/node/13463940619', '{"provider":"openstreetmap","element":{"type":"node","id":13463940619,"lat":34.5333792,"lon":69.1477165,"tags":{"amenity":"dentist","name":"Taheri Dental Clinic"}}}'::jsonb, '4496c3173189879ef72db8fc0b0bca6a2b440f930ff0974372423abdbbbfbd85', 'Taheri Dental Clinic', 'taheri dental clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5333792, 69.1477165, NULL, NULL, NULL, 'dental', ARRAY['dental', 'general_practitioner']::text[], 0.78, 'loc:1780d4e727eb7b777ad66b9a20ed0b74a385a73c9063604feab1168dc61d3dbe'),
('osm:way:1336509472', 'https://www.openstreetmap.org/way/1336509472', '{"provider":"openstreetmap","element":{"type":"way","id":1336509472,"center":{"lat":34.5015656,"lon":69.0734913},"tags":{"amenity":"hospital","name":"Tank-e-tail hospital","name:en":"Tank-e-tail hospital"}}}'::jsonb, 'd3b70449b631009c82b3178378f40c6b5a4ac8260de4f1333757d838345a150b', 'Tank-e-tail hospital', 'tank e tail hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5015656, 69.0734913, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:90436f0120a26383f163dae7b7e881283f59d3aac5848d013eeb046019cd2463'),
('osm:node:13461814037', 'https://www.openstreetmap.org/node/13461814037', '{"provider":"openstreetmap","element":{"type":"node","id":13461814037,"lat":34.5448012,"lon":69.1664628,"tags":{"amenity":"clinic","name":"Turkish Clinic"}}}'::jsonb, '423d0a6d2fddf7e4bcff896acb7ec2dc849574992a71096b2e0d4e0e67ef650d', 'Turkish Clinic', 'turkish clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5448012, 69.1664628, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:2803976db000000f1fa400f44b0741417f169ac14a4fd4835801f9987bff7d2d'),
('osm:node:13578453746', 'https://www.openstreetmap.org/node/13578453746', '{"provider":"openstreetmap","element":{"type":"node","id":13578453746,"lat":34.5397201,"lon":69.1709872,"tags":{"amenity":"clinic","name":"Turkiye Chenar Clinic"}}}'::jsonb, '539e6cfe96fc9fc3ad5f76f11c887ae0157f2a736a9de99d17845fc2e1bbcac9', 'Turkiye Chenar Clinic', 'turkiye chenar clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5397201, 69.1709872, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:62f62e4ac3e74f754a82584c753e50d323170022e956b0799132e76f026943f7'),
('osm:node:12369043360', 'https://www.openstreetmap.org/node/12369043360', '{"provider":"openstreetmap","element":{"type":"node","id":12369043360,"lat":35.2734252,"lon":69.1179326,"tags":{"amenity":"doctors","fixme":"position","operator":"UNICEF"}}}'::jsonb, '3d66a2ac126e1901fae49f2361af92c10e90d5f68aa6bf8af2926289b836211d', 'UNICEF', 'unicef', NULL, NULL, NULL, NULL, NULL, 'AF', 35.2734252, 69.1179326, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:6c0608b54a1184f0d9d82930162d30c9c18b136b5017d095cdc419213f989992'),
('osm:relation:18305660', 'https://www.openstreetmap.org/relation/18305660', '{"provider":"openstreetmap","element":{"type":"relation","id":18305660,"center":{"lat":34.3788869,"lon":62.1408379},"tags":{"amenity":"hospital","operator":"UNICEF","type":"multipolygon"}}}'::jsonb, '02ccfc4bff3715205342bb8e7f054266c65b5905edc3556c551e6cbaa95aa7f8', 'UNICEF', 'unicef', NULL, NULL, NULL, NULL, NULL, 'AF', 34.3788869, 62.1408379, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:ce9857d8c4f0f83ac00b06e91a4184d232980736523619f87f93acd7ac0a0e38'),
('osm:way:1329679350', 'https://www.openstreetmap.org/way/1329679350', '{"provider":"openstreetmap","element":{"type":"way","id":1329679350,"center":{"lat":36.4975145,"lon":68.9085993},"tags":{"amenity":"hospital","barrier":"wall","operator":"UNICEF"}}}'::jsonb, '7a097269d34e5fad00d0528b6582935a5b6f82a54a8c1cbd3b2e112302a9e852', 'UNICEF', 'unicef', NULL, NULL, NULL, NULL, NULL, 'AF', 36.4975145, 68.9085993, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:b2c29fab49888711bb49084aaba7dd66c8ea86defd8a5822836e726d85954dcb'),
('osm:node:1405324878', 'https://www.openstreetmap.org/node/1405324878', '{"provider":"openstreetmap","element":{"type":"node","id":1405324878,"lat":34.4773246,"lon":70.364942,"tags":{"amenity":"clinic","healthcare":"clinic","name":"University Clinic"}}}'::jsonb, '5963c4d0352f5cc8040922acb0e6ea8fc4282a060cef773db29f1b28dc7ed6b9', 'University Clinic', 'university clinic', NULL, NULL, NULL, NULL, NULL, 'AF', 34.4773246, 70.364942, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:71d74740f1519562b8916360d54ad6d3c9608d3bae3bf825eda9e78e1027d88e'),
('osm:node:5537113562', 'https://www.openstreetmap.org/node/5537113562', '{"provider":"openstreetmap","element":{"type":"node","id":5537113562,"lat":34.5016794,"lon":69.0816918,"tags":{"addr:city":"کابل","addr:housenumber":"123","addr:street":"سرک بابه مزاری","amenity":"hospital","email":"yahya.mohaqeq@gmail.com","emergency":"no","healthcare":"hospital","healthcare:speciality":"general","name":"Watan Hospital","operator":"محمد یحیی محقق"}}}'::jsonb, 'ed37155a35566ed630fc1d73c4d168d062a23616b3e07040442df2a6d11b7b49', 'Watan Hospital', 'watan hospital', '123 سرک بابه مزاری', '123 سرک بابه مزاری, کابل', 'کابل', NULL, NULL, 'AF', 34.5016794, 69.0816918, NULL, NULL, 'yahya.mohaqeq@gmail.com', 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:6d28ed1f43bfa172386fffbae6c68b17e11ce3b3097f52ef742d14e6eab50165'),
('osm:way:200364383', 'https://www.openstreetmap.org/way/200364383', '{"provider":"openstreetmap","element":{"type":"way","id":200364383,"center":{"lat":34.5394752,"lon":69.1857313},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Wazir Akbar Khan hospital","name:ru":"Госпиталь имени Вазира Мохаммада Акбар Хана"}}}'::jsonb, '77275692291099b632c1bb3b13a41c02cb43400fe834dd6590fdf31df803d068', 'Wazir Akbar Khan hospital', 'wazir akbar khan hospital', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5394752, 69.1857313, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:6c54bc6b923623d343b7abc34589099c1f69bd06caf59d2b2fa2bdb50d19383d'),
('osm:node:13536556303', 'https://www.openstreetmap.org/node/13536556303', '{"provider":"openstreetmap","element":{"type":"node","id":13536556303,"lat":34.5333669,"lon":69.1408308,"tags":{"amenity":"pharmacy","name":"Yazdani Pharmacy"}}}'::jsonb, 'fdb6ed5bfc01074c004dc6c1a70de75db807cacdce4117c61cf857892429bf6a', 'Yazdani Pharmacy', 'yazdani pharmacy', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5333669, 69.1408308, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:4a43d513ef2f8717387d49fdb5ac2c21b326e5ac14ec73de7aa21c9498971d34'),
('osm:node:13518455811', 'https://www.openstreetmap.org/node/13518455811', '{"provider":"openstreetmap","element":{"type":"node","id":13518455811,"lat":34.5406556,"lon":69.166006,"tags":{"healthcare":"laboratory","name":"ZNN"}}}'::jsonb, 'b0449fbc5f4e6c43060570dadcebe4160dea0ffb9499da7411fc8906ad1d1bb2', 'ZNN', 'znn', NULL, NULL, NULL, NULL, NULL, 'AF', 34.5406556, 69.166006, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:cc7593e109efc206f8b57c5ac9e4bdd82454c7bd068541fef5c2b60c36d28a2c'),
('osm:node:7068623146', 'https://www.openstreetmap.org/node/7068623146', '{"provider":"openstreetmap","element":{"type":"node","id":7068623146,"lat":34.5500298,"lon":69.1645436,"tags":{"healthcare":"laboratory","name":"آسیا لابراتوار"}}}'::jsonb, '7d4084a1570b5697b083d2ecf9a2f2aa7a713e87814c89fe5ad9ffcc3ddea028', 'آسیا لابراتوار', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5500298, 69.1645436, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:d975593135b456ab1b87f68516d6fb050afec2fc25434b7bbfa1fd8a4e436e3b'),
('osm:way:560978711', 'https://www.openstreetmap.org/way/560978711', '{"provider":"openstreetmap","element":{"type":"way","id":560978711,"center":{"lat":34.5114458,"lon":69.1660261},"tags":{"addr:country":"AF","addr:county":"Cinema-e-Pamir","addr:district":"District 1","addr:province":"Kabul","amenity":"hospital","emergency":"yes","healthcare":"hospital","level":"2","name":"ابن سینا روغتون","name:en":"Ibni Sina Hospital","name:ru":"Больница Ибни Сина","opening_hours":"24/7","operational_status":"Operational","operator:type":"public/government"}}}'::jsonb, 'ac9eb41a824ab72f3a788aa1d627a526e47b03c63054a2138c829bffbbebd9c3', 'ابن سینا روغتون', NULL, NULL, 'Kabul', NULL, 'Kabul', NULL, 'AF', 34.5114458, 69.1660261, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:3c0d65800a252398f840b79e526b0da0accb3aedf9291ad57e1770a8d41dd816'),
('osm:node:8615138927', 'https://www.openstreetmap.org/node/8615138927', '{"provider":"openstreetmap","element":{"type":"node","id":8615138927,"lat":34.5411633,"lon":69.1670373,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"ادویه فروشی صدیق‌زاده"}}}'::jsonb, '18af47889245b8df5ed5b7ee5b3bb5991fbf8643d00469e3b5c47e40421f759e', 'ادویه فروشی صدیق‌زاده', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5411633, 69.1670373, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:7179c4c4caaf8a42fe73e4c0168732b9ca8da6ba5261c6b539d5ced035387588'),
('osm:node:7796811509', 'https://www.openstreetmap.org/node/7796811509', '{"provider":"openstreetmap","element":{"type":"node","id":7796811509,"lat":34.5415464,"lon":69.1670185,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"ادویه فروشی ناظری","name:en":"Nazeri Pharmacy"}}}'::jsonb, '63b8c1fbc3913e4024e4fbba803bbce5f664f99dac82b1a1fae0ec55d80b9369', 'ادویه فروشی ناظری', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5415464, 69.1670185, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:dc7966fed37c87637834bd2ecf067c5a3e9299af0cf98c91687f16e7ddf070d9'),
('osm:way:529561780', 'https://www.openstreetmap.org/way/529561780', '{"provider":"openstreetmap","element":{"type":"way","id":529561780,"center":{"lat":34.87066,"lon":71.150998},"tags":{"amenity":"hospital","name":"اسداباددولتی روغتون"}}}'::jsonb, '8f16e4ed8ba73d86c4e54351e21634fca3b786a68661751aabd65ae709b91121', 'اسداباددولتی روغتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.87066, 71.150998, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:a5c55cd8acc4b605252a2f92a29c80cd457eecf3d35620acd45f052d9a4574e0'),
('osm:node:8838139307', 'https://www.openstreetmap.org/node/8838139307', '{"provider":"openstreetmap","element":{"type":"node","id":8838139307,"lat":36.2663891,"lon":68.0115154,"tags":{"amenity":"clinic","healthcare":"clinic","name":"اکسری همکار"}}}'::jsonb, '618146c3a53f6ad24c48c9d16473844f374def73535399d4162d79d8ab5de8b0', 'اکسری همکار', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2663891, 68.0115154, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:d9919ff90355df0504210f358725252230b41a6e81182ab18972bf764bca175c'),
('osm:node:8806131659', 'https://www.openstreetmap.org/node/8806131659', '{"provider":"openstreetmap","element":{"type":"node","id":8806131659,"lat":34.5326904,"lon":69.1655754,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"اکسیر درملتون"}}}'::jsonb, '6fb97e1621c9c0503df995b8ec46d04dafc8b89455eedf2fc45429c6b58f1258', 'اکسیر درملتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5326904, 69.1655754, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:e2015f36c4e9c1ad63fce4b32c83f03a24f8e01d2ca0e765ceca32f00c9fa829'),
('osm:node:8838139298', 'https://www.openstreetmap.org/node/8838139298', '{"provider":"openstreetmap","element":{"type":"node","id":8838139298,"lat":36.2645393,"lon":68.0181385,"tags":{"amenity":"clinic","healthcare":"clinic","name":"الحاج دوکتور جمال الدین قرین"}}}'::jsonb, 'e31e3da871dfba62b68bf14831e1c585c63dce572d544217dc84c62c95bee28b', 'الحاج دوکتور جمال الدین قرین', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2645393, 68.0181385, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:49837567c8c243f76e86e8a205a76a2fbe2c76f91b576a6aadf0bd3401e93908'),
('osm:way:821932671', 'https://www.openstreetmap.org/way/821932671', '{"provider":"openstreetmap","element":{"type":"way","id":821932671,"center":{"lat":34.5466707,"lon":69.143467},"tags":{"amenity":"hospital","building":"yes","healthcare":"hospital","name":"الحیات","name:en":"Al-Hayat"}}}'::jsonb, '51307ae7317d71b1271b9a6576940427016d83c434846637c2b8973f0813b87e', 'الحیات', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5466707, 69.143467, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:a1550850d9f61f13efd75c50674f095d43e6427928c572cc2756ca58ab0a7c47'),
('osm:node:8670900203', 'https://www.openstreetmap.org/node/8670900203', '{"provider":"openstreetmap","element":{"type":"node","id":8670900203,"lat":34.5248486,"lon":69.166939,"tags":{"healthcare":"laboratory","name":"الخلیج طبی لابراتوار","opening_hours":"24/7"}}}'::jsonb, '2826fdeb20f1a60239be6d793672da6c160a9c4e63030f2f70150d622a8a8968', 'الخلیج طبی لابراتوار', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5248486, 69.166939, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.78, 'loc:cdfdf183013040953e61d1bac7bbf5f63775bde7f2251ff3999fa8bbe326be9e'),
('osm:node:8654658276', 'https://www.openstreetmap.org/node/8654658276', '{"provider":"openstreetmap","element":{"type":"node","id":8654658276,"lat":34.5454756,"lon":69.1661321,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"الشفاء درملتون"}}}'::jsonb, '6b3715c45cd455bed5481c51214003e1a234609b33a18c0f90e2d937a98f2d88', 'الشفاء درملتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5454756, 69.1661321, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:0efd6d7bdce03ff685f019722e1b85f8b1bbe7d88487f7c3ce4f9f2d3b1e624a');

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
