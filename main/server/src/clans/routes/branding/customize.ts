import { ERROR_CLAN_NOT_FOUND } from "../../../shared/error-reasons.js";
import { HTTP_BAD_REQUEST, HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND } from "../../../shared/http/http-status.js";
import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ClanAuditActions, recordClanAudit } from "../../../database/index.js";
import { ensureClanDirAbsolute } from "../../../database/core/database.js";
import { requireSiteAccount } from "../../../auth/site-middleware.js";
import { loadOwnedClan } from "../../load-owned-clan.js";
import { findPristineIconPath, removeCustomizedIcon, writeTransformSidecar } from "../../icon/filesystem.js";
import { SHARP_READABLE_EXTS, bakeCustomizedIcon } from "../../icon/bake.js";
import { parseTransform } from "../../icon/transform.js";

const router: Router = Router();

router.post("/:slug/branding/customize", requireSiteAccount, async (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const owned = loadOwnedClan(String(req.params.slug ?? "").toLowerCase(), siteAccountId);
    if (!owned) {
        res.status(HTTP_NOT_FOUND).json({ error: ERROR_CLAN_NOT_FOUND });
        return;
    }
    const transform = parseTransform(req.body);
    if (!transform) {
        res.status(HTTP_BAD_REQUEST).json({ error: "bad_transform" });
        return;
    }
    const pristine = findPristineIconPath(owned.id);
    if (!pristine) {
        res.status(HTTP_BAD_REQUEST).json({ error: "no_pristine_icon" });
        return;
    }
    if (!SHARP_READABLE_EXTS.has(pristine.ext)) {
        res.status(HTTP_BAD_REQUEST).json({ error: "source_not_tweakable", sourceExt: pristine.ext });
        return;
    }
    try {
        const pristineBuffer = readFileSync(pristine.path);
        const sourceExt = pristine.ext;
        const outFormat: "webp" | "png" = sourceExt === ".webp" ? "webp" : "png";
        const outExt: ".webp" | ".png" = outFormat === "webp" ? ".webp" : ".png";
        const baked = await bakeCustomizedIcon(pristineBuffer, transform, outFormat);
        removeCustomizedIcon(owned.id);
        const dir = ensureClanDirAbsolute(owned.id);
        const outPath = resolve(dir, `icon-customized${outExt}`);
        writeFileSync(outPath, baked);
        writeTransformSidecar(owned.id, transform);
        recordClanAudit(owned.id, {
            actor: siteAccountId,
            action: ClanAuditActions.BrandingCustomized,
            targetId: owned.id,
            payload: { customized: { ext: outExt.slice(1), transform } },
        });
        res.json({ ok: true, iconKind: "image", customized: true, imageVersion: Date.now(), transform });
    } catch (err) {
        const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
        logger.warn?.(
            `[clans] icon customize failed clanId=${owned.id} sourceExt=${pristine.ext} transform=${JSON.stringify(transform)} err=${message}`,
        );
        res.status(HTTP_INTERNAL_ERROR).json({ error: "bake_failed", detail: message });
    }
});

router.post("/:slug/branding/customize/clear", requireSiteAccount, (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const owned = loadOwnedClan(String(req.params.slug ?? "").toLowerCase(), siteAccountId);
    if (!owned) {
        res.status(HTTP_NOT_FOUND).json({ error: ERROR_CLAN_NOT_FOUND });
        return;
    }
    removeCustomizedIcon(owned.id);
    recordClanAudit(owned.id, {
        actor: siteAccountId,
        action: ClanAuditActions.BrandingCustomized,
        targetId: owned.id,
        payload: { customized: { cleared: true } },
    });
    res.json({ ok: true, customized: false, imageVersion: Date.now() });
});

export default router;
