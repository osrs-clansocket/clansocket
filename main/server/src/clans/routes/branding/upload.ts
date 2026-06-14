import { ERROR_CLAN_NOT_FOUND } from "../../../shared/error-reasons.js";
import { HTTP_BAD_REQUEST, HTTP_NOT_FOUND } from "../../../shared/http/http-status.js";
import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ClanAuditActions, DB_NAMES, getDb, recordClanAudit } from "../../../database/index.js";
import { ensureClanDirAbsolute } from "../../../database/core/database.js";
import { requireSiteAccount } from "../../../auth/site-middleware.js";
import { loadOwnedClan } from "../../load-owned-clan.js";
import { removeExistingIcons } from "../../icon/filesystem.js";
import { ICON_MIME_EXT, handleIconUploadMulter } from "../../icon/upload-middleware.js";
import { normalizeUploadedIcon } from "../../icon/normalize.js";

const router: Router = Router();

router.post(
    "/:slug/branding/upload",
    requireSiteAccount,
    handleIconUploadMulter,
    async (req: Request, res: Response) => {
        const siteAccountId = req.siteAccountId!;
        const owned = loadOwnedClan(String(req.params.slug ?? "").toLowerCase(), siteAccountId);
        if (!owned) {
            res.status(HTTP_NOT_FOUND).json({ error: ERROR_CLAN_NOT_FOUND });
            return;
        }
        const file = req.file;
        if (!file) {
            res.status(HTTP_BAD_REQUEST).json({ error: "no_file" });
            return;
        }
        const ext = ICON_MIME_EXT[file.mimetype];
        if (!ext) {
            res.status(HTTP_BAD_REQUEST).json({ error: "bad_mime", mime: file.mimetype });
            return;
        }
        let storedBuffer: Buffer;
        try {
            storedBuffer = await normalizeUploadedIcon(file.buffer, ext);
        } catch (err) {
            logger.warn?.(
                `[clans] icon upload normalize failed clanId=${owned.id} mime=${file.mimetype} err=${String(err)}`,
            );
            res.status(HTTP_BAD_REQUEST).json({ error: "process_failed" });
            return;
        }
        const db = getDb(DB_NAMES.APP);
        const prior = db
            .prepare(`SELECT icon_kind, icon_value, color FROM clansocket_clans WHERE id = ?`)
            .get(owned.id) as { icon_kind: string | null; icon_value: string | null; color: string | null } | undefined;
        removeExistingIcons(owned.id);
        const dir = ensureClanDirAbsolute(owned.id);
        const path = resolve(dir, `icon${ext}`);
        writeFileSync(path, storedBuffer);
        db.prepare(`UPDATE clansocket_clans SET icon_kind = 'image', icon_value = ? WHERE id = ?`).run(
            ext.slice(1),
            owned.id,
        );
        recordClanAudit(owned.id, {
            actor: siteAccountId,
            action: ClanAuditActions.BrandingUpdated,
            targetId: owned.id,
            payload: {
                before: prior ? { iconKind: prior.icon_kind, iconValue: prior.icon_value, color: prior.color } : null,
                after: { iconKind: "image", iconValue: ext.slice(1), color: prior?.color ?? null },
            },
        });
        res.json({ ok: true, iconKind: "image", iconValue: ext.slice(1) });
    },
);

export default router;
