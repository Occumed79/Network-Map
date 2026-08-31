#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import readline from "node:readline";

const columns = [
  "source_record_id", "source_url", "name", "normalized_name", "address_line1",
  "formatted_address", "city", "state_region", "postal_code", "country_code",
  "lat", "lng", "phone", "website", "email", "primary_provider_type",
  "capability_tags", "quality_score", "master_key",
];

function argument(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? String(process.argv[index + 1] || "") : fallback;
}

const outputPath = argument("output");
if (!outputPath) throw new Error("--output is required");

const text = (value) => value === null || value === undefined ? "" : String(value).trim();
const hash = (value) => createHash("sha256").update(String(value)).digest("hex");

const ufCodes = new Map([
  [11, "RO"], [12, "AC"], [13, "AM"], [14, "RR"], [15, "PA"], [16, "AP"], [17, "TO"],
  [21, "MA"], [22, "PI"], [23, "CE"], [24, "RN"], [25, "PB"], [26, "PE"], [27, "AL"], [28, "SE"], [29, "BA"],
  [31, "MG"], [32, "ES"], [33, "RJ"], [35, "SP"],
  [41, "PR"], [42, "SC"], [43, "RS"],
  [50, "MS"], [51, "MT"], [52, "GO"], [53, "DF"],
]);

function first(row, ...keys) {
  for (const key of keys) {
    const value = text(row?.[key]);
    if (value) return value;
  }
  return "";
}

function normalizedName(value) {
  return text(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = typeof value === "string" ? value.replace(",", ".") : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function truthyFlag(value) {
  const normalized = text(value).toLowerCase();
  return ["1", "s", "sim", "true", "yes", "y"].includes(normalized);
}

function classify(row) {
  const blob = [
    first(row, "nome_fantasia", "nome_razao_social"),
    first(row, "descricao_tipo_unidade", "tipo_unidade", "descricao_natureza_juridica"),
  ].join(" ").toLowerCase();

  const capabilities = new Set();
  const add = (type) => capabilities.add(type);

  if (/odont|dental|dentist/.test(blob)) add("dental");
  if (/farm[aá]c|vacina|imuniza/.test(blob)) add("pharmacy_vaccination");
  if (/laborat|patolog|an[aá]lis|coleta/.test(blob)) add("lab");
  if (/radiolog|imagem|diagn[oó]stic|tomograf|resson|ultrassom|mamograf|raio.?x/.test(blob)) add("imaging");
  if (/sa[uú]de do trabalhador|medicina do trabalho|ocupacional/.test(blob)) add("occupational_health_clinic");
  if (/hospital|pronto.?socorro|emerg[eê]ncia/.test(blob) || truthyFlag(row.estabelecimento_possui_atendimento_hospitalar)) add("hospital");
  if (/cl[ií]nica|centro de sa[uú]de|posto de sa[uú]de|unidade b[aá]sica|consult[oó]rio|policl[ií]nica|ambulat/.test(blob)
      || truthyFlag(row.estabelecimento_faz_atendimento_ambulatorial_sus)) add("general_practitioner");
  if (/cardio|pneumo|orto|neuro|gastro|otorrino|psiquiatr|especializ/.test(blob)) add("specialist");

  if (!capabilities.size) add("unknown");
  const priority = [
    "occupational_health_clinic", "dental", "lab", "imaging", "hospital",
    "pharmacy_vaccination", "general_practitioner", "specialist", "unknown",
  ];
  const primary = priority.find((type) => capabilities.has(type)) || "unknown";
  return { primary, capabilities: [...capabilities] };
}

function postgresArray(values) {
  return `{${values.map((value) => `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`).join(",")}}`;
}

function csvField(value) {
  if (value === null || value === undefined || value === "") return "\\N";
  const encoded = String(value).replace(/[\t\r\n]+/gu, " ").replaceAll('"', '""');
  return `"${encoded}"`;
}

function locationFor(row) {
  const street = first(row, "endereco_estabelecimento", "logradouro", "endereco");
  const number = first(row, "numero_estabelecimento", "numero");
  const complement = first(row, "endereco_complemento_estabelecimento", "complemento_estabelecimento", "complemento");
  const neighborhood = first(row, "bairro_estabelecimento", "bairro");
  const line1 = [street, number].filter(Boolean).join(" ").trim();
  const city = first(row, "nome_municipio", "descricao_municipio", "municipio", "municipio_nome");
  const rawUf = finiteNumber(row.codigo_uf);
  const state = first(row, "sigla_uf", "uf") || (rawUf === null ? "" : ufCodes.get(rawUf) || String(rawUf));
  const postal = first(row, "codigo_cep_estabelecimento", "cep");
  const full = [line1, complement, neighborhood, city, state, postal, "Brazil"].filter(Boolean).join(", ");
  return { line1, city, state, postal, full };
}

function rowFromCnes(row) {
  const cnes = first(row, "codigo_cnes", "cnes");
  if (!cnes) return null;

  const lat = finiteNumber(row.latitude_estabelecimento_decimo_grau ?? row.latitude);
  const lng = finiteNumber(row.longitude_estabelecimento_decimo_grau ?? row.longitude);
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180 || (lat === 0 && lng === 0)) return null;

  const name = first(row, "nome_fantasia", "nome_razao_social", "razao_social");
  if (!name || /^(null|undefined|n\/?a|sem nome)$/iu.test(name)) return null;

  const location = locationFor(row);
  const classification = classify(row);
  const normalized = normalizedName(name);
  const masterKey = `loc:${hash(JSON.stringify({
    name: normalized,
    address: location.full.toLowerCase(),
    country: "BR",
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  }))}`;

  return [
    `cnes:${cnes}`,
    `https://apidadosabertos.saude.gov.br/cnes/estabelecimentos/${encodeURIComponent(cnes)}`,
    name,
    normalized,
    location.line1,
    location.full,
    location.city,
    location.state,
    location.postal,
    "BR",
    lat,
    lng,
    first(row, "numero_telefone_estabelecimento", "telefone"),
    first(row, "website", "url"),
    first(row, "endereco_email_estabelecimento", "email").toLowerCase(),
    classification.primary,
    postgresArray(classification.capabilities),
    location.line1 ? 0.98 : 0.94,
    masterKey,
  ];
}

const append = fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0;
const output = fs.createWriteStream(outputPath, { flags: append ? "a" : "w" });
if (!append) output.write(`${columns.join("\t")}\n`);

let inputRows = 0;
let outputRows = 0;
let rejectedRows = 0;
const lines = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const rawLine of lines) {
  const line = rawLine.trim();
  if (!line) continue;
  inputRows += 1;
  try {
    const row = rowFromCnes(JSON.parse(line));
    if (!row) {
      rejectedRows += 1;
      continue;
    }
    if (!output.write(`${row.map(csvField).join("\t")}\n`)) {
      await new Promise((resolve) => output.once("drain", resolve));
    }
    outputRows += 1;
  } catch {
    rejectedRows += 1;
  }
}

await new Promise((resolve, reject) => output.end((error) => error ? reject(error) : resolve()));
console.log(JSON.stringify({ source: "br_cnes", inputRows, outputRows, rejectedRows, outputPath }));
