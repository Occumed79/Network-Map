import { Router, type IRouter } from "express";
import healthRouter from "./health";
import providerSearchRouter from "./providerSearch";
import dentalProviderDiscoveryRouter from "./dentalProviderDiscovery";
import priceFinderUnifiedRouter from "./priceFinderUnified";
import priceFinderRouter from "./priceFinder";
import searchHistoryRouter from "./searchHistory";

const router: IRouter = Router();

router.use(healthRouter);
router.use(providerSearchRouter);
router.use(dentalProviderDiscoveryRouter);
router.use(priceFinderUnifiedRouter);
router.use(priceFinderRouter);
router.use(searchHistoryRouter);

export default router;
