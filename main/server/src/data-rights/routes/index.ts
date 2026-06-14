import { Router } from "express";
import userDataRouter from "./user-data.js";
import clanExportRouter from "./clan-export.js";
import identificationRouter from "./identification/index.js";
import streamsRouter from "./streams.js";
import accessRouter from "./access.js";

const router = Router();
router.use(userDataRouter);
router.use(clanExportRouter);
router.use(identificationRouter);
router.use(streamsRouter);
router.use(accessRouter);

export default router;
