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
('osm:node:7658568229', 'https://www.openstreetmap.org/node/7658568229', '{"provider":"openstreetmap","element":{"type":"node","id":7658568229,"lat":34.543054,"lon":69.1671967,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"رحیمیار","name:en":"Rahimyar","opening_hours:signed":"no","wheelchair":"limited"}}}'::jsonb, 'ce421cc9c8d9cbffceb8a37678bdee5d023af4c2f57994a60a1b76ce4b5b5a08', 'رحیمیار', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.543054, 69.1671967, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:47a5da278e01d736620adacc6da55a447cc4c05f2d52ece991fe83b35f18ccc6'),
('osm:way:529565355', 'https://www.openstreetmap.org/way/529565355', '{"provider":"openstreetmap","element":{"type":"way","id":529565355,"center":{"lat":34.8769832,"lon":71.1520792},"tags":{"amenity":"hospital","building":"hospital","name":"روغتون"}}}'::jsonb, 'bd528474dd1c5ea9f87d91043404ebe93df1778b8c77e130369c798c2fa12ea2', 'روغتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.8769832, 71.1520792, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:30b233b3ada4c8d9ef774bf8252a1767184b646b9fa9730c98735d457f90f529'),
('osm:node:4417477390', 'https://www.openstreetmap.org/node/4417477390', '{"provider":"openstreetmap","element":{"type":"node","id":4417477390,"lat":36.6650923,"lon":65.7575905,"tags":{"amenity":"hospital","healthcare":"hospital","name":"ریاست صحت عامه جوزجان","name:en":"Jawzjan Public Health Hospital","name:fa":"ریاست صحت عامه جوزجان"}}}'::jsonb, '15c4ec7e5fd1d5b4468902b6316a29537db192fd2f84d11ddd6fd9875f0a6e9c', 'ریاست صحت عامه جوزجان', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.6650923, 65.7575905, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:45acf5daa3294cb23108a8100764739914f35bd9ee43d34b41d5ef5915716ab8'),
('osm:node:13917959801', 'https://www.openstreetmap.org/node/13917959801', '{"provider":"openstreetmap","element":{"type":"node","id":13917959801,"lat":34.3503381,"lon":62.1959337,"tags":{"amenity":"hospital","name":"زایشگاه"}}}'::jsonb, 'a6abc005e621ad68d7378b2d1332c3411bf4039a86ed4ebfca4a582e665b572a', 'زایشگاه', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.3503381, 62.1959337, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:db38f463001d8b5e561c658711e61d7d1a58cbd8e899f80e326d24446d3a6169'),
('osm:node:13719858845', 'https://www.openstreetmap.org/node/13719858845', '{"provider":"openstreetmap","element":{"type":"node","id":13719858845,"lat":33.9314766,"lon":68.6811522,"tags":{"addr:city":"اوتړی","addr:street":"بزرگراه کابل به غزنی","amenity":"hospital","emergency":"yes","healthcare":"hospital","name":"سپین کلینیک"}}}'::jsonb, 'd420cb2e4b2a96b8e495aa7f3f33c5698766e71af2129b8fb3869f0a66b1d545', 'سپین کلینیک', NULL, 'بزرگراه کابل به غزنی', 'بزرگراه کابل به غزنی, اوتړی', 'اوتړی', NULL, NULL, 'AF', 33.9314766, 68.6811522, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:18389c8f5447398121fdec69a78a5ea138d47958891520288ca4b33b2eee691a'),
('osm:way:388620882', 'https://www.openstreetmap.org/way/388620882', '{"provider":"openstreetmap","element":{"type":"way","id":388620882,"center":{"lat":31.6122898,"lon":65.7027083},"tags":{"amenity":"hospital","building":"hospital","building:levels":"5","name":"سيال معالجوي روغتون"}}}'::jsonb, '2eb056bc8fd9fe0ee369e0ce0ad940384f6902e722acf9c9f86d1a1c52e0f13d', 'سيال معالجوي روغتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 31.6122898, 65.7027083, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:f4408749591533f33c260b5e6790ec478f0c7aaa695f6a90789d102e96f08b11'),
('osm:way:559082762', 'https://www.openstreetmap.org/way/559082762', '{"provider":"openstreetmap","element":{"type":"way","id":559082762,"center":{"lat":33.6945471,"lon":69.3817363},"tags":{"addr:city":"Paktia","addr:street":"R-C","amenity":"hospital","healthcare":"hospital","name":"سید کرم روغتون","name:en":"Sayed Karam Clinic"}}}'::jsonb, '3f60abae9bd7df725ae7a220f0509b5ad64b383d5c61cb169edfb822327d607f', 'سید کرم روغتون', NULL, 'R-C', 'R-C, Paktia', 'Paktia', NULL, NULL, 'AF', 33.6945471, 69.3817363, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:c4bb78a25a15604607734bde399da3be163aed08594b68595dcb9b60bc6f9333'),
('osm:node:7138237319', 'https://www.openstreetmap.org/node/7138237319', '{"provider":"openstreetmap","element":{"type":"node","id":7138237319,"lat":34.5357191,"lon":69.1801236,"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاجو روغتون","name:en":"Shefajo Medical Labarotary"}}}'::jsonb, 'ed4e9080b85f8453b56a749015d10108fc3a128549cbfecd5481c12b83e57dc4', 'شفاجو روغتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5357191, 69.1801236, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:71ca9b47cd9e3a0a6d9349a1dce4dad5ab702841eaf1b5515cbfa267acdafe4c'),
('osm:way:443615847', 'https://www.openstreetmap.org/way/443615847', '{"provider":"openstreetmap","element":{"type":"way","id":443615847,"center":{"lat":33.3423881,"lon":69.9224929},"tags":{"alt_name":"صفاخانه;Shefakhanah;Safakhanah;Safakhana;Shafakhanah","amenity":"hospital","gns:dsg":"HSP: hospital","healthcare":"hospital","name":"شفاخانه","name:en":"Shifa Khanah","name:ps":"شفاخانه","source:name":"GNS"}}}'::jsonb, '1faa725fa5cb33077f482c289dd831c9853e8b4a2e8241a04c1e75a5020ce33d', 'شفاخانه', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.3423881, 69.9224929, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:500eb414e78dad05fecf16f81cea393afca5420cf66b75b9f425227ad518da36'),
('osm:way:1337059818', 'https://www.openstreetmap.org/way/1337059818', '{"provider":"openstreetmap","element":{"type":"way","id":1337059818,"center":{"lat":34.5209268,"lon":69.133755},"tags":{"amenity":"hospital","beds":"200","name":"شفاخانه آتاترک","name:en":"Ataturk Hospital","name:ru":"Больница Ататюрк","wikidata":"Q111940986","wikipedia":"en:Atatürk Children''s Hospital"}}}'::jsonb, 'e7a6a7f87bae4e397f2dd155a533514e30cfe33f516bfad00a702e094e7d3099', 'شفاخانه آتاترک', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5209268, 69.133755, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:8a04c2b814e4621984d4e34c144b1a39666f9e370dcd61af0881111b54ceb673'),
('osm:node:7418933586', 'https://www.openstreetmap.org/node/7418933586', '{"provider":"openstreetmap","element":{"type":"node","id":7418933586,"lat":34.5569297,"lon":69.1403241,"tags":{"addr:city":"كابل","amenity":"hospital","healthcare":"hospital","name":"شفاخانه آریا سیتی"}}}'::jsonb, '30608da203825b7bcaf982c2d3b87f94bec97b858230763587c6f8e18c006405', 'شفاخانه آریا سیتی', NULL, NULL, 'كابل', 'كابل', NULL, NULL, 'AF', 34.5569297, 69.1403241, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:86cee22cf91c8cc123f5932b40c62805c4bce68776ba19d1c3b01392f8e02ba6'),
('osm:node:13921837001', 'https://www.openstreetmap.org/node/13921837001', '{"provider":"openstreetmap","element":{"type":"node","id":13921837001,"lat":34.3501281,"lon":62.2075024,"tags":{"amenity":"hospital","name":"شفاخانه آریااپلو"}}}'::jsonb, '00cbeb3ccebf7cec5f72e30ba4d77bdcc2d489d11ab7070a0b4f37008f63533b', 'شفاخانه آریااپلو', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.3501281, 62.2075024, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:70a84c9e9566814da5b8c0eceb850dcffcc88a05c1d8f42ab22de55b520d93e2'),
('osm:node:8838139286', 'https://www.openstreetmap.org/node/8838139286', '{"provider":"openstreetmap","element":{"type":"node","id":8838139286,"lat":36.2641636,"lon":68.0119565,"tags":{"amenity":"clinic","healthcare":"clinic","name":"شفاخانه آرین"}}}'::jsonb, '5361e08ad7978b6ecd77c910a6d31e23e1721725b8f5286677b27be87a306610', 'شفاخانه آرین', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2641636, 68.0119565, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:72b4bc2e527a8cc74efea01558efeee5f271b59afac00fc5d1403fb295eaace2'),
('osm:node:13921836703', 'https://www.openstreetmap.org/node/13921836703', '{"provider":"openstreetmap","element":{"type":"node","id":13921836703,"lat":34.3505086,"lon":62.2077152,"tags":{"amenity":"hospital","name":"شفاخانه ابن سینا حکیم"}}}'::jsonb, '7976c4eb958fe7512f8fbcd783675fdb3ed2a67a104bb99fea8b763248cef038', 'شفاخانه ابن سینا حکیم', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.3505086, 62.2077152, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:31698229d726cd4d335c331e014d1d879f8060e2c16a62d0f1390b399b3e0678'),
('osm:way:938528334', 'https://www.openstreetmap.org/way/938528334', '{"provider":"openstreetmap","element":{"type":"way","id":938528334,"center":{"lat":34.5121451,"lon":69.1243475},"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه ابو علی سینا"}}}'::jsonb, 'bdbdf5c77d88951a9ab1ed4c8e351fd27df3c981f948ee36d4aaf0cd8f743cec', 'شفاخانه ابو علی سینا', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5121451, 69.1243475, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:4e3ace22fb3a64384236c68df5bc3d2fbba88931f9753663e8366fd754460f87'),
('osm:way:25966581', 'https://www.openstreetmap.org/way/25966581', '{"provider":"openstreetmap","element":{"type":"way","id":25966581,"center":{"lat":34.4885619,"lon":69.1362702},"tags":{"addr:country":"AF","addr:district":"District 4","addr:province":"Kabul","amenity":"hospital","healthcare":"hospital","level":"1","name":"شفاخانه استقلال","name:en":"Isteqlal Hospital","opening_hours":"24/7","operational_status":"Operational","operator:type":"public/government","phone":"+93 77 002 5237","source":"OSM"}}}'::jsonb, '1836ad95e5993d6164de2ef18fe6f803aa3f526e41b18c4c18883fd77aa327f5', 'شفاخانه استقلال', NULL, NULL, 'Kabul', NULL, 'Kabul', NULL, 'AF', 34.4885619, 69.1362702, '+93 77 002 5237', NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:71f9162e7e0c4c0fd4e3f7013d23735821eb5a3ed76d223945a9f60852f0a919'),
('osm:node:8806213051', 'https://www.openstreetmap.org/node/8806213051', '{"provider":"openstreetmap","element":{"type":"node","id":8806213051,"lat":34.5347898,"lon":69.1381517,"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه اطلس"}}}'::jsonb, '58c506c48474ff8912d1c460e05fa484754bd00a35cf242f80be9ec475319dfa', 'شفاخانه اطلس', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5347898, 69.1381517, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:9b862fc2be49d7fa8b7ecb8e2adab6b2530ab8b33157eb6c8918b5079d4bd275'),
('osm:way:925064260', 'https://www.openstreetmap.org/way/925064260', '{"provider":"openstreetmap","element":{"type":"way","id":925064260,"center":{"lat":34.4757698,"lon":69.0825057},"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه افشار","name:en":"Afshar Hospital"}}}'::jsonb, '043d8a186981a2ee270c9e25162c42cd879fdc7231d0e83722f9d0a6de63951e', 'شفاخانه افشار', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.4757698, 69.0825057, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:10f9b914b7a8b4cf393b38e5882c35a779ad4295499f2c31f355a487d1a5a3be'),
('osm:node:8489160754', 'https://www.openstreetmap.org/node/8489160754', '{"provider":"openstreetmap","element":{"type":"node","id":8489160754,"lat":34.5729552,"lon":69.1220974,"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه افغان"}}}'::jsonb, '8c14b65dbb848bbd781b113cf71e973473ed7e92026a149261d3a146004bbf69', 'شفاخانه افغان', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5729552, 69.1220974, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:bacfd268b1f88e7a64c5f30cde3b28b062c73348112b631622aea4936abfb883'),
('osm:node:6557359963', 'https://www.openstreetmap.org/node/6557359963', '{"provider":"openstreetmap","element":{"type":"node","id":6557359963,"lat":34.3416078,"lon":62.1986436,"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه افغان آریا"}}}'::jsonb, 'f02808ba87b863a6973e2034942f0e5beb8a983c7b892c8a1e815bcfb377e3c9', 'شفاخانه افغان آریا', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.3416078, 62.1986436, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:f968cfb840513c84df519df756ebf83ce279493fcd4dc3ca45d3b958c397377e'),
('osm:node:13916752102', 'https://www.openstreetmap.org/node/13916752102', '{"provider":"openstreetmap","element":{"type":"node","id":13916752102,"lat":34.3484051,"lon":62.1819827,"tags":{"amenity":"hospital","name":"شفاخانه افغان ترکان"}}}'::jsonb, 'bccf932bde5399658bf57cd7e694e35b67e6489709bab33e6c808a8d70e9f5e5', 'شفاخانه افغان ترکان', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.3484051, 62.1819827, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:fac2f6d6b9bd5763472f01fe0f6449128e11de091ec082973bfa380093430a9d'),
('osm:node:13919227902', 'https://www.openstreetmap.org/node/13919227902', '{"provider":"openstreetmap","element":{"type":"node","id":13919227902,"lat":34.3485534,"lon":62.2082562,"tags":{"amenity":"hospital","name":"شفاخانه افغان سلامت"}}}'::jsonb, 'c095e25426fff76c001f1e65ae390097608b7a10146fd33acb8462b1a271bd5e', 'شفاخانه افغان سلامت', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.3485534, 62.2082562, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:e8e614825498bf1aa4ddf30551ce28d72a85080569872dfa924b1448d556938e'),
('osm:node:8012165366', 'https://www.openstreetmap.org/node/8012165366', '{"provider":"openstreetmap","element":{"type":"node","id":8012165366,"lat":34.5062982,"lon":69.1261551,"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه الخیر"}}}'::jsonb, '1eeb4e62f110ae65e850262fc30b875dd2f43b1dcf1775891db3a466b9423767', 'شفاخانه الخیر', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5062982, 69.1261551, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:f6d002a3dcda99aa81a06531eb545d67643e65572390f077c7b388a9a2de4163'),
('osm:node:5973861583', 'https://www.openstreetmap.org/node/5973861583', '{"provider":"openstreetmap","element":{"type":"node","id":5973861583,"lat":34.4989828,"lon":69.0613719,"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه امام زمان"}}}'::jsonb, '6f166765671fab748a787e3314c46449bce149cb7eefb9f35624e14c7c4dcb22', 'شفاخانه امام زمان', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.4989828, 69.0613719, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:c6b53631e94028fb67627c3c29da6ff13851fa117710101481a5da4e3a4556d1'),
('osm:way:1209266755', 'https://www.openstreetmap.org/way/1209266755', '{"provider":"openstreetmap","element":{"type":"way","id":1209266755,"center":{"lat":33.0197847,"lon":67.5034289},"tags":{"amenity":"hospital","building":"hospital","name":"شفاخانه امام علی","name:en":"Emam Ali Hospital"}}}'::jsonb, 'bdfed7d77f089861039a7c230e89f159f0957a30e15ab2944bea7a57dc8a0f3c', 'شفاخانه امام علی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.0197847, 67.5034289, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:ac9ecfdcbecdcac237c2fefb6090e216691f32477cc37ec2854e77d348a2ddd8'),
('osm:node:7098425520', 'https://www.openstreetmap.org/node/7098425520', '{"provider":"openstreetmap","element":{"type":"node","id":7098425520,"lat":34.5508673,"lon":69.1466742,"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه امان یشفین"}}}'::jsonb, '3184ab1f127a8da662ef0068b7d570662353eff4e298e40ee015b6f85a3f7f6f', 'شفاخانه امان یشفین', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5508673, 69.1466742, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:f807082dcebc12b359f1214e1cf908de931101ee5d26ec2511e064c543ead0d3'),
('osm:way:713727067', 'https://www.openstreetmap.org/way/713727067', '{"provider":"openstreetmap","element":{"type":"way","id":713727067,"center":{"lat":34.5326982,"lon":69.1747493},"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه امرجنسی","name:en":"Emergency Hospital","name:ru":"Больница скорой помощи","opening_hours":"24/7","operational_status":"Licensed","operator:type":"private/ngo"}}}'::jsonb, 'db2a1d9936061983c3f12ef4218667c6312dc725f795075ba951cf452211d2ed', 'شفاخانه امرجنسی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5326982, 69.1747493, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:e70c35b8d7f324ca45d09c5e8d8889dea8f5114d1baa39894d12cb0af3024d05'),
('osm:node:8489102113', 'https://www.openstreetmap.org/node/8489102113', '{"provider":"openstreetmap","element":{"type":"node","id":8489102113,"lat":34.576533,"lon":69.0974811,"tags":{"amenity":"clinic","healthcare":"clinic","name":"شفاخانه اورتپیدی کمال"}}}'::jsonb, '12686eb9d980f29c7658047b047437b945c525911662ae6c19ca82a46c58218f', 'شفاخانه اورتپیدی کمال', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.576533, 69.0974811, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:ddbe61883ec09df716b2d8540a38e1f1175bfd97c745dac3604557e2f80c10d8'),
('osm:way:303804159', 'https://www.openstreetmap.org/way/303804159', '{"provider":"openstreetmap","element":{"type":"way","id":303804159,"center":{"lat":34.5369186,"lon":69.186502},"tags":{"amenity":"hospital","building":"hospital","healthcare":"hospital","healthcare:speciality":"Orthopedy","name":"شفاخانه اورتوپدی کابل","name:en":"Kabul Orthopedic Hospital"}}}'::jsonb, '21eacb89150f944d5b51dcc9b4c9fa52828d7b1056616b95c4516088236527b8', 'شفاخانه اورتوپدی کابل', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5369186, 69.186502, NULL, NULL, NULL, 'hospital', ARRAY['hospital', 'specialist']::text[], 0.78, 'loc:86b3304ef2dafa7711ba0f65f2a4856eee05abec672fd90924c5e4b088acceda'),
('osm:way:634156324', 'https://www.openstreetmap.org/way/634156324', '{"provider":"openstreetmap","element":{"type":"way","id":634156324,"center":{"lat":34.5395657,"lon":69.1536822},"tags":{"amenity":"hospital","building":"hospital","name":"شفاخانه اوستا","name:en":"Avesta Hospital"}}}'::jsonb, 'de25f755ee2d66d49d6ad88ac2fff6abdf1adf8b4d89c8f96f2a0d783ab7e2ee', 'شفاخانه اوستا', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5395657, 69.1536822, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:2671aed52e68730955b51b14aa2bd9345167e3698c836a72ac0187e7fcba4233'),
('osm:way:828156265', 'https://www.openstreetmap.org/way/828156265', '{"provider":"openstreetmap","element":{"type":"way","id":828156265,"center":{"lat":34.928801,"lon":68.4549684},"tags":{"amenity":"hospital","barrier":"wall","healthcare":"hospital","name":"شفاخانه بیست بستر شیخ علی","name:en":"Sheikh Ali Hospital"}}}'::jsonb, '4ffbc5d2b436619fc4dfc22ae54ca09b81676ec8fe60e42802f368290541591a', 'شفاخانه بیست بستر شیخ علی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.928801, 68.4549684, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:331d2a03dec8e830632188861b020d9afebfc480db03baccb777eede85148c1e'),
('osm:node:8838139300', 'https://www.openstreetmap.org/node/8838139300', '{"provider":"openstreetmap","element":{"type":"node","id":8838139300,"lat":36.2767296,"lon":68.0294202,"tags":{"amenity":"clinic","healthcare":"clinic","name":"شفاخانه بیست بستر مراقبت و تداوی بیماران کوید 19"}}}'::jsonb, '20d145169c1bcc0673a08057e1c32fe34977baeee4e0d47fd6a2f64c303beed8', 'شفاخانه بیست بستر مراقبت و تداوی بیماران کوید 19', '19', NULL, NULL, NULL, NULL, NULL, 'AF', 36.2767296, 68.0294202, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:774dc2c5bfa6aa42db4ec187a4018c0875992248805089410bd5d193a5b737a6'),
('osm:way:827886374', 'https://www.openstreetmap.org/way/827886374', '{"provider":"openstreetmap","element":{"type":"way","id":827886374,"center":{"lat":34.8254086,"lon":67.8383242},"tags":{"amenity":"hospital","building":"hospital","healthcare":"hospital","name":"شفاخانه بیست بستر مهدی","name:en":"Mahdi"}}}'::jsonb, '2fbb5b4d0126d923475ab6b151deae239db425e2c2b238d86c7a262bad78b5ec', 'شفاخانه بیست بستر مهدی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.8254086, 67.8383242, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:1f8ba45aca1491a3139f5a43b7abced4f631eb90b304ef838315a2d2a718ba64'),
('osm:node:13919238601', 'https://www.openstreetmap.org/node/13919238601', '{"provider":"openstreetmap","element":{"type":"node","id":13919238601,"lat":34.3505517,"lon":62.2003309,"tags":{"amenity":"hospital","name":"شفاخانه بین المللی حبیب یار"}}}'::jsonb, '1e7582e18a4e62eacaa138d20cf8b337458600d105999f11ef7af43847ef6a36', 'شفاخانه بین المللی حبیب یار', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.3505517, 62.2003309, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:c8b96d2b346d95b92583f2a12651b769df0e6805894a82a06897a1fff078346d'),
('osm:way:699685336', 'https://www.openstreetmap.org/way/699685336', '{"provider":"openstreetmap","element":{"type":"way","id":699685336,"center":{"lat":34.4737238,"lon":69.1241883},"tags":{"amenity":"hospital","emergency":"yes","healthcare":"hospital","name":"شفاخانه بین المللی کیور","name:en":"CURE International Hospital of Kabul"}}}'::jsonb, 'ce2009fca4320bb7baa1515330d0c06537570a659e7d2c874d1aa873093dd348', 'شفاخانه بین المللی کیور', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.4737238, 69.1241883, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:e224df3aed9b5962c695f39f6779863bee0d98f3ef082380b252fb6eacca4200'),
('osm:way:713905504', 'https://www.openstreetmap.org/way/713905504', '{"provider":"openstreetmap","element":{"type":"way","id":713905504,"center":{"lat":34.5540595,"lon":69.1445236},"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه جلدی روز","name:en":"Rose Dermatology Hospital"}}}'::jsonb, 'fd5c21a8065130844f9481a85d8d260da6968a5196c9844657f527174045b714', 'شفاخانه جلدی روز', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5540595, 69.1445236, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:acde3f8ec7d41eb949e2bf95047a7084522883a970a0c789825e912a416e1ea1'),
('osm:node:8612115496', 'https://www.openstreetmap.org/node/8612115496', '{"provider":"openstreetmap","element":{"type":"node","id":8612115496,"lat":34.5055693,"lon":69.1391319,"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه جلدی و زیبایی زیتون"}}}'::jsonb, 'f85616c9de3e33e0cc4c23edfdc05dd6772bdac76efd573912d51394a5991ae7', 'شفاخانه جلدی و زیبایی زیتون', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5055693, 69.1391319, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:a04616cd5b97d9f7b07691684736b41caa9350800f39d0d5744b926f5d0fc07a'),
('osm:way:710563825', 'https://www.openstreetmap.org/way/710563825', '{"provider":"openstreetmap","element":{"type":"way","id":710563825,"center":{"lat":34.5023697,"lon":69.0985874},"tags":{"alt_name":"جناح روغتون","amenity":"hospital","healthcare":"hospital","name":"شفاخانه جناح","name:ru":"Больница Джинна","wikidata":"Q28169618","wikipedia":"en:Jinnah Hospital, Kabul"}}}'::jsonb, 'ec007810eff4033bac727791b6970ecd7178acfdd7c799e4111dfca8c963aee3', 'شفاخانه جناح', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5023697, 69.0985874, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:7fdc15a6092620679877dad6e5aa4a30505270a7aae951a0efad44a596812c34'),
('osm:way:732866291', 'https://www.openstreetmap.org/way/732866291', '{"provider":"openstreetmap","element":{"type":"way","id":732866291,"center":{"lat":34.555127,"lon":69.1598139},"tags":{"amenity":"hospital","building":"yes","building:levels":"7","healthcare":"hospital","name":"شفاخانه چراغ"}}}'::jsonb, '1c24a1e75ed27710a0992755a65c30007a5d39fc79f93852d5795459b927a595', 'شفاخانه چراغ', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.555127, 69.1598139, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:f94b3fa5b4395dac7e096cbb1bcffe5ca4da34b2a7b4e81ebe0c56bc2c083441'),
('osm:node:7183733167', 'https://www.openstreetmap.org/node/7183733167', '{"provider":"openstreetmap","element":{"type":"node","id":7183733167,"lat":33.6308143,"lon":69.2323949,"tags":{"amenity":"hospital","name":"شفاخانه حوزوی پکتبا"}}}'::jsonb, '784a95ad54c3deb224cc4aeed3114533f346a917fe3a0380d0bff1d0047e3d03', 'شفاخانه حوزوی پکتبا', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.6308143, 69.2323949, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:ac775f9feff0271309080dc77083c2fdd064b176fba77243dcdc6501b2628904'),
('osm:node:7183733170', 'https://www.openstreetmap.org/node/7183733170', '{"provider":"openstreetmap","element":{"type":"node","id":7183733170,"lat":33.624541,"lon":69.2276017,"tags":{"amenity":"hospital","name":"شفاخانه حیات الله خالقیار"}}}'::jsonb, 'eabfc5b4c9e94b284dbbe98ba1176facae7c4aac6a299d30b1e6bba41ec3e741', 'شفاخانه حیات الله خالقیار', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 33.624541, 69.2276017, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:185809429780cbf791db0653b966657e7a3f405777b749a2321510368ae13200'),
('osm:node:8599220168', 'https://www.openstreetmap.org/node/8599220168', '{"provider":"openstreetmap","element":{"type":"node","id":8599220168,"lat":34.551656,"lon":69.1466359,"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه خدمت","name:en":"Kidmat Hospital"}}}'::jsonb, 'bfd95c7aaf6ef89d8182c43f6807ce66ffd571301de4f6c24439f4776f6bcbd2', 'شفاخانه خدمت', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.551656, 69.1466359, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:c42aa85ae2e796b5f607020e48ca09a82a5e1b15176becccf4cf2af8908163cb'),
('osm:node:6383506445', 'https://www.openstreetmap.org/node/6383506445', '{"provider":"openstreetmap","element":{"type":"node","id":6383506445,"lat":34.5883595,"lon":69.0854374,"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه خرمی","name:en":"Khurami hospital"}}}'::jsonb, '0e186cc9fffa29164d92aa7e2f10d6d0ebd81f5c3e152af81001c554603175ce', 'شفاخانه خرمی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5883595, 69.0854374, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:e28961b8d1376500f4568ee08b953e657f25526ac4d187ed020753b7562a7fc6'),
('osm:node:5973874361', 'https://www.openstreetmap.org/node/5973874361', '{"provider":"openstreetmap","element":{"type":"node","id":5973874361,"lat":34.5092102,"lon":69.0584841,"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه داکتر غضنفر"}}}'::jsonb, '9d71545d544a15779cb388671dccc62fca22749dc94d6c486ca7e1d81af49cec', 'شفاخانه داکتر غضنفر', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5092102, 69.0584841, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:51f33b0c6df2a3292cea7fcc956b048c8081416db695c93e29cf7971b2a82d04'),
('osm:way:303804173', 'https://www.openstreetmap.org/way/303804173', '{"provider":"openstreetmap","element":{"type":"way","id":303804173,"center":{"lat":34.5316698,"lon":69.1762268},"tags":{"amenity":"hospital","building":"hospital","healthcare":"hospital","name":"شفاخانه رایل","name:en":"Royal Medical Complex","name:ps":"روغتون رایل"}}}'::jsonb, 'ba8b79a9e542c831475d14138ae6f7239a1921f43372ad12189c0ab534e9f621', 'شفاخانه رایل', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5316698, 69.1762268, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:3b772e2b300dbd92172c8f06f71f0d24e69bf5f258b606592987d6513884f87c'),
('osm:node:5841329185', 'https://www.openstreetmap.org/node/5841329185', '{"provider":"openstreetmap","element":{"type":"node","id":5841329185,"lat":36.7191649,"lon":68.8709435,"tags":{"amenity":"clinic","name":"شفاخانه رحمان بابا","name:en":"Rahman baba clinic"}}}'::jsonb, '9e5a698fb53cf7f6ae97f1763666d120c07d7e503b5b5469c82e90a5e1d62486', 'شفاخانه رحمان بابا', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.7191649, 68.8709435, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:0c773b1fcaf59f2c46ce4312559f646a2ad57c46806a68554f0f99ea37787d7b'),
('osm:node:8838139282', 'https://www.openstreetmap.org/node/8838139282', '{"provider":"openstreetmap","element":{"type":"node","id":8838139282,"lat":36.2618705,"lon":68.0133809,"tags":{"amenity":"clinic","healthcare":"clinic","name":"شفاخانه شخصی"}}}'::jsonb, '1fbc2f801a2ea073c30028aeecd6dfdb2dcefd2d3fae565254b31d501d14e431', 'شفاخانه شخصی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 36.2618705, 68.0133809, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:e3794f10c9eeabd3bf387a17536b02397f9c99e6762111df7b6feb6cd911b5cf'),
('osm:node:6557359962', 'https://www.openstreetmap.org/node/6557359962', '{"provider":"openstreetmap","element":{"type":"node","id":6557359962,"lat":34.3422722,"lon":62.1980964,"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه صبا"}}}'::jsonb, '812b561ca1400ecb7322391aa1d4385905a5d63740d088880575e2906f51f7ef', 'شفاخانه صبا', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.3422722, 62.1980964, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:d9b9245ee5a4383dd427d4c7ae5f334323eb23dd6614d652dcb1327324f0902f'),
('osm:node:8916061586', 'https://www.openstreetmap.org/node/8916061586', '{"provider":"openstreetmap","element":{"type":"node","id":8916061586,"lat":34.5340203,"lon":69.1384737,"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه صحت شهر"}}}'::jsonb, '031d1f710e1bf88979536f325b04cbc049e4a4d83c073d27ff3591816111d322', 'شفاخانه صحت شهر', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.5340203, 69.1384737, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:066dc2fd83b2429abfda4d33789cf34e1aed8745b3a9c49d9182fd7ac1a90fff'),
('osm:node:5973860093', 'https://www.openstreetmap.org/node/5973860093', '{"provider":"openstreetmap","element":{"type":"node","id":5973860093,"lat":34.4988624,"lon":69.0609593,"tags":{"amenity":"hospital","healthcare":"hospital","name":"شفاخانه عالمی"}}}'::jsonb, 'fb7ea44fe630e3fd5a1a2dd30f008061105bf6352824112d0782f7c12e65e4e1', 'شفاخانه عالمی', NULL, NULL, NULL, NULL, NULL, NULL, 'AF', 34.4988624, 69.0609593, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:5284a8912153b114083b485e49af9966b020216ff5dab0cfd02158239bdc2519');

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
