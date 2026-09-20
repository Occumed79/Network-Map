#!/usr/bin/env node
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { importOfficialRegistry } from "./import-official-registry.mjs";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const generator = path.join(repoRoot, "scripts", "sync-live-registry-to-tsv.mjs");
const apiBaseUrl = String(process.env.REGISTRY_API_BASE_URL || "https://network-map-v846.onrender.com").replace(/\/$/, "");

const registries = [
  ["germany-klinik-atlas","DE","de_klinikatlas","GERMANY_REGISTRY_DATABASE_URL"],
  ["canada-odhf","CA","ca_odhf","CANADA_REGISTRY_DATABASE_URL"],
  ["australia-healthdirect","AU","au_healthdirect","AUSTRALIA_REGISTRY_DATABASE_URL"],
  ["croatia-hzzo-primary-care","HR","hr_hzzo_pzz_ckan","CROATIA_REGISTRY_DATABASE_URL"],
  ["chile-minsal","CL","cl_minsal_establishments","CHILE_REGISTRY_DATABASE_URL"],
  ["colombia-reps","CO","co_reps_sispro","COLOMBIA_REGISTRY_DATABASE_URL"],
  ["ireland-hse-health-centres","IE","ie_hse_health_centres","IRELAND_REGISTRY_DATABASE_URL"],
  ["latvia-medical-facilities","LV","lv_medical_facilities","LATVIA_REGISTRY_DATABASE_URL"],
  ["lithuania-vaspvt","LT","lt_vaspvt_licensed_facilities","LITHUANIA_REGISTRY_DATABASE_URL"],
  ["singapore-chas","SG","sg_moh_chas","SINGAPORE_REGISTRY_DATABASE_URL"],
  ["mexico-clues","MX","mx_clues_2024","MEXICO_REGISTRY_DATABASE_URL"],
  ["taiwan-nlsc-medical","TW","tw_nlsc_medical","TAIWAN_REGISTRY_DATABASE_URL"],
  ["new-zealand-health-facilities","NZ","nz_health_facilities","NEW_ZEALAND_REGISTRY_DATABASE_URL"],
  ["wales-gp-main-sites","GB","gb_wales_gp_sites","WALES_REGISTRY_DATABASE_URL"],
  ["scotland-nhs-hospitals","GB","gb_scotland_nhs_hospitals","SCOTLAND_REGISTRY_DATABASE_URL"],
  ["montenegro-health-facilities","ME","me_ministry_health_facilities","MONTENEGRO_REGISTRY_DATABASE_URL"],
  ["cyprus-state-hospitals","CY","cy_moh_state_hospitals","CYPRUS_REGISTRY_DATABASE_URL"],
  ["moldova-health-institutions","MD","md_ministry_health_map","MOLDOVA_REGISTRY_DATABASE_URL"],
  ["gisco-hospitals-albania","AL","eu_gisco_hospitals_al","ALBANIA_REGISTRY_DATABASE_URL"],
  ["gisco-hospitals-austria","AT","eu_gisco_hospitals_at","AUSTRIA_REGISTRY_DATABASE_URL"],
  ["gisco-hospitals-belgium","BE","eu_gisco_hospitals_be","BELGIUM_REGISTRY_DATABASE_URL"],
  ["gisco-hospitals-bulgaria","BG","eu_gisco_hospitals_bg","BULGARIA_REGISTRY_DATABASE_URL"],
  ["gisco-hospitals-estonia","EE","eu_gisco_hospitals_ee","ESTONIA_REGISTRY_DATABASE_URL"],
  ["gisco-hospitals-greece","GR","eu_gisco_hospitals_gr","GREECE_REGISTRY_DATABASE_URL"],
  ["gisco-hospitals-hungary","HU","eu_gisco_hospitals_hu","HUNGARY_REGISTRY_DATABASE_URL"],
  ["gisco-hospitals-italy","IT","eu_gisco_hospitals_it","ITALY_REGISTRY_DATABASE_URL"],
  ["gisco-hospitals-luxembourg","LU","eu_gisco_hospitals_lu","LUXEMBOURG_REGISTRY_DATABASE_URL"],
  ["gisco-hospitals-malta","MT","eu_gisco_hospitals_mt","MALTA_REGISTRY_DATABASE_URL"],
  ["gisco-hospitals-netherlands","NL","eu_gisco_hospitals_nl","NETHERLANDS_REGISTRY_DATABASE_URL"],
  ["gisco-hospitals-norway","NO","eu_gisco_hospitals_no","NORWAY_REGISTRY_DATABASE_URL"],
  ["gisco-hospitals-poland","PL","eu_gisco_hospitals_pl","POLAND_REGISTRY_DATABASE_URL"],
  ["gisco-hospitals-portugal","PT","eu_gisco_hospitals_pt","PORTUGAL_REGISTRY_DATABASE_URL"],
  ["gisco-hospitals-romania","RO","eu_gisco_hospitals_ro","ROMANIA_REGISTRY_DATABASE_URL"],
  ["gisco-hospitals-serbia","RS","eu_gisco_hospitals_rs","SERBIA_REGISTRY_DATABASE_URL"],
  ["gisco-hospitals-slovakia","SK","eu_gisco_hospitals_sk","SLOVAKIA_REGISTRY_DATABASE_URL"],
  ["gisco-hospitals-slovenia","SI","eu_gisco_hospitals_si","SLOVENIA_REGISTRY_DATABASE_URL"],
  ["gisco-hospitals-spain","ES","eu_gisco_hospitals_es","SPAIN_REGISTRY_DATABASE_URL"],
  ["gisco-hospitals-sweden","SE","eu_gisco_hospitals_se","SWEDEN_REGISTRY_DATABASE_URL"],
  ["gisco-hospitals-switzerland","CH","eu_gisco_hospitals_ch","SWITZERLAND_REGISTRY_DATABASE_URL"],
];

