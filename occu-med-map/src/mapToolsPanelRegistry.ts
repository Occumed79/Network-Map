import type L from "leaflet";
import { registerRuntimeOwner } from "./runtimeControllerRegistry";

export type MapToolsPanelSection = {
  id: string;
  priority?: number;
  mount: (panel: HTMLElement, map: L.Map) => void | (() => void);
};

type RegisteredSection = {
  id: string;
  priority: number;
  sequence: number;
  mount: MapToolsPanelSection["mount"];
};

type PanelRecord = {
  panel: HTMLElement;
  map: L.Map;
  mounted: Map<string, (() => void) | null>;
};

const sections = new Map<string, RegisteredSection>();
const panels = new Set<PanelRecord>();
let sequence = 0;

function orderedSections(): RegisteredSection[] {
  return [...sections.values()].sort((left, right) =>
    left.priority - right.priority || left.sequence - right.sequence || left.id.localeCompare(right.id),
  );
}

function mountSection(record: PanelRecord, section: RegisteredSection): void {
  if (record.mounted.has(section.id)) return;
  record.mounted.set(section.id, null);
  try {
    const cleanup = section.mount(record.panel, record.map);
    record.mounted.set(section.id, typeof cleanup === "function" ? cleanup : null);
    record.panel.dispatchEvent(new CustomEvent("network-map:map-tools-section-mounted", {
      bubbles: true,
      detail: { id: section.id },
    }));
  } catch (error) {
    record.mounted.delete(section.id);
    console.error(`Map Tools section failed to mount: ${section.id}`, error);
  }
}

function cleanupSection(record: PanelRecord, id: string): void {
  const cleanup = record.mounted.get(id);
  if (cleanup) {
    try { cleanup(); } catch (error) { console.warn(`Map Tools section cleanup failed: ${id}`, error); }
  }
  record.mounted.delete(id);
}

export function registerMapToolsSection(section: MapToolsPanelSection): () => void {
  const id = section.id.trim();
  if (!id) throw new Error("Map Tools section requires a stable id");
  if (sections.has(id)) throw new Error(`Map Tools section is already registered: ${id}`);

  const registered: RegisteredSection = {
    id,
    priority: Number.isFinite(section.priority) ? Number(section.priority) : 100,
    sequence: sequence += 1,
    mount: section.mount,
  };
  sections.set(id, registered);
  for (const panel of panels) mountSection(panel, registered);

  return () => {
    if (sections.get(id) !== registered) return;
    sections.delete(id);
    for (const panel of panels) cleanupSection(panel, id);
  };
}

export function registerMapToolsPanel(panel: HTMLElement, map: L.Map): () => void {
  const existing = [...panels].find((record) => record.panel === panel);
  if (existing) return () => undefined;

  const record: PanelRecord = { panel, map, mounted: new Map() };
  panels.add(record);
  panel.dataset.mapToolsRegistryOwned = "true";
  for (const section of orderedSections()) mountSection(record, section);
  window.dispatchEvent(new CustomEvent("network-map:map-tools-panel-mounted", { detail: { panel } }));

  return () => {
    for (const id of [...record.mounted.keys()].reverse()) cleanupSection(record, id);
    panels.delete(record);
  };
}

export function getMapToolsPanelCount(): number {
  return panels.size;
}

registerRuntimeOwner("map-tools-section-registry", "Authoritative Map Tools section registry");
