#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const SOURCE_DIR = path.resolve("data/generated/global-health-facilities");
const OUTPUT_DIR = path.join(SOURCE_DIR, "compact");
const CHUNK_SIZE = Math.max(1, Number(process.env.COMPACT_CHUNK_SIZE || 25));

function splitTopLevelTuple(line) {
  const trimmed = line.trim().replace(/^\(/u, "").replace(/[;,]?$/u, "").replace(/\)$/u, "");
  const fields = [];
  let current = "";
  let inString = false;
  let squareDepth = 0;
  let roundDepth = 0;

  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    const next = trimmed[index + 1];
    if (char === "'" && inString && next === "'") {
      current += "''";
      index += 1;
      continue;
    }
    if (char === "'") {
      inString = !inString;
      current += char;
      continue;
    }
    if (!inString) {
      if (char === "[") squareDepth += 1;
      else if (char === "]") squareDepth -= 1;
      else if (char === "(") roundDepth += 1;
      else if (char === ")") roundDepth -= 1;
      else if (char === "," && squareDepth === 0 && roundDepth === 0) {
        fields.push(current.trim());
        current = "";
        continue;
      }
    }
    current += char;
  }
  fields.push(current.trim());
  return fields;
}

function compactTuple(fields) {
  if (fields.length !== 21) throw new Error(`Expected 21 fields, received ${fields.length}`);
  const selected = [
    fields[0],
    fields[1],
    fields[4],
    fields[5],
    fields[6],
    fields[7],
    fields[8],
    fields[9],
    fields[10],
    fields[11],
    fields[12],
    fields[13],
    fields[14],
    fields[15],
    fields[16],
    fields[17],
    fields[18],
    fields[19],
    fields[20],
  ];
  return `(${selected.join(", ")})`;
}

async function main() {
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const names = (await fs.readdir(SOURCE_DIR))
    .filter((name) => /^global_health_facilities_\d+\.sql$/u.test(name))
    .sort();
  const tuples = [];

  for (const name of names) {
    const content = await fs.readFile(path.join(SOURCE_DIR, name), "utf8");
    const lines = content.split(/\r?\n/u);
    let collecting = false;
    for (const line of lines) {
      if (line.startsWith("INSERT INTO tmp_global_health_facilities VALUES")) {
        collecting = true;
        continue;
      }
      if (!collecting) continue;
      if (!line.trim()) break;
      if (!line.trim().startsWith("(")) break;
      tuples.push(compactTuple(splitTopLevelTuple(line)));
    }
  }

  if (!tuples.length) throw new Error("No Source 5 tuples found");
  const files = [];
  for (let offset = 0; offset < tuples.length; offset += CHUNK_SIZE) {
    const rows = tuples.slice(offset, offset + CHUNK_SIZE);
    const fileName = `source5_compact_${String(files.length + 1).padStart(3, "0")}.sql`;
    const sql = `INSERT INTO public.source5_import_staging (\n  source_record_id, source_url, name, normalized_name, address_line1, formatted_address,\n  city, state_region, postal_code, country_code, lat, lng, phone, website, email,\n  primary_provider_type, capability_tags, quality_score, master_key\n) VALUES\n${rows.join(",\n")}\nON CONFLICT (source_record_id) DO UPDATE SET\n  source_url=EXCLUDED.source_url, name=EXCLUDED.name, normalized_name=EXCLUDED.normalized_name,\n  address_line1=EXCLUDED.address_line1, formatted_address=EXCLUDED.formatted_address,\n  city=EXCLUDED.city, state_region=EXCLUDED.state_region, postal_code=EXCLUDED.postal_code,\n  country_code=EXCLUDED.country_code, lat=EXCLUDED.lat, lng=EXCLUDED.lng, phone=EXCLUDED.phone,\n  website=EXCLUDED.website, email=EXCLUDED.email, primary_provider_type=EXCLUDED.primary_provider_type,\n  capability_tags=EXCLUDED.capability_tags, quality_score=EXCLUDED.quality_score, master_key=EXCLUDED.master_key;\n`;
    await fs.writeFile(path.join(OUTPUT_DIR, fileName), sql, "utf8");
    files.push({ file: fileName, rows: rows.length });
  }

  await fs.writeFile(
    path.join(OUTPUT_DIR, "manifest.json"),
    JSON.stringify({ generated_at: new Date().toISOString(), total_rows: tuples.length, files }, null, 2),
    "utf8",
  );
  console.log(JSON.stringify({ total_rows: tuples.length, files }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
