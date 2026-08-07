import type { CoordinateStatus, ProviderCandidate } from "./types";
import { haversineMiles, isValidCoordinate } from "./distance";

export type CoordinateAccuracyPolicy = "exact_only" | "address_or_better" | "include_city_centroid" | "include_unverified";
export type IntegritySeverity = "warning" | "quarantine" | "invalid";

export interface ProviderIntegrityFinding {
  code: string;
  severity: IntegritySeverity;
  message: string;
}

export interface ProviderIntegrityAssessment {
  accepted: boolean;
  quarantined: boolean;
  coordinateStatus: CoordinateStatus;
  findings: ProviderIntegrityFinding[];
}

const US_STATE_CODES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
]);

export function normalizeNpi(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function isValidNpi(value: unknown): boolean {
  const npi = normalizeNpi(value);
  if (!/^\d{10}$/.test(npi)) return false;
  // CMS NPI uses the Luhn algorithm with the 80840 issuer prefix.
  const digits = `80840${npi.slice(0, 9)}`.split("").map(Number);
  let sum = 0;
  for (let index = digits.length - 1, double = true; index >= 0; index -= 1, double = !double) {
    let digit = digits[index];
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(npi[9]);
}

export function coordinateAllowed(status: CoordinateStatus, policy: CoordinateAccuracyPolicy): boolean {
  if (status === "invalid") return false;
  if (policy === "include_unverified") return true;
  if (policy === "include_city_centroid") return status === "verified_exact" || status === "verified_address" || status === "city_centroid";
  if (policy === "address_or_better") return status === "verified_exact" || status === "verified_address";
  return status === "verified_exact";
}

export function coordinateStatusFromLegacy(value: unknown, hasCoordinates: boolean): CoordinateStatus {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["verified_exact", "exact"].includes(normalized)) return hasCoordinates ? "verified_exact" : "invalid";
  if (["verified_address", "geocoded", "address"].includes(normalized)) return hasCoordinates ? "verified_address" : "invalid";
  if (["city_centroid", "centroid", "city"].includes(normalized)) return hasCoordinates ? "city_centroid" : "invalid";
  if (["imported", "verified"].includes(normalized)) return hasCoordinates ? "verified_exact" : "invalid";
  if (normalized === "invalid") return "invalid";
  return hasCoordinates ? "verified_address" : "unverified";
}

export function assessProviderIntegrity(candidate: ProviderCandidate): ProviderIntegrityAssessment {
  const findings: ProviderIntegrityFinding[] = [];
  const hasLat = candidate.lat !== undefined && candidate.lat !== null;
  const hasLng = candidate.lng !== undefined && candidate.lng !== null;
  const hasCoordinates = hasLat && hasLng;
  let coordinateStatus = coordinateStatusFromLegacy(candidate.coordinateStatus, hasCoordinates);

  if (hasLat !== hasLng) {
    findings.push({ code: "coordinate_pair_incomplete", severity: "invalid", message: "Latitude and longitude must either both be present or both be absent." });
    coordinateStatus = "invalid";
  } else if (hasCoordinates && !isValidCoordinate(Number(candidate.lat), Number(candidate.lng))) {
    findings.push({ code: "coordinate_out_of_range", severity: "invalid", message: "Latitude/longitude are outside valid geographic ranges." });
    coordinateStatus = "invalid";
  }

  if (candidate.npi && !isValidNpi(candidate.npi)) {
    findings.push({ code: "invalid_npi", severity: "quarantine", message: "NPI is not a valid ten-digit CMS identifier/checksum." });
  }

  const country = String(candidate.country || "").trim().toUpperCase();
  const state = String(candidate.state || "").trim().toUpperCase();
  if ((country === "US" || country === "USA" || country === "UNITED STATES") && state && !US_STATE_CODES.has(state)) {
    findings.push({ code: "us_state_country_mismatch", severity: "quarantine", message: `State '${state}' is not a recognized U.S. postal abbreviation.` });
  }
  if (country && country !== "US" && country !== "USA" && country !== "UNITED STATES" && US_STATE_CODES.has(state)) {
    findings.push({ code: "country_state_mismatch", severity: "warning", message: `Country '${candidate.country}' conflicts with U.S. state '${state}'.` });
  }
  if (coordinateStatus === "city_centroid" && !candidate.city) {
    findings.push({ code: "centroid_without_city", severity: "quarantine", message: "City-centroid coordinates require a city value." });
  }

  const invalid = findings.some((finding) => finding.severity === "invalid");
  const quarantined = invalid || findings.some((finding) => finding.severity === "quarantine");
  return { accepted: !quarantined, quarantined, coordinateStatus: invalid ? "invalid" : coordinateStatus, findings };
}

export function applyProviderIntegrity(candidate: ProviderCandidate): ProviderCandidate {
  const assessment = assessProviderIntegrity(candidate);
  return {
    ...candidate,
    coordinateStatus: assessment.coordinateStatus,
    integrityFindings: assessment.findings,
    quarantineStatus: assessment.quarantined ? "quarantined" : "accepted",
  };
}

export function detectNearDuplicateLocations(candidates: ProviderCandidate[], thresholdMiles = 0.03): Array<[string, string]> {
  const duplicates: Array<[string, string]> = [];
  for (let first = 0; first < candidates.length; first += 1) {
    const a = candidates[first];
    if (a.lat === undefined || a.lng === undefined || !isValidCoordinate(a.lat, a.lng)) continue;
    for (let second = first + 1; second < candidates.length; second += 1) {
      const b = candidates[second];
      if (b.lat === undefined || b.lng === undefined || !isValidCoordinate(b.lat, b.lng)) continue;
      if (haversineMiles(a.lat, a.lng, b.lat, b.lng) > thresholdMiles) continue;
      const aName = a.name.toLowerCase().replace(/\W+/g, " ").trim();
      const bName = b.name.toLowerCase().replace(/\W+/g, " ").trim();
      if (aName === bName || (a.npi && b.npi && normalizeNpi(a.npi) === normalizeNpi(b.npi))) duplicates.push([a.id, b.id]);
    }
  }
  return duplicates;
}
