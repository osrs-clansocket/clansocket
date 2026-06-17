import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import multer from "multer";
import { HTTP_BAD_REQUEST, HTTP_FORBIDDEN } from "../../shared/http/http-status.js";
import { requireSiteAccount } from "../../auth/site-middleware.js";
import { isSiteOwner } from "../site-owner.js";
import { readSiteLogoRecord, writeSiteEnvelopeOnly, writeSiteLogo } from "../site-asset-storage.js";

const SITE_LOGO_THUMBNAIL_MAX_BYTES = 5 * 1024 * 1024;
const SITE_LOGO_ENVELOPE_MAX_BYTES = 50 * 1024 * 1024;

const handleUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: SITE_LOGO_THUMBNAIL_MAX_BYTES, fieldSize: SITE_LOGO_ENVELOPE_MAX_BYTES },
}).single("thumbnail");

const router: Router = Router();

router.get("/logo-record", (_req: Request, res: Response) => {
    const record = readSiteLogoRecord();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=60");
    res.send(record ?? "null");
});

router.post("/logo-record", requireSiteAccount, handleUpload, (req: Request, res: Response) => {
    if (!isSiteOwner(req.siteAccountId)) {
        res.status(HTTP_FORBIDDEN).json({ error: "not_owner" });
        return;
    }
    const envelopeRaw = typeof req.body?.envelope === "string" ? req.body.envelope : "";
    if (envelopeRaw.length === 0) {
        res.status(HTTP_BAD_REQUEST).json({ error: "no_envelope" });
        return;
    }
    try {
        JSON.parse(envelopeRaw);
    } catch {
        res.status(HTTP_BAD_REQUEST).json({ error: "bad_envelope" });
        return;
    }
    try {
        const thumbnail = req.file;
        if (thumbnail) {
            writeSiteLogo(thumbnail.buffer, envelopeRaw);
        } else {
            writeSiteEnvelopeOnly(envelopeRaw);
        }
    } catch (err) {
        logger.warn?.(`[site] logo write failed err=${String(err)}`);
        res.status(HTTP_BAD_REQUEST).json({ error: "write_failed" });
        return;
    }
    res.json({ ok: true });
});

export default router;
