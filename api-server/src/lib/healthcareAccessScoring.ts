export const ACCESS_COMPONENT_WEIGHTS = {
  workforce: 0.30,
  capacity: 0.20,
  coverage: 0.20,
  geographic: 0.15,
  localAccess: 0.15,
} as const;

export type AccessComponent = keyof typeof ACCESS_COMPONENT_WEIGHTS;
export type ComponentInput = { score: number; evidence: Record<string, unknown>; sources: string[]; year?: number };
export type UnifiedAccessScore = {
  score: number;
  label: "Easy" | "Moderate" | "Challenging" | "Difficult" | "Critical";
  confidence: number;
  components: Partial<Record<AccessComponent, ComponentInput & { weight: number }>>;
  missingIndicators: string[];
  sourceNames: string[];
  sourceYears: number[];
  algorithmVersion: string;
};

const LABELS = ["Easy", "Moderate", "Challenging", "Difficult", "Critical"] as const;
export const ACCESS_ALGORITHM_VERSION = "unified-access-v1";

export function scarcityScore(value: number, good: number, critical: number): number {
  if (!Number.isFinite(value)) throw new Error("A missing indicator cannot be scored");
  if (good === critical) return 3;
  const ratio = (good - value) / (good - critical);
  return Math.max(1, Math.min(5, 1 + ratio * 4));
}

export function burdenScore(value: number, easy: number, critical: number): number {
  if (!Number.isFinite(value)) throw new Error("A missing indicator cannot be scored");
  const ratio = (value - easy) / Math.max(critical - easy, Number.EPSILON);
  return Math.max(1, Math.min(5, 1 + ratio * 4));
}

export function calculateUnifiedAccessScore(
  inputs: Partial<Record<AccessComponent, ComponentInput>>,
  expectedIndicators: AccessComponent[] = Object.keys(ACCESS_COMPONENT_WEIGHTS) as AccessComponent[],
): UnifiedAccessScore {
  let weighted = 0;
  let availableWeight = 0;
  const components: UnifiedAccessScore["components"] = {};
  const sources = new Set<string>();
  const years = new Set<number>();
  for (const key of expectedIndicators) {
    const input = inputs[key];
    if (!input || !Number.isFinite(input.score)) continue;
    const weight = ACCESS_COMPONENT_WEIGHTS[key];
    const score = Math.max(1, Math.min(5, input.score));
    weighted += score * weight;
    availableWeight += weight;
    input.sources.forEach((source) => sources.add(source));
    if (input.year) years.add(input.year);
    components[key] = { ...input, score: Number(score.toFixed(2)), weight };
  }
  if (!availableWeight) throw new Error("No authoritative indicators are available for this geography");
  const numeric = Number((weighted / availableWeight).toFixed(2));
  const rounded = Math.max(1, Math.min(5, Math.round(numeric)));
  return {
    score: numeric,
    label: LABELS[rounded - 1],
    confidence: Number(availableWeight.toFixed(2)),
    components,
    missingIndicators: expectedIndicators.filter((key) => !inputs[key]),
    sourceNames: [...sources].sort(),
    sourceYears: [...years].sort((a, b) => b - a),
    algorithmVersion: ACCESS_ALGORITHM_VERSION,
  };
}
