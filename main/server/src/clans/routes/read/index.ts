import { Router } from "express";
import iconRouter from "./icon.js";
import iconRecordRouter from "./icon-record.js";
import meRouter from "./me.js";
import searchRouter from "./search.js";
import slugDetailRouter from "./slug-detail.js";

const router: Router = Router();
router.use(searchRouter);
router.use(meRouter);
router.use(slugDetailRouter);
router.use(iconRouter);
router.use(iconRecordRouter);

export default router;
