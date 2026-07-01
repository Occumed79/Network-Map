import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

dotenv.config();

async function main() {
  const sql = neon(process.env.NEON_DATABASE_URL!);

  // 1. Total count vs unique source_id
  const total = await sql`SELECT count(*) as cnt FROM medical_providers`;
  const uniqueSourceIds = await sql`SELECT count(DISTINCT source_id) as cnt FROM medical_providers`;
  console.log("=== Duplicate Check ===");
  console.log(`Total rows: ${total[0].cnt}`);
  console.log(`Unique source_ids: ${uniqueSourceIds[0].cnt}`);
  console.log(`Duplicate rows (same source_id): ${Number(total[0].cnt) - Number(uniqueSourceIds[0].cnt)}`);

  // 2. Cross-source duplicates by name + address
  const crossSource = await sql`
    SELECT count(*) as cnt FROM (
      SELECT LOWER(name) as lname, LOWER(formatted_address) as laddr
      FROM medical_providers
      WHERE formatted_address IS NOT NULL
      GROUP BY LOWER(name), LOWER(formatted_address)
      HAVING count(DISTINCT data_source) > 1
    ) x
  `;
  console.log(`\nName+address combos appearing in multiple data_sources: ${crossSource[0].cnt}`);

  // 3. Show some examples
  const examples = await sql`
    SELECT LOWER(name) as lname, LOWER(formatted_address) as laddr,
           array_agg(data_source) as sources, count(*) as cnt
    FROM medical_providers
    WHERE formatted_address IS NOT NULL
    GROUP BY LOWER(name), LOWER(formatted_address)
    HAVING count(DISTINCT data_source) > 1
    ORDER BY cnt DESC
    LIMIT 10
  `;
  console.log("\nTop cross-source duplicates:");
  for (const row of examples) {
    console.log(`  [${row.cnt}x] ${row.lname} | ${row.laddr?.substring(0, 50)} | sources: ${row.sources.join(", ")}`);
  }

  // 4. Duplicates by NPI in raw_data
  const npiDups = await sql`
    SELECT count(*) as cnt FROM (
      SELECT (raw_data::json->>'npi') as npi
      FROM medical_providers
      WHERE raw_data::json->>'npi' IS NOT NULL
      GROUP BY (raw_data::json->>'npi')
      HAVING count(*) > 1
    ) x
  `;
  console.log(`\nDuplicate NPIs in raw_data: ${npiDups[0].cnt}`);

  // 5. Show NPI duplicate examples
  const npiExamples = await sql`
    SELECT (raw_data::json->>'npi') as npi, count(*) as cnt,
           array_agg(data_source) as sources,
           array_agg(name) as names
    FROM medical_providers
    WHERE raw_data::json->>'npi' IS NOT NULL
    GROUP BY (raw_data::json->>'npi')
    HAVING count(*) > 1
    ORDER BY cnt DESC
    LIMIT 5
  `;
  console.log("\nTop NPI duplicates:");
  for (const row of npiExamples) {
    console.log(`  NPI ${row.npi}: ${row.cnt}x | sources: ${row.sources.join(", ")} | names: ${row.names.slice(0,2).join(", ")}`);
  }

  // 6. Check within npi_bulk specifically
  const npiBulkDups = await sql`
    SELECT count(*) as cnt FROM (
      SELECT (raw_data::json->>'npi') as npi
      FROM medical_providers
      WHERE data_source = 'npi_bulk' AND raw_data::json->>'npi' IS NOT NULL
      GROUP BY (raw_data::json->>'npi')
      HAVING count(*) > 1
    ) x
  `;
  console.log(`\nDuplicates within npi_bulk (same NPI): ${npiBulkDups[0].cnt}`);

  // 7. Check within Dentist Dataset
  const dentDups = await sql`
    SELECT count(*) as cnt FROM (
      SELECT (raw_data::json->>'npi') as npi
      FROM medical_providers
      WHERE data_source = 'Dentist Dataset' AND raw_data::json->>'npi' IS NOT NULL
      GROUP BY (raw_data::json->>'npi')
      HAVING count(*) > 1
    ) x
  `;
  console.log(`Duplicates within Dentist Dataset (same NPI): ${dentDups[0].cnt}`);

  // 8. Overlap between npi_bulk and Dentist Dataset
  const overlap = await sql`
    SELECT count(*) as cnt FROM (
      SELECT (raw_data::json->>'npi') as npi
      FROM medical_providers
      WHERE raw_data::json->>'npi' IS NOT NULL
        AND data_source IN ('npi_bulk', 'Dentist Dataset')
      GROUP BY (raw_data::json->>'npi')
      HAVING count(DISTINCT data_source) > 1
    ) x
  `;
  console.log(`NPIs in both npi_bulk AND Dentist Dataset: ${overlap[0].cnt}`);
}

main().catch(console.error);
