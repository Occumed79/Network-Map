import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { enterNetworkMap } from "./enter-network-map.mjs";

const baseUrl = process.env.NETWORK_MAP_CI_UI_URL || "http://127.0.0.1:4173";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const artifactDir = path.resolve(scriptDir, "../test-results/ui-deep-workflow");
fs.mkdirSync(artifactDir, { recursive: true });

function json(route, payload, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(payload) });
}

async function installApiMocks(page, writeMode, writes) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;

    if (request.method() !== "GET") {
      let body = null;
      try { body = request.postDataJSON(); } catch { body = request.postData(); }
      writes.push({ pathname, body });
      if (writeMode.current === "error") return json(route, { error: "CI simulated write failure" }, 500);
      return json(route, {
        ok: true,
        success: true,
        uploadId: "ci-upload-001",
        rawRows: 1,
        stagedRows: 1,
        masteredRows: 1,
        errorRows: 0,
        needsGeocodeRows: 0,
        id: "ci-upload-001",
        accepted: 1,
        rejected: 0,
        quarantined: 0,
        duplicate: 0,
        providers: [],
        records: [],
      });
    }

    if (pathname.includes("provider-explorer/density") || pathname.includes("provider-explorer/hex")) {
      return json(route, { cells: [], total: 0 });
    }
    if (pathname.includes("provider-explorer")) {
      return json(route, {
        providers: [],
        total: 0,
        page: 1,
        hasMore: false,
        stored_count: 0,
        live_count: 0,
        live_only: [],
      });
    }
    if (pathname.includes("provider-layers")) return json(route, { providers: [], total: 0, page: 1, hasMore: false });
    if (pathname.includes("health") || pathname.includes("ready")) return json(route, { ok: true, status: "ok" });
    if (pathname.includes("search") || pathname.includes("finder") || pathname.includes("npi")) {
      return json(route, { providers: [], results: [], items: [], total: 0 });
    }
    return json(route, {});
  });
}

async function boot(page) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await enterNetworkMap(page);
  await page.locator(".app-wrap").waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForFunction(() => Boolean(window.__NETWORK_MAP_RUNTIME_OWNERSHIP__), null, { timeout: 20_000 });
  await page.waitForTimeout(700);
}

async function visibleButtons(page) {
  return page.locator("button:visible").evaluateAll((nodes) => nodes.map((node, index) => ({
    index,
    text: (node.textContent || "").replace(/\s+/g, " ").trim(),
    aria: node.getAttribute("aria-label") || "",
    disabled: node.disabled,
  })));
}

async function findButtonByText(page, pattern, scope = null) {
  const locator = scope ? scope.locator("button:visible") : page.locator("button:visible");
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const button = locator.nth(index);
    const text = ((await button.textContent()) || "").replace(/\s+/g, " ").trim();
    const aria = (await button.getAttribute("aria-label")) || "";
    if (pattern.test(`${text} ${aria}`)) return button;
  }
  return null;
}

async function openUploadDialog(page) {
  let opener = await findButtonByText(page, /upload\s+clinics|clinic\s+upload/i);
  if (!opener) {
    const providersTab = page.getByRole("tab", { name: /providers/i });
    if (await providersTab.count()) {
      await providersTab.click();
      await page.waitForTimeout(160);
      opener = await findButtonByText(page, /upload\s+clinics|clinic\s+upload/i);
    }
  }
  assert.ok(opener, `Upload Clinics launcher not found. Visible buttons: ${JSON.stringify(await visibleButtons(page))}`);
  await opener.click();
  await page.waitForTimeout(180);

  const dialogs = page.locator(".modal-backdrop.open .modal-box:visible, .modal-box:visible");
  const count = await dialogs.count();
  for (let index = count - 1; index >= 0; index -= 1) {
    const dialog = dialogs.nth(index);
    const text = ((await dialog.textContent()) || "").replace(/\s+/g, " ").trim();
    if (/upload|clinic|provider/i.test(text) && await dialog.locator("input[type='file']").count()) return dialog;
  }
  throw new Error("Upload Clinics dialog did not open with a file input");
}

async function closeDialog(page, dialog) {
  const close = await findButtonByText(page, /^close$|cancel|×|✕/i, dialog);
  if (close) await close.click();
  else await page.keyboard.press("Escape");
  await page.waitForTimeout(140);
}

async function uploadFilePayload(dialog, file) {
  const input = dialog.locator("input[type='file']").first();
  await input.setInputFiles(file);
  await dialog.page().waitForTimeout(220);
}

// Picking a file starts the upload immediately; the dialog reports the outcome
// in a single progress line ("No data found…", "Error: …", "Backend ingest complete…").
async function waitForUploadOutcome(dialog, pattern, message) {
  await dialog.page().waitForFunction(
    ({ source, flags }) => {
      const box = Array.from(document.querySelectorAll(".workflow-upload-modal")).pop();
      return new RegExp(source, flags).test(box?.textContent || "");
    },
    { source: pattern.source, flags: pattern.flags },
    { timeout: 10_000 },
  ).catch(() => undefined);
  const text = ((await dialog.textContent()) || "").replace(/\s+/g, " ");
  assert.match(text, pattern, `${message}. Dialog text: ${text.slice(0, 600)}`);
}

