import { listServerEmojisForGuild } from "../../../database/discord/state/server-emojis/list-server-emojis.js";
import { scopeKeyForDiscordGuild } from "../writes-stream.js";
import type { ProjectionTopic } from "../projection.js";

export function discordServerEmojisTopic(clanId: string, guildId: string): ProjectionTopic {
    const scopeKey = scopeKeyForDiscordGuild(clanId, guildId);
    return {
        triggers: [{ scopeKey, table: "discord_server_emojis" }],
        query: () => listServerEmojisForGuild(clanId, guildId) as unknown as Record<string, unknown>[],
        keyOf: (row) => String(row.emoji_id),
    };
}
