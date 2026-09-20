export function unwrapPtvServiceLocationBatch(payload) {
  if (!Array.isArray(payload)) throw new Error("PTV ServiceChannel/list did not return an array");
  return payload
    .map((entry) => entry?.locationChannel || entry?.serviceLocationChannel || entry)
    .filter((channel) => channel && typeof channel === "object");
}
