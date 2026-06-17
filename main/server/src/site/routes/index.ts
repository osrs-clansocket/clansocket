import { Router } from "express";
import meRouter from "./me.js";
import logoRouter from "./logo.js";
import logoRecordRouter from "./logo-record.js";
import logoScaleRouter from "./logo-scale.js";

const router: Router = Router();
router.use("/", meRouter);
router.use("/", logoRouter);
router.use("/", logoRecordRouter);
router.use("/", logoScaleRouter);

export default router;
