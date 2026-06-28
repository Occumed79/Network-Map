import { Router, type IRouter } from "express";
import healthRouter from "./health";
import providerSearchRouter from "./providerSearch";
import dentalProviderDiscoveryRouter from "./dentalProviderDiscovery";
import liveFinderRouter from "./liveFinder";
import priceFinderUnifiedRouter from "./priceFinderUnified";
import priceFinderRouter from "./priceFinder";
import searchHistoryRouter from "./searchHistory";
import providerSourcesImportRouter from "./providerSourcesImport";
// New unified architecture routes
import universalDiscoveryRouter from "./universalDiscovery";
import mapInventoryRouter from "./mapInventory";
import indexingJobsRouter from "./indexingJobs";
import priceDiscoveryRouter from "./priceDiscovery";
import npiCustomSearchRouter from "./npiCustomSearch";
import sourceStatusRouter from "./sourceStatus";

const router: IRouter = Router();

router.use(healthRouter);

// --- New unified architecture (takes precedence) ---
router.use(universalDiscoveryRouter);
router.use(mapInventoryRouter);
router.use(indexingJobsRouter);
router.use(priceDiscoveryRouter);
router.use(npiCustomSearchRouter);
router.use(sourceStatusRouter);

// --- Legacy routes (kept as compatibility wrappers until fully migrated) ---
router.use(providerSearchRouter);
router.use(dentalProviderDiscoveryRouter);
router.use(liveFinderRouter);
router.use(priceFinderUnifiedRouter);
router.use(priceFinderRouter);
router.use(searchHistoryRouter);
router.use(providerSourcesImportRouter);

export default router;
