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
('osm:node:4448212394', 'https://www.openstreetmap.org/node/4448212394', '{"provider":"openstreetmap","element":{"type":"node","id":4448212394,"lat":42.5067594,"lon":1.5344867,"tags":{"addr:housenumber":"15","addr:street":"Carrer de la Unió","amenity":"dentist","healthcare":"dentist","name":"Berdental","name:ca":"Berdental","opening_hours":"Mo-We 09:15-17:15; Tu-Th 12:00-20:00; Fr 09:15-14:00","phone":"+376 821 712","website":"http://www.ber.dental"}}}'::jsonb, 'd12e63c4952ae459bed331a640a9821486a08c620fdfedb4846e1a103e21daeb', 'Berdental', 'berdental', '15 Carrer de la Unió', '15 Carrer de la Unió', NULL, NULL, NULL, 'AD', 42.5067594, 1.5344867, '+376 821 712', 'http://www.ber.dental', NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:d58df7c7e8f2cefa9c28a9f840ca32dc9fde9522aae9722e8b43c22bfeb3693d'),
('osm:node:4931838121', 'https://www.openstreetmap.org/node/4931838121', '{"provider":"openstreetmap","element":{"type":"node","id":4931838121,"lat":42.5085424,"lon":1.5362728,"tags":{"amenity":"doctors","healthcare":"doctor","name":"Bio-Centre","name:ca":"Bio-Centre"}}}'::jsonb, 'e4832d775271bbb223cebe53af4d7e775481a09ebe69359003403b935e28fc9d', 'Bio-Centre', 'bio centre', NULL, NULL, NULL, NULL, NULL, 'AD', 42.5085424, 1.5362728, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:85a1fa81e9d2e3f44bbb171338a803dbffa8f6a014978663185436e4e69baae8'),
('osm:node:13232613220', 'https://www.openstreetmap.org/node/13232613220', '{"provider":"openstreetmap","element":{"type":"node","id":13232613220,"lat":42.5066058,"lon":1.5308587,"tags":{"addr:city":"Andorra la Vella","addr:postcode":"AD500","addr:street":"Carrer de Joan Maragall","amenity":"clinic","emergency":"yes","emergency:phone":"116","healthcare":"primary","healthcare:service":"general_practice;emergency","healthcare:speciality":"general","name":"Centre d''Atenció Primària","operator":"Servei Andorrà d''Atenció Sanitària","operator:short":"SAAS","phone":"+376871185","short_name":"CAP","website":"https://saas.ad/"}}}'::jsonb, 'd4ce6a8353df33e0e427af0a3a34182dbb094397493180429f2458086b293230', 'Centre d''Atenció Primària', 'centre d atenci prim ria', 'Carrer de Joan Maragall', 'Carrer de Joan Maragall, Andorra la Vella, AD500', 'Andorra la Vella', NULL, 'AD500', 'AD', 42.5066058, 1.5308587, '+376871185', 'https://saas.ad/', NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:36c0261ec03930aa15a8d6d4e509327ecf47856e05b796739640d1c4f0072c21'),
('osm:way:1058236520', 'https://www.openstreetmap.org/way/1058236520', '{"provider":"openstreetmap","element":{"type":"way","id":1058236520,"center":{"lat":42.5564193,"lon":1.5348746},"tags":{"building":"yes","healthcare":"yes","name":"Centre d''Atenció Primària d''Ordino","name:ca":"Centre d''Atenció Primària d''Ordino"}}}'::jsonb, 'd049bd8360bcbf6da2c656ab0c58d27bcc6a7b5f938f6196324ce713751457e1', 'Centre d''Atenció Primària d''Ordino', 'centre d atenci prim ria d ordino', NULL, NULL, NULL, NULL, NULL, 'AD', 42.5564193, 1.5348746, NULL, NULL, NULL, 'unknown', ARRAY['unknown']::text[], 0.78, 'loc:0c933e731755f671b42a603ba67ee5083effc74affb03997dd423d43e2a8895b'),
('osm:way:664711712', 'https://www.openstreetmap.org/way/664711712', '{"provider":"openstreetmap","element":{"type":"way","id":664711712,"center":{"lat":42.5360413,"lon":1.5814514},"tags":{"amenity":"clinic","building":"yes","name":"Centre d''atenció primària Encamp"}}}'::jsonb, '1bb10a4278fc728a4826a4177407633a9f7939ef4590876d69ed9f5e5d15a7a2', 'Centre d''atenció primària Encamp', 'centre d atenci prim ria encamp', NULL, NULL, NULL, NULL, NULL, 'AD', 42.5360413, 1.5814514, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:e768bc7937bad09d2279b562488bfcd013c7321e7608482c6545e366f766a22c'),
('osm:node:10908160811', 'https://www.openstreetmap.org/node/10908160811', '{"provider":"openstreetmap","element":{"type":"node","id":10908160811,"lat":42.5149379,"lon":1.5315156,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Centre d''atenció primaria La Llanterna"}}}'::jsonb, 'be33e9e45422d15f67d2e1216e643b6f76b53ce21149865482b5d2d235ef7521', 'Centre d''atenció primaria La Llanterna', 'centre d atenci primaria la llanterna', NULL, NULL, NULL, NULL, NULL, 'AD', 42.5149379, 1.5315156, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:f55a1d7776903b47981ce10f9ce85be6b1427059d81112985e12603307859884'),
('osm:node:4463164817', 'https://www.openstreetmap.org/node/4463164817', '{"provider":"openstreetmap","element":{"type":"node","id":4463164817,"lat":42.5087352,"lon":1.5398243,"tags":{"addr:street":"Plaça Coprínceps","amenity":"doctors","healthcare":"doctor","name":"Centre de rehabilitació funcional Lourdes Guardia","phone":"+376 800 690"}}}'::jsonb, '9672d523e5f7a9da041c70e3145472f021c073eb5fc9d3d61c761aaba7bbb2e0', 'Centre de rehabilitació funcional Lourdes Guardia', 'centre de rehabilitaci funcional lourdes guardia', 'Plaça Coprínceps', 'Plaça Coprínceps', NULL, NULL, NULL, 'AD', 42.5087352, 1.5398243, '+376 800 690', NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:9298ad94c3769294b0023c1780bf96e5f950e96ffcbb21bb73287674139ad127'),
('osm:way:385230804', 'https://www.openstreetmap.org/way/385230804', '{"provider":"openstreetmap","element":{"type":"way","id":385230804,"center":{"lat":42.5316095,"lon":1.6965494},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Centre Mèdic Grau","name:ca":"Centre Mèdic Grau"}}}'::jsonb, '02da8562eef93d25ef67f4f806bc819d0ed226a2ee8a43800c22ce1c1a38e86b', 'Centre Mèdic Grau', 'centre m dic grau', NULL, NULL, NULL, NULL, NULL, 'AD', 42.5316095, 1.6965494, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:fb25a79b67f032fa8ebdc6f0409b4c6aace3688d03eef37cfdd50734fa8fed9a'),
('osm:node:11066577116', 'https://www.openstreetmap.org/node/11066577116', '{"provider":"openstreetmap","element":{"type":"node","id":11066577116,"lat":42.5096389,"lon":1.5347278,"tags":{"addr:city":"Escaldes-Engordany","addr:housenumber":"17","addr:postcode":"AD700","addr:street":"Avinguda de les Nacions Unides","addr:unit":"Baixos","amenity":"clinic","amenity_1":"Medic consultations","amenity_2":"One Day surgery","check_date":"2024-01-31","currency:XBT":"yes","healthcare":"clinic","healthcare:speciality":"paediatrics;surgery;orthopaedics;allergology","name":"Centre Mèdic i Quirúrgic","operator":"CMQ","operator:type":"private","payment:lightning":"yes","payment:lightning_contactless":"yes","payment:onchain":"yes","phone":"+376 801 222","website":"https://cmqandorra.com/","wheelchair":"yes"}}}'::jsonb, '8e41c236dd30aeaaffea9472adc9fe2a2c3e7ee9d9af55dc0d7a9fd7740aa0a4', 'Centre Mèdic i Quirúrgic', 'centre m dic i quir rgic', '17 Avinguda de les Nacions Unides', '17 Avinguda de les Nacions Unides, Escaldes-Engordany, AD700', 'Escaldes-Engordany', NULL, 'AD700', 'AD', 42.5096389, 1.5347278, '+376 801 222', 'https://cmqandorra.com/', NULL, 'general_practitioner', ARRAY['general_practitioner', 'specialist']::text[], 0.86, 'loc:151f931203d9faeb3e5a6534004608381f7aebbd9a5a9b8cfef1ef533ba00e16'),
('osm:node:4470034393', 'https://www.openstreetmap.org/node/4470034393', '{"provider":"openstreetmap","element":{"type":"node","id":4470034393,"lat":42.4649967,"lon":1.490469,"tags":{"addr:city":"Sant Julià de Lòria","amenity":"doctors","healthcare":"doctor","name":"Centre mèdic laurèdia","name:ca":"Centre mèdic laurèdia"}}}'::jsonb, '4a77561eaa7a576d5901800655fb74acfcfb560d4b57905f7849eb499bd2a332', 'Centre mèdic laurèdia', 'centre m dic laur dia', NULL, 'Sant Julià de Lòria', 'Sant Julià de Lòria', NULL, NULL, 'AD', 42.4649967, 1.490469, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:6760b583df332c28ae1eb22365a5c52bfd1030333fe43286610f4dde2a318f02'),
('osm:way:426145022', 'https://www.openstreetmap.org/way/426145022', '{"provider":"openstreetmap","element":{"type":"way","id":426145022,"center":{"lat":42.4977698,"lon":1.5010412},"tags":{"building":"yes","healthcare":"yes","name":"Centre Socio-Sanitari El Cedre"}}}'::jsonb, '36f3abc2e8494d8214b263ae4289e33df095754750782b32e90715c55a531aa7', 'Centre Socio-Sanitari El Cedre', 'centre socio sanitari el cedre', NULL, NULL, NULL, NULL, NULL, 'AD', 42.4977698, 1.5010412, NULL, NULL, NULL, 'unknown', ARRAY['unknown']::text[], 0.78, 'loc:abfd83037621f7fef3a21e59e40c87fe026db9298cf65fd58a384e68560b8d77'),
('osm:way:1058436427', 'https://www.openstreetmap.org/way/1058436427', '{"provider":"openstreetmap","element":{"type":"way","id":1058436427,"center":{"lat":42.5121276,"lon":1.534143},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Clínica Verge de Meritxell","name:ca":"Clínica Verge de Meritxell"}}}'::jsonb, '0b32100bbad27473d0a56ab3754021f0a2dfbb5ee715983c015fd8694a95aede', 'Clínica Verge de Meritxell', 'cl nica verge de meritxell', NULL, NULL, NULL, NULL, NULL, 'AD', 42.5121276, 1.534143, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:29984c7dac4e8ebabdbbd781ac0da6952b3bd76b97d9eadd6ad67719358e9ffd'),
('osm:node:10115266551', 'https://www.openstreetmap.org/node/10115266551', '{"provider":"openstreetmap","element":{"type":"node","id":10115266551,"lat":42.5358218,"lon":1.5822472,"tags":{"addr:city":"Encamp","addr:housenumber":"2","addr:postcode":"AD200","addr:street":"Plaça del Consell","amenity":"pharmacy","name":"Farmàcia Baixench"}}}'::jsonb, 'e020c188ce4ae2b8ddbf2a71c004fc115c74c2bc222585b7799fcd0b1c229156', 'Farmàcia Baixench', 'farm cia baixench', '2 Plaça del Consell', '2 Plaça del Consell, Encamp, AD200', 'Encamp', NULL, 'AD200', 'AD', 42.5358218, 1.5822472, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:13678eebe0a5cfd0becf7a42a4a45a016a15176e35ceb15ae88ba6ec9c5416c6'),
('osm:node:5734184040', 'https://www.openstreetmap.org/node/5734184040', '{"provider":"openstreetmap","element":{"type":"node","id":5734184040,"lat":42.5086569,"lon":1.5376578,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmacia Carlemany"}}}'::jsonb, '714a1dd16ae21a6f27455cbafe8a09f618fea680fe61eafa10426d447b7f00d9', 'Farmacia Carlemany', 'farmacia carlemany', NULL, NULL, NULL, NULL, NULL, 'AD', 42.5086569, 1.5376578, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:5426d48cc6bbfecd5ba502e53dcc9d2d085a895fec0e9c92c9707ea1b341fe34'),
('osm:node:3870497791', 'https://www.openstreetmap.org/node/3870497791', '{"provider":"openstreetmap","element":{"type":"node","id":3870497791,"lat":42.5097292,"lon":1.5406185,"tags":{"amenity":"pharmacy","check_date":"2026-01-10","healthcare":"pharmacy","name":"Farmàcia de les Escoles","name:ca":"Farmàcia de les Escoles"}}}'::jsonb, '0d2a385afa80e0e865fa6fd8ace86a6274b17300347e568cc58ea0ffb33cf690', 'Farmàcia de les Escoles', 'farm cia de les escoles', NULL, NULL, NULL, NULL, NULL, 'AD', 42.5097292, 1.5406185, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:d63c65893d9b14df618396c579bf8558c1578b32575fb7852db4b7dc383cf8c2'),
('osm:node:690708653', 'https://www.openstreetmap.org/node/690708653', '{"provider":"openstreetmap","element":{"type":"node","id":690708653,"lat":42.5413859,"lon":1.7338899,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmàcia de les Pistes","name:ca":"Farmàcia de les Pistes"}}}'::jsonb, 'eac9be5fad6a179fe8d98b2dc9c4d263dcc732ce73e0add9a9495c307b7e031c', 'Farmàcia de les Pistes', 'farm cia de les pistes', NULL, NULL, NULL, NULL, NULL, 'AD', 42.5413859, 1.7338899, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:3933b13c4aca84066351c836eeb33a19f063e5f9479029e6f737aef99372774a'),
('osm:node:690708548', 'https://www.openstreetmap.org/node/690708548', '{"provider":"openstreetmap","element":{"type":"node","id":690708548,"lat":42.5423906,"lon":1.7339056,"tags":{"addr:city":"Pas de la Casa","addr:housenumber":"1","addr:postcode":"AD200","addr:street":"Carrer Major","amenity":"pharmacy","dispensing":"yes","drive_through":"no","healthcare":"pharmacy","name":"Farmàcia del Pas","name:ca":"Farmàcia del Pas","operator":"Farmàcia del Pas"}}}'::jsonb, '6e9510da78931d6009162d8073c0ef398b9850b834e4ff0e6db720ef6e5af662', 'Farmàcia del Pas', 'farm cia del pas', '1 Carrer Major', '1 Carrer Major, Pas de la Casa, AD200', 'Pas de la Casa', NULL, 'AD200', 'AD', 42.5423906, 1.7339056, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:5dc65c4c663d7060881eb7038c1db6088639c4328af31ca9505799c8f7aab9f8'),
('osm:node:5734184045', 'https://www.openstreetmap.org/node/5734184045', '{"provider":"openstreetmap","element":{"type":"node","id":5734184045,"lat":42.5080866,"lon":1.5256307,"tags":{"addr:city":"Andorra la Vella","addr:city:es":"Andorra la Vieja","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmacia del Pont","name:es":"Farmacia del Puente"}}}'::jsonb, 'b111018ee6a7eec7fad19a82a383521fdd790ec7b9c8eba22ae329b9d4010b5c', 'Farmacia del Pont', 'farmacia del pont', NULL, 'Andorra la Vella', 'Andorra la Vella', NULL, NULL, 'AD', 42.5080866, 1.5256307, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:c2780ee4111aebe184bb3ba519860169dac87eaea17541ebb2fa465a07daac1b'),
('osm:node:4512004201', 'https://www.openstreetmap.org/node/4512004201', '{"provider":"openstreetmap","element":{"type":"node","id":4512004201,"lat":42.5063496,"lon":1.5300827,"tags":{"addr:city":"Andorra la Vella","addr:housenumber":"31","addr:postcode":"AD500","addr:street":"Carrer Bonaventura Riberaygua","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmàcia Edelweiss","name:ca":"Farmàcia Edelweiss"}}}'::jsonb, '10ace3f152349756c7385b692d82442611d3900e63caac09d75a025ed177a3cb', 'Farmàcia Edelweiss', 'farm cia edelweiss', '31 Carrer Bonaventura Riberaygua', '31 Carrer Bonaventura Riberaygua, Andorra la Vella, AD500', 'Andorra la Vella', NULL, 'AD500', 'AD', 42.5063496, 1.5300827, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:0df6f815b7961f848758f8df66663a70c722aae3fc19558b44b51cf285ae67c0'),
('osm:node:5734184039', 'https://www.openstreetmap.org/node/5734184039', '{"provider":"openstreetmap","element":{"type":"node","id":5734184039,"lat":42.5085366,"lon":1.5361153,"tags":{"addr:city":"Escaldes-Engordany","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmàcia Europa","name:ca":"Farmàcia Europa"}}}'::jsonb, '1df4cb954adef924339591e73c6c4e164028dcc53bd7c93e6a31b64d770a330a', 'Farmàcia Europa', 'farm cia europa', NULL, 'Escaldes-Engordany', 'Escaldes-Engordany', NULL, NULL, 'AD', 42.5085366, 1.5361153, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:704e8a50ef4a8a90674b1e892337c2eb387646a8059f4b88ff2017a9071a714c'),
('osm:node:5734220428', 'https://www.openstreetmap.org/node/5734220428', '{"provider":"openstreetmap","element":{"type":"node","id":5734220428,"lat":42.5085881,"lon":1.5336527,"tags":{"addr:city":"Andorra la Vella","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmacia Galeno 3"}}}'::jsonb, 'd137b4970d2ffece913b9911b959137a8fb52dccc74d4835806725858a930e12', 'Farmacia Galeno 3', 'farmacia galeno 3', NULL, 'Andorra la Vella', 'Andorra la Vella', NULL, NULL, 'AD', 42.5085881, 1.5336527, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:3964433cc58a8b48ab121f6a26f30d24ae6f58be6a41406fcc39765f76f72e1b'),
('osm:node:2966749076', 'https://www.openstreetmap.org/node/2966749076', '{"provider":"openstreetmap","element":{"type":"node","id":2966749076,"lat":42.5464466,"lon":1.5141083,"tags":{"addr:city":"La Massana","addr:postcode":"AD400","addr:street":"Avinguda Sant Antoni","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmacia Garalla"}}}'::jsonb, 'fb2561104dfe396253f1ece44ccabbf86b2e6cb87e42aa5a6c0c88d295abe335', 'Farmacia Garalla', 'farmacia garalla', 'Avinguda Sant Antoni', 'Avinguda Sant Antoni, La Massana, AD400', 'La Massana', NULL, 'AD400', 'AD', 42.5464466, 1.5141083, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:30f20569eb0cd8a29c50787743bbd1399dffa2f8b664196c2de85da33681aba6'),
('osm:node:5734220430', 'https://www.openstreetmap.org/node/5734220430', '{"provider":"openstreetmap","element":{"type":"node","id":5734220430,"lat":42.5085599,"lon":1.5266738,"tags":{"addr:city":"Andorra la Vella","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmacia Gerrero"}}}'::jsonb, 'e6cca0296f43533f4438e56b9349a0e958697b8acc91f3b69c6f45687822f62a', 'Farmacia Gerrero', 'farmacia gerrero', NULL, 'Andorra la Vella', 'Andorra la Vella', NULL, NULL, 'AD', 42.5085599, 1.5266738, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:8170f1d752c82811811618f19ab1b0e63733335e85180efc962322faee02cfb8'),
('osm:node:5734184041', 'https://www.openstreetmap.org/node/5734184041', '{"provider":"openstreetmap","element":{"type":"node","id":5734184041,"lat":42.5086226,"lon":1.539779,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmacia Guerrero"}}}'::jsonb, '180cbf36e320ccb6ff3692f252b3aeccf5b962d02dc1963992b25d1228852468', 'Farmacia Guerrero', 'farmacia guerrero', NULL, NULL, NULL, NULL, NULL, 'AD', 42.5086226, 1.539779, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:14f9cd2e6f93b5671f85349678b6e386096a25b90d07987bf886f2c553c5ca9a'),
('osm:node:13564886628', 'https://www.openstreetmap.org/node/13564886628', '{"provider":"openstreetmap","element":{"type":"node","id":13564886628,"lat":42.44732,"lon":1.4817096,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","level":"0","name":"Farmàcia Mallol","opening_hours":"Mo-Su 09:30-20:00","phone":"+376 800 666"}}}'::jsonb, 'f7a46ec2b08f6387a2c9e469cfd260da3cd694aa248fef5454d914dba3f02c62', 'Farmàcia Mallol', 'farm cia mallol', NULL, NULL, NULL, NULL, NULL, 'AD', 42.44732, 1.4817096, '+376 800 666', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:6150cdc7be6c3c161e33dee4821d748305e61c4578ee95746b96a0178aff88b8'),
('osm:node:4984632724', 'https://www.openstreetmap.org/node/4984632724', '{"provider":"openstreetmap","element":{"type":"node","id":4984632724,"lat":42.5362656,"lon":1.5825936,"tags":{"addr:city":"Encamp","addr:housenumber":"10","addr:postcode":"AD200","addr:street":"Plaça del Consell","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmàcia Manresa","name:ca":"Farmàcia Manresa"}}}'::jsonb, '0d6c5cc22b75e0f4aa7866b863d090554bf3f0d6f7b61844c8d865fcd75b335b', 'Farmàcia Manresa', 'farm cia manresa', '10 Plaça del Consell', '10 Plaça del Consell, Encamp, AD200', 'Encamp', NULL, 'AD200', 'AD', 42.5362656, 1.5825936, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:3b2f7153e26f3aadc252d7e0c20dd7a9839ba3a2c09aae60cd62b84597fe3ced'),
('osm:node:5734184036', 'https://www.openstreetmap.org/node/5734184036', '{"provider":"openstreetmap","element":{"type":"node","id":5734184036,"lat":42.5081056,"lon":1.5291926,"tags":{"addr:city":"Andorra la Vella","addr:housenumber":"7","addr:postcode":"AD500","addr:street":"Carrer Bonaventura Armengol","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmacia Pasteur"}}}'::jsonb, '5d8cfb3faa4adff21b93362a28f90a7b78cbc0108cb38166c418f31f73aad916', 'Farmacia Pasteur', 'farmacia pasteur', '7 Carrer Bonaventura Armengol', '7 Carrer Bonaventura Armengol, Andorra la Vella, AD500', 'Andorra la Vella', NULL, 'AD500', 'AD', 42.5081056, 1.5291926, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:3b77d9dc9998ed5ee3020e3db815e52559de539683dc8c1b2167b70b77a394b7'),
('osm:node:5734236535', 'https://www.openstreetmap.org/node/5734236535', '{"provider":"openstreetmap","element":{"type":"node","id":5734236535,"lat":42.5077734,"lon":1.5307045,"tags":{"addr:city":"Andorra la Vella","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmacia Pasteur"}}}'::jsonb, 'bea08bcd124e06ee0d3fa546f3dd97915ef01c92aa8c0222002da0e60d3139fa', 'Farmacia Pasteur', 'farmacia pasteur', NULL, 'Andorra la Vella', 'Andorra la Vella', NULL, NULL, 'AD', 42.5077734, 1.5307045, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:ddd95965a43fe90c22567d3c088929ffc0e302deb71f3b5bf03d6921898b9bde'),
('osm:node:5734184038', 'https://www.openstreetmap.org/node/5734184038', '{"provider":"openstreetmap","element":{"type":"node","id":5734184038,"lat":42.5088247,"lon":1.5356696,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmacia Pirineus"}}}'::jsonb, 'f6b288dd27734f38e6e6a543e79acb3ed1943f9fa885944dc44a01c8c690d88c', 'Farmacia Pirineus', 'farmacia pirineus', NULL, NULL, NULL, NULL, NULL, 'AD', 42.5088247, 1.5356696, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:20a0c729158a5f478d021d5809843c01b2b719efcf51d4c83856b7ce75e78252'),
('osm:node:2402832670', 'https://www.openstreetmap.org/node/2402832670', '{"provider":"openstreetmap","element":{"type":"node","id":2402832670,"lat":42.508252,"lon":1.5339584,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmàcia Rocamora","name:ca":"Farmàcia Rocamora"}}}'::jsonb, 'cfae1ab093c13c8ec8a46f96c7573656cb9e767c048a7865fa260d2b7c53467c', 'Farmàcia Rocamora', 'farm cia rocamora', NULL, NULL, NULL, NULL, NULL, 'AD', 42.508252, 1.5339584, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:d58a586921db1788604b4e23ec4eb88aa937bee7799ca8e77cfc58160025ca5a'),
('osm:node:5723978577', 'https://www.openstreetmap.org/node/5723978577', '{"provider":"openstreetmap","element":{"type":"node","id":5723978577,"lat":42.5087827,"lon":1.5342651,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Galeno"}}}'::jsonb, 'abe4d0c6df655568694fe81f6196f240ce7e044e23d9ba03cb581eec0ec42b1f', 'Galeno', 'galeno', NULL, NULL, NULL, NULL, NULL, 'AD', 42.5087827, 1.5342651, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:3b8ac177e9273518668538218d511a8819bf620db7c5f0615ec9d0dace2e15fb'),
('osm:node:5734220132', 'https://www.openstreetmap.org/node/5734220132', '{"provider":"openstreetmap","element":{"type":"node","id":5734220132,"lat":42.507807,"lon":1.5246432,"tags":{"addr:city":"Andorra la Vella","amenity":"pharmacy","healthcare":"pharmacy","name":"González-Adrio"}}}'::jsonb, 'e54ee1db5cc4baf43787d651e1ce6b1829a3f10de9b1b9310b6a58f7904ef6f3', 'González-Adrio', 'gonz lez adrio', NULL, 'Andorra la Vella', 'Andorra la Vella', NULL, NULL, 'AD', 42.507807, 1.5246432, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:0197cca5a6b8c06ce973c2e7a13a265273ff272ef128e2e89f9259acd462a643'),
('osm:node:4984643122', 'https://www.openstreetmap.org/node/4984643122', '{"provider":"openstreetmap","element":{"type":"node","id":4984643122,"lat":42.5062257,"lon":1.5228292,"tags":{"addr:street":"Carrer Prada Casadet","amenity":"pharmacy","healthcare":"pharmacy","name":"Guitart"}}}'::jsonb, '2c2bda0b5ffb81a303ca9e3a11bb73a7d26d18ad8e7f8b1cd3166e6d752c1338', 'Guitart', 'guitart', 'Carrer Prada Casadet', 'Carrer Prada Casadet', NULL, NULL, NULL, 'AD', 42.5062257, 1.5228292, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:76a7e37336cc3aeed7e4f20a19dc0be67acd327e911f8dfeaacff54643c98dda'),
('osm:way:194554955', 'https://www.openstreetmap.org/way/194554955', '{"provider":"openstreetmap","element":{"type":"way","id":194554955,"center":{"lat":42.5114677,"lon":1.5339333},"tags":{"addr:city":"Escaldes-Engordany","addr:housenumber":"13","addr:postcode":"AD700","addr:street":"Avinguda Fiter i Rossell","amenity":"hospital","emergency":"yes","healthcare":"hospital","name":"Hospital de Nostra Senyora de Meritxell","name:ca":"Hospital de Nostra Senyora de Meritxell","name:en":"Hospital of Our Lady of Meritxell","phone":"+376 871 000","wikidata":"Q47993296","wikipedia":"ca:Hospital Nostra Senyora de Meritxell"}}}'::jsonb, 'c6c1839800639ada2be20308c6c6a6efb99377eb83df8d5b7cf04feb553884f8', 'Hospital de Nostra Senyora de Meritxell', 'hospital de nostra senyora de meritxell', '13 Avinguda Fiter i Rossell', '13 Avinguda Fiter i Rossell, Escaldes-Engordany, AD700', 'Escaldes-Engordany', NULL, 'AD700', 'AD', 42.5114677, 1.5339333, '+376 871 000', NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:ea2b472f0b0d7a9fe3f4a16964fedba9da75ebcd7ccaa1cddb3af18d7631198f'),
('osm:node:11066577115', 'https://www.openstreetmap.org/node/11066577115', '{"provider":"openstreetmap","element":{"type":"node","id":11066577115,"lat":42.5097813,"lon":1.5347466,"tags":{"amenity":"clinic","healthcare":"clinic","name":"IMO Andorra","phone":"+376 885 544","website":"https://www.imo.es/nuestras-clinicas/imo-andorra/"}}}'::jsonb, '0e70f4994f6e0e5614efb8ee06d92d5cf117e75574c4acc3585528de3047319d', 'IMO Andorra', 'imo andorra', NULL, NULL, NULL, NULL, NULL, 'AD', 42.5097813, 1.5347466, '+376 885 544', 'https://www.imo.es/nuestras-clinicas/imo-andorra/', NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:72c46fa6518043bd375117cb452e677826a27d4f608a6145805f2bd59a1ab71a'),
('osm:node:13851679120', 'https://www.openstreetmap.org/node/13851679120', '{"provider":"openstreetmap","element":{"type":"node","id":13851679120,"lat":42.5076397,"lon":1.5208151,"tags":{"addr:city":"Andorra la Vella","addr:housenumber":"7","addr:postcode":"AD500","addr:street":"Carrer Doctor Nequí","amenity":"pharmacy","contact:phone":"+376 804555","contact:website":"https://www.farmaciameritxell.com/","healthcare":"pharmacy","name":"Meritxell"}}}'::jsonb, '345e82b1fb2f2a68019dd407675b85de274ee9cb8b342b712c8a4303207f8db8', 'Meritxell', 'meritxell', '7 Carrer Doctor Nequí', '7 Carrer Doctor Nequí, Andorra la Vella, AD500', 'Andorra la Vella', NULL, 'AD500', 'AD', 42.5076397, 1.5208151, '+376 804555', 'https://www.farmaciameritxell.com/', NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:7b078271419c130c16ef26589627818952013969676950fcf9b0886b8ffcc7c5'),
('osm:node:4699170492', 'https://www.openstreetmap.org/node/4699170492', '{"provider":"openstreetmap","element":{"type":"node","id":4699170492,"lat":42.5077429,"lon":1.5220419,"tags":{"addr:street":"Plaça Príncep Benlloch","amenity":"pharmacy","healthcare":"pharmacy","name":"Mitjavila","phone":"+376 820 224"}}}'::jsonb, '18a1aaead90f271008a14023fcef7b60fbeb742d54043914961449e95e058dd9', 'Mitjavila', 'mitjavila', 'Plaça Príncep Benlloch', 'Plaça Príncep Benlloch', NULL, NULL, NULL, 'AD', 42.5077429, 1.5220419, '+376 820 224', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:fd9651fe566c40d70ac6ea6e826ff24ea529a56e156976a5b3b2d536c987b2e6'),
('osm:node:6564773288', 'https://www.openstreetmap.org/node/6564773288', '{"provider":"openstreetmap","element":{"type":"node","id":6564773288,"lat":42.5358795,"lon":1.582083,"tags":{"addr:housenumber":"1","addr:street":"Avinguda de François Mitterrand","amenity":"doctors","healthcare":"doctor","name":"Osteopata Blanchon","name:ca":"Osteòpata Blanchon","opening_hours":"Mo-Sa 09:00-13:00, 14:00-20:00","phone":"+376 728 148"}}}'::jsonb, '1fbe382fe0bc5c6355878ad61e85be955859541c44695f1fc98679a801c02f89', 'Osteopata Blanchon', 'osteopata blanchon', '1 Avinguda de François Mitterrand', '1 Avinguda de François Mitterrand', NULL, NULL, NULL, 'AD', 42.5358795, 1.582083, '+376 728 148', NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:4773c17be52003be9f350a026059ef8226879d8df7efcc47aad6a94015dd16f1'),
('osm:node:12944424403', 'https://www.openstreetmap.org/node/12944424403', '{"provider":"openstreetmap","element":{"type":"node","id":12944424403,"lat":42.5126854,"lon":1.5351092,"tags":{"amenity":"pharmacy","name":"Pasteur"}}}'::jsonb, '46af248e890852fa108cb6a4bee88e9afdc8b11466e1fb0bbd95c585197c54a7', 'Pasteur', 'pasteur', NULL, NULL, NULL, NULL, NULL, 'AD', 42.5126854, 1.5351092, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:b164d6a5d0d116835188e4039d3d326a8dda2e27c40307a62e17f53fcc1b261a'),
('osm:node:10908163605', 'https://www.openstreetmap.org/node/10908163605', '{"provider":"openstreetmap","element":{"type":"node","id":10908163605,"lat":42.5112192,"lon":1.5361905,"tags":{"healthcare":"audiologist","name":"Prat del Roure"}}}'::jsonb, '63745dec9025ca56fd6230da80077258850d8cdcdb66ef0f0d889a92704466a0', 'Prat del Roure', 'prat del roure', NULL, NULL, NULL, NULL, NULL, 'AD', 42.5112192, 1.5361905, NULL, NULL, NULL, 'unknown', ARRAY['unknown']::text[], 0.78, 'loc:47beabd4a3956c1eea661e64da4d2a8e240f7635d4b9daf051a1c22e8baf8064'),
('osm:way:1056552340', 'https://www.openstreetmap.org/way/1056552340', '{"provider":"openstreetmap","element":{"type":"way","id":1056552340,"center":{"lat":42.501552,"lon":1.5088952},"tags":{"building":"yes","healthcare":"yes","name":"Residència Solà d''Enclar"}}}'::jsonb, '63fe139ebd59c533036811cfbde86d50381f530cce91202f6adcb3be73fcd431', 'Residència Solà d''Enclar', 'resid ncia sol d enclar', NULL, NULL, NULL, NULL, NULL, 'AD', 42.501552, 1.5088952, NULL, NULL, NULL, 'unknown', ARRAY['unknown']::text[], 0.78, 'loc:f5a8a8d0d1de5fb6a944028acb942d5e66149322df756ba4a54fb9cd8f100f88'),
('osm:node:5734220247', 'https://www.openstreetmap.org/node/5734220247', '{"provider":"openstreetmap","element":{"type":"node","id":5734220247,"lat":42.5073253,"lon":1.5328032,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Roser Miró"}}}'::jsonb, 'fc7bf58988f56cff878fc95239f32d5f2d9cff64989cf4258461030cd6162168', 'Roser Miró', 'roser mir', NULL, NULL, NULL, NULL, NULL, 'AD', 42.5073253, 1.5328032, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:3d55bccf46598813abf27dbdce46b988e0bebce74fc7ec28e542e5921c6decee'),
('osm:node:4942543822', 'https://www.openstreetmap.org/node/4942543822', '{"provider":"openstreetmap","element":{"type":"node","id":4942543822,"lat":42.5454392,"lon":1.7305619,"tags":{"amenity":"hospital","name":"Urgències del Pas","name:ca":"Urgències del Pas"}}}'::jsonb, '3d2db59e5a8a0680b90417bfcb3af6add553fb4f973444d7405db7a00ecfc558', 'Urgències del Pas', 'urg ncies del pas', NULL, NULL, NULL, NULL, NULL, 'AD', 42.5454392, 1.7305619, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:6ef04d9be75e3a8572ecee9819cec4c7e41fd2f3953a439bfcc34ddb75d9c5f2'),
('osm:node:5734184044', 'https://www.openstreetmap.org/node/5734184044', '{"provider":"openstreetmap","element":{"type":"node","id":5734184044,"lat":42.5071181,"lon":1.5266591,"tags":{"addr:city":"Andorra la Vella","amenity":"pharmacy","healthcare":"pharmacy","name":"Valira","name:ca":"Valira"}}}'::jsonb, 'd75cb093745e134b4d6929848a0580c8e43d1ee060e7500c6e2b6eb626eb217f', 'Valira', 'valira', NULL, 'Andorra la Vella', 'Andorra la Vella', NULL, NULL, 'AD', 42.5071181, 1.5266591, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:5d34d8e803e75e6622953fd5b93d08a5713da1335f16c801650fa0493308f54d');

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
