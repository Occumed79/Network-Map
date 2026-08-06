import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.env.NETWORK_MAP_SMOKE_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on("console", message => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

async function openPreview() {
  await page.evaluate(() => {
    document.querySelector(".smoke-pdf-preview")?.remove();
    document.querySelector(".smoke-pdf-opener")?.remove();

    const opener = document.createElement("button");
    opener.type = "button";
    opener.className = "smoke-pdf-opener";
    opener.textContent = "Open report preview";
    document.body.appendChild(opener);
    opener.focus();

    const wrap = document.createElement("div");
    wrap.className = "pdf-modal-wrap smoke-pdf-preview";
    const toolbar = document.createElement("div");
    toolbar.className = "pdf-toolbar";
    const title = document.createElement("span");
    title.textContent = "Report Preview";
    const actions = document.createElement("div");
    for (const label of ["Open in new tab", "Download HTML", "Close"]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      if (label === "Close") button.addEventListener("click", () => wrap.remove());
      actions.appendChild(button);
    }
    toolbar.append(title, actions);

    const tip = document.createElement("div");
    tip.className = "pdf-tip";
    tip.innerHTML = "<strong>To save as PDF:</strong> open the report and use the browser print dialog.";

    const frameHost = document.createElement("div");
    const frame = document.createElement("iframe");
    frame.title = "Generated report preview";
    frame.srcdoc = "<!doctype html><html><body style='font-family:sans-serif'><h1>Report</h1><p>Preview content</p></body></html>";
    frameHost.appendChild(frame);
    wrap.append(toolbar, tip, frameHost);
    document.body.appendChild(wrap);
  });

  await page.waitForFunction(() => {
    const preview = document.querySelector(".smoke-pdf-preview");
    return preview?.getAttribute("role") === "dialog" && preview?.getAttribute("aria-modal") === "true";
  }, undefined, { timeout: 5_000 });
  await page.waitForTimeout(150);
}

async function snapshot() {
  return page.evaluate(() => {
    const preview = document.querySelector(".smoke-pdf-preview");
    const toolbar = preview?.querySelector(".pdf-toolbar");
    const frame = preview?.querySelector("iframe");
    const toRect = element => {
      if (!(element instanceof HTMLElement)) return null;
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    return {
      preview: toRect(preview),
      toolbar: toRect(toolbar),
      frame: toRect(frame),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      activeInside: preview instanceof HTMLElement && preview.contains(document.activeElement),
      audit: window.__NETWORK_MAP_GENERAL_UI__?.audit?.() || null,
    };
  });
}

async function assertPreview(label, mobile = false) {
  await openPreview();
  const state = await snapshot();
  assert.ok(state.preview, `${label}: preview must render`);
  assert.ok(state.toolbar, `${label}: preview toolbar must render`);
  assert.ok(state.frame, `${label}: preview frame must render`);
  assert.ok(state.preview.left >= -2 && state.preview.right <= state.viewport.width + 2, `${label}: preview must fit viewport width`);
  assert.ok(state.preview.top >= -2 && state.preview.bottom <= state.viewport.height + 2, `${label}: preview must fit viewport height`);
  assert.ok(state.toolbar.left >= state.preview.left - 2 && state.toolbar.right <= state.preview.right + 2, `${label}: toolbar must stay inside preview`);
  assert.ok(state.frame.left >= state.preview.left - 2 && state.frame.right <= state.preview.right + 2, `${label}: iframe must stay inside preview`);
  assert.ok(state.documentWidth <= state.viewport.width + 3, `${label}: preview must not create document overflow`);
  assert.equal(state.activeInside, true, `${label}: preview must receive keyboard focus`);
  assert.ok(state.audit, `${label}: general UI audit must be available`);
  assert.equal(state.audit.healthy, true, `${label}: UI audit failed: ${state.audit.failures?.join(", ")}`);

  if (mobile) {
    assert.ok(state.toolbar.width >= state.viewport.width - 20, `${label}: mobile toolbar must use available width`);
    assert.ok(state.frame.width >= state.viewport.width - 20, `${label}: mobile report must use available width`);
  } else {
    assert.ok(state.toolbar.width <= 925, `${label}: desktop toolbar must retain readable width`);
    assert.ok(state.frame.width <= 865, `${label}: desktop report must retain readable width`);
  }

  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.querySelector(".smoke-pdf-preview")?.contains(document.activeElement) || false),
    true,
    `${label}: keyboard focus must remain inside preview`,
  );
  await page.keyboard.press("Escape");
  await page.locator(".smoke-pdf-preview").waitFor({ state: "detached", timeout: 4_000 });
  await page.waitForTimeout(120);
  assert.equal(
    await page.evaluate(() => document.activeElement?.classList.contains("smoke-pdf-opener") || false),
    true,
    `${label}: closing preview must restore focus`,
  );
  await page.evaluate(() => document.querySelector(".smoke-pdf-opener")?.remove());
}

try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForFunction(() => Boolean(window.__NETWORK_MAP_GENERAL_UI__), undefined, { timeout: 15_000 });
  await assertPreview("desktop report preview");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await assertPreview("mobile report preview", true);

  assert.equal(consoleErrors.length, 0, `console errors: ${consoleErrors.join("\n")}`);
} finally {
  await browser.close();
}
