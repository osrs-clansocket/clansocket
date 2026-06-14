import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import {
    listClanAuditEntries,
    recordClanAudit,
    subscribeClanAuditStream,
    verifyClanAuditChain,
    type ClanAuditEntry,
} from "../../database/index.js";
import { requireSiteAccount } from "../../auth/site-middleware.js";
import { resolveManager } from "./manager-context.js";
import { parseIntParam, readActorParam, readKindPrefix } from "./validation.js";

const router: Router = Router();

router.get("/:slug/manage/audit", requireSiteAccount, (req: Request, res: Response) => {
    const ctx = resolveManager(req, res);
    if (ctx === null) return;
    try {
        const before = parseIntParam(req.query.before, Date.now());
        const after = parseIntParam(req.query.after, 0);
        const limit = parseIntParam(req.query.limit, 50);
        const kindPrefix = readKindPrefix(req.query.kindPrefix);
        const kindExclude = readKindPrefix(req.query.kindExclude);
        const actorSiteAccountId = readActorParam(req.query.actor);
        const result = listClanAuditEntries(ctx.clanId, {
            before,
            after,
            limit,
            kindPrefix,
            kindExclude,
            actorSiteAccountId,
        });
        recordClanAudit(ctx.clanId, {
            actor: ctx.siteAccountId,
            action: "server:read.audit_log",
            targetId: ctx.clanId,
            payload: { count: result.entries.length, cursor: { before, limit, kindPrefix } },
        });
        res.json(result);
    } catch (err) {
        logger.error(`[clansocket_manage] audit list failed for ${ctx.clanId}: ${(err as Error).message}`);
        res.status(500).json({ error: "audit_list_failed" });
    }
});

router.get("/:slug/manage/audit/stream", requireSiteAccount, (req: Request, res: Response) => {
    const ctx = resolveManager(req, res);
    if (ctx === null) return;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    res.write(": stream open\n\n");
    const unsubscribe = subscribeClanAuditStream(ctx.clanId, (entry: ClanAuditEntry) => {
        try {
            res.write(`data: ${JSON.stringify(entry)}\n\n`);
        } catch {
            unsubscribe();
        }
    });
    req.on("close", () => unsubscribe());
    req.on("error", () => unsubscribe());
});

router.get("/:slug/manage/audit/verify", requireSiteAccount, (req: Request, res: Response) => {
    const ctx = resolveManager(req, res);
    if (ctx === null) return;
    try {
        const result = verifyClanAuditChain(ctx.clanId);
        res.json(result);
    } catch (err) {
        logger.error(`[clansocket_manage] verify failed for ${ctx.clanId}: ${(err as Error).message}`);
        res.status(500).json({ error: "verify_failed" });
    }
});

export default router;
