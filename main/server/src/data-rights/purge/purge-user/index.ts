import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { clanDirPath } from "../../../database/core/database.js";
import { DB_NAMES, getDb, listClanPluginModes } from "../../../database/index.js";
import { closePluginSocketsByAccountHash } from "../../../plugin-api/session/account-cap.js";
import { discordUserIdFor } from "../../scopes/user-scope/open-db.js";
import { purgeClanAuditDb, purgeClanDb, purgeDiscordGuildTables } from "./clan-tables.js";
import { purgePluginModes } from "./plugin-tables.js";
import { purgeAppTables, purgeDiscordBotTables, purgeVarezTables } from "./top-level.js";
import { emptyResult, listAllClanIds, type PurgeUserResult } from "./types.js";

export type { PurgeUserResult } from "./types.js";

export function purgeUserData(accountHash: string, siteAccountId: string): PurgeUserResult {
    const result = emptyResult(accountHash, siteAccountId);
    result.socketsClosed = closePluginSocketsByAccountHash(accountHash);

    purgeAppTables(accountHash, siteAccountId, result);
    purgeVarezTables(siteAccountId, result);
    const discordUserId = discordUserIdFor(siteAccountId);
    purgeDiscordBotTables(siteAccountId, discordUserId, result);

    for (const clanId of listAllClanIds()) {
        const clanDir = clanDirPath(clanId);
        const hasClanDb = existsSync(resolve(clanDir, "clan.db"));
        const hasAuditDb = existsSync(resolve(clanDir, "clan_audit.db"));
        const modes = listClanPluginModes(clanId);
        if (!hasClanDb && !hasAuditDb && modes.length === 0) continue;

        let touched = false;
        if (hasAuditDb) touched = purgeClanAuditDb(clanId, siteAccountId, result) || touched;
        if (hasClanDb) touched = purgeClanDb(clanId, accountHash, siteAccountId, result) || touched;
        touched = purgePluginModes(clanId, accountHash, result) || touched;
        touched = purgeDiscordGuildTables(clanId, siteAccountId, result) || touched;

        if (touched) result.clansTouched += 1;
    }

    return result;
}

export function ownedActiveClansForAccount(
    accountHash: string,
): Array<{ id: string; slug: string; display_name: string }> {
    const db = getDb(DB_NAMES.APP);
    return db
        .prepare(
            `SELECT id, slug, display_name FROM clansocket_clans
             WHERE owner_account_hash = ? AND archived_at IS NULL`,
        )
        .all(accountHash) as Array<{ id: string; slug: string; display_name: string }>;
}
