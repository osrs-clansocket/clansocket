import { getClanAuditDb } from "../../../database/core/database.js";
import { getClanDb, getDiscordGuildDb } from "../../../database/index.js";
import { listDiscordGuildIdsForClan } from "../../discord-guild-iterator.js";
import {
    CLAN_AUDIT_DB_SITE_ACCOUNT_TABLES,
    CLAN_DB_SITE_ACCOUNT_TABLES,
    CLAN_DB_USER_TABLES,
    DISCORD_GUILD_DB_SITE_ACCOUNT_TABLES,
} from "../../scopes/manifest/index.js";
import { deleteOwnedClanMembers, deleteOwnedRosterDiffs, resolveClanWindows } from "../../temporal-correlation.js";
import type { PurgeUserResult } from "./types.js";

export function purgeClanAuditDb(clanId: string, siteAccountId: string, result: PurgeUserResult): boolean {
    let touched = false;
    const auditDb = getClanAuditDb(clanId);
    auditDb.transaction(() => {
        for (const { table, column, action } of CLAN_AUDIT_DB_SITE_ACCOUNT_TABLES) {
            if (action === "null") {
                const r = auditDb
                    .prepare(`UPDATE ${table} SET ${column} = NULL WHERE ${column} = ?`)
                    .run(siteAccountId);
                if (r.changes > 0) {
                    result.clanRowNulls += r.changes;
                    touched = true;
                }
            } else {
                const r = auditDb.prepare(`DELETE FROM ${table} WHERE ${column} = ?`).run(siteAccountId);
                if (r.changes > 0) {
                    result.clanRowNulls += r.changes;
                    touched = true;
                }
            }
        }
    })();
    return touched;
}

export function purgeClanDb(
    clanId: string,
    accountHash: string,
    siteAccountId: string,
    result: PurgeUserResult,
): boolean {
    let touched = false;
    const clanDb = getClanDb(clanId);
    clanDb.transaction(() => {
        for (const { table, column, action } of CLAN_DB_USER_TABLES) {
            if (action === "null") {
                const r = clanDb.prepare(`UPDATE ${table} SET ${column} = NULL WHERE ${column} = ?`).run(accountHash);
                if (r.changes > 0) {
                    result.clanRowNulls += r.changes;
                    touched = true;
                }
            } else {
                const r = clanDb.prepare(`DELETE FROM ${table} WHERE ${column} = ?`).run(accountHash);
                if (r.changes > 0) {
                    result.clanRowNulls += r.changes;
                    touched = true;
                }
            }
        }
        for (const { table, column, action } of CLAN_DB_SITE_ACCOUNT_TABLES) {
            if (action === "null") {
                const r = clanDb.prepare(`UPDATE ${table} SET ${column} = NULL WHERE ${column} = ?`).run(siteAccountId);
                if (r.changes > 0) {
                    result.clanRowNulls += r.changes;
                    touched = true;
                }
            } else {
                const r = clanDb.prepare(`DELETE FROM ${table} WHERE ${column} = ?`).run(siteAccountId);
                if (r.changes > 0) {
                    result.clanRowNulls += r.changes;
                    touched = true;
                }
            }
        }
    })();
    const windows = resolveClanWindows(clanId, [accountHash]);
    if (windows.length > 0) {
        const memberDeletes = deleteOwnedClanMembers(clanId, windows);
        const diffDeletes = deleteOwnedRosterDiffs(clanId, windows);
        if (memberDeletes + diffDeletes > 0) {
            result.clanRowNulls += memberDeletes + diffDeletes;
            touched = true;
        }
    }
    return touched;
}

export function purgeDiscordGuildTables(clanId: string, siteAccountId: string, result: PurgeUserResult): boolean {
    let touched = false;
    for (const guildId of listDiscordGuildIdsForClan(clanId)) {
        const db = getDiscordGuildDb(clanId, guildId);
        db.transaction(() => {
            const draftScope = `session_id IN (SELECT session_id FROM discord_draft_sessions WHERE owner_site_account_id = ?)`;
            const childOps: Array<[string, string]> = [
                [
                    "discord_draft_change_deps",
                    `change_id IN (SELECT change_id FROM discord_draft_changes WHERE ${draftScope})`,
                ],
                ["discord_draft_changes", draftScope],
                ["discord_draft_publish_queue", draftScope],
                [
                    "discord_preset_resources",
                    `preset_id IN (SELECT preset_id FROM discord_presets WHERE created_by_site_account_id = ?)`,
                ],
            ];
            for (const [childTable, whereSql] of childOps) {
                const r = db.prepare(`DELETE FROM ${childTable} WHERE ${whereSql}`).run(siteAccountId);
                if (r.changes > 0) {
                    result.discordTableDeletes[`${childTable}@${guildId}`] =
                        (result.discordTableDeletes[`${childTable}@${guildId}`] ?? 0) + r.changes;
                    touched = true;
                }
            }
            for (const { table, column } of DISCORD_GUILD_DB_SITE_ACCOUNT_TABLES) {
                const r = db.prepare(`DELETE FROM ${table} WHERE ${column} = ?`).run(siteAccountId);
                if (r.changes > 0) {
                    result.discordTableDeletes[`${table}@${guildId}`] =
                        (result.discordTableDeletes[`${table}@${guildId}`] ?? 0) + r.changes;
                    touched = true;
                }
            }
        })();
    }
    return touched;
}
