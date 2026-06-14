import { getGuildSettings } from "../../../database/discord/state/guild-settings/get-guild-settings.js";
import { scopeKeyForDiscordGuild } from "../writes-stream.js";
import type { ProjectionTopic } from "../projection.js";

export function discordGuildSettingsTopic(clanId: string, guildId: string): ProjectionTopic {
    const scopeKey = scopeKeyForDiscordGuild(clanId, guildId);
    return {
        triggers: [{ scopeKey, table: "discord_guild_settings" }],
        query: () => {
            const row = getGuildSettings(clanId, guildId);
            return row ? ([row] as unknown as Record<string, unknown>[]) : [];
        },
        keyOf: (row) => String(row.guild_id),
    };
}
