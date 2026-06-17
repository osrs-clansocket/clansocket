import { DB_NAMES, getDb } from "../../core/database.js";
import { insertNotification } from "../../../notifications/helpers.js";
import { broadcastIdentityUpdate } from "../../../data-rights/streams/identity-stream.js";
import {
    RSN_DISPLACED_CLEANUP_DAYS,
    type RsnSource,
    findRsnHolder,
    getAccountRsn,
    placeholderFromHash,
    pruneStaleAccountRsns,
} from "./state.js";
import { canonicalRsn } from "./canonicalize.js";
import { propagateRsnChange } from "./propagate.js";

function notifyDisplaced(displacedAccountHash: string, takenRsn: string): void {
    const db = getDb(DB_NAMES.APP);
    const bindings = db
        .prepare(
            `SELECT site_account_id FROM clansocket_account_bindings
             WHERE account_hash = ? AND revoked_at IS NULL`,
        )
        .all(displacedAccountHash) as { site_account_id: string }[];
    for (const { site_account_id } of bindings) {
        insertNotification({
            siteAccountId: site_account_id,
            kind: "rsn_displaced",
            title: "Your RSN was reassigned",
            body: `Someone else now holds '${takenRsn}'. Log into RuneLite with the ClanSocket plugin enabled to link your current RSN. Without action within ${RSN_DISPLACED_CLEANUP_DAYS} days, your account and data get removed.`,
            href: "/account",
        });
        broadcastIdentityUpdate(site_account_id, "displaced");
    }
}

function overwriteDisplacedRow(displacedAccountHash: string, takenRsn: string): void {
    const db = getDb(DB_NAMES.APP);
    const placeholder = placeholderFromHash(displacedAccountHash);
    try {
        db.prepare(`UPDATE clansocket_account_rsns SET rsn = ? WHERE account_hash = ? AND rsn = ?`).run(
            placeholder,
            displacedAccountHash,
            takenRsn,
        );
    } catch {
        db.prepare(`DELETE FROM clansocket_account_rsns WHERE account_hash = ? AND rsn = ?`).run(
            displacedAccountHash,
            takenRsn,
        );
    }
}

function detectAndNotifyDisplaced(rsn: string, incomingHash: string): void {
    const priorHolder = findRsnHolder(rsn);
    if (!priorHolder || priorHolder.account_hash === incomingHash) return;
    notifyDisplaced(priorHolder.account_hash, rsn);
    overwriteDisplacedRow(priorHolder.account_hash, rsn);
}

export function upsertVerifiedRsn(
    accountHash: string,
    rawRsn: string,
    source: RsnSource,
    rank: string | null = null,
): void {
    const rsn = canonicalRsn(rawRsn);
    const db = getDb(DB_NAMES.APP);
    const now = Date.now();
    const existing = getAccountRsn(accountHash);
    detectAndNotifyDisplaced(rsn, accountHash);
    db.prepare(
        `INSERT INTO clansocket_account_rsns
            (account_hash, rsn, source, current_rank, first_seen, last_seen, verified_at)
         VALUES ($accountHash, $rsn, $source, $rank, $now, $now, $now)
         ON CONFLICT (account_hash, rsn) DO UPDATE SET
            source = excluded.source,
            current_rank = COALESCE(excluded.current_rank, current_rank),
            last_seen = excluded.last_seen,
            verified_at = excluded.verified_at`,
    ).run({ accountHash, rsn, source, rank, now });
    const rsnChanged = !existing || existing.rsn !== rsn;
    if (rsnChanged) propagateRsnChange(accountHash, rsn);
    pruneStaleAccountRsns(now);
}
