import { DriveTimeControlStrip } from "./DriveTimeControlStrip";
import { ProviderEtaBadge } from "./ProviderEtaBadge";
import { liveResultsToEtaCandidates } from "./leafletProviderAdapter";
import { requestEtaRoute } from "./etaRouteEvents";
import { downloadEtaCsv } from "./providerEtaExport";
import { useProviderEta } from "./useProviderEta";
import type { EtaOrigin } from "./providerEtaTypes";

/**
 * Example-only sketch for wiring this feature into App.tsx later.
 * This file is not imported by production code.
 */
export function NativeDriveTimeIntegrationExample({ liveResults, origin }: { liveResults: any[]; origin: EtaOrigin | null }) {
  const eta = useProviderEta();
  const candidates = liveResultsToEtaCandidates(liveResults);

  return (
    <>
      <DriveTimeControlStrip
        origin={origin}
        candidates={candidates}
        loading={eta.loading}
        rankedCount={eta.rankings.length}
        error={eta.error}
        onRank={() => origin && eta.rank(origin, candidates, { routeProfile: "driving-traffic" })}
        onCopy={() => eta.copy()}
        onClear={() => eta.clear()}
      />

      {liveResults.map((provider, index) => {
        const providerName = provider?.name || provider?.organizationName || `Provider ${index + 1}`;
        const providerEta = eta.findEta(providerName);
        return (
          <div key={provider?.id || providerName} className="lp-item">
            <div className="lp-name">{providerName}</div>
            <ProviderEtaBadge
              eta={providerEta}
              onRoute={requestEtaRoute}
              onCopy={(row) => navigator.clipboard.writeText(`${row.name} — ${Math.round(row.driveMinutes)} min / ${row.driveMiles.toFixed(1)} mi`)}
            />
          </div>
        );
      })}

      {eta.result && (
        <button type="button" onClick={() => eta.result && downloadEtaCsv(eta.result)}>
          Download ETA CSV
        </button>
      )}
    </>
  );
}
