import { listRolesForGuild } from "../../../database/discord/state/roles/list-roles.js";
import { scopeKeyForDiscordGuild } from "../writes-stream.js";
import type { ProjectionTopic } from "../projection.js";

export function discordRolesTopic(clanId: string, guildId: string): ProjectionTopic {
    const scopeKey = scopeKeyForDiscordGuild(clanId, guildId);
    return {
        triggers: [{ scopeKey, table: "discord_roles" }],
        query: () => listRolesForGuild(clanId, guildId) as unknown as Record<string, unknown>[],
        keyOf: (row) => String(row.role_id),
    };
}
