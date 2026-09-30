import assert from 'node:assert/strict';
import mapboxgl from 'mapbox-gl';
import {
  cancelRouteTravel, enableDestinationBuildings, ensureLuminousRouteLayers,
  installRouteHover, scheduleRouteTravel, startRoutePulse, travelAlongRoute,
} from '../src/routePresentationRuntime';
import { buildProviderRegistryPopup } from '../src/providerRegistryPopup';

type FreeCamera = ReturnType<mapboxgl.Map['getFreeCameraOptions']>;

let now = 0;
let nextFrame = 0;
let reducedMotion = false;
const frames = new Map<number, FrameRequestCallback>();
const windowMock = Object.assign(new EventTarget(), { matchMedia: () => ({ matches: reducedMotion }) });
Object.assign(globalThis, {
  window: windowMock,
  requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; },
  cancelAnimationFrame: (id: number) => frames.delete(id),
});
Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => now } });
function step(time: number): void {
  now = time;
  const queued = [...frames.values()];
  frames.clear();
  queued.forEach(callback => callback(now));
}

class FakeMap {
  canvas = Object.assign(new EventTarget(), { style: { cursor: '' } });
  sources = new Map<string, any>([['composite', {}]]);
  layers = new Map<string, any>();
  handlers = new Map<string, Set<Function>>();
  paint = new Map<string, any>();
  featureStates: any[] = [];
  config: any[] = [];
  cameras: FreeCamera[] = [];
  routePresent = true;
  standard = false;
  stops = 0;
  rendered: any[] = [];
  asMap(): mapboxgl.Map { return this as unknown as mapboxgl.Map; }
  getCanvas() { return this.canvas; }
  getSource(id: string) { return this.sources.get(id); }
  addSource(id: string, specification: any) {
    const source = { data: specification.data, setData(data: any) { this.data = data; } };
    this.sources.set(id, source);
  }
  getLayer(id: string) { return this.layers.get(id); }
  addLayer(layer: any) { this.layers.set(layer.id, layer); }
  getStyle() { return { layers: [...this.layers.values()], imports: this.standard ? [{ id: 'basemap' }] : [] }; }
  isStyleLoaded() { return true; }
  loaded() { return true; }
  getBearing() { return 0; }
  stop() { this.stops++; }
  fitBounds() {}
  setConfigProperty(...args: any[]) { this.config.push(args); }
  setFeatureState(target: any, state: any) { this.featureStates.push({ target, state }); }
  setPaintProperty(id: string, property: string, value: any) { this.paint.set(`${id}:${property}`, value); }
  querySourceFeatures() { return this.routePresent ? [{ id: 0, properties: { role: 'route' } }] : []; }
  queryRenderedFeatures() { return this.rendered; }
  getFreeCameraOptions() { return new mapboxgl.FreeCameraOptions(); }
  setFreeCameraOptions(camera: FreeCamera) { this.cameras.push(camera); }
  on(event: string, layerOrHandler: string | Function, handler?: Function) {
    const key = typeof layerOrHandler === 'string' ? `${event}:${layerOrHandler}` : event;
    const callback = handler || layerOrHandler as Function;
    const list = this.handlers.get(key) || new Set(); list.add(callback); this.handlers.set(key, list);
  }
  once(event: string, handler: Function) { this.on(event, handler); }
  off(event: string, layerOrHandler: string | Function, handler?: Function) {
    const key = typeof layerOrHandler === 'string' ? `${event}:${layerOrHandler}` : event;
    this.handlers.get(key)?.delete(handler || layerOrHandler as Function);
  }
  emit(event: string, detail: any) { this.handlers.get(event)?.forEach(handler => handler(detail)); }
}

