#!/usr/bin/env node
import { createWriteStream } from "node:fs";
import { once } from "node:events";

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => {
  if (value.startsWith("--")) pairs.push([value.slice(2), all[index + 1]]);
  return pairs;
}, []));
const source = args.source;
const countryCode = String(args.country || "").toUpperCase();
const output = args.output;
const baseUrl = String(process.env.REGISTRY_API_BASE_URL || "https://network-map-v846.onrender.com").replace(/\/$/, "");
if (!source || !countryCode || !output) throw new Error("--source, --country, and --output are required");

const headers = [
  "source_record_id", "source_url", "name", "normalized_name", "address_line1",
  "formatted_address", "city", "state_region", "postal_code", "country_code",
  "lat", "lng", "phone", "website", "email", "primary_provider_type",
  "capability_tags", "quality_score", "master_key",
];
const stream = createWriteStream(output, { encoding: "utf8" });
const write = async (line) => { if (!stream.write(line)) await once(stream, "drain"); };
const field = (value) => {
  if (value === null || value === undefined || value === "") return "\\N";
  return `"${String(value).replaceAll('"', '""').replaceAll("\r", " ").replaceAll("\n", " ").replaceAll("\t", " ")}"`;
};
const pgArray = (values) => `{${values.map((value) => `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`).join(",")}}`;
const normalize = (value) => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

await write(`${headers.join("\t")}\n`);
const seen = new Set();
let page = 1;
let total = 0;
while (true) {
  const url = `${baseUrl}/api/international-registry-layers/${encodeURIComponent(source)}?limit=5000&page=${page}`;
  const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "Network-Map-registry-sync/1.0" } });
  if (!response.ok) throw new Error(`${source} page ${page} returned HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
  const payload = await response.json();
  const providers = Array.isArray(payload.providers) ? payload.providers : [];
  for (const provider of providers) {
    const rawId = String(provider.source_id || provider.id || "").trim();
    const name = String(provider.name || "").trim();
    const lat = Number(provider.lat);
    const lng = Number(provider.lng);
    if (!rawId || !name || !Number.isFinite(lat) || !Number.isFinite(lng) || seen.has(rawId)) continue;
    seen.add(rawId);
    const type = String(provider.providerType || provider.clinic_type || provider.category || "healthcare_facility");
    const tags = [...new Set((provider.services || provider.categories || provider.types || [type]).map(String).filter(Boolean))];
    const address = provider.address_1 || provider.address || provider.formatted_address || null;
    const formatted = provider.formatted_address || provider.address || provider.address_1 || null;
    const record = [
      rawId,
      provider.source_url || provider.website || null,
      name,
      normalize(name),
      address,
      formatted,
      provider.city || provider.locality || null,
      provider.admin_area || provider.state || provider.administrative_area_level_1 || null,
      provider.postal_code || provider.zip || null,
      countryCode,
      lat,
      lng,
      provider.phone || null,
      provider.website || null,
      provider.email || null,
      type,
      pgArray(tags),
      Number.isFinite(Number(provider.confidence_score)) ? Number(provider.confidence_score) : 0.85,
      `${source}:${rawId}`,
    ];
    await write(`${record.map(field).join("\t")}\n`);
    total += 1;
  }
  if (!payload.hasMore || providers.length === 0) break;
  page += 1;
  if (page > 1000) throw new Error(`${source} exceeded the pagination safety limit`);
}
stream.end();
await once(stream, "finish");
if (total === 0) throw new Error(`${source} returned no usable providers`);
process.stdout.write(`${total}\n`);
