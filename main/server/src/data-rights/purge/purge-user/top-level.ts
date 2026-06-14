import { DB_NAMES, getDb } from "../../../database/index.js";
import {
    APP_TABLES_BY_ACCOUNT_HASH,
    APP_TABLES_BY_SITE_ACCOUNT,
    DISCORD_BOT_TABLES_BY_DISCORD_USER_ID,
    DISCORD_BOT_TABLES_BY_SITE_ACCOUNT,
    VAREZ_TABLES_BY_SITE_ACCOUNT,
} from "../../scopes/manifest/index.js";
import type { PurgeUserResult } from "./types.js";

export function purgeAppTables(accountHash: string, siteAccountId: string, result: PurgeUserResult): void {
    const appDb = getDb(DB_NAMES.APP);
    appDb.transaction(() => {
        for (const { table, column } of APP_TABLES_BY_ACCOUNT_HASH) {
            const r = appDb.prepare(`DELETE FROM ${table} WHERE ${column} = ?`).run(accountHash);
            if (r.changes > 0) {
                result.appTableDeletes[`${table}.${column}`] =
                    (result.appTableDeletes[`${table}.${column}`] ?? 0) + r.changes;
            }
        }
        for (const { table, column } of APP_TABLES_BY_SITE_ACCOUNT) {
            const r = appDb.prepare(`DELETE FROM ${table} WHERE ${column} = ?`).run(siteAccountId);
            if (r.changes > 0) {
                result.appTableDeletes[`${table}.${column}`] =
                    (result.appTableDeletes[`${table}.${column}`] ?? 0) + r.changes;
            }
        }
    })();
}

export function purgeVarezTables(siteAccountId: string, result: PurgeUserResult): void {
    const varezDb = getDb(DB_NAMES.AI);
    varezDb.transaction(() => {
        for (const { table, column } of VAREZ_TABLES_BY_SITE_ACCOUNT) {
            const r = varezDb.prepare(`DELETE FROM ${table} WHERE ${column} = ?`).run(siteAccountId);
            if (r.changes > 0) {
                result.varezTableDeletes[table] = (result.varezTableDeletes[table] ?? 0) + r.changes;
            }
        }
    })();
}

export function purgeDiscordBotTables(
    siteAccountId: string,
    discordUserId: string | null,
    result: PurgeUserResult,
): void {
    const botDb = getDb(DB_NAMES.DISCORD_BOT);
    botDb.transaction(() => {
        for (const { table, column } of DISCORD_BOT_TABLES_BY_SITE_ACCOUNT) {
            const r = botDb.prepare(`DELETE FROM ${table} WHERE ${column} = ?`).run(siteAccountId);
            if (r.changes > 0) {
                result.discordTableDeletes[table] = (result.discordTableDeletes[table] ?? 0) + r.changes;
            }
        }
        if (discordUserId === null) return;
        for (const { table, column } of DISCORD_BOT_TABLES_BY_DISCORD_USER_ID) {
            const r = botDb.prepare(`DELETE FROM ${table} WHERE ${column} = ?`).run(discordUserId);
            if (r.changes > 0) {
                result.discordTableDeletes[table] = (result.discordTableDeletes[table] ?? 0) + r.changes;
            }
        }
    })();
}
