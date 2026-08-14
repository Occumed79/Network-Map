#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";

function argument(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? String(process.argv[index + 1] || "") : fallback;
}

const inputArgument = argument("input");
const outputArgument = argument("output-dir");
if (!inputArgument || !outputArgument) throw new Error("--input and --output-dir are required");
const inputPath = path.resolve(inputArgument);
const outputDirectory = path.resolve(outputArgument);
const projectCount = Number(argument("project-count", "8"));
if (!Number.isInteger(projectCount) || projectCount < 2 || projectCount > 8) {
  throw new Error("--project-count must be an integer from 2 through 8");
}

function decodeField(value) {
  if (value === "\\N") return "";
  if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1).replaceAll('""', '"');
  return value;
}

async function forEachDataLine(callback) {
  const input = fs.createReadStream(inputPath);
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  let header = null;
  let indexes = null;
  for await (const line of lines) {
    if (!header) {
      header = line;
      const columns = header.split("\t");
      indexes = {
        sourceRecordId: columns.indexOf("source_record_id"),
        countryCode: columns.indexOf("country_code"),
        masterKey: columns.indexOf("master_key"),
      };
      if (Object.values(indexes).some((index) => index < 0)) throw new Error("Input header is missing required columns");
      continue;
    }
    if (!line) continue;
    const values = line.split("\t");
    await callback({
      header,
      line,
      sourceRecordId: decodeField(values[indexes.sourceRecordId]),
      countryCode: decodeField(values[indexes.countryCode]).toUpperCase() || "XX",
      masterKey: decodeField(values[indexes.masterKey]),
    });
  }
  return header;
}

const countryCounts = new Map();
let sourceRows = 0;
const header = await forEachDataLine(({ countryCode }) => {
  sourceRows += 1;
  countryCounts.set(countryCode, (countryCounts.get(countryCode) || 0) + 1);
});
if (!sourceRows || !header) throw new Error("No normalized Healthsites records were found");

const projects = Array.from({ length: projectCount }, (_, index) => ({
  slot: index + 1,
  assignedRows: 0,
  countries: [],
  unknownCountryRows: 0,
  rows: 0,
  masterKeys: new Set(),
}));
const countryToSlot = new Map();
const knownCountries = [...countryCounts.entries()]
  .filter(([country]) => country !== "XX")
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
for (const [country, count] of knownCountries) {
  const target = [...projects].sort((a, b) => a.assignedRows - b.assignedRows || a.slot - b.slot)[0];
  target.countries.push(country);
  target.assignedRows += count;
  countryToSlot.set(country, target.slot);
}

await fsPromises.rm(outputDirectory, { recursive: true, force: true });
await fsPromises.mkdir(outputDirectory, { recursive: true });
const streams = projects.map((project) => {
  const stream = fs.createWriteStream(path.join(outputDirectory, `healthsites_provider_project_${project.slot}.tsv`));
  stream.write(`${header}\n`);
  return stream;
});

function slotForUnknown(sourceRecordId) {
  const digest = createHash("sha256").update(sourceRecordId).digest();
  return digest.readUInt32BE(0) % projectCount + 1;
}

await forEachDataLine(async ({ line, sourceRecordId, countryCode, masterKey }) => {
  const slot = countryCode === "XX" ? slotForUnknown(sourceRecordId) : countryToSlot.get(countryCode);
  if (!slot) throw new Error(`No provider project allocation exists for ${countryCode}`);
  const project = projects[slot - 1];
  if (!streams[slot - 1].write(`${line}\n`)) {
    await new Promise((resolve) => streams[slot - 1].once("drain", resolve));
  }
  project.rows += 1;
  if (countryCode === "XX") project.unknownCountryRows += 1;
  if (masterKey) project.masterKeys.add(masterKey);
});
await Promise.all(streams.map((stream) => new Promise((resolve, reject) => stream.end((error) => error ? reject(error) : resolve()))));

if (projects.reduce((sum, project) => sum + project.rows, 0) !== sourceRows) {
  throw new Error("Provider project row totals do not match normalized source rows");
}

const manifest = {
  generated_at: new Date().toISOString(),
  source: "Healthsites World shapefile archive",
  source_key: "healthsites_osm",
  source_rows: sourceRows,
  project_count: projectCount,
  strategy: "Whole countries are greedily balanced by facility count; records without a country code are deterministically distributed.",
  projects: projects.map((project) => ({
    slot: project.slot,
    environment_variable: project.slot === 1 ? "HEALTHSITES_DATABASE_URL" : `HEALTHSITES_DATABASE_URL_${project.slot}`,
    countries: project.countries.sort(),
    rows: project.rows,
    unknown_country_rows: project.unknownCountryRows,
    distinct_master_keys: project.masterKeys.size,
    file: `healthsites_provider_project_${project.slot}.tsv`,
  })),
};
await fsPromises.writeFile(path.join(outputDirectory, "provider-project-allocation.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
