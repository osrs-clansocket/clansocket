import { type Instance } from "../../../factory";
import { identityStore } from "../../../../state/identity/stores/identity-store.js";
import {
    updateDiscordWebhook,
    type DiscordWebhook,
    type DiscordWebhookState,
} from "../../../../state/discord/client.js";
import { webhookStateOf } from "../../../../state/discord/webhooks/mappers/state-mapper.js";
import {
    buildEditableTextSection,
    buildImageUrlReadonlySection,
    buildPairedChannelSection,
    buildPairedMemberSection,
    buildReadonlySection,
} from "../builders/section-builder.js";

const NONE_VALUE = "—";

const WEBHOOK_TYPE_LABELS: Record<number, string> = {
    1: "incoming",
    2: "channel-follower",
    3: "application",
};
const WEBHOOK_TYPE_UNKNOWN = "?";

async function saveWebhookPatch(webhook: DiscordWebhook, patch: Partial<DiscordWebhookState>): Promise<void> {
    const session = identityStore.session$();
    if (session === null) return;
    const before = webhookStateOf(webhook);
    const after: DiscordWebhookState = { ...before, ...patch };
    await updateDiscordWebhook(webhook.guild_id, webhook.webhook_id, {
        userId: session.id,
        before,
        after,
    });
}

export function webhookSections(webhook: DiscordWebhook): Instance[] {
    const sections: Instance[] = [
        buildEditableTextSection(
            "Name",
            webhook.name ?? "",
            (next) => void saveWebhookPatch(webhook, { name: next.length > 0 ? next : null }),
        ),
        buildReadonlySection({ title: "Webhook ID", value: webhook.webhook_id }),
        ...buildPairedChannelSection("Channel", webhook.guild_id, webhook.channel_id),
        buildReadonlySection({
            title: "Type",
            value: WEBHOOK_TYPE_LABELS[webhook.webhook_type] ?? WEBHOOK_TYPE_UNKNOWN,
        }),
        buildReadonlySection({ title: "Application ID", value: webhook.application_id ?? NONE_VALUE }),
        ...buildPairedMemberSection("Created by", webhook.guild_id, webhook.user_id),
        buildImageUrlReadonlySection("Avatar URL", webhook.avatar_url),
    ];
    if (webhook.source_guild_id !== null || webhook.source_channel_id !== null) {
        sections.push(
            buildReadonlySection({
                title: "Source guild",
                value: webhook.source_guild_name ?? webhook.source_guild_id ?? NONE_VALUE,
            }),
            buildReadonlySection({
                title: "Source guild ID",
                value: webhook.source_guild_id ?? NONE_VALUE,
            }),
            buildReadonlySection({
                title: "Source channel",
                value: webhook.source_channel_name ?? webhook.source_channel_id ?? NONE_VALUE,
            }),
            buildReadonlySection({
                title: "Source channel ID",
                value: webhook.source_channel_id ?? NONE_VALUE,
            }),
        );
    }
    return sections;
}
