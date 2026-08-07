import { eq } from "drizzle-orm";
import { getDb, clinicImportsTable } from "@workspace/db";
import type { ProviderCandidate, CoordinateStatus, TrustTier } from "../types";

export async function searchClinicImports(_city: string, state: string): Promise<ProviderCandidate[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(clinicImportsTable)
    .where(eq(clinicImportsTable.state, state.toUpperCase()));

  return rows.map((r) => {
    const hasCoords = r.lat != null && r.lng != null;
    // Legacy clinic-import rows do not carry enough coordinate provenance to
    // claim exact/address verification. Preserve the coordinates for audit,
    // but keep them unverified until a trusted source or geocoder upgrades them.
    const coordinateStatus: CoordinateStatus = "unverified";
    return {
      id: `db-import-${r.id}`,
      name: r.name,
      address: r.address || "",
      city: r.city || "",
      state: r.state || "",
      postalCode: r.postalCode || "",
      phone: r.phone || "",
      fax: r.fax || undefined,
      website: r.website || "",
      npi: r.npi || undefined,
      lat: hasCoords ? r.lat! : undefined,
      lng: hasCoords ? r.lng! : undefined,
      coordinateStatus,
      coordinateSource: hasCoords ? "legacy-clinic-import" : undefined,
      source: r.sourceTag || "Manual Import",
      sourceDetail: `${r.sourceTag} — Database Import`,
      sourceUrl: "",
      confidence: "high" as const,
      trustTier: "verified" as TrustTier,
      score: 95,
      badges: ["Occu-Med Confirmed", r.sourceTag || "Manual Import"],
      evidence: [{
        serviceDetected: r.services || "urgent care",
        evidenceUrl: "",
        evidenceTextSnippet: r.evidenceNote || `Imported from ${r.sourceTag || "manual"} database`,
        confidence: 95,
        source: r.sourceTag || "Manual Import",
      }],
      internalStatus: r.internalStatus || "candidate",
      _rawSources: [r.sourceTag || "Manual Import", "Database"],
    };
  });
}
