import { icon, inlineConfirm, TREE_ICON_CLASS, type Instance, type TreeNode } from "../../../../../../factory";
import {
    deleteDiscordWebhook,
    updateDiscordWebhook,
    type DiscordChannel,
    type DiscordWebhook,
} from "../../../../../../../state/discord/client.js";
import { webhookStateOf } from "../../../../../../../state/discord/webhooks/mappers/state-mapper.js";
import { identityStore } from "../../../../../../../state/identity/stores/identity-store.js";
import { selectDiscordItem } from "../../../../../../../state/discord/inspector-selection.js";

const TEXT_CHANNEL_TYPE = 0;
const ANNOUNCEMENT_CHANNEL_TYPE = 5;
const WEBHOOK_CAPABLE_TYPES: ReadonlySet<number> = new Set([TEXT_CHANNEL_TYPE, ANNOUNCEMENT_CHANNEL_TYPE]);

const WEBHOOK_ICON = "link-45deg";
const WEBHOOKS_FOLDER_LABEL = "Webhooks";
const UNNAMED_FALLBACK = "(unnamed)";

export const WEBHOOKS_FOLDER_KEY_PREFIX = "webhooks:";

export function isWebhookCapable(channelType: number): boolean {
    return WEBHOOK_CAPABLE_TYPES.has(channelType);
}

function iconForWebhook(): Instance {
    return icon({ name: WEBHOOK_ICON, classes: [TREE_ICON_CLASS], context: null, meta: null });
}

function webhookRenameHandler(webhook: DiscordWebhook, guildId: string): (next: string) => Promise<boolean> {
    return async (next) => {
        const session = identityStore.session$();
        if (session === null) return false;
        const before = webhookStateOf(webhook);
        return updateDiscordWebhook(guildId, webhook.webhook_id, {
            userId: session.id,
            before,
            after: { ...before, name: next.length > 0 ? next : null },
        });
    };
}

async function confirmAndDeleteWebhook(host: Instance, webhook: DiscordWebhook, guildId: string): Promise<void> {
    const name = webhook.name ?? UNNAMED_FALLBACK;
    const ok = await inlineConfirm(host, {
        cancelLabel: "Cancel",
        confirmLabel: "Delete",
        danger: true,
        cancelContext: `keep webhook "${name}"`,
        confirmContext: `confirm deleting webhook "${name}"`,
    });
    if (!ok) return;
    const session = identityStore.session$();
    if (session === null) return;
    await deleteDiscordWebhook(guildId, webhook.webhook_id, {
        userId: session.id,
        targetName: name,
        channelId: webhook.channel_id,
    });
}

function webhookLeafFor(webhook: DiscordWebhook, guildId: string, host: Instance): TreeNode {
    const name = webhook.name ?? UNNAMED_FALLBACK;
    return {
        kind: "leaf",
        key: webhook.webhook_id,
        label: name,
        icon: iconForWebhook(),
        title: `webhook in channel ${webhook.channel_id}`,
        onClick: () => selectDiscordItem({ kind: "webhook", data: webhook }),
        onLabelEdit: webhookRenameHandler(webhook, guildId),
        actions: [
            {
                iconName: "trash",
                title: `Delete ${name}`,
                onClick: () => void confirmAndDeleteWebhook(host, webhook, guildId),
                danger: true,
            },
        ],
    };
}

export interface WebhooksSubFolderContext {
    channel: DiscordChannel;
    webhooks: readonly DiscordWebhook[];
    expanded: Set<string>;
    toggle: (key: string) => void;
    guildId: string;
    host: Instance;
}

export function buildWebhooksSubFolder(ctx: WebhooksSubFolderContext): TreeNode {
    const key = `${WEBHOOKS_FOLDER_KEY_PREFIX}${ctx.channel.channel_id}`;
    const label = `${WEBHOOKS_FOLDER_LABEL} (${ctx.webhooks.length})`;
    return {
        kind: "folder",
        key,
        label,
        icon: iconForWebhook(),
        isExpanded: ctx.expanded.has(key),
        children: ctx.webhooks.map((w) => webhookLeafFor(w, ctx.guildId, ctx.host)),
        onToggle: () => ctx.toggle(key),
    };
}
