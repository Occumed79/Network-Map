import { Router, type IRouter } from "express";
import healthRouter from "./health";
import providerSearchRouter from "./providerSearch";
import dentalProviderDiscoveryRouter from "./dentalProviderDiscovery";
import liveFinderRouter from "./liveFinder";
import priceFinderUnifiedRouter from "./priceFinderUnified";
import priceFinderRouter from "./priceFinder";
import searchHistoryRouter from "./searchHistory";
import providerSourcesRouter from "./providerSources";
import providerSourcesImportRouter from "./providerSourcesImport";
import rapidApiStatusRouter from "./rapidApiStatus";
import sourceStatusRouter from "./sourceStatus";

const router: IRouter = Router();

router.use(healthRouter);
router.use(providerSearchRouter);
router.use(dentalProviderDiscoveryRouter);
router.use(liveFinderRouter);
router.use(priceFinderUnifiedRouter);
router.use(priceFinderRouter);
router.use(searchHistoryRouter);
router.use(providerSourcesRouter);
router.use(providerSourcesImportRouter);
router.use('/admin/rapidapi', rapidApiStatusRouter);
router.use(sourceStatusRouter);

export default router;
