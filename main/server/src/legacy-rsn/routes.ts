import { Router, type Request, type Response } from "express";
import { HTTP_BAD_REQUEST, HTTP_FORBIDDEN } from "../shared/http/http-status.js";
import { requireSiteAccount } from "../auth/site-middleware.js";
import { claimLegacyRsn, LegacyClaimError, listLegacyRsnsForSiteAccount } from "./helpers.js";

const router = Router();

router.get("/", requireSiteAccount, (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const matches = listLegacyRsnsForSiteAccount(siteAccountId);
    res.json({ matches });
});

router.post("/claim", requireSiteAccount, (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const body = req.body as { clanSlug?: unknown; legacyRsn?: unknown } | undefined;
    const clanSlug = typeof body?.clanSlug === "string" ? body.clanSlug : "";
    const legacyRsn = typeof body?.legacyRsn === "string" ? body.legacyRsn : "";
    if (clanSlug.length === 0 || legacyRsn.length === 0) {
        res.status(HTTP_BAD_REQUEST).json({ error: "missing_fields" });
        return;
    }
    try {
        const result = claimLegacyRsn(siteAccountId, clanSlug, legacyRsn);
        res.json({ ok: true, claimedRows: result.claimedRows });
    } catch (err) {
        if (err instanceof LegacyClaimError) {
            res.status(HTTP_FORBIDDEN).json({ error: err.code, message: err.message });
            return;
        }
        throw err;
    }
});

export default router;
