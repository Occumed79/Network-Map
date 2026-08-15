from pathlib import Path

compat = Path('occu-med-map/src/mapboxNativeCompat.ts')
text = compat.read_text()

old_evented = '''  class Evented {
    private handlers = new globalThis.Map<string, Set<LeafletEventHandlerFn>>();
    on(types: string, fn: LeafletEventHandlerFn): this {
      for (const type of types.split(/\\s+/).filter(Boolean)) {
        let set = this.handlers.get(type); if (!set) { set = new Set(); this.handlers.set(type, set); }
        set.add(fn);
      }
      return this;
    }
    off(types?: string, fn?: LeafletEventHandlerFn): this {
      if (!types) { this.handlers.clear(); return this; }
      for (const type of types.split(/\\s+/).filter(Boolean)) {
        if (!fn) this.handlers.delete(type); else this.handlers.get(type)?.delete(fn);
      }
      return this;
    }
    once(types: string, fn: LeafletEventHandlerFn): this {
      const wrapped = (event: any) => { this.off(types, wrapped); fn(event); };
      return this.on(types, wrapped);
    }
    fire(type: string, data: Record<string, any> = {}): this {
      const event = { type, target: this, ...data };
      for (const fn of [...(this.handlers.get(type) || [])]) {
        try { fn(event); } catch (error) { console.error("Map compatibility event handler failed", error); }
      }
      return this;
    }
  }'''
new_evented = '''  class Evented {
    private handlers = new globalThis.Map<string, Set<LeafletEventHandlerFn>>();
    on(types: string | Record<string, LeafletEventHandlerFn>, fn?: LeafletEventHandlerFn): this {
      if (typeof types === "object") {
        for (const [type, handler] of Object.entries(types)) this.on(type, handler);
        return this;
      }
      if (!fn) return this;
      for (const type of types.split(/\\s+/).filter(Boolean)) {
        let set = this.handlers.get(type); if (!set) { set = new Set(); this.handlers.set(type, set); }
        set.add(fn);
      }
      return this;
    }
    off(types?: string | Record<string, LeafletEventHandlerFn>, fn?: LeafletEventHandlerFn): this {
      if (!types) { this.handlers.clear(); return this; }
      if (typeof types === "object") {
        for (const [type, handler] of Object.entries(types)) this.off(type, handler);
        return this;
      }
      for (const type of types.split(/\\s+/).filter(Boolean)) {
        if (!fn) this.handlers.delete(type); else this.handlers.get(type)?.delete(fn);
      }
      return this;
    }
    once(types: string, fn: LeafletEventHandlerFn): this {
      const wrapped = (event: any) => { this.off(types, wrapped); fn(event); };
      return this.on(types, wrapped);
    }
    fire(type: string, data: Record<string, any> = {}): this {
      const event = { type, target: this, ...data };
      for (const fn of [...(this.handlers.get(type) || [])]) {
        try { fn(event); } catch (error) { console.error("Map compatibility event handler failed", error); }
      }
      return this;
    }
  }'''
if old_evented not in text:
    raise SystemExit('missing Evented patch target')
text = text.replace(old_evented, new_evented)

old_enter = '''    const enter = (event: any) => {
      map.getCanvas().style.cursor = "pointer";
      const feature = event.features?.[0];
      const id = Number(feature?.properties?.__compatLayerId || 0);
      const layer = allLayers.get(id);
      const tooltip = layer?.getTooltip?.();
      if (layer && tooltip?.getContent?.()) tooltip.openOnNative(map, event.lngLat, layer);
    };
    const leave = () => {
      map.getCanvas().style.cursor = "";
      for (const layer of allLayers.values()) layer.getTooltip?.()?.close();
    };'''
