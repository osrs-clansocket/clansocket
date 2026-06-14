import { listChannelOverwritesForGuild } from "../../../database/discord/state/channel-overwrites/list-overwrites-for-guild.js";
import { scopeKeyForDiscordGuild } from "../writes-stream.js";
import type { ProjectionTopic } from "../projection.js";

export function discordChannelOverwritesTopic(clanId: string, guildId: string): ProjectionTopic {
    const scopeKey = scopeKeyForDiscordGuild(clanId, guildId);
    return {
        triggers: [
            { scopeKey, table: "discord_channel_role_overwrites" },
            { scopeKey, table: "discord_channel_member_overwrites" },
        ],
        query: () => listChannelOverwritesForGuild(clanId, guildId) as unknown as Record<string, unknown>[],
        keyOf: (row) => `${String(row.kind)}:${String(row.channel_id)}:${row.kind === "role" ? String(row.role_id) : String(row.user_id)}`,
    };
}
