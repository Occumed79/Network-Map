import { neon } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

// ─── Types ────────────────────────────────────────────────────────────────

interface NormalizedProvider {
  place_id: string;
  name: string;
  formatted_address: string | null;
  lat: number;
  lng: number;
  types: string[];
  category: string | null;
  phone: string | null;
  website: string | null;
  country_code: string | null;
  locality: string | null;
  administrative_area_level_1: string | null;
  postal_code: string | null;
  data_source: string;
  source_id: string;
  source_type: string;
  confidence_score: number;
  raw_data: string;
}

interface BatchStats {
  batch_name: string;
  file_name: string;
  total_records: number;
  inserted: number;
  updated: number;
  skipped_invalid_coords: number;
  skipped_missing_name: number;
  skipped_duplicate: number;
  failed: number;
  started_at: Date;
  completed_at: Date | null;
  notes: string;
}

interface CliArgs {
  source: "bluehive" | "dentists" | "all";
  file: string | null;
  dryRun: boolean;
  limit: number | null;
  batchSize: number;
}

type NeonDB = ReturnType<typeof neon>;

// ─── CLI Parsing ──────────────────────────────────────────────────────────

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    source: "all",
    file: null,
    dryRun: false,
    limit: null,
    batchSize: 500,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--source": {
        const v = args[++i];
        if (v === "bluehive" || v === "dentists" || v === "all") {
          result.source = v;
        } else {
          console.error(`Invalid --source value: ${v}`);
          process.exit(1);
        }
        break;
      }
      case "--file":
        result.file = args[++i] ?? null;
        break;
      case "--dry-run":
        result.dryRun = true;
        break;
      case "--limit":
        result.limit = parseInt(args[++i] ?? "0", 10) || null;
        break;
      case "--batch-size":
        result.batchSize = parseInt(args[++i] ?? "500", 10) || 500;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
    }
  }
  return result;
}

function printHelp(): void {
  console.log(`Usage: tsx scripts/import-provider-json-to-neon.ts [options]

Options:
  --source <bluehive|dentists|all>   Source to import (default: all)
  --file <path>                      Override file path
  --dry-run                          Validate without writing to DB
  --limit <n>                        Process only first N records
  --batch-size <n>                   DB batch size (default: 500)
  --help                             Show this help

Environment:
  NEON_DATABASE_URL                  Neon database connection string

Examples:
  # Dry-run BlueHive with 100 records
  pnpm import:providers --source bluehive --dry-run --limit 100

  # Real import of dentists
  pnpm import:providers --source dentists

  # Import all sources
  pnpm import:providers --source all
`);
}

// ─── Utilities ────────────────────────────────────────────────────────────

function stableHash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").substring(0, 16);
}

function normalizeStr(s: unknown): string {
  if (s == null) return "";
  return String(s).trim().toLowerCase().replace(/\s+/g, " ");
}

function buildAddress(parts: (string | null | undefined)[]): string {
  return parts
    .filter((p) => p != null && p.trim() !== "")
    .map((p) => p!.trim())
    .join(", ");
}

interface CoordResult {
  valid: boolean;
  lat: number;
  lng: number;
}

function validateCoord(lat: unknown, lng: unknown): CoordResult {
  const latNum = typeof lat === "number" ? lat : parseFloat(String(lat));
  const lngNum = typeof lng === "number" ? lng : parseFloat(String(lng));

  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    return { valid: false, lat: 0, lng: 0 };
  }
  if (latNum < -90 || latNum > 90) return { valid: false, lat: 0, lng: 0 };
  if (lngNum < -180 || lngNum > 180) return { valid: false, lat: 0, lng: 0 };
  if (latNum === 0 && lngNum === 0) return { valid: false, lat: 0, lng: 0 };

  return { valid: true, lat: latNum, lng: lngNum };
}

// ─── BlueHive Mapping ─────────────────────────────────────────────────────

interface BlueHiveRow {
  clinic_name?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  fax?: string;
  website?: string;
  hours?: string;
  services?: string;
  service_categories?: string;
  accepts_new_patients?: string;
  telehealth?: string;
  source_url?: string;
  source_city_url?: string;
  source_state_url?: string;
  lat?: number | string | null;
  lng?: number | string | null;
  [key: string]: unknown;
}

