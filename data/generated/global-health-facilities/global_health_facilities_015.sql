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
('osm:node:8875754075', 'https://www.openstreetmap.org/node/8875754075', '{"provider":"openstreetmap","element":{"type":"node","id":8875754075,"lat":-8.8967289,"lon":13.2296129,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Odonto Excellence"}}}'::jsonb, '59953960007d7b8a4fd19534552cda86fafb6821cc6833b70176832bd299e18f', 'Odonto Excellence', 'odonto excellence', NULL, NULL, NULL, NULL, NULL, 'AO', -8.8967289, 13.2296129, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:474d00d5705c1cc0f1a5f49098e8dd4c1738c2ceb26ecd1a49a19231bf7c9acb'),
('osm:node:6141186504', 'https://www.openstreetmap.org/node/6141186504', '{"provider":"openstreetmap","element":{"type":"node","id":6141186504,"lat":-8.9934829,"lon":13.3969391,"tags":{"amenity":"dentist","healthcare":"dentist","name":"Odonto Excellente"}}}'::jsonb, '2f7d93d4d19cad8cca8fd798d5417c6da74a972159587a96d765b8c17e48f7af', 'Odonto Excellente', 'odonto excellente', NULL, NULL, NULL, NULL, NULL, 'AO', -8.9934829, 13.3969391, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.78, 'loc:02de384af3f516800579360d95be20863dad077bbed7ffd2adc942a2628c2712'),
('osm:way:317634605', 'https://www.openstreetmap.org/way/317634605', '{"provider":"openstreetmap","element":{"type":"way","id":317634605,"center":{"lat":-15.110812,"lon":13.7003888},"tags":{"amenity":"clinic","building":"yes","name":"OR"}}}'::jsonb, 'b60273a7778ea386d1b9246ddfaa47c3cc2bb5eb580ebb7a6315f1af2d0a8ba7', 'OR', 'or', NULL, NULL, NULL, NULL, NULL, 'AO', -15.110812, 13.7003888, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:ade77cd1cd4fc7cd5a251f4d16bf92a120697dcb8dbceb622672edabac2aa185'),
('osm:node:5560655748', 'https://www.openstreetmap.org/node/5560655748', '{"provider":"openstreetmap","element":{"type":"node","id":5560655748,"lat":-8.9074071,"lon":13.2089592,"tags":{"addr:city":"Luanda","addr:street":"Travessa do IFAL (Instituto de Formação da Administração Local)","healthcare":"hospice","name":"Panga Comercio e Industria Hospidaria"}}}'::jsonb, '23693e03c382c35e7837a19fd3fbfc6b4d6635af28536a87720f9b5f3e9438d1', 'Panga Comercio e Industria Hospidaria', 'panga comercio e industria hospidaria', 'Travessa do IFAL (Instituto de Formação da Administração Local)', 'Travessa do IFAL (Instituto de Formação da Administração Local), Luanda', 'Luanda', NULL, NULL, 'AO', -8.9074071, 13.2089592, NULL, NULL, NULL, 'unknown', ARRAY['unknown']::text[], 0.86, 'loc:9d7c56501443fbf89aee76e7efab52c4774f29064fa07f7ff3510e4e3e692c85'),
('osm:way:783923912', 'https://www.openstreetmap.org/way/783923912', '{"provider":"openstreetmap","element":{"type":"way","id":783923912,"center":{"lat":-8.9818075,"lon":13.1474712},"tags":{"addr:city":"Luanda","addr:street":"Rua D","amenity":"clinic","building":"yes","healthcare":"clinic","healthcare:speciality":"general","name":"Paulina e Filhos"}}}'::jsonb, '23dae12bc7fe8073793a9c68bae19880e017fd99a0ec15224d3d829937ffd424', 'Paulina e Filhos', 'paulina e filhos', 'Rua D', 'Rua D, Luanda', 'Luanda', NULL, NULL, 'AO', -8.9818075, 13.1474712, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:36ed4689aa5b01a5c89e2f0d4cc491d984d101000281ed68df757d77633a7f68'),
('osm:node:6605373799', 'https://www.openstreetmap.org/node/6605373799', '{"provider":"openstreetmap","element":{"type":"node","id":6605373799,"lat":-8.9243924,"lon":13.1894628,"tags":{"amenity":"clinic","email":"geral@peandra.net","facebook":"https://www.facebook.com/pg/peandra.net","healthcare":"clinic","name":"Peandra - Talatona","opening_hours":"Mo-Fr 08:00-21:00, Sa 09:00-14:00","phone":"+244 226 434 524, +244 948 555 130","website":"https://peandra.net/"}}}'::jsonb, '6d6eb70921f9a2eb5fb7bbeeae13c0c14a58da62342b84d4f245007bd9ef4849', 'Peandra - Talatona', 'peandra talatona', NULL, NULL, NULL, NULL, NULL, 'AO', -8.9243924, 13.1894628, '+244 226 434 524, +244 948 555 130', 'https://peandra.net/', 'geral@peandra.net', 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:198cae251f03b3af612149fc02b99a2d13067413c53f3a90d87d4d6c8cc4bcc6'),
('osm:node:5161925625', 'https://www.openstreetmap.org/node/5161925625', '{"provider":"openstreetmap","element":{"type":"node","id":5161925625,"lat":-8.9076816,"lon":13.1625722,"tags":{"addr:city":"Luanda","addr:street":"Rua das Construções","amenity":"clinic","healthcare":"clinic","name":"PEGOSClínic - Centro Médico"}}}'::jsonb, 'e6ceab6a6cbfae2eb02fbe0ab9cda03646de21328f6eee8ea3027dbc398f66e4', 'PEGOSClínic - Centro Médico', 'pegoscl nic centro m dico', 'Rua das Construções', 'Rua das Construções, Luanda', 'Luanda', NULL, NULL, 'AO', -8.9076816, 13.1625722, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:a448a44bc6c16dbba99ca3248963f722bdb5a61f36c287a18fb1e315eeabaec8'),
('osm:way:718345933', 'https://www.openstreetmap.org/way/718345933', '{"provider":"openstreetmap","element":{"type":"way","id":718345933,"center":{"lat":-14.9393073,"lon":13.4840353},"tags":{"amenity":"clinic","building":"yes","healthcare":"clinic","layer":"1","name":"Pitágoras"}}}'::jsonb, '650cd2d1de29423802178f95cb6cf99591749119e45e2e13c1ed69f548f67230', 'Pitágoras', 'pit goras', NULL, NULL, NULL, NULL, NULL, 'AO', -14.9393073, 13.4840353, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:bf41c0e7892c3e7533bd754860691d46108e503b806d86876aa6d7c27e13eaf6'),
('osm:node:11199529337', 'https://www.openstreetmap.org/node/11199529337', '{"provider":"openstreetmap","element":{"type":"node","id":11199529337,"lat":-11.9679997,"lon":20.0434032,"tags":{"amenity":"doctors","healthcare":"doctor","name":"Posto de enfermagem do Dala sector"}}}'::jsonb, 'fc8ac6b79339164b312e621e1aff13faa51513771b946d6cb050ea47de216a78', 'Posto de enfermagem do Dala sector', 'posto de enfermagem do dala sector', NULL, NULL, NULL, NULL, NULL, 'AO', -11.9679997, 20.0434032, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:91b3502ac1751658fe1f75a8e5602c28218bcc45086abe66c60578a43ba17de3'),
('osm:way:276925010', 'https://www.openstreetmap.org/way/276925010', '{"provider":"openstreetmap","element":{"type":"way","id":276925010,"center":{"lat":-15.1964874,"lon":12.1640778},"tags":{"addr:city":"Moçâmedes","amenity":"hospital","healthcare":"hospital","healthcare:speciality":"general","name":"Posto de Médico do Cassanje","operator":"Administração Local do Estado","operator:type":"public"}}}'::jsonb, 'd8777877dd60a8547525ec77ac6c7ae76ce8a19e4aa7f2eeb31106ef5c573a8d', 'Posto de Médico do Cassanje', 'posto de m dico do cassanje', NULL, 'Moçâmedes', 'Moçâmedes', NULL, NULL, 'AO', -15.1964874, 12.1640778, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:21274853e0e5fa26400e548d44889734265a612d110d23815619f9654f2f4166'),
('osm:node:12879626452', 'https://www.openstreetmap.org/node/12879626452', '{"provider":"openstreetmap","element":{"type":"node","id":12879626452,"lat":-8.8956934,"lon":13.2892276,"tags":{"addr:city":"Kilamba Kiaxi","addr:street":"yes","amenity":"doctors","healthcare":"doctor","name":"Posto de saúde"}}}'::jsonb, '18e144dc9715602a7b1ce9e65ebd5c6c135a62691444777da19a78aedcbc2cfb', 'Posto de saúde', 'posto de sa de', 'yes', 'yes, Kilamba Kiaxi', 'Kilamba Kiaxi', NULL, NULL, 'AO', -8.8956934, 13.2892276, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:97727372a0425c9439f2d23efd1561a1efa1bee3dd972221fc72e61dcb382c62'),
('osm:node:12879626453', 'https://www.openstreetmap.org/node/12879626453', '{"provider":"openstreetmap","element":{"type":"node","id":12879626453,"lat":-8.8956794,"lon":13.294959,"tags":{"addr:city":"Kilamba Kiaxi","addr:street":"yes","amenity":"doctors","healthcare":"doctor","name":"Posto de saúde"}}}'::jsonb, 'e121bcad02ebbbb9481e8bb1b521c9c7c3958897d364a632573c81e3f599adc3', 'Posto de saúde', 'posto de sa de', 'yes', 'yes, Kilamba Kiaxi', 'Kilamba Kiaxi', NULL, NULL, 'AO', -8.8956794, 13.294959, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:ca4abe4b6f5b674eab9cfe951855a75f36a592625fd950a5753493d01a14a662'),
('osm:node:12879626454', 'https://www.openstreetmap.org/node/12879626454', '{"provider":"openstreetmap","element":{"type":"node","id":12879626454,"lat":-8.8977387,"lon":13.2918045,"tags":{"addr:city":"Kilamba Kiaxi","addr:street":"Rua Universal","amenity":"doctors","healthcare":"doctor","name":"Posto de saúde"}}}'::jsonb, '9c41c7d6e37865c34ef82e5412a8083c36aefff70282b340905771ba223224a2', 'Posto de saúde', 'posto de sa de', 'Rua Universal', 'Rua Universal, Kilamba Kiaxi', 'Kilamba Kiaxi', NULL, NULL, 'AO', -8.8977387, 13.2918045, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:f364cdf80dbd6c5d7ecc33461a35032979807cf7db9dc3d71e90c52849340de7'),
('osm:node:12879626455', 'https://www.openstreetmap.org/node/12879626455', '{"provider":"openstreetmap","element":{"type":"node","id":12879626455,"lat":-8.8982776,"lon":13.2886045,"tags":{"addr:city":"Kilamba Kiaxi","addr:street":"yes","amenity":"doctors","healthcare":"doctor","name":"Posto de saúde"}}}'::jsonb, 'e08da74addef7974939dc9d4b9a4e571775228e35f2a48d9a06ef3f055c728d8', 'Posto de saúde', 'posto de sa de', 'yes', 'yes, Kilamba Kiaxi', 'Kilamba Kiaxi', NULL, NULL, 'AO', -8.8982776, 13.2886045, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:22c1d10f9d825fe6d3846337b93ffe2b1af388b74dce7c661dbe54cf19c0fd42'),
('osm:node:12879626456', 'https://www.openstreetmap.org/node/12879626456', '{"provider":"openstreetmap","element":{"type":"node","id":12879626456,"lat":-8.8998983,"lon":13.2903652,"tags":{"addr:city":"Kilamba Kiaxi","addr:street":"Rua Simão Toco","amenity":"doctors","healthcare":"doctor","name":"Posto de saúde"}}}'::jsonb, '462503bd70d708402f0d4c357cc2175a6a5eef78d2adc8be84a6e4e02ec647ff', 'Posto de saúde', 'posto de sa de', 'Rua Simão Toco', 'Rua Simão Toco, Kilamba Kiaxi', 'Kilamba Kiaxi', NULL, NULL, 'AO', -8.8998983, 13.2903652, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:d67a89ec928caa85834ff51accdd2a252c57236f237539849376429b1d43bd7c'),
('osm:node:12879626457', 'https://www.openstreetmap.org/node/12879626457', '{"provider":"openstreetmap","element":{"type":"node","id":12879626457,"lat":-8.9035312,"lon":13.2892422,"tags":{"addr:city":"Kilamba Kiaxi","addr:street":"Rua da Carne de Caça","amenity":"doctors","healthcare":"doctor","name":"Posto de saúde"}}}'::jsonb, '8f9e11400bcccd67101e1acfb94c67953cd2eeff8fb07c8aeb90ab65b058a736', 'Posto de saúde', 'posto de sa de', 'Rua da Carne de Caça', 'Rua da Carne de Caça, Kilamba Kiaxi', 'Kilamba Kiaxi', NULL, NULL, 'AO', -8.9035312, 13.2892422, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:c0b8b0167d2c57ebcd9294412809939039974e09c2b697457a955d002ea93ae7'),
('osm:node:13273771555', 'https://www.openstreetmap.org/node/13273771555', '{"provider":"openstreetmap","element":{"type":"node","id":13273771555,"lat":-14.5136333,"lon":15.9963765,"tags":{"amenity":"hospital","healthcare":"hospital","name":"Posto de Saúde - Coluí"}}}'::jsonb, '9ab763a78c7ca39e70810a24f72e2094a4367650571b4f62e070da3437f7e598', 'Posto de Saúde - Coluí', 'posto de sa de colu', NULL, NULL, NULL, NULL, NULL, 'AO', -14.5136333, 15.9963765, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:045ef035f9f4a8fa1cea56ce63455c08d8b56eb3f242022a969eccfbfb1c4c59'),
('osm:node:11060575670', 'https://www.openstreetmap.org/node/11060575670', '{"provider":"openstreetmap","element":{"type":"node","id":11060575670,"lat":-15.1991274,"lon":12.1949151,"tags":{"addr:city":"Moçâmedes","amenity":"hospital","healthcare":"hospital","healthcare:speciality":"general","name":"Posto de Saúde Boa Esperança","operator":"Administração Local do Estado","operator:type":"public"}}}'::jsonb, '9b832456fa45d652c1ea0e46ab1980c583a020fb2d50365cbc391e2b749153ad', 'Posto de Saúde Boa Esperança', 'posto de sa de boa esperan a', NULL, 'Moçâmedes', 'Moçâmedes', NULL, NULL, 'AO', -15.1991274, 12.1949151, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:6942be24c14c12ecc165f6a25246fd47ff6d089f28ae250f4783ebbf78456135'),
('osm:way:1180242954', 'https://www.openstreetmap.org/way/1180242954', '{"provider":"openstreetmap","element":{"type":"way","id":1180242954,"center":{"lat":-12.6066538,"lon":13.3743067},"tags":{"addr:city":"Benguela","amenity":"clinic","building":"yes","healthcare":"clinic","name":"Posto de saude da Bela Vista"}}}'::jsonb, '78935dc581dbfbf0510341244f626005862d0eadbe9749fe47e2d67bec333008', 'Posto de saude da Bela Vista', 'posto de saude da bela vista', NULL, 'Benguela', 'Benguela', NULL, NULL, 'AO', -12.6066538, 13.3743067, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:86a7609159e475c7a1ae6f99ef21898beb85c3915b421b29c94cfe83b9f0d7f8'),
('osm:way:1067915461', 'https://www.openstreetmap.org/way/1067915461', '{"provider":"openstreetmap","element":{"type":"way","id":1067915461,"center":{"lat":-14.6679417,"lon":16.5095943},"tags":{"amenity":"clinic","building":"yes","healthcare":"clinic","name":"Posto de Saúde da Mumba"}}}'::jsonb, '6d848c31b0daa462d2f7aa7beb0cc4a492323a615cd2119e2d7e1a35a197c74c', 'Posto de Saúde da Mumba', 'posto de sa de da mumba', NULL, NULL, NULL, NULL, NULL, 'AO', -14.6679417, 16.5095943, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:80eab286430c31954a9d5e0cf93fb7a3b2c7afb5104ff626a1f0482fd9164b47'),
('osm:way:1444133540', 'https://www.openstreetmap.org/way/1444133540', '{"provider":"openstreetmap","element":{"type":"way","id":1444133540,"center":{"lat":-12.3493692,"lon":13.6001301},"tags":{"addr:city":"Lobito","amenity":"clinic","healthcare":"clinic","name":"Posto de saúde do Golf"}}}'::jsonb, '40711a68a06a136532332b6eb24492b802fd67d5316df84c6986a11aa8eea4dc', 'Posto de saúde do Golf', 'posto de sa de do golf', NULL, 'Lobito', 'Lobito', NULL, NULL, 'AO', -12.3493692, 13.6001301, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:99b3d3da4fa28e8ef8d6f27aa235fec5374633a3dd561c4fdbac7803142a18a0'),
('osm:way:864110861', 'https://www.openstreetmap.org/way/864110861', '{"provider":"openstreetmap","element":{"type":"way","id":864110861,"center":{"lat":-14.7961457,"lon":17.6855276},"tags":{"amenity":"clinic","building":"yes","healthcare":"clinic","name":"Posto de Saúde do Missombo (PS Missombo)"}}}'::jsonb, '995b0eb6558e686696196482e412be686563ae2a2b0bb6550077358d71dcfeac', 'Posto de Saúde do Missombo (PS Missombo)', 'posto de sa de do missombo ps missombo', NULL, NULL, NULL, NULL, NULL, 'AO', -14.7961457, 17.6855276, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:1012223bc4e2bb40a53891afbc843f7f09431cfec53e9306afef4d1b3854c246'),
('osm:way:804323579', 'https://www.openstreetmap.org/way/804323579', '{"provider":"openstreetmap","element":{"type":"way","id":804323579,"center":{"lat":-9.17149,"lon":13.519128},"tags":{"amenity":"hospital","country":"AO","healthcare":"hospital","name":"Posto de Saúde Zambela"}}}'::jsonb, 'fcf033c84fbc74b504efcc778a411e32c7dc4df6c032f7fef949b56bb7ac1303', 'Posto de Saúde Zambela', 'posto de sa de zambela', NULL, NULL, NULL, NULL, NULL, 'AO', -9.17149, 13.519128, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:95d110a5684bcad8cf25364bca4ee9877bfc3295218948df11da538ed9c0eef5'),
('osm:node:8455326710', 'https://www.openstreetmap.org/node/8455326710', '{"provider":"openstreetmap","element":{"type":"node","id":8455326710,"lat":-9.6541882,"lon":13.2407785,"tags":{"healthcare":"sample_collection","healthcare:speciality":"covid19","name":"Posto de Teste de COVID-19 (Credencial Interprovincial)","temporary":"yes"}}}'::jsonb, '364bb982cf8292fc3a6a7f35f24fda88574d2156992a1f1411927abfd87f3753', 'Posto de Teste de COVID-19 (Credencial Interprovincial)', 'posto de teste de covid 19 credencial interprovincial', NULL, NULL, NULL, NULL, NULL, 'AO', -9.6541882, 13.2407785, NULL, NULL, NULL, 'unknown', ARRAY['unknown']::text[], 0.78, 'loc:1b67267980f016a63e7e141a708e6325e869f5a534a4f7875c527d5a7d5daf1d'),
('osm:node:6396268956', 'https://www.openstreetmap.org/node/6396268956', '{"provider":"openstreetmap","element":{"type":"node","id":6396268956,"lat":-15.8047296,"lon":11.8581263,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Posto medico"}}}'::jsonb, 'f781dc0ec0f70556c4e4daaa80017a0861586550294eda7d91064bc605782052', 'Posto medico', 'posto medico', NULL, NULL, NULL, NULL, NULL, 'AO', -15.8047296, 11.8581263, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:ad7f4c08195fad6fcdda29397a131d8f7a8fe31848115ce2b4cd1e860c5bc98b'),
('osm:way:425043856', 'https://www.openstreetmap.org/way/425043856', '{"provider":"openstreetmap","element":{"type":"way","id":425043856,"center":{"lat":-12.5385961,"lon":13.4737927},"tags":{"building":"yes","healthcare":"yes","name":"Posto Medico"}}}'::jsonb, '367e43ab91e2c20076148b470c62c647f51ec733e7b9d03b5f941e1c194dbc13', 'Posto Medico', 'posto medico', NULL, NULL, NULL, NULL, NULL, 'AO', -12.5385961, 13.4737927, NULL, NULL, NULL, 'unknown', ARRAY['unknown']::text[], 0.78, 'loc:6d327f1b48df0df9ebeb657d99cf9951782181d9d2b276e12c26694d64a1ade3'),
('osm:node:11407391373', 'https://www.openstreetmap.org/node/11407391373', '{"provider":"openstreetmap","element":{"type":"node","id":11407391373,"lat":-12.2301401,"lon":20.3734179,"tags":{"amenity":"doctors","name":"Posto médico"}}}'::jsonb, '006d7e60f30e4336d51ecd2433b555907841d97ed6518716295242991775249a', 'Posto médico', 'posto m dico', NULL, NULL, NULL, NULL, NULL, 'AO', -12.2301401, 20.3734179, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:dac1c405543f1cc283daac7523806b4f98c9fc97a4736097bdcba43394eaaf4c'),
('osm:way:1160420305', 'https://www.openstreetmap.org/way/1160420305', '{"provider":"openstreetmap","element":{"type":"way","id":1160420305,"center":{"lat":-15.1964908,"lon":12.1640659},"tags":{"addr:street":"Bairro Kassange","amenity":"clinic","healthcare":"clinic","name":"Posto Médico"}}}'::jsonb, 'e5ac12fbde7664ced9406903aac1b8ba6563dbd304991baf33f6b7684f3be06d', 'Posto Médico', 'posto m dico', 'Bairro Kassange', 'Bairro Kassange', NULL, NULL, NULL, 'AO', -15.1964908, 12.1640659, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:1253036e0ef81fea47cd9b35aab732c9a809f4d346a271c88fbb9a5585cd2fc9'),
('osm:way:305526952', 'https://www.openstreetmap.org/way/305526952', '{"provider":"openstreetmap","element":{"type":"way","id":305526952,"center":{"lat":-12.6249606,"lon":13.2375023},"tags":{"amenity":"doctors","building":"yes","name":"Posto Médico"}}}'::jsonb, '5521f99815e25be37b01a69f53936195ffe41a3b6b837015680ba5ae104b4ece', 'Posto Médico', 'posto m dico', NULL, NULL, NULL, NULL, NULL, 'AO', -12.6249606, 13.2375023, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:ebbe13045e8b49a5721307a72a83ef1251b2bacd34bb4c610f7eb80781cf8cd0'),
('osm:way:343669267', 'https://www.openstreetmap.org/way/343669267', '{"provider":"openstreetmap","element":{"type":"way","id":343669267,"center":{"lat":-14.9010128,"lon":13.4585371},"tags":{"addr:city":"Lubango","amenity":"doctors","building":"yes","fixme":"check name and position","healthcare":"doctor","name":"Posto Médico","operator":"IESA Igreja Local de Galileia"}}}'::jsonb, 'ba09d5449bad11b7483ff03669c962a685e9d7a131700f508b3db2c86e61c1cb', 'Posto Médico', 'posto m dico', NULL, 'Lubango', 'Lubango', NULL, NULL, 'AO', -14.9010128, 13.4585371, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:83dc9c4e77253b7bd2c785dabaa0e60f97df51c78b7c395676485945a49c1cc5'),
('osm:way:1446699827', 'https://www.openstreetmap.org/way/1446699827', '{"provider":"openstreetmap","element":{"type":"way","id":1446699827,"center":{"lat":-14.9341819,"lon":13.5403214},"tags":{"addr:city":"Comandante Valódia","amenity":"hospital","healthcare":"hospital","healthcare:speciality":"general","name":"Posto Médico Comandante Liberdade"}}}'::jsonb, '50c9929af8be28a1d386ead94afe0a25aab0de1229d94955c1c61a133861c100', 'Posto Médico Comandante Liberdade', 'posto m dico comandante liberdade', NULL, 'Comandante Valódia', 'Comandante Valódia', NULL, NULL, 'AO', -14.9341819, 13.5403214, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:5593cfcb73ba79000f45e21e244b8003f61095667b5fafb9f400ddb336149863'),
('osm:way:916306383', 'https://www.openstreetmap.org/way/916306383', '{"provider":"openstreetmap","element":{"type":"way","id":916306383,"center":{"lat":-14.9161488,"lon":13.4930167},"tags":{"addr:city":"Lubango","addr:housenumber":"Comercial","addr:street":"Rua Patrice Lumumba","amenity":"clinic","building":"yes","healthcare":"clinic","healthcare:speciality":"general","name":"Posto Médico Comandante Nzanji"}}}'::jsonb, '5511a094b65c47e6e3ddd3e6fb1d306b47de6417195b103c670ae5f15a8f375a', 'Posto Médico Comandante Nzanji', 'posto m dico comandante nzanji', 'Comercial Rua Patrice Lumumba', 'Comercial Rua Patrice Lumumba, Lubango', 'Lubango', NULL, NULL, 'AO', -14.9161488, 13.4930167, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:f4bbb27c094346b2d2a7a313dd5fd3e9181e3cdc08052e2596d3d67c8ee216fc'),
('osm:way:1446652990', 'https://www.openstreetmap.org/way/1446652990', '{"provider":"openstreetmap","element":{"type":"way","id":1446652990,"center":{"lat":-14.8288784,"lon":15.0243253},"tags":{"amenity":"hospital","healthcare":"hospital","name":"posto medico da castanheira de peras"}}}'::jsonb, '272fa32e491ef89fece995f578c7e9c2f0e67afe900b8025d602c1147f456467', 'posto medico da castanheira de peras', 'posto medico da castanheira de peras', NULL, NULL, NULL, NULL, NULL, 'AO', -14.8288784, 15.0243253, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:0c79e11e4bdc8a003b99fd42db67fc42c1997f78b5ee1fdee383e377bc64055f'),
('osm:way:912360028', 'https://www.openstreetmap.org/way/912360028', '{"provider":"openstreetmap","element":{"type":"way","id":912360028,"center":{"lat":-15.0634691,"lon":13.5406454},"tags":{"addr:street":"Estrada da Huila","amenity":"hospital","healthcare":"hospital","healthcare:speciality":"general","name":"Posto Médico da Cidade Huíla","operator":"Governo","operator:type":"public"}}}'::jsonb, '79f39fa92a45ed862f3507559c5c7250a20d56236a031c0e1dbc5eb90299a353', 'Posto Médico da Cidade Huíla', 'posto m dico da cidade hu la', 'Estrada da Huila', 'Estrada da Huila', NULL, NULL, NULL, 'AO', -15.0634691, 13.5406454, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:c89bb0354b2a5b931ef6b14e177b9b9109c8e3585a645f3aa41523da50d49e30'),
('osm:node:11407390070', 'https://www.openstreetmap.org/node/11407390070', '{"provider":"openstreetmap","element":{"type":"node","id":11407390070,"lat":-11.6086367,"lon":19.863003,"tags":{"amenity":"doctors","name":"Posto Médico de Luanguirico"}}}'::jsonb, '1e8242f7931bec005ca5888a7c4e5c5a073a0f5fafdbbb6026da788d57de9298', 'Posto Médico de Luanguirico', 'posto m dico de luanguirico', NULL, NULL, NULL, NULL, NULL, 'AO', -11.6086367, 19.863003, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:edd1c6f5ed22ddab36b23f51d1cdee9296f607b198db986215b1bec928c24ea5'),
('osm:way:1275720406', 'https://www.openstreetmap.org/way/1275720406', '{"provider":"openstreetmap","element":{"type":"way","id":1275720406,"center":{"lat":-14.8282679,"lon":13.7605883},"tags":{"amenity":"clinic","building":"yes","healthcare":"clinic","healthcare:speciality":"community","name":"Posto Médico do Kwahamba"}}}'::jsonb, '727e0f04e9485542e1c959aa8f0f26c679de61622751efc585f241a2c1f79155', 'Posto Médico do Kwahamba', 'posto m dico do kwahamba', NULL, NULL, NULL, NULL, NULL, 'AO', -14.8282679, 13.7605883, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:758e40b2750d5844f1d91e9b9f1227b61c8f9d5fa9256cd730a7dc58f04c533c'),
('osm:way:917062620', 'https://www.openstreetmap.org/way/917062620', '{"provider":"openstreetmap","element":{"type":"way","id":917062620,"center":{"lat":-14.9362958,"lon":13.4976072},"tags":{"addr:city":"Lubango","addr:housenumber":"Ferrovia","amenity":"clinic","building":"yes","healthcare":"clinic","name":"Posto Médico do Senhor Domingos"}}}'::jsonb, 'd4d1600015a9f287d405be71d61299d8012a2b608e19b3b5a93671639b84ac78', 'Posto Médico do Senhor Domingos', 'posto m dico do senhor domingos', 'Ferrovia', 'Ferrovia, Lubango', 'Lubango', NULL, NULL, 'AO', -14.9362958, 13.4976072, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:3f68fbfff70545e4d6645a759f1a9ab3a15a290e6048e245f2e1a3e091371e44'),
('osm:way:210365291', 'https://www.openstreetmap.org/way/210365291', '{"provider":"openstreetmap","element":{"type":"way","id":210365291,"center":{"lat":-9.2621263,"lon":15.8111497},"tags":{"amenity":"hospital","building":"yes","name":"Posto Médico do Soqueco"}}}'::jsonb, 'f0e0d2119de5a894f06cec780c189f2058d0f93f3e2ec9d12694ca5049b031e2', 'Posto Médico do Soqueco', 'posto m dico do soqueco', NULL, NULL, NULL, NULL, NULL, 'AO', -9.2621263, 15.8111497, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:a4448b88ad96205797dff09baddd7a5ffda531044792ab73bedc6bd63fa81826'),
('osm:node:11060477921', 'https://www.openstreetmap.org/node/11060477921', '{"provider":"openstreetmap","element":{"type":"node","id":11060477921,"lat":-15.2005089,"lon":12.1297238,"tags":{"addr:city":"Moçâmedes","addr:street":"Avenida Praia Azul","amenity":"hospital","emergency":"no","healthcare":"hospital","name":"Posto Médico Kamburuku","operator":"Administração Local do Estado","operator:type":"public"}}}'::jsonb, 'd70510efdccc11382ed66d86c3b1ac5661f2834b57a548e269b61fcb4de40105', 'Posto Médico Kamburuku', 'posto m dico kamburuku', 'Avenida Praia Azul', 'Avenida Praia Azul, Moçâmedes', 'Moçâmedes', NULL, NULL, 'AO', -15.2005089, 12.1297238, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:c79d2e91bbc4ab7396542b2a143f082661d8294888a5a016d24a5f2b1076c49b'),
('osm:way:917114798', 'https://www.openstreetmap.org/way/917114798', '{"provider":"openstreetmap","element":{"type":"way","id":917114798,"center":{"lat":-14.9336306,"lon":13.4923823},"tags":{"addr:city":"Lubango","addr:housenumber":"Luta Continua","amenity":"clinic","building":"yes","healthcare":"clinic","name":"Posto Médico Privado da Sofrio"}}}'::jsonb, '87c429b85a3d35e9df09c6c97f0d592348b99348bb51873182915c5b08ac1cb0', 'Posto Médico Privado da Sofrio', 'posto m dico privado da sofrio', 'Luta Continua', 'Luta Continua, Lubango', 'Lubango', NULL, NULL, 'AO', -14.9336306, 13.4923823, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:c794cf2fd666d7a23d8e0b7afc8888a176baca9c4f4e62cb332311dc988a1178'),
('osm:way:917836820', 'https://www.openstreetmap.org/way/917836820', '{"provider":"openstreetmap","element":{"type":"way","id":917836820,"center":{"lat":-14.9329379,"lon":13.5176204},"tags":{"addr:city":"Lubango","addr:street":"Joaquim Kapango","amenity":"doctors","building":"yes","healthcare":"doctor","name":"Posto Médico Rodrigues"}}}'::jsonb, '1d977fdbf41e0671ead890fa9190086ed47aa0a5a9b01e8bc12fb5db4a37bf03', 'Posto Médico Rodrigues', 'posto m dico rodrigues', 'Joaquim Kapango', 'Joaquim Kapango, Lubango', 'Lubango', NULL, NULL, 'AO', -14.9329379, 13.5176204, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:a21b9d2525b296f52df498b498bb71c1922a8a6b40dcfcfc2d24bfaa245eb4cc'),
('osm:node:3958436338', 'https://www.openstreetmap.org/node/3958436338', '{"provider":"openstreetmap","element":{"type":"node","id":3958436338,"lat":-14.9239247,"lon":13.5201728,"tags":{"addr:city":"Lubango","amenity":"pharmacy","healthcare":"pharmacy","name":"Prince Farma","opening_hours":"8:00 - 15:30"}}}'::jsonb, '66b9e5c7365c1ac2a8fe55abb8fb48212dbb4ff69bb2541ecc31a71f9e2d4f99', 'Prince Farma', 'prince farma', NULL, 'Lubango', 'Lubango', NULL, NULL, 'AO', -14.9239247, 13.5201728, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:8c068022a11607763806dc0f845bb5fdc3a8e3e57b66d5ce92e93700ac2d70f7'),
('osm:node:5977869362', 'https://www.openstreetmap.org/node/5977869362', '{"provider":"openstreetmap","element":{"type":"node","id":5977869362,"lat":-8.79,"lon":13.310833,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Prince Farma"}}}'::jsonb, '6d4f57dbcf022769aad3eab9a03dcfa2674dfe7d8b444d754fcc79ad040e25fb', 'Prince Farma', 'prince farma', NULL, NULL, NULL, NULL, NULL, 'AO', -8.79, 13.310833, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:cbad6a4bb757e5b31a0cc49c98b271ddf0bcec391014096b903a93596bc8aa16'),
('osm:way:732756321', 'https://www.openstreetmap.org/way/732756321', '{"provider":"openstreetmap","element":{"type":"way","id":732756321,"center":{"lat":-8.8689789,"lon":13.2810723},"tags":{"addr:city":"Luanda","addr:street":"Avenida Pedro de C. Vandunem-Loy","amenity":"pharmacy","building":"yes","dispensing":"yes","healthcare":"pharmacy","name":"Prince Farma"}}}'::jsonb, '14641a53503466e41f2307f0b4e766075bc67b7e0a02c15c38f077a396aeea77', 'Prince Farma', 'prince farma', 'Avenida Pedro de C. Vandunem-Loy', 'Avenida Pedro de C. Vandunem-Loy, Luanda', 'Luanda', NULL, NULL, 'AO', -8.8689789, 13.2810723, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:1f2bb82c13a149bb028e7107425eb70ca1d61ef0d6ab647f3c541a19a1a17365'),
('osm:node:6348236499', 'https://www.openstreetmap.org/node/6348236499', '{"provider":"openstreetmap","element":{"type":"node","id":6348236499,"lat":-12.3881673,"lon":13.5478248,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Prince Farmacácia"}}}'::jsonb, 'aca67e5bcc77e43b5b0460cdd634feb63baecef5b6ffca67e61a9bdd600eb34a', 'Prince Farmacácia', 'prince farmac cia', NULL, NULL, NULL, NULL, NULL, 'AO', -12.3881673, 13.5478248, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:8c094134f8cebddca1915029b6771070816cf84f14bbb610327467615f6af98c'),
('osm:way:1328357109', 'https://www.openstreetmap.org/way/1328357109', '{"provider":"openstreetmap","element":{"type":"way","id":1328357109,"center":{"lat":-6.5481887,"lon":16.2068346},"tags":{"addr:city":"Kimbele","amenity":"hospital","healthcare":"hospital","name":"Quimbele Hospital"}}}'::jsonb, '5f9db1268b233e39642d0bdbf036dae4ca1f0064eab5e1af2121554bfc490d4d', 'Quimbele Hospital', 'quimbele hospital', NULL, 'Kimbele', 'Kimbele', NULL, NULL, 'AO', -6.5481887, 16.2068346, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:aab90d59890bd54c89b9bddc1b652c57cc10d692b50a19536562d511ef404d4c'),
('osm:way:750010753', 'https://www.openstreetmap.org/way/750010753', '{"provider":"openstreetmap","element":{"type":"way","id":750010753,"center":{"lat":-9.0673121,"lon":13.0376708},"tags":{"healthcare":"hospice","name":"Restaurante & Hospedaria Paz & Sossego","phone":"+244 923 679 624"}}}'::jsonb, 'c63c2faebf03b63534071acef4b97d620e61fb372b784d346c50df19f0edf3fd', 'Restaurante & Hospedaria Paz & Sossego', 'restaurante hospedaria paz sossego', NULL, NULL, NULL, NULL, NULL, 'AO', -9.0673121, 13.0376708, '+244 923 679 624', NULL, NULL, 'unknown', ARRAY['unknown']::text[], 0.78, 'loc:e52d4ae14f9d0857f3e4c370723a3fcef856d8acf33a12c3437e33f9e84895b7'),
('osm:node:7013273737', 'https://www.openstreetmap.org/node/7013273737', '{"provider":"openstreetmap","element":{"type":"node","id":7013273737,"lat":-9.0633962,"lon":13.0423847,"tags":{"healthcare":"hospice","name":"Restaurante & Hospedaria Weya"}}}'::jsonb, 'd68688a8d8c9b0fc01540e5480b312a475a9a37422629391d962c634bf3714be', 'Restaurante & Hospedaria Weya', 'restaurante hospedaria weya', NULL, NULL, NULL, NULL, NULL, 'AO', -9.0633962, 13.0423847, NULL, NULL, NULL, 'unknown', ARRAY['unknown']::text[], 0.78, 'loc:5b7abe691561618aeb5300f7e1144eeeec79afd81680ec16588b618d177b6c66'),
('osm:node:7772651685', 'https://www.openstreetmap.org/node/7772651685', '{"provider":"openstreetmap","element":{"type":"node","id":7772651685,"lat":-8.8964419,"lon":13.1848246,"tags":{"addr:housenumber":"11","addr:street":"Rua do Kika Gil","amenity":"dentist","name":"Risodente","phone":"926000406"}}}'::jsonb, 'c2d2f6244a65339a8576e10d7a4665c5571aaad67ad2a8fb6daff6e736ed4939', 'Risodente', 'risodente', '11 Rua do Kika Gil', '11 Rua do Kika Gil', NULL, NULL, NULL, 'AO', -8.8964419, 13.1848246, '926000406', NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:02d7bf0bbd740b91a3c57d5d55ebd1c58f037a67afc810d702bdbfdc8223104a'),
('osm:node:2873145218', 'https://www.openstreetmap.org/node/2873145218', '{"provider":"openstreetmap","element":{"type":"node","id":2873145218,"lat":-8.9484789,"lon":13.1686983,"tags":{"amenity":"pharmacy","name":"Saccir Farmácia"}}}'::jsonb, '3daee9b11f3e92103d3b821431ea206028d3c2a94859b30d621a56791b35b530', 'Saccir Farmácia', 'saccir farm cia', NULL, NULL, NULL, NULL, NULL, 'AO', -8.9484789, 13.1686983, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:8c55da625b839692d1b492238747972d8f83bbc05ff6d227e7266c65368abdac');

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
