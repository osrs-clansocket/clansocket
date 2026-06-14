import { listWebhooksForGuild } from "../../../database/discord/state/webhooks/list-webhooks.js";
import { scopeKeyForDiscordGuild } from "../writes-stream.js";
import type { ProjectionTopic } from "../projection.js";

export function discordWebhooksTopic(clanId: string, guildId: string): ProjectionTopic {
    const scopeKey = scopeKeyForDiscordGuild(clanId, guildId);
    return {
        triggers: [{ scopeKey, table: "discord_webhooks" }],
        query: () => listWebhooksForGuild(clanId, guildId) as unknown as Record<string, unknown>[],
        keyOf: (row) => String(row.webhook_id),
    };
}
