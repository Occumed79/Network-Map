import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { croatiaHzzoCoordinates, parseCroatiaHzzoCoordinate } from "../src/lib/croatiaHzzoCoordinates";
import { normalizePtvCoordinates, unwrapPtvServiceLocationBatch } from "../../scripts/ptv-service-channel.mjs";

assert.equal(parseCroatiaHzzoCoordinate("168.337.154.388", 12, 21), 16.8337154388);
assert.equal(parseCroatiaHzzoCoordinate("458.930.847.567", 41, 48), 45.8930847567);
assert.equal(parseCroatiaHzzoCoordinate("16.8337154388", 12, 21), 16.8337154388);
assert.equal(parseCroatiaHzzoCoordinate("not-a-coordinate", 12, 21), null);

assert.deepEqual(
  croatiaHzzoCoordinates({ M_X: "168.337.154.388", M_Y: "458.930.847.567" }),
  { lng: 16.8337154388, lat: 45.8930847567 },
);
assert.deepEqual(
  croatiaHzzoCoordinates({ M_X: "45.8930847567", M_Y: "16.8337154388" }),
  { lng: 16.8337154388, lat: 45.8930847567 },
);

const wrappedPtvLocation = {
  id: "ptv-location-1",
  serviceChannelType: "ServiceLocation",
  serviceChannelNames: [{ language: "fi", type: "Name", value: "Terveysasema" }],
};
assert.deepEqual(
  unwrapPtvServiceLocationBatch([{ locationChannel: wrappedPtvLocation }]),
  [wrappedPtvLocation],
);
const kuopioCoordinates = normalizePtvCoordinates("6973940.837", "534902.699");
assert.ok(kuopioCoordinates);
assert.ok(kuopioCoordinates.lat > 62.8 && kuopioCoordinates.lat < 63.0);
assert.ok(kuopioCoordinates.lng > 27.5 && kuopioCoordinates.lng < 27.9);
assert.deepEqual(normalizePtvCoordinates("62.892", "27.678"), { lat: 62.892, lng: 27.678 });

for (const relativePath of [
  "../../scripts/promote-staged-government-registry.sql",
  "../../scripts/promote-brazil-cnes.sql",
]) {
  const promotionSql = fs.readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
  assert.doesNotMatch(promotionSql, /\\quit\s+\d/u, `${relativePath} uses unsupported psql \\quit status syntax`);
  assert.match(promotionSql, /SELECT 1 \/ 0;/u, `${relativePath} must hard-fail a rejected promotion`);
}

const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "registry-contract-"));
try {
  const output = path.join(tempDirectory, "cnes.tsv");
  const normalizer = fileURLToPath(new URL("../../scripts/normalize-cnes-jsonl.mjs", import.meta.url));
  const fixture = {
    CO_CNES: "1234567",
    NO_FANTASIA: "Unidade Básica Teste",
    NO_LOGRADOURO: "Rua Saúde",
    NU_ENDERECO: "10",
    NO_BAIRRO: "Centro",
    CO_UF: "35",
    CO_CEP: "01001000",
    NU_LATITUDE: "-23.5505",
    NU_LONGITUDE: "-46.6333",
    NU_TELEFONE: "1130000000",
    NO_EMAIL: "teste@example.gov.br",
    CO_AMBULATORIAL_SUS: "SIM",
  };
  const result = spawnSync(process.execPath, [normalizer, "--output", output], {
    input: `${JSON.stringify(fixture)}\n`,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const rows = fs.readFileSync(output, "utf8").trim().split("\n");
  assert.equal(rows.length, 2);
  assert.match(rows[1], /cnes:1234567/);
  assert.match(rows[1], /-23\.5505/);
  assert.match(rows[1], /-46\.6333/);
} finally {
  fs.rmSync(tempDirectory, { recursive: true, force: true });
}

console.log("International registry response-contract smoke tests passed.");
