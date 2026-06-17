import { Router } from "express";
import auditRead from "./audit-read.js";
import auditWrite from "./audit-write.js";
import pluginConfigRoutes from "./plugin-config-routes.js";
import quickRoutes from "./quick-routes.js";
import seoRoutes from "./seo-routes.js";

const router: Router = Router();
router.use(quickRoutes);
router.use(auditRead);
router.use(auditWrite);
router.use(pluginConfigRoutes);
router.use(seoRoutes);

export default router;
