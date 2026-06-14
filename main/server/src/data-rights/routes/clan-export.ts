import { ERROR_CLAN_NOT_FOUND, ERROR_COOLDOWN, ERROR_EXPORT_FAILED } from "../../shared/error-reasons.js";
import {
    HTTP_FORBIDDEN,
    HTTP_INTERNAL_ERROR,
    HTTP_NOT_FOUND,
    HTTP_TOO_MANY_REQUESTS,
} from "../../shared/http/http-status.js";
import { Router, type Request, type Response } from "express";
import { requireSiteAccount } from "../../auth/site-middleware.js";
import { getClanBySlug, isClanManager } from "../../database/index.js";
import { checkCooldown, recordAction } from "../cooldown.js";
import { collectClanData } from "../collect/collect-clan/index.js";
import { streamZipToResponse } from "../collect/zip-stream.js";
import { ACTION_CLAN_EXPORT } from "../scopes/action-kinds.js";
import { bucketLabel } from "./user-data.js";

const router = Router();

router.get("/clan/:slug/export", requireSiteAccount, async (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const slug = String(req.params.slug ?? "").toLowerCase();
    const clan = getClanBySlug(slug);
    if (!clan || clan.archived_at !== null) {
        res.status(HTTP_NOT_FOUND).json({ error: ERROR_CLAN_NOT_FOUND });
        return;
    }
    if (!isClanManager(siteAccountId, clan.id)) {
        res.status(HTTP_FORBIDDEN).json({ error: "not_manager" });
        return;
    }
    const cooldown = checkCooldown(siteAccountId, ACTION_CLAN_EXPORT, clan.id);
    if (!cooldown.ok) {
        res.status(HTTP_TOO_MANY_REQUESTS).json({
            error: ERROR_COOLDOWN,
            message: `Wait ${bucketLabel(cooldown.retryAfterMs!)} before exporting this clan again.`,
            retryAfterMs: cooldown.retryAfterMs,
        });
        return;
    }
    const collected = collectClanData(clan.id);
    if (!collected) {
        res.status(HTTP_NOT_FOUND).json({ error: ERROR_CLAN_NOT_FOUND });
        return;
    }
    try {
        await streamZipToResponse(collected.entries, res, `clansocket-clan-${clan.slug}.zip`);
        recordAction(siteAccountId, ACTION_CLAN_EXPORT, clan.id);
    } catch (err) {
        if (!res.headersSent) {
            res.status(HTTP_INTERNAL_ERROR).json({ error: ERROR_EXPORT_FAILED, message: (err as Error).message });
        }
    }
});

export default router;
