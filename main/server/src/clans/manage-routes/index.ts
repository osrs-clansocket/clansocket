import { Router } from "express";
import auditRead from "./audit-read.js";
import auditWrite from "./audit-write.js";
import quickRoutes from "./quick-routes.js";

const router: Router = Router();
router.use(quickRoutes);
router.use(auditRead);
router.use(auditWrite);

export default router;