const ids = { source: 'route', outer: 'glow', body: 'body', core: 'core', pulse: 'pulse' };
const route: [number, number][] = [[-122, 37], [-122, 37.01], [-121.99, 37.01]];
const map = new FakeMap(); map.sources.set(ids.source, {});
ensureLuminousRouteLayers(map.asMap(), ids);
assert.deepEqual([...map.layers.keys()], ['glow', 'body', 'core', 'pulse']);
ensureLuminousRouteLayers(map.asMap(), ids);
assert.equal(map.layers.size, 4, 'style reattachment does not duplicate layers');
const stopPulse = startRoutePulse(map.asMap(), ids);
step(0); step(600);
const firstGradient = map.paint.get('pulse:line-gradient');
step(3000);
assert.equal(map.paint.get('pulse:line-opacity'), 1, 'pulse remains visible after the first cycle');
assert.deepEqual(map.paint.get('pulse:line-gradient'), firstGradient, 'pulse repeats along the route');
step(5400);
assert.equal(map.paint.get('pulse:line-opacity'), 1, 'pulse continues over multiple cycles');
map.routePresent = false; step(6000);
assert.equal(map.paint.get('pulse:line-opacity'), 0, 'removing the route hides its pulse');
stopPulse(); assert.equal(frames.size, 0);

const stopHover = installRouteHover(map.asMap(), ids);
map.emit('mousemove:body', { features: [{ id: 12 }] });
map.emit('mousemove:body', { features: [{ id: 13 }] });
assert.deepEqual(map.featureStates.map(row => row.state.hover), [true, false, true]);
assert.equal(map.canvas.style.cursor, 'pointer');
stopHover(); assert.equal(map.canvas.style.cursor, '');
assert.equal(map.featureStates.at(-1).state.hover, false);
assert.equal(map.handlers.get('mousemove:body')?.size, 0);

function cameraGroundPoint(camera: FreeCamera): { lng: number; lat: number; pitch: number } {
  const [x, y, z, w] = camera.orientation!;
  const forward = [-2 * (x * z + w * y), -2 * (y * z - w * x), -(1 - 2 * (x * x + y * y))];
  const position = camera.position!;
  const point = new mapboxgl.MercatorCoordinate(
    position.x - position.z * forward[0] / forward[2],
    position.y - position.z * forward[1] / forward[2],
  ).toLngLat();
  return { ...point, pitch: Math.acos(-forward[2]) * 180 / Math.PI };
}
travelAlongRoute(map.asMap(), route);
assert.equal(map.stops, 1, 'route travel takes ownership from fitBounds/flyTo');
step(6000); step(8600);
const middle = cameraGroundPoint(map.cameras.at(-1)!);
assert.ok(middle.lat > 37.0085 && middle.lng < -121.999, 'camera follows the bend instead of a start/end chord');
step(18000);
const arrival = cameraGroundPoint(map.cameras.at(-1)!);
assert.ok(Math.abs(arrival.lng - route[2][0]) < 0.000001 && Math.abs(arrival.lat - route[2][1]) < 0.000001);
assert.ok(arrival.pitch > 64 && arrival.pitch < 66, 'arrival preserves the 3D city pitch using real Mapbox camera orientation');
assert.ok(Number.isFinite(map.cameras.at(-1)!.position!.z));
assert.equal(frames.size, 0, 'completed travel releases its frame');

scheduleRouteTravel(map.asMap(), route);
cancelRouteTravel(map.asMap());
const beforeCancel = map.cameras.length;
step(19000); assert.equal(map.cameras.length, beforeCancel, 'cleanup cancels queued travel before it starts');
scheduleRouteTravel(map.asMap(), route); scheduleRouteTravel(map.asMap(), route);
assert.equal(frames.size, 1, 'replacement routes own only one pending animation');
step(19000); step(19100);
map.canvas.dispatchEvent(new Event('wheel'));
assert.equal(frames.size, 0, 'user interaction interrupts active travel');
travelAlongRoute(map.asMap(), [[1, 1], [1, 1]]);
assert.equal(frames.size, 0, 'a zero-length route does not animate');
reducedMotion = true;
travelAlongRoute(map.asMap(), route); startRoutePulse(map.asMap(), ids);
assert.equal(frames.size, 0, 'reduced motion disables travel and pulse animation');
reducedMotion = false;
enableDestinationBuildings(map.asMap());
assert.equal([...map.layers.values()].filter(layer => layer.type === 'fill-extrusion').length, 1);
enableDestinationBuildings(map.asMap());
assert.equal([...map.layers.values()].filter(layer => layer.type === 'fill-extrusion').length, 1, 'existing buildings are reused');
const standard = new FakeMap(); standard.standard = true;
enableDestinationBuildings(standard.asMap());
assert.equal(standard.config.length, 3); assert.equal(standard.layers.size, 0, 'Standard uses its real basemap buildings');

