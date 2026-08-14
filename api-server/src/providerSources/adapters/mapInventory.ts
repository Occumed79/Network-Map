import { getProviderDatabaseProjects } from "@workspace/db";
import { isPersistenceConfigured } from "../../lib/networkMapPersistence";
import type { ProviderCandidate, CoordinateStatus, SearchParams } from "../types";
import { haversineMiles, isValidCoordinate } from "../distance";
import { classifyHealthcareTags } from "../serviceRouting";

const QUERY_TIMEOUT_MS = 3500;
const COORDINATE_STATUSES = new Set<CoordinateStatus>([
  "verified_exact",
  "verified_address",
  "city_centroid",
  "unverified",
  "invalid",
]);

export async function searchMapInventory(params: SearchParams): Promise<ProviderCandidate[]> {
  if (!isPersistenceConfigured() || !isValidCoordinate(params.centerLat, params.centerLng)) return [];
  const radiusMiles = Math.min(Math.max(params.radiusMiles || 10, 0.1), 100);
  const latDelta = radiusMiles / 69;
  const lngCos = Math.cos(params.centerLat * Math.PI / 180);
  const lngDelta = radiusMiles / Math.max(69 * Math.abs(lngCos), 1);
  const query = `
    SELECT name, formatted_address, lat, lng, phone, website, locality,
           administrative_area_level_1, postal_code, data_source, source_id, raw_data
    FROM public.medical_providers
    WHERE lat IS NOT NULL AND lng IS NOT NULL
      AND lat BETWEEN $1 AND $2
      AND lng BETWEEN $3 AND $4
    LIMIT 1500
  `;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);
  try {
    const databaseProjects = getProviderDatabaseProjects();
    const results = await Promise.allSettled(databaseProjects.map((project) => project.pool.query({
        text: query,
        values: [params.centerLat - latDelta, params.centerLat + latDelta, params.centerLng - lngDelta, params.centerLng + lngDelta],
        signal: controller.signal,
      } as any)));
    const successful = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    if (!successful.length) {
      const firstFailure = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
      throw firstFailure?.reason || new Error("No provider database project is available");
    }
    const observedAt = new Date().toISOString();
    const providers = successful.flatMap((result) => result.value.rows).flatMap((row: Record<string, unknown>, index: number) => {
      const lat = Number(row.lat);
      const lng = Number(row.lng);
      if (!isValidCoordinate(lat, lng)) return [];
      const distanceMiles = haversineMiles(params.centerLat, params.centerLng, lat, lng);
      if (distanceMiles > radiusMiles) return [];
      let raw: Record<string, unknown> = {};
      try { raw = typeof row.raw_data === "string" ? JSON.parse(row.raw_data) : (row.raw_data as Record<string, unknown>) || {}; } catch {}
      const source = String(row.data_source || raw.data_source || "Stored provider");
      const sourceRecordId = String(row.source_id || raw.source_id || index);
      const name = String(row.name || raw.name || raw.clinic_name || "Unnamed Facility");
      const category = classifyHealthcareTags({
        name,
        healthcare: String(raw.services || raw.service_categories || raw.clinic_type || "clinic"),
      });
      const city = String(row.locality || raw.city || "");
      const state = String(row.administrative_area_level_1 || raw.state || "");
      const postalCode = String(row.postal_code || raw.postal_code || raw.zip || "");
      const address = String(row.formatted_address || raw.formatted_address || raw.address || raw.address_1 || "");
      const sourceUrl = String(raw.source_url || "") || undefined;
      const rawCoordinateStatus = String(raw.coordinate_status || raw.coordinateStatus || "").trim() as CoordinateStatus;
      const coordinateStatus: CoordinateStatus = COORDINATE_STATUSES.has(rawCoordinateStatus)
        ? rawCoordinateStatus
        : "unverified";
      const coordinateSource = String(raw.coordinate_source || raw.coordinateSource || "stored-provider-inventory") || undefined;
      return [{
        id: `stored-${source.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${sourceRecordId}`,
        name,
        address,
        city,
        state,
        postalCode,
        country: String(raw.country || "") || undefined,
        phone: String(row.phone || raw.phone || ""),
        website: String(row.website || raw.website || ""),
        lat,
        lng,
        coordinateStatus,
        coordinateSource,
        providerCategory: category,
        services: [category],
        taxonomy: category,
        source,
        sourceDetail: "Network Map provider inventory",
        sourceUrl,
        confidence: "high" as const,
        trustTier: "verified" as const,
        score: 95,
        badges: [source],
        evidence: [{
          serviceDetected: category,
          evidenceUrl: sourceUrl || "stored-provider",
          evidenceTextSnippet: `Stored provider record · ${source}`,
          confidence: 90,
          source,
        }],
        provenance: [{ source, sourceRecordId, sourceUrl, observedAt }],
        lastSeenAt: observedAt,
        matchReason: `Stored provider within ${radiusMiles} mile search radius`,
        distanceMiles,
        _rawSources: [source],
      } satisfies ProviderCandidate];
    });
    const unique = new Map<string, ProviderCandidate>();
    for (const provider of providers.sort((a, b) => (a.distanceMiles || 0) - (b.distanceMiles || 0))) {
      const key = `${provider.name.toLowerCase()}|${provider.lat.toFixed(5)}|${provider.lng.toFixed(5)}`;
      if (!unique.has(key)) unique.set(key, provider);
    }
    return [...unique.values()].slice(0, 1500);
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`Map inventory query timed out after ${QUERY_TIMEOUT_MS}ms`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
