import type { DiscordWebhook } from "../../../../../../../state/discord/client.js";
import type { SelectOption } from "../../../../../../forms/glass/inputs/glass-select.js";
import type { WebhookTokenRow } from "../../../../../../../state/discord/webhook-tokens/client.js";

const UNNAMED_FALLBACK = "(unnamed webhook)";
const UNKNOWN_CHANNEL = "(unknown channel)";

export function buildWebhookOptions(
    webhooks: readonly DiscordWebhook[],
    tokens: readonly WebhookTokenRow[],
    channelNameById: ReadonlyMap<string, string>,
): SelectOption[] {
    const tokenIds = new Set(tokens.map((t) => t.webhook_id));
    const options: SelectOption[] = [];
    for (const wh of webhooks) {
        if (!tokenIds.has(wh.webhook_id)) continue;
        const name = wh.name ?? UNNAMED_FALLBACK;
        const channel = channelNameById.get(wh.channel_id) ?? UNKNOWN_CHANNEL;
        options.push({ value: wh.webhook_id, label: `${name} → #${channel}` });
    }
    return options;
}
