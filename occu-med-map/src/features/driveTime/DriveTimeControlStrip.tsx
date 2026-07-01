import type { EtaOrigin, EtaProviderCandidate, EtaRankingOptions } from "./providerEtaTypes";

type DriveTimeControlStripProps = {
  origin: EtaOrigin | null;
  candidates: EtaProviderCandidate[];
  loading?: boolean;
  rankedCount?: number;
  error?: string;
  onRank: (options?: EtaRankingOptions) => void;
  onCopy: () => void;
  onClear: () => void;
};

export function DriveTimeControlStrip({
  origin,
  candidates,
  loading = false,
  rankedCount = 0,
  error = "",
  onRank,
  onCopy,
  onClear,
}: DriveTimeControlStripProps) {
  const disabled = loading || !origin || candidates.length === 0;
  const status = error
    ? error
    : rankedCount > 0
      ? `${rankedCount} providers ranked by drive time.`
      : origin
        ? `${candidates.length} candidates ready for drive-time ranking.`
        : "Set an origin before ranking providers.";

  return (
    <div className="drive-time-control-strip">
      <div className="drive-time-control-strip__copy">
        <strong>Drive-time tools</strong>
        <span>{status}</span>
      </div>
      <div className="drive-time-control-strip__actions">
        <button type="button" disabled={disabled} onClick={() => onRank({ routeProfile: "driving-traffic" })}>
          Rank by Drive Time
        </button>
        <button type="button" disabled={rankedCount === 0 || loading} onClick={onCopy}>
          Copy ETA
        </button>
        <button type="button" disabled={loading && rankedCount === 0} onClick={onClear}>
          Clear
        </button>
      </div>
    </div>
  );
}
