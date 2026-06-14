import { getDiscordGuildDb } from "../../core/database.js";
import { DB_NAMES } from "../../core/database-state.js";
import { getDb } from "../../core/database.js";

const DEFAULT_SETUP_STATUS = "pending";

export interface InstallServerParams {
    guildId: string;
    guildName: string;
    clanId: string;
    clanName: string;
    botId: string;
    botName: string | null;
    installerSiteAccountId: string;
    installerSiteAccountName: string | null;
    oauthScopesJson: string;
    permissionsBitfield: number;
}

export function installServer(params: InstallServerParams): void {
    const botDb = getDb(DB_NAMES.DISCORD_BOT);
    const now = Date.now();
    botDb
        .prepare(
            `INSERT OR REPLACE INTO discord_servers (guild_id, guild_name, clan_id, clan_name, bot_id, bot_name, installer_site_account_id, installer_site_account_name, oauth_scopes_json, permissions_bitfield, installed_at, setup_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
            params.guildId,
            params.guildName,
            params.clanId,
            params.clanName,
            params.botId,
            params.botName,
            params.installerSiteAccountId,
            params.installerSiteAccountName,
            params.oauthScopesJson,
            params.permissionsBitfield,
            now,
            DEFAULT_SETUP_STATUS,
            now,
        );
    getDiscordGuildDb(params.clanId, params.guildId);
}
