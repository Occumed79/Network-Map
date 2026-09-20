function directNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value === null || value === undefined) return null;
  const parsed = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * HZZO's CKAN export sometimes serializes decimal coordinates as grouped text:
 * `168.337.154.388` means `16.8337154388`, not 168 billion degrees east.
 */
export function parseCroatiaHzzoCoordinate(
  value: unknown,
  minimum: number,
  maximum: number,
): number | null {
  const direct = directNumber(value);
  if (direct !== null && direct >= minimum && direct <= maximum) return direct;

  const raw = String(value ?? "").trim();
  if (!/^[-+]?\d{1,3}(?:[.,]\d{3}){2,}$/.test(raw)) return null;
  const sign = raw.startsWith("-") ? -1 : 1;
  const digits = raw.replace(/\D/g, "");

  // Croatian longitude and latitude both have two integral digits. Keep this
  // range-driven so the parser rejects malformed values rather than guessing.
  for (const integralDigits of [2, 1, 3]) {
    if (digits.length <= integralDigits) continue;
    const candidate = sign * Number(`${digits.slice(0, integralDigits)}.${digits.slice(integralDigits)}`);
    if (Number.isFinite(candidate) && candidate >= minimum && candidate <= maximum) return candidate;
  }
  return null;
}

export function croatiaHzzoCoordinates(
  row: Record<string, unknown>,
): { lat: number; lng: number } | null {
  const xAsLongitude = parseCroatiaHzzoCoordinate(row.M_X, 12, 21);
  const yAsLatitude = parseCroatiaHzzoCoordinate(row.M_Y, 41, 48);
  if (xAsLongitude !== null && yAsLatitude !== null) {
    return { lat: yAsLatitude, lng: xAsLongitude };
  }

  const xAsLatitude = parseCroatiaHzzoCoordinate(row.M_X, 41, 48);
  const yAsLongitude = parseCroatiaHzzoCoordinate(row.M_Y, 12, 21);
  return xAsLatitude !== null && yAsLongitude !== null
    ? { lat: xAsLatitude, lng: yAsLongitude }
    : null;
}
