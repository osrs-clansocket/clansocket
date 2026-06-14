import { Router } from "express";
import registerRouter from "./register/index.js";
import authenticateRouter from "./authenticate.js";
import accountRouter from "./account/index.js";
import stepUpRouter from "./step-up.js";

const router = Router();
router.use(registerRouter);
router.use(authenticateRouter);
router.use(accountRouter);
router.use(stepUpRouter);

export default router;
