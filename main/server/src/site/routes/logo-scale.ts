import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { HTTP_BAD_REQUEST, HTTP_FORBIDDEN } from "../../shared/http/http-status.js";
import { requireSiteAccount } from "../../auth/site-middleware.js";
import { isSiteOwner } from "../site-owner.js";
import { readSiteLogoScale, writeSiteLogoScale } from "../site-asset-storage.js";

const DEFAULT_SCALE = 1;
const MIN_SCALE = 0.1;
const MAX_SCALE = 10;

const router: Router = Router();

router.get("/logo-scale", (_req: Request, res: Response) => {
    const scale = readSiteLogoScale() ?? DEFAULT_SCALE;
    res.setHeader("Cache-Control", "public, max-age=30");
    res.json({ scale });
});

router.post("/logo-scale", requireSiteAccount, (req: Request, res: Response) => {
    if (!isSiteOwner(req.siteAccountId)) {
        res.status(HTTP_FORBIDDEN).json({ error: "not_owner" });
        return;
    }
    const body = req.body as { scale?: unknown };
    const scale = body?.scale;
    if (typeof scale !== "number" || !Number.isFinite(scale) || scale < MIN_SCALE || scale > MAX_SCALE) {
        res.status(HTTP_BAD_REQUEST).json({ error: "bad_scale" });
        return;
    }
    try {
        writeSiteLogoScale(scale);
    } catch (err) {
        logger.warn?.(`[site] logo-scale write failed err=${String(err)}`);
        res.status(HTTP_BAD_REQUEST).json({ error: "write_failed" });
        return;
    }
    res.json({ ok: true, scale });
});

export default router;
