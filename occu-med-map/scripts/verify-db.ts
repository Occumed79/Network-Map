import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

dotenv.config();

async function main() {
  const sql = neon(process.env.NEON_DATABASE_URL!);

  const count = await sql`SELECT count(*) as total FROM medical_providers`;
  console.log("Total providers:", count[0].total);

  const bySource = await sql`SELECT data_source, count(*) as cnt FROM medical_providers GROUP BY data_source ORDER BY cnt DESC`;
  console.log("By source:", bySource);

  const sample = await sql`SELECT name, locality, administrative_area_level_1, lat, lng, data_source FROM medical_providers LIMIT 5`;
  console.log("Sample records:", sample);
}

main().catch(console.error);
