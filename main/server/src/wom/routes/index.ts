import { Router } from "express";
import detailsRouter from "./details.js";
import linkRouter from "./link.js";
import reassignLinkerRouter from "./reassign-linker.js";
import revokeRouter from "./revoke.js";
import statusRouter from "./status.js";
import streamRouter from "./stream.js";
import syncNowRouter from "./sync-now.js";
import updateNowRouter from "./update-now.js";
import verifyRouter from "./verify.js";

const router: Router = Router();

router.use("/", verifyRouter);
router.use("/", linkRouter);
router.use("/", revokeRouter);
router.use("/", statusRouter);
router.use("/", streamRouter);
router.use("/", reassignLinkerRouter);
router.use("/", syncNowRouter);
router.use("/", updateNowRouter);
router.use("/", detailsRouter);

export default router;
