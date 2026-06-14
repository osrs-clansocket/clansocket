import { Router, type Request, type Response } from "express";
import { requireSiteAccount } from "../../../auth/site-middleware.js";
import { listManagedClans } from "../../read-managed.js";

const router: Router = Router();

router.get("/me", requireSiteAccount, (req: Request, res: Response) => {
    res.json({ clans: listManagedClans(req.siteAccountId!) });
});

export default router;
