import { createHash, randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { getPool } from "@workspace/db";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";
import { isValidCoordinate } from "../providerSources/distance";
import { isValidNpi, normalizeNpi } from "../providerSources/integrity";

const router = Router();
const MAX_ROWS_PER_CHUNK = 5000;
const MAX_CHUNKS = 250;
const MAX_HISTORY_LIMIT = 100;

type IncomingRow = Record<string, unknown>;
type FieldMapping = Record<string, string>;
type Disposition = "accepted" | "quarantined" | "rejected" | "duplicate";

type NormalizedUploadRow = {
  rowIndex: number;
  sourceRecordId: string;
  masterKey: string;
  rowHash: string;
  disposition: Disposition;
  reasonCodes: string[];
  name: string;
  normalizedName: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  lat: number | null;
  lng: number | null;
  phone: string;
  email: string;
  website: string;
  npi: string;
  primaryProviderType: string;
  capabilityTags: string[];
  raw: IncomingRow;
};

const aliases: Record<string, string[]> = {
  name: ["name", "providername", "clinicname", "facilityname", "practice", "facility"],
  address: ["formattedaddress", "address", "originaladdress", "streetaddress", "address1", "addressline1", "street"],
  city: ["geocodedcity", "originalcity", "city", "town", "locality"],
  state: ["stateregion", "state", "st", "adminarea", "region", "province"],
  postalCode: ["postalcode", "zip", "zipcode", "postal"],
  countryCode: ["countrycode", "country"],
  lat: ["lat", "latitude"],
  lng: ["lng", "lon", "long", "longitude"],
  phone: ["internationalphone", "localphone", "phone", "telephone", "tel"],
  email: ["email", "emailaddress"],
  website: ["website", "url", "sourceurl"],
  npi: ["npi", "npinumber"],
  sourceRecordId: ["sourcerecordid", "sourceid", "id"],
  primaryProviderType: ["primaryprovidertype", "providertype", "clinictype", "category", "type"],
  capabilityTags: ["capabilitytags", "capabilities", "tags", "services", "specialtiesservices"],
};

function text(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[\s_-]+/g, "");
}

function lookup(row: IncomingRow): Map<string, unknown> {
  return new Map(Object.entries(row).map(([key, value]) => [normalizeKey(key), value]));
}

function mappedValue(row: IncomingRow, mapping: FieldMapping, canonical: string): unknown {
  const values = lookup(row);
  const explicit = mapping[canonical];
  if (explicit && values.has(normalizeKey(explicit))) return values.get(normalizeKey(explicit));
  for (const alias of aliases[canonical] || [canonical]) {
    if (values.has(normalizeKey(alias))) return values.get(normalizeKey(alias));
  }
  return undefined;
}

function sha(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

function parseNumber(value: unknown): number | null {
  const parsed = Number(text(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) return [...new Set(value.map(text).filter(Boolean))];
  const raw = text(value);
  if (!raw) return [];
  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return [...new Set(parsed.map(text).filter(Boolean))];
    } catch {}
  }
  return [...new Set(raw.split(/[|;,]+/).map((part) => part.trim()).filter(Boolean))];
}

