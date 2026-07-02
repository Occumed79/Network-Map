import { createHash } from "node:crypto";
import express, { Router, type Request, type Response } from "express";
import { getPool } from "@workspace/db";
import * as XLSX from "../../../occu-med-map/node_modules/xlsx";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { geocodeAddress } from "../providerSources/geocode";

const router = Router();
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

type RawRow = Record<string, unknown>;
type ImportedClinic = {
  source_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  website: string;
  lat: number;
  lng: number;
  data_source: "My Clinics";
  source_type: "user_upload";
};

function normalizeColumn(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function valueFrom(row: RawRow, aliases: string[]): string {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const match = entries.find(([key]) => normalizeColumn(key) === normalizeColumn(alias));
    if (match && match[1] !== null && match[1] !== undefined && String(match[1]).trim()) {
      return String(match[1]).trim();
    }
  }
  return "";
}

function parseCsv(text: string): RawRow[] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim())) records.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  row.push(field);
  if (row.some((cell) => cell.trim())) records.push(row);
  if (records.length < 2) return [];

  const headers = records[0].map((header) => header.replace(/^\uFEFF/, "").trim());
  return records.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
}

function parseMultipart(req: Request): { fileName: string; file: Buffer; batchName: string } {
  const contentType = req.headers["content-type"] || "";
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType)?.slice(1).find(Boolean);
  if (!boundary || !Buffer.isBuffer(req.body)) throw new Error("Invalid multipart upload");

  const parts = req.body.toString("latin1").split(`--${boundary}`);
  let fileName = "";
  let file = Buffer.alloc(0);
  let batchName = "";

  for (const rawPart of parts) {
    const part = rawPart.replace(/^\r\n/, "").replace(/\r\n$/, "").replace(/--$/, "");
    const separator = part.indexOf("\r\n\r\n");
    if (separator < 0) continue;
    const headers = part.slice(0, separator);
    const body = part.slice(separator + 4).replace(/\r\n$/, "");
    const name = /name="([^"]+)"/i.exec(headers)?.[1] || "";
    const uploadedName = /filename="([^"]*)"/i.exec(headers)?.[1] || "";
    if (uploadedName) {
      fileName = uploadedName;
      file = Buffer.from(body, "latin1");
    } else if (name === "batchName") {
      batchName = body.trim();
    }
  }

  if (!fileName || file.length === 0) throw new Error("No clinic file was uploaded");
  return { fileName, file, batchName };
}

