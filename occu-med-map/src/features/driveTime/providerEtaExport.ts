import type { EtaProviderRanking, EtaRankingResult } from "./providerEtaTypes";

export function providerEtaRowToCsv(row: EtaProviderRanking): string[] {
  return [
    String(row.rank),
    row.name,
    `${Math.round(row.driveMinutes)}`,
    row.driveMiles.toFixed(1),
    row.address || "",
    row.phone || "",
    row.website || "",
    row.source || "",
    row.originLabel,
  ];
}

export function etaRankingsToCsv(result: EtaRankingResult): string {
  const header = [
    "Rank",
    "Provider",
    "Drive Minutes",
    "Drive Miles",
    "Address",
    "Phone",
    "Website",
    "Source",
    "Origin",
  ];
  const rows = result.rankings.map(providerEtaRowToCsv);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function etaRankingsToText(result: EtaRankingResult): string {
  if (result.rankings.length === 0) return "No provider ETA rankings available.";
  const lines = [`Provider ETA ranking from ${result.origin.label || `${result.origin.lat.toFixed(4)}, ${result.origin.lng.toFixed(4)}`}`];
  result.rankings.forEach((row) => {
    lines.push(`${row.rank}. ${row.name} — ${Math.round(row.driveMinutes)} min / ${row.driveMiles.toFixed(1)} mi`);
  });
  return lines.join("\n");
}

export function downloadEtaCsv(result: EtaRankingResult, filename = "provider-eta-ranking.csv"): void {
  const blob = new Blob([etaRankingsToCsv(result)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string): string {
  const safe = value.replace(/"/g, '""');
  return /[",\n]/.test(safe) ? `"${safe}"` : safe;
}
