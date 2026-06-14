import { revokeClanWhitelistEntry } from "../../access/clan-whitelist-helpers.js";
import { ClanAuditActions } from "../clan-audit-actions.js";
import { recordClanAudit } from "../clan-audit-helpers/record.js";
import type { SourceEntry } from "./types.js";

export function applyWhitelistAddedRevert(clanId: string, row: SourceEntry, actor: string): void {
    if (!row.target_id) throw new Error("no_target");
    revokeClanWhitelistEntry(row.target_id, clanId);
    recordClanAudit(clanId, {
        actor,
        action: ClanAuditActions.WhitelistRemoved,
        targetId: row.target_id,
        payload: { revertsAuditId: row.id },
    });
}
