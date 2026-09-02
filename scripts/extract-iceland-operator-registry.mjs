#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const REGISTRY_URL = "https://vefkerfi.landlaeknir.is/apex/f?p=2600:7";
const OUTPUT_TITLE = "Hlaða niður (.csv)";
const SEARCH_BUTTON = "#leita";
const PROFESSION_SELECT = "#P7_STARFSSTETT";
const REPORT_REGION = "#R23585399921957877";
const WORKPLACE_CELLS = `${REPORT_REGION} td[headers="ADSETUR"]`;

function argument(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? String(process.argv[index + 1] || "") : fallback;
}

const outputPath = argument("output");
const summaryPath = argument("summary", outputPath ? `${outputPath}.summary.json` : "");
if (!outputPath) throw new Error("--output is required");

const clean = (value) => String(value ?? "").replace(/\s+/gu, " ").trim();
const normalized = (value) => clean(value)
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/gu, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/gu, " ")
  .trim();

function parseDelimited(text, delimiter = ";") {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/u, ""));
    rows.push(row);
  }
  return rows.filter((candidate) => candidate.some((value) => clean(value)));
}

function decodeRegistryCsv(bytes) {
  return new TextDecoder("iso-8859-1").decode(bytes);
}

function parsePostal(value) {
  const raw = clean(value);
  const match = raw.match(/^(\d{3})(?:\s+(.+))?$/u);
  return {
    raw,
    postalCode: match?.[1] || "",
    locality: clean(match?.[2] || ""),
  };
}

function csvField(value) {
  const encoded = String(value ?? "").replace(/[\r\n]+/gu, " ").replaceAll('"', '""');
  return `"${encoded}"`;
}

function numericResultCount(bodyText) {
  const match = String(bodyText).match(/Niðurstaða leitar:\s*\d+\s*-\s*\d+\s*af\s*(\d+)/iu);
  return match ? Number(match[1]) : null;
}

async function verifiedResultCount(page, bodyText, profession) {
  const numeric = numericResultCount(bodyText);
  if (Number.isInteger(numeric) && numeric >= 0) return numeric;

  const selected = await page.inputValue(PROFESSION_SELECT).catch(() => "");
  const regionCount = await page.locator(REPORT_REGION).count();
  const workplaceCells = await page.locator(WORKPLACE_CELLS).count();
  const fatalAlerts = await page.locator(".t-Alert--danger,.a-Alert--danger,.t-Alert--warning").allTextContents().catch(() => []);
  const fatalText = fatalAlerts.map(clean).filter(Boolean).join(" | ");

  if (selected === profession.value && regionCount === 1 && workplaceCells === 0 && !fatalText) {
    return 0;
  }

  throw new Error(`Could not determine the Directorate result count for ${profession.label} (${profession.value}); selected=${selected} region=${regionCount} workplaceCells=${workplaceCells} alerts=${fatalText || "none"}`);
}

async function searchStateReady(page, professionValue) {
  if (page.isClosed()) return false;
  try {
    const selected = await page.inputValue(PROFESSION_SELECT, { timeout: 10_000 });
    const regionCount = await page.locator(REPORT_REGION).count();
    return selected === professionValue && regionCount === 1;
  } catch (_) {
    return false;
  }
}

async function openSearch(page, professionValue) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(REGISTRY_URL, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await page.waitForTimeout(700);
      await page.selectOption(PROFESSION_SELECT, professionValue);

      const navigation = page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 90_000 });
      await page.click(SEARCH_BUTTON);
      try {
        await navigation;
      } catch (error) {
        lastError = error;
        // Oracle APEX occasionally aborts the browser's tracked navigation while
        // completing the form post successfully. Validate the resulting page
        // state before deciding it was a real failure.
        await page.waitForTimeout(1400).catch(() => {});
        if (await searchStateReady(page, professionValue)) {
          console.log(JSON.stringify({ apexNavigationRecovered: true, professionValue, attempt, error: String(error) }));
          return;
        }
        throw error;
      }

      await page.waitForTimeout(700);
      if (await searchStateReady(page, professionValue)) return;
      throw new Error(`APEX search returned without the selected profession/report state (${professionValue})`);
    } catch (error) {
      lastError = error;
      console.warn(JSON.stringify({ apexSearchRetry: true, professionValue, attempt, error: String(error) }));
      if (attempt < 3) await page.waitForTimeout(900 * attempt).catch(() => {});
    }
  }
  throw new Error(`Iceland APEX search failed after 3 attempts for ${professionValue}: ${String(lastError)}`);
}

async function downloadCurrentExport(page, tempDir, slug) {
  const button = page.locator(`button[title="${OUTPUT_TITLE}"],button[aria-label="${OUTPUT_TITLE}"]`).first();
  if (!(await button.count())) throw new Error(`CSV export button was not present for ${slug}`);
  const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
  await button.click();
  const download = await downloadPromise;
  const filePath = path.join(tempDir, `${slug}.csv`);
  await download.saveAs(filePath);
  return filePath;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ locale: "is-IS", acceptDownloads: true });
const tempDir = path.join("/tmp", `iceland-operator-registry-${process.pid}`);
fs.mkdirSync(tempDir, { recursive: true });

