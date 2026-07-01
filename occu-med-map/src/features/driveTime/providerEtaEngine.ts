import { mapboxDirections } from "../../mapboxServices";
import type { EtaOrigin, EtaProviderCandidate, EtaProviderRanking, EtaRankingOptions, EtaRankingResult } from "./providerEtaTypes";

const DEFAULT_OPTIONS: Required<EtaRankingOptions> = {
  maxCandidates: 12,
  maxRouteCalls: 8,
  maxStraightMiles: 250,
  routeProfile: "driving-traffic",
};

export function milesBetween(a: Pick<EtaOrigin, "lat" | "lng">, b: Pick<EtaOrigin, "lat" | "lng">): number {
  const radiusMiles = 3958.7613;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radiusMiles * Math.asin(Math.sqrt(h));
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

export async function rankProvidersByEta(
  origin: EtaOrigin,
  candidates: EtaProviderCandidate[],
  options: EtaRankingOptions = {},
): Promise<EtaRankingResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const prepared = prepareEtaCandidates(origin, candidates, opts).slice(0, opts.maxRouteCalls);
  const rankings: EtaProviderRanking[] = [];
  let failed = 0;

  for (const candidate of prepared) {
    try {
      const route = await mapboxDirections(origin, candidate, opts.routeProfile);
      rankings.push({
        ...candidate,
        rank: 0,
        driveMiles: route.distanceMiles,
        driveMinutes: route.durationMinutes,
        routeCoordinates: route.coordinates,
        originLabel: origin.label || `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`,
        routeProfile: opts.routeProfile,
      });
    } catch {
      failed += 1;
    }
  }

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