function parseRows(fileName: string, file: Buffer): RawRow[] {
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "csv") return parseCsv(file.toString("utf8"));
  if (extension === "xlsx") {
    const workbook = XLSX.read(file, { type: "buffer" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<RawRow>(firstSheet, { defval: "" });
  }
  throw new Error("Unsupported file type. Upload an .xlsx or .csv file.");
}

function validCoordinates(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function stableSourceId(row: RawRow, name: string, address: string, city: string, state: string, zip: string): string {
  const identity = [name, address, city, state, zip].map((value) => value.toLowerCase().trim()).join("|");
  const fallback = JSON.stringify(row);
  return `my_clinics_${createHash("sha256").update(identity || fallback).digest("hex").slice(0, 24)}`;
}

router.post(
  "/clinic-import/upload",
  express.raw({ type: "multipart/form-data", limit: MAX_UPLOAD_BYTES }),
  async (req: Request, res: Response) => {
    const startedAt = Date.now();
    let batchId: number | null = null;
    try {
      if (!isPersistenceConfigured()) {
        res.status(503).json({ error: "Clinic import requires a configured database" });
        return;
      }

      const { fileName, file, batchName } = parseMultipart(req);
      const rows = parseRows(fileName, file);
      if (rows.length === 0) {
        res.status(400).json({ error: "The uploaded file contains no clinic rows" });
        return;
      }

      const detectedColumns = Object.keys(rows[0]);
      const pool = getPool();
      await pool.query(`
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
        )
      `);
      const batchResult = await pool.query<{ id: number }>(
        `INSERT INTO provider_import_batches (batch_name, file_name, total_records, notes)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [batchName || fileName.replace(/\.[^.]+$/, ""), fileName, rows.length, JSON.stringify({ detectedColumns, source: "My Clinics" })],
      );
      batchId = batchResult.rows[0].id;

      let inserted = 0;
      let updated = 0;
      let skipped = 0;
      let failed = 0;
      const errors: Array<{ row: number; name?: string; reason: string }> = [];
      const imported: ImportedClinic[] = [];

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const name = valueFrom(row, ["Clinic Name", "Name", "Provider Name", "Practice Name", "Facility"]);
        const addressOne = valueFrom(row, ["Address One", "Address 1", "Address", "Street Address", "Street"]);
        const addressTwo = valueFrom(row, ["Address Two", "Address 2", "Suite"]);
        const address = [addressOne, addressTwo].filter(Boolean).join(", ");
        const city = valueFrom(row, ["City", "Town"]);
        const state = valueFrom(row, ["State", "Province"]);
        const zip = valueFrom(row, ["Zip", "Zip Code", "Postal Code", "Postal"]);
        const country = valueFrom(row, ["Country", "Country Code"]) || "US";
        const phone = valueFrom(row, ["Phone", "Telephone", "Tel"]);
        const fax = valueFrom(row, ["Fax"]);
        const email = valueFrom(row, ["Email", "E-mail"]);
        const website = valueFrom(row, ["Website", "URL"]);
        const notes = valueFrom(row, ["Notes", "Note", "Description"]);
        const latValue = valueFrom(row, ["Lat", "Latitude"]);
        const lngValue = valueFrom(row, ["Lng", "Lon", "Long", "Longitude"]);
        let lat = latValue ? Number(latValue) : Number.NaN;
        let lng = lngValue ? Number(lngValue) : Number.NaN;
        let coordinateSource: "provided" | "geocoded" = "provided";

        if (!name) {
          skipped += 1;
          errors.push({ row: index + 2, reason: "Missing clinic name" });
          continue;
        }

        if (!validCoordinates(lat, lng)) {
          const query = [address, city, state, zip, country].filter(Boolean).join(", ");
          if (!query) {
            skipped += 1;
            errors.push({ row: index + 2, name, reason: "Missing valid coordinates and geocodable address" });
            continue;
          }
          const point = await geocodeAddress(query);
          if (!point) {
            skipped += 1;
            errors.push({ row: index + 2, name, reason: "Address could not be geocoded" });
            continue;
          }
          lat = point.lat;
          lng = point.lng;
          coordinateSource = "geocoded";
        }

        const sourceId = stableSourceId(row, name, address, city, state, zip);
        try {
          const result = await pool.query(
            `INSERT INTO medical_providers (
              place_id, name, formatted_address, lat, lng, types, category, phone, website,
              country_code, locality, administrative_area_level_1, postal_code, data_source,
              source_id, source_type, confidence_score, raw_data, scraped_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9,
              $10, $11, $12, $13, 'My Clinics', $1, 'user_upload', $14, $15::jsonb, NOW(), NOW()
            )
            ON CONFLICT (source_id) DO UPDATE SET
              name = EXCLUDED.name,
              formatted_address = EXCLUDED.formatted_address,
              lat = EXCLUDED.lat,
              lng = EXCLUDED.lng,
              phone = EXCLUDED.phone,
              website = EXCLUDED.website,
              country_code = EXCLUDED.country_code,
              locality = EXCLUDED.locality,
              administrative_area_level_1 = EXCLUDED.administrative_area_level_1,
              postal_code = EXCLUDED.postal_code,
              confidence_score = EXCLUDED.confidence_score,
              raw_data = EXCLUDED.raw_data,
              updated_at = NOW()
            RETURNING (xmax = 0) AS inserted`,
            [
              sourceId, name, [address, city, state, zip].filter(Boolean).join(", "), lat, lng,
              ["clinic", "user_upload"], "My Clinics", phone, website, country.toUpperCase().slice(0, 2),
              city, state, zip, coordinateSource === "provided" ? 0.95 : 0.78,
              JSON.stringify({ ...row, fax, email, notes, import_batch_id: batchId, coordinate_source: coordinateSource }),
            ],
          );
          if (result.rows[0]?.inserted) inserted += 1;
          else updated += 1;
          imported.push({
            source_id: sourceId, name, address, city, state, zip, phone, website, lat, lng,
            data_source: "My Clinics", source_type: "user_upload",
          });
        } catch (error) {
          failed += 1;
          errors.push({ row: index + 2, name, reason: error instanceof Error ? error.message : "Database insert failed" });
        }
      }

      await pool.query(
        `UPDATE provider_import_batches SET inserted=$1, updated=$2, skipped_invalid_coords=$3,
         skipped_missing_name=$4, failed=$5, completed_at=NOW(), notes=$6 WHERE id=$7`,
        [inserted, updated, errors.filter((error) => error.reason.includes("coordinate") || error.reason.includes("geocod")).length,
          errors.filter((error) => error.reason.includes("name")).length, failed,
          JSON.stringify({ detectedColumns, errors, durationMs: Date.now() - startedAt, source: "My Clinics" }), batchId],
      );

      console.info("[ClinicImport] Upload completed", {
        batchId,
        fileName,
        total: rows.length,
        inserted,
        updated,
        skipped,
        failed,
        durationMs: Date.now() - startedAt,
      });

      res.json({
        batchId,
        detectedColumns,
        inserted,
        updated,
        skipped,
        failed,
        errors,
        sampleProviders: imported.slice(0, 10),
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      console.error("[ClinicImport] Upload failed", { batchId, error });
      res.status(400).json({ error: error instanceof Error ? error.message : "Clinic import failed", batchId });
    }
  },
);

export default router;
