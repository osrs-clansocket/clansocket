import { getClanAuditDb } from "../../../database/core/database.js";
import { getClanDb, getDiscordGuildDb } from "../../../database/index.js";
import { listDiscordGuildIdsForClan } from "../../discord-guild-iterator.js";
import {
    CLAN_AUDIT_DB_SITE_ACCOUNT_TABLES,
    CLAN_DB_SITE_ACCOUNT_TABLES,
    CLAN_DB_USER_TABLES,
    DISCORD_GUILD_DB_SITE_ACCOUNT_TABLES,
} from "../../scopes/manifest/index.js";
import { resolveClanWindows, selectOwnedClanMembers, selectOwnedRosterDiffs } from "../../temporal-correlation.js";
import { selectAll, stripBlobs } from "./db-helpers.js";
import type { ClanSummary, ZipEntry } from "./types.js";

export function collectClanDbTables(
    clanId: string,
    accountHash: string,
    siteAccountId: string,
    entries: ZipEntry[],
    clanSummary: ClanSummary,
): void {
    const clanDb = getClanDb(clanId);
    for (const { table, column } of CLAN_DB_USER_TABLES) {
        const rows = selectAll(clanDb, table, `${column} = ?`, accountHash);
        if (rows.length === 0) continue;
        entries.push({ path: `clans/${clanId}/clan.db/${table}.json`, json: rows });
        clanSummary.clanDbTables[table] = rows.length;
    }
    for (const { table, column } of CLAN_DB_SITE_ACCOUNT_TABLES) {
        const rows = selectAll(clanDb, table, `${column} = ?`, siteAccountId);
        if (rows.length === 0) continue;
        entries.push({ path: `clans/${clanId}/clan.db/${table}.json`, json: rows });
        clanSummary.clanDbTables[table] = rows.length;
    }
    const windows = resolveClanWindows(clanId, [accountHash]);
    if (windows.length === 0) return;
    const members = selectOwnedClanMembers(clanId, windows);
    if (members.length > 0) {
        entries.push({ path: `clans/${clanId}/clan.db/clan_members.json`, json: members });
        clanSummary.clanDbTables.clan_members = members.length;
    }
    const diffs = selectOwnedRosterDiffs(clanId, windows);
    if (diffs.length > 0) {
        entries.push({ path: `clans/${clanId}/clan.db/clan_roster_diffs.json`, json: diffs });
        clanSummary.clanDbTables.clan_roster_diffs = diffs.length;
    }
}

export function collectClanAuditTables(
    clanId: string,
    siteAccountId: string,
    entries: ZipEntry[],
    clanSummary: ClanSummary,
): void {
    const auditDb = getClanAuditDb(clanId);
    for (const { table, column } of CLAN_AUDIT_DB_SITE_ACCOUNT_TABLES) {
        const rows = selectAll(auditDb, table, `${column} = ?`, siteAccountId);
        if (rows.length === 0) continue;
        entries.push({ path: `clans/${clanId}/clan_audit.db/${table}.json`, json: rows });
        clanSummary.clanDbTables[table] = rows.length;
    }
}

export function collectDiscordGuildTables(
    clanId: string,
    siteAccountId: string,
    entries: ZipEntry[],
    clanSummary: ClanSummary,
): void {
    for (const guildId of listDiscordGuildIdsForClan(clanId)) {
        const db = getDiscordGuildDb(clanId, guildId);
        const pathPrefix = `clans/${clanId}/discord_guild_${guildId}.db`;
        for (const { table, column, excludeColumns } of DISCORD_GUILD_DB_SITE_ACCOUNT_TABLES) {
            const raw = selectAll(db, table, `${column} = ?`, siteAccountId);
            if (raw.length === 0) continue;
            const rows = excludeColumns ? stripBlobs(raw, [...excludeColumns]) : raw;
            entries.push({ path: `${pathPrefix}/${table}.json`, json: rows });
            clanSummary.clanDbTables[`${table}@${guildId}`] = rows.length;
        }
        collectGuildChildren(db, siteAccountId, entries, clanSummary, pathPrefix, guildId);
    }
}

function collectGuildChildren(
    db: ReturnType<typeof getDiscordGuildDb>,
    siteAccountId: string,
    entries: ZipEntry[],
    clanSummary: ClanSummary,
    pathPrefix: string,
    guildId: string,
): void {
    const draftChildSql = `session_id IN (SELECT session_id FROM discord_draft_sessions WHERE owner_site_account_id = ?)`;
    for (const childTable of ["discord_draft_changes", "discord_draft_publish_queue"]) {
        const rows = selectAll(db, childTable, draftChildSql, siteAccountId);
        if (rows.length === 0) continue;
        entries.push({ path: `${pathPrefix}/${childTable}.json`, json: rows });
        clanSummary.clanDbTables[`${childTable}@${guildId}`] = rows.length;
    }
    const depsSql = `change_id IN (SELECT change_id FROM discord_draft_changes WHERE ${draftChildSql})`;
    const deps = selectAll(db, "discord_draft_change_deps", depsSql, siteAccountId);
    if (deps.length > 0) {
        entries.push({ path: `${pathPrefix}/discord_draft_change_deps.json`, json: deps });
        clanSummary.clanDbTables[`discord_draft_change_deps@${guildId}`] = deps.length;
    }
    const presetChildSql = `preset_id IN (SELECT preset_id FROM discord_presets WHERE created_by_site_account_id = ?)`;
    const resources = selectAll(db, "discord_preset_resources", presetChildSql, siteAccountId);
    if (resources.length > 0) {
        entries.push({ path: `${pathPrefix}/discord_preset_resources.json`, json: resources });
        clanSummary.clanDbTables[`discord_preset_resources@${guildId}`] = resources.length;
    }
}
