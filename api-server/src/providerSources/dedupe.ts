import type { ProviderCandidate, ProviderProvenance } from "./types";

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\b(llc|inc|corp|ltd|pllc|pa|md|do|np|dds|od|dc|pt|phd|aprn)\b/g, "").replace(/\s+/g, " ").trim();
}
function normalizeAddress(address: string): string {
  return address.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\b(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|suite|ste|unit|floor|fl)\b/g, "").replace(/\s+/g, " ").trim();
}
function normalizePhone(phone: string): string { return phone.replace(/\D/g, "").slice(-10); }
function extractDomain(url: string): string { try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } }

function identityKeys(candidate: ProviderCandidate): string[] {
  const keys: string[] = [];
  if (candidate.npi) keys.push(`npi:${candidate.npi.replace(/\D/g, "")}`);
  const name = normalizeName(candidate.name);
  const address = normalizeAddress(candidate.address);
  const phone = normalizePhone(candidate.phone);
  const domain = extractDomain(candidate.website);
  if (name && address) keys.push(`name-address:${name}|${address}`);
  if (name && phone.length >= 7) keys.push(`name-phone:${name}|${phone}`);
  if (name && domain) keys.push(`name-domain:${name}|${domain}`);
  if (candidate.source && candidate.id) keys.push(`source-record:${candidate.source.toLowerCase()}|${candidate.id}`);
  if (!keys.length && name) keys.push(`name-city:${name}|${candidate.city.toLowerCase()}|${candidate.state.toLowerCase()}`);
  return keys;
}

function uniqueProvenance(rows: ProviderProvenance[]): ProviderProvenance[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.source}|${row.sourceRecordId || ""}|${row.sourceUrl || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeGroup(group: ProviderCandidate[]): ProviderCandidate {
  const ranked = [...group].sort((a, b) => b.score - a.score);
  const base = ranked[0];
  const allSources = new Set<string>();
  const allBadges = new Set<string>();
  const allServices = new Set<string>();
  const allEvidence = [] as ProviderCandidate["evidence"];
  const provenance: ProviderProvenance[] = [];

  for (const candidate of group) {
    (candidate._rawSources || [candidate.source]).forEach((source) => allSources.add(source));
    candidate.badges.forEach((badge) => allBadges.add(badge));
    (candidate.services || []).forEach((service) => allServices.add(service));
    provenance.push(...(candidate.provenance || [{
      source: candidate.source,
      sourceRecordId: candidate.id,
      sourceUrl: candidate.sourceUrl,
      observedAt: candidate.lastSeenAt,
    }]));
    for (const evidence of candidate.evidence) {
      if (!allEvidence.some((existing) => existing.evidenceUrl === evidence.evidenceUrl && existing.serviceDetected === evidence.serviceDetected && existing.source === evidence.source)) {
        allEvidence.push(evidence);
      }
    }
  }

  const coordinateCandidate = ranked.find((candidate) => candidate.lat !== undefined && candidate.lng !== undefined);
  return {
    ...base,
    address: ranked.find((candidate) => candidate.address)?.address || base.address,
    city: ranked.find((candidate) => candidate.city)?.city || base.city,
    state: ranked.find((candidate) => candidate.state)?.state || base.state,
    postalCode: ranked.find((candidate) => candidate.postalCode)?.postalCode || base.postalCode,
    country: ranked.find((candidate) => candidate.country)?.country || base.country,
    phone: ranked.find((candidate) => candidate.phone)?.phone || base.phone,
    fax: ranked.find((candidate) => candidate.fax)?.fax || base.fax,
    website: ranked.find((candidate) => candidate.website)?.website || base.website,
    lat: coordinateCandidate?.lat ?? base.lat,
    lng: coordinateCandidate?.lng ?? base.lng,
    coordinateStatus: coordinateCandidate?.coordinateStatus ?? base.coordinateStatus,
    npi: ranked.find((candidate) => candidate.npi)?.npi || base.npi,
    providerCategory: ranked.find((candidate) => candidate.providerCategory)?.providerCategory || base.providerCategory,
    services: Array.from(allServices),
    evidence: allEvidence,
    badges: Array.from(allBadges),
    provenance: uniqueProvenance(provenance),
    _rawSources: Array.from(allSources),
  };
}

/**
 * One authoritative provider deduplication implementation. Candidates are
 * unioned when any strong identity key overlaps (NPI, normalized name/address,
 * normalized name/phone, name/domain, or source record identity).
 */
export function dedupeCandidates(candidates: ProviderCandidate[]): ProviderCandidate[] {
  const groups: ProviderCandidate[][] = [];
  const keyToGroup = new Map<string, number>();

  for (const candidate of candidates) {
    const keys = identityKeys(candidate);
    const matchedGroupIds = Array.from(new Set(keys.map((key) => keyToGroup.get(key)).filter((value): value is number => value !== undefined)));
    let groupId: number;

    if (!matchedGroupIds.length) {
      groupId = groups.length;
      groups.push([candidate]);
    } else {
      groupId = Math.min(...matchedGroupIds);
      groups[groupId].push(candidate);
      for (const duplicateGroupId of matchedGroupIds.filter((id) => id !== groupId)) {
        groups[groupId].push(...groups[duplicateGroupId]);
        groups[duplicateGroupId] = [];
        for (const [key, id] of keyToGroup.entries()) if (id === duplicateGroupId) keyToGroup.set(key, groupId);
      }
    }

    for (const key of keys) keyToGroup.set(key, groupId);
  }

  return groups.filter((group) => group.length > 0).map(mergeGroup);
}
