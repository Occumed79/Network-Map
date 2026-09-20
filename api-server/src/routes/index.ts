import { Router, type IRouter } from "express";
import healthRouter from "./health";
import diagnosticsRouter from "./diagnostics";
import dentalProviderDiscoveryRouter from "./dentalProviderDiscovery";
import liveFinderRouter from "./liveFinder";
import priceFinderUnifiedRouter from "./priceFinderUnified";
import priceFinderRouter from "./priceFinder";
import searchHistoryRouter from "./searchHistory";
import providerSourcesImportRouter from "./providerSourcesImport";
import universalDiscoveryRouter from "./universalDiscovery";
import mapInventoryRouter from "./mapInventory";
import indexingJobsRouter from "./indexingJobs";
import priceDiscoveryRouter from "./priceDiscovery";
import npiCustomSearchRouter from "./npiCustomSearch";
import sourceStatusRouter from "./sourceStatus";
import browserExtractionRouter from "./browserExtraction";
import vectorIndexRouter from "./vectorIndex";
import providerUploadLifecycleRouter from "./providerUploadLifecycle";
import providerDatasetUploadsRouter from "./providerDatasetUploads";
import providerLayersRouter from "./providerLayers";
import providerCategoryLayersRouter from "./providerCategoryLayers";
import internationalRegistryLayersRouter from "./internationalRegistryLayers";
import additionalInternationalRegistryLayersRouter from "./additionalInternationalRegistryLayers";
import moreInternationalRegistryLayersRouter from "./moreInternationalRegistryLayers";
import newZealandHealthFacilitiesRouter from "./newZealandHealthFacilities";
import croatiaHzzoRegistryLayerRouter from "./croatiaHzzoRegistryLayer";
import storedInternationalRegistryLayersRouter from "./storedInternationalRegistryLayers";
import europeLiveRegistryLayersRouter from "./europeLiveRegistryLayers";
import walesGpSitesLayerRouter from "./walesGpSitesLayer";
import cyprusHospitalRegistryLayerRouter from "./cyprusHospitalRegistryLayer";
import europeGiscoHospitalLayersRouter from "./europeGiscoHospitalLayers";
import scotlandNhsHospitalsLayerRouter from "./scotlandNhsHospitalsLayer";
import moldovaHealthInstitutionsLayerRouter from "./moldovaHealthInstitutionsLayer";
import providerUploadCategoriesRouter from "./providerUploadCategories";
import googlePlacesRouter from "./googlePlaces";
import enhancedSearchRouter from "./enhancedSearch";
import providerExplorerRouter from "./providerExplorer";
import nacchoLhdRouter from "./nacchoLhd";
import nacchoRecoveryStatusRouter from "./nacchoRecoveryStatus";
import scoringDatabaseRouter from "./scoringDatabase";
import { stabilizeProviderLayerRequests } from "../middleware/providerLayerContract";
import { normalizeProviderTypeResponses } from "../middleware/normalizeProviderTypes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(diagnosticsRouter);
router.use(scoringDatabaseRouter);

// Authoritative provider architecture takes precedence.
router.use(universalDiscoveryRouter);
router.use(mapInventoryRouter);
router.use(indexingJobsRouter);
router.use(priceDiscoveryRouter);
router.use(npiCustomSearchRouter);
router.use(sourceStatusRouter);
router.use(browserExtractionRouter);
router.use(vectorIndexRouter);
router.use(normalizeProviderTypeResponses);
router.use(providerExplorerRouter);
router.use(nacchoRecoveryStatusRouter);
router.use(nacchoLhdRouter);
// Public national registries are normalized server-side before the generic
// provider-layer stabilizer so the browser never calls foreign APIs directly.
// Source-specific routes must be mounted before the generic
// /international-registry-layers/:source handler.
router.use(walesGpSitesLayerRouter);
router.use(europeLiveRegistryLayersRouter);
router.use(cyprusHospitalRegistryLayerRouter);
router.use(europeGiscoHospitalLayersRouter);
router.use(scotlandNhsHospitalsLayerRouter);
router.use(moldovaHealthInstitutionsLayerRouter);
router.use(croatiaHzzoRegistryLayerRouter);
router.use(additionalInternationalRegistryLayersRouter);
router.use(moreInternationalRegistryLayersRouter);
router.use(newZealandHealthFacilitiesRouter);
router.use(internationalRegistryLayersRouter);
router.use(storedInternationalRegistryLayersRouter);
router.use(stabilizeProviderLayerRequests);

// Provider upload surfaces: transactional preview/commit/rollback lifecycle plus
// the canonical browser/bulk dataset uploader.
router.use(providerUploadLifecycleRouter);
router.use(providerDatasetUploadsRouter);
router.use(providerLayersRouter);
router.use(providerCategoryLayersRouter);
router.use(providerUploadCategoriesRouter);
router.use(googlePlacesRouter);
router.use(enhancedSearchRouter);

// Domain-specific tools delegate provider discovery to the authoritative provider-sources pipeline.
router.use(dentalProviderDiscoveryRouter);
router.use(liveFinderRouter);
router.use(priceFinderUnifiedRouter);
router.use(priceFinderRouter);
router.use(searchHistoryRouter);
router.use(providerSourcesImportRouter);

export default router;
