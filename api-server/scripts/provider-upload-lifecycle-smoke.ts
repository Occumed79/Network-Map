import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const apiRoot = path.resolve(process.cwd());
const repoRoot = path.resolve(apiRoot, "..");
const route = fs.readFileSync(path.join(apiRoot, "src/routes/providerUploadLifecycle.ts"), "utf8");
const migration = fs.readFileSync(path.join(apiRoot, "src/db/migrations/20260806_provider_upload_lifecycle.sql"), "utf8");
const routeIndex = fs.readFileSync(path.join(apiRoot, "src/routes/index.ts"), "utf8");
const sync = fs.readFileSync(path.join(repoRoot, "occu-med-map/src/myClinicsBackendSync.ts"), "utf8");
const spreadsheetSafety = fs.readFileSync(path.join(repoRoot, "occu-med-map/src/lib/spreadsheetSafety.ts"), "utf8");
const etaExport = fs.readFileSync(path.join(repoRoot, "occu-med-map/src/features/driveTime/providerEtaExport.ts"), "utf8");

for (const table of ["provider_upload_runs", "provider_upload_records", "provider_upload_changes"]) {
  assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`), `${table} must be migration-owned`);
}
assert.match(migration, /UNIQUE \(logical_upload_key, content_hash\)/, "logical uploads must be idempotent by key/content hash");
assert.match(migration, /UNIQUE \(upload_id, chunk_index, row_index\)/, "chunk rows must be resumable/idempotent");
assert.match(migration, /before_row jsonb/, "rollback must retain previous master state");

assert.match(route, /\/provider-uploads\/preview/, "preview endpoint is required");
assert.match(route, /\/provider-uploads\/:uploadId\/commit/, "commit endpoint is required");
assert.match(route, /\/provider-uploads\/:uploadId\/rollback/, "rollback endpoint is required");
assert.match(route, /BEGIN[\s\S]*COMMIT/s, "write paths must use transactions");
assert.match(route, /ROLLBACK/, "write paths must rollback transactions on failure");
assert.match(route, /commitReady/, "preview must explicitly report whether all chunks are staged");
assert.match(route, /No provider master records have been written/, "preview contract must state that master inventory is untouched");
assert.match(route, /status='committed'/, "commit must have a durable committed state");
assert.match(route, /status='rolled_back'/, "rollback must have a durable rolled-back state");
assert.match(route, /provider_upload_changes/, "commit and rollback must snapshot changes");
assert.match(route, /quarantined/, "preview must distinguish quarantined records");
assert.match(route, /rejected/, "preview must distinguish rejected records");
assert.match(route, /needs_geocode/, "unplaced upload rows must be quarantined for geocoding rather than treated as exact locations");
assert.doesNotMatch(route, /coordinateStatus\s*:\s*["'](?:imported|geocoded)["']/, "upload lifecycle must not reintroduce retired coordinate-status labels");
assert.match(route, /sourceLabel/, "user-selected source label must be preserved");
assert.match(route, /mapping/, "explicit field mapping must be accepted and persisted");
assert.match(route, /MAX_ROWS_PER_CHUNK = 5000/, "5,000-row request boundary must remain enforced");

assert.match(routeIndex, /providerUploadLifecycleRouter/, "upload lifecycle router must be mounted");
assert.ok(routeIndex.indexOf("providerUploadLifecycleRouter") < routeIndex.indexOf("providerDatasetUploadsRouter"), "safe lifecycle must be mounted before the legacy upload route");
assert.match(sync, /provider-uploads\/preview/, "browser sync must preview before commit");
assert.match(sync, /provider-uploads\/\$\{encodeURIComponent\(uploadId\)\}\/commit/, "browser sync must commit the same logical upload ID");
assert.match(sync, /contentHash/, "browser sync must preserve one logical content hash across chunks");
assert.match(sync, /chunkCount/, "browser sync must preserve chunk identity");
assert.doesNotMatch(sync, /fetch\("\/api\/my-clinics\/upload"/, "legacy direct-write browser sync must be retired");

assert.match(spreadsheetSafety, /FORMULA_PREFIX/, "spreadsheet formula detection must be centralized");
assert.match(spreadsheetSafety, /\[=\+\\-@\]/, "formula guard must cover spreadsheet formula prefixes");
assert.match(etaExport, /spreadsheetSafety/, "provider CSV export must use formula-injection protection");

console.log("Provider upload preview/idempotency/rollback hardening smoke passed.");
