import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { HTTP_BAD_REQUEST } from "../../shared/http/http-status.js";
import { ingestClientAuditBatch, revertAuditEntry, type ClientAuditEntry } from "../../database/index.js";
import { requireSiteAccount } from "../../auth/site-middleware.js";
import { resolveManager } from "./manager-context.js";
import { MAX_BATCH_ENTRIES, validateClientEntry } from "./validation.js";

const router: Router = Router();

const auditBatchLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
});

router.post("/:slug/manage/audit/:id/revert", requireSiteAccount, (req: Request, res: Response) => {
    const ctx = resolveManager(req, res);
    if (ctx === null) return;
    const auditId = Number.parseInt(String(req.params.id ?? ""), 10);
    if (!Number.isFinite(auditId) || auditId <= 0) {
        res.status(HTTP_BAD_REQUEST).json({ error: "bad_audit_id" });
        return;
    }
    try {
        const result = revertAuditEntry(ctx.clanId, auditId, ctx.siteAccountId);
        if (!result.ok) {
            res.status(HTTP_BAD_REQUEST).json({ error: result.reason ?? "revert_failed" });
            return;
        }
        res.json(result);
    } catch (err) {
        logger.error(`[clansocket_manage] revert failed for ${ctx.clanId}: ${(err as Error).message}`);
        res.status(500).json({ error: "revert_failed" });
    }
});

router.post("/:slug/manage/audit/batch", auditBatchLimiter, requireSiteAccount, (req: Request, res: Response) => {
    const ctx = resolveManager(req, res);
    if (ctx === null) return;
    const body = (req.body ?? {}) as { entries?: unknown };
    if (!Array.isArray(body.entries)) {
        res.status(HTTP_BAD_REQUEST).json({ error: "missing_entries" });
        return;
    }
    if (body.entries.length === 0) {
        res.json({ accepted: 0, ignored: 0 });
        return;
    }
    if (body.entries.length > MAX_BATCH_ENTRIES) {
        res.status(HTTP_BAD_REQUEST).json({ error: "batch_too_large", maxEntries: MAX_BATCH_ENTRIES });
        return;
    }
    const validated: ClientAuditEntry[] = [];
    for (const raw of body.entries) {
        const entry = validateClientEntry(raw);
        if (entry === null) {
            res.status(HTTP_BAD_REQUEST).json({ error: "bad_entry" });
            return;
        }
        validated.push(entry);
    }
    try {
        const result = ingestClientAuditBatch(ctx.clanId, ctx.siteAccountId, validated);
        res.json(result);
    } catch (err) {
        logger.error(`[clansocket_manage] audit batch failed for ${ctx.clanId}: ${(err as Error).message}`);
        res.status(500).json({ error: "audit_batch_failed" });
    }
});

export default router;
