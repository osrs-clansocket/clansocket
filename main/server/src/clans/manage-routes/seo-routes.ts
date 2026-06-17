import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { HTTP_BAD_REQUEST, HTTP_INTERNAL_ERROR, HTTP_TOO_MANY_REQUESTS } from "../../shared/http/http-status.js";
import {
    getClanSeoById,
    recordClanAudit,
    updateClanSeo,
    type ClanSeoPatch,
    type ClanSeoRow,
} from "../../database/index.js";
import { requireSiteAccount } from "../../auth/site-middleware.js";
import { ClanAuditActions } from "../../database/clans/audit/clan-audit-actions.js";
import { MS_PER_MINUTE, MS_PER_SECOND } from "../../shared/time.js";
import { resolveManager } from "./manager-context.js";

const router: Router = Router();

const MAX_TITLE_LEN = 80;
const MAX_DESCRIPTION_LEN = 300;
const MAX_URL_LEN = 500;
const PUBLIC_FLIP_COOLDOWN_MINUTES = 5;
const PUBLIC_FLIP_COOLDOWN_MS = PUBLIC_FLIP_COOLDOWN_MINUTES * MS_PER_MINUTE;

function trimToNull(raw: unknown, max: number): string | null | undefined {
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    if (typeof raw !== "string") return undefined;
    const trimmed = raw.trim();
    if (trimmed.length === 0) return null;
    if (trimmed.length > max) return undefined;
    return trimmed;
}

function parseBool(raw: unknown): boolean | undefined {
    if (raw === undefined) return undefined;
    if (typeof raw === "boolean") return raw;
    return undefined;
}

function buildPatch(body: Record<string, unknown>): ClanSeoPatch | null {
    const title = trimToNull(body.title, MAX_TITLE_LEN);
    const description = trimToNull(body.description, MAX_DESCRIPTION_LEN);
    const image = trimToNull(body.image, MAX_URL_LEN);
    const isPublic = parseBool(body.isPublic);
    if (title === undefined && description === undefined && image === undefined && isPublic === undefined) {
        return null;
    }
    const patch: ClanSeoPatch = {};
    if (title !== undefined) patch.title = title;
    if (description !== undefined) patch.description = description;
    if (image !== undefined) patch.image = image;
    if (isPublic !== undefined) patch.isPublic = isPublic;
    return patch;
}

function projectManagerSeo(row: ClanSeoRow): Record<string, unknown> {
    return {
        title: row.seo_title,
        description: row.seo_description,
        image: row.seo_image,
        isPublic: row.is_public === 1,
        displayName: row.display_name,
        publicToggledAt: row.public_toggled_at,
    };
}

function publicFlipCooldownRemainingMs(row: ClanSeoRow, patch: ClanSeoPatch, nowMs: number): number {
    if (patch.isPublic === undefined) return 0;
    if (patch.isPublic === (row.is_public === 1)) return 0;
    if (row.public_toggled_at === null) return 0;
    const elapsed = nowMs - row.public_toggled_at;
    return elapsed >= PUBLIC_FLIP_COOLDOWN_MS ? 0 : PUBLIC_FLIP_COOLDOWN_MS - elapsed;
}

router.get("/:slug/manage/seo", requireSiteAccount, (req: Request, res: Response) => {
    const ctx = resolveManager(req, res);
    if (ctx === null) return;
    const row = getClanSeoById(ctx.clanId);
    if (row === null) {
        res.status(HTTP_BAD_REQUEST).json({ error: "clan_missing" });
        return;
    }
    res.json(projectManagerSeo(row));
});

router.patch("/:slug/manage/seo", requireSiteAccount, (req: Request, res: Response) => {
    const ctx = resolveManager(req, res);
    if (ctx === null) return;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const patch = buildPatch(body);
    if (patch === null) {
        res.status(HTTP_BAD_REQUEST).json({ error: "empty_patch" });
        return;
    }
    const current = getClanSeoById(ctx.clanId);
    if (current === null) {
        res.status(HTTP_BAD_REQUEST).json({ error: "clan_missing" });
        return;
    }
    const nowMs = Date.now();
    const cooldownMs = publicFlipCooldownRemainingMs(current, patch, nowMs);
    if (cooldownMs > 0) {
        res.status(HTTP_TOO_MANY_REQUESTS).json({
            error: "public_flip_cooldown",
            retryAfterSeconds: Math.ceil(cooldownMs / MS_PER_SECOND),
        });
        return;
    }
    try {
        const isPublicFlip = patch.isPublic !== undefined && patch.isPublic !== (current.is_public === 1);
        updateClanSeo(ctx.clanId, patch, isPublicFlip ? nowMs : undefined);
        recordClanAudit(ctx.clanId, {
            actor: ctx.siteAccountId,
            action: ClanAuditActions.SeoUpdated,
            targetId: ctx.clanId,
            payload: { fields: Object.keys(patch) },
        });
        const row = getClanSeoById(ctx.clanId);
        if (row === null) {
            res.status(HTTP_INTERNAL_ERROR).json({ error: "post_update_read_failed" });
            return;
        }
        res.json(projectManagerSeo(row));
    } catch (err) {
        logger.error(`[clansocket_manage] seo update failed for ${ctx.clanId}: ${(err as Error).message}`);
        res.status(HTTP_INTERNAL_ERROR).json({ error: "seo_update_failed" });
    }
});

export default router;
