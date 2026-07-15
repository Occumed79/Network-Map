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
('osm:node:6823209807', 'https://www.openstreetmap.org/node/6823209807', '{"provider":"openstreetmap","element":{"type":"node","id":6823209807,"lat":41.3428384,"lon":19.4425151,"tags":{"addr:street":"Rruga Aleksander Goga","amenity":"pharmacy","name":"Farmaci Igli"}}}'::jsonb, 'd664b5fb38f077ef6599490f0cbc4495d2a07cf1a9294a77acae4769bbf12943', 'Farmaci Igli', 'farmaci igli', 'Rruga Aleksander Goga', 'Rruga Aleksander Goga', NULL, NULL, NULL, 'AL', 41.3428384, 19.4425151, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:9cef588ca69f8bdd80d20c1f337f7a87ba541018ee4987ccf1cd1a520ab605b3'),
('osm:node:6879955289', 'https://www.openstreetmap.org/node/6879955289', '{"provider":"openstreetmap","element":{"type":"node","id":6879955289,"lat":41.3195813,"lon":19.4478795,"tags":{"addr:street":"Rruga Kasem Durrësi","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Iris"}}}'::jsonb, '61688ac8bade14026e826abd8005e4d32940814c0e8c1cae16b84c5518fb5104', 'Farmaci Iris', 'farmaci iris', 'Rruga Kasem Durrësi', 'Rruga Kasem Durrësi', NULL, NULL, NULL, 'AL', 41.3195813, 19.4478795, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:5f39f1559467d3e747e595ada5970df48eb13c24ccec294654f8bb202823c5a7'),
('osm:node:9060921401', 'https://www.openstreetmap.org/node/9060921401', '{"provider":"openstreetmap","element":{"type":"node","id":9060921401,"lat":40.9431566,"lon":19.7037554,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmaci Irma Prifti","opening_hours":"Mo-Su 08:00-14:00,16:00-21:00","wheelchair":"no"}}}'::jsonb, '47a25ea3e813d404d4e087974baf262f47b01200f354bad9f96d122a863200cd', 'Farmaci Irma Prifti', 'farmaci irma prifti', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9431566, 19.7037554, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:0694f05585b70245e0db6bff81f94bf59fb37f1b0aee615b4adcc6888a8d823f'),
('osm:node:6872100702', 'https://www.openstreetmap.org/node/6872100702', '{"provider":"openstreetmap","element":{"type":"node","id":6872100702,"lat":41.3272931,"lon":19.4466537,"tags":{"addr:street":"Rruga Kristo Sotiri","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci J. Cullhaj"}}}'::jsonb, '04f3b13561ab21de0fa320c28986abffe919465684169e590dc265b21abebd9a', 'Farmaci J. Cullhaj', 'farmaci j cullhaj', 'Rruga Kristo Sotiri', 'Rruga Kristo Sotiri', NULL, NULL, NULL, 'AL', 41.3272931, 19.4466537, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:9a541b5fa7c8f01ae0f62af5e24bbd8c5597df3b72da319b9f3447d9e866f7fb'),
('osm:node:6838135087', 'https://www.openstreetmap.org/node/6838135087', '{"provider":"openstreetmap","element":{"type":"node","id":6838135087,"lat":41.3328511,"lon":19.4514006,"tags":{"addr:street":"Rruga Petrit Llaftiu","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Joens"}}}'::jsonb, '7f305ad729be160f9f7e4eeed07db9a31a5336ccd88e01c947989bc6801cc941', 'Farmaci Joens', 'farmaci joens', 'Rruga Petrit Llaftiu', 'Rruga Petrit Llaftiu', NULL, NULL, NULL, 'AL', 41.3328511, 19.4514006, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:8bdcad55f82232374100c50ac68010543e98a136465be65e43320166848e186f'),
('osm:node:2142535509', 'https://www.openstreetmap.org/node/2142535509', '{"provider":"openstreetmap","element":{"type":"node","id":2142535509,"lat":41.1818527,"lon":19.5487606,"tags":{"addr:street":"Rruga Qazim Kariqi","amenity":"pharmacy","name":"Farmaci Jona"}}}'::jsonb, '6339d56966ff02266e483d049bbf97c277b518f2047ae5f00849fa1d703f087e', 'Farmaci Jona', 'farmaci jona', 'Rruga Qazim Kariqi', 'Rruga Qazim Kariqi', NULL, NULL, NULL, 'AL', 41.1818527, 19.5487606, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:ab4ad9d175acd39f7cace1a83943589ec7c34db16717c8c61522507a1423c36b'),
('osm:node:10577728857', 'https://www.openstreetmap.org/node/10577728857', '{"provider":"openstreetmap","element":{"type":"node","id":10577728857,"lat":41.3173563,"lon":19.4451393,"tags":{"amenity":"pharmacy","contact:facebook":"https://www.facebook.com/farmaci.kazanxhi","contact:instagram":"https://www.instagram.com/farmacikazanxhi/","healthcare":"pharmacy","name":"Farmaci Kazanxhi"}}}'::jsonb, 'd9d913c23ef4cc04e24f7633250b93d265d5e22fd8e0f613a9fb125e3b2eb2ae', 'Farmaci Kazanxhi', 'farmaci kazanxhi', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3173563, 19.4451393, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:2e7bedc535eb7a5d4fc127c4397a2ee18b6673e99817f5f8398b7de2ba1f1a9a'),
('osm:node:6763905185', 'https://www.openstreetmap.org/node/6763905185', '{"provider":"openstreetmap","element":{"type":"node","id":6763905185,"lat":41.2926173,"lon":19.5085596,"tags":{"addr:street":"Rruga Shkëmbi i Kavajës","amenity":"pharmacy","name":"Farmaci Kela","name:en":"Kela","opening_hours":"Mo-Su 08:00-23:00"}}}'::jsonb, '1d97f103ecec389653896d0249b6befba5ab09b41c911858242a565dc73352cb', 'Farmaci Kela', 'farmaci kela', 'Rruga Shkëmbi i Kavajës', 'Rruga Shkëmbi i Kavajës', NULL, NULL, NULL, 'AL', 41.2926173, 19.5085596, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:2a9be5e8df7b9d58a7f3f2aecdb874ede727063ec86b68135085042a95a05b38'),
('osm:node:3498798024', 'https://www.openstreetmap.org/node/3498798024', '{"provider":"openstreetmap","element":{"type":"node","id":3498798024,"lat":41.3241297,"lon":19.8338099,"tags":{"amenity":"pharmacy","dispensing":"no","healthcare":"pharmacy","name":"Farmaci Kena"}}}'::jsonb, '2e51bcf1c581f56b034cbcc695113e106330e496a762d469292edb07b9b27239', 'Farmaci Kena', 'farmaci kena', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3241297, 19.8338099, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:dcab761c3a05b8a19dd853045af9181e773ef00939d4fc9f10c8e964e39e1a5e'),
('osm:node:4341405692', 'https://www.openstreetmap.org/node/4341405692', '{"provider":"openstreetmap","element":{"type":"node","id":4341405692,"lat":40.7040857,"lon":19.9533754,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Kica"}}}'::jsonb, 'bef231ddc085df338a466bbaa9791fc36a9f47e06950de2d5aeea24647027d74', 'Farmaci Kica', 'farmaci kica', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7040857, 19.9533754, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:61e8173eca27feed354844c0c3603296beaba9d06937d587467bd43f45a3cbd2'),
('osm:node:6621147784', 'https://www.openstreetmap.org/node/6621147784', '{"provider":"openstreetmap","element":{"type":"node","id":6621147784,"lat":40.7220088,"lon":19.556179,"tags":{"amenity":"pharmacy","name":"Farmaci Klodi"}}}'::jsonb, '74a95aa7a328f53e712a3421bccf904176e2bfe14406d93aace932d270dd8985', 'Farmaci Klodi', 'farmaci klodi', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7220088, 19.556179, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:2dd2f7d24ba91c8b21e8e16cd8502216386add9c808e315ad684bb2ea4820e6d'),
('osm:node:9264708200', 'https://www.openstreetmap.org/node/9264708200', '{"provider":"openstreetmap","element":{"type":"node","id":9264708200,"lat":41.334076,"lon":19.8095532,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmaci Konomi"}}}'::jsonb, 'a1d1dc2777c99ebda36dcd314b132653aff041ade4c9536a6cc0ab836a00930b', 'Farmaci Konomi', 'farmaci konomi', NULL, NULL, NULL, NULL, NULL, 'AL', 41.334076, 19.8095532, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:d60482d2a78561e59bd79ab49267ef757b2431ecead9582b7b19d469e837cc14'),
('osm:node:13830506000', 'https://www.openstreetmap.org/node/13830506000', '{"provider":"openstreetmap","element":{"type":"node","id":13830506000,"lat":40.9389069,"lon":19.7067909,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Kozeta"}}}'::jsonb, '45ea888c961d6474a944728dcc4439153d94574886ab1f9c52866d91ff4a2677', 'Farmaci Kozeta', 'farmaci kozeta', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9389069, 19.7067909, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:9270c73b5e4737ac5a98f3268688572db7977c07426855d898ea52931a59c019'),
('osm:node:6868415490', 'https://www.openstreetmap.org/node/6868415490', '{"provider":"openstreetmap","element":{"type":"node","id":6868415490,"lat":41.3134566,"lon":19.803236,"tags":{"addr:street":"Rruga Prokop Mima","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Kristi"}}}'::jsonb, '4279a2a495eeb6977864fb69a6cf3153fc48931ec8fdb5a3ff6b2590e35b1b46', 'Farmaci Kristi', 'farmaci kristi', 'Rruga Prokop Mima', 'Rruga Prokop Mima', NULL, NULL, NULL, 'AL', 41.3134566, 19.803236, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:4a57c9f2ef2af7baff277a1415567c773352a4980f790be6f062e557bda9698f'),
('osm:way:733721105', 'https://www.openstreetmap.org/way/733721105', '{"provider":"openstreetmap","element":{"type":"way","id":733721105,"center":{"lat":41.3545517,"lon":19.5449027},"tags":{"addr:street":"SH55","amenity":"pharmacy","building":"yes","name":"Farmaci Laborator Analizash"}}}'::jsonb, '960073cf3fb1a7f1256e88664eb4f1c44fb1f8356d775196bc80998aa127117e', 'Farmaci Laborator Analizash', 'farmaci laborator analizash', 'SH55', 'SH55', NULL, NULL, NULL, 'AL', 41.3545517, 19.5449027, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:84f39f18e3d6954b4c06207dc49a4238eb55b77aed770872c2ae025baef3502e'),
('osm:node:9060921404', 'https://www.openstreetmap.org/node/9060921404', '{"provider":"openstreetmap","element":{"type":"node","id":9060921404,"lat":40.9442798,"lon":19.7028233,"tags":{"amenity":"pharmacy","check_date":"2024-09-22","dispensing":"yes","healthcare":"pharmacy","name":"Farmaci Ledina Çakalli","opening_hours":"Mo-Sa 07:30-21:30; Su 07:30-14:00,16:00-21:30","wheelchair":"no"}}}'::jsonb, '0a93181cbc06317d344552c85d67c4a93441909def2d8df55fcb96d59dabbc1f', 'Farmaci Ledina Çakalli', 'farmaci ledina akalli', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9442798, 19.7028233, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:e9f5253149d9f7677e5e1fae681dab446f311ed2af2c3f2781c28666402747e6'),
('osm:node:6864718450', 'https://www.openstreetmap.org/node/6864718450', '{"provider":"openstreetmap","element":{"type":"node","id":6864718450,"lat":41.3356208,"lon":19.8210351,"tags":{"addr:street":"Rruga Siri Kodra","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Life"}}}'::jsonb, 'be32cafa4546d7c1da3604e56a01038f5f1351d2eef55815b06e23c1f4c71890', 'Farmaci Life', 'farmaci life', 'Rruga Siri Kodra', 'Rruga Siri Kodra', NULL, NULL, NULL, 'AL', 41.3356208, 19.8210351, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:7f931868dec7c3840bc1cf1bb2c5d1716fdc3d032557990908bf6f9e8aecba30'),
('osm:node:6802868428', 'https://www.openstreetmap.org/node/6802868428', '{"provider":"openstreetmap","element":{"type":"node","id":6802868428,"lat":41.3340735,"lon":19.8329944,"tags":{"addr:street":"Rruga Bardhyl","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Livida"}}}'::jsonb, '6c232f862284c9dfc982abac72284da7aad7e6cdaeee97400b5f7b678e62d9e7', 'Farmaci Livida', 'farmaci livida', 'Rruga Bardhyl', 'Rruga Bardhyl', NULL, NULL, NULL, 'AL', 41.3340735, 19.8329944, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:2f62d304517793bc718b3cc3fb4951cfed572020fcd7a969e9bfc9c9ecf7f4d3'),
('osm:node:6842012699', 'https://www.openstreetmap.org/node/6842012699', '{"provider":"openstreetmap","element":{"type":"node","id":6842012699,"lat":41.1818657,"lon":19.5488016,"tags":{"addr:street":"Rruga Qazim Kariqi","amenity":"pharmacy","name":"Farmaci Lola & Anila"}}}'::jsonb, '64db0707b3d50a3acafcafec35b36f00422fc3273cf6ea30258a4d24ad3072ed', 'Farmaci Lola & Anila', 'farmaci lola anila', 'Rruga Qazim Kariqi', 'Rruga Qazim Kariqi', NULL, NULL, NULL, 'AL', 41.1818657, 19.5488016, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:1abbff2bd05af4abc74cfa415eb9e3eb60419c0a38dcf1843f6e33c14321aa14'),
('osm:node:6845107356', 'https://www.openstreetmap.org/node/6845107356', '{"provider":"openstreetmap","element":{"type":"node","id":6845107356,"lat":41.1854065,"lon":19.5582578,"tags":{"addr:street":"Jurgen Trade","amenity":"pharmacy","name":"Farmaci Lotus"}}}'::jsonb, 'ebaf72752d2e539abfa4fa4df897dcb655972c9751847aef2d284e51785c2d0d', 'Farmaci Lotus', 'farmaci lotus', 'Jurgen Trade', 'Jurgen Trade', NULL, NULL, NULL, 'AL', 41.1854065, 19.5582578, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:c6d730d5b9116e39ed3f1caa0dff9208f7959e99245cb040d8c72b99be67ef26'),
('osm:node:2142535903', 'https://www.openstreetmap.org/node/2142535903', '{"provider":"openstreetmap","element":{"type":"node","id":2142535903,"lat":41.1856609,"lon":19.5590394,"tags":{"addr:street":"Jurgen Trade","amenity":"pharmacy","name":"Farmaci Luida"}}}'::jsonb, 'a75a1627b428c827ae692a59f2acdffea501c128f1cf7840064b2b75e19eb09c', 'Farmaci Luida', 'farmaci luida', 'Jurgen Trade', 'Jurgen Trade', NULL, NULL, NULL, 'AL', 41.1856609, 19.5590394, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:58ded760174b28e2915c28170efa3a9fa4fe879942ab8abf1c73304615ae8e4e'),
('osm:node:4231557689', 'https://www.openstreetmap.org/node/4231557689', '{"provider":"openstreetmap","element":{"type":"node","id":4231557689,"lat":41.4394611,"lon":19.5752661,"tags":{"amenity":"pharmacy","name":"Farmaci Luku"}}}'::jsonb, 'e77cd299b71010964ce6d6c8aa4c99067db689731d9548ca49de2c829e792167', 'Farmaci Luku', 'farmaci luku', NULL, NULL, NULL, NULL, NULL, 'AL', 41.4394611, 19.5752661, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:8cee5a35aeb14d7fe9cac4f18771c0cb16d62437c136d48baa49fc8be68de0eb'),
('osm:node:2142535493', 'https://www.openstreetmap.org/node/2142535493', '{"provider":"openstreetmap","element":{"type":"node","id":2142535493,"lat":41.1817998,"lon":19.5484829,"tags":{"addr:street":"Rruga Qazim Kariqi","amenity":"pharmacy","name":"Farmaci Luljeta Beu"}}}'::jsonb, 'b2ce33b00515c359be18ee6112ae798b5af2cbf24436e9db0c98cf3eee35b607', 'Farmaci Luljeta Beu', 'farmaci luljeta beu', 'Rruga Qazim Kariqi', 'Rruga Qazim Kariqi', NULL, NULL, NULL, 'AL', 41.1817998, 19.5484829, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:f83705916db01b974ff498d393817c203d815ca845026f3e4c69fe9be41ca42c'),
('osm:node:6389258606', 'https://www.openstreetmap.org/node/6389258606', '{"provider":"openstreetmap","element":{"type":"node","id":6389258606,"lat":40.7091001,"lon":20.6988184,"tags":{"amenity":"pharmacy","name":"Farmaci Maliq","opening_hours":"Mo-Fr 08:00-16:30; Sa 08:00-15:00; Su off"}}}'::jsonb, '1349a0d140197e9091879c74f94355125cbefdd80f8d69be8edaf377cd3ba765', 'Farmaci Maliq', 'farmaci maliq', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7091001, 20.6988184, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:e59491a5d9c2d2aee4d98f3c9befd6f6ab184039215799710dd0b92e6554721e'),
('osm:node:6621134929', 'https://www.openstreetmap.org/node/6621134929', '{"provider":"openstreetmap","element":{"type":"node","id":6621134929,"lat":40.719497,"lon":19.5541986,"tags":{"amenity":"pharmacy","name":"Farmaci Mateo"}}}'::jsonb, '7bce546d4a52ed144da21c4b8671d14079a6ff64b28eeb96e496ff0d2c917fd9', 'Farmaci Mateo', 'farmaci mateo', NULL, NULL, NULL, NULL, NULL, 'AL', 40.719497, 19.5541986, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:ada345566a64fe1c5f720dffc7509f0cd5ea70c5d74fb5c691fee30139c1d581'),
('osm:node:6882230857', 'https://www.openstreetmap.org/node/6882230857', '{"provider":"openstreetmap","element":{"type":"node","id":6882230857,"lat":41.3215524,"lon":19.4452268,"tags":{"addr:street":"Rruga Aleksander Goga","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Megi"}}}'::jsonb, 'bb2ca3d00ad50c02b4a4506dc8e8b0c245ca7e4faed1ba8ef06e5936e7f62d3a', 'Farmaci Megi', 'farmaci megi', 'Rruga Aleksander Goga', 'Rruga Aleksander Goga', NULL, NULL, NULL, 'AL', 41.3215524, 19.4452268, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:d3d371f9a22ef61565793e968d64410323b06bba1d3d5bea797195f7e33547af'),
('osm:node:10914763710', 'https://www.openstreetmap.org/node/10914763710', '{"provider":"openstreetmap","element":{"type":"node","id":10914763710,"lat":41.8079205,"lon":19.5980015,"tags":{"amenity":"pharmacy","name":"Farmaci Mela"}}}'::jsonb, 'dbb5b667510ea073b6887a1df136d37e7f5f2fb45c8664d9ae5a8c1513f40d00', 'Farmaci Mela', 'farmaci mela', NULL, NULL, NULL, NULL, NULL, 'AL', 41.8079205, 19.5980015, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:1c523d98e6434b6fd3062405f98719f7f7d8d3af5f7f252270b036115d917ed5'),
('osm:node:6818140806', 'https://www.openstreetmap.org/node/6818140806', '{"provider":"openstreetmap","element":{"type":"node","id":6818140806,"lat":41.3223561,"lon":19.8268729,"tags":{"addr:street":"Rruga Qamil Guranjaku","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Mela"}}}'::jsonb, '6c93b103653e06591125351d11e0e1819d8c55256cc01d9e488d0dbfdcb74bca', 'Farmaci Mela', 'farmaci mela', 'Rruga Qamil Guranjaku', 'Rruga Qamil Guranjaku', NULL, NULL, NULL, 'AL', 41.3223561, 19.8268729, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:48bd74692dd7e01091f9626737b28b9a8c4f14baf1a407ba3068893223b39bac'),
('osm:node:6883787125', 'https://www.openstreetmap.org/node/6883787125', '{"provider":"openstreetmap","element":{"type":"node","id":6883787125,"lat":41.3217477,"lon":19.8100743,"tags":{"addr:street":"Rruga Komuna e Parisit","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Mersini"}}}'::jsonb, '2506b91fb612d7f7543a59927ee86c7aa06abb22aa907953a9f7af0ed6791973', 'Farmaci Mersini', 'farmaci mersini', 'Rruga Komuna e Parisit', 'Rruga Komuna e Parisit', NULL, NULL, NULL, 'AL', 41.3217477, 19.8100743, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:acf0feacdc289f0ca3f91ade0d831a1dafb97fb0c80b514f39bf500359363ac6'),
('osm:node:6614677512', 'https://www.openstreetmap.org/node/6614677512', '{"provider":"openstreetmap","element":{"type":"node","id":6614677512,"lat":40.7282532,"lon":19.5624961,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Migen"}}}'::jsonb, '08741dfc03acbe1c83fc35b27e9bfbe0102812c41f2e94e6447b514396f0f40d', 'Farmaci Migen', 'farmaci migen', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7282532, 19.5624961, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:637ab39ea8156ffbddefacebf845c9b3ab7fe6a696459fa4ff9b3cd42b110b58'),
('osm:node:5260402983', 'https://www.openstreetmap.org/node/5260402983', '{"provider":"openstreetmap","element":{"type":"node","id":5260402983,"lat":41.1143291,"lon":20.0847597,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Milano"}}}'::jsonb, '14fcb882e2bad2497c8b5cf9aa225ae8b47c4f8d8778f2c9c1549102b25001cd', 'Farmaci Milano', 'farmaci milano', NULL, NULL, NULL, NULL, NULL, 'AL', 41.1143291, 20.0847597, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:25cf92a54eb0393b069cd1965dbb6a276715a84a97ea54f15983392a27512e59'),
('osm:node:4588779484', 'https://www.openstreetmap.org/node/4588779484', '{"provider":"openstreetmap","element":{"type":"node","id":4588779484,"lat":41.326526,"lon":19.8065024,"tags":{"addr:housenumber":"197","addr:postcode":"1001","addr:street":"Rruga e Kavajës","amenity":"pharmacy","email":"alban_mosho@yahoo.com","healthcare":"pharmacy","name":"Farmaci Mira","name:en":"Pharmacy Mira","opening_hours":"Mo-Sa 08:00-20:30","operator":"Mira","phone":"+355692157292","website":"https://facebook.com/pages/Farmaci-Mira"}}}'::jsonb, '5b01f4f5f3fdddb1a1f79ad735a7c243aaaa08830c6c13f26945f9a46e0e5cd0', 'Farmaci Mira', 'farmaci mira', '197 Rruga e Kavajës', '197 Rruga e Kavajës, 1001', NULL, NULL, '1001', 'AL', 41.326526, 19.8065024, '+355692157292', 'https://facebook.com/pages/Farmaci-Mira', 'alban_mosho@yahoo.com', 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:9aefe05182aaeab26c40850e739a538dc36a3d5159d563cbefee1ee5ecf363a7'),
('osm:node:9117401719', 'https://www.openstreetmap.org/node/9117401719', '{"provider":"openstreetmap","element":{"type":"node","id":9117401719,"lat":42.0436281,"lon":19.9000011,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Mira"}}}'::jsonb, '27e29be07b32087ba5172eae7c24f2807868332487775196dd8975238a5d8140', 'Farmaci Mira', 'farmaci mira', NULL, NULL, NULL, NULL, NULL, 'AL', 42.0436281, 19.9000011, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:fe9ab29a5c9eb0eff0793e4b4e22aa6be1ee480dc5034e533a20856346f2dfa1'),
('osm:node:6886453846', 'https://www.openstreetmap.org/node/6886453846', '{"provider":"openstreetmap","element":{"type":"node","id":6886453846,"lat":41.3232444,"lon":19.8068865,"tags":{"addr:street":"Rruga Nikolla Lena","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci MnnJnni"}}}'::jsonb, 'd71ad8afa3dba9d2117e84e3fb822479204d4a237053e7a6ba704ff062f0f319', 'Farmaci MnnJnni', 'farmaci mnnjnni', 'Rruga Nikolla Lena', 'Rruga Nikolla Lena', NULL, NULL, NULL, 'AL', 41.3232444, 19.8068865, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:87625ebed3488bf33739650b778be50456b1c61676282020914b58ec297ddae1'),
('osm:node:6841192702', 'https://www.openstreetmap.org/node/6841192702', '{"provider":"openstreetmap","element":{"type":"node","id":6841192702,"lat":41.3300381,"lon":19.8048357,"tags":{"addr:city":"Tirana","addr:street":"Rruga Mihal Ciko","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Mozaiku"}}}'::jsonb, '0d4c00788879890ddb630e37e822d6944d9d7ef14512b33562fd2a4ff7aea020', 'Farmaci Mozaiku', 'farmaci mozaiku', 'Rruga Mihal Ciko', 'Rruga Mihal Ciko, Tirana', 'Tirana', NULL, NULL, 'AL', 41.3300381, 19.8048357, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:12a713b21b85833944bf63485cb9b61f3a051e67cd6cc4ec9330646764f57990'),
('osm:node:6810266446', 'https://www.openstreetmap.org/node/6810266446', '{"provider":"openstreetmap","element":{"type":"node","id":6810266446,"lat":41.3433468,"lon":19.840168,"tags":{"addr:street":"Rruga Belul Hatibi","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Nacional"}}}'::jsonb, 'ee25ad001a80c6ecd54f8d9fb8a16f4ab910a2e87a1d6fa77cdb7de34d209f22', 'Farmaci Nacional', 'farmaci nacional', 'Rruga Belul Hatibi', 'Rruga Belul Hatibi', NULL, NULL, NULL, 'AL', 41.3433468, 19.840168, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:152973cfa2958ab38598e4827a5c659295772c52642fafb948001655f532b53b'),
('osm:node:11023510039', 'https://www.openstreetmap.org/node/11023510039', '{"provider":"openstreetmap","element":{"type":"node","id":11023510039,"lat":41.2650376,"lon":19.5199346,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci NADA"}}}'::jsonb, '71353b5c52e3dd4d037b3b35411afd4625b77024d3b7098459af1cba8c1c47dd', 'Farmaci NADA', 'farmaci nada', NULL, NULL, NULL, NULL, NULL, 'AL', 41.2650376, 19.5199346, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:1651b51b399c0b27ff3fd5e4855985c289014d5697caed7b1142241b477dd1a1'),
('osm:node:6872053821', 'https://www.openstreetmap.org/node/6872053821', '{"provider":"openstreetmap","element":{"type":"node","id":6872053821,"lat":41.3285711,"lon":19.4466993,"tags":{"addr:street":"Rruga Blerimi","amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Nael"}}}'::jsonb, '577c413d2e2421052023ad00648848b11e6c93b6f16073073fde25307650d47a', 'Farmaci Nael', 'farmaci nael', 'Rruga Blerimi', 'Rruga Blerimi', NULL, NULL, NULL, 'AL', 41.3285711, 19.4466993, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:d9a641440e523af90b2c83cdd095dd5034badfd5a91f78552e497ace5d5edaff'),
('osm:node:13830593988', 'https://www.openstreetmap.org/node/13830593988', '{"provider":"openstreetmap","element":{"type":"node","id":13830593988,"lat":40.9381369,"lon":19.7061018,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Nako"}}}'::jsonb, '6b826b29f48679776c787111eff9ee7d97483d81c1e8016d3a96ed894c821e0e', 'Farmaci Nako', 'farmaci nako', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9381369, 19.7061018, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:a3369fcaf22e7873b4ec857be2a7e0e43092520a23cc6020eb4260db867aa255'),
('osm:node:6879328864', 'https://www.openstreetmap.org/node/6879328864', '{"provider":"openstreetmap","element":{"type":"node","id":6879328864,"lat":41.3433655,"lon":19.5634358,"tags":{"amenity":"pharmacy","name":"Farmaci Nejon"}}}'::jsonb, 'ade44db11dd2783a6df42df53b88d0b5845541daba316a2fda90bb18e871aefe', 'Farmaci Nejon', 'farmaci nejon', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3433655, 19.5634358, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:c379cb322c83aef02a423d3fb182c2be413d541340e7c681f1f8b07c193b3971'),
('osm:node:9741262745', 'https://www.openstreetmap.org/node/9741262745', '{"provider":"openstreetmap","element":{"type":"node","id":9741262745,"lat":41.3572053,"lon":19.8472933,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Farmaci Noal"}}}'::jsonb, 'ea1dde3b0d231ea12e8d1be3eab92fca2893609b98c14b288d2320e89710e66b', 'Farmaci Noal', 'farmaci noal', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3572053, 19.8472933, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:95f34eb50af7a60ca0e5f9e40271ed7f7004480f389294c3a8f9335af5ab3348'),
('osm:node:6388054195', 'https://www.openstreetmap.org/node/6388054195', '{"provider":"openstreetmap","element":{"type":"node","id":6388054195,"lat":40.8678,"lon":20.1844136,"tags":{"amenity":"pharmacy","name":"Farmaci Nr. 1 A. Zera"}}}'::jsonb, '16d0c590966e661616f9dbf82f7b0ce662ae85f7a81a673e2e167d56c399d3e4', 'Farmaci Nr. 1 A. Zera', 'farmaci nr 1 a zera', NULL, NULL, NULL, NULL, NULL, 'AL', 40.8678, 20.1844136, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:2b76d38f937ba1f19418899a4264cd1c095632b9263a3c788be82222a2b15882'),
('osm:node:13830549754', 'https://www.openstreetmap.org/node/13830549754', '{"provider":"openstreetmap","element":{"type":"node","id":13830549754,"lat":40.9388452,"lon":19.7068175,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Nushi"}}}'::jsonb, '6d67466d11b4d66bc6c534c18bd78bb26cc9462b11b798bcb04381ea0c497aef', 'Farmaci Nushi', 'farmaci nushi', NULL, NULL, NULL, NULL, NULL, 'AL', 40.9388452, 19.7068175, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:b67c3e349ef40a965357694635646e7cd6fa60880df48202f41aec6f1db21297'),
('osm:node:9124938837', 'https://www.openstreetmap.org/node/9124938837', '{"provider":"openstreetmap","element":{"type":"node","id":9124938837,"lat":41.3329989,"lon":19.8226432,"tags":{"amenity":"pharmacy","check_date":"2025-09-12","healthcare":"pharmacy","name":"Farmaci Nutri"}}}'::jsonb, '827f280fd253f0bb28f607784411f4ff4e31fde5ed95e6151da4e44db981b894', 'Farmaci Nutri', 'farmaci nutri', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3329989, 19.8226432, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:8267acdc9d611512405905d894745a47be7231c80d46e6af5168631d29355ed5'),
('osm:node:6617113182', 'https://www.openstreetmap.org/node/6617113182', '{"provider":"openstreetmap","element":{"type":"node","id":6617113182,"lat":40.7304178,"lon":19.5673847,"tags":{"amenity":"pharmacy","name":"Farmaci Orange"}}}'::jsonb, 'f0055fef93369f8526ffc3e17b5e132f01583904c82115c3e077784e813cd00b', 'Farmaci Orange', 'farmaci orange', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7304178, 19.5673847, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:4929edf5e85d73255d1f96e4bcdf152815fde0a30a2b36b944c160ce283f6dfb'),
('osm:node:13448129063', 'https://www.openstreetmap.org/node/13448129063', '{"provider":"openstreetmap","element":{"type":"node","id":13448129063,"lat":41.3308323,"lon":19.8365797,"tags":{"amenity":"pharmacy","check_date":"2026-01-11","healthcare":"pharmacy","name":"Farmaci Orger","name:sq":"Farmaci Orger"}}}'::jsonb, '2f3938f9465f8769c9213185a3233107269b8fbfa4fa4ba24e03f1d056c2d7da', 'Farmaci Orger', 'farmaci orger', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3308323, 19.8365797, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:6250b34bb7a6afcdd1c2610d00a971ddbca057caa76c76ebf54f0b990d80af1e'),
('osm:node:7019586960', 'https://www.openstreetmap.org/node/7019586960', '{"provider":"openstreetmap","element":{"type":"node","id":7019586960,"lat":40.7346577,"lon":19.5632962,"tags":{"amenity":"pharmacy","name":"Farmaci Ormin"}}}'::jsonb, '1f481359686a68710a86a22ddb6b3bc46ff939a483e7402ca7a5326cba158d52', 'Farmaci Ormin', 'farmaci ormin', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7346577, 19.5632962, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:8e6fa2bfa53cb818b482133483fe360b0d27732859ab4a985b8182ddd7dd3a28'),
('osm:node:11107157190', 'https://www.openstreetmap.org/node/11107157190', '{"provider":"openstreetmap","element":{"type":"node","id":11107157190,"lat":41.3312107,"lon":19.8373401,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Oxygen"}}}'::jsonb, 'f358064d9cc5fbf5e22741e36141cb6dc362a2a4e2759b8524b641a54bd5171b', 'Farmaci Oxygen', 'farmaci oxygen', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3312107, 19.8373401, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:c98cb2bcc34bb5cd9a7141ec16cab77c1533e9f4b8b654b7f9cc22bac4246c72'),
('osm:node:6617486321', 'https://www.openstreetmap.org/node/6617486321', '{"provider":"openstreetmap","element":{"type":"node","id":6617486321,"lat":40.7297578,"lon":19.5595286,"tags":{"amenity":"pharmacy","name":"Farmaci Papuçiu","opening_hours":"Mo-Su 08:00-14:00,16:00-21:00"}}}'::jsonb, '4041281c63c49eb69af6bcbd8123ac800eda3aa3d6efc82d1804d2fe9c5da65b', 'Farmaci Papuçiu', 'farmaci papu iu', NULL, NULL, NULL, NULL, NULL, 'AL', 40.7297578, 19.5595286, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:474ac7022e0185c1699be845541569cee60d8620ffc64ba43a235e546272bca2'),
('osm:node:4579867675', 'https://www.openstreetmap.org/node/4579867675', '{"provider":"openstreetmap","element":{"type":"node","id":4579867675,"lat":41.3413611,"lon":19.8325129,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Farmaci Qendrore"}}}'::jsonb, 'a3f16775b5d73784a5cd876c55025c1c0aa156cd4adcee62e139546a2120bcb7', 'Farmaci Qendrore', 'farmaci qendrore', NULL, NULL, NULL, NULL, NULL, 'AL', 41.3413611, 19.8325129, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:782bf7c5fd31e3be1a10fa3d367955aafe90e6d7f21704e414f3e8d186a86b2a');

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
