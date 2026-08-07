import "./unified-provider-tools.css";
import { registerRuntimeOwner } from "./runtimeControllerRegistry";

type SourceKey = "bluehive" | "indexed" | "dentists" | "my-clinics";

const SOURCE_SELECTION_KEY = "network-map:provider-source-selection-v4";
const SOURCE_INPUT_LABELS: Record<SourceKey, string> = {
  bluehive: "BlueHive Providers",
  indexed: "Indexed Providers",
  dentists: "Dental Examiner Presence",
  "my-clinics": "My Clinics",
};
const DEFAULT_SOURCE_SELECTION: Record<SourceKey, boolean> = {
  bluehive: false,
  indexed: false,
  dentists: false,
  "my-clinics": false,
};

let installed = false;
let applyingStoredSelection = false;
const initializationTimers: number[] = [];

function findSourceInput(key: SourceKey): HTMLInputElement | null {
  const expected = SOURCE_INPUT_LABELS[key].toLowerCase();
  return Array.from(document.querySelectorAll<HTMLInputElement>(".workflow-layer input[type='checkbox']"))
    .find((input) => (input.getAttribute("aria-label") || "").trim().toLowerCase() === expected) || null;
}

function currentSelection(): Record<SourceKey, boolean> {
  return Object.fromEntries((Object.keys(SOURCE_INPUT_LABELS) as SourceKey[]).map((key) => [key, Boolean(findSourceInput(key)?.checked)])) as Record<SourceKey, boolean>;
}

function readStoredSelection(): Record<SourceKey, boolean> {
  try {
    const parsed = JSON.parse(localStorage.getItem(SOURCE_SELECTION_KEY) || "null") as Partial<Record<SourceKey, boolean>> | null;
    if (!parsed) return { ...DEFAULT_SOURCE_SELECTION };
    return Object.fromEntries((Object.keys(SOURCE_INPUT_LABELS) as SourceKey[]).map((key) => [key, parsed[key] === true])) as Record<SourceKey, boolean>;
  } catch {
    return { ...DEFAULT_SOURCE_SELECTION };
  }
}

function persistSelection(): void {
  if (applyingStoredSelection) return;
  try { localStorage.setItem(SOURCE_SELECTION_KEY, JSON.stringify(currentSelection())); } catch {}
}

function initializeSelection(): boolean {
  const keys = Object.keys(SOURCE_INPUT_LABELS) as SourceKey[];
  const inputs = keys.map(findSourceInput);
  if (inputs.some((input) => !input)) return false;
  const desired = readStoredSelection();
  applyingStoredSelection = true;
  keys.forEach((key) => {
    const input = findSourceInput(key);
    if (!input || input.disabled || input.checked === desired[key]) return;
    input.click();
  });
  applyingStoredSelection = false;
  persistSelection();
  return true;
}

function handleChange(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const label = (target.getAttribute("aria-label") || "").trim().toLowerCase();
  if (!(Object.values(SOURCE_INPUT_LABELS) as string[]).some((value) => value.toLowerCase() === label)) return;
  persistSelection();
}

function cleanupTimersOnly(): void {
  initializationTimers.forEach((timer) => window.clearTimeout(timer));
  initializationTimers.length = 0;
}

function cleanup(): void {
  cleanupTimersOnly();
  document.removeEventListener("change", handleChange);
}

function install(): void {
  if (installed) return;
  if (!registerRuntimeOwner("provider-source-selection-persistence", "Persist source-owned React provider-layer checkbox selections")) return;
  installed = true;
  document.addEventListener("change", handleChange);
  for (const delay of [0, 120, 400, 1000]) {
    initializationTimers.push(window.setTimeout(() => { if (initializeSelection()) cleanupTimersOnly(); }, delay));
  }
  window.addEventListener("beforeunload", cleanup, { once: true });
}

install();
export {};
