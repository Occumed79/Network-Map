#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import pg from "pg";

const { Client } = pg;

const COLUMNS = [
  "source_record_id", "source_url", "name", "normalized_name", "address_line1",
  "formatted_address", "city", "state_region", "postal_code", "country_code",
  "lat", "lng", "phone", "website", "email", "primary_provider_type",
  "capability_tags", "quality_score", "master_key",
];

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS public.official_registry_providers (
  source_record_id text PRIMARY KEY,
  source_url text,
  name text NOT NULL,
  normalized_name text,
  address_line1 text,
  formatted_address text,
  city text,
  state_region text,
  postal_code text,
  country_code text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  phone text,
  website text,
  email text,
  primary_provider_type text,
  capability_tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  quality_score real,
  master_key text NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT official_registry_valid_coordinates
    CHECK (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
);
CREATE INDEX IF NOT EXISTS official_registry_providers_name_idx
  ON public.official_registry_providers (name, source_record_id);
CREATE TABLE IF NOT EXISTS public.official_registry_metadata (
  source_key text PRIMARY KEY,
  country_code text NOT NULL,
  record_count bigint NOT NULL,
  synchronized_at timestamptz NOT NULL DEFAULT now()
);
`;

function parseTsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          value += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        value += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === "\t") {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  if (quoted) throw new Error("Unterminated quoted TSV field");
  values.push(value);
  return values.map((entry) => entry === "\\N" ? null : entry);
}

async function insertBatch(client, rows) {
  if (rows.length === 0) return;
  const params = [];
  const valueGroups = [];
  for (const row of rows) {
    if (row.length !== COLUMNS.length) {
      throw new Error(`Expected ${COLUMNS.length} TSV fields but found ${row.length}`);
    }
    const placeholders = row.map((value, index) => {
      params.push(value);
      const position = params.length;
      return index === 16 ? `$${position}::text[]` : `$${position}`;
    });
    valueGroups.push(`(${placeholders.join(",")})`);
  }
  await client.query(
    `INSERT INTO public.official_registry_providers (${COLUMNS.join(",")}) VALUES ${valueGroups.join(",")}`,
    params,
  );
}

export async function importOfficialRegistry({
  connectionString,
  filePath,
  expected,
  sourceKey,
  countryCode,
}) {
  if (!connectionString?.startsWith("postgres")) throw new Error(`${sourceKey}: missing dedicated PostgreSQL connection string`);
  if (!Number.isInteger(expected) || expected <= 0) throw new Error(`${sourceKey}: invalid expected count ${expected}`);

  const client = new Client({
    connectionString,
    application_name: `network-map-registry-sync-${sourceKey}`,
    connectionTimeoutMillis: 20_000,
    keepAlive: true,
  });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout TO '10min'");
    await client.query(SCHEMA_SQL);
    await client.query("TRUNCATE public.official_registry_providers");

    const lines = createInterface({ input: createReadStream(filePath, { encoding: "utf8" }), crlfDelay: Infinity });
    let lineNumber = 0;
    let imported = 0;
    let batch = [];
    for await (const line of lines) {
      lineNumber += 1;
      if (lineNumber === 1) {
        const header = line.split("\t");
        if (header.join("\t") !== COLUMNS.join("\t")) throw new Error(`${sourceKey}: unexpected TSV header`);
        continue;
      }
      if (!line) continue;
      batch.push(parseTsvLine(line));
      if (batch.length >= 250) {
        await insertBatch(client, batch);
        imported += batch.length;
        batch = [];
      }
    }
    if (batch.length) {
      await insertBatch(client, batch);
      imported += batch.length;
    }

    if (imported !== expected) throw new Error(`${sourceKey}: imported ${imported}, expected ${expected}`);
    const verification = await client.query(
      `SELECT count(*)::int AS count
         FROM public.official_registry_providers
        WHERE country_code = $1
          AND name IS NOT NULL AND btrim(name) <> ''
          AND lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180`,
      [countryCode],
    );
    const valid = Number(verification.rows[0]?.count || 0);
    if (valid !== expected) throw new Error(`${sourceKey}: verified ${valid}, expected ${expected}`);

    await client.query(
      `INSERT INTO public.official_registry_metadata
         (source_key, country_code, record_count, synchronized_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (source_key) DO UPDATE SET
         country_code = EXCLUDED.country_code,
         record_count = EXCLUDED.record_count,
         synchronized_at = EXCLUDED.synchronized_at`,
      [sourceKey, countryCode, expected],
    );
    await client.query("COMMIT");
    return expected;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}
