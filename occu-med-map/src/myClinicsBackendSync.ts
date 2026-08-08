type UploadedClinic = Record<string, unknown>;
type ClinicGroup = { id?: number | string; groupName?: string; color?: string; clinics?: UploadedClinic[] };

const SYNCED_GROUPS_KEY = "clinic_groups_backend_synced_v2";
const CHUNK_SIZE = 500;

function readSyncedIds(): Set<string> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SYNCED_GROUPS_KEY) || "[]");
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}
function writeSyncedIds(ids: Set<string>) { try { window.localStorage.setItem(SYNCED_GROUPS_KEY, JSON.stringify(Array.from(ids))); } catch {} }
function groupId(group: ClinicGroup, index: number) { return String(group.id || `${group.groupName || "My Clinics"}-${index}`); }
function clinicRows(group: ClinicGroup): UploadedClinic[] { return Array.isArray(group.clinics) ? group.clinics : []; }

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function postPreviewChunk(args: { group: ClinicGroup; rows: UploadedClinic[]; chunkIndex: number; totalChunks: number; logicalUploadKey: string; contentHash: string; uploadId?: string }) {
  const { group, rows, chunkIndex, totalChunks, logicalUploadKey, contentHash, uploadId } = args;
  const sourceLabel = group.groupName || "My Clinics Upload";
  const response = await fetch("/api/provider-uploads/preview", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": `preview:${logicalUploadKey.slice(0, 48)}:${chunkIndex}`,
    },
    body: JSON.stringify({
      uploadId, logicalUploadKey, contentHash, sourceLabel,
      filename: `${sourceLabel}-frontend-group.json`, chunkIndex, chunkCount: totalChunks, rowOffset: chunkIndex * CHUNK_SIZE,
      rows: rows.map((row) => ({ ...row, sourceGroupName: sourceLabel, sourceGroupColor: group.color || null })),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw new Error(data.error || `HTTP ${response.status}`);
  return data as { uploadId: string; commitReady?: boolean; summary?: unknown };
}

async function commitPreview(uploadId: string) {
  const response = await fetch(`/api/provider-uploads/${encodeURIComponent(uploadId)}/commit`, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": `commit:${uploadId}` },
    body: "{}",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

async function syncGroup(group: ClinicGroup, stableGroupId: string) {
  const rows = clinicRows(group);
  if (!rows.length) return;
  const sourceLabel = group.groupName || "My Clinics Upload";
  const contentHash = await sha256(JSON.stringify(rows));
  const logicalUploadKey = await sha256(`clinic-group:${stableGroupId}:${sourceLabel}`);
  const totalChunks = Math.ceil(rows.length / CHUNK_SIZE);
  let uploadId: string | undefined;
  for (let start = 0, chunkIndex = 0; start < rows.length; start += CHUNK_SIZE, chunkIndex += 1) {
    const preview = await postPreviewChunk({ group, rows: rows.slice(start, start + CHUNK_SIZE), chunkIndex, totalChunks, logicalUploadKey, contentHash, uploadId });
    uploadId = preview.uploadId;
  }
  if (!uploadId) throw new Error("Provider upload preview did not return an upload ID");
  const committed = await commitPreview(uploadId);
  console.info(`[My Clinics] committed ${rows.length} rows through previewed upload ${uploadId}`, sourceLabel, committed);
}

function syncClinicGroupsJson(value: string | null) {
  if (!value) return;
  let groups: ClinicGroup[] = [];
  try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) groups = parsed; } catch { return; }
  if (!groups.length) return;
  const synced = readSyncedIds();
  groups.forEach((group, index) => {
    const id = groupId(group, index);
    if (synced.has(id)) return;
    synced.add(id);
    writeSyncedIds(synced);
    void syncGroup(group, id).catch((error) => {
      console.error("[My Clinics] preview/commit backend sync failed", error);
      const latest = readSyncedIds(); latest.delete(id); writeSyncedIds(latest);
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