function normalizedName(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function sourceKeyForLabel(label: string): string {
  const slug = label.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "dataset";
  return `user_upload_${slug}_${sha(label.toLowerCase()).slice(0, 8)}`;
}

function normalizeCountryCode(value: unknown): string {
  const raw = text(value).toUpperCase();
  if (!raw || ["USA", "UNITED STATES", "UNITED STATES OF AMERICA"].includes(raw)) return "US";
  return raw.slice(0, 3);
}

function normalizeRow(row: IncomingRow, mapping: FieldMapping, rowIndex: number): NormalizedUploadRow {
  const name = text(mappedValue(row, mapping, "name"));
  const address = text(mappedValue(row, mapping, "address"));
  const city = text(mappedValue(row, mapping, "city"));
  const state = text(mappedValue(row, mapping, "state")).toUpperCase();
  const postalCode = text(mappedValue(row, mapping, "postalCode"));
  const countryCode = normalizeCountryCode(mappedValue(row, mapping, "countryCode"));
  const lat = parseNumber(mappedValue(row, mapping, "lat"));
  const lng = parseNumber(mappedValue(row, mapping, "lng"));
  const phone = text(mappedValue(row, mapping, "phone"));
  const email = text(mappedValue(row, mapping, "email"));
  const website = text(mappedValue(row, mapping, "website"));
  const rawNpi = normalizeNpi(mappedValue(row, mapping, "npi"));
  const npi = rawNpi && isValidNpi(rawNpi) ? rawNpi : "";
  const primaryProviderType = text(mappedValue(row, mapping, "primaryProviderType")).toLowerCase().replace(/[\s-]+/g, "_") || "unknown";
  const capabilityTags = parseTags(mappedValue(row, mapping, "capabilityTags"));
  const normalized = normalizedName(name);
  const sourceRecordId = text(mappedValue(row, mapping, "sourceRecordId")) || sha({ normalized, address: address.toLowerCase(), city: city.toLowerCase(), state, postalCode, npi }).slice(0, 32);
  const masterKey = npi ? `npi:${npi}` : `loc:${sha({ normalized, address: address.toLowerCase(), city: city.toLowerCase(), state, postalCode })}`;
  const reasonCodes: string[] = [];

  if (!name) reasonCodes.push("blank_name");
  if (/^(nan|null|none|n\/a|na|unnamed|unnamed clinic)$/i.test(name)) reasonCodes.push("placeholder_name");
  if ((lat === null) !== (lng === null)) reasonCodes.push("coordinate_pair_incomplete");
  if (lat !== null && lng !== null && !isValidCoordinate(lat, lng)) reasonCodes.push("invalid_coordinates");
  if (!rawNpi && text(mappedValue(row, mapping, "npi"))) reasonCodes.push("invalid_npi_format");
  if (rawNpi && !npi) reasonCodes.push("invalid_npi_checksum");
  if (lat === null && lng === null) reasonCodes.push("needs_geocode");

  const fatal = reasonCodes.some((reason) => ["blank_name", "placeholder_name", "coordinate_pair_incomplete", "invalid_coordinates"].includes(reason));
  const quarantine = !fatal && reasonCodes.some((reason) => ["needs_geocode", "invalid_npi_format", "invalid_npi_checksum"].includes(reason));
  const disposition: Disposition = fatal ? "rejected" : quarantine ? "quarantined" : "accepted";
  const normalizedPayload = {
    name, normalizedName: normalized, address, city, state, postalCode, countryCode, lat, lng,
    phone, email, website, npi, primaryProviderType, capabilityTags, sourceRecordId, masterKey,
  };

  return {
    rowIndex,
    sourceRecordId,
    masterKey,
    rowHash: sha(normalizedPayload),
    disposition,
    reasonCodes,
    name,
    normalizedName: normalized,
    address,
    city,
    state,
    postalCode,
    countryCode,
    lat,
    lng,
    phone,
    email,
    website,
    npi,
    primaryProviderType,
    capabilityTags,
    raw: row,
  };
}

function summarize(rows: NormalizedUploadRow[]) {
  const byReason: Record<string, number> = {};
  const byDisposition: Record<string, number> = {};
  for (const row of rows) {
    byDisposition[row.disposition] = (byDisposition[row.disposition] || 0) + 1;
    for (const reason of row.reasonCodes) byReason[reason] = (byReason[reason] || 0) + 1;
  }
  return { byDisposition, byReason };
}

function requirePersistence(res: Response): boolean {
  if (isPersistenceConfigured()) return true;
  res.status(503).json({ error: "DATABASE_URL is required for provider upload lifecycle." });
  return false;
}

router.post("/provider-uploads/preview", async (req: Request, res: Response) => {
  if (!requirePersistence(res)) return;
  const rows = Array.isArray(req.body?.rows) ? req.body.rows as IncomingRow[] : [];
  if (!rows.length) return void res.status(400).json({ error: "rows array is required" });
  if (rows.length > MAX_ROWS_PER_CHUNK) return void res.status(413).json({ error: `Maximum ${MAX_ROWS_PER_CHUNK} rows per chunk`, maxRows: MAX_ROWS_PER_CHUNK });

  const mapping = req.body?.mapping && typeof req.body.mapping === "object" ? req.body.mapping as FieldMapping : {};
  const sourceLabel = text(req.body?.sourceLabel || req.body?.datasetLabel || req.body?.uploadLabel) || "Uploaded Provider Dataset";
  const sourceKey = sourceKeyForLabel(sourceLabel);
  const originalFilename = text(req.body?.filename || req.body?.originalFilename) || "provider-upload";
  const chunkIndex = Math.max(0, Math.trunc(Number(req.body?.chunkIndex || 0)));
  const chunkCount = Math.max(1, Math.min(MAX_CHUNKS, Math.trunc(Number(req.body?.chunkCount || 1))));
  if (chunkIndex >= chunkCount) return void res.status(400).json({ error: "chunkIndex must be less than chunkCount" });
  const logicalUploadKey = text(req.body?.logicalUploadKey || req.body?.idempotencyKey) || sha(`${sourceKey}|${originalFilename}`);
  const fileHash = text(req.body?.fileHash) || null;
  const suppliedContentHash = text(req.body?.contentHash);
  const contentHash = suppliedContentHash || sha({ sourceKey, originalFilename, chunkCount, logicalUploadKey });
  const uploadedBy = text(req.body?.uploadedBy) || null;
  const normalizedRows = rows.map((row, index) => normalizeRow(row || {}, mapping, Number(req.body?.rowOffset || 0) + index));
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout = '30s'");
    let uploadId = text(req.body?.uploadId);
    let run;
    if (uploadId) {
      const existing = await client.query("SELECT * FROM public.provider_upload_runs WHERE id=$1 FOR UPDATE", [uploadId]);
      if (!existing.rows.length) throw Object.assign(new Error("Upload ID was not found"), { statusCode: 404 });
      run = existing.rows[0];
      if (run.content_hash !== contentHash || run.logical_upload_key !== logicalUploadKey) throw Object.assign(new Error("Upload ID does not match logical/content hash"), { statusCode: 409 });
      if (["committed", "rolled_back"].includes(run.status)) throw Object.assign(new Error(`Upload is already ${run.status}`), { statusCode: 409 });
    } else {
      const existing = await client.query(
        "SELECT * FROM public.provider_upload_runs WHERE logical_upload_key=$1 AND content_hash=$2 FOR UPDATE",
        [logicalUploadKey, contentHash],
      );
      if (existing.rows.length) {
        run = existing.rows[0];
        uploadId = run.id;
      } else {
        uploadId = randomUUID();
        const inserted = await client.query(
          `INSERT INTO public.provider_upload_runs
           (id,logical_upload_key,source_key,source_label,original_filename,file_hash,content_hash,status,uploaded_by,chunk_count,mapping,previewed_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'preview',$8,$9,$10::jsonb,now()) RETURNING *`,
          [uploadId, logicalUploadKey, sourceKey, sourceLabel, originalFilename, fileHash, contentHash, uploadedBy, chunkCount, JSON.stringify(mapping)],
        );
        run = inserted.rows[0];
      }
    }

    const existingChunk = await client.query(
      "SELECT count(*)::int AS total FROM public.provider_upload_records WHERE upload_id=$1 AND chunk_index=$2",
      [uploadId, chunkIndex],
    );
    if (Number(existingChunk.rows[0]?.total || 0) > 0) {
      await client.query("COMMIT");
      const summaryResult = await getPool().query(
        `SELECT disposition,count(*)::int AS total FROM public.provider_upload_records WHERE upload_id=$1 GROUP BY disposition`,
        [uploadId],
      );
      return void res.json({ uploadId, idempotent: true, status: run.status, sourceKey, sourceLabel, chunkIndex, chunkCount, counts: Object.fromEntries(summaryResult.rows.map((row) => [row.disposition, row.total])) });
    }

    for (const row of normalizedRows) {
      await client.query(
        `INSERT INTO public.provider_upload_records
         (upload_id,chunk_index,row_index,row_hash,source_record_id,master_key,disposition,reason_codes,raw_payload,normalized_payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb)
         ON CONFLICT (upload_id,row_hash) DO NOTHING`,
        [uploadId, chunkIndex, row.rowIndex, row.rowHash, row.sourceRecordId, row.masterKey, row.disposition, row.reasonCodes, JSON.stringify(row.raw), JSON.stringify(row)],
      );
    }

    const counts = await client.query(
      `SELECT disposition,count(*)::int AS total FROM public.provider_upload_records WHERE upload_id=$1 GROUP BY disposition`,
      [uploadId],
    );
    const chunks = await client.query(
      `SELECT count(DISTINCT chunk_index)::int AS chunks,count(*)::int AS total FROM public.provider_upload_records WHERE upload_id=$1`,
      [uploadId],
    );
    const countMap = Object.fromEntries(counts.rows.map((row) => [row.disposition, Number(row.total)]));
    const receivedChunks = Number(chunks.rows[0]?.chunks || 0);
    const status = receivedChunks >= chunkCount ? "staged" : "preview";
    await client.query(
      `UPDATE public.provider_upload_runs SET status=$2,received_chunks=$3,total_rows=$4,
       accepted_rows=$5,quarantined_rows=$6,rejected_rows=$7,duplicate_rows=$8,updated_at=now()
       WHERE id=$1`,
      [uploadId, status, receivedChunks, Number(chunks.rows[0]?.total || 0), countMap.accepted || 0, countMap.quarantined || 0, countMap.rejected || 0, countMap.duplicate || 0],
    );
    await client.query("COMMIT");

    res.status(201).json({
      uploadId,
      logicalUploadKey,
      contentHash,
      sourceKey,
      sourceLabel,
      status,
      chunkIndex,
      chunkCount,
      receivedChunks,
      commitReady: receivedChunks >= chunkCount,
      summary: summarize(normalizedRows),
      sample: normalizedRows.slice(0, 25).map(({ raw: _raw, ...row }) => row),
      message: receivedChunks >= chunkCount
        ? "Preview complete. Review validation counts and explicitly commit this upload ID. No provider master records have been written yet."
        : `Previewed chunk ${chunkIndex + 1}/${chunkCount}. No provider master records have been written.`,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    const statusCode = Number((error as { statusCode?: number }).statusCode) || 500;
    res.status(statusCode).json({ error: error instanceof Error ? error.message : "Upload preview failed" });
  } finally {
    client.release();
  }
});

router.post("/provider-uploads/:uploadId/commit", async (req: Request, res: Response) => {
  if (!requirePersistence(res)) return;
  const uploadId = req.params.uploadId;
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout = '180s'");
    const runResult = await client.query("SELECT * FROM public.provider_upload_runs WHERE id=$1 FOR UPDATE", [uploadId]);
    if (!runResult.rows.length) throw Object.assign(new Error("Upload ID was not found"), { statusCode: 404 });
    const run = runResult.rows[0];
    if (run.status === "committed") {
      await client.query("COMMIT");
      return void res.json({ uploadId, idempotent: true, status: "committed", committedAt: run.committed_at });
    }
    if (run.status !== "staged" || Number(run.received_chunks) < Number(run.chunk_count)) {
      throw Object.assign(new Error("All preview chunks must be staged before commit"), { statusCode: 409 });
    }
    await client.query("UPDATE public.provider_upload_runs SET status='committing',updated_at=now() WHERE id=$1", [uploadId]);
    await client.query(
      `INSERT INTO public.provider_source_catalog (source_key,display_name,source_kind,trust_tier,active,notes)
       VALUES ($1,$2,'user_upload','verified',true,$3)
       ON CONFLICT (source_key) DO UPDATE SET display_name=EXCLUDED.display_name,source_kind='user_upload',active=true,updated_at=now()`,
      [run.source_key, run.source_label, `Provider upload ${uploadId}`],
    );

    const records = await client.query(
      `SELECT * FROM public.provider_upload_records WHERE upload_id=$1 AND disposition='accepted' ORDER BY chunk_index,row_index`,
      [uploadId],
    );
    let inserted = 0;
    let updated = 0;
    let duplicate = 0;

    for (const record of records.rows) {
      const row = record.normalized_payload as NormalizedUploadRow;
      const existing = await client.query("SELECT to_jsonb(pm) AS row FROM public.provider_master pm WHERE master_key=$1 FOR UPDATE", [row.masterKey]);
      const existedBefore = existing.rows.length > 0;
      await client.query(
        `INSERT INTO public.provider_upload_changes (upload_id,master_key,existed_before,before_row)
         VALUES ($1,$2,$3,$4::jsonb) ON CONFLICT (upload_id,master_key) DO NOTHING`,
        [uploadId, row.masterKey, existedBefore, JSON.stringify(existing.rows[0]?.row || null)],
      );

      if (existedBefore) duplicate += 1;
      const upsert = await client.query(
        `INSERT INTO public.provider_master
         (master_key,name,normalized_name,address_line1,formatted_address,city,state_region,postal_code,country_code,lat,lng,phone,email,website,npi,primary_provider_type,capability_tags,primary_source_key,quality_score,last_seen_at,updated_at)
         VALUES ($1,$2,$3,NULLIF($4,''),NULLIF($4,''),NULLIF($5,''),NULLIF($6,''),NULLIF($7,''),NULLIF($8,''),$9,$10,NULLIF($11,''),NULLIF($12,''),NULLIF($13,''),NULLIF($14,''),$15,$16,$17,0.95,now(),now())
         ON CONFLICT (master_key) DO UPDATE SET
           name=EXCLUDED.name,normalized_name=EXCLUDED.normalized_name,
           address_line1=COALESCE(EXCLUDED.address_line1,provider_master.address_line1),
           formatted_address=COALESCE(EXCLUDED.formatted_address,provider_master.formatted_address),
           city=COALESCE(EXCLUDED.city,provider_master.city),state_region=COALESCE(EXCLUDED.state_region,provider_master.state_region),
           postal_code=COALESCE(EXCLUDED.postal_code,provider_master.postal_code),country_code=COALESCE(EXCLUDED.country_code,provider_master.country_code),
           lat=COALESCE(EXCLUDED.lat,provider_master.lat),lng=COALESCE(EXCLUDED.lng,provider_master.lng),
           phone=COALESCE(EXCLUDED.phone,provider_master.phone),email=COALESCE(EXCLUDED.email,provider_master.email),website=COALESCE(EXCLUDED.website,provider_master.website),
           npi=COALESCE(EXCLUDED.npi,provider_master.npi),primary_provider_type=EXCLUDED.primary_provider_type,
           capability_tags=ARRAY(SELECT DISTINCT value FROM unnest(COALESCE(provider_master.capability_tags,ARRAY[]::text[]) || COALESCE(EXCLUDED.capability_tags,ARRAY[]::text[])) value WHERE value<>''),
           primary_source_key=COALESCE(provider_master.primary_source_key,EXCLUDED.primary_source_key),
           quality_score=GREATEST(COALESCE(provider_master.quality_score,0),0.95),active=true,last_seen_at=now(),updated_at=now()
         RETURNING id,to_jsonb(provider_master) AS row`,
        [row.masterKey, row.name, row.normalizedName, row.address, row.city, row.state, row.postalCode, row.countryCode, row.lat, row.lng, row.phone, row.email, row.website, row.npi, row.primaryProviderType, row.capabilityTags, run.source_key],
      );
      if (existedBefore) updated += 1; else inserted += 1;
      const masterId = upsert.rows[0].id;
      await client.query("UPDATE public.provider_upload_changes SET after_row=$3::jsonb WHERE upload_id=$1 AND master_key=$2", [uploadId, row.masterKey, JSON.stringify(upsert.rows[0].row)]);
      await client.query(
        `INSERT INTO public.provider_master_sources
         (master_provider_id,source_key,source_record_id,source_confidence_score,raw_payload)
         VALUES ($1,$2,$3,0.95,$4::jsonb)
         ON CONFLICT (master_provider_id,source_key,(COALESCE(source_record_id,''))) DO UPDATE SET raw_payload=EXCLUDED.raw_payload,source_confidence_score=GREATEST(COALESCE(provider_master_sources.source_confidence_score,0),0.95),updated_at=now()`,
        [masterId, run.source_key, row.sourceRecordId, JSON.stringify(row.raw)],
      );
      for (const typeKey of [...new Set([row.primaryProviderType, ...row.capabilityTags].filter(Boolean))]) {
        await client.query(
          `INSERT INTO public.provider_master_types (master_provider_id,type_key,source_key,confidence_score)
           VALUES ($1,$2,$3,0.95) ON CONFLICT DO NOTHING`,
          [masterId, typeKey, run.source_key],
        );
      }
    }

    await client.query(
      `UPDATE public.provider_upload_records SET disposition=CASE WHEN disposition='accepted' THEN 'accepted' ELSE disposition END,updated_at=now() WHERE upload_id=$1`,
      [uploadId],
    );
    await client.query(
      `UPDATE public.provider_upload_runs SET status='committed',duplicate_rows=$2,committed_at=now(),updated_at=now(),metadata=metadata || $3::jsonb WHERE id=$1`,
      [uploadId, duplicate, JSON.stringify({ inserted, updated })],
    );
    await client.query("COMMIT");
    res.json({ uploadId, status: "committed", inserted, updated, duplicate, accepted: records.rows.length, quarantined: Number(run.quarantined_rows), rejected: Number(run.rejected_rows) });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    await getPool().query("UPDATE public.provider_upload_runs SET status='commit_failed',metadata=metadata || jsonb_build_object('lastError',$2),updated_at=now() WHERE id=$1", [uploadId, error instanceof Error ? error.message : String(error)]).catch(() => undefined);
    res.status(Number((error as { statusCode?: number }).statusCode) || 500).json({ error: error instanceof Error ? error.message : "Upload commit failed" });
  } finally {
    client.release();
  }
});

router.post("/provider-uploads/:uploadId/rollback", async (req: Request, res: Response) => {
  if (!requirePersistence(res)) return;
  const uploadId = req.params.uploadId;
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout = '180s'");
    const runResult = await client.query("SELECT * FROM public.provider_upload_runs WHERE id=$1 FOR UPDATE", [uploadId]);
    if (!runResult.rows.length) throw Object.assign(new Error("Upload ID was not found"), { statusCode: 404 });
    const run = runResult.rows[0];
    if (run.status === "rolled_back") {
      await client.query("COMMIT");
      return void res.json({ uploadId, idempotent: true, status: "rolled_back", rolledBackAt: run.rolled_back_at });
    }
    if (run.status !== "committed") throw Object.assign(new Error("Only committed uploads can be rolled back"), { statusCode: 409 });
    await client.query("UPDATE public.provider_upload_runs SET status='rolling_back',updated_at=now() WHERE id=$1", [uploadId]);

    const changes = await client.query("SELECT * FROM public.provider_upload_changes WHERE upload_id=$1 ORDER BY id DESC", [uploadId]);
    let restored = 0;
    let removed = 0;
    for (const change of changes.rows) {
      const master = await client.query("SELECT id FROM public.provider_master WHERE master_key=$1 FOR UPDATE", [change.master_key]);
      if (!master.rows.length) continue;
      const masterId = master.rows[0].id;
      await client.query("DELETE FROM public.provider_master_types WHERE master_provider_id=$1 AND source_key=$2", [masterId, run.source_key]);
      await client.query("DELETE FROM public.provider_master_sources WHERE master_provider_id=$1 AND source_key=$2", [masterId, run.source_key]);

      if (!change.existed_before) {
        const remaining = await client.query("SELECT count(*)::int AS total FROM public.provider_master_sources WHERE master_provider_id=$1", [masterId]);
        if (Number(remaining.rows[0]?.total || 0) === 0) {
          await client.query("DELETE FROM public.provider_master WHERE id=$1", [masterId]);
          removed += 1;
        }
        continue;
      }

      const before = change.before_row as Record<string, unknown> | null;
      if (before) {
        await client.query(
          `UPDATE public.provider_master SET
             name=$2,normalized_name=$3,address_line1=$4,formatted_address=$5,city=$6,state_region=$7,postal_code=$8,country_code=$9,
             lat=$10,lng=$11,phone=$12,email=$13,website=$14,npi=$15,primary_provider_type=$16,capability_tags=$17,
             primary_source_key=$18,quality_score=$19,active=$20,updated_at=now()
           WHERE id=$1`,
          [masterId, before.name, before.normalized_name, before.address_line1, before.formatted_address, before.city, before.state_region, before.postal_code, before.country_code, before.lat, before.lng, before.phone, before.email, before.website, before.npi, before.primary_provider_type, before.capability_tags || [], before.primary_source_key, before.quality_score, before.active ?? true],
        );
        restored += 1;
      }
    }

    await client.query("UPDATE public.provider_upload_records SET disposition='rolled_back',updated_at=now() WHERE upload_id=$1 AND disposition='accepted'", [uploadId]);
    await client.query("UPDATE public.provider_upload_runs SET status='rolled_back',rolled_back_at=now(),updated_at=now(),metadata=metadata || $2::jsonb WHERE id=$1", [uploadId, JSON.stringify({ restored, removed })]);
    await client.query("COMMIT");
    res.json({ uploadId, status: "rolled_back", restored, removed });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    await getPool().query("UPDATE public.provider_upload_runs SET status='rollback_failed',metadata=metadata || jsonb_build_object('lastError',$2),updated_at=now() WHERE id=$1", [uploadId, error instanceof Error ? error.message : String(error)]).catch(() => undefined);
    res.status(Number((error as { statusCode?: number }).statusCode) || 500).json({ error: error instanceof Error ? error.message : "Upload rollback failed" });
  } finally {
    client.release();
  }
});

