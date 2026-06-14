import { Router } from "express";
import consentsRouter from "./consents.js";
import createClaimRouter from "./create-claim.js";

const router: Router = Router();
router.use(createClaimRouter);
router.use(consentsRouter);

export default router;
