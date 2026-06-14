import { DB_NAMES, getDb } from "../../../core/database.js";
import { insertClanManager } from "../../access/clan-manager-helpers.js";
import { bindSiteAccountAccountHash } from "../../../site/site-account-helpers/index.js";
import { lookupVerifiedRsnForHash } from "../../../plugin/plugin-rsn-lookup.js";
import { ClanAuditActions } from "../clan-audit-actions.js";
import { recordClanAudit } from "../clan-audit-helpers/record.js";
import type { SourceEntry } from "./types.js";

export function applyClaimTransferredRevert(
    clanId: string,
    row: SourceEntry,
    payload: Record<string, unknown>,
    actor: string,
): void {
    const previousOwner = payload.previousOwnerSiteAccountId as string | null;
    const newOwner = payload.newOwnerSiteAccountId as string | undefined;
    if (!previousOwner) throw new Error("no_previous_owner");
    const db = getDb(DB_NAMES.APP);
    const ownerHashRow = db
        .prepare(
            `SELECT account_hash FROM clansocket_account_bindings WHERE site_account_id = ? AND revoked_at IS NULL LIMIT 1`,
        )
        .get(previousOwner) as { account_hash: string } | undefined;
    if (!ownerHashRow) throw new Error("no_owner_hash");
    const ownerRsn = lookupVerifiedRsnForHash(ownerHashRow.account_hash);
    db.prepare(
        `UPDATE clansocket_clans SET owner_site_account_id = ?, owner_account_hash = ?, owner_rsn = ?, claimed_at = ? WHERE id = ?`,
    ).run(previousOwner, ownerHashRow.account_hash, ownerRsn, Date.now(), clanId);
    bindSiteAccountAccountHash(previousOwner, ownerHashRow.account_hash);
    insertClanManager(previousOwner, clanId, "owner", "transfer", actor);
    recordClanAudit(clanId, {
        actor,
        action: ClanAuditActions.ClaimTransferred,
        targetId: clanId,
        payload: {
            newOwnerSiteAccountId: previousOwner,
            previousOwnerSiteAccountId: newOwner ?? null,
            revertsAuditId: row.id,
        },
    });
}
