import { getDiscordGuildDb } from "../../database-discord.js";
import type { GuildSettingsRow, WelcomeScreenChannel } from "../types.js";

const GET_SQL = `
SELECT guild_id, name, icon_url, banner_url, description,
       system_channel_id, afk_channel_id, afk_timeout, verification_level,
       welcome_screen_enabled, welcome_screen_description, welcome_screen_channels_json
FROM discord_guild_settings
WHERE guild_id = ?
`;

interface GuildSettingsSqlRow {
    guild_id: string;
    name: string;
    icon_url: string | null;
    banner_url: string | null;
    description: string | null;
    system_channel_id: string | null;
    afk_channel_id: string | null;
    afk_timeout: number | null;
    verification_level: number;
    welcome_screen_enabled: number;
    welcome_screen_description: string | null;
    welcome_screen_channels_json: string;
}

const FLAG_TRUE = 1;

function parseWelcomeChannels(json: string): WelcomeScreenChannel[] {
    try {
        const parsed = JSON.parse(json) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
            (v): v is WelcomeScreenChannel =>
                typeof v === "object" && v !== null && typeof (v as WelcomeScreenChannel).channel_id === "string",
        );
    } catch {
        return [];
    }
}

function toGuildSettingsRow(r: GuildSettingsSqlRow): GuildSettingsRow {
    return {
        guild_id: r.guild_id,
        name: r.name,
        icon_url: r.icon_url,
        banner_url: r.banner_url,
        description: r.description,
        system_channel_id: r.system_channel_id,
        afk_channel_id: r.afk_channel_id,
        afk_timeout: r.afk_timeout,
        verification_level: r.verification_level,
        welcome_screen_enabled: r.welcome_screen_enabled === FLAG_TRUE,
        welcome_screen_description: r.welcome_screen_description,
        welcome_screen_channels: parseWelcomeChannels(r.welcome_screen_channels_json),
    };
}

export function getGuildSettings(clanId: string, guildId: string): GuildSettingsRow | null {
    const db = getDiscordGuildDb(clanId, guildId);
    const row = db.prepare(GET_SQL).get(guildId) as GuildSettingsSqlRow | undefined;
    if (!row) return null;
    return toGuildSettingsRow(row);
}
