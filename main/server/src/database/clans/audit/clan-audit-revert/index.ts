import logger from "@clansocket/logger";
import { getClanAuditDb } from "../../../core/database.js";
import { ClanAuditActions } from "../clan-audit-actions.js";
import { applyBrandingRevert } from "./branding.js";
import { applyClaimTransferredRevert } from "./claim.js";
import { applyManagerGrantedRevert, applyManagerRevokedRevert } from "./manager.js";
import { isRevertable, type RevertResult, type SourceEntry } from "./types.js";
import { applyWhitelistAddedRevert } from "./whitelist.js";

export { REVERTABLE_ACTIONS, isRevertable, type RevertResult } from "./types.js";

export function revertAuditEntry(clanId: string, auditId: number, revertedBySiteAccountId: string): RevertResult {
    const clanDb = getClanAuditDb(clanId);
    const row = clanDb
        .prepare(
            `SELECT id, actor_site_account_id, action, target_id, payload_json
             FROM clan_audit_log WHERE id = ?`,
        )
        .get(auditId) as SourceEntry | undefined;
    if (!row) return { ok: false, reason: "entry_not_found" };
    if (!isRevertable(row.action)) return { ok: false, reason: "action_not_revertable" };

    const payload = row.payload_json === null ? {} : (JSON.parse(row.payload_json) as Record<string, unknown>);
    if (payload.revertsAuditId !== undefined) return { ok: false, reason: "already_a_revert" };

    let cascadeCount = 0;
    if (row.target_id !== null) {
        const counter = clanDb
            .prepare(
                `SELECT COUNT(*) AS n FROM clan_audit_log
                 WHERE target_id = ? AND id > ? AND action = ?`,
            )
            .get(row.target_id, row.id, row.action) as { n: number };
        cascadeCount = counter.n;
    }

    try {
        switch (row.action) {
            case ClanAuditActions.BrandingUpdated:
                applyBrandingRevert(clanId, row, payload, revertedBySiteAccountId);
                break;
            case ClanAuditActions.ManagerGranted:
                applyManagerGrantedRevert(clanId, row, payload, revertedBySiteAccountId);
                break;
            case ClanAuditActions.ManagerRevoked:
                applyManagerRevokedRevert(clanId, row, payload, revertedBySiteAccountId);
                break;
            case ClanAuditActions.ClaimTransferred:
                applyClaimTransferredRevert(clanId, row, payload, revertedBySiteAccountId);
                break;
            case ClanAuditActions.WhitelistAdded:
                applyWhitelistAddedRevert(clanId, row, revertedBySiteAccountId);
                break;
            default:
                return { ok: false, reason: "action_not_revertable" };
        }
    } catch (err) {
        logger.error(`[clansocket_audit] revert failed for ${row.action} id=${row.id}: ${(err as Error).message}`);
        return { ok: false, reason: "revert_failed" };
    }

    const newId = clanDb.prepare("SELECT MAX(id) AS id FROM clan_audit_log").get() as { id: number };
    return { ok: true, newAuditId: newId.id, cascadeCount };
}
