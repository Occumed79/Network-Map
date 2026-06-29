import { Router, type Request, type Response } from "express";
import { getDb, providersTable, providerLocationsTable, providerContactsTable, providerServicesTable, providerSourcesTable } from "@workspace/db";
import { and, gte, lte, eq, sql, inArray } from "drizzle-orm";
import { isPersistenceConfigured } from "../lib/networkMapPersistence";

const router = Router();

function isUndefinedTableError(error: unknown): boolean {
  const code = (error as { code?: string; cause?: { code?: string } })?.code;
  const causeCode = (error as { cause?: { code?: string } })?.cause?.code;
  return code === "42P01" || causeCode === "42P01";
}

/**
 * GET /api/map-inventory
 * Fetch indexed providers from Neon by map viewport bounds.
 * Query params: north, south, east, west (required), serviceType (optional), trustTier (optional)
 */
router.get("/map-inventory", async (req: Request, res: Response) => {
  try {
    const north = Number(req.query.north);
    const south = Number(req.query.south);
    const east = Number(req.query.east);
    const west = Number(req.query.west);
    const serviceType = req.query.serviceType as string | undefined;
    const trustTier = req.query.trustTier as string | undefined;
    const limit = Math.min(Math.max(Number(req.query.limit) || 500, 1), 2000);

    if (!Number.isFinite(north) || !Number.isFinite(south) || !Number.isFinite(east) || !Number.isFinite(west)) {
      res.status(400).json({ error: "Missing required bounds: north, south, east, west" });
      return;
    }

    if (!isPersistenceConfigured()) {
      res.json({ providers: [], total: 0, note: "Database not configured — no indexed providers available" });
      return;
    }

    const db = getDb();

    // Query provider locations within bounds — only those with verified coordinates
    const conditions = [
      gte(providerLocationsTable.lat, south),
      lte(providerLocationsTable.lat, north),
      gte(providerLocationsTable.lng, west),
      lte(providerLocationsTable.lng, east),
      sql`${providerLocationsTable.coordinateStatus} != 'unverified'`,
    ];

    const locations = await db
      .select({
        locationId: providerLocationsTable.id,
        providerId: providerLocationsTable.providerId,
        address: providerLocationsTable.address,
        city: providerLocationsTable.city,
        state: providerLocationsTable.state,
        postalCode: providerLocationsTable.postalCode,
        lat: providerLocationsTable.lat,
        lng: providerLocationsTable.lng,
        coordinateStatus: providerLocationsTable.coordinateStatus,
        providerName: providersTable.name,
        providerNpi: providersTable.npi,
        providerType: providersTable.providerType,
      })
      .from(providerLocationsTable)
      .innerJoin(providersTable, eq(providerLocationsTable.providerId, providersTable.id))
      .where(and(...conditions))
      .limit(limit);

    if (locations.length === 0) {
      res.json({ providers: [], total: 0 });
      return;
    }

    // Enrich with contacts and services
    const providerIds = [...new Set(locations.map((l) => l.providerId))];
    const contacts = await db.select().from(providerContactsTable)
      .where(inArray(providerContactsTable.providerId, providerIds));
    const services = await db.select().from(providerServicesTable)
      .where(inArray(providerServicesTable.providerId, providerIds));
    const sources = await db.select().from(providerSourcesTable)
      .where(inArray(providerSourcesTable.providerId, providerIds));

    const contactsByProvider = new Map<number, typeof contacts[0][]>();
    for (const c of contacts) {
      if (!contactsByProvider.has(c.providerId)) contactsByProvider.set(c.providerId, []);
      contactsByProvider.get(c.providerId)!.push(c);
    }

    const servicesByProvider = new Map<number, typeof services[0][]>();
    for (const s of services) {
      if (!servicesByProvider.has(s.providerId)) servicesByProvider.set(s.providerId, []);
      servicesByProvider.get(s.providerId)!.push(s);
    }

    const sourcesByProvider = new Map<number, typeof sources[0][]>();
    for (const s of sources) {
      if (!sourcesByProvider.has(s.providerId)) sourcesByProvider.set(s.providerId, []);
      sourcesByProvider.get(s.providerId)!.push(s);
    }

    // Filter by serviceType if specified
    let filteredLocations = locations;
    if (serviceType) {
      const matchingProviderIds = new Set(
        services
          .filter((s) => s.serviceType === serviceType)
          .map((s) => s.providerId),
      );
      filteredLocations = locations.filter((l) => matchingProviderIds.has(l.providerId));
    }

    // Filter by trustTier if specified
    if (trustTier) {
      const matchingProviderIds = new Set(
        sources
          .filter((s) => s.trustTier === trustTier)
          .map((s) => s.providerId),
      );
      filteredLocations = filteredLocations.filter((l) => matchingProviderIds.has(l.providerId));
    }

    const providers = filteredLocations.map((loc) => {
      const pContacts = contactsByProvider.get(loc.providerId) || [];
      const pServices = servicesByProvider.get(loc.providerId) || [];
      const pSources = sourcesByProvider.get(loc.providerId) || [];
      const bestTrust = pSources.reduce((best, s) => {
        const order = { verified: 0, registry: 1, directory: 2, lead: 3 };
        return (order[s.trustTier as keyof typeof order] ?? 3) < (order[best as keyof typeof order] ?? 3) ? s.trustTier : best;
      }, "lead" as string);

      return {
        id: loc.providerId,
        npi: loc.providerNpi,
        name: loc.providerName,
        providerType: loc.providerType,
        address: loc.address,
        city: loc.city,
        state: loc.state,
        postalCode: loc.postalCode,
        lat: loc.lat,
        lng: loc.lng,
        coordinateStatus: loc.coordinateStatus,
        phone: pContacts[0]?.phone || null,
        fax: pContacts[0]?.fax || null,
        website: pContacts[0]?.website || null,
        services: pServices.map((s) => s.serviceType),
        trustTier: bestTrust,
        sources: pSources.map((s) => ({ sourceId: s.sourceId, sourceLabel: s.sourceLabel, trustTier: s.trustTier })),
      };
    });

    res.json({ providers, total: providers.length });
  } catch (e: any) {
    if (isUndefinedTableError(e)) {
      console.warn(
        "[MapInventory] Provider inventory tables are not initialized — returning empty results.",
      );
      res.status(200).json({
        providers: [],
        locations: [],
        items: [],
        total: 0,
        warning: "provider inventory tables are not initialized",
      });
      return;
    }
    console.error("[MapInventory] Error:", e);
    res.status(500).json({ error: e.message || "Internal server error" });
  }
});

export default router;
