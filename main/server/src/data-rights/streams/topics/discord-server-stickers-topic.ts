import { listServerStickersForGuild } from "../../../database/discord/state/server-stickers/list-server-stickers.js";
import { scopeKeyForDiscordGuild } from "../writes-stream.js";
import type { ProjectionTopic } from "../projection.js";

export function discordServerStickersTopic(clanId: string, guildId: string): ProjectionTopic {
    const scopeKey = scopeKeyForDiscordGuild(clanId, guildId);
    return {
        triggers: [{ scopeKey, table: "discord_server_stickers" }],
        query: () => listServerStickersForGuild(clanId, guildId) as unknown as Record<string, unknown>[],
        keyOf: (row) => String(row.sticker_id),
    };
}
