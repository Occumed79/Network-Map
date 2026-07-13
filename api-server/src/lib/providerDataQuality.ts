export const PROVIDER_NAME_PLACEHOLDERS = new Set([
  "nan",
  "null",
  "none",
  "n/a",
  "na",
  "unnamed",
  "unnamed clinic",
]);

export type ProviderCoordinateInput = {
  lat: unknown;
  lng: unknown;
};

export function normalizedProviderName(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isUsableProviderName(value: unknown): boolean {
  const normalized = normalizedProviderName(value);
  return Boolean(normalized) && !PROVIDER_NAME_PLACEHOLDERS.has(normalized);
}

export function isMapEligibleCoordinatePair(input: ProviderCoordinateInput): boolean {
  const lat = Number(input.lat);
  const lng = Number(input.lng);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    (lat !== 0 || lng !== 0)
  );
}

export function providerQualityReasons(input: {
  name: unknown;
  address?: unknown;
  lat: unknown;
  lng: unknown;
}): string[] {
  const reasons: string[] = [];
  const normalizedName = normalizedProviderName(input.name);
  const normalizedAddress = String(input.address ?? "").trim().toLowerCase();
  const lat = Number(input.lat);
  const lng = Number(input.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    reasons.push("invalid_coordinates");
  } else if (lat === 0 && lng === 0) {
    reasons.push("zero_coordinates");
  }

  if (!normalizedName) reasons.push("blank_name");
  else if (PROVIDER_NAME_PLACEHOLDERS.has(normalizedName)) reasons.push("placeholder_name");

  if (["nan", "null", "none", "n/a", "na"].includes(normalizedAddress)) {
    reasons.push("placeholder_address");
  }

  return reasons;
}

export function legacyMapEligibilitySql(alias = "mp"): string {
  return [
    `${alias}.lat IS NOT NULL`,
    `${alias}.lng IS NOT NULL`,
    `${alias}.lat BETWEEN -90 AND 90`,
    `${alias}.lng BETWEEN -180 AND 180`,
    `(${alias}.lat <> 0 OR ${alias}.lng <> 0)`,
    `NULLIF(btrim(${alias}.name), '') IS NOT NULL`,
    `lower(btrim(${alias}.name)) NOT IN ('nan','null','none','n/a','na','unnamed','unnamed clinic')`,
  ].join(" AND ");
}

export function canonicalMapEligibilitySql(alias = "pm"): string {
  return [
    `${alias}.active = true`,
    `${alias}.lat IS NOT NULL`,
    `${alias}.lng IS NOT NULL`,
    `${alias}.lat BETWEEN -90 AND 90`,
    `${alias}.lng BETWEEN -180 AND 180`,
    `(${alias}.lat <> 0 OR ${alias}.lng <> 0)`,
    `NULLIF(btrim(${alias}.name), '') IS NOT NULL`,
    `lower(btrim(${alias}.name)) NOT IN ('nan','null','none','n/a','na','unnamed','unnamed clinic')`,
  ].join(" AND ");
}
