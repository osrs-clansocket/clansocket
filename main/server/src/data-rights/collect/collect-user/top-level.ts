import { DB_NAMES, getDb } from "../../../database/index.js";
import {
    APP_TABLES_BY_ACCOUNT_HASH,
    APP_TABLES_BY_SITE_ACCOUNT,
    DISCORD_BOT_TABLES_BY_DISCORD_USER_ID,
    DISCORD_BOT_TABLES_BY_SITE_ACCOUNT,
} from "../../scopes/manifest/index.js";
import { discordUserIdFor } from "../../scopes/user-scope/open-db.js";
import { selectAll, stripBlobs } from "./db-helpers.js";
import type { UserCollectionSummary, ZipEntry } from "./types.js";

export function collectAppTables(
    accountHash: string,
    siteAccountId: string,
    entries: ZipEntry[],
    summary: UserCollectionSummary,
): void {
    const appDb = getDb(DB_NAMES.APP);
    for (const { table, column, excludeColumns } of APP_TABLES_BY_ACCOUNT_HASH) {
        const raw = selectAll(appDb, table, `${column} = ?`, accountHash);
        if (raw.length === 0) continue;
        const rows = excludeColumns ? stripBlobs(raw, excludeColumns) : raw;
        entries.push({ path: `clansocket.db/${table}.json`, json: rows });
        summary.appTables[table] = (summary.appTables[table] ?? 0) + rows.length;
    }
    for (const { table, column, excludeColumns } of APP_TABLES_BY_SITE_ACCOUNT) {
        const raw = selectAll(appDb, table, `${column} = ?`, siteAccountId);
        if (raw.length === 0) continue;
        const rows = excludeColumns ? stripBlobs(raw, excludeColumns) : raw;
        const key = `${table}.${column}`;
        entries.push({ path: `clansocket.db/${key}.json`, json: rows });
        summary.appTables[key] = (summary.appTables[key] ?? 0) + rows.length;
    }
}

export function collectDiscordBotTables(
    siteAccountId: string,
    entries: ZipEntry[],
    summary: UserCollectionSummary,
): void {
    const botDb = getDb(DB_NAMES.DISCORD_BOT);
    for (const { table, column, excludeColumns } of DISCORD_BOT_TABLES_BY_SITE_ACCOUNT) {
        const raw = selectAll(botDb, table, `${column} = ?`, siteAccountId);
        if (raw.length === 0) continue;
        const rows = excludeColumns ? stripBlobs(raw, excludeColumns) : raw;
        entries.push({ path: `discord_bot.db/${table}.json`, json: rows });
        summary.discordTables[table] = (summary.discordTables[table] ?? 0) + rows.length;
    }
    const discordUserId = discordUserIdFor(siteAccountId);
    if (discordUserId === null) return;
    for (const { table, column } of DISCORD_BOT_TABLES_BY_DISCORD_USER_ID) {
        const raw = selectAll(botDb, table, `${column} = ?`, discordUserId);
        if (raw.length === 0) continue;
        entries.push({ path: `discord_bot.db/${table}.json`, json: raw });
        summary.discordTables[table] = (summary.discordTables[table] ?? 0) + raw.length;
    }
}
