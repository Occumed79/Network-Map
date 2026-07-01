import type { EtaProviderRanking, EtaRankingResult } from "./providerEtaTypes";

type Listener = (result: EtaRankingResult | null) => void;

let currentResult: EtaRankingResult | null = null;
const listeners = new Set<Listener>();

export function getProviderEtaResult(): EtaRankingResult | null {
  return currentResult;
}

export function setProviderEtaResult(result: EtaRankingResult | null): void {
  currentResult = result;
  listeners.forEach((listener) => listener(currentResult));
  window.dispatchEvent(new CustomEvent("occumed:provider-eta-result", { detail: currentResult }));
}

export function subscribeProviderEtaResult(listener: Listener): () => void {
  listeners.add(listener);
  listener(currentResult);
  return () => listeners.delete(listener);
}

export function findEtaForProvider(name: string): EtaProviderRanking | null {
  if (!currentResult) return null;
  const normalized = normalizeName(name);
  if (!normalized) return null;
  return currentResult.rankings.find((row) => {
    const candidate = normalizeName(row.name);
    return candidate === normalized || candidate.includes(normalized) || normalized.includes(candidate);
  }) || null;
}

function normalizeName(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/[^a-z0-9]+/gi, " ").replace(/\s+/g, " ").trim().toLowerCase();
}