try {
  await page.goto(REGISTRY_URL, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(700);
  const professions = await page.locator(`${PROFESSION_SELECT} option`).evaluateAll((options) => options
    .map((option) => ({ value: option.value, label: (option.textContent || "").trim() }))
    .filter((option) => option.value));
  if (professions.length < 30) throw new Error(`Only ${professions.length} profession filters discovered; refusing incomplete extraction`);

  const rawRecords = [];
  const professionStats = [];

  for (let index = 0; index < professions.length; index += 1) {
    const profession = professions[index];
    const slug = `${String(index + 1).padStart(2, "0")}-${profession.value}`;
    await openSearch(page, profession.value);
    const bodyText = await page.locator("body").innerText();
    const expected = await verifiedResultCount(page, bodyText, profession);

    if (expected === 0) {
      const visibleRows = await page.locator("table tr").count();
      const exportButtons = await page.locator(`button[title="${OUTPUT_TITLE}"],button[aria-label="${OUTPUT_TITLE}"]`).count();
      professionStats.push({ code: profession.value, profession: profession.label, records: 0 });
      console.log(JSON.stringify({
        profession: profession.label,
        code: profession.value,
        records: 0,
        officialZeroResult: true,
        visibleTableRows: visibleRows,
        exportButtons,
        completed: index + 1,
        totalProfessions: professions.length,
      }));
      continue;
    }

    const filePath = await downloadCurrentExport(page, tempDir, slug);
    const decoded = decodeRegistryCsv(fs.readFileSync(filePath));
    const parsed = parseDelimited(decoded);
    if (parsed.length < 2) throw new Error(`Empty CSV export for ${profession.label}`);
    const header = parsed[0].map(clean);
    const expectedHeader = [
      "Nafn ábyrgðaraðila",
      "Rekstraraðili",
      "Stétt rekstraraðila",
      "Heiti starfsstofu (aðsetur)",
      "Póstnúmer",
    ];
    if (header.length < 5 || !expectedHeader.every((name, position) => header[position] === name)) {
      throw new Error(`Unexpected Iceland CSV header for ${profession.label}: ${JSON.stringify(header)}`);
    }

    const rows = parsed.slice(1).filter((row) => row.length >= 5 && clean(row[3]));
    if (rows.length !== expected) {
      throw new Error(`Iceland export mismatch for ${profession.label}: page reports ${expected}, CSV contains ${rows.length}`);
    }

    for (const row of rows) {
      rawRecords.push({
        responsiblePerson: clean(row[0]),
        operator: clean(row[1]),
        profession: clean(row[2]) || profession.label,
        workplace: clean(row[3]),
        postal: clean(row[4]),
      });
    }
    professionStats.push({ code: profession.value, profession: profession.label, records: rows.length });
    console.log(JSON.stringify({ profession: profession.label, code: profession.value, records: rows.length, completed: index + 1, totalProfessions: professions.length }));
  }

  const workplaces = new Map();
  for (const record of rawRecords) {
    const postal = parsePostal(record.postal);
    const key = `${normalized(record.workplace)}|${postal.postalCode}|${normalized(postal.locality)}`;
    if (!key.replaceAll("|", "")) continue;
    if (!workplaces.has(key)) {
      workplaces.set(key, {
        workplace: record.workplace,
        postalCode: postal.postalCode,
        locality: postal.locality,
        recordCount: 0,
        professions: new Set(),
        operators: new Set(),
        responsiblePeople: new Set(),
      });
    }
    const item = workplaces.get(key);
    item.recordCount += 1;
    if (record.profession) item.professions.add(record.profession);
    if (record.operator) item.operators.add(record.operator);
    if (record.responsiblePerson) item.responsiblePeople.add(record.responsiblePerson);
  }

  if (rawRecords.length < 1_000) throw new Error(`Only ${rawRecords.length} raw Iceland registry records extracted; refusing incomplete result`);
  if (workplaces.size < 150) throw new Error(`Only ${workplaces.size} unique Iceland workplaces extracted; refusing incomplete result`);

  const columns = ["workplace", "postal_code", "locality", "record_count", "professions", "operators", "responsible_people"];
  const sorted = [...workplaces.values()].sort((a, b) => a.workplace.localeCompare(b.workplace, "is") || a.postalCode.localeCompare(b.postalCode));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${[
    columns.join("\t"),
    ...sorted.map((item) => [
      item.workplace,
      item.postalCode,
      item.locality,
      item.recordCount,
      [...item.professions].sort((a, b) => a.localeCompare(b, "is")).join(" | "),
      [...item.operators].sort((a, b) => a.localeCompare(b, "is")).join(" | "),
      [...item.responsiblePeople].sort((a, b) => a.localeCompare(b, "is")).join(" | "),
    ].map(csvField).join("\t")),
  ].join("\n")}\n`, "utf8");

  const summary = {
    source: "Iceland Directorate of Health Rekstraraðilaskrá",
    sourceUrl: REGISTRY_URL,
    professions: professions.length,
    rawRecords: rawRecords.length,
    uniqueWorkplaces: sorted.length,
    zeroResultProfessions: professionStats.filter((item) => item.records === 0).length,
    professionStats,
  };
  if (summaryPath) {
    fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
    fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(summary));
} finally {
  await page.close();
  await browser.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
}
