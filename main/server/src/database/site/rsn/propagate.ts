import { DB_NAMES, getClanDb, getClanPluginDb, getDb, listClanPluginModes } from "../../core/database.js";
import { CLAN_SATURATED, CLANSOCKET_SATURATED, PLUGIN_SATURATED } from "../../plugin/saturated-tables.js";

interface ActiveClanIdRow {
    id: string;
}

function listActiveClanIds(): string[] {
    return (
        getDb(DB_NAMES.APP)
            .prepare(`SELECT id FROM clansocket_clans WHERE status = 'active' AND archived_at IS NULL`)
            .all() as ActiveClanIdRow[]
    ).map((r) => r.id);
}

function sweepClansocketForHash(accountHash: string, newRsn: string): void {
    const db = getDb(DB_NAMES.APP);
    db.transaction(() => {
        for (const { table, rsnColumn, hashColumn } of CLANSOCKET_SATURATED) {
            db.prepare(`UPDATE ${table} SET ${rsnColumn} = ? WHERE ${hashColumn} = ?`).run(newRsn, accountHash);
        }
    })();
}

function sweepClanDbsForHash(accountHash: string, newRsn: string): void {
    for (const clanId of listActiveClanIds()) {
        const clanDb = getClanDb(clanId);
        clanDb.transaction(() => {
            for (const { table, rsnColumn, hashColumn } of CLAN_SATURATED) {
                clanDb.prepare(`UPDATE ${table} SET ${rsnColumn} = ? WHERE ${hashColumn} = ?`).run(newRsn, accountHash);
            }
        })();
        for (const mode of listClanPluginModes(clanId)) {
            const pluginDb = getClanPluginDb(clanId, mode);
            pluginDb.transaction(() => {
                for (const { table, rsnColumn, hashColumn } of PLUGIN_SATURATED) {
                    pluginDb
                        .prepare(`UPDATE ${table} SET ${rsnColumn} = ? WHERE ${hashColumn} = ?`)
                        .run(newRsn, accountHash);
                }
            })();
        }
    }
}

export function propagateRsnChange(accountHash: string, newRsn: string): void {
    sweepClansocketForHash(accountHash, newRsn);
    sweepClanDbsForHash(accountHash, newRsn);
}
