/**
 * Provider search adapter — thin re-export for backwards compatibility.
 * All logic now lives in api-server/src/services/rapidApi/index.ts.
 */
export type { ProviderSearchParams as RapidApiProviderSearchParams, RapidApiProviderResult } from "../index";
export { searchProviders } from "../index";

/** Legacy type alias kept so existing import sites don't break. */
export interface RapidApiProviderSearchResult {
  providers: import("../index").RapidApiProviderResult[];
  debug: { succeeded?: string; failed: string[] };
}