const validProviderCsv = {
  name: "ci-providers.csv",
  mimeType: "text/csv",
  buffer: Buffer.from("name,address,city,state,lat,lng\nCI Test Clinic,123 Test Ave,Fresno,CA,36.7378,-119.7871\n"),
};

async function assertUploadValidation(page, writes) {
  const dialog = await openUploadDialog(page);
  const before = writes.length;
  await uploadFilePayload(dialog, {
    name: "invalid-provider-upload.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("this is not a provider spreadsheet"),
  });
  await waitForUploadOutcome(dialog, /No data found in file\.|Error:/, "Invalid upload must produce a visible validation message");
  assert.equal(writes.length, before, "Invalid upload must not reach the ingest API");
  await closeDialog(page, dialog);
}

async function assertUploadWriteFailure(page, writeMode) {
  writeMode.current = "error";
  const dialog = await openUploadDialog(page);
  await uploadFilePayload(dialog, validProviderCsv);
  await waitForUploadOutcome(dialog, /Error: CI simulated write failure/, "Mocked upload failure must settle into a visible error state");
  await closeDialog(page, dialog);
  writeMode.current = "success";
}

async function assertUploadSuccess(page, writeMode, writes) {
  writeMode.current = "success";
  const dialog = await openUploadDialog(page);
  const before = writes.length;
  await uploadFilePayload(dialog, validProviderCsv);
  await waitForUploadOutcome(dialog, /Backend ingest complete: 1 raw rows/, "Valid provider CSV must complete the upload workflow");
  const posted = writes.slice(before).filter((write) => write.pathname === "/api/my-clinics/upload");
  assert.equal(posted.length, 1, "Valid provider CSV must post one chunk to the ingest API");
  assert.equal(posted[0].body?.rows?.[0]?.name, "CI Test Clinic", "Uploaded chunk must carry the parsed CSV rows");
  await closeDialog(page, dialog);
}

async function openFindMode(page, label) {
  await page.getByRole("tab", { name: /^Find\b/i }).click();
  const find = page.locator("#sidebar-find-panel");
  await find.waitFor({ state: "visible", timeout: 10_000 });
  const pill = find.locator(".find-submode-pill", { hasText: new RegExp(`^${label}$`) });
  await pill.click();
  await page.waitForTimeout(160);
  assert.match((await pill.getAttribute("class")) || "", /\bactive\b/, `Find ${label} mode must show as selected`);
  return find;
}

// Phase-2 Find workspace: the Database submode replaces the old Explorer drawer.
async function assertExplorerStates(page) {
  const find = await openFindMode(page, "Database");
  const text = ((await find.textContent()) || "").replace(/\s+/g, " ").trim();
  assert.match(text, /VISUALIZATION/i, "Database mode must render visualization controls instead of a blank panel");
  assert.ok(await find.locator(".provider-visualization-grid button:visible").count() > 0, "Database mode must expose visible visualization controls");
  const status = find.locator(".provider-map-status[role='status']");
  assert.equal(await status.count(), 1, "Database mode must expose one status surface");

  await page.getByRole("tab", { name: /^Providers\b/i }).click();
  await page.waitForTimeout(160);
  assert.equal(await find.getAttribute("aria-hidden"), "true", "Find workspace must hide when Providers is selected");
}

// Phase-2 Find workspace: Nearby replaces the old Live Finder panel; NPI is its own submode.
async function assertFinderModeStates(page) {
  const find = await openFindMode(page, "Nearby");
  assert.match(((await find.textContent()) || "").toLowerCase(), /location|double-click the map/, "Find must render Nearby mode");

  await page.getByRole("tab", { name: /^Providers\b/i }).click();
  const npiButton = page.locator(".unified-npi-tool:visible").first();
  await npiButton.click();
  await page.waitForTimeout(160);
  assert.equal(await find.getAttribute("aria-hidden"), "false", "NPI Registry workflow must open the Find workspace");
  assert.match((await find.locator(".find-submode-pill.active").textContent()) || "", /^NPI$/, "NPI Registry workflow must select the NPI submode");
  assert.equal(await page.evaluate(() => document.body.dataset.providerTool), "npi", "NPI selected state must be exposed");

  await openFindMode(page, "Nearby");
  await page.getByRole("tab", { name: /^Providers\b/i }).click();
  await page.waitForTimeout(160);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const writeMode = { current: "success" };
const writes = [];
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
await installApiMocks(page, writeMode, writes);

try {
  await boot(page);
  await assertFinderModeStates(page);
  await assertExplorerStates(page);
  await assertUploadValidation(page, writes);
  await assertUploadWriteFailure(page, writeMode);
  await assertUploadSuccess(page, writeMode, writes);
  assert.deepEqual(pageErrors, [], `Deep workflow acceptance saw page errors: ${pageErrors.join("; ")}`);
} catch (error) {
  await page.screenshot({ path: path.join(artifactDir, "deep-workflow-failure.png"), fullPage: true }).catch(() => undefined);
  fs.writeFileSync(
    path.join(artifactDir, "deep-workflow-error.txt"),
    `${error instanceof Error ? error.stack || error.message : String(error)}\n\nVisible buttons:\n${JSON.stringify(await visibleButtons(page), null, 2)}\n\nPage errors:\n${pageErrors.join("\n")}`,
  );
  throw error;
} finally {
  await context.close();
  await browser.close();
}

console.log("Deep UI workflow acceptance passed for Finder/NPI, Explorer, and Upload Clinics validation/error/success flows.");