router.get("/provider-uploads", async (req: Request, res: Response) => {
  if (!requirePersistence(res)) return;
  const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), MAX_HISTORY_LIMIT);
  const status = text(req.query.status);
  const params: unknown[] = [];
  const where = status ? `WHERE status=$${params.push(status)}` : "";
  const result = await getPool().query(
    `SELECT id,logical_upload_key,source_key,source_label,original_filename,file_hash,content_hash,status,uploaded_by,chunk_count,received_chunks,total_rows,accepted_rows,quarantined_rows,rejected_rows,duplicate_rows,created_at,previewed_at,committed_at,rolled_back_at,updated_at,metadata
     FROM public.provider_upload_runs ${where} ORDER BY created_at DESC LIMIT $${params.push(limit)}`,
    params,
  );
  res.json({ uploads: result.rows, count: result.rows.length });
});

router.get("/provider-uploads/:uploadId", async (req: Request, res: Response) => {
  if (!requirePersistence(res)) return;
  const run = await getPool().query("SELECT * FROM public.provider_upload_runs WHERE id=$1", [req.params.uploadId]);
  if (!run.rows.length) return void res.status(404).json({ error: "Upload ID was not found" });
  const counts = await getPool().query("SELECT disposition,count(*)::int AS total FROM public.provider_upload_records WHERE upload_id=$1 GROUP BY disposition", [req.params.uploadId]);
  const reasons = await getPool().query("SELECT reason,count(*)::int AS total FROM public.provider_upload_records,unnest(reason_codes) reason WHERE upload_id=$1 GROUP BY reason ORDER BY total DESC", [req.params.uploadId]);
  res.json({ upload: run.rows[0], counts: Object.fromEntries(counts.rows.map((row) => [row.disposition, row.total])), validationReasons: Object.fromEntries(reasons.rows.map((row) => [row.reason, row.total])) });
});

export default router;
