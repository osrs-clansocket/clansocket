import fs from "node:fs";
import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import multer from "multer";
import { HTTP_BAD_REQUEST, HTTP_FORBIDDEN, HTTP_NOT_FOUND } from "../../shared/http/http-status.js";
import { requireSiteAccount } from "../../auth/site-middleware.js";
import { isSiteOwner } from "../site-owner.js";
import { clearSiteEnvelope, siteLogoThumbnailPath, writeSiteThumbnailOnly } from "../site-asset-storage.js";

const SITE_LOGO_MAX_BYTES = 5 * 1024 * 1024;

const handleUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: SITE_LOGO_MAX_BYTES },
}).single("file");

const router: Router = Router();

router.get("/logo", (_req: Request, res: Response) => {
    const p = siteLogoThumbnailPath();
    if (!fs.existsSync(p)) {
        res.status(HTTP_NOT_FOUND).end();
        return;
    }
    res.setHeader("Cache-Control", "public, max-age=60");
    res.sendFile(p);
});

router.post("/logo", requireSiteAccount, handleUpload, (req: Request, res: Response) => {
    if (!isSiteOwner(req.siteAccountId)) {
        res.status(HTTP_FORBIDDEN).json({ error: "not_owner" });
        return;
    }
    const file = req.file;
    if (!file) {
        res.status(HTTP_BAD_REQUEST).json({ error: "no_file" });
        return;
    }
    try {
        writeSiteThumbnailOnly(file.buffer);
        clearSiteEnvelope();
    } catch (err) {
        logger.warn?.(`[site] logo write failed err=${String(err)}`);
        res.status(HTTP_BAD_REQUEST).json({ error: "write_failed" });
        return;
    }
    res.json({ ok: true });
});

export default router;
