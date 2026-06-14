import { listChannelsForGuild } from "../../../database/discord/state/channels/list-channels.js";
import { scopeKeyForDiscordGuild } from "../writes-stream.js";
import type { ProjectionTopic } from "../projection.js";

export function discordChannelsTopic(clanId: string, guildId: string): ProjectionTopic {
    const scopeKey = scopeKeyForDiscordGuild(clanId, guildId);
    return {
        triggers: [{ scopeKey, table: "discord_channels" }],
        query: () => listChannelsForGuild(clanId, guildId) as unknown as Record<string, unknown>[],
        keyOf: (row) => String(row.channel_id),
    };
}