function mapBlueHive(row: BlueHiveRow): NormalizedProvider | null {
  const coord = validateCoord(row.lat, row.lng);
  if (!coord.valid) return null;

  const name = row.clinic_name?.trim() ?? "";
  if (!name) return null;

  const formattedAddress = buildAddress([
    row.address_1,
    row.address_2,
    row.city,
    row.state,
    row.zip,
  ]);

  if (!formattedAddress && !row.city && !row.state && !row.zip) return null;

  const sourceUrl = row.source_url?.trim() ?? "";
  const sourceId = sourceUrl
    ? `bluehive_${stableHash(sourceUrl)}`
    : `bluehive_${stableHash(
        `${normalizeStr(name)}|${normalizeStr(formattedAddress)}|${coord.lat}|${coord.lng}`,
      )}`;

  const services = row.services
    ? row.services.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const categories = row.service_categories
    ? row.service_categories.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  return {
    place_id: sourceId,
    name,
    formatted_address: formattedAddress || null,
    lat: coord.lat,
    lng: coord.lng,
    types: services.length > 0 ? services : categories,
    category: categories.length > 0 ? categories[0] : null,
    phone: row.phone?.trim() || null,
    website: row.website?.trim() || null,
    country_code: "US",
    locality: row.city?.trim() || null,
    administrative_area_level_1: row.state?.trim() || null,
    postal_code: row.zip?.trim() || null,
    data_source: "BlueHive",
    source_id: sourceId,
    source_type: "bluehive_directory",
    confidence_score: 0.8,
    raw_data: JSON.stringify(row),
  };
}

// ─── Dentists Mapping ─────────────────────────────────────────────────────

interface DentistRow {
  clinic_name?: string;
  name?: string;
  provider_name?: string;
  address?: string;
  address_1?: string;
  address_2?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  postal_code?: string;
  lat?: number | string | null;
  lng?: number | string | null;
  phone?: string;
  website?: string;
  source_url?: string;
  category?: string;
  types?: string[];
  [key: string]: unknown;
}

function mapDentist(row: DentistRow): NormalizedProvider | null {
  const coord = validateCoord(row.lat, row.lng);
  if (!coord.valid) return null;

  const name = (
    row.clinic_name ?? row.name ?? row.provider_name ?? ""
  ).trim();
  if (!name) return null;

  const formattedAddress = buildAddress([
    row.address,
    row.address_1,
    row.address_2,
    row.street,
    row.city,
    row.state,
    row.zip ?? row.postal_code,
  ]);

  if (!formattedAddress && !row.city && !row.state && !(row.zip ?? row.postal_code)) {
    return null;
  }

  const sourceUrl = row.source_url?.trim() ?? row.website?.trim() ?? "";
  const sourceId = sourceUrl
    ? `dentist_dataset_${stableHash(sourceUrl)}`
    : `dentist_dataset_${stableHash(
        `${normalizeStr(name)}|${normalizeStr(formattedAddress)}|${coord.lat}|${coord.lng}`,
      )}`;

  return {
    place_id: sourceId,
    name,
    formatted_address: formattedAddress || null,
    lat: coord.lat,
    lng: coord.lng,
    types: Array.isArray(row.types) ? row.types : ["Dentist", "Dental"],
    category: row.category?.trim() || "Dentist",
    phone: row.phone?.trim() || null,
    website: row.website?.trim() || null,
    country_code: "US",
    locality: row.city?.trim() || null,
    administrative_area_level_1: row.state?.trim() || null,
    postal_code: (row.zip ?? row.postal_code)?.trim() || null,
    data_source: "Dentist Dataset",
    source_id: sourceId,
    source_type: "dentist_dataset",
    confidence_score: 0.8,
    raw_data: JSON.stringify(row),
  };
}

// ─── JSON Loading ─────────────────────────────────────────────────────────

function loadJsonRecords(filePath: string): unknown[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);

  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray((parsed as Record<string, unknown>).providers)) {
    return (parsed as Record<string, unknown[]>).providers;
  }
  if (parsed && typeof parsed === "object") {
    return [parsed];
  }

  throw new Error(`Unexpected JSON structure in ${filePath}`);
}

// ─── DB Schema ────────────────────────────────────────────────────────────

