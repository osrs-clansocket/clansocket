import logger from "@clansocket/logger";
import { getClanDb } from "../../database/core/database.js";
import { ClanAuditActions } from "../../database/clans/audit/clan-audit-actions.js";
import { recordClanAudit } from "../../database/clans/audit/clan-audit-helpers/record.js";
import { getClanWomIdentity } from "../../database/wom/identity/get-clan-wom-identity.js";
import { canonicalRsn } from "../../database/site/rsn/canonicalize.js";
import { propagateRsnChange } from "../../database/site/rsn/propagate.js";
import { upsertVerifiedRsn } from "../../database/site/rsn/upsert.js";
import { buildPlaceholderAccountHash, isPlaceholderAccountHash } from "../builders/placeholder-hash-builder.js";
import type { MappedNameChange } from "../mappers/wom-name-changes-mapper.js";

export interface NameChangeConsumeResult {
    applied: number;
    skipped: number;
}

interface AccountRow {
    account_hash: string;
}

const LOOKUP_SQL = `SELECT account_hash FROM clan_accounts WHERE latest_rsn = ? COLLATE NOCASE LIMIT 1`;

function findHashByRsn(clanId: string, rsn: string): string | null {
    const row = getClanDb(clanId).prepare(LOOKUP_SQL).get(rsn) as AccountRow | undefined;
    return row?.account_hash ?? null;
}

export function consumeWomNameChanges(clanId: string, changes: readonly MappedNameChange[]): NameChangeConsumeResult {
    const identity = getClanWomIdentity(clanId);
    let applied = 0;
    let skipped = 0;
    for (const change of changes) {
        if (change.status !== "approved") {
            skipped += 1;
            continue;
        }
        const realHash = findHashByRsn(clanId, change.oldRsn);
        const hash =
            realHash ??
            (identity ? buildPlaceholderAccountHash(identity.wom_group_id, change.oldRsn.toLowerCase()) : null);
        if (hash === null) {
            skipped += 1;
            continue;
        }
        try {
            const isPlaceholder = isPlaceholderAccountHash(hash);
            if (isPlaceholder) {
                propagateRsnChange(hash, canonicalRsn(change.newRsn));
            } else {
                upsertVerifiedRsn(hash, change.newRsn, "wom");
            }
            recordClanAudit(clanId, {
                actor: "wom-name-change-consumer",
                actorKind: "system",
                action: ClanAuditActions.WomRsnChanged,
                targetId: String(change.womChangeId),
                payload: {
                    from: change.oldRsn,
                    to: change.newRsn,
                    accountHashType: isPlaceholder ? "placeholder" : "real",
                    womChangeId: change.womChangeId,
                },
            });
            applied += 1;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.warn(`[wom-name-change] failed clan=${clanId} ${change.oldRsn}->${change.newRsn}: ${message}`);
            skipped += 1;
        }
    }
    return { applied, skipped };
}
