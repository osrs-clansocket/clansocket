import { Router } from "express";
import customizeRouter from "./customize.js";
import updateRouter from "./update.js";
import uploadRouter from "./upload.js";
import voxlabPublishRouter from "./voxlab-publish.js";

const router: Router = Router();
router.use(uploadRouter);
router.use(customizeRouter);
router.use(updateRouter);
router.use(voxlabPublishRouter);

export default router;
