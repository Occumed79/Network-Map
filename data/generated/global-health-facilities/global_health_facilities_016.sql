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
('osm:node:8510217732', 'https://www.openstreetmap.org/node/8510217732', '{"provider":"openstreetmap","element":{"type":"node","id":8510217732,"lat":-14.9252959,"lon":13.5214006,"tags":{"amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Sachis Comercial","operator":"farmacia"}}}'::jsonb, '24c00477067ad9995f72e736f523394b5b8a5c8da411fd4530f50a0206a43aef', 'Sachis Comercial', 'sachis comercial', NULL, NULL, NULL, NULL, NULL, 'AO', -14.9252959, 13.5214006, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:664cc5da989b22755fbd2c08e3537317980582c1532f7ed4ed062b31da97d317'),
('osm:node:6597688073', 'https://www.openstreetmap.org/node/6597688073', '{"provider":"openstreetmap","element":{"type":"node","id":6597688073,"lat":-9.0072598,"lon":13.2891834,"tags":{"amenity":"clinic","healthcare":"clinic","name":"San Miguel - Clínica de Estomatologia"}}}'::jsonb, 'd0cb2d2349d9facb07eb98469018958a0ffb8d18f6170d0ecc3ba9ce727245f1', 'San Miguel - Clínica de Estomatologia', 'san miguel cl nica de estomatologia', NULL, NULL, NULL, NULL, NULL, 'AO', -9.0072598, 13.2891834, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:1618f451343a3e96dd2ed23750fe86b7f4cb24d7c083309e128533e59faf4c27'),
('osm:way:702600667', 'https://www.openstreetmap.org/way/702600667', '{"provider":"openstreetmap","element":{"type":"way","id":702600667,"center":{"lat":-9.0318102,"lon":13.4115379},"tags":{"amenity":"clinic","facebook":"https://www.facebook.com/SAUMOR.CONSULTORIO.MEDICO/","healthcare":"clinic","name":"Saumor Consultório Médico","phone":"+244 944 600 055"}}}'::jsonb, '6b4adc6b37690efb41b30a2992a6b21622e613aa0df32530350b5fe077c647bf', 'Saumor Consultório Médico', 'saumor consult rio m dico', NULL, NULL, NULL, NULL, NULL, 'AO', -9.0318102, 13.4115379, '+244 944 600 055', NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:f081807d4aa82b44e30fae59cfff6f073747edac4217e401dccd52fe151ffd86'),
('osm:node:4938952121', 'https://www.openstreetmap.org/node/4938952121', '{"provider":"openstreetmap","element":{"type":"node","id":4938952121,"lat":-14.9261948,"lon":13.4667745,"tags":{"amenity":"clinic","healthcare":"clinic","name":"Semodente","name:pt":"Semodente"}}}'::jsonb, 'c865167a440cd288411b868743cc572cebbe3e14be9edf97be70481281be61ce', 'Semodente', 'semodente', NULL, NULL, NULL, NULL, NULL, 'AO', -14.9261948, 13.4667745, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.78, 'loc:73f5ceab0d2c94c7ce331231a99caefdd016fde848926998891a9d9282df88db'),
('osm:node:6027703985', 'https://www.openstreetmap.org/node/6027703985', '{"provider":"openstreetmap","element":{"type":"node","id":6027703985,"lat":-14.9214054,"lon":13.4800604,"tags":{"addr:city":"Lubango","addr:street":"Rua do Hospital","amenity":"clinic","healthcare":"clinic","healthcare:speciality":"physiotherapy","name":"Sensus - Centro de Fisioterapia e Reabilitação Física"}}}'::jsonb, '09da0e4d4acd22b9873e26a48b9e4a2a06b2774f15526ea2aee9d3fb0cc10016', 'Sensus - Centro de Fisioterapia e Reabilitação Física', 'sensus centro de fisioterapia e reabilita o f sica', 'Rua do Hospital', 'Rua do Hospital, Lubango', 'Lubango', NULL, NULL, 'AO', -14.9214054, 13.4800604, NULL, NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:fbdaa30953790cae5c7a7a4f3a7d62bf7c96f731755cf8dca4c6053503edf37e'),
('osm:node:5557191091', 'https://www.openstreetmap.org/node/5557191091', '{"provider":"openstreetmap","element":{"type":"node","id":5557191091,"lat":-8.8964231,"lon":13.2296717,"tags":{"addr:city":"Luanda","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Socinter"}}}'::jsonb, '6e8f6343e43fb457fe60c7f9c8d99ec4d8021d91769dcd081794dd4d70d7ab48', 'Socinter', 'socinter', NULL, 'Luanda', 'Luanda', NULL, NULL, 'AO', -8.8964231, 13.2296717, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:9921a3e184acd2226165c343255b4e3ad2228300360613f6ed641285ec03a513'),
('osm:way:915490945', 'https://www.openstreetmap.org/way/915490945', '{"provider":"openstreetmap","element":{"type":"way","id":915490945,"center":{"lat":-14.915701,"lon":13.4932451},"tags":{"addr:city":"Lubango","addr:housenumber":"Comercial","addr:street":"Rua da Môngua","amenity":"dentist","building":"yes","healthcare":"dentist","name":"Sorridente"}}}'::jsonb, '9a0d6aa505520acbaaf9dba2c0816577581b3de13ef7b825645627c81df80af6', 'Sorridente', 'sorridente', 'Comercial Rua da Môngua', 'Comercial Rua da Môngua, Lubango', 'Lubango', NULL, NULL, 'AO', -14.915701, 13.4932451, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:98629747f71ffd347bd49aab6d233c0e247b23c8cda0171ce62220ec1dd3eb8c'),
('osm:node:13273817590', 'https://www.openstreetmap.org/node/13273817590', '{"provider":"openstreetmap","element":{"type":"node","id":13273817590,"lat":-14.6101884,"lon":14.2969746,"tags":{"amenity":"hospital","healthcare":"hospital","healthcare:speciality":"general","name":"TCHICUAQUEIA"}}}'::jsonb, '0a4fef92b9acc443efe6a0daacdb0168a1dcc904ad914035db7786594897689b', 'TCHICUAQUEIA', 'tchicuaqueia', NULL, NULL, NULL, NULL, NULL, 'AO', -14.6101884, 14.2969746, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:1f5dfbc8d2470b2178c7efe8fe1a8a91a458f09dcb8c99cd388837999f491ced'),
('osm:node:13273781488', 'https://www.openstreetmap.org/node/13273781488', '{"provider":"openstreetmap","element":{"type":"node","id":13273781488,"lat":-14.5608545,"lon":14.1996326,"tags":{"amenity":"hospital","healthcare":"hospital","healthcare:speciality":"general","name":"TCHIPALACASSA"}}}'::jsonb, '7cb6d653574eb45dea077f6d21246af23035524d4a16a6464983765d522b1ab6', 'TCHIPALACASSA', 'tchipalacassa', NULL, NULL, NULL, NULL, NULL, 'AO', -14.5608545, 14.1996326, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:3d9a9065d4d4414a72d2aa0c1437b50aa3b7ac74cf3e39a71965b2e20f798a19'),
('osm:node:13273729069', 'https://www.openstreetmap.org/node/13273729069', '{"provider":"openstreetmap","element":{"type":"node","id":13273729069,"lat":-14.2086276,"lon":14.3979491,"tags":{"amenity":"hospital","healthcare":"hospital","healthcare:speciality":"general","name":"Tchipalassa"}}}'::jsonb, '93558a807cef085c4c079d5b5a2de7a811ee5f391490313a44522b31d03f5306', 'Tchipalassa', 'tchipalassa', NULL, NULL, NULL, NULL, NULL, 'AO', -14.2086276, 14.3979491, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:c939d6323d72d037f82133175bb33961648e0f5cf6583c3396ea0cec52285d37'),
('osm:node:8540746726', 'https://www.openstreetmap.org/node/8540746726', '{"provider":"openstreetmap","element":{"type":"node","id":8540746726,"lat":-14.9286036,"lon":13.5469233,"tags":{"addr:city":"Lubango","addr:street":"Avenida do Estádio Nacional da Tundavala","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Tchombé"}}}'::jsonb, 'e63788d4eede25877d4a96c9bc0fbdd0de4b8af3e7e1749629eb99e400e970a3', 'Tchombé', 'tchomb', 'Avenida do Estádio Nacional da Tundavala', 'Avenida do Estádio Nacional da Tundavala, Lubango', 'Lubango', NULL, NULL, 'AO', -14.9286036, 13.5469233, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:9591cdf1bfdf815cb9733438c2524995ab2a150005ff76bff73035608b896c29'),
('osm:way:778689595', 'https://www.openstreetmap.org/way/778689595', '{"provider":"openstreetmap","element":{"type":"way","id":778689595,"center":{"lat":-9.6571279,"lon":20.3831794},"tags":{"amenity":"hospital","healthcare":"hospital","name":"Terreno de Hospital"}}}'::jsonb, '4d906df1f277bfde4ba8579f7a1204a298a43f4f2530c7b2922d2b86ca18be02', 'Terreno de Hospital', 'terreno de hospital', NULL, NULL, NULL, NULL, NULL, 'AO', -9.6571279, 20.3831794, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:107086c0f479bf00a549193eea9aa4b79799a8933b4a2757973732239aeabb27'),
('osm:node:5771174825', 'https://www.openstreetmap.org/node/5771174825', '{"provider":"openstreetmap","element":{"type":"node","id":5771174825,"lat":-8.8960941,"lon":13.2237124,"tags":{"addr:city":"Luanda","addr:street":"Avenida Pedro de C. Vandunem-Loy","amenity":"dentist","healthcare":"dentist","name":"TOPDente"}}}'::jsonb, 'cb0bbd7f6451a845958e90da8548fad0f688ae1402580f130d5828d5cc4db3b5', 'TOPDente', 'topdente', 'Avenida Pedro de C. Vandunem-Loy', 'Avenida Pedro de C. Vandunem-Loy, Luanda', 'Luanda', NULL, NULL, 'AO', -8.8960941, 13.2237124, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:030a2a420f2afe0306653545acb2533448f2ef018337c2e559eef5ff8c25030d'),
('osm:node:13271827244', 'https://www.openstreetmap.org/node/13271827244', '{"provider":"openstreetmap","element":{"type":"node","id":13271827244,"lat":-14.9193152,"lon":13.5103377,"tags":{"addr:city":"Patrice Lumumba","addr:street":"Rua da Machiqueira","healthcare":"laboratory","healthcare:speciality":"general","name":"UNAWI","opening_hours":"24/7"}}}'::jsonb, '94c2ad87ca9605321c9a91e8ebc7555700153267739d63abcc72bf6121ad9f3f', 'UNAWI', 'unawi', 'Rua da Machiqueira', 'Rua da Machiqueira, Patrice Lumumba', 'Patrice Lumumba', NULL, NULL, 'AO', -14.9193152, 13.5103377, NULL, NULL, NULL, 'lab', ARRAY['lab']::text[], 0.86, 'loc:319f5c6c877f3e588c7ea088eadd48a4b74972bd8fae83bd3fb7a2d448c0c9c3'),
('osm:node:8807351119', 'https://www.openstreetmap.org/node/8807351119', '{"provider":"openstreetmap","element":{"type":"node","id":8807351119,"lat":-14.8954247,"lon":13.5016819,"tags":{"amenity":"hospital","healthcare":"hospital","name":"Unidade Especial de Nutrição (UEN)","operator":"Centro de Saúde da Mitcha"}}}'::jsonb, 'db688df6186bd9ee788400e4d3c3cc271319c6893c176062fde06db0fc77fc3b', 'Unidade Especial de Nutrição (UEN)', 'unidade especial de nutri o uen', NULL, NULL, NULL, NULL, NULL, 'AO', -14.8954247, 13.5016819, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:4f32c00335118699f265107432412fced353c76470c8170b28ab106641690e27'),
('osm:way:1446651689', 'https://www.openstreetmap.org/way/1446651689', '{"provider":"openstreetmap","element":{"type":"way","id":1446651689,"center":{"lat":-14.7504601,"lon":15.0391813},"tags":{"amenity":"hospital","healthcare":"hospital","name":"unidade pediatrica e nutrição"}}}'::jsonb, '7313a5b60e428b4d6b2de5a9499f95c0ae4b9a2eb27bf5368d957d6f016d79f6', 'unidade pediatrica e nutrição', 'unidade pediatrica e nutri o', NULL, NULL, NULL, NULL, NULL, 'AO', -14.7504601, 15.0391813, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.78, 'loc:c023d0c7ff571e9ce07d83727fc276b89a46d8bfa3ce6a77fae3c21757e39db7'),
('osm:node:12250035898', 'https://www.openstreetmap.org/node/12250035898', '{"provider":"openstreetmap","element":{"type":"node","id":12250035898,"lat":-8.9254766,"lon":13.18378,"tags":{"addr:city":"Talatona, Luanda","addr:street":"Via S10","amenity":"hospital","healthcare":"hospital","name":"Urgência Adultos (CSE-LS)"}}}'::jsonb, 'c163f08f9a778c6c00eb66648ced04e40b4ec33da88540fbdf50805824ae25af', 'Urgência Adultos (CSE-LS)', 'urg ncia adultos cse ls', 'Via S10', 'Via S10, Talatona, Luanda', 'Talatona, Luanda', NULL, NULL, 'AO', -8.9254766, 13.18378, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:611d0320bb5230d4d9b2e7278e02664d99d24280af542358b52c71ea9557b63b'),
('osm:node:12250035899', 'https://www.openstreetmap.org/node/12250035899', '{"provider":"openstreetmap","element":{"type":"node","id":12250035899,"lat":-8.9253523,"lon":13.1844639,"tags":{"addr:city":"Talatona, Luanda","addr:street":"Via S10","amenity":"hospital","healthcare":"hospital","name":"Urgência Pediatria (CSE-LS)"}}}'::jsonb, 'da6f12d15117b271a769de3e3547507596a568e02549a0f66157538d79f020e2', 'Urgência Pediatria (CSE-LS)', 'urg ncia pediatria cse ls', 'Via S10', 'Via S10, Talatona, Luanda', 'Talatona, Luanda', NULL, NULL, 'AO', -8.9253523, 13.1844639, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:046e509141c56f5e6172c9d4e8e0fe7e1c8dfab21bb311ef9d35757c9617da7b'),
('osm:node:4460865221', 'https://www.openstreetmap.org/node/4460865221', '{"provider":"openstreetmap","element":{"type":"node","id":4460865221,"lat":-9.0031016,"lon":13.2605457,"tags":{"amenity":"pharmacy","name":"Uzema","opening_hours":"Mo-Su 08:00-23:00"}}}'::jsonb, '719e39eccfd14976e40bfbc4139f44f1550d9637cd7573924b85ea791392d444', 'Uzema', 'uzema', NULL, NULL, NULL, NULL, NULL, 'AO', -9.0031016, 13.2605457, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:3a4df882b3d5575cef0e89b3c3fe0cb6b6c9790d18d2e26e7b8054562b058338'),
('osm:node:9915336785', 'https://www.openstreetmap.org/node/9915336785', '{"provider":"openstreetmap","element":{"type":"node","id":9915336785,"lat":-9.0030645,"lon":13.261029,"tags":{"amenity":"pharmacy","name":"Uzema Farmacia"}}}'::jsonb, 'a9af3bc3b5e2cced8a3fee548c1b3435ffd01bca6984199166771186896bae20', 'Uzema Farmacia', 'uzema farmacia', NULL, NULL, NULL, NULL, NULL, 'AO', -9.0030645, 13.261029, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:0289daa6e24327b56633102536eb72d1d68e26506713956b1ba963aea5f4a717'),
('osm:node:3958416260', 'https://www.openstreetmap.org/node/3958416260', '{"provider":"openstreetmap","element":{"type":"node","id":3958416260,"lat":-14.922041,"lon":13.5020392,"tags":{"addr:street":"Rua 4 Fevereiro","healthcare":"pharmacy","name":"Venda de Materiais de Construção"}}}'::jsonb, '7cfa3e34f39ab381ca658637f646568b66522ba756ae43e5f8e5af714d22b41f', 'Venda de Materiais de Construção', 'venda de materiais de constru o', 'Rua 4 Fevereiro', 'Rua 4 Fevereiro', NULL, NULL, NULL, 'AO', -14.922041, 13.5020392, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:4e2b075f2f89449249d16e525ee8f2fedc0f9be9512dd15dcfc15de407dbecfd'),
('osm:node:5762135162', 'https://www.openstreetmap.org/node/5762135162', '{"provider":"openstreetmap","element":{"type":"node","id":5762135162,"lat":-8.9055906,"lon":13.2340214,"tags":{"addr:city":"Luanda","addr:street":"Rua 54","amenity":"pharmacy","dispensing":"yes","healthcare":"pharmacy","name":"Vital Farma - Nova Vida","phone":"+244 940 534 822, +244 940 534 995"}}}'::jsonb, 'fdf7468a3bb7dfce384d3d399bd89b26c5f05a976c3694ee0a481ad4e9b95970', 'Vital Farma - Nova Vida', 'vital farma nova vida', 'Rua 54', 'Rua 54, Luanda', 'Luanda', NULL, NULL, 'AO', -8.9055906, 13.2340214, '+244 940 534 822, +244 940 534 995', NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.86, 'loc:fc02bbd628a5d93ec3f50bc6388b52cb8b620a8f7a27c5ca5251ca8d2eac8f23'),
('osm:node:4769945612', 'https://www.openstreetmap.org/node/4769945612', '{"provider":"openstreetmap","element":{"type":"node","id":4769945612,"lat":-8.9200205,"lon":13.1698897,"tags":{"addr:city":"Luanda","addr:housenumber":"67","addr:street":"Via C4","amenity":"dentist","healthcare":"dentist","name":"Yasis Sorriso odontologia"}}}'::jsonb, '8df347acffe2e0f02ef01eb48c86bcf6457e0bd89c6dc5ef1daaea0321597b0c', 'Yasis Sorriso odontologia', 'yasis sorriso odontologia', '67 Via C4', '67 Via C4, Luanda', 'Luanda', NULL, NULL, 'AO', -8.9200205, 13.1698897, NULL, NULL, NULL, 'dental', ARRAY['dental']::text[], 0.86, 'loc:d91165e8e209b2ec8f4ede4bfc4c670cd4c84a7f31a51d4ad718f2c015730a6d'),
('osm:way:1327179697', 'https://www.openstreetmap.org/way/1327179697', '{"provider":"openstreetmap","element":{"type":"way","id":1327179697,"center":{"lat":-6.2615568,"lon":14.2457504},"tags":{"addr:city":"M''banza Congo","amenity":"hospital","healthcare":"hospital","name":"Zaire Hospital"}}}'::jsonb, 'c32fbd4ae77780f487205316fc0416a5924a3f5a64344cf16a692474df7fb078', 'Zaire Hospital', 'zaire hospital', NULL, 'M''banza Congo', 'M''banza Congo', NULL, NULL, 'AO', -6.2615568, 14.2457504, NULL, NULL, NULL, 'hospital', ARRAY['hospital']::text[], 0.86, 'loc:61a9e846d6aef04380cb1591bc0da5c8bbdb261c5c2e6a69de2c15007ec0111c'),
('osm:node:4734128121', 'https://www.openstreetmap.org/node/4734128121', '{"provider":"openstreetmap","element":{"type":"node","id":4734128121,"lat":-8.8130073,"lon":13.2427041,"tags":{"addr:city":"Luanda","addr:housenumber":"70","addr:street":"Marechal Tito \"Presidente\"","amenity":"clinic","country":"RU","healthcare":"clinic","name":"Zdravexport","name:pt":"Zdravexport","name:ru":"Здравэкспорт","opening_hours":"Mo-Fr 09:00-17:00","phone":"+244 222 440 271"}}}'::jsonb, '6f59c6a883006d432ed9d515ba6b5acf0009e0b7ac61b37adf3eeb42ff03f57b', 'Zdravexport', 'zdravexport', '70 Marechal Tito "Presidente"', '70 Marechal Tito "Presidente", Luanda', 'Luanda', NULL, NULL, 'AO', -8.8130073, 13.2427041, '+244 222 440 271', NULL, NULL, 'general_practitioner', ARRAY['general_practitioner']::text[], 0.86, 'loc:befe3dffa7bd669187750e1d727c8bc3ac32e5c79080f4cb0a2c7009544fbf42'),
('osm:node:13620947020', 'https://www.openstreetmap.org/node/13620947020', '{"provider":"openstreetmap","element":{"type":"node","id":13620947020,"lat":-15.217302,"lon":12.0817011,"tags":{"amenity":"pharmacy","healthcare":"pharmacy","name":"Zé Leite"}}}'::jsonb, '1846152d6677d954088ab2acdbf139a01e79057e81f66d01247c45d26e373b9c', 'Zé Leite', 'z leite', NULL, NULL, NULL, NULL, NULL, 'AO', -15.217302, 12.0817011, NULL, NULL, NULL, 'pharmacy_vaccination', ARRAY['pharmacy_vaccination']::text[], 0.78, 'loc:c9ae7008d1d4aa9ce1909576cda3856b039d50bb98f3ac089b1ffb4355fc7ada');

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
