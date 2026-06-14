import { ERROR_CLAN_NOT_FOUND } from "../../shared/error-reasons.js";
import { HTTP_BAD_REQUEST, HTTP_NOT_FOUND } from "../../shared/http/http-status.js";
import { Router, type Request, type Response } from "express";
import { ClanAuditActions, recordClanAudit } from "../../database/index.js";
import {
    addClanWhitelistRank,
    listClanWhitelist,
    revokeClanWhitelistEntry,
} from "../../database/clans/access/clan-whitelist-helpers.js";
import { requireSiteAccount } from "../../auth/site-middleware.js";
import { loadOwnedClan } from "../load-owned-clan.js";

const router = Router();

router.get("/:slug/whitelist", requireSiteAccount, (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const owned = loadOwnedClan(String(req.params.slug ?? "").toLowerCase(), siteAccountId);
    if (!owned) {
        res.status(HTTP_NOT_FOUND).json({ error: ERROR_CLAN_NOT_FOUND });
        return;
    }
    const entries = listClanWhitelist(owned.id).map((e) => ({
        id: e.id,
        kind: e.entry_kind,
        value: e.entry_value,
        label: e.label,
        addedBySiteAccountId: e.added_by_site_account_id,
        addedAt: e.added_at,
    }));
    recordClanAudit(owned.id, {
        actor: siteAccountId,
        action: "server:read.whitelist",
        targetId: owned.id,
        payload: { count: entries.length },
    });
    res.json({ entries });
});

router.post("/:slug/whitelist/rank", requireSiteAccount, (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const owned = loadOwnedClan(String(req.params.slug ?? "").toLowerCase(), siteAccountId);
    if (!owned) {
        res.status(HTTP_NOT_FOUND).json({ error: ERROR_CLAN_NOT_FOUND });
        return;
    }
    const { rank, label } = (req.body ?? {}) as { rank?: unknown; label?: unknown };
    if (typeof rank !== "string" || rank.trim().length === 0) {
        res.status(HTTP_BAD_REQUEST).json({ error: "bad_rank" });
        return;
    }
    const labelStr = typeof label === "string" && label.length > 0 ? label.slice(0, 64) : null;
    const entry = addClanWhitelistRank(owned.id, rank, labelStr, siteAccountId);
    recordClanAudit(owned.id, {
        actor: siteAccountId,
        action: ClanAuditActions.WhitelistAdded,
        targetId: entry.id,
        payload: { kind: entry.entry_kind, value: entry.entry_value, label: entry.label },
    });
    res.json({
        id: entry.id,
        kind: entry.entry_kind,
        value: entry.entry_value,
        label: entry.label,
        addedAt: entry.added_at,
    });
});

router.delete("/:slug/whitelist/:entryId", requireSiteAccount, (req: Request, res: Response) => {
    const siteAccountId = req.siteAccountId!;
    const owned = loadOwnedClan(String(req.params.slug ?? "").toLowerCase(), siteAccountId);
    if (!owned) {
        res.status(HTTP_NOT_FOUND).json({ error: ERROR_CLAN_NOT_FOUND });
        return;
    }
    const entryId = String(req.params.entryId ?? "");
    const ok = revokeClanWhitelistEntry(entryId, owned.id);
    if (!ok) {
        res.status(HTTP_NOT_FOUND).json({ error: "entry_not_found" });
        return;
    }
    recordClanAudit(owned.id, {
        actor: siteAccountId,
        action: ClanAuditActions.WhitelistRemoved,
        targetId: entryId,
        payload: {},
    });
    res.json({ ok: true });
});

export default router;
