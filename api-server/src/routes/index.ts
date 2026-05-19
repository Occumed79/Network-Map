import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dentalProviderDiscoveryRouter from "./dentalProviderDiscovery";
import priceFinderRouter from "./priceFinder";
import searchHistoryRouter from "./searchHistory";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dentalProviderDiscoveryRouter);
router.use(priceFinderRouter);
router.use(searchHistoryRouter);

export default router;
