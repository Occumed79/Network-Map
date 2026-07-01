import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEtaRankingForClipboard, rankProvidersByEta } from "./providerEtaEngine";
import { getProviderEtaResult, setProviderEtaResult, subscribeProviderEtaResult } from "./providerEtaStore";
import type { EtaOrigin, EtaProviderCandidate, EtaProviderRanking, EtaRankingOptions, EtaRankingResult } from "./providerEtaTypes";

type ProviderEtaState = {
  result: EtaRankingResult | null;
  loading: boolean;
  error: string;
};

export function useProviderEta() {
  const [state, setState] = useState<ProviderEtaState>({
    result: getProviderEtaResult(),
    loading: false,
    error: "",
  });

  useEffect(() => subscribeProviderEtaResult((result) => {
    setState((prev) => ({ ...prev, result }));
  }), []);

  const rankingsByProviderName = useMemo(() => {
    const rows = state.result?.rankings || [];
    const map = new Map<string, EtaProviderRanking>();
    rows.forEach((row) => {
      map.set(normalizeName(row.name), row);
    });
    return map;
  }, [state.result]);

  const findEta = useCallback((providerName: string): EtaProviderRanking | null => {
    const normalized = normalizeName(providerName);
    if (!normalized) return null;
    const exact = rankingsByProviderName.get(normalized);
    if (exact) return exact;
    for (const [key, value] of rankingsByProviderName.entries()) {
      if (key.includes(normalized) || normalized.includes(key)) return value;
    }
    return null;
  }, [rankingsByProviderName]);

  const rank = useCallback(async (
    origin: EtaOrigin,
    candidates: EtaProviderCandidate[],
    options?: EtaRankingOptions,
  ) => {
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const result = await rankProvidersByEta(origin, candidates, options);
      setProviderEtaResult(result);
      setState({ result, loading: false, error: "" });
      return result;
    } catch (error: any) {
      const message = error?.message || "Unable to rank providers by drive time.";
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, []);

  const clear = useCallback(() => {
    setProviderEtaResult(null);
    setState({ result: null, loading: false, error: "" });
  }, []);

  const copy = useCallback(async () => {
    const result = getProviderEtaResult();
    if (!result) return false;
    const text = formatEtaRankingForClipboard(result);
    await navigator.clipboard.writeText(text);
    return true;
  }, []);

  return {
    ...state,
    rankings: state.result?.rankings || [],
    findEta,
    rank,
    clear,
    copy,
  };
}

function normalizeName(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/[^a-z0-9]+/gi, " ").replace(/\s+/g, " ").trim().toLowerCase();
}
