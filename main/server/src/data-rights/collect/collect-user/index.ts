import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { clanDirPath } from "../../../database/core/database.js";
import { listDiscordGuildIdsForClan } from "../../discord-guild-iterator.js";
import { collectClanAuditTables, collectClanDbTables, collectDiscordGuildTables } from "./clan-tables.js";
import { listAllClans, pluginDirHasAnyDb } from "./db-helpers.js";
import { collectPluginModes } from "./plugin-tables.js";
import { collectAppTables, collectDiscordBotTables } from "./top-level.js";
import type { ClanSummary, UserCollectionSummary, ZipEntry } from "./types.js";

export type { ZipEntry, UserCollectionSummary } from "./types.js";

export function collectUserData(
    accountHash: string,
    siteAccountId: string,
): { entries: ZipEntry[]; summary: UserCollectionSummary } {
    const entries: ZipEntry[] = [];
    const summary: UserCollectionSummary = {
        accountHash,
        siteAccountId,
        exportedAt: Date.now(),
        appTables: {},
        discordTables: {},
        clans: [],
    };

    collectAppTables(accountHash, siteAccountId, entries, summary);
    collectDiscordBotTables(siteAccountId, entries, summary);

    for (const clan of listAllClans()) {
        const clanDir = clanDirPath(clan.id);
        const hasClanDb = existsSync(resolve(clanDir, "clan.db"));
        const hasAuditDb = existsSync(resolve(clanDir, "clan_audit.db"));
        const hasAnyPlugin = pluginDirHasAnyDb(clan.id);
        const hasDiscordGuilds = listDiscordGuildIdsForClan(clan.id).length > 0;
        if (!hasClanDb && !hasAuditDb && !hasAnyPlugin && !hasDiscordGuilds) continue;

        const clanSummary: ClanSummary = {
            clanId: clan.id,
            displayName: clan.display_name,
            slug: clan.slug,
            status: clan.status,
            clanDbTables: {},
            modes: [],
        };

        if (hasClanDb) collectClanDbTables(clan.id, accountHash, siteAccountId, entries, clanSummary);
        if (hasAuditDb) collectClanAuditTables(clan.id, siteAccountId, entries, clanSummary);
        if (hasDiscordGuilds) collectDiscordGuildTables(clan.id, siteAccountId, entries, clanSummary);
        collectPluginModes(clan.id, accountHash, entries, clanSummary);

        if (Object.keys(clanSummary.clanDbTables).length > 0 || clanSummary.modes.length > 0) {
            summary.clans.push(clanSummary);
        }
    }

    entries.unshift({ path: `manifest.json`, json: summary });
    return { entries, summary };
}
