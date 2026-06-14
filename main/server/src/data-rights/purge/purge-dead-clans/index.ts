import logger from "@clansocket/logger";
import { DB_NAMES, getDb, listDisplacedReadyForPurge } from "../../../database/index.js";
import { MS_PER_DAY } from "../../../shared/time.js";
import { purgeClanData } from "../purge-clan.js";
import { ownedActiveClansForAccount, purgeUserData } from "../purge-user/index.js";
import { evaluateClan } from "./evaluate.js";
import { loadActiveClansForManager, processPurge, processWarn } from "./process.js";

const UNCLAIMED_THRESHOLD_MS = 7 * MS_PER_DAY;

export function sweepForManager(siteAccountId: string): { warned: number; purged: number } {
    const now = Date.now();
    let warned = 0;
    let purged = 0;
    for (const clan of loadActiveClansForManager(siteAccountId)) {
        const verdict = evaluateClan(clan, now);
        if (verdict === "purge") {
            processPurge(clan);
            purged += 1;
        } else if (verdict === "warn") {
            const n = processWarn(clan, now);
            if (n > 0) warned += n;
        }
    }
    if (warned > 0 || purged > 0) {
        logger.info(`[dead-clan-sweep] manager=${siteAccountId} warned=${warned} purged=${purged}`);
    }
    return { warned, purged };
}

export function sweepStaleUnclaimedRows(): number {
    const cutoff = Date.now() - UNCLAIMED_THRESHOLD_MS;
    const result = getDb(DB_NAMES.APP)
        .prepare(
            `DELETE FROM clansocket_clans
             WHERE status = 'unclaimed' AND archived_at IS NULL AND created_at < ?`,
        )
        .run(cutoff);
    if (result.changes > 0) {
        logger.info(`[dead-clan-sweep] unclaimed_removed=${result.changes}`);
    }
    return result.changes;
}

export function sweepDisplacedAccounts(): number {
    const ready = listDisplacedReadyForPurge();
    let purged = 0;
    for (const row of ready) {
        for (const clan of ownedActiveClansForAccount(row.account_hash)) {
            purgeClanData(clan.id);
        }
        purgeUserData(row.account_hash, row.site_account_id);
        purged += 1;
    }
    if (purged > 0) {
        logger.info(`[dead-clan-sweep] displaced_purged=${purged}`);
    }
    return purged;
}