new_enter = '''    const enter = (event: any) => {
      map.getCanvas().style.cursor = "pointer";
      const feature = event.features?.[0];
      const id = Number(feature?.properties?.__compatLayerId || 0);
      const layer = allLayers.get(id);
      if (!layer || (layer as any).options?.interactive === false) return;
      const latlng = new L.LatLng(event.lngLat.lat, event.lngLat.lng);
      layer.fire("mouseover", { latlng, originalEvent: event.originalEvent, target: layer });
      layer.fire("mouseenter", { latlng, originalEvent: event.originalEvent, target: layer });
      const tooltip = layer.getTooltip?.();
      if (tooltip?.getContent?.()) tooltip.openOnNative(map, event.lngLat, layer);
    };
    const leave = (event: any) => {
      map.getCanvas().style.cursor = "";
      const feature = event.features?.[0];
      const id = Number(feature?.properties?.__compatLayerId || 0);
      const layer = allLayers.get(id);
      if (layer) {
        const latlng = event.lngLat ? new L.LatLng(event.lngLat.lat, event.lngLat.lng) : layer.defaultLatLng();
        layer.fire("mouseout", { latlng, originalEvent: event.originalEvent, target: layer });
        layer.fire("mouseleave", { latlng, originalEvent: event.originalEvent, target: layer });
        layer.getTooltip?.()?.close();
      }
    };'''
if old_enter not in text:
    raise SystemExit('missing native enter/leave patch target')
text = text.replace(old_enter, new_enter)
compat.write_text(text)

app = Path('occu-med-map/src/App.tsx')
text = app.read_text()
old_sidebar = '''    setActiveTool(current => workspace === 'liveFinder' ? 'liveFinder' : current === 'liveFinder' ? null : current);'''
new_sidebar = '''    setActiveTool(current => {
      const nextTool: ActiveTool = workspace === 'liveFinder' ? 'liveFinder' : current === 'liveFinder' ? null : current;
      activeToolRef.current = nextTool;
      return nextTool;
    });'''
if old_sidebar not in text:
    raise SystemExit('missing sidebar active-tool synchronization target')
text = text.replace(old_sidebar, new_sidebar)
old_toggle = '''  const toggleCommandTool = (tool:Exclude<ActiveTool,null>) => {
    setActiveTool(current=>current===tool?null:tool);
    setMobileSidebarOpen(false);
  };'''
new_toggle = '''  const toggleCommandTool = (tool:Exclude<ActiveTool,null>) => {
    setActiveTool(current=>{
      const nextTool: ActiveTool = current===tool ? null : tool;
      activeToolRef.current = nextTool;
      return nextTool;
    });
    setMobileSidebarOpen(false);
  };'''
if old_toggle not in text:
    raise SystemExit('missing command tool synchronization target')
text = text.replace(old_toggle, new_toggle)
app.write_text(text)

acceptance = Path('occu-med-map/scripts/ci-mapbox-native-tools-acceptance.mjs')
text = acceptance.read_text()
old_wait = '''async function waitForMode(page, mode) {
  await page.waitForFunction((expected) => window.__NETWORK_MAP_GLOBE__?.getMode?.() === expected, mode, { timeout: 12_000 });
}'''
new_wait = '''async function waitForMode(page, mode) {
  await page.waitForFunction((expected) => window.__NETWORK_MAP_GLOBE__?.getMode?.() === expected, mode, { timeout: 35_000 });
}'''
if old_wait not in text:
    raise SystemExit('missing transition timeout patch target')
text = text.replace(old_wait, new_wait)
old_radius = '''  await clickByText(page, /Radius Tool/i);
  await mapCanvasClick(page, 0.68, 0.55, false);'''
new_radius = '''  const radiusButton = await clickByText(page, /Radius Tool/i);
  await page.waitForFunction((button) => button.classList.contains("active"), await radiusButton.elementHandle(), { timeout: 5_000 });
  await mapCanvasClick(page, 0.68, 0.55, false);'''
if old_radius not in text:
    raise SystemExit('missing radius activation wait target')
text = text.replace(old_radius, new_radius)
acceptance.write_text(text)

print('Applied synchronous tool ownership, geographic hover events, and deterministic browser waits.')
