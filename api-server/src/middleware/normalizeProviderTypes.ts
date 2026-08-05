import type { RequestHandler } from "express";
import {
  clinicTypeLabel,
  normalizeClinicType,
  type ClinicType,
} from "../lib/providerClassifier";

const PROVIDER_ARRAY_KEYS = new Set([
  "providers",
  "records",
  "live_only",
  "stored_only",
  "results",
]);

function nonEmptyText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function appendTypeLabel(value: unknown, label: string): unknown {
  if (Array.isArray(value)) {
    const output = value.map(String).filter(Boolean);
    if (!output.some((item) => item.toLowerCase() === label.toLowerCase())) output.push(label);
    return output;
  }
  const text = nonEmptyText(value);
  if (!text) return [label];
  if (text.toLowerCase().includes(label.toLowerCase())) return value;
  return `${text}, ${label}`;
}

function providerEvidence(row: Record<string, unknown>) {
  return {
    name: row.name ?? row.clinic_name,
    category: row.category ?? row.facility_type ?? row.type,
    types: row.types,
    services: row.services,
    service_categories: row.service_categories ?? row.categories,
    taxonomy_description: row.taxonomy_description ?? row.taxonomy,
    raw_data: row.raw_data,
    raw_source_data: row.raw_source_data,
  };
}

function originalProviderType(row: Record<string, unknown>): unknown {
  return row.source_provider_type
    ?? row.clinic_type
    ?? row.provider_type
    ?? row.providerType
    ?? row.facility_type
    ?? row.category
    ?? row.type
    ?? row.taxonomy_description;
}

function normalizeProviderRow(row: Record<string, unknown>): Record<string, unknown> {
  const originalType = originalProviderType(row);
  const clinicType: ClinicType = normalizeClinicType(originalType, providerEvidence(row));
  const label = clinicTypeLabel(clinicType);
  return {
    ...row,
    source_provider_type: nonEmptyText(originalType),
    clinic_type: clinicType,
    provider_type: label,
    providerType: label,
    services: appendTypeLabel(row.services, label),
    categories: appendTypeLabel(row.categories, label),
  };
}

function looksLikeProvider(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return Boolean(
    row.name
    || row.clinic_name
    || row.clinic_type
    || row.provider_type
    || row.source_kind
    || row.source
    || row.lat !== undefined
    || row.lng !== undefined
    || row.services
    || row.categories,
  );
}

function normalizeFacet(row: Record<string, unknown>): Record<string, unknown> {
  if (row.clinic_type === null || row.clinic_type === undefined) return row;
  const clinicType = normalizeClinicType(row.clinic_type, providerEvidence(row));
  return {
    ...row,
    source_provider_type: nonEmptyText(row.clinic_type),
    clinic_type: clinicType,
    provider_type: clinicTypeLabel(clinicType),
  };
}

function normalizePayload(body: unknown): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const payload = body as Record<string, unknown>;
  const output: Record<string, unknown> = { ...payload };

  for (const key of PROVIDER_ARRAY_KEYS) {
    const value = payload[key];
    if (!Array.isArray(value)) continue;
    output[key] = value.map((row) => looksLikeProvider(row) ? normalizeProviderRow(row) : row);
  }

  if (Array.isArray(payload.facets)) {
    output.facets = payload.facets.map((row) =>
      row && typeof row === "object" && !Array.isArray(row)
        ? normalizeFacet(row as Record<string, unknown>)
        : row,
    );
  }

  if (looksLikeProvider(payload.provider)) {
    output.provider = normalizeProviderRow(payload.provider);
  }

  return output;
}

export const normalizeProviderTypeResponses: RequestHandler = (req, res, next) => {
  const relevantPath = req.path.startsWith("/provider-explorer") || req.path.startsWith("/provider-layers");
  if (!relevantPath) {
    next();
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => originalJson(normalizePayload(body))) as typeof res.json;
  next();
};
