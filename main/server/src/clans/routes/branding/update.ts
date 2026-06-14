import { ERROR_CLAN_NOT_FOUND } from "../../../shared/error-reasons.js";
import { HTTP_NOT_FOUND } from "../../../shared/http/http-status.js";
import { Router, type Request, type Response } from "express";
import { ClanAuditActions, DB_NAMES, getDb, recordClanAudit } from "../../../database/index.js";
import { requireSiteAccount } from "../../../auth/site-middleware.js";
import { loadOwnedClan } from "../../load-owned-clan.js";

const router: Router = Router();

router.put("/:slug/branding", requireSiteAccount, (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const owned = loadOwnedClan(String(req.params.slug ?? "").toLowerCase(), siteAccountId);
    if (!owned) {
        res.status(HTTP_NOT_FOUND).json({ error: ERROR_CLAN_NOT_FOUND });
        return;
    }
    const { iconKind, iconValue, color } = (req.body ?? {}) as {
        iconKind?: unknown;
        iconValue?: unknown;
        color?: unknown;
    };
    const kindStr = iconKind === "builtin" || iconKind === "image" ? iconKind : null;
    const valueStr = typeof iconValue === "string" && iconValue.length > 0 ? iconValue.slice(0, 200) : null;
    const colorStr = typeof color === "string" && color.length > 0 ? color.slice(0, 32) : null;
    const db = getDb(DB_NAMES.APP);
    const prior = db.prepare(`SELECT icon_kind, icon_value, color FROM clansocket_clans WHERE id = ?`).get(owned.id) as
        | { icon_kind: string | null; icon_value: string | null; color: string | null }
        | undefined;
    db.prepare(`UPDATE clansocket_clans SET icon_kind = ?, icon_value = ?, color = ? WHERE id = ?`).run(
        kindStr,
        valueStr,
        colorStr,
        owned.id,
    );
    recordClanAudit(owned.id, {
        actor: siteAccountId,
        action: ClanAuditActions.BrandingUpdated,
        targetId: owned.id,
        payload: {
            before: prior ? { iconKind: prior.icon_kind, iconValue: prior.icon_value, color: prior.color } : null,
            after: { iconKind: kindStr, iconValue: valueStr, color: colorStr },
        },
    });
    res.json({ ok: true, iconKind: kindStr, iconValue: valueStr, color: colorStr });
});

export default router;
