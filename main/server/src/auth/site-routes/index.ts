import { Router } from "express";
import providersRouter from "./providers/index.js";
import profileRouter from "./profile.js";
import claimsRouter from "./claims/index.js";
import peopleRouter from "./people.js";

const router = Router();

router.use(providersRouter);
router.use(profileRouter);
router.use(claimsRouter);
router.use(peopleRouter);

export default router;
