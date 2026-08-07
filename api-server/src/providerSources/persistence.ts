import { eq, and, isNull } from "drizzle-orm";
import { getDb, providersTable, providerLocationsTable, providerContactsTable, providerServicesTable, providerSourcesTable, providerEvidenceTable, geocodeCacheTable } from "@workspace/db";
import type { ProviderCandidate, TrustTier } from "./types";
import { assessProviderIntegrity, coordinateStatusFromLegacy, isValidNpi, normalizeNpi } from "./integrity";

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\b(llc|inc|corp|ltd|pllc|pa|md|do|np|dds|od|dc|pt|phd|aprn)\b/g, "").replace(/\s+/g, " ").trim();
}

export async function upsertProvider(candidate: ProviderCandidate, serviceType: string): Promise<{ providerId: number; isNew: boolean }> {
  const db = getDb();
  const normalizedName = normalizeName(candidate.name);
  const assessment = assessProviderIntegrity(candidate);
  const normalizedNpi = candidate.npi && isValidNpi(candidate.npi) ? normalizeNpi(candidate.npi) : null;
  const integrityState = {
    quarantineStatus: assessment.quarantined ? "quarantined" : "accepted",
    integrityFindings: assessment.findings,
    updatedAt: new Date(),
  };

  if (normalizedNpi) {
    const existing = await db.select().from(providersTable).where(eq(providersTable.npi, normalizedNpi)).limit(1);
    if (existing.length > 0) {
      await db.update(providersTable).set(integrityState).where(eq(providersTable.id, existing[0].id));
      await upsertLocation(db, existing[0].id, { ...candidate, coordinateStatus: assessment.coordinateStatus });
      await upsertContacts(db, existing[0].id, candidate);
      await upsertService(db, existing[0].id, serviceType, candidate);
      await upsertSource(db, existing[0].id, candidate);
      await upsertEvidence(db, existing[0].id, candidate);
      return { providerId: existing[0].id, isNew: false };
    }
  }

  const byName = await db.select().from(providersTable).where(eq(providersTable.normalizedName, normalizedName)).limit(5);
  if (byName.length > 0) {
    for (const existing of byName) {
      const locations = await db.select().from(providerLocationsTable)
        .where(and(eq(providerLocationsTable.providerId, existing.id), eq(providerLocationsTable.state, candidate.state)))
        .limit(1);
      if (locations.length > 0) {
        await db.update(providersTable).set(integrityState).where(eq(providersTable.id, existing.id));
        await upsertLocation(db, existing.id, { ...candidate, coordinateStatus: assessment.coordinateStatus });
        await upsertContacts(db, existing.id, candidate);
        await upsertService(db, existing.id, serviceType, candidate);
        await upsertSource(db, existing.id, candidate);
        await upsertEvidence(db, existing.id, candidate);
        return { providerId: existing.id, isNew: false };
      }
    }
  }

  const providerType = candidate.source === "NPI"
    ? (candidate.sourceDetail?.includes("NPI-2") ? "organization" : "individual")
    : (candidate.providerCategory || "unknown");
  const [newProvider] = await db.insert(providersTable).values({
    npi: normalizedNpi,
    name: candidate.name,
    normalizedName,
    providerType,
    quarantineStatus: assessment.quarantined ? "quarantined" : "accepted",
    integrityFindings: assessment.findings,
  }).returning({ id: providersTable.id });

  await upsertLocation(db, newProvider.id, { ...candidate, coordinateStatus: assessment.coordinateStatus });
  await upsertContacts(db, newProvider.id, candidate);
  await upsertService(db, newProvider.id, serviceType, candidate);
  await upsertSource(db, newProvider.id, candidate);
  await upsertEvidence(db, newProvider.id, candidate);
  return { providerId: newProvider.id, isNew: true };
}

const COORDINATE_RANK: Record<string, number> = {
  invalid: 0,
  unverified: 1,
  city_centroid: 2,
  verified_address: 3,
  verified_exact: 4,
};

async function upsertLocation(db: ReturnType<typeof getDb>, providerId: number, candidate: ProviderCandidate) {
  if (!candidate.city && !candidate.state && !candidate.country) return;
  const hasCoordinates = candidate.lat !== undefined && candidate.lng !== undefined;
  const incomingStatus = coordinateStatusFromLegacy(candidate.coordinateStatus, hasCoordinates);
  const existing = await db.select().from(providerLocationsTable)
    .where(and(eq(providerLocationsTable.providerId, providerId), eq(providerLocationsTable.state, candidate.state)))
    .limit(1);

  if (existing.length > 0) {
    const currentStatus = coordinateStatusFromLegacy(existing[0].coordinateStatus, existing[0].lat != null && existing[0].lng != null);
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (hasCoordinates && COORDINATE_RANK[incomingStatus] > COORDINATE_RANK[currentStatus]) {
      updates.lat = candidate.lat;
      updates.lng = candidate.lng;
      updates.coordinateStatus = incomingStatus;
      updates.coordinateSource = candidate.coordinateSource || candidate.source;
    }
    if (candidate.address && !existing[0].address) updates.address = candidate.address;
    if (candidate.postalCode && !existing[0].postalCode) updates.postalCode = candidate.postalCode;
    if (candidate.country && !existing[0].country) updates.country = candidate.country;
    await db.update(providerLocationsTable).set(updates).where(eq(providerLocationsTable.id, existing[0].id));
  } else {
    await db.insert(providerLocationsTable).values({
      providerId,
      address: candidate.address || null,
      city: candidate.city || null,
      state: candidate.state || null,
      country: candidate.country || null,
      postalCode: candidate.postalCode || null,
      lat: candidate.lat ?? null,
      lng: candidate.lng ?? null,
      coordinateStatus: incomingStatus,
      coordinateSource: candidate.coordinateSource || candidate.source || null,
    });
  }
}

