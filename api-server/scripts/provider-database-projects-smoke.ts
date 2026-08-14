import assert from "node:assert/strict";
import {
  closeDatabasePools,
  getDatabaseConfigurationSummary,
  getProviderDatabaseProjects,
} from "@workspace/db";

const original = {
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_URL_POOLED: process.env.DATABASE_URL_POOLED,
  HEALTHSITES_DATABASE_URL: process.env.HEALTHSITES_DATABASE_URL,
  HEALTHSITES_DATABASE_URL_2: process.env.HEALTHSITES_DATABASE_URL_2,
  HEALTHSITES_DATABASE_URL_3: process.env.HEALTHSITES_DATABASE_URL_3,
  USA_EMBASSY_DATABASE_URL: process.env.USA_EMBASSY_DATABASE_URL,
  USA_EMBASSY_DATABASE_URL_2: process.env.USA_EMBASSY_DATABASE_URL_2,
};

try {
  delete process.env.DATABASE_URL_POOLED;
  process.env.DATABASE_URL = "postgresql://primary.invalid/providers";
  process.env.HEALTHSITES_DATABASE_URL = "postgresql://healthsites-1.invalid/providers";
  process.env.HEALTHSITES_DATABASE_URL_2 = process.env.DATABASE_URL;
  process.env.HEALTHSITES_DATABASE_URL_3 = "postgresql://healthsites-3.invalid/providers";
  process.env.USA_EMBASSY_DATABASE_URL = "postgresql://embassy-1.invalid/providers";
  process.env.USA_EMBASSY_DATABASE_URL_2 = process.env.HEALTHSITES_DATABASE_URL;

  const summary = getDatabaseConfigurationSummary();
  assert.deepEqual(summary.providerProjects, [
    "primary",
    "HEALTHSITES_DATABASE_URL",
    "HEALTHSITES_DATABASE_URL_2",
    "HEALTHSITES_DATABASE_URL_3",
    "USA_EMBASSY_DATABASE_URL",
    "USA_EMBASSY_DATABASE_URL_2",
  ]);

  const projects = getProviderDatabaseProjects();
  assert.deepEqual(projects.map((project) => project.id), [
    "provider-project-1",
    "healthsites-project-1",
    "healthsites-project-3",
    "usa-embassy-project-1",
  ]);
  assert.equal(projects[0].primary, true);
  assert.equal(projects[1].environmentVariable, "HEALTHSITES_DATABASE_URL");
  assert.equal(projects[2].family, "healthsites");
  assert.equal(projects[3].family, "usa-embassy");
  assert.ok(projects.every((project) => !String(project).includes("postgresql://")), "project metadata must not expose connection strings");
} finally {
  await closeDatabasePools();
  for (const [name, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

console.log("provider database projects smoke tests passed");
