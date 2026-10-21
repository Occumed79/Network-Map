import turfDistance from "@turf/distance";
import { mapboxDirections, mapboxMatrix, type MapboxMatrixCell } from "../../mapboxServices";
import type { EtaOrigin, EtaProviderCandidate, EtaProviderRanking, EtaRankingOptions, EtaRankingResult } from "./providerEtaTypes";

const DEFAULT_OPTIONS: Required<EtaRankingOptions> = {
  maxCandidates: 12,
  maxRouteCalls: 8,
  maxStraightMiles: 250,
  routeProfile: "driving-traffic",
};

export function milesBetween(a: Pick<EtaOrigin, "lat" | "lng">, b: Pick<EtaOrigin, "lat" | "lng">): number {
  return turfDistance([a.lng, a.lat], [b.lng, b.lat], { units: "miles" });
}

export function normalizeCandidateName(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/[^a-z0-9]+/gi, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

export function prepareEtaCandidates(
  origin: EtaOrigin,
  candidates: EtaProviderCandidate[],
  options: EtaRankingOptions = {},
): EtaProviderCandidate[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const seen = new Set<string>();
  return candidates
    .filter((candidate) => Number.isFinite(candidate.lat) && Number.isFinite(candidate.lng))
    .map((candidate) => ({
      ...candidate,
      straightMiles: candidate.straightMiles ?? milesBetween(origin, candidate),
    }))
    .filter((candidate) => {
      if ((candidate.straightMiles || 0) < 0.03) return false;
      if ((candidate.straightMiles || 0) > opts.maxStraightMiles) return false;
      const key = `${normalizeCandidateName(candidate.name)}:${candidate.lat.toFixed(4)}:${candidate.lng.toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.straightMiles || 0) - (b.straightMiles || 0))
    .slice(0, opts.maxCandidates);
}

// Directions fallback for when the Matrix API is unavailable to the token:
// still one request per candidate, but issued concurrently rather than in
// sequence.
async function directionsCells(origin: EtaOrigin, candidates: EtaProviderCandidate[], profile: string): Promise<MapboxMatrixCell[]> {
  const settled = await Promise.allSettled(candidates.map((candidate) => mapboxDirections(origin, candidate, profile)));
  return settled.map((result) => result.status === "fulfilled"
    ? { distanceMiles: result.value.distanceMiles, durationMinutes: result.value.durationMinutes }
    : null);
}

export async function rankProvidersByEta(
  origin: EtaOrigin,
  candidates: EtaProviderCandidate[],
  options: EtaRankingOptions = {},
): Promise<EtaRankingResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const prepared = prepareEtaCandidates(origin, candidates, opts).slice(0, opts.maxRouteCalls);
  if (prepared.length === 0) return { origin, rankings: [], attempted: 0, failed: 0 };

  // One Matrix API request returns every drive time; route geometry is
  // fetched only for the row the user asks to see (see etaRouteEvents).
  let cells: MapboxMatrixCell[];
  try {
    cells = await mapboxMatrix(origin, prepared, opts.routeProfile);
  } catch (error) {
    console.warn("Mapbox Matrix ranking failed; falling back to Directions", error);
    cells = await directionsCells(origin, prepared, opts.routeProfile);
  }

  const rankings: EtaProviderRanking[] = [];
  let failed = 0;
  prepared.forEach((candidate, index) => {
    const cell = cells[index];
    if (!cell || !Number.isFinite(cell.durationMinutes)) {
      failed += 1;
      return;
    }
    rankings.push({
      ...candidate,
      rank: 0,
      driveMiles: Number.isFinite(cell.distanceMiles) ? cell.distanceMiles : candidate.straightMiles || 0,
      driveMinutes: cell.durationMinutes,
      routeCoordinates: [],
      originLabel: origin.label || `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`,
      routeProfile: opts.routeProfile,
    });
  });

  rankings.sort((a, b) => a.driveMinutes - b.driveMinutes);
  rankings.forEach((ranking, index) => {
    ranking.rank = index + 1;
  });

  return {
    origin,
    rankings,
    attempted: prepared.length,
    failed,
  };
}

export function formatEtaRankingForClipboard(result: EtaRankingResult): string {
  if (result.rankings.length === 0) return "No provider ETA rankings available.";
  const lines = [`Provider ETA ranking from ${result.origin.label || `${result.origin.lat.toFixed(4)}, ${result.origin.lng.toFixed(4)}`}`];
  result.rankings.forEach((row) => {
    lines.push(`${row.rank}. ${row.name} — ${Math.round(row.driveMinutes)} min / ${row.driveMiles.toFixed(1)} mi`);
  });
  return lines.join("\n");
}
