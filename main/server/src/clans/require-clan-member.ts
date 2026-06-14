import type { Request, Response } from "express";
import { ERROR_CLAN_NOT_FOUND } from "../shared/error-reasons.js";
import { HTTP_FORBIDDEN, HTTP_NOT_FOUND } from "../shared/http/http-status.js";
import { getClanBySlug, resolveLiveClanPosture } from "../database/index.js";
import type { ClanPosture } from "../database/index.js";

export interface ClanMemberContext {
    clanId: string;
    slug: string;
    posture: ClanPosture;
}

export function requireClanMember(req: Request, res: Response, siteAccountId: string): ClanMemberContext | null {
    const slug = String(req.params.slug ?? "").toLowerCase();
    const clan = getClanBySlug(slug);
    if (!clan || clan.archived_at) {
        res.status(HTTP_NOT_FOUND).json({ error: ERROR_CLAN_NOT_FOUND });
        return null;
    }
    const posture = resolveLiveClanPosture(siteAccountId, clan.id);
    if (!posture) {
        res.status(HTTP_FORBIDDEN).json({ error: "not_clan_member" });
        return null;
    }
    return { clanId: clan.id, slug: clan.slug, posture };
}

export function withClanMember(
    req: Request,
    res: Response,
    siteAccountId: string,
    fn: (ctx: ClanMemberContext) => void,
): void {
    const ctx = requireClanMember(req, res, siteAccountId);
    if (ctx) fn(ctx);
}
