import { Router, type Request, type Response } from "express";
import { requireSiteAccount } from "../../auth/site-middleware.js";
import { handleBrowse } from "../access/browse.js";
import { handleDelete } from "../access/delete-row.js";

const router = Router();

router.post("/browse", requireSiteAccount, (req: Request, res: Response) => {
    handleBrowse(req, res, req.siteAccountId!);
});

router.post("/delete", requireSiteAccount, (req: Request, res: Response) => {
    handleDelete(req, res, req.siteAccountId!);
});

export default router;
