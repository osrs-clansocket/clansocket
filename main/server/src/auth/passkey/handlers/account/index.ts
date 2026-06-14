import { Router } from "express";
import attachRouter from "./attach.js";
import deviceLinkRouter from "./device-link.js";

const router: Router = Router();
router.use(deviceLinkRouter);
router.use(attachRouter);

export default router;
