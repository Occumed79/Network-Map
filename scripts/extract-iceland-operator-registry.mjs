#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const REGISTRY_URL = "https://vefkerfi.landlaeknir.is/apex/f?p=2600:7";
const OUTPUT_TITLE = "Hlaða niður (.csv)";
const SEARCH_BUTTON = "#leita";
const PROFESSION_SELECT = "#P7_STARFSSTETT";

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
  // The Directorate export currently uses ISO-8859-1. TextDecoder's latin1
  // alias preserves the Icelandic characters correctly for this export.
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

function resultCount(bodyText) {
  const match = String(bodyText).match(/Niðurstaða leitar:\s*\d+\s*-\s*\d+\s*af\s*(\d+)/iu);
  return match ? Number(match[1]) : null;
}

async function openSearch(page, professionValue) {
  await page.goto(REGISTRY_URL, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(700);
  await page.selectOption(PROFESSION_SELECT, professionValue);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 90_000 }),
    page.click(SEARCH_BUTTON),
  ]);
  await page.waitForTimeout(700);
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
    const expected = resultCount(bodyText);
    if (!Number.isInteger(expected) || expected <= 0) {
      throw new Error(`Could not determine a positive result count for ${profession.label} (${profession.value})`);
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