const { installNativeEtaRouteLayer } = await import('../src/features/driveTime/mapboxEtaRouteLayer');
const { requestEtaRoute } = await import('../src/features/driveTime/etaRouteEvents');
const eta = new FakeMap();
const stopEta = installNativeEtaRouteLayer(eta.asMap());
await Promise.resolve();
const row = { lat: 37.01, lng: -121.99, routeCoordinates: route.map(([lng, lat]) => [lat, lng]) } as any;
requestEtaRoute(row);
assert.equal(eta.getSource('drive-time-eta-route').data.features.length, 2);
requestEtaRoute({ ...row, routeCoordinates: [] });
assert.equal(eta.getSource('drive-time-eta-route').data.features.length, 0, 'invalid replacement clears the old route');
requestEtaRoute(row); stopEta();
assert.equal(frames.size, 0, 'ETA teardown cancels both pulse and pending camera travel');
step(20000); assert.equal(eta.cameras.length, 0);

const html = buildProviderRegistryPopup({ name: '<script>clinic</script>', source: 'lv_medical_facilities', address: 'A & B', website: 'javascript:alert(1)', source_url: 'https://registry.example/facility' }, { label: 'Latvia Medical Facilities Registry' });
assert.ok(html.includes('&lt;script&gt;clinic&lt;/script&gt;'));
assert.ok(html.includes('A &amp; B'));
assert.ok(html.includes('Latvia Medical Facilities Registry'));
assert.ok(html.includes('https://registry.example/facility'));
assert.ok(!html.includes('lv_medical_facilities') && !html.includes('javascript:'));

// Exercise the registered state-popup owner without requiring a WebGL context.
const popups: FakePopup[] = [];
class FakePopup {
  html = ''; removed = false; closed: Function[] = [];
  constructor() { popups.push(this); }
  setLngLat() { return this; }
  setHTML(html: string) { this.html = html; return this; }
  addTo() { return this; }
  on(_event: string, callback: Function) { this.closed.push(callback); return this; }
  remove() { this.removed = true; this.closed.forEach(callback => callback()); return this; }
}
const originalPopup = mapboxgl.Popup;
(mapboxgl as any).Popup = FakePopup;
const { registerMapboxMap, unregisterMapboxMap } = await import('../src/mapboxMapLifecycleRuntime');
const { setNativeDiagnosticCollection, clearNativeDiagnosticChannel } = await import('../src/usDiagnosticsNativeMapRuntime');
const stateMap = new FakeMap();
registerMapboxMap(stateMap.asMap(), { mode: '2d' });
await Promise.resolve();
const collection = (popupHtml: string): GeoJSON.FeatureCollection => ({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: { postal: 'CA', popupHtml } }] });
setNativeDiagnosticCollection('states', collection('Loading assessment…'));
stateMap.rendered = [{ source: 'us-diagnostics-native-states', properties: { postal: 'CA', popupHtml: 'Loading assessment…' } }];
stateMap.emit('click', { point: { x: 10, y: 10 }, lngLat: [-122, 37], originalEvent: {} });
assert.equal(popups.at(-1)!.html, 'Loading assessment…');
setNativeDiagnosticCollection('states', collection('Score 2.5 · Challenging'));
assert.equal(popups.at(-1)!.html, 'Score 2.5 · Challenging', 'an open state popup refreshes when scoring arrives');
clearNativeDiagnosticChannel('states');
assert.equal(popups.at(-1)!.removed, true, 'disabling diagnostics closes its popup');
stateMap.emit('click', { point: { x: 10, y: 10 }, lngLat: [-122, 37], originalEvent: {} });
unregisterMapboxMap(stateMap.asMap());
assert.equal(popups.at(-1)!.removed, true, 'map teardown closes an open diagnostic popup');
(mapboxgl as any).Popup = originalPopup;
console.log('Route/popup behavior smoke passed: recurring pulse, real camera orientation, route bend, hover, buildings, interruption, ETA cleanup, registry HTML and live state-popup refresh.');
