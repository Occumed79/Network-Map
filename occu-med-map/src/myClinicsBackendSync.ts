type UploadedClinic = Record<string, unknown>;
type ClinicGroup = { id?: number | string; groupName?: string; color?: string; clinics?: UploadedClinic[] };

const SYNCED_GROUPS_KEY = "clinic_groups_backend_synced";
const CHUNK_SIZE = 500;

function readSyncedIds(): Set<string> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SYNCED_GROUPS_KEY) || "[]");
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeSyncedIds(ids: Set<string>) {
  try {
    window.localStorage.setItem(SYNCED_GROUPS_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

function groupId(group: ClinicGroup, index: number) {
  return String(group.id || `${group.groupName || "My Clinics"}-${index}`);
}

function clinicRows(group: ClinicGroup): UploadedClinic[] {
  return Array.isArray(group.clinics) ? group.clinics : [];
}

async function postChunk(group: ClinicGroup, rows: UploadedClinic[], chunkIndex: number, totalChunks: number) {
  const response = await fetch("/api/my-clinics/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      groupName: group.groupName || "My Clinics Upload",
      filename: `${group.groupName || "my-clinics"}-frontend-group-${chunkIndex + 1}-of-${totalChunks}.json`,
      rows: rows.map((row) => ({ ...row, sourceGroupName: group.groupName || "My Clinics Upload", sourceGroupColor: group.color || null })),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

async function syncGroup(group: ClinicGroup) {
  const rows = clinicRows(group);
  if (!rows.length) return;
  const totalChunks = Math.ceil(rows.length / CHUNK_SIZE);
  let mastered = 0;
  for (let start = 0, chunkIndex = 0; start < rows.length; start += CHUNK_SIZE, chunkIndex += 1) {
    const result = await postChunk(group, rows.slice(start, start + CHUNK_SIZE), chunkIndex, totalChunks);
    mastered += Number(result.masteredRows || 0);
  }
  console.info(`[My Clinics] synced ${mastered}/${rows.length} rows to Neon`, group.groupName || group.id || "upload");
}

function syncClinicGroupsJson(value: string | null) {
  if (!value) return;
  let groups: ClinicGroup[] = [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) groups = parsed;
  } catch {
    return;
  }
  if (!groups.length) return;

  const synced = readSyncedIds();
  groups.forEach((group, index) => {
    const id = groupId(group, index);
    if (synced.has(id)) return;
    synced.add(id);
    writeSyncedIds(synced);
    void syncGroup(group).catch((error) => {
      console.error("[My Clinics] backend sync failed", error);
      const latest = readSyncedIds();
      latest.delete(id);
      writeSyncedIds(latest);
    });
  });
}

function installLocalStorageBridge() {
  if (typeof window === "undefined" || !("localStorage" in window)) return;
  const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
  window.localStorage.setItem = (key: string, value: string) => {
    originalSetItem(key, value);
    if (key === "clinic_groups") window.setTimeout(() => syncClinicGroupsJson(value), 0);
  };
  window.setTimeout(() => syncClinicGroupsJson(window.localStorage.getItem("clinic_groups")), 1000);
}

installLocalStorageBridge();
