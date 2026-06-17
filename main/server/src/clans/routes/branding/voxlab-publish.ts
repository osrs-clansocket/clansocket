import { ERROR_CLAN_NOT_FOUND } from "../../../shared/error-reasons.js";
import { HTTP_BAD_REQUEST, HTTP_NOT_FOUND } from "../../../shared/http/http-status.js";
import logger from "@clansocket/logger";
import { Router, type Request, type Response } from "express";
import multer from "multer";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ClanAuditActions, DB_NAMES, getDb, recordClanAudit } from "../../../database/index.js";
import { ensureClanDirAbsolute } from "../../../database/core/database.js";
import { requireSiteAccount } from "../../../auth/site-middleware.js";
import { loadOwnedClan } from "../../load-owned-clan.js";
import { removeExistingIcons } from "../../icon/filesystem.js";

const VOXLAB_THUMBNAIL_MAX_BYTES = 5 * 1024 * 1024;
// Mesh JSON for a 64-resolution voxelized logo can easily reach 10–20 MB
// (positions + normals + colors + indices as decimal-stringified arrays).
// Cap generously so realistic logos don't trip LIMIT_FIELD_VALUE.
const VOXLAB_ENVELOPE_MAX_BYTES = 50 * 1024 * 1024;

const handleVoxlabUploadMulter = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: VOXLAB_THUMBNAIL_MAX_BYTES, fieldSize: VOXLAB_ENVELOPE_MAX_BYTES },
}).single("thumbnail");

const router: Router = Router();

router.post(
    "/:slug/branding/voxlab-publish",
    requireSiteAccount,
    handleVoxlabUploadMulter,
    async (req: Request, res: Response) => {
        const siteAccountId = req.siteAccountId!;
        const owned = loadOwnedClan(String(req.params.slug ?? "").toLowerCase(), siteAccountId);
        if (!owned) {
            res.status(HTTP_NOT_FOUND).json({ error: ERROR_CLAN_NOT_FOUND });
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
        const thumbnail = req.file;
        if (!thumbnail) {
            res.status(HTTP_BAD_REQUEST).json({ error: "no_thumbnail" });
            return;
        }
        const db = getDb(DB_NAMES.APP);
        const prior = db
            .prepare(`SELECT icon_kind, icon_value, icon_voxlab_record, color FROM clansocket_clans WHERE id = ?`)
            .get(owned.id) as
            | {
                  icon_kind: string | null;
                  icon_value: string | null;
                  icon_voxlab_record: string | null;
                  color: string | null;
              }
            | undefined;
        removeExistingIcons(owned.id);
        const dir = ensureClanDirAbsolute(owned.id);
        const thumbnailPath = resolve(dir, "icon.png");
        try {
            writeFileSync(thumbnailPath, thumbnail.buffer);
        } catch (err) {
            logger.warn?.(`[clans] voxlab thumbnail write failed clanId=${owned.id} err=${String(err)}`);
            res.status(HTTP_BAD_REQUEST).json({ error: "thumbnail_write_failed" });
            return;
        }
        const recordId = `voxlab-${Date.now().toString(36)}`;
        db.prepare(
            `UPDATE clansocket_clans SET icon_kind = 'voxlab', icon_value = ?, icon_voxlab_record = ? WHERE id = ?`,
        ).run(recordId, envelopeRaw, owned.id);
        recordClanAudit(owned.id, {
            actor: siteAccountId,
            action: ClanAuditActions.BrandingUpdated,
            targetId: owned.id,
            payload: {
                before: prior ? { iconKind: prior.icon_kind, iconValue: prior.icon_value, color: prior.color } : null,
                after: { iconKind: "voxlab", iconValue: recordId, color: prior?.color ?? null },
            },
        });
        res.json({ ok: true, iconKind: "voxlab", iconValue: recordId });
    },
);

export default router;
