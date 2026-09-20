import pg from "pg";
export type ProviderDatabaseProject = {
    slot: number;
    id: string;
    environmentVariable: string;
    family: "primary" | "overpass" | "healthsites" | "usa-embassy";
    primary: boolean;
    pool: pg.Pool;
};
export declare const REGISTRY_DATABASE_CONFIG: {
    readonly "finland-ptv-healthcare": "FINLAND_REGISTRY_DATABASE_URL";
    readonly "argentina-refes": "ARGENTINA_REGISTRY_DATABASE_URL";
    readonly "czechia-nrpzs": "CZECHIA_REGISTRY_DATABASE_URL";
    readonly "brazil-cnes": "BRAZIL_REGISTRY_DATABASE_URL";
    readonly "new-zealand-health-facilities": "NEW_ZEALAND_REGISTRY_DATABASE_URL";
    readonly "taiwan-nlsc-medical": "TAIWAN_REGISTRY_DATABASE_URL";
    readonly "mexico-clues": "MEXICO_REGISTRY_DATABASE_URL";
    readonly "singapore-chas": "SINGAPORE_REGISTRY_DATABASE_URL";
    readonly "lithuania-vaspvt": "LITHUANIA_REGISTRY_DATABASE_URL";
    readonly "latvia-medical-facilities": "LATVIA_REGISTRY_DATABASE_URL";
    readonly "ireland-hse-health-centres": "IRELAND_REGISTRY_DATABASE_URL";
    readonly "colombia-reps": "COLOMBIA_REGISTRY_DATABASE_URL";
    readonly "chile-minsal": "CHILE_REGISTRY_DATABASE_URL";
    readonly "croatia-hzzo-primary-care": "CROATIA_REGISTRY_DATABASE_URL";
    readonly "australia-healthdirect": "AUSTRALIA_REGISTRY_DATABASE_URL";
    readonly "canada-odhf": "CANADA_REGISTRY_DATABASE_URL";
    readonly "germany-klinik-atlas": "GERMANY_REGISTRY_DATABASE_URL";
};
export type RegistryDatabaseId = keyof typeof REGISTRY_DATABASE_CONFIG;
export type RegistryDatabaseProject = {
    id: RegistryDatabaseId;
    environmentVariable: (typeof REGISTRY_DATABASE_CONFIG)[RegistryDatabaseId];
    pool: pg.Pool;
};
/**
 * DATABASE_URL_POOLED: preferred pooled/provider-map connection string.
 * DATABASE_URL: provider-map fallback/direct connection string.
 * DATABASE_URL_2: separate scoring/health-indicator database.
 */
export declare function getDatabaseConfigurationSummary(): {
    readonly providerMap: "DATABASE_URL_POOLED" | "DATABASE_URL" | "missing";
    readonly providerProjects: readonly string[];
    readonly scoring: "missing" | "DATABASE_URL_2";
    readonly registryProjects: string[];
    readonly providerPoolMax: number;
    readonly additionalProviderPoolMax: number;
    readonly scoringPoolMax: number;
};
export declare function getRegistryDatabaseProject(id: RegistryDatabaseId): RegistryDatabaseProject | null;
export declare function getPool(): pg.Pool;
/**
 * Returns the provider-map Neon projects in a stable order. Every configured
 * project is expected to contain the same provider schema. Source-specific
 * projects only provide additional storage; they do not change the provider
 * model or API contract.
 *
 * DATABASE_URL(_POOLED) remains the primary application project.
 * OVERPASS_DATABASE_URL and OVERPASS_DATABASE_URL_2 are the two Overture Maps
 * provider shards. HEALTHSITES_DATABASE_URL through _8 and
 * USA_EMBASSY_DATABASE_URL through _4 add their respective provider database
 * projects. DATABASE_URL_2 remains reserved for scoring.
 */
export declare function getProviderDatabaseProjects(): ProviderDatabaseProject[];
export declare function getScoringPool(): pg.Pool;
export declare function getDb(): import("drizzle-orm/node-postgres").NodePgDatabase<Record<string, unknown>> & {
    $client: import("pg").Pool;
};
export declare function checkRequiredDatabases(timeoutMs?: number): Promise<{
    ok: boolean;
    checks: {
        ok: boolean;
        label: string;
        durationMs: number;
        error?: string;
    }[];
    configured: {
        readonly providerMap: "DATABASE_URL_POOLED" | "DATABASE_URL" | "missing";
        readonly providerProjects: readonly string[];
        readonly scoring: "missing" | "DATABASE_URL_2";
        readonly registryProjects: string[];
        readonly providerPoolMax: number;
        readonly additionalProviderPoolMax: number;
        readonly scoringPoolMax: number;
    };
}>;
export declare function getPoolDiagnostics(): {
    providerMap: {
        total: number;
        idle: number;
        waiting: number;
    };
    providerProjects: {
        total: number;
        idle: number;
        waiting: number;
        project: string;
    }[];
    registryProjects: {
        total: number;
        idle: number;
        waiting: number;
        project: string;
    }[];
    scoring: {
        total: number;
        idle: number;
        waiting: number;
    };
};
export declare function closeDatabasePools(): Promise<void>;
export type { PoolClient } from "pg";
export * from "./schema";
//# sourceMappingURL=index.d.ts.map