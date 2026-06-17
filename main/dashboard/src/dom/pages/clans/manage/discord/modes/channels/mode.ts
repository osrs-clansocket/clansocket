import "../../../../../../../styles/pages/clans/manage/discord/clan-discord-page.css";
import {
    div,
    icon,
    inlineConfirm,
    paragraph,
    treeView,
    TREE_ICON_CLASS,
    type Instance,
    type ReorderEvent,
    type TreeNode,
} from "../../../../../../factory";
import { createChannelsFeed } from "../../../../../../../state/discord/channels/channels-feed.js";
import { createWebhooksFeed } from "../../../../../../../state/discord/webhooks/webhooks-feed.js";
import { channelStateOf } from "../../../../../../../state/discord/channels/mappers/state-mapper.js";
import { identityStore } from "../../../../../../../state/identity/stores/identity-store.js";
import {
    deleteDiscordChannel,
    updateDiscordChannel,
    type DiscordChannel,
    type DiscordServer,
    type DiscordWebhook,
} from "../../../../../../../state/discord/client.js";
import { selectDiscordItem } from "../../../../../../../state/discord/inspector-selection.js";
import { buildCreateToolbar } from "./create-dropdown.js";
import { buildWebhooksSubFolder, isWebhookCapable } from "./webhook-tree-builder.js";

const EMPTY_TEXT = "No channels in this guild yet.";
const UNNAMED_FALLBACK = "(unnamed)";
const CATEGORY_TYPE = 4;
const ANNOUNCEMENT_THREAD_TYPE = 10;
const PUBLIC_THREAD_TYPE = 11;
const PRIVATE_THREAD_TYPE = 12;
const THREAD_TYPES: ReadonlySet<number> = new Set([ANNOUNCEMENT_THREAD_TYPE, PUBLIC_THREAD_TYPE, PRIVATE_THREAD_TYPE]);
const EMPTY_CLASS = "clans-manage__discord-channels-empty";
const TOOLBAR_CLASS = "clans-manage__discord-channels-toolbar";
const MODE_HOST_CLASS = "clans-manage__discord-mode";

const CATEGORY_DRAG_KIND = "category";
const CHANNEL_DRAG_KIND = "channel";
const THREAD_DRAG_KIND = "thread";
const POSITION_HALF = 0.5;
const MAX_POSITION_SENTINEL = -1;

const TYPE_ICONS: Record<number, string> = {
    0: "hash",
    2: "volume-up",
    4: "folder",
    5: "megaphone",
    13: "broadcast",
    15: "chat-square-text",
    16: "image",
};
const THREAD_ICON = "chat-text";
const FALLBACK_ICON = "question-circle";

function iconForType(type: number): Instance {
    const name = TYPE_ICONS[type] ?? (THREAD_TYPES.has(type) ? THREAD_ICON : FALLBACK_ICON);
    return icon({
        name,
        classes: [TREE_ICON_CLASS],
        context: null,
        meta: null,
    });
}

