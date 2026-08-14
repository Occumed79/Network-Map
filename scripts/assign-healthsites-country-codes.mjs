#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";

function argument(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? String(process.argv[index + 1] || "") : fallback;
}

const inputPath = path.resolve(argument("input"));
const boundariesPath = path.resolve(argument("boundaries"));
const minimumResolvedRatio = Number(argument("minimum-resolved-ratio", "0.95"));
const minimumBoundaryCount = Number(argument("minimum-boundary-count", "150"));
if (!inputPath || !boundariesPath) throw new Error("--input and --boundaries are required");
if (!Number.isFinite(minimumResolvedRatio) || minimumResolvedRatio < 0 || minimumResolvedRatio > 1) {
  throw new Error("--minimum-resolved-ratio must be between 0 and 1");
}

function decodeField(value) {
  if (value === "\\N") return "";
  if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1).replaceAll('""', '"');
  return value;
}

function encodedField(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function iso2(properties = {}) {
  for (const key of ["ISO_A2_EH", "ISO_A2", "WB_A2", "POSTAL"]) {
    const value = String(properties[key] || "").trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(value)) return value;
  }
  return "";
}

function visitCoordinates(value, callback) {
  if (!Array.isArray(value)) return;
  if (value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]))) {
    callback(Number(value[0]), Number(value[1]));
    return;
  }
  for (const child of value) visitCoordinates(child, callback);
}

function boundsFor(coordinates) {
  const bounds = { minLng: 180, minLat: 90, maxLng: -180, maxLat: -90 };
  visitCoordinates(coordinates, (lng, lat) => {
    bounds.minLng = Math.min(bounds.minLng, lng);
    bounds.minLat = Math.min(bounds.minLat, lat);
    bounds.maxLng = Math.max(bounds.maxLng, lng);
    bounds.maxLat = Math.max(bounds.maxLat, lat);
  });
  return bounds;
}

function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [currentLng, currentLat] = ring[index];
    const [previousLng, previousLat] = ring[previous];
    const crosses = (currentLat > lat) !== (previousLat > lat)
      && lng < (previousLng - currentLng) * (lat - currentLat) / (previousLat - currentLat) + currentLng;
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointInPolygon(lng, lat, polygon) {
  if (!polygon?.length || !pointInRing(lng, lat, polygon[0])) return false;
  return !polygon.slice(1).some((hole) => pointInRing(lng, lat, hole));
}

function contains(feature, lng, lat) {
  const { bounds, geometry } = feature;
  if (lng < bounds.minLng || lng > bounds.maxLng || lat < bounds.minLat || lat > bounds.maxLat) return false;
  if (geometry.type === "Polygon") return pointInPolygon(lng, lat, geometry.coordinates);
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) => pointInPolygon(lng, lat, polygon));
  }
  return false;
}

const boundariesDocument = JSON.parse(await fsPromises.readFile(boundariesPath, "utf8"));
const boundaries = (boundariesDocument.features || [])
  .map((feature) => ({
    code: iso2(feature.properties),
    geometry: feature.geometry,
    bounds: boundsFor(feature.geometry?.coordinates),
  }))
  .filter((feature) => feature.code && ["Polygon", "MultiPolygon"].includes(feature.geometry?.type));
if (boundaries.length < minimumBoundaryCount) throw new Error(`Expected global country boundaries; found ${boundaries.length}`);

const temporaryPath = `${inputPath}.countries-${process.pid}`;
const input = fs.createReadStream(inputPath);
const output = fs.createWriteStream(temporaryPath, { flags: "wx" });
const lines = readline.createInterface({ input, crlfDelay: Infinity });
let indexes;
let total = 0;
let alreadyResolved = 0;
let spatiallyResolved = 0;
let unresolved = 0;

try {
  for await (const line of lines) {
    if (!indexes) {
      const columns = line.split("\t");
      indexes = {
        country: columns.indexOf("country_code"),
        lat: columns.indexOf("lat"),
        lng: columns.indexOf("lng"),
        normalizedName: columns.indexOf("normalized_name"),
        formattedAddress: columns.indexOf("formatted_address"),
        masterKey: columns.indexOf("master_key"),
      };
      if (Object.values(indexes).some((index) => index < 0)) throw new Error("Input header is missing country_code, lat, or lng");
      output.write(`${line}\n`);
      continue;
    }
    if (!line) continue;
    total += 1;
    const fields = line.split("\t");
    const existing = decodeField(fields[indexes.country]).toUpperCase();
    if (/^[A-Z]{2}$/.test(existing) && existing !== "XX") {
      alreadyResolved += 1;
    } else {
      const lat = Number(decodeField(fields[indexes.lat]));
      const lng = Number(decodeField(fields[indexes.lng]));
      const match = boundaries.find((feature) => contains(feature, lng, lat));
      if (match) {
        fields[indexes.country] = encodedField(match.code);
        const normalizedName = decodeField(fields[indexes.normalizedName]);
        const formattedAddress = decodeField(fields[indexes.formattedAddress]);
        fields[indexes.masterKey] = encodedField(`loc:${hash(JSON.stringify({
          name: normalizedName,
          address: formattedAddress.toLowerCase(),
          country: match.code,
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
        }))}`);
        spatiallyResolved += 1;
      } else {
        fields[indexes.country] = encodedField("XX");
        unresolved += 1;
      }
    }
    if (!output.write(`${fields.join("\t")}\n`)) {
      await new Promise((resolve) => output.once("drain", resolve));
    }
  }
  await new Promise((resolve, reject) => output.end((error) => error ? reject(error) : resolve()));
  const resolvedRatio = total ? (alreadyResolved + spatiallyResolved) / total : 0;
  const result = { total, alreadyResolved, spatiallyResolved, unresolved, resolvedRatio };
  console.log(JSON.stringify(result));
  if (resolvedRatio < minimumResolvedRatio) {
    throw new Error(`Only ${(resolvedRatio * 100).toFixed(2)}% of facilities received a country code`);
  }
  await fsPromises.rename(temporaryPath, inputPath);
} catch (error) {
  output.destroy();
  await fsPromises.rm(temporaryPath, { force: true });
  throw error;
}
