import { insertClanManager, revokeClanManager } from "../../access/clan-manager-helpers.js";
import { ClanAuditActions } from "../clan-audit-actions.js";
import { recordClanAudit } from "../clan-audit-helpers/record.js";
import type { SourceEntry } from "./types.js";

export function applyManagerGrantedRevert(
    clanId: string,
    row: SourceEntry,
    payload: Record<string, unknown>,
    actor: string,
): void {
    const targetSiteAccountId = row.target_id;
    if (!targetSiteAccountId) throw new Error("no_target");
    const priorRole = (payload.priorRole as string | null) ?? null;
    if (priorRole === null) {
        revokeClanManager(targetSiteAccountId, clanId, actor);
    } else {
        insertClanManager(targetSiteAccountId, clanId, priorRole as "owner" | "manager", "owner_self", actor);
    }
    recordClanAudit(clanId, {
        actor,
        action: ClanAuditActions.ManagerRevoked,
        targetId: targetSiteAccountId,
        payload: { priorRole: (payload.role as string | undefined) ?? null, revertsAuditId: row.id },
    });
}

export function applyManagerRevokedRevert(
    clanId: string,
    row: SourceEntry,
    payload: Record<string, unknown>,
    actor: string,
): void {
    const targetSiteAccountId = row.target_id;
    if (!targetSiteAccountId) throw new Error("no_target");
    const priorRole = (payload.priorRole as string | null) ?? "manager";
    insertClanManager(targetSiteAccountId, clanId, priorRole as "owner" | "manager", "owner_self", actor);
    recordClanAudit(clanId, {
        actor,
        action: ClanAuditActions.ManagerGranted,
        targetId: targetSiteAccountId,
        payload: { role: priorRole, grantedVia: "revert", revertsAuditId: row.id },
    });
}