async function upsertContacts(db: ReturnType<typeof getDb>, providerId: number, candidate: ProviderCandidate) {
  if (!candidate.phone && !candidate.fax && !candidate.website) return;
  const existing = await db.select().from(providerContactsTable).where(eq(providerContactsTable.providerId, providerId)).limit(1);
  if (existing.length === 0) {
    await db.insert(providerContactsTable).values({ providerId, phone: candidate.phone || null, fax: candidate.fax || null, website: candidate.website || null });
  } else {
    const updates: Record<string, unknown> = {};
    if (candidate.phone && !existing[0].phone) updates.phone = candidate.phone;
    if (candidate.fax && !existing[0].fax) updates.fax = candidate.fax;
    if (candidate.website && !existing[0].website) updates.website = candidate.website;
    if (Object.keys(updates).length > 0) await db.update(providerContactsTable).set(updates).where(eq(providerContactsTable.id, existing[0].id));
  }
}

async function upsertService(db: ReturnType<typeof getDb>, providerId: number, serviceType: string, candidate: ProviderCandidate) {
  const services = Array.from(new Set([serviceType, ...(candidate.services || [])].filter(Boolean)));
  for (const resolvedService of services) {
    const existing = await db.select().from(providerServicesTable)
      .where(and(eq(providerServicesTable.providerId, providerId), eq(providerServicesTable.serviceType, resolvedService)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(providerServicesTable).values({
        providerId,
        serviceType: resolvedService,
        taxonomy: candidate.taxonomy || null,
        taxonomyCode: candidate.taxonomyCode || null,
      });
    }
  }
}

async function upsertSource(db: ReturnType<typeof getDb>, providerId: number, candidate: ProviderCandidate) {
  const trustTierMap: Record<string, TrustTier> = {
    NPI: "registry",
    FMCSA: "registry",
    FAA: "registry",
    "Manual Import": "verified",
    "Patients First": "verified",
    OpenStreetMap: "directory",
  };
  const trustTier = candidate.trustTier || trustTierMap[candidate.source] || "lead";
  const provenance = candidate.provenance?.length
    ? candidate.provenance
    : [{ source: candidate.source, sourceRecordId: candidate.npi || candidate.id, sourceUrl: candidate.sourceUrl }];

  for (const item of provenance) {
    const sourceId = item.source.toLowerCase().replace(/\s+/g, "_");
    const externalId = item.sourceRecordId || candidate.npi || null;
    const externalIdPredicate = externalId === null
      ? isNull(providerSourcesTable.externalId)
      : eq(providerSourcesTable.externalId, externalId);
    const existing = await db.select().from(providerSourcesTable)
      .where(and(eq(providerSourcesTable.providerId, providerId), eq(providerSourcesTable.sourceId, sourceId), externalIdPredicate))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(providerSourcesTable).values({
        providerId,
        sourceId,
        sourceLabel: item.source,
        sourceUrl: item.sourceUrl || candidate.sourceUrl || null,
        trustTier,
        externalId,
        rawData: { matchReason: candidate.matchReason, coordinateSource: candidate.coordinateSource },
        fetchedAt: item.observedAt ? new Date(item.observedAt) : new Date(),
      });
    } else {
      await db.update(providerSourcesTable).set({ fetchedAt: new Date(), sourceUrl: item.sourceUrl || existing[0].sourceUrl }).where(eq(providerSourcesTable.id, existing[0].id));
    }
  }
}

async function upsertEvidence(db: ReturnType<typeof getDb>, providerId: number, candidate: ProviderCandidate) {
  for (const evidence of candidate.evidence) {
    if (!evidence.serviceDetected) continue;
    const existing = await db.select().from(providerEvidenceTable)
      .where(and(eq(providerEvidenceTable.providerId, providerId), eq(providerEvidenceTable.serviceDetected, evidence.serviceDetected), eq(providerEvidenceTable.source, evidence.source)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(providerEvidenceTable).values({
        providerId,
        serviceDetected: evidence.serviceDetected,
        evidenceUrl: evidence.evidenceUrl || null,
        evidenceTextSnippet: evidence.evidenceTextSnippet || null,
        confidence: evidence.confidence,
        source: evidence.source,
      });
    }
  }
}

export async function cacheGeocode(query: string, lat: number | null, lng: number | null, provider: string, success: boolean): Promise<void> {
  const db = getDb();
  const queryNormalized = query.toLowerCase().trim();
  try { await db.insert(geocodeCacheTable).values({ queryNormalized, lat, lng, provider, success }).onConflictDoNothing(); } catch {}
}

export async function getCachedGeocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const db = getDb();
  const queryNormalized = query.toLowerCase().trim();
  try {
    const rows = await db.select().from(geocodeCacheTable)
      .where(and(eq(geocodeCacheTable.queryNormalized, queryNormalized), eq(geocodeCacheTable.success, true)))
      .limit(1);
    if (rows.length > 0 && rows[0].lat != null && rows[0].lng != null) return { lat: rows[0].lat, lng: rows[0].lng };
    return null;
  } catch { return null; }
}