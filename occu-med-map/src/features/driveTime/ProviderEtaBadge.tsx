import type { EtaProviderRanking } from "./providerEtaTypes";

type ProviderEtaBadgeProps = {
  eta: EtaProviderRanking | null;
  onRoute?: (eta: EtaProviderRanking) => void;
  onCopy?: (eta: EtaProviderRanking) => void;
};

export function ProviderEtaBadge({ eta, onRoute, onCopy }: ProviderEtaBadgeProps) {
  if (!eta) return null;

  return (
    <div className="provider-eta-badge">
      <div className="provider-eta-badge__metrics">
        <strong>{Math.round(eta.driveMinutes)} min</strong>
        <span>{eta.driveMiles.toFixed(1)} mi</span>
      </div>
      <div className="provider-eta-badge__actions">
        {onRoute && (
          <button type="button" onClick={(event) => { event.stopPropagation(); onRoute(eta); }}>
            Route
          </button>
        )}
        {onCopy && (
          <button type="button" onClick={(event) => { event.stopPropagation(); onCopy(eta); }}>
            Copy
          </button>
        )}
      </div>
    </div>
  );
}
