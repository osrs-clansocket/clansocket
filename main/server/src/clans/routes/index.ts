import { Router } from "express";
import readRouter from "./read/index.js";
import brandingRouter from "./branding/index.js";
import ownershipRouter from "./ownership.js";
import managersRouter from "./managers.js";
import positionsRouter from "./positions.js";
import whitelistRouter from "./whitelist.js";

const router = Router();

router.use(readRouter);
router.use(brandingRouter);
router.use(ownershipRouter);
router.use(managersRouter);
router.use(positionsRouter);
router.use(whitelistRouter);

export default router;