async function ensureSchema(db: NeonDB): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS provider_import_batches (
      id SERIAL PRIMARY KEY,
      batch_name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      total_records INTEGER DEFAULT 0,
      inserted INTEGER DEFAULT 0,
      updated INTEGER DEFAULT 0,
      skipped_invalid_coords INTEGER DEFAULT 0,
      skipped_missing_name INTEGER DEFAULT 0,
      skipped_duplicate INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      started_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP,
      notes TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_medical_providers_source_id
      ON medical_providers(source_id);
    CREATE INDEX IF NOT EXISTS idx_medical_providers_lower_name
      ON medical_providers(LOWER(name));
    CREATE INDEX IF NOT EXISTS idx_medical_providers_lower_address
      ON medical_providers(LOWER(formatted_address));
  `);
}

// ─── Batch Upsert ─────────────────────────────────────────────────────────

async function batchUpsert(
  db: NeonDB,
  providers: NormalizedProvider[],
  dryRun: boolean,
): Promise<{ inserted: number; updated: number; failed: number }> {
  if (dryRun) {
    return { inserted: providers.length, updated: 0, failed: 0 };
  }

  if (providers.length === 0) {
    return { inserted: 0, updated: 0, failed: 0 };
  }

  const valuesPlaceholders: string[] = [];
  const params: unknown[] = [];

  for (let i = 0; i < providers.length; i++) {
    const p = providers[i];
    const base = i * 20;
    valuesPlaceholders.push(
      `(\$${base + 1}, \$${base + 2}, \$${base + 3}, \$${base + 4}, \$${base + 5}, \$${base + 6}, \$${base + 7}, \$${base + 8}, \$${base + 9}, \$${base + 10}, \$${base + 11}, \$${base + 12}, \$${base + 13}, \$${base + 14}, \$${base + 15}, \$${base + 16}, \$${base + 17}, \$${base + 18}, NOW(), NOW())`,
    );
    params.push(
      p.place_id, p.name, p.formatted_address, p.lat, p.lng, p.types,
      p.category, p.phone, p.website, p.country_code, p.locality,
      p.administrative_area_level_1, p.postal_code, p.data_source,
      p.source_id, p.source_type, p.confidence_score, p.raw_data,
    );
  }

  const query = `
    INSERT INTO medical_providers (
      place_id, name, formatted_address, lat, lng, types, category,
      phone, website, country_code, locality, administrative_area_level_1,
      postal_code, data_source, source_id, source_type, confidence_score,
      raw_data, scraped_at, updated_at
    )
    VALUES ${valuesPlaceholders.join(", ")}
    ON CONFLICT (source_id) DO UPDATE SET
      name = EXCLUDED.name,
      formatted_address = EXCLUDED.formatted_address,
      phone = EXCLUDED.phone,
      website = EXCLUDED.website,
      types = EXCLUDED.types,
      category = EXCLUDED.category,
      country_code = EXCLUDED.country_code,
      locality = EXCLUDED.locality,
      administrative_area_level_1 = EXCLUDED.administrative_area_level_1,
      postal_code = EXCLUDED.postal_code,
      data_source = EXCLUDED.data_source,
      source_type = EXCLUDED.source_type,
      confidence_score = GREATEST(medical_providers.confidence_score, EXCLUDED.confidence_score),
      raw_data = EXCLUDED.raw_data,
      updated_at = NOW()
    RETURNING (xmax = 0) AS was_inserted
  `;

  try {
    const result = await db.query(query, params);
    let inserted = 0;
    let updated = 0;
    for (const row of result.rows as Array<Record<string, unknown>>) {
      if (row.was_inserted) inserted++;
      else updated++;
    }
    return { inserted, updated, failed: 0 };
  } catch (err) {
    console.error("Batch upsert error:", err);
    return { inserted: 0, updated: 0, failed: providers.length };
  }
}

// ─── Batch Tracking ───────────────────────────────────────────────────────

async function createBatchRecord(
  db: NeonDB,
  stats: BatchStats,
  dryRun: boolean,
): Promise<number | null> {
  if (dryRun) return null;

  const result = await db.query(
    `INSERT INTO provider_import_batches
      (batch_name, file_name, total_records, started_at, notes)
     VALUES (\$1, \$2, \$3, \$4, \$5)
     RETURNING id`,
    [stats.batch_name, stats.file_name, stats.total_records, stats.started_at, stats.notes],
  );
  const row = result.rows[0] as Record<string, unknown> | undefined;
  return (row?.id as number) ?? null;
}

async function updateBatchRecord(
  db: NeonDB,
  batchId: number | null,
  stats: BatchStats,
  dryRun: boolean,
): Promise<void> {
  if (dryRun || batchId == null) return;

  await db.query(
    `UPDATE provider_import_batches SET
      inserted = \$1, updated = \$2, skipped_invalid_coords = \$3,
      skipped_missing_name = \$4, skipped_duplicate = \$5, failed = \$6,
      completed_at = \$7, notes = \$8
     WHERE id = \$9`,
    [
      stats.inserted, stats.updated, stats.skipped_invalid_coords,
      stats.skipped_missing_name, stats.skipped_duplicate, stats.failed,
      stats.completed_at, stats.notes, batchId,
    ],
  );
}

// ─── Import Logic ─────────────────────────────────────────────────────────

async function importSource(
  db: NeonDB,
  source: "bluehive" | "dentists",
  filePath: string,
  opts: CliArgs,
): Promise<BatchStats> {
  const fileName = path.basename(filePath);
  const batchName = `${source} import ${new Date().toISOString()}`;
  const stats: BatchStats = {
    batch_name: batchName,
    file_name: fileName,
    total_records: 0,
    inserted: 0,
    updated: 0,
    skipped_invalid_coords: 0,
    skipped_missing_name: 0,
    skipped_duplicate: 0,
    failed: 0,
    started_at: new Date(),
    completed_at: null,
    notes: opts.dryRun ? "DRY RUN - no DB writes" : "",
  };

  console.log(`
=== Importing ${source} from ${filePath} ===`);
  if (opts.dryRun) console.log("DRY RUN MODE - no database writes");
  if (opts.limit) console.log(`Limit: ${opts.limit} records`);

  const records = loadJsonRecords(filePath);
  stats.total_records = opts.limit ? Math.min(opts.limit, records.length) : records.length;
  console.log(`Loaded ${records.length} records from JSON`);

  const batchId = await createBatchRecord(db, stats, opts.dryRun);

  const seenSourceIds = new Set<string>();
  let processed = 0;
  let batch: NormalizedProvider[] = [];

  for (let i = 0; i < records.length; i++) {
    if (opts.limit && processed >= opts.limit) break;

    const row = records[i] as BlueHiveRow & DentistRow;
    const mapped = source === "bluehive" ? mapBlueHive(row) : mapDentist(row);

    if (!mapped) {
      const coord = validateCoord(row.lat, row.lng);
      if (!coord.valid) {
        stats.skipped_invalid_coords++;
      } else {
        stats.skipped_missing_name++;
      }
      continue;
    }

    if (seenSourceIds.has(mapped.source_id)) {
      stats.skipped_duplicate++;
      continue;
    }
    seenSourceIds.add(mapped.source_id);

    batch.push(mapped);
    processed++;

    if (batch.length >= opts.batchSize) {
      const result = await batchUpsert(db, batch, opts.dryRun);
      stats.inserted += result.inserted;
      stats.updated += result.updated;
      stats.failed += result.failed;
      batch = [];
    }

    if (processed % 1000 === 0) {
      console.log(
        `Progress: ${processed}/${stats.total_records} ` +
        `(inserted: ${stats.inserted}, updated: ${stats.updated}, ` +
        `skipped_coords: ${stats.skipped_invalid_coords}, ` +
        `skipped_name: ${stats.skipped_missing_name}, ` +
        `duplicates: ${stats.skipped_duplicate}, failed: ${stats.failed})`,
      );
    }
  }

  if (batch.length > 0) {
    const result = await batchUpsert(db, batch, opts.dryRun);
    stats.inserted += result.inserted;
    stats.updated += result.updated;
    stats.failed += result.failed;
  }

  stats.completed_at = new Date();
  await updateBatchRecord(db, batchId, stats, opts.dryRun);

  console.log(`
--- ${source} import summary ---`);
  console.log(`Total records:    ${stats.total_records}`);
  console.log(`Inserted:         ${stats.inserted}`);
  console.log(`Updated:          ${stats.updated}`);
  console.log(`Skipped (coords): ${stats.skipped_invalid_coords}`);
  console.log(`Skipped (name):   ${stats.skipped_missing_name}`);
  console.log(`Skipped (dup):    ${stats.skipped_duplicate}`);
  console.log(`Failed:           ${stats.failed}`);

  return stats;
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const opts = parseArgs();

  const databaseUrl = process.env.NEON_DATABASE_URL;
  if (!databaseUrl) {
    console.error("NEON_DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const db = neon(databaseUrl);

  if (!opts.dryRun) {
    await ensureSchema(db);
  }

  const sources: Array<{ name: "bluehive" | "dentists"; defaultFile: string }> = [];

  if (opts.source === "bluehive" || opts.source === "all") {
    sources.push({
      name: "bluehive",
      defaultFile: "public/bluehive-map-data.json",
    });
  }
  if (opts.source === "dentists" || opts.source === "all") {
    sources.push({
      name: "dentists",
      defaultFile: "public/dentists.json",
    });
  }

  const allStats: BatchStats[] = [];

  for (const src of sources) {
    const filePath = opts.file && sources.length === 1
      ? opts.file
      : path.resolve(src.defaultFile);

    try {
      const stats = await importSource(db, src.name, filePath, opts);
      allStats.push(stats);
    } catch (err) {
      console.error(`Error importing ${src.name}:`, err);
    }
  }

  console.log("
=== Final Summary ===");
  for (const s of allStats) {
    console.log(
      `${s.batch_name}: ${s.inserted} inserted, ${s.updated} updated, ${s.failed} failed`,
    );
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
