import type { Request, Response } from "express";
import { ERROR_CLAN_NOT_FOUND } from "../../shared/error-reasons.js";
import { HTTP_BAD_REQUEST, HTTP_FORBIDDEN, HTTP_NOT_FOUND } from "../../shared/http/http-status.js";
import { getClanBySlug, recordClanAudit } from "../../database/index.js";
import { isClanManager } from "../../database/clans/access/clan-manager-helpers.js";

export interface ManagerContext {
    clanId: string;
    clanSlug: string;
    siteAccountId: string;
}

export function resolveManager(req: Request, res: Response): ManagerContext | null {
    const slug = String(req.params.slug ?? "").toLowerCase();
    if (slug.length === 0) {
        res.status(HTTP_BAD_REQUEST).json({ error: "bad_slug" });
        return null;
    }
    const siteAccountId = req.siteAccountId;
    if (siteAccountId === undefined) {
        res.status(HTTP_FORBIDDEN).json({ isManager: false });
        return null;
    }
    const clan = getClanBySlug(slug);
    if (!clan || clan.archived_at !== null) {
        res.status(HTTP_NOT_FOUND).json({ error: ERROR_CLAN_NOT_FOUND });
        return null;
    }
    if (!isClanManager(siteAccountId, clan.id)) {
        recordClanAudit(clan.id, {
            actor: siteAccountId,
            action: "server:auth.rejected",
            targetId: clan.id,
            payload: { endpoint: req.path, method: req.method, reason: "not_a_manager" },
        });
        res.status(HTTP_FORBIDDEN).json({ isManager: false });
        return null;
    }
    return { clanId: clan.id, clanSlug: clan.slug, siteAccountId };
}
