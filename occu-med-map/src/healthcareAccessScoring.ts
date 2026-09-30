export type HealthcareAccessAssessment = {
  score: number;
  label: "Easy" | "Moderate" | "Challenging" | "Difficult" | "Critical";
  confidence: number;
  service: string;
  components: Record<string, { score: number; weight: number; evidence: Record<string, unknown>; sources: string[]; year?: number }>;
  evidence: {
    population: number | null;
    populationDensity: number | null;
    rurality: number | null;
    remotenessClass: string | null;
    nearestRelevantProvider: string | null;
    nearestRelevantProviderMiles: number | null;
    travelMinutes: number | null;
    relevantProviders: number;
    facilities: number;
  };
  geography: { countryCode: string; admin1: string | null; level: string; nationalBaselineFallback: boolean };
  sourceNames: string[];
  sourceYears: number[];
  missingIndicators: string[];
  warnings: string[];
  algorithmVersion: string;
};

export async function fetchHealthcareAccessAssessment(input: {
  lat: number; lng: number; service: string; countryCode: string; admin1?: string;
}): Promise<HealthcareAccessAssessment> {
  const params = new URLSearchParams({ lat: String(input.lat), lng: String(input.lng), service: input.service, countryCode: input.countryCode });
  if (input.admin1) params.set("admin1", input.admin1);
  const response = await fetch(`/api/scoring/assessment?${params}`, { signal: AbortSignal.timeout(60_000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.assessment) throw new Error(data.error || `Assessment request failed (HTTP ${response.status})`);
  return data.assessment;
}
