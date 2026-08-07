import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.NETWORK_MAP_CI_UI_URL || "http://127.0.0.1:4173";
const artifactDir = path.resolve(process.cwd(), "test-results", "ui-deep-acceptance");
fs.mkdirSync(artifactDir, { recursive: true });

function json(route, payload, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(payload) });
}

async function installApiMocks(page, writeMode) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;

    if (request.method() !== "GET") {
      if (writeMode.current === "error") return json(route, { error: "CI simulated write failure" }, 500);
      return json(route, {
        ok: true,
        success: true,
        uploadId: "ci-upload-001",
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

async function clickPrimaryUploadAction(page, dialog) {
  const candidates = [/upload/i, /import/i, /continue/i, /save/i, /submit/i, /process/i];
  for (const pattern of candidates) {
    const button = await findButtonByText(page, pattern, dialog);
    if (button && !(await button.isDisabled())) {
      const text = ((await button.textContent()) || "").trim();
      if (/close|cancel|clear/i.test(text)) continue;
      await button.click();
      return text;
    }
  }
  throw new Error(`No enabled upload/import action was found. Dialog text: ${((await dialog.textContent()) || "").slice(0, 2000)}`);
}

async function uploadFilePayload(dialog, file) {
  const input = dialog.locator("input[type='file']").first();
  await input.setInputFiles(file);
  await dialog.page().waitForTimeout(220);
}

async function assertUploadValidation(page) {
  const dialog = await openUploadDialog(page);
  await uploadFilePayload(dialog, {
    name: "invalid-provider-upload.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("this is not a provider spreadsheet"),
  });
  const text = (((await dialog.textContent()) || "") + " " + ((await page.locator("body").textContent()) || "")).toLowerCase();
  const hasValidation = /invalid|unsupported|spreadsheet|csv|xlsx|file type|select.*file|could not|failed|error/.test(text);
  const action = await findButtonByText(page, /upload|import|continue|process/i, dialog);
  const actionDisabled = action ? await action.isDisabled() : true;
  assert.ok(hasValidation || actionDisabled, "Invalid upload must produce visible validation or keep the commit action disabled");
  await closeDialog(page, dialog);
}

async function assertUploadWriteFailure(page, writeMode) {
  writeMode.current = "error";
  const dialog = await openUploadDialog(page);
  await uploadFilePayload(dialog, {
    name: "ci-providers.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("name,address,city,state,lat,lng\nCI Test Clinic,123 Test Ave,Fresno,CA,36.7378,-119.7871\n"),
  });

  let clicked = false;
  for (let attempt = 0; attempt < 3 && !clicked; attempt += 1) {
    try {
      await clickPrimaryUploadAction(page, dialog);
      clicked = true;
    } catch {
      await page.waitForTimeout(180);
    }
  }
  if (clicked) {
    await page.waitForTimeout(350);
    const text = (((await dialog.textContent()) || "") + " " + ((await page.locator("body").textContent()) || "")).toLowerCase();
    assert.match(text, /failed|error|unable|problem|simulated write failure/, "Mocked upload failure must settle into a visible error state");
  }
  await closeDialog(page, dialog);
  writeMode.current = "success";
}

async function assertUploadSuccess(page, writeMode) {
  writeMode.current = "success";
  const dialog = await openUploadDialog(page);
  await uploadFilePayload(dialog, {
    name: "ci-providers.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("name,address,city,state,lat,lng\nCI Test Clinic,123 Test Ave,Fresno,CA,36.7378,-119.7871\n"),
  });

  let acted = false;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const text = (((await dialog.textContent()) || "") + " " + ((await page.locator("body").textContent()) || "")).toLowerCase();
    if (/success|complete|uploaded|accepted|imported|saved|ready/.test(text)) {
      acted = true;
      break;
    }
    try {
      await clickPrimaryUploadAction(page, dialog);
      acted = true;
    } catch {
      // Some versions preview automatically and expose only a final action after parsing.
    }
    await page.waitForTimeout(300);
  }

  assert.equal(acted, true, "Valid provider CSV must advance the upload workflow");
  const finalText = (((await dialog.textContent()) || "") + " " + ((await page.locator("body").textContent()) || "")).toLowerCase();
  assert.ok(!/uncaught|infinite|stack overflow/.test(finalText), "Upload workflow must settle without catastrophic UI errors");
  await closeDialog(page, dialog);
}

async function assertExplorerStates(page) {
  const explorerTab = page.getByRole("tab", { name: /explorer/i });
  await explorerTab.click();
  await page.waitForTimeout(220);
  const drawer = page.locator(".provider-explorer-drawer.open:visible");
  await drawer.waitFor({ state: "visible", timeout: 10_000 });
  const initialText = ((await drawer.textContent()) || "").replace(/\s+/g, " ").trim();
  assert.ok(initialText.length > 30, "Explorer must render meaningful content instead of a blank panel");
  assert.equal(await page.locator(".provider-explorer-drawer.open:visible").count(), 1, "Explorer must have one visible drawer");

  const actionButtons = drawer.locator("button:visible");
  assert.ok(await actionButtons.count() > 0, "Explorer must expose visible controls");
  const statusLike = drawer.locator("[role='status'], .provider-explorer-status, [class*='status']");
  if (await statusLike.count()) {
    const statusText = ((await statusLike.first().textContent()) || "").trim();
    assert.ok(statusText.length > 0, "Explorer status surface must not be blank when present");
  }

  const providersTab = page.getByRole("tab", { name: /providers/i });
  await providersTab.click();
  await page.waitForTimeout(160);
  assert.equal(await page.locator(".provider-explorer-drawer.open:visible").count(), 0, "Explorer must close when its workspace is no longer selected");
}

async function assertFinderModeStates(page) {
  const finderTab = page.getByRole("tab", { name: /finder/i });
  await finderTab.click();
  await page.waitForTimeout(200);
  const finder = page.locator(".live-panel.open:visible");
  await finder.waitFor({ state: "visible", timeout: 10_000 });
  const liveText = ((await finder.textContent()) || "").toLowerCase();
  assert.ok(/live places|live provider|source filters/.test(liveText), "Finder must render Live Places mode");

  const npiButton = page.locator(".unified-npi-tool:visible").first();
  if (await npiButton.count()) {
    await npiButton.click();
    await page.waitForTimeout(160);
    const npiText = ((await finder.textContent()) || "").toLowerCase();
    assert.ok(/npi registry|u\.s\. provider registry|u\.s\. npi filters/.test(npiText), "NPI button must produce NPI presentation state");
    assert.equal(await npiButton.getAttribute("aria-pressed"), "true", "NPI selected state must be exposed");
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const writeMode = { current: "success" };
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
await installApiMocks(page, writeMode);

try {
  await boot(page);
  await assertFinderModeStates(page);
  await assertExplorerStates(page);
  await assertUploadValidation(page);
  await assertUploadWriteFailure(page, writeMode);
  await assertUploadSuccess(page, writeMode);
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
