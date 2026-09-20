const text = (value) => value === null || value === undefined ? "" : String(value).trim();

function parseRscData(raw) {
  for (const line of raw.split(/\r?\n/u)) {
    if (!line.startsWith("1:")) continue;
    try {
      const parsed = JSON.parse(line.slice(2));
      if (parsed && typeof parsed === "object") return parsed;
    } catch (_) {}
  }
  return null;
}

export function findHospitalArrays(value) {
  const candidates = [];
  const emitted = new Set();
  const seen = new Set();

  function looksLikeFacilityArray(candidate) {
    if (!Array.isArray(candidate) || candidate.length === 0) return false;
    const sample = candidate.slice(0, Math.min(candidate.length, 40));
    const facilityLike = sample.filter((item) =>
      item && typeof item === "object"
      && text(item.id)
      && text(item.name)
    ).length;
    return facilityLike >= Math.max(1, Math.ceil(sample.length * 0.8));
  }

  function emit(candidate) {
    if (!emitted.has(candidate) && looksLikeFacilityArray(candidate)) {
      emitted.add(candidate);
      candidates.push(candidate);
    }
  }

  // The current Next.js hydration payload is large and deeply nested, so use
  // an explicit worklist instead of recursion that can exhaust Node's stack.
  const pending = [value];
  while (pending.length) {
    const node = pending.pop();
    if (!node || typeof node !== "object" || seen.has(node)) continue;
    seen.add(node);

    if (Array.isArray(node)) emit(node);
    else if (Array.isArray(node.hospitals)) emit(node.hospitals);

    for (const child of Array.isArray(node) ? node : Object.values(node)) {
      if (child && typeof child === "object" && !seen.has(child)) pending.push(child);
    }
  }

  return candidates.sort((a, b) => b.length - a.length);
}

export function payloadsFromText(raw) {
  const candidates = [];
  try {
    const parsed = JSON.parse(raw);
    candidates.push(...findHospitalArrays(parsed));
  } catch (_) {}

  candidates.push(...findHospitalArrays(parseRscData(raw)));

  const marker = "self.__next_f.push([1,";
  let cursor = 0;
  while (cursor < raw.length) {
    const markerIndex = raw.indexOf(marker, cursor);
    if (markerIndex < 0) break;
    let start = markerIndex + marker.length;
    while (/\s/u.test(raw[start] || "")) start += 1;
    if (raw[start] !== '"') {
      cursor = start + 1;
      continue;
    }
    let end = start + 1;
    let escaped = false;
    for (; end < raw.length; end += 1) {
      const ch = raw[end];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') break;
    }
    if (end >= raw.length) break;
    try {
      const chunk = JSON.parse(raw.slice(start, end + 1));
      candidates.push(...findHospitalArrays(parseRscData(chunk)));
      for (const line of chunk.split(/\r?\n/u)) {
        const colon = line.indexOf(":");
        if (colon < 0) continue;
        try {
          const parsed = JSON.parse(line.slice(colon + 1));
          candidates.push(...findHospitalArrays(parsed));
        } catch (_) {}
      }
    } catch (_) {}
    cursor = end + 1;
  }
  return candidates.sort((a, b) => b.length - a.length);
}

export function uniqueFacilityIds(hospitals) {
  return new Set(hospitals.map((facility) => text(facility?.id)).filter(Boolean)).size;
}

export function expandOrganizationBranches(organizations) {
  if (!Array.isArray(organizations)) return [];
  const expanded = [];
  for (const organization of organizations) {
    if (!organization || typeof organization !== "object") continue;
    const organizationId = text(organization.id);
    const branches = Array.isArray(organization.branches) && organization.branches.length
      ? organization.branches
      : [null];
    for (let index = 0; index < branches.length; index += 1) {
      const branch = branches[index];
      if (!branch || typeof branch !== "object") {
        expanded.push(organization);
        continue;
      }
      expanded.push({
        ...organization,
        ...branch,
        id: text(branch.id) || `${organizationId}:branch:${index + 1}`,
        name: text(branch.name) || text(organization.name),
        organizationId,
        organizationName: text(organization.name),
        legalName: text(branch.legalName) || text(organization.legalName),
      });
    }
  }
  return expanded;
}

export function selectPayload(candidates, reportedTotal) {
  const sorted = candidates
    .filter((candidate) => Array.isArray(candidate?.hospitals) && candidate.hospitals.length > 0)
    .sort((a, b) => b.hospitals.length - a.hospitals.length);
  return sorted.find((candidate) => uniqueFacilityIds(candidate.hospitals) === reportedTotal)
    || sorted.find((candidate) => candidate.hospitals.length <= reportedTotal)
    || sorted[0]
    || null;
}
