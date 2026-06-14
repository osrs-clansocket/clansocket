import { Router, type Request, type Response } from "express";
import { requireSiteAccount } from "../../../auth/site-middleware.js";
import { listUserScopes } from "../../scopes/scopes/index.js";
import rsnRouter from "./rsn-routes.js";

const router: Router = Router();
router.use(rsnRouter);

router.get("/me/scopes", requireSiteAccount, (req: Request, res: Response) => {
    res.json({ scopes: listUserScopes(req.siteAccountId!) });
});

export default router;
