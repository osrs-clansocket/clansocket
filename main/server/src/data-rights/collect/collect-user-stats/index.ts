import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
    DB_NAMES,
    getClanDb,
    getClanPluginDb,
    getDb,
    getDiscordGuildDb,
    listClanPluginModes,
} from "../../../database/index.js";
import { clanDirPath, getClanAuditDb } from "../../../database/core/database.js";
import { listDiscordGuildIdsForClan } from "../../discord-guild-iterator.js";
import {
    APP_TABLES_BY_ACCOUNT_HASH,
    APP_TABLES_BY_SITE_ACCOUNT,
    CLAN_AUDIT_DB_SITE_ACCOUNT_TABLES,
    CLAN_DB_SITE_ACCOUNT_TABLES,
    CLAN_DB_USER_TABLES,
    DISCORD_BOT_TABLES_BY_DISCORD_USER_ID,
    DISCORD_BOT_TABLES_BY_SITE_ACCOUNT,
    DISCORD_GUILD_DB_SITE_ACCOUNT_TABLES,
    PLUGIN_USER_CHILD_TABLES,
    PLUGIN_USER_TABLES,
    VAREZ_TABLES_BY_SITE_ACCOUNT,
} from "../../scopes/manifest/index.js";
import { SCOPE_APP, SCOPE_VAREZ } from "../../scopes/user-scope/index.js";
import { resolveClanWindows } from "../../temporal-correlation.js";
import { statChildJoined, statOne, statTemporalDiffs, statTemporalMembers } from "./stat-helpers.js";
import type { UserDataStats } from "./types.js";
import { acc, discordUserIdFor, listAllClanIds } from "./utils.js";

export type { UserDataStats } from "./types.js";

const SCOPE_DISCORD_BOT = "discord_bot";

export function collectUserStats(siteAccountId: string, accountHashes: readonly string[]): UserDataStats {
    const stats: UserDataStats = { totalRows: 0, totalBytes: 0, totalDbs: 0, firstEntryAt: null };
    const dbsTouched = new Set<string>();

    const appDb = getDb(DB_NAMES.APP);
    for (const hash of accountHashes) {
        for (const { table, column } of APP_TABLES_BY_ACCOUNT_HASH) {
            acc(stats, dbsTouched, SCOPE_APP, statOne(appDb, table, column, hash));
        }
    }
    for (const { table, column } of APP_TABLES_BY_SITE_ACCOUNT) {
        acc(stats, dbsTouched, SCOPE_APP, statOne(appDb, table, column, siteAccountId));
    }

    const varezDb = getDb(DB_NAMES.AI);
    for (const { table, column } of VAREZ_TABLES_BY_SITE_ACCOUNT) {
        acc(stats, dbsTouched, SCOPE_VAREZ, statOne(varezDb, table, column, siteAccountId));
    }

    const botDb = getDb(DB_NAMES.DISCORD_BOT);
    for (const { table, column } of DISCORD_BOT_TABLES_BY_SITE_ACCOUNT) {
        acc(stats, dbsTouched, SCOPE_DISCORD_BOT, statOne(botDb, table, column, siteAccountId));
    }
    const discordUserId = discordUserIdFor(siteAccountId);
    if (discordUserId !== null) {
        for (const { table, column } of DISCORD_BOT_TABLES_BY_DISCORD_USER_ID) {
            acc(stats, dbsTouched, SCOPE_DISCORD_BOT, statOne(botDb, table, column, discordUserId));
        }
    }

    for (const clanId of listAllClanIds()) {
        const clanDir = clanDirPath(clanId);
        const clanDbPath = resolve(clanDir, "clan.db");
        const auditDbPath = resolve(clanDir, "clan_audit.db");

        if (existsSync(clanDbPath)) {
            const clanDb = getClanDb(clanId);
            const clanDbKey = `clan:${clanId}`;
            for (const hash of accountHashes) {
                for (const { table, column } of CLAN_DB_USER_TABLES) {
                    acc(stats, dbsTouched, clanDbKey, statOne(clanDb, table, column, hash));
                }
            }
            for (const { table, column } of CLAN_DB_SITE_ACCOUNT_TABLES) {
                acc(stats, dbsTouched, clanDbKey, statOne(clanDb, table, column, siteAccountId));
            }
            for (const hash of accountHashes) {
                const windows = resolveClanWindows(clanId, [hash]);
                if (windows.length === 0) continue;
                acc(stats, dbsTouched, clanDbKey, statTemporalMembers(clanId, windows));
                acc(stats, dbsTouched, clanDbKey, statTemporalDiffs(clanId, windows));
            }
        }

        if (existsSync(auditDbPath)) {
            const auditDb = getClanAuditDb(clanId);
            const auditDbKey = `clan_audit:${clanId}`;
            for (const { table, column } of CLAN_AUDIT_DB_SITE_ACCOUNT_TABLES) {
                acc(stats, dbsTouched, auditDbKey, statOne(auditDb, table, column, siteAccountId));
            }
        }

        for (const guildId of listDiscordGuildIdsForClan(clanId)) {
            const guildDb = getDiscordGuildDb(clanId, guildId);
            const guildDbKey = `discord_guild:${clanId}:${guildId}`;
            for (const { table, column } of DISCORD_GUILD_DB_SITE_ACCOUNT_TABLES) {
                acc(stats, dbsTouched, guildDbKey, statOne(guildDb, table, column, siteAccountId));
            }
        }

        for (const mode of listClanPluginModes(clanId)) {
            const pluginDb = getClanPluginDb(clanId, mode);
            const pluginDbKey = `plugin:${clanId}:${mode}`;
            for (const hash of accountHashes) {
                for (const { table, column } of PLUGIN_USER_TABLES) {
                    acc(stats, dbsTouched, pluginDbKey, statOne(pluginDb, table, column, hash));
                }
                for (const child of PLUGIN_USER_CHILD_TABLES) {
                    const parent = PLUGIN_USER_TABLES.find((t) => t.table === child.parentTable);
                    if (!parent) continue;
                    acc(
                        stats,
                        dbsTouched,
                        pluginDbKey,
                        statChildJoined(
                            pluginDb,
                            child.table,
                            child.parentKey,
                            child.parentTable,
                            child.parentColumn,
                            parent.column,
                            hash,
                        ),
                    );
                }
            }
        }
    }

    stats.totalDbs = dbsTouched.size;
    return stats;
}