const missing = registries.map((entry) => entry[3]).filter((name) => !String(process.env[name] || "").startsWith("postgres"));
if (missing.length) throw new Error(`Missing registry database variables: ${missing.join(", ")}`);

async function syncOne([source, country, sourceKey, envName]) {
  const directory = await mkdtemp(path.join(tmpdir(), `network-map-${source}-`));
  const output = path.join(directory, "provider.tsv");
  const started = Date.now();
  try {
    console.log(`[${source}] downloading official registry`);
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [generator, "--source", source, "--country", country, "--output", output],
      {
        cwd: repoRoot,
        env: { ...process.env, REGISTRY_API_BASE_URL: apiBaseUrl },
        timeout: 30 * 60 * 1000,
        maxBuffer: 10 * 1024 * 1024,
      },
    );
    if (stderr?.trim()) console.error(`[${source}] ${stderr.trim()}`);
    const count = Number(String(stdout).trim().split(/\s+/).at(-1));
    if (!Number.isInteger(count) || count <= 0) throw new Error(`${source}: generator returned invalid count "${stdout.trim()}"`);

    await importOfficialRegistry({
      connectionString: process.env[envName],
      filePath: output,
      expected: count,
      sourceKey,
      countryCode: country,
    });
    console.log(`[${source}] synchronized ${count} providers in ${Math.round((Date.now() - started) / 1000)}s`);
    return { source, count };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const concurrency = Math.min(Math.max(Number(process.env.REGISTRY_SYNC_CONCURRENCY) || 2, 1), 4);
let cursor = 0;
const results = [];
const failures = [];
async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= registries.length) return;
    const registry = registries[index];
    try {
      results.push(await syncOne(registry));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ source: registry[0], message });
      console.error(`[${registry[0]}] FAILED: ${message}`);
    }
  }
}
await Promise.all(Array.from({ length: concurrency }, () => worker()));

console.log(`Live registry sync completed: ${results.length} succeeded, ${failures.length} failed`);
for (const result of results) console.log(`  OK ${result.source}: ${result.count}`);
for (const failure of failures) console.error(`  FAIL ${failure.source}: ${failure.message}`);
if (failures.length) process.exitCode = 1;
