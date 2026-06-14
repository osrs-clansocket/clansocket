import { listMembersForGuild } from "../../../database/discord/state/members/list-members.js";
import { scopeKeyForDiscordGuild } from "../writes-stream.js";
import type { ProjectionTopic } from "../projection.js";

export function discordMembersTopic(clanId: string, guildId: string): ProjectionTopic {
    const scopeKey = scopeKeyForDiscordGuild(clanId, guildId);
    return {
        triggers: [{ scopeKey, table: "discord_members" }],
        query: () => listMembersForGuild(clanId, guildId) as unknown as Record<string, unknown>[],
        keyOf: (row) => String(row.user_id),
    };
}