function sortedByPosition<T extends { position: number | null }>(items: readonly T[]): T[] {
    return [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

function parseFeatures(raw: string): readonly string[] {
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((v): v is string => typeof v === "string");
    } catch {
        return [];
    }
}

function dragKindForChannel(channel: DiscordChannel): string {
    if (channel.type === CATEGORY_TYPE) return CATEGORY_DRAG_KIND;
    if (THREAD_TYPES.has(channel.type)) return THREAD_DRAG_KIND;
    return CHANNEL_DRAG_KIND;
}

function acceptDropsForLeaf(channel: DiscordChannel): readonly string[] {
    if (THREAD_TYPES.has(channel.type)) return [THREAD_DRAG_KIND];
    return [CHANNEL_DRAG_KIND];
}

function acceptDropsForFolder(channel: DiscordChannel): readonly string[] {
    if (channel.type === CATEGORY_TYPE) return [CATEGORY_DRAG_KIND, CHANNEL_DRAG_KIND];
    return [CHANNEL_DRAG_KIND, THREAD_DRAG_KIND];
}

function maxChildPosition(channels: readonly DiscordChannel[], parentId: string): number {
    let max = MAX_POSITION_SENTINEL;
    for (const c of channels) {
        if (c.parent_id !== parentId) continue;
        const p = c.position ?? 0;
        if (p > max) max = p;
    }
    return max;
}

function channelRenameHandler(channel: DiscordChannel, guildId: string): (next: string) => Promise<boolean> {
    return async (next) => {
        const session = identityStore.session$();
        if (session === null) return false;
        const before = channelStateOf(channel);
        return updateDiscordChannel(guildId, channel.channel_id, {
            userId: session.id,
            before,
            after: { ...before, name: next },
        });
    };
}

async function confirmAndDeleteChannel(host: Instance, channel: DiscordChannel, guildId: string): Promise<void> {
    const channelName = channel.name ?? UNNAMED_FALLBACK;
    const isCategory = channel.type === CATEGORY_TYPE;
    const ok = await inlineConfirm(host, {
        cancelLabel: "Cancel",
        confirmLabel: "Delete",
        danger: true,
        cancelContext: isCategory ? `keep category "${channelName}"` : `keep channel #${channelName}`,
        confirmContext: isCategory
            ? `confirm deleting category "${channelName}"`
            : `confirm deleting channel #${channelName}`,
    });
    if (!ok) return;
    const session = identityStore.session$();
    if (session === null) return;
    await deleteDiscordChannel(guildId, channel.channel_id, {
        userId: session.id,
        channelName,
        channelType: channel.type,
    });
}

interface TreeOrchestration {
    expanded: Set<string>;
    toggle: (key: string) => void;
    guildId: string;
    onReorder: (event: ReorderEvent) => void;
    treeHost: Instance;
}

interface TreeContext extends TreeOrchestration {
    threadsByParent: ReadonlyMap<string, readonly DiscordChannel[]>;
    webhooksByChannel: ReadonlyMap<string, readonly DiscordWebhook[]>;
}

function leafFor(channel: DiscordChannel, ctx: TreeContext): TreeNode {
    const name = channel.name ?? UNNAMED_FALLBACK;
    return {
        kind: "leaf",
        key: channel.channel_id,
        label: name,
        icon: iconForType(channel.type),
        title: channel.topic ?? name,
        onClick: () => selectDiscordItem({ kind: "channel", data: channel }),
        onLabelEdit: channelRenameHandler(channel, ctx.guildId),
        actions: [
            {
                iconName: "trash",
                title: `Delete ${name}`,
                onClick: (host) => void confirmAndDeleteChannel(host, channel, ctx.guildId),
                danger: true,
            },
        ],
        dragKind: dragKindForChannel(channel),
        acceptDrops: acceptDropsForLeaf(channel),
        onReorder: ctx.onReorder,
    };
}

function folderFor(
    parent: DiscordChannel,
    children: TreeNode[],
    webhooks: readonly DiscordWebhook[],
    ctx: TreeContext,
): TreeNode {
    const name = parent.name ?? UNNAMED_FALLBACK;
    if (webhooks.length > 0 && isWebhookCapable(parent.type)) {
        children.push(
            buildWebhooksSubFolder({
                channel: parent,
                webhooks,
                expanded: ctx.expanded,
                toggle: ctx.toggle,
                guildId: ctx.guildId,
                host: ctx.treeHost,
            }),
        );
    }
    return {
        kind: "folder",
        key: parent.channel_id,
        label: name,
        icon: iconForType(parent.type),
        isExpanded: ctx.expanded.has(parent.channel_id),
        children,
        onLabelEdit: channelRenameHandler(parent, ctx.guildId),
        actions: [
            {
                iconName: "trash",
                title: `Delete ${name}`,
                onClick: (host) => void confirmAndDeleteChannel(host, parent, ctx.guildId),
                danger: true,
            },
        ],
        onToggle: () => {
            selectDiscordItem({ kind: "channel", data: parent });
            ctx.toggle(parent.channel_id);
        },
        dragKind: dragKindForChannel(parent),
        acceptDrops: acceptDropsForFolder(parent),
        onReorder: ctx.onReorder,
    };
}

function nodeForChannel(channel: DiscordChannel, ctx: TreeContext): TreeNode {
    const threads = ctx.threadsByParent.get(channel.channel_id) ?? [];
    const webhooks = ctx.webhooksByChannel.get(channel.channel_id) ?? [];
    const hasWebhooks = webhooks.length > 0 && isWebhookCapable(channel.type);
    if (threads.length === 0 && !hasWebhooks) return leafFor(channel, ctx);
    const childNodes: TreeNode[] = sortedByPosition(threads).map((c) => nodeForChannel(c, ctx));
    return folderFor(channel, childNodes, webhooks, ctx);
}

function partitionChannels(channels: readonly DiscordChannel[]): {
    categories: DiscordChannel[];
    childrenByCat: Map<string, DiscordChannel[]>;
    threadsByParent: Map<string, DiscordChannel[]>;
    orphans: DiscordChannel[];
} {
    const categories = channels.filter((c) => c.type === CATEGORY_TYPE);
    const catIds = new Set(categories.map((c) => c.channel_id));
    const childrenByCat = new Map<string, DiscordChannel[]>();
    const threadsByParent = new Map<string, DiscordChannel[]>();
    const orphans: DiscordChannel[] = [];
    for (const ch of channels) {
        if (ch.type === CATEGORY_TYPE) continue;
        if (THREAD_TYPES.has(ch.type)) {
            if (ch.parent_id !== null) {
                const arr = threadsByParent.get(ch.parent_id) ?? [];
                arr.push(ch);
                threadsByParent.set(ch.parent_id, arr);
            } else {
                orphans.push(ch);
            }
            continue;
        }
        if (ch.parent_id !== null && catIds.has(ch.parent_id)) {
            const arr = childrenByCat.get(ch.parent_id) ?? [];
            arr.push(ch);
            childrenByCat.set(ch.parent_id, arr);
        } else {
            orphans.push(ch);
        }
    }
    return { categories, childrenByCat, threadsByParent, orphans };
}

function buildTreeNodes(
    channels: readonly DiscordChannel[],
    webhooksByChannel: ReadonlyMap<string, readonly DiscordWebhook[]>,
    orchestration: TreeOrchestration,
): TreeNode[] {
    const { categories, childrenByCat, threadsByParent, orphans } = partitionChannels(channels);
    const ctx: TreeContext = { ...orchestration, threadsByParent, webhooksByChannel };
    const out: TreeNode[] = [];
    for (const orphan of sortedByPosition(orphans)) out.push(nodeForChannel(orphan, ctx));
    for (const cat of sortedByPosition(categories)) {
        const catChildren = childrenByCat.get(cat.channel_id) ?? [];
        const childNodes: TreeNode[] = sortedByPosition(catChildren).map((c) => nodeForChannel(c, ctx));
        out.push(folderFor(cat, childNodes, [], ctx));
    }
    return out;
}

function buildToolbar(
    guildId: string,
    getChannels: () => readonly DiscordChannel[],
    features: readonly string[],
): Instance {
    void identityStore.refresh();
    return div({ classes: [TOOLBAR_CLASS], context: null, meta: null }, [
        buildCreateToolbar({ guildId, getChannels, features }),
    ]);
}

function isInvalidReorder(event: ReorderEvent, dragged: DiscordChannel, target: DiscordChannel): boolean {
    if (dragged.channel_id === target.channel_id) return true;
    if (event.dragged.kind === CATEGORY_DRAG_KIND && event.position === "into") return true;
    if (event.dragged.kind === CHANNEL_DRAG_KIND && event.position === "into" && target.type !== CATEGORY_TYPE) {
        return true;
    }
    if (event.dragged.kind === THREAD_DRAG_KIND && event.position === "into") return true;
    if (event.dragged.kind === THREAD_DRAG_KIND && target.parent_id !== dragged.parent_id) return true;
    return false;
}

function computeNewPlacement(
    channels: readonly DiscordChannel[],
    target: DiscordChannel,
    position: ReorderEvent["position"],
): { parent_id: string | null; position: number } {
    if (position === "into") {
        return { parent_id: target.channel_id, position: maxChildPosition(channels, target.channel_id) + 1 };
    }
    const offset = position === "before" ? -POSITION_HALF : POSITION_HALF;
    return { parent_id: target.parent_id, position: (target.position ?? 0) + offset };
}

function indexWebhooksByChannel(webhooks: readonly DiscordWebhook[]): Map<string, DiscordWebhook[]> {
    const map = new Map<string, DiscordWebhook[]>();
    for (const w of webhooks) {
        const arr = map.get(w.channel_id) ?? [];
        arr.push(w);
        map.set(w.channel_id, arr);
    }
    return map;
}

export function buildChannelsMode(server: DiscordServer): Instance {
    const guildId = server.guild_id;
    const features = parseFeatures(server.features);
    const treeHost = div({ classes: [], context: null, meta: null });
    const empty = paragraph({
        classes: [EMPTY_CLASS],
        text: EMPTY_TEXT,
        hidden: "",
        context: null,
        meta: null,
    });
    const expanded = new Set<string>();
    let latest: readonly DiscordChannel[] = [];
    let latestWebhooks: readonly DiscordWebhook[] = [];
    let webhooksByChannel: Map<string, DiscordWebhook[]> = new Map();
    let initialized = false;

    function toggle(key: string): void {
        if (expanded.has(key)) expanded.delete(key);
        else expanded.add(key);
        rerender();
    }

    function applyLocalReorder(event: ReorderEvent): void {
        const dragged = latest.find((c) => c.channel_id === event.dragged.key);
        const target = latest.find((c) => c.channel_id === event.targetKey);
        if (!dragged || !target) return;
        if (isInvalidReorder(event, dragged, target)) return;
        const placement = computeNewPlacement(latest, target, event.position);
        latest = latest.map((c) =>
            c.channel_id === dragged.channel_id
                ? { ...c, parent_id: placement.parent_id, position: placement.position }
                : c,
        );
        rerender();
        if (placement.parent_id === dragged.parent_id) return;
        const session = identityStore.session$();
        if (session === null) return;
        const before = channelStateOf(dragged);
        void updateDiscordChannel(guildId, dragged.channel_id, {
            userId: session.id,
            before,
            after: { ...before, parentId: placement.parent_id },
        });
    }

    function rerender(): void {
        if (latest.length === 0) {
            treeHost.clear();
            empty.el.hidden = false;
            return;
        }
        if (!initialized) {
            for (const ch of latest) if (ch.type === CATEGORY_TYPE) expanded.add(ch.channel_id);
            initialized = true;
        }
        empty.el.hidden = true;
        treeHost.setChildren(
            treeView(
                buildTreeNodes(latest, webhooksByChannel, {
                    expanded,
                    toggle,
                    guildId,
                    onReorder: applyLocalReorder,
                    treeHost,
                }),
            ),
        );
    }

    const feed = createChannelsFeed(guildId);
    const unsubscribeChannels = feed.source.subscribe(
        (snap) => {
            latest = snap.rows as DiscordChannel[];
            rerender();
        },
        (batch) => {
            const byKey = new Map(latest.map((c) => [c.channel_id, c]));
            for (const d of batch.deltas) {
                if (d.op === "upsert" && d.row) byKey.set(d.key, d.row as DiscordChannel);
                else if (d.op === "remove") byKey.delete(d.key);
            }
            latest = [...byKey.values()];
            rerender();
        },
    );

    const webhooksFeed = createWebhooksFeed(guildId);
    const unsubscribeWebhooks = webhooksFeed.source.subscribe(
        (snap) => {
            latestWebhooks = snap.rows as DiscordWebhook[];
            webhooksByChannel = indexWebhooksByChannel(latestWebhooks);
            rerender();
        },
        (batch) => {
            const byKey = new Map(latestWebhooks.map((w) => [w.webhook_id, w]));
            for (const d of batch.deltas) {
                if (d.op === "upsert" && d.row) byKey.set(d.key, d.row as DiscordWebhook);
                else if (d.op === "remove") byKey.delete(d.key);
            }
            latestWebhooks = [...byKey.values()];
            webhooksByChannel = indexWebhooksByChannel(latestWebhooks);
            rerender();
        },
    );

    const modeHost = div({ classes: [MODE_HOST_CLASS], context: null, meta: null }, [
        buildToolbar(guildId, () => latest, features),
        treeHost,
        empty,
    ]);
    modeHost.trackDispose({
        dispose: () => {
            unsubscribeChannels();
            unsubscribeWebhooks();
        },
    });
    return modeHost;
}
